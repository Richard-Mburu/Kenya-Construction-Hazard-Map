const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const ADMIN1_PATH = path.join(DATA_DIR, 'ken_admin1.geojson');
const MANIFEST_PATH = path.join(DATA_DIR, 'forecast_files.json');
const OUTPUT_PATH = path.join(DATA_DIR, 'forecast_county_data.json');
const FORECAST_FILE_RE = /^(\d{8})_to_(\d{8})_fcst\.csv$/;

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function readExistingForecastData() {
  if (!fs.existsSync(OUTPUT_PATH)) return new Map();
  const payload = readJSON(OUTPUT_PATH);
  return new Map((payload.periods || []).map(period => [period.file, period]));
}

function round2(value) {
  return Number(value.toFixed(2));
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return headers.reduce((row, header, index) => {
      row[header] = values[index];
      return row;
    }, {});
  });
}

function getCountyId(feature) {
  const pcode = feature.properties?.adm1_pcode || '';
  const id = Number(pcode.replace(/^KE/, ''));
  if (!Number.isFinite(id)) {
    throw new Error(`County ${feature.properties?.adm1_name || 'Unknown'} has invalid adm1_pcode: ${pcode}`);
  }
  return String(id);
}

function ringBounds(ring) {
  return ring.reduce((bounds, point) => {
    const [lng, lat] = point;
    return {
      minLng: Math.min(bounds.minLng, lng),
      minLat: Math.min(bounds.minLat, lat),
      maxLng: Math.max(bounds.maxLng, lng),
      maxLat: Math.max(bounds.maxLat, lat)
    };
  }, { minLng: Infinity, minLat: Infinity, maxLng: -Infinity, maxLat: -Infinity });
}

function boundsContain(bounds, lat, lng) {
  return lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng;
}

function pointInRing(lat, lng, ring) {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [lngI, latI] = ring[i];
    const [lngJ, latJ] = ring[j];
    const intersects = ((latI > lat) !== (latJ > lat))
      && (lng < ((lngJ - lngI) * (lat - latI)) / ((latJ - latI) || Number.EPSILON) + lngI);

    if (intersects) inside = !inside;
  }

  return inside;
}

function polygonContainsPoint(lat, lng, rings) {
  if (!rings.length || !pointInRing(lat, lng, rings[0])) return false;
  return rings.slice(1).every(hole => !pointInRing(lat, lng, hole));
}

function normalizeFeature(feature) {
  const geometry = feature.geometry || {};
  const polygons = geometry.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon'
      ? geometry.coordinates
      : [];

  const indexedPolygons = polygons.map(rings => ({
    rings,
    bounds: ringBounds(rings[0] || [])
  }));

  const bounds = indexedPolygons.reduce((combined, polygon) => ({
    minLng: Math.min(combined.minLng, polygon.bounds.minLng),
    minLat: Math.min(combined.minLat, polygon.bounds.minLat),
    maxLng: Math.max(combined.maxLng, polygon.bounds.maxLng),
    maxLat: Math.max(combined.maxLat, polygon.bounds.maxLat)
  }), { minLng: Infinity, minLat: Infinity, maxLng: -Infinity, maxLat: -Infinity });

  return {
    id: getCountyId(feature),
    name: feature.properties?.adm1_name || 'Unknown',
    bounds,
    polygons: indexedPolygons
  };
}

function findCounty(counties, lat, lng) {
  return counties.find(county => (
    boundsContain(county.bounds, lat, lng)
    && county.polygons.some(polygon => (
      boundsContain(polygon.bounds, lat, lng)
      && polygonContainsPoint(lat, lng, polygon.rings)
    ))
  ));
}

function coordinateKey(lat, lng) {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

function resolveCounty(pointCountyCache, counties, lat, lng) {
  const key = coordinateKey(lat, lng);
  if (!pointCountyCache.has(key)) {
    pointCountyCache.set(key, findCounty(counties, lat, lng)?.id || null);
  }
  return pointCountyCache.get(key);
}

function summarizeRows(rows, counties, pointCountyCache, fileName) {
  const summaries = new Map(counties.map(county => [county.id, {
    rain: 0,
    tmin: 0,
    tmax: 0,
    count: 0
  }]));

  let unmatched = 0;

  rows.forEach(row => {
    const lat = Number(row.lat);
    const lng = Number(row.lon);
    const rain = Number(row.rain);
    const tmin = Number(row.tmin);
    const tmax = Number(row.tmax);

    if (![lat, lng, rain, tmin, tmax].every(Number.isFinite)) return;

    const countyId = resolveCounty(pointCountyCache, counties, lat, lng);
    if (!countyId) {
      unmatched += 1;
      return;
    }

    const summary = summaries.get(countyId);
    summary.rain += rain;
    summary.tmin += tmin;
    summary.tmax += tmax;
    summary.count += 1;
  });

  if (unmatched) {
    console.warn(`${fileName}: ${unmatched} forecast points were outside county boundaries.`);
  }

  return Object.fromEntries([...summaries.entries()]
    .filter(([, summary]) => summary.count > 0)
    .map(([id, summary]) => [id, {
      rain: round2(summary.rain / summary.count),
      tmin: round2(summary.tmin / summary.count),
      tmax: round2(summary.tmax / summary.count),
      wind: null,
      wind_dir: null,
      point_count: summary.count
    }]));
}

function discoverForecastFiles() {
  return fs.readdirSync(DATA_DIR)
    .map(file => {
      const match = file.match(FORECAST_FILE_RE);
      return match ? { file, start: match[1], end: match[2] } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.start.localeCompare(b.start) || a.file.localeCompare(b.file));
}

function main() {
  const admin1 = readJSON(ADMIN1_PATH);
  const counties = (admin1.features || []).map(normalizeFeature);
  const forecastFiles = discoverForecastFiles();
  const pointCountyCache = new Map();
  const existingPeriods = readExistingForecastData();

  if (!forecastFiles.length) {
    throw new Error(`No forecast CSVs found in ${DATA_DIR}`);
  }

  const periods = forecastFiles.map(period => {
    const existingPeriod = existingPeriods.get(period.file);
    if (existingPeriod?.counties && Object.keys(existingPeriod.counties).length) {
      return {
        ...period,
        counties: existingPeriod.counties
      };
    }

    const csvPath = path.join(DATA_DIR, period.file);
    const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
    return {
      ...period,
      counties: summarizeRows(rows, counties, pointCountyCache, period.file)
    };
  });

  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(forecastFiles, null, 2)}\n`);
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify({ periods }, null, 2)}\n`);

  console.log(`Wrote ${forecastFiles.length} forecast file entries to ${path.relative(ROOT, MANIFEST_PATH)}`);
  console.log(`Wrote ${periods.length} forecast periods to ${path.relative(ROOT, OUTPUT_PATH)}`);
}

main();
