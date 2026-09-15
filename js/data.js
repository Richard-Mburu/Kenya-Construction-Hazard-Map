// ============================================================
// KENYA CONSTRUCTION HAZARD MAP — MASTER DATA
// Sources: RCMRD Hazard Atlas, KeNHA, KENGEN, World Bank Disaster Profile
// Coordinates verified against Kenya Geo-portal (portal.rcmrd.org)
// ============================================================

const WEIGHTS = { flood: 0.30, landslide: 0.15, earthquake: 0.20, drought: 0.10, urban: 0.15, volcanic: 0.05, soilRisk: 0.05 };

const HAZARD_META = {
  flood:      { label: 'Flood Risk',       icon: '🌊', color: '#ef4444', weight: '30%', desc: 'River flooding, storm surge, 100yr floodplain' },
  landslide:  { label: 'Landslide',        icon: '⛰️', color: '#f97316', weight: '15%', desc: 'Colluvial slope failure, debris flow' },
  earthquake: { label: 'Earthquake',       icon: '⚡', color: '#a855f7', weight: '20%', desc: 'Seismic zone proximity, rift activity' },
  drought:    { label: 'Drought',          icon: '☀️', color: '#f59e0b', weight: '10%', desc: 'ASAL zones, SPI < -1.5 frequency' },
  urban:      { label: 'Urban Flooding',   icon: '🏙️', color: '#14b8a6', weight: '15%', desc: 'Impervious cover, drainage overload' },
  volcanic:   { label: 'Volcanic',         icon: '🌋', color: '#ec4899', weight: '5%',  desc: 'Rift volcanic centres, fumarole zones' },
  soilRisk:   { label: 'Soil Stability',   icon: '🔩', color: '#3b82f6', weight: '5%',  desc: 'Black cotton, expansive clays, bearing capacity' },
};

// Senior Management KPIs
const MANAGEMENT_KPIS = {
  scheduleAdherence: { label: 'Schedule Adherence', unit: '%', target: '> 85%', critical: '< 70%' },
  safetyIncidents: { label: 'Safety Incidents', unit: 'count', target: '0', critical: '> 2' },
  qualityScore: { label: 'Quality Score', unit: '/10', target: '> 8.5', critical: '< 7.0' },
  communitySatisfaction: { label: 'Community Satisfaction', unit: '/10', target: '> 8.0', critical: '< 6.0' },
  environmentalCompliance: { label: 'Environmental Compliance', unit: '%', target: '100%', critical: '< 90%' },
  contractorPerformance: { label: 'Contractor Performance', unit: '/10', target: '> 8.0', critical: '< 7.0' },
  resourceUtilization: { label: 'Resource Utilization', unit: '%', target: '> 80%', critical: '< 60%' }
};

const SITES = [
  {
    id: 1, name: "Kakuma Camp Borehole BH-07 Rehabilitation", shortName: "Kakuma BH-07",
    county: "Turkana", lat: 3.7190, lng: 34.8660, status: "Active", type: "Borehole",
    contractor: "Internal WASH Unit / Turkana Drilling Services", budget: "KES 12.4M",
    flood: 3, landslide: 1, earthquake: 3, drought: 9, urban: 2, volcanic: 1, soilRisk: 5,
    // Performance Metrics
    budgetVariance: 8.5, scheduleAdherence: 92, safetyIncidents: 0, qualityScore: 8.7,
    communitySatisfaction: 8.9, environmentalCompliance: 95, contractorPerformance: 8.8, resourceUtilization: 85,
    desc: "Deep borehole rehabilitation and solar pumping upgrade serving camp households and community tapstands.",
    field: "Pump discharge reduced during peak dry season. Elevated salinity reported at two tapstands. Apron cracking around the borehole headworks requires sealing before the next maintenance cycle.",
    riskNotes: ["Severe dry season drawdown affecting yield", "Cracked apron allows runoff ingress around casing", "Water trucking demand rises when BH-07 output drops below threshold"],
    lastAssessment: "2026-03-14", assessor: "Eng. R. Ekal",
    photos: ["kakuma_bh07_headworks.jpg", "solar_pump_array.jpg"]
  },
  {
    id: 2, name: "Dadaab Dagahaley School WASH Block Package", shortName: "Dagahaley WASH Block",
    county: "Garissa", lat: 0.0520, lng: 40.3080, status: "Active", type: "School WASH",
    contractor: "Humanitarian Infrastructure Team / Sahil Builders", budget: "KES 18.9M",
    flood: 4, landslide: 1, earthquake: 2, drought: 8, urban: 2, volcanic: 1, soilRisk: 6,
    // Performance Metrics
    budgetVariance: 12.3, scheduleAdherence: 78, safetyIncidents: 1, qualityScore: 8.2,
    communitySatisfaction: 8.5, environmentalCompliance: 88, contractorPerformance: 7.9, resourceUtilization: 82,
    desc: "Construction of gender-segregated latrines, shower cubicles, and handwashing lines for a camp primary school.",
    field: "Superstructure is progressing well, but water storage is undersized for projected enrolment. The sandy subgrade needs additional compaction around the soak pit alignment.",
    riskNotes: ["Water availability remains a major operational constraint", "Loose sandy soils around pits require lining verification", "Shade and drainage needed at handwashing queue area"],
    lastAssessment: "2026-02-27", assessor: "Eng. H. Abdi",
    photos: ["dagahaley_latrine_block.jpg", "handwashing_line.jpg"]
  },
  {
    id: 3, name: "Mathare Health Centre Incinerator & Placenta Pit", shortName: "Mathare Incinerator",
    county: "Nairobi", lat: -1.2590, lng: 36.8520, status: "Active", type: "Incinerator",
    contractor: "Medical Infrastructure Unit / UrbanCare Contractors", budget: "KES 9.8M",
    flood: 7, landslide: 1, earthquake: 3, drought: 2, urban: 8, volcanic: 1, soilRisk: 5,
    // Performance Metrics
    budgetVariance: 6.2, scheduleAdherence: 89, safetyIncidents: 0, qualityScore: 9.1,
    communitySatisfaction: 7.8, environmentalCompliance: 100, contractorPerformance: 8.9, resourceUtilization: 91,
    desc: "Low-capacity healthcare waste incinerator, ash pit, and placenta pit package for an urban clinic compound.",
    field: "Drainage channel at the rear boundary is silting up, increasing flood exposure around the ash pit. Brickwork at the secondary chamber is complete and chimney bracing is pending.",
    riskNotes: ["Urban runoff from adjacent settlement enters the clinic compound", "Ash pit bunding must be raised before commissioning", "Stormwater diversion trench requires regular desilting"],
    lastAssessment: "2026-03-30", assessor: "Eng. M. Njeri",
    photos: ["mathare_incinerator_foundation.jpg", "compound_drainage.jpg"]
  },
  {
    id: 4, name: "Baringo School Classroom Block & Rainwater Harvesting", shortName: "Baringo Classrooms",
    county: "Baringo", lat: 0.4890, lng: 35.7440, status: "Active", type: "Classroom Block",
    contractor: "Education Support Unit / Rift Build Co.", budget: "KES 21.6M",
    flood: 5, landslide: 6, earthquake: 5, drought: 5, urban: 2, volcanic: 2, soilRisk: 6,
    // Performance Metrics
    budgetVariance: 15.8, scheduleAdherence: 65, safetyIncidents: 2, qualityScore: 7.4,
    communitySatisfaction: 8.1, environmentalCompliance: 92, contractorPerformance: 7.2, resourceUtilization: 68,
    desc: "Two-classroom block, staff office, accessibility ramp, and roof catchment tanks for a host community school.",
    field: "Cut slope behind the classroom line shows fresh erosion after heavy rainfall. Gutter brackets for the rainwater system are not yet tied into the final roof fascia.",
    riskNotes: ["Slope wash behind classrooms could undermine rear foundation trench", "Roof water harvesting is critical for school WASH continuity", "Foundation soils soften quickly after storms"],
    lastAssessment: "2026-03-09", assessor: "Eng. C. Chepkemoi",
    photos: ["baringo_classroom_block.jpg", "rw_harvesting_tanks.jpg"]
  },
  {
    id: 5, name: "Lamu Island Child Friendly Space Extension", shortName: "Lamu CFS",
    county: "Lamu", lat: -2.2710, lng: 40.9028, status: "Active", type: "Child Friendly Space",
    contractor: "Protection Infrastructure Team / Coastline Works", budget: "KES 14.2M",
    flood: 7, landslide: 1, earthquake: 2, drought: 4, urban: 5, volcanic: 1, soilRisk: 4,
    // Performance Metrics
    budgetVariance: 9.4, scheduleAdherence: 85, safetyIncidents: 0, qualityScore: 8.9,
    communitySatisfaction: 8.7, environmentalCompliance: 95, contractorPerformance: 8.8, resourceUtilization: 88,
    desc: "Expansion of a child friendly space with shaded play court, accessible latrine, fencing, and drainage improvements.",
    field: "Surface water collects near the play area during coastal storms. The timber shade structure is installed, but the perimeter drain outfall remains unfinished.",
    riskNotes: ["Coastal rainfall events create standing water in the play zone", "Drainage outlet must be completed before opening", "Salt air exposure requires protective coating on steel members"],
    lastAssessment: "2026-01-21", assessor: "Eng. A. Mwasi",
    photos: ["lamu_cfs_court.jpg", "perimeter_drain.jpg"]
  },
  {
    id: 6, name: "Garissa Integrated Hygiene Promotion Hub", shortName: "Garissa Hygiene Hub",
    county: "Garissa", lat: -0.4530, lng: 39.6450, status: "Planned", type: "Hygiene Promotion Hub",
    contractor: "Community WASH Programme / Frontier Construction", budget: "KES 11.3M",
    flood: 5, landslide: 1, earthquake: 2, drought: 8, urban: 3, volcanic: 1, soilRisk: 5,
    // Performance Metrics
    budgetVariance: 3.1, scheduleAdherence: 95, safetyIncidents: 0, qualityScore: 9.4,
    communitySatisfaction: 9.3, environmentalCompliance: 98, contractorPerformance: 9.2, resourceUtilization: 92,
    desc: "Community hygiene promotion space with demonstration handwashing stations, storage, and training shelter.",
    field: "Site fencing is complete and slab setting out has started. The layout needs a larger shaded waiting area because of high daytime temperatures.",
    riskNotes: ["Heat stress will affect user uptake without shade", "Water supply for demo stations depends on tanker refill schedule", "Wind-blown sand may clog soakaway media"],
    lastAssessment: "2026-02-12", assessor: "Eng. Y. Mohamed",
    photos: ["garissa_training_shelter.jpg", "handwashing_demo_bays.jpg"]
  },
  {
    id: 7, name: "Mombasa Transit Centre Handwashing Corridor", shortName: "Mombasa Handwashing",
    county: "Mombasa", lat: -4.0430, lng: 39.6680, status: "Active", type: "Handwashing Station",
    contractor: "Public Health Support Team / Coast Fabricators", budget: "KES 6.7M",
    flood: 6, landslide: 1, earthquake: 2, drought: 3, urban: 8, volcanic: 1, soilRisk: 4,
    // Performance Metrics
    budgetVariance: 7.8, scheduleAdherence: 88, safetyIncidents: 1, qualityScore: 8.4,
    communitySatisfaction: 8.1, environmentalCompliance: 89, contractorPerformance: 8.3, resourceUtilization: 85,
    desc: "Network of durable handwashing stations with greywater drainage, signage, and accessibility improvements at a transit centre.",
    field: "The steel stands are installed but floor runoff still pools near the queue line. Signage is in place and soap dispensers are awaiting final mounting.",
    riskNotes: ["Urban ponding at entrances reduces safe access", "Greywater trench needs more fall toward outlet", "Corrosion protection needed in the coastal environment"],
    lastAssessment: "2026-03-19", assessor: "Eng. S. Juma",
    photos: ["mombasa_handwash_corridor.jpg", "queue_drainage_channel.jpg"]
  },
  {
    id: 8, name: "West Pokot Stabilized Latrine & Shower Block", shortName: "West Pokot WASH Block",
    county: "West Pokot", lat: 1.2400, lng: 35.1190, status: "Active", type: "Latrine Block",
    contractor: "Internal WASH Team / Pokot Masonry Group", budget: "KES 13.5M",
    flood: 4, landslide: 8, earthquake: 3, drought: 6, urban: 1, volcanic: 1, soilRisk: 7,
    // Performance Metrics
    budgetVariance: 22.1, scheduleAdherence: 58, safetyIncidents: 4, qualityScore: 6.8,
    communitySatisfaction: 7.1, environmentalCompliance: 78, contractorPerformance: 6.2, resourceUtilization: 62,
    desc: "Raised latrine and shower block with retaining wall, lined pits, and retaining drainage on sloping terrain.",
    field: "Slope movement is visible upslope of the retaining wall alignment. The pit lining works are complete, but surface water control measures need reinforcing before long rains intensify.",
    riskNotes: ["Steep hillside location creates high landslide exposure", "Retaining wall toe drainage is undersized", "Access path needs erosion control to remain safe for children"],
    lastAssessment: "2026-03-02", assessor: "Eng. J. Chepkurui",
    photos: ["pokot_latrine_block.jpg", "slope_retaining_wall.jpg"]
  },
  {
    id: 9, name: "Naivasha Health Post Waste Zone Upgrade", shortName: "Naivasha Waste Zone",
    county: "Nakuru", lat: -0.7170, lng: 36.4330, status: "Active", type: "Incinerator",
    contractor: "Health Infrastructure Team / Valley Kilns Ltd", budget: "KES 8.9M",
    flood: 4, landslide: 4, earthquake: 7, drought: 4, urban: 3, volcanic: 5, soilRisk: 6,
    // Performance Metrics
    budgetVariance: 11.2, scheduleAdherence: 76, safetyIncidents: 1, qualityScore: 8.1,
    communitySatisfaction: 8.4, environmentalCompliance: 91, contractorPerformance: 7.9, resourceUtilization: 79,
    desc: "Controlled medical waste zone including small incinerator, ash pit, sharps pit, and wash slab.",
    field: "The combustion chamber base is complete. Fine volcanic soils and a fluctuating water table require additional base stabilization around the ash pit apron.",
    riskNotes: ["Rift Valley seismicity affects masonry detailing", "Volcanic soils reduce foundation consistency", "Groundwater variability may affect pit performance"],
    lastAssessment: "2026-03-11", assessor: "Eng. L. Njoroge",
    photos: ["naivasha_incinerator_base.jpg", "ash_pit_formwork.jpg"]
  },
  {
    id: 10, name: "Kitui Solar-Powered Water Kiosk", shortName: "Kitui Water Kiosk",
    county: "Kitui", lat: -1.3660, lng: 38.0100, status: "Active", type: "Water Kiosk",
    contractor: "Resilience WASH Team / Kitui Solar Works", budget: "KES 10.6M",
    flood: 3, landslide: 2, earthquake: 3, drought: 8, urban: 2, volcanic: 1, soilRisk: 5,
    // Performance Metrics
    budgetVariance: 8.7, scheduleAdherence: 82, safetyIncidents: 0, qualityScore: 8.6,
    communitySatisfaction: 8.8, environmentalCompliance: 93, contractorPerformance: 8.4, resourceUtilization: 86,
    desc: "Solar-powered community water kiosk with elevated tank, metered taps, and vendor shade structure.",
    field: "Tank stand erection is complete, but the pump output varies sharply in late afternoon. Dust accumulation on panels and weak fencing around the kiosk remain operational concerns.",
    riskNotes: ["Extended drought increases demand beyond storage buffer", "Dust reduces solar efficiency without cleaning schedule", "Weak perimeter control may increase vandalism risk"],
    lastAssessment: "2026-02-08", assessor: "Eng. E. Mulandi",
    photos: ["kitui_water_kiosk.jpg", "solar_panel_mount.jpg"]
  },
  {
    id: 11, name: "Kibera School Toilet & Menstrual Hygiene Wing", shortName: "Kibera MHM Wing",
    county: "Nairobi", lat: -1.3120, lng: 36.7830, status: "Active", type: "School WASH",
    contractor: "Urban Education Programme / Build4Dignity", budget: "KES 16.1M",
    flood: 8, landslide: 1, earthquake: 3, drought: 2, urban: 9, volcanic: 1, soilRisk: 6,
    // Performance Metrics
    budgetVariance: 13.4, scheduleAdherence: 71, safetyIncidents: 2, qualityScore: 7.6,
    communitySatisfaction: 8.2, environmentalCompliance: 84, contractorPerformance: 7.4, resourceUtilization: 73,
    desc: "Dense-settlement school sanitation block with changing room, accessible cubicle, rainwater storage, and handwashing troughs.",
    field: "Stormwater from adjacent roofs still enters the access court. Interior partitions are complete and tile finishes are underway in the menstrual hygiene room.",
    riskNotes: ["Flash flooding in surrounding lanes affects safe access", "High runoff requires covered drains around the block", "Peak enrolment will strain water storage during dry months"],
    lastAssessment: "2026-04-04", assessor: "Eng. P. Atieno",
    photos: ["kibera_school_wash.jpg", "access_court_drain.jpg"]
  },
  {
    id: 12, name: "Isiolo Mobile Clinic Water Storage Compound", shortName: "Isiolo Water Compound",
    county: "Isiolo", lat: 0.3540, lng: 37.5820, status: "Active", type: "Health Facility WASH",
    contractor: "Health & WASH Joint Team / Northern Tanks Ltd", budget: "KES 7.5M",
    flood: 4, landslide: 2, earthquake: 3, drought: 9, urban: 2, volcanic: 1, soilRisk: 5,
    // Performance Metrics
    budgetVariance: 5.3, scheduleAdherence: 91, safetyIncidents: 0, qualityScore: 8.8,
    communitySatisfaction: 8.9, environmentalCompliance: 96, contractorPerformance: 8.7, resourceUtilization: 89,
    desc: "Protected water storage, wash slab, and distribution point serving a remote mobile clinic and outreach team.",
    field: "Storage tank base is complete, but tanker turnaround space becomes dusty and difficult to manage during windy periods. The wash slab drainage route needs gravel surfacing.",
    riskNotes: ["Water tanker dependency creates drought vulnerability", "Open apron edges may erode without surfacing", "Remote location delays repair response if fittings fail"],
    lastAssessment: "2026-03-06", assessor: "Eng. H. Wako",
    photos: ["isiolo_tank_base.jpg", "clinic_wash_slab.jpg"]
  },
  {
    id: 13, name: "Kajiado Child Protection Play Park", shortName: "Kajiado Play Park",
    county: "Kajiado", lat: -1.8500, lng: 36.7830, status: "Completed", type: "Play Park",
    contractor: "Child Protection Infrastructure Team / Enkai Works", budget: "KES 5.2M",
    flood: 3, landslide: 3, earthquake: 5, drought: 6, urban: 2, volcanic: 2, soilRisk: 4,
    // Performance Metrics
    budgetVariance: 4.8, scheduleAdherence: 94, safetyIncidents: 0, qualityScore: 9.0,
    communitySatisfaction: 9.1, environmentalCompliance: 97, contractorPerformance: 8.9, resourceUtilization: 91,
    desc: "Small children’s play park with shade sails, soft-fall surface, and perimeter fencing in a community support centre.",
    field: "The park is functional and drainage is generally acceptable. Surface wear is beginning near the swing bay and shade sail anchors should be retensioned before the windy season.",
    riskNotes: ["Dry conditions increase dust on the play surface", "Wind loading affects shade sail stability", "Routine surface maintenance needed around high-use play elements"],
    lastAssessment: "2026-01-28", assessor: "Eng. N. Nkaduda",
    photos: ["kajiado_play_park.jpg", "shade_sail_anchor.jpg"]
  },
  {
    id: 14, name: "Nandi Hilltop Early Childhood Classroom Wing", shortName: "Nandi ECCD Wing",
    county: "Nandi", lat: 0.1910, lng: 35.1820, status: "Active", type: "Classroom Block",
    contractor: "Education Team / Highland Builders", budget: "KES 17.8M",
    flood: 5, landslide: 7, earthquake: 3, drought: 3, urban: 2, volcanic: 1, soilRisk: 6,
    // Performance Metrics
    budgetVariance: 18.7, scheduleAdherence: 67, safetyIncidents: 3, qualityScore: 7.2,
    communitySatisfaction: 7.8, environmentalCompliance: 81, contractorPerformance: 6.9, resourceUtilization: 69,
    desc: "Early childhood classroom wing with veranda, ramp, toy store, and child-height hygiene points on a hillside school compound.",
    field: "Runoff from the upper slope is entering the foundation area after heavy rain. Masonry work is progressing, but retaining drains need to be installed before the slab pour.",
    riskNotes: ["Hillside runoff threatens rear foundation stability", "Children’s access path requires anti-slip surfacing", "Drain installation is on the critical path before slab work"],
    lastAssessment: "2026-03-26", assessor: "Eng. C. Rotich",
    photos: ["nandi_eccd_block.jpg", "rear_slope_drain.jpg"]
  },
  {
    id: 15, name: "Murang'a Spring Protection & Collection Chamber", shortName: "Murang'a Spring Works",
    county: "Murang'a", lat: -0.7160, lng: 37.1520, status: "Active", type: "Spring Protection",
    contractor: "Rural WASH Team / Aberdare Stoneworks", budget: "KES 4.9M",
    flood: 6, landslide: 6, earthquake: 3, drought: 3, urban: 2, volcanic: 1, soilRisk: 5,
    // Performance Metrics
    budgetVariance: 6.1, scheduleAdherence: 87, safetyIncidents: 0, qualityScore: 8.7,
    communitySatisfaction: 8.6, environmentalCompliance: 94, contractorPerformance: 8.5, resourceUtilization: 87,
    desc: "Spring box, collection chamber, retaining apron, and pipe route stabilization for a gravity-fed community water source.",
    field: "High runoff is causing scour around the outfall and there are small slips along the footpath to the intake. Masonry quality is good, but the headwall toe needs more stone pitching.",
    riskNotes: ["Strong runoff may undermine the spring apron", "Access route is exposed to slope slips", "Collection chamber needs extra erosion protection at the discharge point"],
    lastAssessment: "2026-03-12", assessor: "Eng. G. Gitau",
    photos: ["muranga_spring_box.jpg", "intake_footpath.jpg"]
  },
  {
    id: 16, name: "Marsabit Child Friendly Space & WASH Compound", shortName: "Marsabit CFS Compound",
    county: "Marsabit", lat: 2.3340, lng: 37.9960, status: "Planned", type: "Child Friendly Space",
    contractor: "Protection & WASH Joint Team / Marsabit Build Hub", budget: "KES 19.4M",
    flood: 3, landslide: 2, earthquake: 3, drought: 9, urban: 2, volcanic: 1, soilRisk: 5,
    // Performance Metrics
    budgetVariance: 2.1, scheduleAdherence: 98, safetyIncidents: 0, qualityScore: 9.3,
    communitySatisfaction: 9.2, environmentalCompliance: 99, contractorPerformance: 9.1, resourceUtilization: 95,
    desc: "Integrated child friendly space with shaded learning shelter, small play court, latrines, and water point.",
    field: "Site layout is approved and excavation is about to begin. Water storage needs to be increased to serve both child protection and hygiene activities during prolonged dry spells.",
    riskNotes: ["Very high drought pressure affects water planning", "Shade provision is essential for daytime use", "Wind protection needed for light roofing components"],
    lastAssessment: "2026-01-24", assessor: "Eng. P. Njoroge",
    photos: ["marsabit_cfs_layout.jpg", "proposed_water_tank_zone.jpg"]
  },
  {
    id: 17, name: "Turkana Nutrition Site Kitchen & Handwashing Yard", shortName: "Turkana Kitchen Yard",
    county: "Turkana", lat: 2.5900, lng: 36.8000, status: "Completed", type: "Nutrition Support Facility",
    contractor: "Nutrition Programme Team / Loiyangalani Works", budget: "KES 7.2M",
    flood: 3, landslide: 1, earthquake: 3, drought: 9, urban: 1, volcanic: 2, soilRisk: 4,
    // Performance Metrics
    budgetVariance: 4.2, scheduleAdherence: 93, safetyIncidents: 0, qualityScore: 8.9,
    communitySatisfaction: 8.7, environmentalCompliance: 95, contractorPerformance: 8.8, resourceUtilization: 90,
    desc: "Covered community kitchen, food preparation slab, and handwashing yard supporting a nutrition outreach site.",
    field: "The facility is operational. Dust control around the cooking yard remains the main issue, and the handwashing taps need better splash management to avoid apron wear.",
    riskNotes: ["Extreme drought affects daily water supply planning", "Dust control is needed around food preparation areas", "Apron splash may cause localized erosion if unmanaged"],
    lastAssessment: "2026-02-16", assessor: "Eng. E. Ekiru",
    photos: ["turkana_kitchen_yard.jpg", "handwash_apron.jpg"]
  },
  {
    id: 18, name: "Meru Inclusive Playground & Classroom Veranda", shortName: "Meru Playground",
    county: "Meru", lat: 0.0470, lng: 37.6490, status: "Active", type: "Play Park",
    contractor: "Education & Protection Team / Meru Joinery Works", budget: "KES 6.4M",
    flood: 5, landslide: 5, earthquake: 2, drought: 4, urban: 3, volcanic: 1, soilRisk: 5,
    // Performance Metrics
    budgetVariance: 9.4, scheduleAdherence: 79, safetyIncidents: 1, qualityScore: 8.1,
    communitySatisfaction: 8.3, environmentalCompliance: 87, contractorPerformance: 7.8, resourceUtilization: 81,
    desc: "Inclusive play park, shaded veranda extension, and child-height hygiene points within a school compound on the Mt. Kenya foothills.",
    field: "Drainage along the veranda edge is improving, but the lower play area still becomes soft after long rains. Timber play elements need weatherproof coating before handover.",
    riskNotes: ["Footslope runoff affects play surface usability", "Moist conditions increase maintenance demands on timber elements", "Veranda drain outlets need stone protection"],
    lastAssessment: "2026-03-17", assessor: "Eng. K. Muthoni",
    photos: ["meru_playground.jpg", "veranda_drainage.jpg"]
  },
  {
    id: 19, name: "Kisumu Cholera Preparedness Wash Point Network", shortName: "Kisumu Wash Points",
    county: "Kisumu", lat: -0.1020, lng: 34.7610, status: "Active", type: "Handwashing Station",
    contractor: "Emergency Response WASH Team / Lake Region Fabricators", budget: "KES 8.1M",
    flood: 8, landslide: 1, earthquake: 2, drought: 3, urban: 6, volcanic: 1, soilRisk: 7,
    // Performance Metrics
    budgetVariance: 12.3, scheduleAdherence: 74, safetyIncidents: 2, qualityScore: 7.7,
    communitySatisfaction: 7.9, environmentalCompliance: 82, contractorPerformance: 7.5, resourceUtilization: 76,
    desc: "Distributed handwashing and chlorination points with drainage aprons across a flood-prone informal settlement area.",
    field: "Several station bases remain vulnerable to saturation during heavy rainfall. The steel frames are complete and the chlorination cabinets are awaiting lock installation.",
    riskNotes: ["Flood-prone low ground threatens station access", "Black cotton soils may crack concrete aprons", "Drainage channels need regular cleaning during outbreaks"],
    lastAssessment: "2026-03-21", assessor: "Eng. O. Ochieng",
    photos: ["kisumu_wash_point.jpg", "chlorination_station.jpg"]
  },
  {
    id: 20, name: "Kiambu Refugee Support Centre Classroom & Sanitation Upgrade", shortName: "Kiambu Support Centre",
    county: "Kiambu", lat: -1.1710, lng: 36.7820, status: "Planned", type: "Classroom Block",
    contractor: "Urban Support Programme / Inclusive Spaces Ltd", budget: "KES 22.7M",
    flood: 6, landslide: 4, earthquake: 4, drought: 2, urban: 7, volcanic: 1, soilRisk: 6,
    // Performance Metrics
    budgetVariance: 1.8, scheduleAdherence: 97, safetyIncidents: 0, qualityScore: 9.2,
    communitySatisfaction: 9.0, environmentalCompliance: 98, contractorPerformance: 9.0, resourceUtilization: 93,
    desc: "Support centre upgrade including modular classroom, counselling room, sanitation block, and child-safe outdoor waiting area.",
    field: "The design is approved and site clearing is pending. The compound will need stronger stormwater control along the lower boundary before foundation works begin.",
    riskNotes: ["Urban drainage on the lower boundary needs redesign", "Waiting area should remain accessible during rain events", "Black cotton pockets may require selective subgrade improvement"],
    lastAssessment: "2026-01-15", assessor: "Eng. W. Maina",
    photos: ["kiambu_support_centre_layout.jpg", "lower_boundary_drain.jpg"]
  }
];

// Compute totals and levels
function totalScore(s) {
  return Math.round(
    s.flood * WEIGHTS.flood * 10 +
    s.landslide * WEIGHTS.landslide * 10 +
    s.earthquake * WEIGHTS.earthquake * 10 +
    s.drought * WEIGHTS.drought * 10 +
    s.urban * WEIGHTS.urban * 10 +
    s.volcanic * WEIGHTS.volcanic * 10 +
    s.soilRisk * WEIGHTS.soilRisk * 10
  );
}

function riskLevel(score) {
  if (score >= 65) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

function scoreColor(score) {
  if (score >= 65) return '#ef4444';
  if (score >= 40) return '#f59e0b';
  return '#22c55e';
}

SITES.forEach(s => { s.total = totalScore(s); s.level = riskLevel(s.total); });
SITES.sort((a, b) => b.total - a.total);

// Hazard heatmap data points [lat, lng, intensity]
const HAZARD_HEATPOINTS = {
  flood: [
    [-1.15, 37.05, 0.92], [-1.27, 37.01, 0.95], [-1.90, 38.04, 0.88],
    [-0.08, 34.75, 0.85], [-0.37, 34.63, 0.78], [-1.00, 40.10, 0.72],
    [-2.27, 40.90, 0.82], [1.09, 34.08, 0.74], [-4.06, 39.66, 0.65],
    [-0.15, 34.80, 0.80], [-1.27, 36.85, 0.70], [-1.60, 37.20, 0.75],
  ],
  landslide: [
    [-0.30, 35.62, 0.85], [0.57, 35.61, 0.92], [-0.72, 36.43, 0.88],
    [0.19, 35.18, 0.82], [-1.03, 37.08, 0.74], [-0.40, 36.65, 0.68],
    [-0.05, 37.06, 0.78], [-0.60, 36.80, 0.72], [0.50, 35.30, 0.65],
  ],
  earthquake: [
    [-0.90, 36.30, 0.95], [-0.72, 36.43, 0.88], [-0.30, 35.62, 0.82],
    [0.57, 35.61, 0.78], [0.00, 36.00, 0.72], [-1.28, 36.65, 0.55],
    [-0.50, 36.10, 0.85], [0.20, 36.20, 0.70], [-1.00, 35.80, 0.60],
  ],
  drought: [
    [0.35, 37.58, 0.90], [-1.75, 37.08, 0.72], [1.50, 38.00, 0.85],
    [3.00, 38.50, 0.80], [-1.90, 38.04, 0.65], [2.59, 36.80, 0.92],
    [1.00, 37.50, 0.78], [0.80, 38.20, 0.82],
  ],
  urban: [
    [-1.28, 36.82, 0.95], [-1.08, 36.95, 0.88], [-1.27, 37.01, 0.92],
    [-1.32, 36.75, 0.75], [-4.06, 39.66, 0.70], [-1.22, 36.88, 0.80],
  ],
  volcanic: [
    [-0.90, 36.30, 0.95], [0.18, 36.06, 0.65], [-1.28, 36.65, 0.35],
    [-0.50, 36.20, 0.78], [0.00, 36.40, 0.55],
  ]
};

const KENYA_OUTLINE = [
  [4.62, 34.02],
  [4.62, 35.15],
  [4.58, 35.85],
  [4.15, 36.78],
  [3.55, 37.72],
  [3.32, 38.55],
  [3.92, 39.45],
  [4.32, 40.32],
  [4.10, 41.28],
  [3.18, 41.88],
  [1.75, 41.52],
  [0.42, 41.94],
  [-1.12, 41.35],
  [-1.78, 41.02],
  [-2.62, 40.92],
  [-3.48, 40.18],
  [-4.62, 39.62],
  [-4.70, 39.08],
  [-4.18, 38.34],
  [-3.35, 37.66],
  [-3.05, 37.03],
  [-2.38, 36.42],
  [-1.54, 35.96],
  [-1.08, 35.12],
  [-0.52, 34.62],
  [0.62, 34.20],
  [1.68, 34.12],
  [2.95, 34.45],
  [3.86, 34.48],
  [4.62, 34.02]
];

// County boundary simplified polygons (GeoJSON-style)
const KENYA_COUNTIES_SAMPLE = [
  { name: "Nairobi", color: "#3b82f6" },
  { name: "Mombasa", color: "#14b8a6" },
  { name: "Nakuru", color: "#a855f7" },
  { name: "Kisumu", color: "#22c55e" },
];
