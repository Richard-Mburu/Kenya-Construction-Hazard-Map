/* ============================================================
   KENYA CONSTRUCTION HAZARD MAP — Main Application Logic
   ============================================================ */

// ---- STATE ----
let map, markersLayer = [];
let sortKey = 'total', sortDir = -1;
let filteredSites = [];
let assessments = JSON.parse(localStorage.getItem('kchm_assessments') || '[]');
let assessmentNotifications = JSON.parse(localStorage.getItem('kchm_assessment_notifications') || '[]');
let layerState = {
  rainfall: true,
  heat: false,
  subcounty: false,
  wind: false,
  soil: false,
  solar: true,
  elevation: false,
  liveEarthquake: true
};
const dynamicLayers = {};
let admin0GeoJSON = null;
let admin1GeoJSON = null;
let admin2GeoJSON = null;
let allKmdPeriods = [];
let latestKmdPeriod = null;
let meteoGridData = null;
let elevationData = null;
let earthquakeData = null;
let surfaceRasterCache = {};
let dynamicLayersStarted = false;
let chartsInited = false;
let questionnaireStep = 0;
let questionnaireState = {};
let invitedUsers = JSON.parse(localStorage.getItem('kchm_invited_users') || '["admin@internal.local"]');
let currentUser = localStorage.getItem('kchm_current_user') || '';
const scoreVals = { flood:5, landslide:5, earthquake:5, drought:5, urban:5, volcanic:3, soilRisk:5 };
const PERFORMANCE_WEIGHTS = {
  scheduleAdherence: 0.24,
  safetyIncidents: 0.12,
  qualityScore: 0.22,
  communitySatisfaction: 0.14,
  environmentalCompliance: 0.14,
  contractorPerformance: 0.08,
  resourceUtilization: 0.06
};
const HEATMAP_PALETTES = {
  flood: [
    [0.15, '#dbeafe'],
    [0.32, '#7dd3fc'],
    [0.5, '#38bdf8'],
    [0.68, '#2563eb'],
    [0.84, '#1d4ed8'],
    [1.0, '#172554']
  ],
  landslide: [
    [0.15, '#ffedd5'],
    [0.35, '#fdba74'],
    [0.55, '#fb923c'],
    [0.75, '#ea580c'],
    [0.9, '#c2410c'],
    [1.0, '#7c2d12']
  ],
  earthquake: [
    [0.15, '#f3e8ff'],
    [0.35, '#d8b4fe'],
    [0.55, '#c084fc'],
    [0.75, '#a855f7'],
    [0.9, '#7e22ce'],
    [1.0, '#581c87']
  ],
  drought: [
    [0.15, '#fef3c7'],
    [0.35, '#fde68a'],
    [0.55, '#fbbf24'],
    [0.75, '#f59e0b'],
    [0.9, '#d97706'],
    [1.0, '#92400e']
  ],
  urban: [
    [0.15, '#ccfbf1'],
    [0.35, '#99f6e4'],
    [0.55, '#2dd4bf'],
    [0.75, '#14b8a6'],
    [0.9, '#0f766e'],
    [1.0, '#134e4a']
  ],
  volcanic: [
    [0.15, '#fce7f3'],
    [0.35, '#f9a8d4'],
    [0.55, '#f472b6'],
    [0.75, '#ec4899'],
    [0.9, '#be185d'],
    [1.0, '#831843']
  ]
};
const KMD_LAYER_META = {
  rainfall: {
    label: 'KMD rainfall',
    field: 'rain',
    unit: 'mm',
    colors: ['#eff6ff', '#bfdbfe', '#60a5fa', '#2563eb', '#1e40af', '#0f172a']
  },
  heat: {
    label: 'KMD maximum temperature',
    field: 'tmax',
    unit: 'C',
    colors: ['#fff7ed', '#fed7aa', '#fb923c', '#ef4444', '#b91c1c', '#7f1d1d']
  }
};
const SURFACE_LAYER_META = {
  soil: {
    label: 'Soil saturation',
    field: 'soil',
    unit: '% saturation',
    colors: ['#ca8a04', '#a3e635', '#22c55e', '#16a34a', '#15803d', '#14532d'],
    format: value => formatMetric(value * 100, '% saturation'),
    opacity: 0.5
  },
  solar: {
    label: 'Solar radiation',
    field: 'solar',
    unit: 'W/m2',
    colors: ['#fefce8', '#fef08a', '#facc15', '#f59e0b', '#d97706', '#92400e'],
    format: value => formatMetric(value, 'W/m2'),
    opacity: 0.42
  },
  elevation: {
    label: 'Elevation',
    field: 'elevation',
    unit: 'm',
    colors: ['#ecfccb', '#a3e635', '#65a30d', '#a16207', '#78716c', '#f8fafc']
  }
};
const LIVE_STATIONS = [
  { name: 'Lodwar', lat: 3.12, lng: 35.60 },
  { name: 'Mandera', lat: 3.94, lng: 41.86 },
  { name: 'Marsabit', lat: 2.33, lng: 37.99 },
  { name: 'Eldoret', lat: 0.52, lng: 35.27 },
  { name: 'Nakuru', lat: -0.30, lng: 36.08 },
  { name: 'Nyeri', lat: -0.42, lng: 36.95 },
  { name: 'Garissa', lat: -0.45, lng: 39.65 },
  { name: 'Kisumu', lat: -0.09, lng: 34.76 },
  { name: 'Nairobi', lat: -1.29, lng: 36.82 },
  { name: 'Machakos', lat: -1.52, lng: 37.26 },
  { name: 'Voi', lat: -3.40, lng: 38.56 },
  { name: 'Mombasa', lat: -4.05, lng: 39.67 }
].filter(p => isPointInPolygon(p.lat, p.lng, KENYA_OUTLINE));
const QUESTIONNAIRE_SECTIONS = [
  {
    id: 'safety',
    title: 'Section B — Safety & Safeguarding',
    items: [
      { id: 'site_fenced', label: 'Is the site fenced or barricaded to prevent public access?', guidance: 'Look for barrier tape, temporary fencing, or signage marking the danger zone.', type: 'radio', options: ['Yes', 'No'] },
      { id: 'workers_ppe', label: 'Are all workers wearing PPE?', guidance: 'Check hard hats, reflective vests, safety boots, gloves, and any missing PPE on active workers.', type: 'radio', options: ['Yes', 'No', 'Partial'] },
      { id: 'excavations_safe', label: 'Are open excavations, trenches, or casings covered or barricaded?', guidance: 'Unmarked open pits or boreholes near communities should be flagged immediately.', type: 'radio', options: ['Yes', 'No'] },
      { id: 'children_protected', label: 'Are children kept away from the active construction zone?', guidance: 'This is especially important near schools, child friendly spaces, or community compounds.', type: 'radio', options: ['Yes', 'No'] },
      { id: 'safeguarding_briefed', label: 'Have workers received safeguarding briefing or signed a safeguarding commitment?', guidance: 'Ask the supervisor whether the team has been briefed on child safeguarding and SCI conduct rules.', type: 'radio', options: ['Yes', 'No'] },
      { id: 'worker_behaviour', label: 'Any observations of inappropriate worker behaviour toward community members or children?', guidance: 'Record any concerns, complaints, or observed behaviour needing escalation.', type: 'radio', options: ['Yes', 'No'] }
    ]
  },
  {
    id: 'contractor',
    title: 'Section C — Contractor & Personnel',
    items: [
      { id: 'supervisor_present', label: 'Is the named supervisor or foreman on site?', guidance: 'Record whether the person on site matches the expected site lead.', type: 'radio', options: ['Yes', 'No'] },
      { id: 'supervisor_name', label: 'Supervisor name on site', guidance: 'Enter the name of the supervisor or foreman present during the visit.', type: 'text' },
      { id: 'enough_workers', label: 'Are enough workers actively engaged on site?', guidance: 'If the site is idle on a working day, note whether staffing appears too low for the work stage.', type: 'radio', options: ['Yes', 'No', 'Partial'] },
      { id: 'worker_count', label: 'Workers counted on site', guidance: 'Count visible workers, including casual labour.', type: 'text' },
      { id: 'mobilisation_window', label: 'Is the contractor mobilising within the required window?', guidance: 'Flag delayed mobilisation if work has not started in line with expectations.', type: 'radio', options: ['Yes', 'No'] },
      { id: 'work_schedule', label: 'Has the contractor submitted a current work schedule or programme?', guidance: 'Check whether actual progress broadly matches the programme being followed.', type: 'radio', options: ['Yes', 'No'] },
      { id: 'behind_schedule', label: 'Has actual progress been flagged as behind schedule?', guidance: 'Note if issues have been escalated or if delays are becoming material.', type: 'radio', options: ['Yes', 'No'] }
    ]
  },
  {
    id: 'quality',
    title: 'Section D — Physical Progress & Visual Quality Checks',
    items: [
      { id: 'water_source_protected', label: 'Is the water source or borehole headworks protected and in good condition?', guidance: 'Check casing, cap, apron, drainage, and signs of contamination around the source.', type: 'radio', options: ['Yes', 'No', 'Partial'], appliesToTypes: ['Borehole Rehab', 'Borehole Equipping'] },
      { id: 'test_pumping_done', label: 'Has test pumping or functional testing been completed and documented where relevant?', guidance: 'Applies to boreholes, pumps, kiosks, and other water supply components.', type: 'radio', options: ['Yes', 'No', 'N/A'], appliesToTypes: ['Borehole Rehab', 'Borehole Equipping'] },
      { id: 'water_quality_done', label: 'Has water quality testing been conducted where relevant?', guidance: 'Confirm whether physical, chemical, and bacteriological tests are available for operational water sources.', type: 'radio', options: ['Yes', 'No', 'N/A'], appliesToTypes: ['Borehole Rehab', 'Borehole Equipping'] },
      { id: 'tank_pipework_sound', label: 'Are elevated tanks, tapstands, and pipework connected and visibly leak-free?', guidance: 'Look for loose joints, leaks, poor support, or missing fixtures.', type: 'radio', options: ['Yes', 'No', 'Partial', 'N/A'], appliesToTypes: ['Borehole Equipping', 'School WASH', 'Latrine/Sanitation', 'CFS', 'Classroom', 'Other'] },
      { id: 'solar_sound', label: 'Are solar panels, frames, and electrical enclosures mounted securely and protected?', guidance: 'Check for loose fixings, exposed cable runs, insecure panels, or unprotected control boxes.', type: 'radio', options: ['Yes', 'No', 'Partial', 'N/A'], appliesToTypes: ['Borehole Equipping', 'School WASH', 'Other'] },
      { id: 'building_quality', label: 'Are walls, slab, roof, windows, and doors visually sound and aligned with drawings?', guidance: 'Check for cracks, poor fit, missing flashings, bulges, or obvious deviations from expected layout.', type: 'radio', options: ['Yes', 'No', 'Partial', 'N/A'], appliesToTypes: ['School WASH', 'Latrine/Sanitation', 'CFS', 'Classroom', 'Other'] }
    ]
  },
  {
    id: 'materials',
    title: 'Section E — Materials & Variations',
    items: [
      { id: 'samples_approved', label: 'Were material samples submitted or approved before use?', guidance: 'Flag cases where materials appear to have been used without approval.', type: 'radio', options: ['Yes', 'No', 'Unknown'] },
      { id: 'materials_stored', label: 'Are materials stored properly and protected from damage?', guidance: 'Check cement, steel, pipes, fittings, and timber for moisture, corrosion, or poor stacking.', type: 'radio', options: ['Yes', 'No', 'Partial'] },
      { id: 'materials_match', label: 'Do materials appear to match the specified type or BOQ intent?', guidance: 'Record any substitutions, quality concerns, or obvious mismatches.', type: 'radio', options: ['Yes', 'No', 'Partial'] },
      { id: 'variation_seen', label: 'Are there signs of variation not in the original scope?', guidance: 'Note any extra work, reduced work, or layout changes that may require approval.', type: 'radio', options: ['Yes', 'No'] }
    ]
  },
  {
    id: 'community',
    title: 'Section F — Community Engagement & Management',
    items: [
      { id: 'committee_exists', label: 'Is a water or facility management committee established?', guidance: 'Ask community representatives whether a committee exists and is active.', type: 'radio', options: ['Yes', 'No'] },
      { id: 'committee_stage', label: 'When was the committee formed?', guidance: 'Use this to understand whether community management was planned early enough.', type: 'radio', options: ['Pre-tender', 'Mid-construction', 'At handover', 'Not yet formed'] },
      { id: 'scope_disclosed', label: 'Was the project scope or BOQ disclosed to the community?', guidance: 'This helps the community hold the contractor accountable to the agreed output.', type: 'radio', options: ['Yes', 'No', 'Unknown'] },
      { id: 'sustainability_plan', label: 'Is there a sustainability plan for the facility after handover?', guidance: 'Check whether operation, maintenance, and management after completion are understood.', type: 'radio', options: ['Yes', 'No', 'Partial'] },
      { id: 'handover_entity', label: 'Expected handover or management entity', guidance: 'Record who is expected to manage the facility after handover.', type: 'text' }
    ]
  },
  {
    id: 'completion',
    title: 'Section H — Near Completion & DLP',
    items: [
      { id: 'snag_list', label: 'Has a snag list been prepared and shared with the contractor, and are items being closed out?', guidance: 'Use for projects near completion or already in defects liability.', type: 'radio', options: ['Yes', 'No', 'Partial'] },
      { id: 'dlp_defects', label: 'During DLP, have any defects or breakdowns been reported?', guidance: 'Ask the community or facility managers whether anything has failed since completion.', type: 'radio', options: ['Yes', 'No', 'N/A'] },
      { id: 'functional_in_use', label: 'Is the project functional and being used by the community?', guidance: 'A completed but unused or non-functional facility should be clearly flagged.', type: 'radio', options: ['Yes', 'No', 'Partial'] }
    ]
  },
  {
    id: 'payment',
    title: 'Section J — Payment Readiness Check',
    items: [
      { id: 'joint_inspection', label: 'Has a joint site inspection been conducted before this payment?', guidance: 'Check whether payment review is supported by a physical verification visit.', type: 'radio', options: ['Yes', 'No', 'N/A'] },
      { id: 'site_report_prepared', label: 'Has a site visit report been prepared for this payment milestone?', guidance: 'Payment certificates should be supported by site monitoring evidence.', type: 'radio', options: ['Yes', 'No', 'N/A'] },
      { id: 'payment_matches_work', label: 'Does the work certified appear to match what is physically verified on site?', guidance: 'Flag over-certification or any visible mismatch between site progress and claimed percentage.', type: 'radio', options: ['Yes', 'No', 'N/A'] }
    ]
  },
  {
    id: 'summary',
    title: 'Section K — Overall Summary & Rating',
    items: [
      { id: 'overall_rating', label: 'Overall site rating', guidance: 'Choose the overall assessment outcome for this visit.', type: 'radio', options: ['GREEN', 'AMBER', 'RED'] },
      { id: 'estimated_complete', label: 'Estimated % complete', guidance: 'Enter your estimate of physical completion.', type: 'text' },
      { id: 'expected_milestone', label: 'Expected milestone %', guidance: 'Enter the expected percentage for comparison if known.', type: 'text' },
      { id: 'positive_observations', label: 'Positive observations', guidance: 'List two or three things going well.', type: 'textarea' },
      { id: 'issues', label: 'Concerns / issues', guidance: 'List the main concerns or non-compliances observed.', type: 'textarea' },
      { id: 'recommended_actions', label: 'Recommended actions', guidance: 'Record the next actions, owner, or escalation needed.', type: 'textarea' },
      { id: 'urgent_ts_visit', label: 'Requires urgent WASH TS visit?', guidance: 'Use this if the site has a serious issue requiring fast technical follow-up.', type: 'radio', options: ['Yes', 'No'] },
      { id: 'additional_comments', label: 'Additional comments', guidance: 'Use for anything important not captured above.', type: 'textarea' }
    ]
  }
];
const WIZARD_SECTIONS = [
  {
    id: 'safety',
    title: 'Section B - Safety & Safeguarding',
    items: [
      { id: 'site_fenced', label: 'Is the site fenced or barricaded to prevent public access?', guidance: 'Look for barrier tape, temporary fencing, or signage marking the danger zone.', type: 'radio', options: ['Yes', 'No'], scoreMap: { Yes: 2, No: 0 } },
      { id: 'workers_ppe', label: 'Are all workers wearing PPE?', guidance: 'Check hard hats, reflective vests, safety boots, gloves, and any missing PPE on active workers.', type: 'radio', options: ['Yes', 'Partial', 'No'], scoreMap: { Yes: 2, Partial: 1, No: 0 } },
      { id: 'excavations_safe', label: 'Are open excavations, trenches, or casings covered or barricaded?', guidance: 'Unmarked open pits or boreholes near communities should be flagged immediately.', type: 'radio', options: ['Yes', 'No'], scoreMap: { Yes: 2, No: 0 } },
      { id: 'children_protected', label: 'Are children kept away from the active construction zone?', guidance: 'This is especially important near schools, child friendly spaces, or community compounds.', type: 'radio', options: ['Yes', 'No'], scoreMap: { Yes: 2, No: 0 }, criticalFail: ['No'] },
      { id: 'safeguarding_briefed', label: 'Have workers received safeguarding briefing or signed a safeguarding commitment?', guidance: 'Ask the supervisor whether the team has been briefed on child safeguarding and conduct rules.', type: 'radio', options: ['Yes', 'No'], scoreMap: { Yes: 2, No: 0 } },
      { id: 'worker_behaviour', label: 'Any observations of inappropriate worker behaviour toward community members or children?', guidance: 'Record any concerns, complaints, or observed behaviour needing escalation.', type: 'radio', options: ['No', 'Yes'], scoreMap: { No: 2, Yes: 0 }, criticalFail: ['Yes'] }
    ]
  },
  {
    id: 'contractor',
    title: 'Section C - Contractor & Personnel',
    items: [
      { id: 'supervisor_present', label: 'Is the named supervisor or foreman on site?', guidance: 'Record whether the person on site matches the expected site lead.', type: 'radio', options: ['Yes', 'No'], scoreMap: { Yes: 2, No: 0 } },
      { id: 'supervisor_name', label: 'Supervisor name on site', guidance: 'Enter the name of the supervisor or foreman present during the visit.', type: 'text' },
      { id: 'enough_workers', label: 'Are enough workers actively engaged on site?', guidance: 'If the site is idle on a working day, note whether staffing appears too low for the work stage.', type: 'radio', options: ['Yes', 'Partial', 'No'], scoreMap: { Yes: 2, Partial: 1, No: 0 } },
      { id: 'worker_count', label: 'Workers counted on site', guidance: 'Count visible workers, including casual labour.', type: 'text' },
      { id: 'mobilisation_window', label: 'Is the contractor mobilising within the required window?', guidance: 'Flag delayed mobilisation if work has not started in line with expectations.', type: 'radio', options: ['Yes', 'No', 'N/A'], scoreMap: { Yes: 2, No: 0, 'N/A': 0 } },
      { id: 'work_schedule', label: 'Has the contractor submitted a current work schedule or programme?', guidance: 'Check whether actual progress broadly matches the programme being followed.', type: 'radio', options: ['Yes', 'No'], scoreMap: { Yes: 2, No: 0 } },
      { id: 'behind_schedule', label: 'Has actual progress been flagged as behind schedule?', guidance: 'Note if issues have been escalated or if delays are becoming material.', type: 'radio', options: ['No', 'Yes'], scoreMap: { No: 2, Yes: 0 } }
    ]
  },
  {
    id: 'quality',
    title: 'Section D - Physical Progress & Visual Quality Checks',
    items: [
      { id: 'water_source_protected', label: 'Is the water source or borehole headworks protected and in good condition?', guidance: 'Check casing, cap, apron, drainage, and signs of contamination around the source.', type: 'radio', options: ['Yes', 'Partial', 'No'], scoreMap: { Yes: 2, Partial: 1, No: 0 }, appliesToTypes: ['Borehole Rehab', 'Borehole Equipping'] },
      { id: 'test_pumping_done', label: 'Has test pumping or functional testing been completed and documented where relevant?', guidance: 'Applies to boreholes, pumps, kiosks, and other water supply components.', type: 'radio', options: ['Yes', 'No', 'N/A'], scoreMap: { Yes: 2, No: 0, 'N/A': 0 }, appliesToTypes: ['Borehole Rehab', 'Borehole Equipping'] },
      { id: 'water_quality_done', label: 'Has water quality testing been conducted where relevant?', guidance: 'Confirm whether physical, chemical, and bacteriological tests are available for operational water sources.', type: 'radio', options: ['Yes', 'No', 'N/A'], scoreMap: { Yes: 2, No: 0, 'N/A': 0 }, appliesToTypes: ['Borehole Rehab', 'Borehole Equipping'] },
      { id: 'tank_pipework_sound', label: 'Are elevated tanks, tapstands, and pipework connected and visibly leak-free?', guidance: 'Look for loose joints, leaks, poor support, or missing fixtures.', type: 'radio', options: ['Yes', 'Partial', 'No', 'N/A'], scoreMap: { Yes: 2, Partial: 1, No: 0, 'N/A': 0 }, appliesToTypes: ['Borehole Equipping', 'School WASH', 'Latrine/Sanitation', 'CFS', 'Classroom', 'Other'] },
      { id: 'solar_sound', label: 'Are solar panels, frames, and electrical enclosures mounted securely and protected?', guidance: 'Check for loose fixings, exposed cable runs, insecure panels, or unprotected control boxes.', type: 'radio', options: ['Yes', 'Partial', 'No', 'N/A'], scoreMap: { Yes: 2, Partial: 1, No: 0, 'N/A': 0 }, appliesToTypes: ['Borehole Equipping', 'School WASH', 'Other'] },
      { id: 'building_quality', label: 'Are walls, slab, roof, windows, and doors visually sound and aligned with drawings?', guidance: 'Check for cracks, poor fit, missing flashings, bulges, or obvious deviations from expected layout.', type: 'radio', options: ['Yes', 'Partial', 'No', 'N/A'], scoreMap: { Yes: 2, Partial: 1, No: 0, 'N/A': 0 }, appliesToTypes: ['School WASH', 'Latrine/Sanitation', 'CFS', 'Classroom', 'Other'] }
    ]
  },
  {
    id: 'materials',
    title: 'Section E - Materials & Variations',
    items: [
      { id: 'samples_approved', label: 'Were material samples submitted or approved before use?', guidance: 'Flag cases where materials appear to have been used without approval.', type: 'radio', options: ['Yes', 'No', 'Unknown'], scoreMap: { Yes: 2, No: 0, Unknown: 1 } },
      { id: 'materials_stored', label: 'Are materials stored properly and protected from damage?', guidance: 'Check cement, steel, pipes, fittings, and timber for moisture, corrosion, or poor stacking.', type: 'radio', options: ['Yes', 'Partial', 'No'], scoreMap: { Yes: 2, Partial: 1, No: 0 } },
      { id: 'materials_match', label: 'Do materials appear to match the specified type or BOQ intent?', guidance: 'Record any substitutions, quality concerns, or obvious mismatches.', type: 'radio', options: ['Yes', 'Partial', 'No'], scoreMap: { Yes: 2, Partial: 1, No: 0 } },
      { id: 'variation_seen', label: 'Are there signs of variation not in the original scope?', guidance: 'Note any extra work, reduced work, or layout changes that may require approval.', type: 'radio', options: ['No', 'Yes'], scoreMap: { No: 2, Yes: 0 } }
    ]
  },
  {
    id: 'community',
    title: 'Section F - Community Engagement & Management',
    items: [
      { id: 'committee_exists', label: 'Is a water or facility management committee established?', guidance: 'Ask community representatives whether a committee exists and is active.', type: 'radio', options: ['Yes', 'No'], scoreMap: { Yes: 2, No: 0 } },
      { id: 'committee_stage', label: 'When was the committee formed?', guidance: 'Use this to understand whether community management was planned early enough.', type: 'radio', options: ['Pre-tender', 'Mid-construction', 'At handover', 'Not yet formed'], scoreMap: { 'Pre-tender': 2, 'Mid-construction': 1, 'At handover': 1, 'Not yet formed': 0 } },
      { id: 'scope_disclosed', label: 'Was the project scope or BOQ disclosed to the community?', guidance: 'This helps the community hold the contractor accountable to the agreed output.', type: 'radio', options: ['Yes', 'No', 'Unknown'], scoreMap: { Yes: 2, No: 0, Unknown: 1 } },
      { id: 'sustainability_plan', label: 'Is there a sustainability plan for the facility after handover?', guidance: 'Check whether operation, maintenance, and management after completion are understood.', type: 'radio', options: ['Yes', 'Partial', 'No'], scoreMap: { Yes: 2, Partial: 1, No: 0 } },
      { id: 'handover_entity', label: 'Expected handover or management entity', guidance: 'Record who is expected to manage the facility after handover.', type: 'text' }
    ]
  },
  {
    id: 'completion',
    title: 'Section H - Near Completion & DLP',
    showWhen: ({ stage, visitType }) => ['Near Completion', 'DLP / Retention Period'].includes(stage) || visitType === 'Final Inspection / DLP',
    items: [
      { id: 'snag_list', label: 'Has a snag list been prepared and shared with the contractor, and are items being closed out?', guidance: 'Use for projects near completion or already in defects liability.', type: 'radio', options: ['Yes', 'Partial', 'No'], scoreMap: { Yes: 2, Partial: 1, No: 0 } },
      { id: 'dlp_defects', label: 'During DLP, have any defects or breakdowns been reported?', guidance: 'Ask the community or facility managers whether anything has failed since completion.', type: 'radio', options: ['No', 'Yes', 'N/A'], scoreMap: { No: 2, Yes: 0, 'N/A': 0 } },
      { id: 'functional_in_use', label: 'Is the project functional and being used by the community?', guidance: 'A completed but unused or non-functional facility should be clearly flagged.', type: 'radio', options: ['Yes', 'Partial', 'No'], scoreMap: { Yes: 2, Partial: 1, No: 0 }, criticalFail: ['No'] }
    ]
  },
  {
    id: 'payment',
    title: 'Section J - Payment Readiness Check',
    showWhen: ({ visitType }) => ['Critical Milestone', 'Final Inspection / DLP'].includes(visitType),
    items: [
      { id: 'joint_inspection', label: 'Has a joint site inspection been conducted before this payment?', guidance: 'Check whether payment review is supported by a physical verification visit.', type: 'radio', options: ['Yes', 'No', 'N/A'], scoreMap: { Yes: 2, No: 0, 'N/A': 0 } },
      { id: 'site_report_prepared', label: 'Has a site visit report been prepared for this payment milestone?', guidance: 'Payment certificates should be supported by site monitoring evidence.', type: 'radio', options: ['Yes', 'No', 'N/A'], scoreMap: { Yes: 2, No: 0, 'N/A': 0 } },
      { id: 'payment_matches_work', label: 'Does the work certified appear to match what is physically verified on site?', guidance: 'Flag over-certification or any visible mismatch between site progress and claimed percentage.', type: 'radio', options: ['Yes', 'No', 'N/A'], scoreMap: { Yes: 2, No: 0, 'N/A': 0 }, criticalFail: ['No'] }
    ]
  },
  {
    id: 'summary',
    title: 'Section K - Summary & Actions',
    items: [
      { id: 'estimated_complete', label: 'Estimated % complete', guidance: 'Enter your estimate of physical completion.', type: 'text' },
      { id: 'expected_milestone', label: 'Expected milestone %', guidance: 'Enter the expected percentage for comparison if known.', type: 'text' },
      { id: 'positive_observations', label: 'Positive observations', guidance: 'List two or three things going well.', type: 'textarea' },
      { id: 'issues', label: 'Concerns / issues', guidance: 'List the main concerns or non-compliances observed.', type: 'textarea' },
      { id: 'recommended_actions', label: 'Recommended actions', guidance: 'Record the next actions, owner, or escalation needed.', type: 'textarea' },
      { id: 'additional_comments', label: 'Additional comments', guidance: 'Use for anything important not captured above.', type: 'textarea' }
    ]
  }
];
const QUESTIONNAIRE_SETUP_FIELDS = ['fa-visit-type', 'fa-construction-type', 'fa-project-stage'];

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  filteredSites = [...SITES];
  initMap();
  populateSiteSelectors();
  renderTable();
  renderAdminTable();
  renderAdminRegistryStats();
  renderAdminNotifications();
  renderRecentAssessments();
  renderQuestionnaire();
  updateAutofillSection();
  renderInvitedUsers();
  updateCurrentUserLabel();
  initAuthGate();
  updateLegend();

  // Keyboard shortcut for nav
  document.addEventListener('keydown', e => {
    if (e.altKey) {
      if (e.key === '1') showPage('map');
      if (e.key === '2') showPage('rank');
      if (e.key === '3') showPage('field');
      if (e.key === '4') showPage('admin');
      if (e.key === '5') showPage('users');
      if (e.key === '6') showPage('charts');
      if (e.key === '7') showPage('performance');
    }
  });
});

window.addEventListener('load', () => {
  if (map) {
    setTimeout(() => {
      map.invalidateSize();
      renderHeatCanvas();
    }, 150);
  } else {
    initMap();
  }
});

// ============================================================
// MAP
// ============================================================
function initMap() {
  if (map) {
    map.invalidateSize();
    renderHeatCanvas();
    hideMapStatus();
    return;
  }

  if (typeof L === 'undefined') {
    showMapStatus('Map library failed to load. Open the app with internet access or serve the files locally so Leaflet can load from its CDN.');
    return;
  }

  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  if (mapEl.clientWidth === 0 || mapEl.clientHeight === 0) {
    showMapStatus('Map container is not ready yet. Reload the page or switch back to the Map tab.');
    requestAnimationFrame(() => initMap());
    return;
  }

  hideMapStatus();
  map = L.map('map', {
    center: [-0.5, 37.5], zoom: 6,
    zoomControl: false,
    attributionControl: true
  });

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // OSM base layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap | RCMRD Hazard Atlas | KeNHA | KENGEN',
    maxZoom: 19
  }).addTo(map);

  // Kenya approximate boundary highlight
  const kenyaBoundsGeoJSON = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [KENYA_OUTLINE.map(([lat, lng]) => [lng, lat])]
    }
  };
  L.geoJSON(kenyaBoundsGeoJSON, {
    style: { color: '#3b82f6', weight: 1.1, fill: false, opacity: 0.45 }
  }).addTo(map);

  addHazardHeatmap();
  loadDynamicMapLayers();
  addSiteMarkers();
  updateMiniStats();

  map.on('moveend zoomend resize', () => {
    renderHeatCanvas();
  });

  setTimeout(renderHeatCanvas, 300);
}

// ---- HEATMAP CANVAS ----
function renderHeatCanvas() {
  if (!map) return;
  const canvas = document.getElementById('heat-canvas');
  const mapEl = document.getElementById('map');
  if (!canvas || !mapEl) return;
  const rect = mapEl.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const activeLayers = Object.keys(layerState).filter(key => layerState[key] && HAZARD_HEATPOINTS[key]);

  for (const key of activeLayers) {
    if (!layerState[key]) continue;
    renderRasterLayer(ctx, rect, key, activeLayers.length);
  }
}

function renderRasterLayer(ctx, rect, key, activeLayerCount) {
  const pts = HAZARD_HEATPOINTS[key];
  if (!pts?.length) return;

  const cellSize = getRasterCellSize();
  const alpha = activeLayerCount > 1 ? 0.52 : 0.78;
  const stroke = activeLayerCount > 1 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.18)';

  ctx.save();
  ctx.globalAlpha = alpha;

  for (let y = 0; y < rect.height; y += cellSize) {
    for (let x = 0; x < rect.width; x += cellSize) {
      const center = map.containerPointToLatLng([
        Math.min(rect.width - 1, x + cellSize / 2),
        Math.min(rect.height - 1, y + cellSize / 2)
      ]);

      if (!isPointInPolygon(center.lat, center.lng, KENYA_OUTLINE)) continue;

      const intensity = interpolateHazardValue(center.lat, center.lng, pts);
      if (intensity < 0.14) continue;

      ctx.fillStyle = sampleRasterColor(key, intensity);
      ctx.fillRect(x, y, cellSize, cellSize);

      if (activeLayerCount <= 2) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 0.6;
        ctx.strokeRect(x, y, cellSize, cellSize);
      }
    }
  }

  ctx.restore();
}

function interpolateHazardValue(lat, lng, points) {
  let total = 0;
  let weightSum = 0;

  points.forEach(([ptLat, ptLng, intensity]) => {
    const dLat = lat - ptLat;
    const dLng = lng - ptLng;
    const distSq = dLat * dLat + dLng * dLng;
    const weight = Math.exp(-distSq / 0.48);
    total += intensity * weight;
    weightSum += weight;
  });

  if (!weightSum) return 0;
  return Math.min(1, total / weightSum);
}

function sampleRasterColor(key, intensity) {
  const palette = HEATMAP_PALETTES[key] || HEATMAP_PALETTES.flood;
  const banded = quantize(intensity, 6);

  for (let i = 0; i < palette.length; i++) {
    if (banded <= palette[i][0]) return palette[i][1];
  }

  return palette[palette.length - 1][1];
}

function idwInterpolateSurfaceValue(point, stations, field) {
  let total = 0;
  let weightSum = 0;

  for (const station of stations) {
    const value = Number(station[field]);
    if (!Number.isFinite(value)) continue;

    const dLat = point.lat - station.lat;
    const dLng = (point.lng - station.lng) * Math.cos((point.lat * Math.PI) / 180);
    const distSq = dLat * dLat + dLng * dLng;

    if (distSq < 0.000001) return value;

    const gaussian = Math.exp(-distSq / 4.5);
    const weight = gaussian / Math.pow(distSq, 1.15);
    total += value * weight;
    weightSum += weight;
  }

  return weightSum ? total / weightSum : null;
}

function interpolateColorScale(value, min, max, colors) {
  if (!colors?.length) return [0, 0, 0];
  if (colors.length === 1) return hexToRgb(colors[0]);

  const pct = Math.max(0, Math.min(1, (value - min) / ((max - min) || 1)));
  const scaled = pct * (colors.length - 1);
  const lowerIndex = Math.floor(scaled);
  const upperIndex = Math.min(colors.length - 1, lowerIndex + 1);
  const t = scaled - lowerIndex;
  const lower = hexToRgb(colors[lowerIndex]);
  const upper = hexToRgb(colors[upperIndex]);

  return [
    Math.round(lower[0] + (upper[0] - lower[0]) * t),
    Math.round(lower[1] + (upper[1] - lower[1]) * t),
    Math.round(lower[2] + (upper[2] - lower[2]) * t)
  ];
}

function hexToRgb(hex) {
  const clean = String(hex || '').replace('#', '');
  const expanded = clean.length === 3
    ? clean.split('').map(char => char + char).join('')
    : clean;
  const value = Number.parseInt(expanded, 16);
  if (!Number.isFinite(value)) return [0, 0, 0];
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function traceRasterGeoJSONPath(ctx, geojson, bounds, width, height) {
  ctx.beginPath();
  if (!geojson) {
    traceRasterRingPath(ctx, KENYA_OUTLINE.map(([lat, lng]) => [lng, lat]), bounds, width, height);
    return;
  }

  const features = geojson?.type === 'FeatureCollection'
    ? geojson.features || []
    : geojson?.type === 'Feature'
      ? [geojson]
      : geojson
        ? [{ geometry: geojson }]
        : [];

  features.forEach(feature => traceRasterGeometryPath(ctx, feature.geometry, bounds, width, height));
}

function traceRasterGeometryPath(ctx, geometry, bounds, width, height) {
  if (!geometry) return;
  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach(ring => traceRasterRingPath(ctx, ring, bounds, width, height));
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach(polygon => {
      polygon.forEach(ring => traceRasterRingPath(ctx, ring, bounds, width, height));
    });
  }
}

function traceRasterRingPath(ctx, ring, bounds, width, height) {
  const west = bounds.getWest();
  const east = bounds.getEast();
  const south = bounds.getSouth();
  const north = bounds.getNorth();

  ring.forEach(([lng, lat], index) => {
    const x = ((lng - west) / ((east - west) || 1)) * width;
    const y = ((north - lat) / ((north - south) || 1)) * height;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

function getCachedSurfaceRaster(key, stations, meta) {
  const signature = buildSurfaceRasterSignature(key, stations, meta.field);
  if (surfaceRasterCache[key]?.signature === signature) {
    return surfaceRasterCache[key];
  }

  const raster = generateSurfaceRaster(key, stations, meta);
  surfaceRasterCache[key] = { ...raster, signature };
  return surfaceRasterCache[key];
}

function buildSurfaceRasterSignature(key, stations, field) {
  const rows = stations
    .map(row => `${row.name}:${row.lat.toFixed(4)},${row.lng.toFixed(4)},${Number(row[field]).toFixed(4)}`)
    .sort()
    .join('|');
  return `${key}:${field}:${rows}`;
}

function generateSurfaceRaster(key, stations, meta) {
  const bounds = getKenyaImageBounds();
  const { width, height } = getSurfaceRasterDimensions(bounds);
  const values = stations.map(row => Number(row[meta.field])).filter(Number.isFinite);
  const range = getRange(values);
  const raw = document.createElement('canvas');
  raw.width = width;
  raw.height = height;
  const rawCtx = raw.getContext('2d');
  if (!rawCtx) return null;

  const image = rawCtx.createImageData(width, height);
  const data = image.data;
  const west = bounds.getWest();
  const east = bounds.getEast();
  const south = bounds.getSouth();
  const north = bounds.getNorth();

  for (let y = 0; y < height; y++) {
    const lat = north - ((y + 0.5) / height) * (north - south);
    for (let x = 0; x < width; x++) {
      const lng = west + ((x + 0.5) / width) * (east - west);
      const value = idwInterpolateSurfaceValue({ lat, lng }, stations, meta.field);
      if (!Number.isFinite(value)) continue;

      const [r, g, b] = interpolateColorScale(value, range.min, range.max, meta.colors);
      const index = (y * width + x) * 4;
      data[index] = r;
      data[index + 1] = g;
      data[index + 2] = b;
      data[index + 3] = 255;
    }
  }

  rawCtx.putImageData(image, 0, 0);

  const clipped = document.createElement('canvas');
  clipped.width = width;
  clipped.height = height;
  const clippedCtx = clipped.getContext('2d');
  if (!clippedCtx) return null;

  clippedCtx.save();
  traceRasterGeoJSONPath(clippedCtx, admin0GeoJSON, bounds, width, height);
  clippedCtx.clip('evenodd');
  clippedCtx.imageSmoothingEnabled = true;
  clippedCtx.imageSmoothingQuality = 'high';
  clippedCtx.filter = 'blur(1.25px)';
  clippedCtx.drawImage(raw, 0, 0);
  clippedCtx.filter = 'none';
  clippedCtx.restore();

  featherRasterAlpha(clippedCtx, bounds, width, height);

  return {
    url: clipped.toDataURL('image/png'),
    bounds,
    opacity: Math.max(0.4, Math.min(0.6, meta.opacity || 0.5))
  };
}

function featherRasterAlpha(ctx, bounds, width, height) {
  if (!admin0GeoJSON) return;
  const mask = document.createElement('canvas');
  mask.width = width;
  mask.height = height;
  const maskCtx = mask.getContext('2d');
  if (!maskCtx) return;

  maskCtx.fillStyle = '#fff';
  traceRasterGeoJSONPath(maskCtx, admin0GeoJSON, bounds, width, height);
  maskCtx.fill('evenodd');
  maskCtx.filter = 'blur(3px)';
  maskCtx.globalCompositeOperation = 'source-in';
  maskCtx.drawImage(mask, 0, 0);
  maskCtx.filter = 'none';

  ctx.save();
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(mask, 0, 0);
  ctx.restore();
}

function getKenyaImageBounds() {
  const bounds = getGeoJSONBounds(admin0GeoJSON);
  if (bounds) return bounds;

  const lats = KENYA_OUTLINE.map(([lat]) => lat);
  const lngs = KENYA_OUTLINE.map(([, lng]) => lng);
  return L.latLngBounds(
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)]
  );
}

function getGeoJSONBounds(geojson) {
  const coords = [];
  collectGeoJSONCoordinates(geojson, coords);
  if (!coords.length) return null;

  const lats = coords.map(([, lat]) => lat);
  const lngs = coords.map(([lng]) => lng);
  return L.latLngBounds(
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)]
  );
}

function collectGeoJSONCoordinates(node, coords) {
  if (!node) return;
  if (node.type === 'FeatureCollection') {
    (node.features || []).forEach(feature => collectGeoJSONCoordinates(feature, coords));
  } else if (node.type === 'Feature') {
    collectGeoJSONCoordinates(node.geometry, coords);
  } else if (node.type === 'Polygon') {
    node.coordinates.flat(1).forEach(coord => coords.push(coord));
  } else if (node.type === 'MultiPolygon') {
    node.coordinates.flat(2).forEach(coord => coords.push(coord));
  }
}

function getSurfaceRasterDimensions(bounds) {
  const latSpan = Math.max(0.1, bounds.getNorth() - bounds.getSouth());
  const lngSpan = Math.max(0.1, bounds.getEast() - bounds.getWest());
  const aspect = Math.max(0.35, Math.min(2.5, lngSpan / latSpan));
  const maxSide = 1500;
  const minSide = 900;
  if (aspect >= 1) {
    return {
      width: maxSide,
      height: Math.max(minSide, Math.round(maxSide / aspect))
    };
  }
  return {
    width: Math.max(minSide, Math.round(maxSide * aspect)),
    height: maxSide
  };
}

function quantize(value, steps) {
  return Math.round(value * steps) / steps;
}

function getRasterCellSize() {
  const zoom = map?.getZoom?.() || 6;
  if (zoom >= 10) return 10;
  if (zoom >= 8) return 14;
  if (zoom >= 7) return 18;
  return 22;
}

function isPointInPolygon(lat, lng, polygon) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];
    const intersects = ((latI > lat) !== (latJ > lat))
      && (lng < ((lngJ - lngI) * (lat - latI)) / ((latJ - latI) || Number.EPSILON) + lngI);

    if (intersects) inside = !inside;
  }

  return inside;
}

function addHazardHeatmap() {
  renderHeatCanvas();
}

function toggleLayer(key, el) {
  layerState[key] = el.checked;
  renderHeatCanvas();
  updateDynamicLayers();
}

async function loadDynamicMapLayers() {
  if (dynamicLayersStarted || !map) return;
  dynamicLayersStarted = true;
  setLiveLayerStatus('Loading Kenya boundary layers and KMD forecasts...');

  try {
    console.info('Loading dynamic map JSON files:', 'data/ken_admin0.geojson', 'data/ken_admin1.geojson', 'data/ken_admin2.geojson', 'data/forecast_county_data.json');
    const [admin0, admin1, admin2, kmd] = await Promise.all([
      fetchJSON('data/ken_admin0.geojson'),
      fetchJSON('data/ken_admin1.geojson'),
      fetchJSON('data/ken_admin2.geojson'),
      fetchJSON('data/forecast_county_data.json')
    ]);
    admin0GeoJSON = admin0;
    admin1GeoJSON = admin1;
    admin2GeoJSON = admin2;
    allKmdPeriods = kmd?.periods || [];
    latestKmdPeriod = allKmdPeriods[allKmdPeriods.length - 1] || null;
    populateTimeFilters();
    checkKmdLookupCoverage();
    updateDynamicLayers();
    setLiveLayerStatus(buildLayerStatus());
  } catch (err) {
    console.error('KMD/admin layers failed to load:', err);
    setLiveLayerStatus('KMD boundary layers could not be loaded.');
  }

  loadMeteoGrid();
  loadElevationGrid();
  loadKenyaEarthquakes();
}

async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} returned ${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.error(`fetchJSON failed for ${url}:`, err);
    throw err;
  }
}

function updateDynamicLayers() {
  if (!map) return;
  updateKmdChoropleth('rainfall');
  updateKmdChoropleth('heat');
  removeLayer('soil');
  removeLayer('solar');
  updateSurfaceRasterOverlay('soil');
  updateSurfaceRasterOverlay('solar');
  updateElevationSamples();
  updateSubcountyLayer();
  updateWindLayer();
  updateEarthquakeLayer();
  updateSiteMarkerPopups();
  updateAutofillSection();
  updateLegend();
  renderHeatCanvas();
}

function updateSiteMarkerPopups() {
  if (!markersLayer || !markersLayer.length) return;
  markersLayer.forEach(({ site, marker }) => {
    marker.setPopupContent(buildPopupHTML(site));
  });
}

function updateLegend() {
  const panel = document.getElementById('dynamic-legend-panel');
  if (!panel) return;

  const activeKeys = Object.keys(layerState).filter(key => layerState[key]);

  if (activeKeys.length === 0) {
    panel.innerHTML = `
      <div class="mpanel-title">No Layers Active</div>
      <div style="font-size:11px;color:var(--muted);padding:10px 0;line-height:1.5">
        Toggle live layers in the panel above to view their data distributions.
      </div>
    `;
    return;
  }

  const htmls = [];

  // Show primary site risk legend
  htmls.push(`
    <div class="legend-section" style="margin-bottom:12px">
      <div class="mpanel-title" style="margin-top:0;margin-bottom:6px">Site Risk Scale</div>
      <div class="risk-legend">
        <span class="rlbl">Low</span>
        <div class="rseg" style="background:#22c55e"></div>
        <div class="rseg" style="background:#84cc16"></div>
        <div class="rseg" style="background:#eab308"></div>
        <div class="rseg" style="background:#f97316"></div>
        <div class="rseg" style="background:#ef4444"></div>
        <span class="rlbl">High</span>
      </div>
      <div style="margin-top:5px;font-size:10px;color:var(--muted);line-height:1.4">
        Green: LOW (<40) · Amber: MEDIUM (40-64) · Red: HIGH (>=65)
      </div>
    </div>
  `);

  activeKeys.forEach(key => {
    htmls.push(`<div class="legend-divider" style="margin:10px 0;border-top:1px solid var(--border)"></div>`);
    
    if (key === 'rainfall') {
      htmls.push(`
        <div class="legend-section">
          <div class="mpanel-title" style="margin-top:0;margin-bottom:6px;display:flex;align-items:center;gap:4px">
            <span style="color:#2563eb">🌊</span> KMD Rainfall
          </div>
          <div class="risk-legend">
            <span class="rlbl">Dry</span>
            <div class="rseg" style="background:#eff6ff"></div>
            <div class="rseg" style="background:#bfdbfe"></div>
            <div class="rseg" style="background:#60a5fa"></div>
            <div class="rseg" style="background:#2563eb"></div>
            <div class="rseg" style="background:#1e40af"></div>
            <div class="rseg" style="background:#0f172a"></div>
            <span class="rlbl">Wet</span>
          </div>
          <div style="margin-top:5px;font-size:10px;color:var(--muted);line-height:1.4">
            Rainfall forecast ranges in mm (from light blue to dark blue/black)
          </div>
        </div>
      `);
    } else if (key === 'heat') {
      htmls.push(`
        <div class="legend-section">
          <div class="mpanel-title" style="margin-top:0;margin-bottom:6px;display:flex;align-items:center;gap:4px">
            <span style="color:#dc2626">🔥</span> KMD Max Temperature
          </div>
          <div class="risk-legend">
            <span class="rlbl">Cool</span>
            <div class="rseg" style="background:#fff7ed"></div>
            <div class="rseg" style="background:#fed7aa"></div>
            <div class="rseg" style="background:#fb923c"></div>
            <div class="rseg" style="background:#ef4444"></div>
            <div class="rseg" style="background:#b91c1c"></div>
            <div class="rseg" style="background:#7f1d1d"></div>
            <span class="rlbl">Hot</span>
          </div>
          <div style="margin-top:5px;font-size:10px;color:var(--muted);line-height:1.4">
            Temperature range in °C (from peach to dark red)
          </div>
        </div>
      `);
    } else if (key === 'wind') {
      htmls.push(`
        <div class="legend-section">
          <div class="mpanel-title" style="margin-top:0;margin-bottom:6px;display:flex;align-items:center;gap:4px">
            <span style="color:#0891b2">💨</span> Wind Speed
          </div>
          <div class="risk-legend">
            <span class="rlbl">Calm</span>
            <div class="rseg" style="background:#67e8f9"></div>
            <div class="rseg" style="background:#06b6d4"></div>
            <div class="rseg" style="background:#0891b2"></div>
            <div class="rseg" style="background:#0e7490"></div>
            <span class="rlbl">Gale</span>
          </div>
          <div style="margin-top:5px;font-size:10px;color:var(--muted);line-height:1.4">
            Light (<12 km/h) · Moderate (12-24) · Strong (25-39) · High (>=40)
          </div>
        </div>
      `);
    } else if (key === 'soil') {
      htmls.push(`
        <div class="legend-section">
          <div class="mpanel-title" style="margin-top:0;margin-bottom:6px;display:flex;align-items:center;gap:4px">
            <span style="color:#16a34a">🌱</span> Soil Saturation
          </div>
          <div class="risk-legend">
            <span class="rlbl">Dry</span>
            <div class="rseg" style="background:#ca8a04"></div>
            <div class="rseg" style="background:#84cc16"></div>
            <div class="rseg" style="background:#16a34a"></div>
            <div class="rseg" style="background:#166534"></div>
            <span class="rlbl">Wet</span>
          </div>
          <div style="margin-top:5px;font-size:10px;color:var(--muted);line-height:1.4">
            Sandy/Dry (<12%) · Moist (12-23%) · Saturated (24-35%) · Flooded (>=36%)
          </div>
        </div>
      `);
    } else if (key === 'solar') {
      htmls.push(`
        <div class="legend-section">
          <div class="mpanel-title" style="margin-top:0;margin-bottom:6px;display:flex;align-items:center;gap:4px">
            <span style="color:#d97706">☀️</span> Solar Radiation
          </div>
          <div class="risk-legend">
            <span class="rlbl">Low</span>
            <div class="rseg" style="background:#fde68a"></div>
            <div class="rseg" style="background:#facc15"></div>
            <div class="rseg" style="background:#f59e0b"></div>
            <div class="rseg" style="background:#b45309"></div>
            <span class="rlbl">High</span>
          </div>
          <div style="margin-top:5px;font-size:10px;color:var(--muted);line-height:1.4">
            Overcast (<300 W/m2) · Moderate (300-599) · High (600-849) · Extreme (>=850)
          </div>
        </div>
      `);
    } else if (key === 'elevation') {
      htmls.push(`
        <div class="legend-section">
          <div class="mpanel-title" style="margin-top:0;margin-bottom:6px;display:flex;align-items:center;gap:4px">
            <span style="color:#8b5a2b">⛰️</span> Elevation
          </div>
          <div class="risk-legend">
            <span class="rlbl">Coast</span>
            <div class="rseg" style="background:#ecfccb"></div>
            <div class="rseg" style="background:#a3e635"></div>
            <div class="rseg" style="background:#65a30d"></div>
            <div class="rseg" style="background:#a16207"></div>
            <div class="rseg" style="background:#78716c"></div>
            <div class="rseg" style="background:#f8fafc"></div>
            <span class="rlbl">High</span>
          </div>
          <div style="margin-top:5px;font-size:10px;color:var(--muted);line-height:1.4">
            Elevation above sea level in meters (green plains to grey/white highlands)
          </div>
        </div>
      `);
    } else if (key === 'liveEarthquake') {
      htmls.push(`
        <div class="legend-section">
          <div class="mpanel-title" style="margin-top:0;margin-bottom:6px;display:flex;align-items:center;gap:4px">
            <span style="color:#7c3aed">⚡</span> Live Earthquakes
          </div>
          <div style="display:flex;gap:8px;align-items:center;margin:8px 0;justify-content:center">
            <span class="quake-marker" style="transform:scale(0.8);position:static;display:inline-block">M1+</span>
            <span class="quake-marker" style="transform:scale(1.1);position:static;display:inline-block">M3+</span>
            <span class="quake-marker" style="transform:scale(1.4);position:static;display:inline-block">M5+</span>
          </div>
          <div style="font-size:10px;color:var(--muted);line-height:1.4">
            USGS live earthquake magnitude markers (size scales with magnitude)
          </div>
        </div>
      `);
    } else if (key === 'subcounty') {
      htmls.push(`
        <div class="legend-section">
          <div class="mpanel-title" style="margin-top:0;margin-bottom:6px;display:flex;align-items:center;gap:4px">
            🗺️ Subcounty Borders
          </div>
          <div style="font-size:10px;color:var(--muted);line-height:1.4">
            Administrative Level 2 boundaries shown as grey outline overlay.
          </div>
        </div>
      `);
    }
  });

  panel.innerHTML = htmls.join('');
  normalizeLegendPanel(panel);
}

function normalizeLegendPanel(panel) {
  panel.querySelectorAll('.legend-section').forEach(section => {
    const text = section.textContent || '';
    const desc = section.lastElementChild;
    if (!desc) return;

    if (text.includes('Site Risk Scale')) {
      desc.textContent = 'Green: LOW (<40). Amber: MEDIUM (40-64). Red: HIGH (>=65).';
    } else if (text.includes('KMD Max Temperature')) {
      desc.textContent = 'County choropleth of maximum temperature in C.';
    } else if (text.includes('Wind Speed')) {
      desc.textContent = 'Directional arrows at Open-Meteo sample stations. Arrow size and color scale with speed.';
    } else if (text.includes('Soil Saturation')) {
      desc.textContent = 'IDW interpolated Open-Meteo surface clipped to Kenya. Falls back to station points if too sparse.';
    } else if (text.includes('Solar Radiation')) {
      desc.textContent = 'IDW interpolated Open-Meteo surface clipped to Kenya with reduced opacity for stacking.';
    } else if (text.includes('Elevation')) {
      desc.textContent = 'Sampled elevation points only; no DEM or hillshade source is bundled in this demo.';
    } else if (text.includes('Live Earthquakes')) {
      desc.textContent = 'USGS circles scale by magnitude and shift from yellow to red by depth.';
      section.querySelectorAll('.quake-marker').forEach((marker, index) => {
        const styles = [
          ['#facc15', '#a16207'],
          ['#fb923c', '#c2410c'],
          ['#dc2626', '#991b1b']
        ];
        marker.style.background = styles[index]?.[0] || '#facc15';
        marker.style.borderColor = styles[index]?.[1] || '#a16207';
      });
    }
  });
}

function updateKmdChoropleth(key) {
  if (!admin1GeoJSON || !latestKmdPeriod) return;
  removeLayer(key);
  if (!layerState[key]) return;

  const meta = KMD_LAYER_META[key];
  const values = Object.values(latestKmdPeriod.counties || {})
    .map(row => Number(row?.[meta.field]))
    .filter(Number.isFinite);
  const range = getRange(values);

  dynamicLayers[key] = L.geoJSON(admin1GeoJSON, {
    pane: 'overlayPane',
    style: feature => {
      const row = getKmdCountyRow(feature);
      const value = Number(row?.[meta.field]);
      return {
        color: 'rgba(15,23,42,.38)',
        weight: 0.6,
        fill: true,
        fillColor: Number.isFinite(value) ? colorFromScale(value, range.min, range.max, meta.colors) : '#e5e7eb',
        fillOpacity: Number.isFinite(value) ? 0.62 : 0.12
      };
    },
    onEachFeature: (feature, layer) => {
      const row = getKmdCountyRow(feature);
      const name = feature.properties?.adm1_name || 'County';
      const value = Number(row?.[meta.field]);
      const rain = formatMetric(row?.rain, 'mm');
      const tmin = formatMetric(row?.tmin, 'C');
      const tmax = formatMetric(row?.tmax, 'C');
      layer.bindPopup(`
        <div class="popup-name">${name}</div>
        <div class="popup-meta"><span>${formatKmdPeriod(latestKmdPeriod)}</span></div>
        <div class="popup-risks">
          <div class="popup-risk-item"><span style="color:#2563eb">Rainfall: ${rain}</span></div>
          <div class="popup-risk-item"><span style="color:#dc2626">Tmin/Tmax: ${tmin} / ${tmax}</span></div>
          <div class="popup-risk-item"><span>${meta.label}: ${Number.isFinite(value) ? formatMetric(value, meta.unit) : 'No data'}</span></div>
        </div>
      `, { maxWidth: 280, className: 'kchm-popup' });
    }
  }).addTo(map);
}

function updateSurfaceRasterOverlay(key) {
  removeLayer(key);
  if (!layerState[key] || !meteoGridData?.length) return;
  const meta = SURFACE_LAYER_META[key];
  const stations = meteoGridData.filter(row => Number.isFinite(Number(row[meta.field])));

  if (stations.length < 3) {
    dynamicLayers[key] = L.layerGroup(buildStationMarkers(meteoGridData, meta, key)).addTo(map);
    return;
  }

  const raster = getCachedSurfaceRaster(key, stations, meta);
  if (!raster) return;

  dynamicLayers[key] = L.imageOverlay(raster.url, raster.bounds, {
    opacity: raster.opacity,
    interactive: false,
    className: `surface-raster surface-raster-${key}`
  }).addTo(map);
}

function updateSubcountyLayer() {
  removeLayer('subcounty');
  if (!layerState.subcounty || !admin2GeoJSON) return;

  dynamicLayers.subcounty = L.geoJSON(admin2GeoJSON, {
    style: {
      color: '#475569',
      weight: 0.45,
      fill: false,
      opacity: 0.45
    },
    onEachFeature: (feature, layer) => {
      const p = feature.properties || {};
      layer.bindTooltip(`${p.adm2_name || 'Subcounty'}, ${p.adm1_name || 'Kenya'}`, { sticky: true });
    }
  }).addTo(map);
}

async function loadMeteoGrid() {
  try {
    setLiveLayerStatus(`${buildLayerStatus()} Loading Open-Meteo live layers...`);
    const latitudes = LIVE_STATIONS.map(p => p.lat.toFixed(3)).join(',');
    const longitudes = LIVE_STATIONS.map(p => p.lng.toFixed(3)).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitudes}&longitude=${longitudes}&current=wind_speed_10m,wind_direction_10m&hourly=soil_moisture_0_to_1cm,shortwave_radiation,wind_speed_10m,wind_direction_10m&wind_speed_unit=kmh&timezone=Africa%2FNairobi&forecast_days=1`;
    const payload = await fetchJSON(url);
    const rows = Array.isArray(payload) ? payload : [payload];
    meteoGridData = rows.map((row, index) => normalizeMeteoRow(row, LIVE_STATIONS[index])).filter(Boolean);
    surfaceRasterCache = {};
    updateDynamicLayers();
    setLiveLayerStatus(buildLayerStatus());
  } catch (err) {
    console.warn('Open-Meteo layer failed', err);
    setLiveLayerStatus(`${buildLayerStatus()} Open-Meteo live layers unavailable.`);
  }
}

async function loadElevationGrid() {
  try {
    const latitudes = LIVE_STATIONS.map(p => p.lat.toFixed(3)).join(',');
    const longitudes = LIVE_STATIONS.map(p => p.lng.toFixed(3)).join(',');
    const payload = await fetchJSON(`https://api.open-meteo.com/v1/elevation?latitude=${latitudes}&longitude=${longitudes}`);
    elevationData = LIVE_STATIONS.map((station, index) => ({
      ...station,
      elevation: Number(payload.elevation?.[index])
    })).filter(row => Number.isFinite(row.elevation));
    updateDynamicLayers();
    setLiveLayerStatus(buildLayerStatus());
  } catch (err) {
    console.warn('Elevation layer failed', err);
    setLiveLayerStatus(`${buildLayerStatus()} Elevation layer unavailable.`);
  }
}

function normalizeMeteoRow(row, station) {
  if (!row || !station || !isPointInPolygon(station.lat, station.lng, KENYA_OUTLINE)) return null;
  const current = row.current || {};
  const hourly = row.hourly || {};
  const idx = nearestHourlyIndex(hourly.time);
  return {
    ...station,
    windSpeed: firstFinite(current.wind_speed_10m, hourly.wind_speed_10m?.[idx]),
    windDirection: firstFinite(current.wind_direction_10m, hourly.wind_direction_10m?.[idx]),
    soil: firstFinite(hourly.soil_moisture_0_to_1cm?.[idx]),
    solar: firstFinite(current.shortwave_radiation, hourly.shortwave_radiation?.[idx])
  };
}

function nearestHourlyIndex(times) {
  if (!Array.isArray(times) || !times.length) return 0;
  const now = Date.now();
  let best = 0;
  let bestDelta = Infinity;
  times.forEach((time, index) => {
    const delta = Math.abs(new Date(time).getTime() - now);
    if (delta < bestDelta) {
      best = index;
      bestDelta = delta;
    }
  });
  return best;
}

function updateWindLayer() {
  removeLayer('wind');
  if (!layerState.wind || !meteoGridData?.length) return;

  dynamicLayers.wind = L.layerGroup(meteoGridData.map(row => {
    const speed = Number(row.windSpeed) || 0;
    const direction = Number(row.windDirection) || 0;
    const scale = Math.max(0.75, Math.min(1.8, 0.75 + speed / 38));
    const icon = L.divIcon({
      className: '',
      html: `<div class="wind-arrow" style="transform:rotate(${direction}deg) scale(${scale});color:${windColor(speed)}"></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
    return L.marker([row.lat, row.lng], { icon }).bindPopup(`
      <div class="popup-name">${row.name} wind</div>
      <div class="popup-risks">
        <div class="popup-risk-item"><span style="color:${windColor(speed)}">Speed: ${formatMetric(speed, 'km/h')}</span></div>
        <div class="popup-risk-item"><span>Direction: ${Math.round(direction)} degrees</span></div>
      </div>
    `, { maxWidth: 240, className: 'kchm-popup' });
  })).addTo(map);
}

function updateElevationSamples() {
  removeLayer('elevation');
  if (!layerState.elevation || !elevationData?.length) return;
  dynamicLayers.elevation = L.layerGroup(buildStationMarkers(elevationData, SURFACE_LAYER_META.elevation, 'elevation')).addTo(map);
}

function buildStationMarkers(rows, meta, key) {
  const values = rows.map(row => Number(row[meta.field])).filter(Number.isFinite);
  const range = getRange(values);

  return rows.map(row => {
    const value = Number(row[meta.field]);
    if (!Number.isFinite(value)) return null;
    const color = colorFromScale(value, range.min, range.max, meta.colors);
    const label = key === 'soil' ? Math.round(value * 100) : Math.round(value);
    const icon = L.divIcon({
      className: '',
      html: `<div class="meteo-dot meteo-dot-${key}" style="background:${color}">${label}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    return L.marker([row.lat, row.lng], { icon }).bindPopup(`
      <div class="popup-name">${row.name} ${meta.label.toLowerCase()}</div>
      <div class="popup-risks">
        <div class="popup-risk-item"><span style="color:${color}">${meta.format ? meta.format(value) : formatMetric(value, meta.unit)}</span></div>
        <div class="popup-risk-item"><span style="color:var(--muted)">${key === 'elevation' ? 'Sampled point; no DEM/hillshade source loaded' : 'Station sample fallback'}</span></div>
      </div>
    `, { maxWidth: 240, className: 'kchm-popup' });
  }).filter(Boolean);
}

async function loadKenyaEarthquakes() {
  try {
    const lookback = Number(document.getElementById('quake-lookback-select')?.value) || 365;
    const minMag = Number(document.getElementById('quake-minmag-select')?.value) || 1;
    const url = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime='
      + recentDateISO(lookback)
      + `&minlatitude=-5&maxlatitude=5&minlongitude=33&maxlongitude=42.5&minmagnitude=${encodeURIComponent(minMag)}`;
    const payload = await fetchJSON(url);
    earthquakeData = (payload.features || []).filter(feature => {
      const [lng, lat] = feature.geometry?.coordinates || [];
      return Number.isFinite(lat) && Number.isFinite(lng)
        && lat >= -5 && lat <= 5 && lng >= 33 && lng <= 42.5;
    });
    updateDynamicLayers();
    setLiveLayerStatus(buildLayerStatus());
  } catch (err) {
    console.warn('Earthquake layer failed', err);
    setLiveLayerStatus(`${buildLayerStatus()} USGS earthquake feed unavailable.`);
  }
}

function updateEarthquakeLayer() {
  removeLayer('liveEarthquake');
  if (!layerState.liveEarthquake || !earthquakeData) return;

  dynamicLayers.liveEarthquake = L.layerGroup(earthquakeData.map(feature => {
    const [lng, lat, depthKm] = feature.geometry.coordinates;
    const mag = Number(feature.properties?.mag) || 0;
    const depth = Number(depthKm);
    const color = depthColor(depth);
    const icon = L.divIcon({
      className: '',
      html: `<div class="quake-marker" style="background:${color.fill};border-color:${color.stroke};transform:scale(${Math.max(0.75, Math.min(1.7, 0.65 + mag / 4))})">${mag.toFixed(1)}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
    return L.marker([lat, lng], { icon }).bindPopup(`
      <div class="popup-name">Recent earthquake</div>
      <div class="popup-meta"><span>${feature.properties?.place || 'Kenya region'}</span></div>
      <div class="popup-risks">
        <div class="popup-risk-item"><span style="color:#7c3aed">Magnitude: ${mag.toFixed(1)}</span></div>
        <div class="popup-risk-item"><span style="color:${color.stroke}">Depth: ${Number.isFinite(depth) ? formatMetric(depth, 'km') : 'No data'}</span></div>
        <div class="popup-risk-item"><span>${new Date(feature.properties?.time || Date.now()).toLocaleString()}</span></div>
      </div>
    `, { maxWidth: 260, className: 'kchm-popup' });
  })).addTo(map);
}

function removeLayer(key) {
  if (dynamicLayers[key] && map) {
    map.removeLayer(dynamicLayers[key]);
    dynamicLayers[key] = null;
  }
}

function getKmdCountyRow(feature) {
  const pcode = feature.properties?.adm1_pcode || '';
  const idNumber = Number(pcode.replace(/^KE/, ''));
  const id = Number.isFinite(idNumber) ? String(idNumber) : null;
  return id ? latestKmdPeriod?.counties?.[id] || null : null;
}

function checkKmdLookupCoverage() {
  if (!admin1GeoJSON || !latestKmdPeriod) return;

  const missing = [];
  const countyIds = new Set(Object.keys(latestKmdPeriod.counties || {}));

  admin1GeoJSON.features.forEach(feature => {
    const pcode = feature.properties?.adm1_pcode || '';
    const id = String(Number(pcode.replace('KE', '')));
    if (!pcode || Number.isNaN(Number(id)) || !countyIds.has(id)) {
      missing.push({
        name: feature.properties?.adm1_name || 'Unknown',
        pcode,
        id
      });
    }
  });

  if (missing.length) {
    console.warn(`KMD lookup coverage: ${missing.length}/${admin1GeoJSON.features.length} admin1 features have no matching KMD county row.`, missing.slice(0, 10));
  } else {
    console.info('KMD lookup coverage: all admin1 features match forecast county IDs.');
  }
}

function populateTimeFilters() {
  const select = document.getElementById('kmd-period-select');
  if (!select || !allKmdPeriods.length) return;

  select.innerHTML = allKmdPeriods.map((period, index) => {
    const selected = period === latestKmdPeriod ? ' selected' : '';
    return `<option value="${index}"${selected}>${formatKmdPeriod(period)}</option>`;
  }).join('');
}

function handleTimeFilterChange() {
  const kmdIndex = Number(document.getElementById('kmd-period-select')?.value);
  if (Number.isInteger(kmdIndex) && allKmdPeriods[kmdIndex]) {
    latestKmdPeriod = allKmdPeriods[kmdIndex];
  }
  earthquakeData = null;
  updateDynamicLayers();
  loadKenyaEarthquakes();
  setLiveLayerStatus(buildLayerStatus());
}

function getFeatureCenter(feature) {
  const p = feature.properties || {};
  if (Number.isFinite(Number(p.center_lat)) && Number.isFinite(Number(p.center_lon))) {
    return { lat: Number(p.center_lat), lng: Number(p.center_lon) };
  }
  const bounds = L.geoJSON(feature).getBounds();
  const center = bounds.getCenter();
  return { lat: center.lat, lng: center.lng };
}

function interpolateStationMetric(point, stations, field) {
  if (!point || !stations?.length) return null;
  let total = 0;
  let weightSum = 0;

  stations.forEach(station => {
    const value = Number(station[field]);
    if (!Number.isFinite(value)) return;
    const dLat = point.lat - station.lat;
    const dLng = point.lng - station.lng;
    const distSq = (dLat * dLat) + (dLng * dLng);
    const weight = 1 / Math.max(distSq, 0.08);
    total += value * weight;
    weightSum += weight;
  });

  return weightSum ? total / weightSum : null;
}

function getRange(values) {
  if (!values.length) return { min: 0, max: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? { min, max: min + 1 } : { min, max };
}

function colorFromScale(value, min, max, colors) {
  const pct = Math.max(0, Math.min(1, (value - min) / ((max - min) || 1)));
  const index = Math.min(colors.length - 1, Math.floor(pct * colors.length));
  return colors[index];
}

function firstFinite(...values) {
  return values.find(value => Number.isFinite(Number(value)));
}

function windColor(speed) {
  if (speed >= 40) return '#0e7490';
  if (speed >= 25) return '#0891b2';
  if (speed >= 12) return '#06b6d4';
  return '#67e8f9';
}

function depthColor(depthKm) {
  const depth = Number(depthKm);
  if (!Number.isFinite(depth)) return { fill: '#a78bfa', stroke: '#6d28d9' };
  if (depth >= 100) return { fill: '#7f1d1d', stroke: '#450a0a' };
  if (depth >= 70) return { fill: '#dc2626', stroke: '#991b1b' };
  if (depth >= 30) return { fill: '#fb923c', stroke: '#c2410c' };
  return { fill: '#facc15', stroke: '#a16207' };
}

function soilColor(value) {
  if (value >= 0.36) return '#166534';
  if (value >= 0.24) return '#16a34a';
  if (value >= 0.12) return '#84cc16';
  return '#ca8a04';
}

function solarColor(value) {
  if (value >= 850) return '#b45309';
  if (value >= 600) return '#f59e0b';
  if (value >= 300) return '#facc15';
  return '#fde68a';
}

function formatMetric(value, unit) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 'No data';
  const digits = Math.abs(num) < 10 ? 1 : 0;
  return `${num.toFixed(digits)} ${unit}`;
}

function formatKmdPeriod(period) {
  if (!period?.start || !period?.end) return 'Latest KMD period';
  const startLabel = formatKmdMonth(period.start);
  const endLabel = formatKmdMonth(period.end);
  return startLabel === endLabel ? startLabel : `${startLabel} to ${endLabel}`;
}

function formatKmdMonth(value) {
  const text = String(value || '');
  const year = Number(text.slice(0, 4));
  const month = Number(text.slice(4, 6));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return text || 'Unknown month';
  }
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

function recentDateISO(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

function buildLayerStatus() {
  const kmd = latestKmdPeriod ? `KMD ${formatKmdPeriod(latestKmdPeriod)}` : 'KMD not loaded';
  const meteo = meteoGridData ? `Open-Meteo ${meteoGridData.length} stations` : 'Open-Meteo loading';
  const elevation = elevationData ? `Elevation ${elevationData.length} samples` : 'Elevation loading';
  const lookback = Number(document.getElementById('quake-lookback-select')?.value) || 365;
  const minMag = Number(document.getElementById('quake-minmag-select')?.value) || 1;
  const quakes = earthquakeData ? `USGS ${earthquakeData.length} Kenya/regional quakes in ${lookback} days at M${minMag}+` : 'USGS loading';
  return `${kmd}. ${meteo}. ${elevation}. ${quakes}.`;
}

function setLiveLayerStatus(text) {
  const el = document.getElementById('live-layer-status');
  if (el) el.textContent = text;
}

function getSiteLiveContext(site) {
  const countyFeature = admin1GeoJSON?.features?.find(feature =>
    String(feature.properties?.adm1_name || '').toLowerCase() === String(site.county || '').toLowerCase()
  );
  const kmd = countyFeature ? getKmdCountyRow(countyFeature) : null;
  const nearestWeather = nearestStation(site, meteoGridData);
  const elevation = interpolateStationMetric(site, elevationData, 'elevation');
  const solar = interpolateStationMetric(site, meteoGridData, 'solar');

  return [
    { label: 'KMD rainfall', value: formatMetric(kmd?.rain, 'mm'), color: '#2563eb' },
    { label: 'KMD max heat', value: formatMetric(kmd?.tmax, 'C'), color: '#dc2626' },
    { label: 'Wind', value: nearestWeather ? `${formatMetric(nearestWeather.windSpeed, 'km/h')} from ${Math.round(nearestWeather.windDirection || 0)} deg` : 'No data', color: '#0891b2' },
    { label: 'Soil saturation', value: nearestWeather?.soil != null ? formatMetric(nearestWeather.soil * 100, '%') : 'No data', color: '#16a34a' },
    { label: 'Solar radiation', value: formatMetric(solar, 'W/m2'), color: '#d97706' },
    { label: 'Elevation', value: formatMetric(elevation, 'm'), color: '#8b5a2b' }
  ];
}

function nearestStation(point, stations) {
  if (!point || !stations?.length) return null;
  return stations.reduce((best, station) => {
    const dist = Math.hypot(point.lat - station.lat, point.lng - station.lng);
    return !best || dist < best.dist ? { ...station, dist } : best;
  }, null);
}

function generateSiteBrief(siteId) {
  const site = SITES.find(item => item.id === siteId);
  if (!site) return;

  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    showToast("PDF generator library is still loading or unavailable.");
    legacyAlertReport(site);
    return;
  }

  const doc = new jsPDF();
  const context = getSiteLiveContext(site);

  // PDF Layout & Header
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("KENYA CONSTRUCTION HAZARD MAP", 15, 20);

  doc.setFontSize(13);
  doc.setTextColor(37, 99, 235); // blue-600
  doc.text("ENGINEERING SITE BRIEF & SURVEY REPORT", 15, 28);

  // Decorative blue header bar
  doc.setFillColor(37, 99, 235);
  doc.rect(15, 32, 180, 2, "F");

  let y = 42;
  const addField = (label, value) => {
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text(label + ":", 15, y);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(String(value), 55, y);
    y += 7;
  };

  addField("Site Name", site.name);
  addField("County / Location", site.county);
  addField("Project Type", site.type);
  addField("Project Status", site.status);
  addField("Site Coordinates", `${site.lat.toFixed(4)}°N, ${site.lng.toFixed(4)}°E`);
  addField("Contract Value", site.budget || "KES 0.0M");
  addField("Contractor", site.contractor || "TBD");
  addField("Assessor Name", site.assessor || "Pending first site visit");
  addField("Last Assessment", site.lastAssessment || "No survey on record");

  // Environmental context box
  y += 5;
  doc.setFillColor(248, 250, 252); // slate-50 background
  doc.rect(15, y, 180, 52, "F");
  doc.setDrawColor(226, 232, 240); // slate-200 border
  doc.rect(15, y, 180, 52, "D");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("LIVE ENVIRONMENTAL RISK VALUES", 20, y + 8);

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  let cellY = y + 16;
  context.forEach((item, index) => {
    const colX = index % 2 === 0 ? 20 : 105;
    doc.setFont("Helvetica", "bold");
    doc.text(item.label + ":", colX, cellY);
    doc.setFont("Helvetica", "normal");
    doc.text(item.value, colX + 35, cellY);
    if (index % 2 === 1) cellY += 8;
  });

  y += 62;

  // Guidance Section
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("FIELD ENGINEERING SAFETY GUIDANCE", 15, y);
  y += 6;

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);

  const guidance = [
    "- Drainage & Saturation: Confirm drainage, access, and material storage against the selected rainfall and heat period.",
    "- Wind Load: Review wind exposure before lifting, roofing, solar panel works, or temporary structures.",
    "- Soils & Excavation: Use soil saturation and elevation context to decide whether excavation, compaction, or dewatering controls are needed.",
    "- Seismic Compliance: Check recent seismic context for structural activities, masonry, and temporary works near Rift Valley counties."
  ];

  guidance.forEach(line => {
    const splitLine = doc.splitTextToSize(line, 180);
    doc.text(splitLine, 15, y);
    y += splitLine.length * 5.5;
  });

  // Observations Section
  y += 4;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("SITE SURVEY OBSERVATIONS", 15, y);
  y += 6;

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  const obsText = doc.splitTextToSize(site.field || site.desc || "No site description or field observations recorded.", 180);
  doc.text(obsText, 15, y);
  y += obsText.length * 5.5;

  // Sign-off section
  y += 8;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("REPORT SIGN-OFF & FIELD VALIDATION", 15, y);
  y += 8;

  doc.setLineWidth(0.3);
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.line(15, y + 10, 85, y + 10);
  doc.line(110, y + 10, 180, y + 10);

  doc.setFontSize(8.5);
  doc.setFont("Helvetica", "normal");
  doc.text("Lead Monitoring Officer Signature", 15, y + 15);
  doc.text("Project Contractor Representative Signature", 110, y + 15);

  // PDF Page Footer
  doc.setLineWidth(0.5);
  doc.setDrawColor(226, 232, 240);
  doc.line(15, 280, 195, 280);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Report generated on ${new Date().toLocaleString()} · Kenya Construction Hazard Map (KCHM v2.0)`, 15, 285);

  doc.save(`kchm_engineer_brief_${site.id}.pdf`);
  showToast("✓ PDF Report downloaded successfully");
}

function legacyAlertReport(site) {
  const context = getSiteLiveContext(site);
  const lines = [
    `ENGINEERING SITE BRIEF`,
    `${site.name} - ${site.county}`,
    `Activity type: ${site.type}`,
    `Coordinates: ${site.lat.toFixed(4)}, ${site.lng.toFixed(4)}`,
    ``,
    `Live environmental context:`,
    ...context.map(item => `- ${item.label}: ${item.value}`),
    ``,
    `Field guidance:`,
    `- Confirm drainage, access, and material storage against the selected rainfall and heat period.`,
    `- Review wind exposure before lifting, roofing, solar panel works, or temporary structures.`,
    `- Use soil saturation and elevation context to decide whether excavation, compaction, or dewatering controls are needed.`,
    `- Check recent seismic context for structural activities, masonry, and temporary works near Rift Valley counties.`
  ];
  window.alert(lines.join('\n'));
}

// ---- MARKERS ----
function addSiteMarkers() {
  const colors = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#22c55e' };
  SITES.forEach(site => {
    const c = colors[site.level];
    const pulse = site.level === 'HIGH' ? `<div class="pulse-ring" style="position:absolute;inset:-4px;border-radius:50%;border:2px solid ${c};animation:pulse 1.8s infinite;opacity:0"></div>` : '';
    const icon = L.divIcon({
      html: `<div style="position:relative;width:16px;height:16px">${pulse}<div style="width:16px;height:16px;border-radius:50%;background:${c};border:2.5px solid rgba(255,255,255,.85);box-shadow:0 0 8px ${c}99,0 2px 6px #0006"></div></div>`,
      className: '',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -10]
    });
    const m = L.marker([site.lat, site.lng], { icon })
      .bindPopup(buildPopupHTML(site), { maxWidth: 300, className: 'kchm-popup' })
      .addTo(map);
    markersLayer.push({ site, marker: m });
  });
}

function buildPopupHTML(s) {
  const col = scoreColor(s.total);
  const assessmentCount = assessmentCountForSite(s.id);
  const liveContext = getSiteLiveContext(s);
  const criticalRisks = [];
  const checks = [
    { key: 'flood', label: 'Flood risk', icon: '🌊', col: '#ef4444' },
    { key: 'earthquake', label: 'Earthquake risk', icon: '⚡', col: '#a855f7' },
    { key: 'landslide', label: 'Landslide risk', icon: '⛰️', col: '#f97316' },
    { key: 'drought', label: 'Drought risk', icon: '☀️', col: '#f59e0b' },
    { key: 'urban', label: 'Urban flood', icon: '🏙️', col: '#14b8a6' },
    { key: 'volcanic', label: 'Volcanic risk', icon: '🌋', col: '#ec4899' },
  ];
  checks.forEach(c => { if (s[c.key] >= 6) criticalRisks.push(c); });

  const criticalNote = '';

  return `
    <div class="popup-name">${s.name}</div>
    <div class="popup-meta">
      <span>📍 ${s.county} County</span>
      <span>🏗️ ${s.type}</span>
      <span class="badge badge-blue" style="font-size:9px">${s.status}</span>
    </div>
    <div class="popup-coord">${Math.abs(s.lat).toFixed(4)}°${s.lat<0?'S':'N'}, ${s.lng.toFixed(4)}°E · ${s.budget}</div>
    <div style="font-size:10px;color:var(--muted);margin-bottom:8px">${assessmentCount} assessment${assessmentCount === 1 ? '' : 's'} recorded</div>
    ${criticalNote}
    <div class="popup-risks">
      ${liveContext.map(item => `<div class="popup-risk-item"><span style="color:${item.color}">${item.label}: ${item.value}</span></div>`).join('')}
    </div>
    <div class="popup-score-row">
      <div>
        <div class="popup-total" style="color:${col}">${s.total}</div>
        <div style="font-size:10px;color:var(--muted);font-family:var(--font-mono)">/ 100</div>
      </div>
      <div>
        <div class="badge badge-${s.level}" style="font-size:11px">${s.level} RISK</div>
        <div style="font-size:10px;color:var(--muted);margin-top:3px">${s.assessor ? '👤 ' + s.lastAssessment : 'Pending assessment'}</div>
      </div>
    </div>
    <div class="popup-field">${s.field.slice(0, 140)}${s.field.length > 140 ? '…' : ''}</div>
    <button class="popup-btn" onclick="flyToAndShowDetail(${s.id})">View Full Assessment →</button>
    <button class="popup-btn" style="background:#0f766e" onclick="generateSiteBrief(${s.id})">Engineer Brief</button>
  `;
}

function flyToAndShowDetail(siteId) {
  const s = SITES.find(x => x.id === siteId);
  if (!s) return;
  map.flyTo([s.lat, s.lng], 11, { duration: 1.5 });
  showDetailPanel(s);
}

function showDetailPanel(s) {
  const col = scoreColor(s.total);
  const dp = document.getElementById('detail-panel');
  dp.innerHTML = `
    <button class="dp-close" onclick="document.getElementById('detail-panel').classList.remove('open')">✕</button>
    <div style="font-family:var(--font-head);font-size:14px;font-weight:800;margin-bottom:3px">${s.name}</div>
    <div style="font-size:10px;color:var(--muted);margin-bottom:10px">${s.county} · ${s.type} · <span class="badge badge-${s.level}">${s.level}</span></div>
    <div class="dp-score-grid">
      ${Object.entries(HAZARD_META).map(([k, m]) => `
        <div class="dp-score-item">
          <div class="dsv" style="color:${s[k]>=7?'#ef4444':s[k]>=5?'#f59e0b':'#22c55e'}">${s[k] || '-'}</div>
          <div class="dsl">${m.icon} ${m.label}</div>
        </div>`).join('')}
    </div>
    <div style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-family:var(--font-mono);font-size:20px;font-weight:700;color:${col}">${s.total}</span>
        <span style="font-size:11px;color:var(--muted)">Weighted Total Score</span>
      </div>
      <div style="font-size:10px;color:var(--muted);line-height:1.6">${s.field.slice(0,180)}${s.field.length>180?'…':''}</div>
    </div>
    <div style="margin-top:8px">
      ${s.riskNotes.map(n=>`<div style="font-size:10px;color:#ef4444;padding:2px 0;border-left:2px solid #ef444440;padding-left:7px;margin:3px 0">${n}</div>`).join('')}
    </div>`;
  dp.classList.add('open');
}

function flyTo(lat, lng, zoom) {
  showPage('map');
  setTimeout(() => map.flyTo([lat, lng], zoom || 10, { duration: 1.5 }), 150);
}

function updateMiniStats() {
  const high = SITES.filter(s => s.level === 'HIGH').length;
  const med = SITES.filter(s => s.level === 'MEDIUM').length;
  const low = SITES.filter(s => s.level === 'LOW').length;
  const totalAssessments = assessments.length;
  document.getElementById('mini-stats').innerHTML = `
    <div class="mini-stat-row"><div class="dot" style="background:#ef4444"></div><span>${high} HIGH risk sites</span></div>
    <div class="mini-stat-row"><div class="dot" style="background:#f59e0b"></div><span>${med} MEDIUM risk</span></div>
    <div class="mini-stat-row"><div class="dot" style="background:#22c55e"></div><span>${low} LOW risk sites</span></div>
    <div style="border-top:1px solid var(--border);margin-top:7px;padding-top:7px;font-size:11px;color:var(--muted)">${SITES.length} total projects monitored</div>
    <div style="font-size:11px;color:var(--muted)">${totalAssessments} assessment${totalAssessments === 1 ? '' : 's'} submitted</div>`;
}

// ============================================================
// RANKING TABLE
// ============================================================
function renderRankStats() {
  const high = filteredSites.filter(s => s.level === 'HIGH').length;
  const med = filteredSites.filter(s => s.level === 'MEDIUM').length;
  const low = filteredSites.filter(s => s.level === 'LOW').length;
  const avg = filteredSites.length ? Math.round(filteredSites.reduce((a, s) => a + s.total, 0) / filteredSites.length) : 0;
  document.getElementById('rank-stats').innerHTML = `
    <div class="stat-card"><div class="stat-val" style="color:#ef4444">${high}</div><div class="stat-lbl">High Risk</div></div>
    <div class="stat-card"><div class="stat-val" style="color:#f59e0b">${med}</div><div class="stat-lbl">Medium Risk</div></div>
    <div class="stat-card"><div class="stat-val" style="color:#22c55e">${low}</div><div class="stat-lbl">Low Risk</div></div>
    <div class="stat-card"><div class="stat-val">${avg}</div><div class="stat-lbl">Avg Score</div></div>
    <div class="stat-card"><div class="stat-val">${filteredSites.length}</div><div class="stat-lbl">Filtered</div></div>
    <div class="stat-card"><div class="stat-val">${SITES.length}</div><div class="stat-lbl">Total Sites</div></div>`;
}

function renderTable() {
  const sorted = [...filteredSites].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    return sortDir * (typeof av === 'string' ? av.localeCompare(bv) : av - bv);
  });
  const tbody = document.getElementById('rank-tbody');
  tbody.innerHTML = sorted.map((s, i) => {
    const col = scoreColor(s.total);
    return `<tr onclick="flyTo(${s.lat},${s.lng},11)" style="cursor:pointer" title="Click to fly to site on map">
      <td style="color:var(--muted);font-family:var(--font-mono)">${i + 1}</td>
      <td><div class="site-name">${s.name}</div><div class="site-type">${s.type}</div></td>
      <td>${s.county}</td>
      <td><span class="badge badge-blue">${s.status}</span></td>
      <td>
        <div class="sbar-wrap">
          <div class="sbar"><div class="sbar-fill" style="width:${s.total}%;background:${col}"></div></div>
          <div class="sbar-val" style="color:${col}">${s.total}</div>
        </div>
      </td>
      <td><span class="badge badge-${s.level}">${s.level}</span></td>
    </tr>`;
  }).join('');
  renderRankStats();
}

function sortTable(key) {
  if (sortKey === key) sortDir *= -1; else { sortKey = key; sortDir = -1; }
  document.querySelectorAll('#rank-table th').forEach(th => th.classList.remove('sort-asc', 'sort-desc'));
  renderTable();
}

function filterTable() {
  const q = (document.getElementById('search-input')?.value || '').toLowerCase();
  const co = document.getElementById('county-filter')?.value || '';
  const rl = document.getElementById('risk-filter')?.value || '';
  filteredSites = SITES.filter(s => {
    if (q && !s.name.toLowerCase().includes(q) && !s.county.toLowerCase().includes(q)) return false;
    if (co && s.county !== co) return false;
    if (rl && s.level !== rl) return false;
    return true;
  });
  renderTable();
}

// ============================================================
// FIELD ASSESSMENT
// ============================================================
function populateSiteSelectors() {
  ['fa-site', 'admin-edit-site'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = SITES.map(s => `<option value="${s.id}">${s.name} (${s.county})</option>`).join('');
  });

  ['fa-site', 'fa-inspector', 'fa-date', 'fa-lat', 'fa-lng', 'fa-role', 'fa-visit-type', 'fa-construction-type', 'fa-project-stage'].forEach(id => {
    const el = document.getElementById(id);
    if (!el || el.dataset.bound === '1') return;
    el.addEventListener('input', updateAutofillSection);
    el.addEventListener('change', () => {
      if (id === 'fa-site') {
        questionnaireState = {};
        questionnaireStep = 0;
      }
      updateAutofillSection();
      renderQuestionnaire();
    });
    el.dataset.bound = '1';
  });

}

function getGPS() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(p => {
      document.getElementById('fa-lat').value = p.coords.latitude.toFixed(6);
      document.getElementById('fa-lng').value = p.coords.longitude.toFixed(6);
      updateAutofillSection();
      showToast('GPS coordinates captured ✓');
    }, () => showToast('GPS unavailable — enter manually'));
  } else showToast('Geolocation not supported on this device');
}

function submitAssessment() {
  const siteId = +document.getElementById('fa-site').value;
  const site = SITES.find(s => s.id === siteId);
  const inspector = document.getElementById('fa-inspector').value || 'Anonymous Inspector';
  const role = document.getElementById('fa-role').value || 'Not recorded';
  const visitType = document.getElementById('fa-visit-type').value || 'Routine (weekly/biweekly)';
  const constructionType = document.getElementById('fa-construction-type').value || '';
  const projectStage = document.getElementById('fa-project-stage').value || '';
  const notes = document.getElementById('fa-notes').value;
  const lat = document.getElementById('fa-lat').value || site.lat;
  const lng = document.getElementById('fa-lng').value || site.lng;
  const questionnaire = collectQuestionnaireResponses();
  const autoFields = buildAutofillContext(site);
  const computedRating = computeQuestionnaireRating(questionnaire);

  if (!inspector) { showToast('Inspector name required'); return; }
  if (!constructionType || !projectStage) { showToast('Select construction type and current project stage first'); return; }

  const assessment = {
    id: Date.now(), siteId, siteName: site.name, county: site.county,
    inspector, role, visitType, constructionType, projectStage, lat, lng, notes,
    questionnaire: { ...questionnaire, computed_rating: computedRating.rating, computed_score: computedRating.scorePercent, focal_action: computedRating.action },
    autoFields,
    timestamp: new Date().toLocaleString(),
    isoDate: new Date().toISOString()
  };

  assessments.unshift(assessment);
  localStorage.setItem('kchm_assessments', JSON.stringify(assessments.slice(0, 50)));
  queueAssessmentNotifications(assessment);

  site.lastAssessment = new Date().toLocaleDateString();
  site.assessor = inspector;
  site.field = (questionnaire.additional_comments || questionnaire.issues || notes || site.field);

  renderRecentAssessments();
  renderTable();
  renderAdminTable();
  renderAdminRegistryStats();
  renderAdminNotifications();
  updateMiniStats();
  questionnaireState = {};
  questionnaireStep = 0;
  document.getElementById('fa-notes').value = '';
  renderQuestionnaire();
  showToast(`Assessment submitted for "${site.name}". Construction and security focal points have been notified.`);
}

function renderRecentAssessments() {
  const cont = document.getElementById('recent-assessments');
  if (!cont) return;
  if (!assessments.length) {
    cont.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px;font-size:12px">No assessments yet.<br>Submit your first field report -></div>';
    return;
  }
  cont.innerHTML = assessments.slice(0, 8).map(a => `
    <div class="assessment-card">
      <div class="ac-header">
        <div class="ac-site">${a.siteName}</div>
        <span class="badge badge-blue" style="font-size:9px">${a.county}</span>
      </div>
      <div class="ac-meta">Inspector: ${a.inspector} - ${a.timestamp}</div>
      <div class="assessment-privacy-note">Automatic rating hidden in field workflow</div>
      <div class="assessment-actions">
        <button class="btn btn-sm" onclick="openAssessmentModal(${a.id})">View Submitted Survey</button>
      </div>
      ${a.notes ? `<div style="font-size:10px;color:var(--muted);margin-top:5px;line-height:1.5">${a.notes.slice(0, 100)}${a.notes.length > 100 ? '...' : ''}</div>` : ''}
    </div>`).join('');
}


// ============================================================
// ADMIN
// ============================================================
function renderAdminTable() {
  const tbody = document.getElementById('admin-tbody');
  if (!tbody) return;
  tbody.innerHTML = SITES.map(s => `
    <tr>
      <td>
        <div class="site-name">${s.name}</div>
        <div class="site-type">${s.type}</div>
        <div class="registry-site-meta">
          <span>${s.status}</span>
          <span>${s.budget || 'Budget TBD'}</span>
        </div>
      </td>
      <td>${s.county}</td>
      <td>
        <div class="registry-assessment-count">${assessmentCountForSite(s.id)}</div>
        <div class="registry-assessment-sub">${s.lastAssessment ? `Last: ${s.lastAssessment}` : 'No assessment yet'}</div>
      </td>
      <td><span class="badge badge-blue">${s.status}</span></td>
      <td><span class="sbar-val" style="color:${scoreColor(s.total)}">${s.total}</span></td>
      <td><span class="badge badge-${s.level}">${s.level}</span></td>
      <td>
        <div class="registry-location">${s.lat.toFixed(4)}<br>${s.lng.toFixed(4)}</div>
      </td>
      <td>
        <div class="registry-actions">
          <button class="btn btn-sm" onclick="flyTo(${s.lat},${s.lng},11)">Map</button>
          <button class="btn btn-sm btn-danger" onclick="deleteSite(${s.id})">Remove</button>
        </div>
      </td>
    </tr>`).join('');
}

function renderAdminRegistryStats() {
  const cont = document.getElementById('admin-registry-stats');
  if (!cont) return;
  const totalSites = SITES.length;
  const totalAssessments = assessments.length;
  const assessedSites = SITES.filter(site => assessmentCountForSite(site.id) > 0).length;
  const unassessedSites = totalSites - assessedSites;

  cont.innerHTML = [
    { value: totalSites, label: 'Total sites' },
    { value: assessedSites, label: 'Sites assessed' },
    { value: totalAssessments, label: 'Assessments logged' },
    { value: unassessedSites, label: 'Need visits' }
  ].map(stat => `
    <div class="registry-stat">
      <div class="registry-stat-value">${stat.value}</div>
      <div class="registry-stat-label">${stat.label}</div>
    </div>
  `).join('');
}

function queueAssessmentNotifications(assessment) {
  const recipients = ['Construction focal point', 'Security focal point'];
  const entry = {
    id: Date.now(),
    siteName: assessment.siteName,
    county: assessment.county,
    rating: assessment.questionnaire?.computed_rating || 'UNKNOWN',
    score: assessment.questionnaire?.computed_score || 0,
    action: assessment.questionnaire?.focal_action || 'Admin review required.',
    recipients,
    submittedBy: assessment.inspector,
    timestamp: assessment.timestamp
  };
  assessmentNotifications.unshift(entry);
  localStorage.setItem('kchm_assessment_notifications', JSON.stringify(assessmentNotifications.slice(0, 100)));
}

function renderAdminNotifications() {
  const cont = document.getElementById('admin-notification-list');
  if (!cont) return;
  if (!assessmentNotifications.length) {
    cont.innerHTML = '<div style="color:var(--muted);font-size:12px">No admin notifications yet.</div>';
    return;
  }
  cont.innerHTML = assessmentNotifications.slice(0, 10).map(item => `
    <div class="notification-card">
      <div class="notification-head">
        <div>
          <div class="notification-site">${item.siteName}</div>
          <div class="notification-meta">${item.county} - ${item.timestamp} - Submitted by ${item.submittedBy}</div>
        </div>
        <span class="badge badge-${item.rating === 'RED' ? 'HIGH' : item.rating === 'AMBER' ? 'MEDIUM' : 'LOW'}">${item.rating} ${item.score ? `(${item.score}%)` : ''}</span>
      </div>
      <div class="notification-recipients">${item.recipients.map(name => `<span class="assessment-pill">${name}</span>`).join('')}</div>
      <div class="notification-action">${item.action}</div>
    </div>`).join('');
}


function showAddSiteModal() {
  document.getElementById('add-site-modal').classList.add('open');
}
function closeAddSiteModal() {
  document.getElementById('add-site-modal').classList.remove('open');
}

function addSite() {
  const name = document.getElementById('ns-name').value.trim();
  const county = document.getElementById('ns-county').value;
  const lat = parseFloat(document.getElementById('ns-lat').value) || -1.28;
  const lng = parseFloat(document.getElementById('ns-lng').value) || 36.82;
  const status = document.getElementById('ns-status').value;
  const type = document.getElementById('ns-type').value;
  const budget = document.getElementById('ns-budget').value || 'TBD';
  const plannedStart = document.getElementById('ns-start-date').value || new Date().toISOString().split('T')[0];
  const plannedCompletion = document.getElementById('ns-end-date').value || '';
  if (!name) { showToast('Site name is required'); return; }

  const ns = {
    id: Date.now(), name, shortName: name, county, lat, lng, status, type,
    contractor: 'To be assigned', budget,
    plannedStart, plannedCompletion,
    flood: 5, landslide: 5, earthquake: 5, drought: 5, urban: 5, volcanic: 3, soilRisk: 5,
    desc: 'Newly registered site — pending first field assessment.',
    field: 'No field assessment on record.',
    riskNotes: ['Initial scores pending field assessment'],
    lastAssessment: null, assessor: null, photos: [],
    scheduleAdherence: 85, safetyIncidents: 0, qualityScore: 7.5,
    communitySatisfaction: 7.8, environmentalCompliance: 90, contractorPerformance: 7.5, resourceUtilization: 80
  };
  ns.total = totalScore(ns); ns.level = riskLevel(ns.total);
  SITES.push(ns);
  filteredSites = [...SITES];

  // Add marker
  const col = scoreColor(ns.total);
  const icon = L.divIcon({
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${col};border:2.5px solid rgba(255,255,255,.85);box-shadow:0 0 8px ${col}99"></div>`,
    className: '', iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -10]
  });
  L.marker([lat, lng], { icon }).bindPopup(buildPopupHTML(ns)).addTo(map);

  closeAddSiteModal();
  renderAdminTable(); renderAdminRegistryStats(); renderTable(); updateMiniStats();
  populateSiteSelectors();
  showToast(`✓ Site "${name}" added to the map`);
  ['ns-name', 'ns-lat', 'ns-lng', 'ns-budget', 'ns-start-date', 'ns-end-date'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

function deleteSite(id) {
  if (!confirm('Remove this site from the system?')) return;
  const idx = SITES.findIndex(s => s.id === id);
  if (idx > -1) SITES.splice(idx, 1);
  filteredSites = [...SITES];
  renderAdminTable(); renderAdminRegistryStats(); renderTable(); updateMiniStats();
  showToast('Site removed from system');
}

// ============================================================
// CHARTS
// ============================================================
function initCharts() {
  if (chartsInited) return;
  chartsInited = true;

  Chart.defaults.color = 'rgba(180,190,210,.7)';
  Chart.defaults.font.family = "'Barlow', sans-serif";

  const gridOpts = { color: 'rgba(30,45,69,.8)', drawBorder: false };
  const tickOpts = { color: 'rgba(107,127,160,.8)', font: { size: 11 } };

  // 1. Average hazard scores by type
  const hazardKeys = ['flood', 'landslide', 'earthquake', 'drought', 'urban', 'volcanic', 'soilRisk'];
  const hazardLabels = hazardKeys.map(k => HAZARD_META[k].label);
  const hazardAvg = hazardKeys.map(k => +(SITES.reduce((a, s) => a + (s[k] || 0), 0) / SITES.length).toFixed(1));
  const hazardColors = hazardKeys.map(k => HAZARD_META[k].color);

  new Chart(document.getElementById('chart-hazard'), {
    type: 'bar',
    data: { labels: hazardLabels, datasets: [{ data: hazardAvg, backgroundColor: hazardColors, borderRadius: 5, borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y.toFixed(1)} / 10` } } }, scales: { x: { grid: gridOpts, ticks: tickOpts }, y: { grid: gridOpts, ticks: tickOpts, min: 0, max: 10 } } }
  });

  // 2. Top 10 sites bar
  const top10 = SITES.slice(0, 10);
  new Chart(document.getElementById('chart-sites'), {
    type: 'bar',
    data: {
      labels: top10.map(s => s.shortName || s.name.slice(0, 18)),
      datasets: [{ data: top10.map(s => s.total), backgroundColor: top10.map(s => scoreColor(s.total)), borderRadius: 4, borderWidth: 0 }]
    },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: gridOpts, ticks: tickOpts, min: 0, max: 100 }, y: { grid: gridOpts, ticks: { ...tickOpts, font: { size: 10 } } } } }
  });

  // 3. County radar
  const countyMap = {};
  SITES.forEach(s => { if (!countyMap[s.county]) countyMap[s.county] = []; countyMap[s.county].push(s.total); });
  const cNames = Object.keys(countyMap);
  const cAvg = cNames.map(c => +(countyMap[c].reduce((a, v) => a + v, 0) / countyMap[c].length).toFixed(1));
  new Chart(document.getElementById('chart-county'), {
    type: 'radar',
    data: { labels: cNames, datasets: [{ data: cAvg, fill: true, backgroundColor: 'rgba(59,130,246,.1)', borderColor: '#3b82f6', pointBackgroundColor: '#3b82f6', borderWidth: 1.5 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { r: { ticks: { display: false, stepSize: 20 }, grid: { color: 'rgba(30,45,69,.8)' }, pointLabels: { color: 'rgba(107,127,160,.9)', font: { size: 10 } }, min: 0, max: 100 } } }
  });

  // 4. Weight donut
  new Chart(document.getElementById('chart-weight'), {
    type: 'doughnut',
    data: {
      labels: ['Flood (30%)', 'Earthquake (20%)', 'Urban (15%)', 'Landslide (15%)', 'Drought (10%)', 'Volcanic (5%)', 'Soil (5%)'],
      datasets: [{ data: [30, 20, 15, 15, 10, 5, 5], backgroundColor: ['#ef4444', '#a855f7', '#14b8a6', '#f97316', '#f59e0b', '#ec4899', '#3b82f6'], borderWidth: 0 }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '58%', plugins: { legend: { position: 'right', labels: { color: 'rgba(180,190,210,.8)', font: { size: 10 }, boxWidth: 10, padding: 8 } } } }
  });

  // 5. Trend line (mock historical)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const highRisk = [5, 6, 7, 8, 9, 8, 7, 8, 9, 10, 11, 11];
  const medRisk = [6, 6, 7, 7, 7, 8, 8, 7, 7, 8, 7, 7];
  new Chart(document.getElementById('chart-trend'), {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        { label: 'HIGH', data: highRisk, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,.08)', tension: 0.4, fill: true, pointRadius: 3 },
        { label: 'MEDIUM', data: medRisk, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,.08)', tension: 0.4, fill: true, pointRadius: 3 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 11 }, boxWidth: 12, padding: 12 } } }, scales: { x: { grid: gridOpts, ticks: tickOpts }, y: { grid: gridOpts, ticks: tickOpts, min: 0 } } }
  });
}

// ============================================================
// EXPORT
// ============================================================
function exportCSV() {
  const headers = ['Rank', 'Site Name', 'County', 'Type', 'Status', 'Budget', 'Flood', 'Landslide', 'Earthquake', 'Drought', 'Urban', 'Volcanic', 'Soil', 'Total Score', 'Risk Level', 'Last Assessment', 'Latitude', 'Longitude'];
  const rows = filteredSites.map((s, i) =>
    [i + 1, `"${s.name}"`, s.county, s.type, s.status, `"${s.budget}"`,
      s.flood, s.landslide, s.earthquake, s.drought, s.urban, s.volcanic, s.soilRisk,
      s.total, s.level, s.lastAssessment || 'Pending', s.lat, s.lng].join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile('kenya-hazard-risk-rankings.csv', 'text/csv', csv);
  showToast('✓ CSV exported successfully');
}

function exportAssessmentsCSV() {
  if (!assessments.length) { showToast('No assessments to export'); return; }
  const headers = ['ID', 'Site', 'County', 'Inspector', 'Role', 'Visit Type', 'Construction Type', 'Project Stage', 'Timestamp', 'Overall Rating', 'Score %', 'Estimated Complete', 'Focal Action', 'Notes', 'Issues', 'Recommended Actions'];
  const rows = assessments.map(a =>
    [a.id, `"${a.siteName}"`, a.county, `"${a.inspector}"`, `"${a.role || ''}"`, `"${a.visitType || ''}"`, `"${a.constructionType || ''}"`, `"${a.projectStage || ''}"`, `"${a.timestamp}"`, `"${a.questionnaire?.computed_rating || ''}"`, `"${a.questionnaire?.computed_score || ''}"`, `"${a.questionnaire?.estimated_complete || ''}"`, `"${(a.questionnaire?.focal_action || '').replace(/"/g, "'")}"`,
      `"${(a.notes || '').replace(/"/g, "'")}"`, `"${(a.questionnaire?.issues || '').replace(/"/g, "'")}"`, `"${(a.questionnaire?.recommended_actions || '').replace(/"/g, "'")}"`].join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile('kenya-field-assessments.csv', 'text/csv', csv);
  showToast('✓ Assessments exported');
}

function downloadFile(filename, type, content) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ============================================================
// NAVIGATION
// ============================================================
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const page = document.getElementById(id + '-page');
  const tab = document.getElementById('tab-' + id);
  if (page) page.classList.add('active');
  if (tab) tab.classList.add('active');

  if (id === 'map') {
    setTimeout(() => {
      if (map) {
        hideMapStatus();
        map.invalidateSize();
        renderHeatCanvas();
      } else {
        initMap();
      }
    }, 100);
  }
  if (id === 'charts') setTimeout(initCharts, 200);
  if (id === 'admin') {
    renderAdminTable();
    renderAdminRegistryStats();
    renderAdminNotifications();
  }
  if (id === 'users') renderInvitedUsers();
  if (id === 'performance') {
    renderPerformanceTable();
    initPerformanceCharts();
  }
}

function showMapStatus(msg) {
  const el = document.getElementById('map-status');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
}

function renderQuestionnaire() {
  const cont = document.getElementById('questionnaire-sections');
  if (!cont) return;
  const sections = getActiveQuestionnaireSections();
  if (!sections.length) {
    cont.innerHTML = '';
    updateQuestionnaireNavigation([]);
    updateRiskBanner();
    return;
  }
  questionnaireStep = Math.min(questionnaireStep, sections.length - 1);
  cont.innerHTML = sections.map((section, index) => `
    <div class="q-section" data-step="${index}" ${index === questionnaireStep ? '' : 'hidden'}>
      <div class="q-section-head">${section.title}</div>
      ${section.items.map(item => renderQuestionnaireItem(item)).join('')}
    </div>
  `).join('');
  bindQuestionnaireInputs();
  updateQuestionnaireNavigation(sections);
  updateRiskBanner();
}

function renderQuestionnaireItem(item) {
  if (item.type === 'textarea') {
    return `
      <div class="q-item full">
        <div class="q-title">${item.label}</div>
        <div class="q-guidance">${item.guidance}</div>
        <textarea class="form-textarea form-input" rows="3" data-qid="${item.id}">${escapeHtml(questionnaireState[item.id] || '')}</textarea>
      </div>
    `;
  }

  if (item.type === 'text') {
    return `
      <div class="q-item">
        <div class="q-title">${item.label}</div>
        <div class="q-guidance">${item.guidance}</div>
        <input type="text" class="form-input" data-qid="${item.id}" value="${escapeAttribute(questionnaireState[item.id] || '')}">
      </div>
    `;
  }

  return `
    <div class="q-item full">
      <div class="q-title">${item.label}</div>
      <div class="q-guidance">${item.guidance}</div>
      <div class="q-options">
        ${item.options.map(option => `
          <label class="q-option">
            <input type="radio" name="q-${item.id}" value="${option}" data-qid="${item.id}" ${questionnaireState[item.id] === option ? 'checked' : ''}>
            <span>${option}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `;
}

function getQuestionnaireContext() {
  return {
    visitType: document.getElementById('fa-visit-type')?.value || '',
    constructionType: document.getElementById('fa-construction-type')?.value || '',
    stage: document.getElementById('fa-project-stage')?.value || ''
  };
}

function getActiveQuestionnaireSections() {
  const ctx = getQuestionnaireContext();
  if (!ctx.visitType || !ctx.constructionType || !ctx.stage) return [];
  return WIZARD_SECTIONS
    .filter(section => !section.showWhen || section.showWhen(ctx))
    .map(section => ({
      ...section,
      items: section.items.filter(item => !item.appliesToTypes || item.appliesToTypes.includes(ctx.constructionType))
    }))
    .filter(section => section.items.length);
}

function bindQuestionnaireInputs() {
  document.querySelectorAll('#questionnaire-sections [data-qid], #questionnaire-sections input[type="radio"]').forEach(el => {
    if (el.dataset.bound === '1') return;
    const eventName = el.type === 'radio' ? 'change' : 'input';
    el.addEventListener(eventName, () => {
      questionnaireState[el.dataset.qid] = el.type === 'radio' ? el.value : el.value;
      updateRiskBanner();
    });
    el.dataset.bound = '1';
  });
}

function moveQuestionnaireStep(delta) {
  const sections = getActiveQuestionnaireSections();
  if (!sections.length) return;
  questionnaireStep = Math.max(0, Math.min(sections.length - 1, questionnaireStep + delta));
  renderQuestionnaire();
}

function updateQuestionnaireNavigation(sections) {
  const prev = document.getElementById('wizard-prev');
  const next = document.getElementById('wizard-next');
  const label = document.getElementById('wizard-progress-label');
  const dots = document.getElementById('wizard-progress-dots');
  if (!prev || !next || !label || !dots) return;

  const ctx = getQuestionnaireContext();
  const setupReady = QUESTIONNAIRE_SETUP_FIELDS.every(id => document.getElementById(id)?.value);
  document.getElementById('questionnaire-setup').hidden = setupReady;

  if (!sections.length) {
    prev.disabled = true;
    next.disabled = true;
    label.textContent = 'Select visit type, construction type, and current stage to begin';
    dots.innerHTML = '';
    return;
  }

  prev.disabled = questionnaireStep === 0;
  next.disabled = questionnaireStep === sections.length - 1;
  next.textContent = questionnaireStep === sections.length - 1 ? 'Review responses' : 'Next';
  label.textContent = `Step ${questionnaireStep + 1} of ${sections.length}: ${sections[questionnaireStep].title}`;
  dots.innerHTML = sections.map((_, index) => `<span class="wizard-dot ${index < questionnaireStep ? 'done' : ''} ${index === questionnaireStep ? 'active' : ''}"></span>`).join('');
}

function updateRiskBanner() {
  const banner = document.getElementById('risk-summary-banner');
  if (!banner) return;
  const sections = getActiveQuestionnaireSections();
  if (!sections.length) {
    banner.hidden = true;
    return;
  }
  const answered = Object.values(collectQuestionnaireResponses()).filter(Boolean).length;
  banner.hidden = false;
  banner.dataset.rating = 'INFO';
  banner.innerHTML = `
    <div class="risk-summary-title">Assessment progress: ${answered} responses captured</div>
    <div class="risk-summary-text">Automatic rating is hidden from field staff. Admin will review the final rating and notification trail after submission.</div>
  `;
}


function updateAutofillSection() {
  const siteId = +document.getElementById('fa-site')?.value;
  const site = SITES.find(s => s.id === siteId);
  const cont = document.getElementById('autofill-fields');
  if (!site || !cont) return;
  const fields = buildAutofillContext(site);
  cont.innerHTML = fields.map(field => `
    <div class="autofill-item ${field.full ? 'full' : ''}">
      <label>${field.label}</label>
      <div class="autofill-value">${field.value}</div>
    </div>
  `).join('');
  updateQuestionnaireNavigation(getActiveQuestionnaireSections());
  updateRiskBanner();
}

function buildAutofillContext(site) {
  const visitDate = document.getElementById('fa-date')?.value || new Date().toISOString().split('T')[0];
  const inspector = document.getElementById('fa-inspector')?.value || 'Pending entry';
  const role = document.getElementById('fa-role')?.value || 'Pending entry';
  const lat = document.getElementById('fa-lat')?.value || site.lat.toFixed(4);
  const lng = document.getElementById('fa-lng')?.value || site.lng.toFixed(4);
  const contractCode = `SCI-${String(site.id).padStart(3, '0')}`;

  const latVal = parseFloat(lat) || site.lat;
  const lngVal = parseFloat(lng) || site.lng;
  const tempSite = { ...site, lat: latVal, lng: lngVal };
  const liveCtx = getSiteLiveContext(tempSite);
  const windVal = liveCtx.find(c => c.label === 'Wind')?.value || 'No data';
  const soilVal = liveCtx.find(c => c.label === 'Soil saturation')?.value || 'No data';
  const solarVal = liveCtx.find(c => c.label === 'Solar radiation')?.value || 'No data';
  const elevationVal = liveCtx.find(c => c.label === 'Elevation')?.value || 'No data';

  return [
    { label: 'Site / Borehole Name', value: site.name },
    { label: 'Visit Date', value: visitDate },
    { label: 'County / Sub-county', value: `${site.county} / ${site.type}` },
    { label: 'GPS Coordinates', value: `${lat}, ${lng}` },
    { label: 'Project Code / Donor', value: `${contractCode} / Internal Humanitarian Portfolio` },
    { label: 'Contractor Name', value: site.contractor || 'Not recorded' },
    { label: 'Contract No.', value: `CONT-${String(site.id).padStart(3, '0')}` },
    { label: 'Contract Value (KES)', value: site.budget || 'Not recorded' },
    { label: 'Contract End Date', value: site.lastAssessment || 'To confirm' },
    { label: 'Monitoring Officer', value: inspector },
    { label: 'Department / Role', value: role },
    { label: 'Wind', value: windVal },
    { label: 'Soil Saturation', value: soilVal },
    { label: 'Solar', value: solarVal },
    { label: 'Elevation', value: elevationVal },
    { label: 'Current Site Context', value: site.desc || 'No site description recorded.', full: true }
  ];
}

function mapSiteTypeToQuestionnaireType(type) {
  const map = {
    Borehole: 'Borehole Rehab',
    'School WASH': 'School WASH',
    'Latrine Block': 'Latrine/Sanitation',
    'Child Friendly Space': 'CFS',
    'Classroom Block': 'Classroom Block',
    'Handwashing Station': 'School WASH',
    'Health Facility WASH': 'Latrine/Sanitation',
    'Water Kiosk': 'Borehole Equipping',
    'Spring Protection': 'Borehole Rehab'
  };
  return map[type] || type;
}

function collectQuestionnaireResponses() {
  return { ...questionnaireState };
}

function computeQuestionnaireRating(responses) {
  const ctx = getQuestionnaireContext();
  const activeSections = WIZARD_SECTIONS
    .filter(section => !section.showWhen || section.showWhen(ctx))
    .map(section => ({
      ...section,
      items: section.items.filter(item => !item.appliesToTypes || item.appliesToTypes.includes(ctx.constructionType))
    }));

  let total = 0;
  let max = 0;
  let critical = false;

  activeSections.forEach(section => {
    section.items.forEach(item => {
      if (!item.scoreMap) return;
      const response = responses[item.id];
      if (response === 'N/A') return;
      max += 2;
      total += item.scoreMap[response] ?? 0;
      if (item.criticalFail?.includes(response)) critical = true;
    });
  });

  const scorePercent = max ? Math.round((total / max) * 100) : 0;
  let rating = 'GREEN';
  if (critical || scorePercent < 55) rating = 'RED';
  else if (scorePercent < 80) rating = 'AMBER';

  const actions = {
    GREEN: 'On track. Share in the routine monitoring report and continue with the planned visit cycle.',
    AMBER: 'Issues need follow-up. Notify the WASH focal team and project manager, then monitor closely on the next visit.',
    RED: 'Serious concern. Escalate immediately to WASH TS, DPO, Programme Manager, and Operations focal team today.'
  };

  return { rating, scorePercent, action: actions[rating] };
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function hideMapStatus() {
  const el = document.getElementById('map-status');
  if (!el) return;
  el.hidden = true;
  el.textContent = '';
}

function assessmentCountForSite(siteId) {
  return assessments.filter(a => a.siteId === siteId).length;
}

function openAssessmentModal(assessmentId) {
  const assessment = assessments.find(a => a.id === assessmentId);
  if (!assessment) return;
  const body = document.getElementById('assessment-modal-body');
  const sections = [];
  sections.push(`<div class="assessment-detail-grid">
    <div class="assessment-detail-item"><strong>Site</strong><br>${assessment.siteName}</div>
    <div class="assessment-detail-item"><strong>Inspector</strong><br>${assessment.inspector}</div>
    <div class="assessment-detail-item"><strong>Visit Type</strong><br>${assessment.visitType || '-'}</div>
    <div class="assessment-detail-item"><strong>Survey status</strong><br>Submitted for admin review</div>
    <div class="assessment-detail-item full"><strong>Submitted</strong><br>${assessment.timestamp}</div>
  </div>`);
  if (assessment.autoFields?.length) {
    sections.push(`<div class="assessment-detail-grid">${assessment.autoFields.map(f => `<div class="assessment-detail-item ${f.full ? 'full' : ''}"><strong>${f.label}</strong><br>${f.value}</div>`).join('')}</div>`);
  }
  if (assessment.questionnaire) {
    sections.push(`<div class="assessment-detail-grid">${Object.entries(assessment.questionnaire)
      .filter(([k]) => !['computed_rating', 'computed_score', 'focal_action'].includes(k))
      .map(([k, v]) => `<div class="assessment-detail-item ${String(v).length > 80 ? 'full' : ''}"><strong>${formatAssessmentKey(k)}</strong><br>${v || '-'}</div>`).join('')}</div>`);
    sections.push('<div class="assessment-detail-item full"><strong>Admin review</strong><br>Automatic rating and focal action are only visible in the admin notification queue.</div>');
  }
  if (assessment.notes) sections.push(`<div class="assessment-detail-item full"><strong>Site Observations</strong><br>${assessment.notes}</div>`);
  body.innerHTML = sections.join('');
  document.getElementById('assessment-modal').classList.add('open');
}

function closeAssessmentModal() {
  document.getElementById('assessment-modal').classList.remove('open');
}

function formatAssessmentKey(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function initAuthGate() {
  if (!currentUser) {
    document.getElementById('auth-gate').classList.remove('hidden');
    document.getElementById('app').style.filter = 'blur(4px)';
    document.getElementById('app').style.pointerEvents = 'none';
  } else {
    unlockApp();
  }
}

function unlockApp() {
  document.getElementById('auth-gate').classList.add('hidden');
  document.getElementById('app').style.filter = '';
  document.getElementById('app').style.pointerEvents = '';
}

function loginWithInvite() {
  const email = (document.getElementById('login-email').value || '').trim().toLowerCase();
  const msg = document.getElementById('auth-message');
  if (!email) {
    msg.textContent = 'Enter your invited email.';
    return;
  }
  if (!invitedUsers.includes(email)) {
    msg.textContent = 'Access denied. This email has not been invited.';
    return;
  }
  currentUser = email;
  localStorage.setItem('kchm_current_user', currentUser);
  updateCurrentUserLabel();
  unlockApp();
}

function updateCurrentUserLabel() {
  const el = document.getElementById('current-user');
  if (el) el.textContent = currentUser || '';
}

function inviteUser() {
  const input = document.getElementById('invite-email');
  const email = (input.value || '').trim().toLowerCase();
  if (!email) {
    showToast('Enter an email to invite');
    return;
  }
  if (!invitedUsers.includes(email)) invitedUsers.push(email);
  localStorage.setItem('kchm_invited_users', JSON.stringify(invitedUsers));
  renderInvitedUsers();
  input.value = '';
  showToast(`Invite added for ${email}`);
}

function removeInvite(email) {
  invitedUsers = invitedUsers.filter(x => x !== email);
  localStorage.setItem('kchm_invited_users', JSON.stringify(invitedUsers));
  if (currentUser === email) {
    currentUser = '';
    localStorage.removeItem('kchm_current_user');
    updateCurrentUserLabel();
    initAuthGate();
  }
  renderInvitedUsers();
}

// ============================================================
// PERFORMANCE DASHBOARD
// ============================================================
let performanceSortKey = 'overall', performanceSortDir = -1;

function renderPerformanceTable() {
  const tbody = document.getElementById('performance-tbody');
  if (!tbody) return;

  // Calculate overall performance score for each site
  const sitesWithPerformance = SITES.map(site => ({
    ...site,
    overall: calculateOverallPerformance(site)
  }));

  // Sort sites
  sitesWithPerformance.sort((a, b) => {
    let aVal = a[performanceSortKey], bVal = b[performanceSortKey];
    if (performanceSortKey === 'overall') {
      aVal = a.overall; bVal = b.overall;
    }
    if (typeof aVal === 'string') {
      return performanceSortDir * aVal.localeCompare(bVal);
    }
    return performanceSortDir * (aVal - bVal);
  });

  tbody.innerHTML = sitesWithPerformance.map((site, index) => {
    const rank = index + 1;
    const overallScore = site.overall;
    const statusColor = overallScore >= 8.5 ? 'var(--green)' : overallScore >= 7.0 ? 'var(--amber)' : 'var(--red)';
    const statusText = overallScore >= 8.5 ? 'Excellent' : overallScore >= 7.0 ? 'Good' : 'Needs Attention';

    return `
      <tr>
        <td style="text-align:center;font-weight:600;color:${statusColor}">${rank}</td>
        <td>
          <div style="font-weight:600;font-size:12px">${site.name}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">${site.type}</div>
        </td>
        <td>${site.county}</td>
        <td style="text-align:center">
          <span style="color:${site.scheduleAdherence >= 90 ? 'var(--green)' : site.scheduleAdherence >= 75 ? 'var(--amber)' : 'var(--red)'}">
            ${site.scheduleAdherence}%
          </span>
        </td>
        <td style="text-align:center">
          <span style="color:${site.qualityScore >= 8.5 ? 'var(--green)' : site.qualityScore >= 7.0 ? 'var(--amber)' : 'var(--red)'}">
            ${site.qualityScore}
          </span>
        </td>
        <td style="text-align:center">
          <span style="color:${site.contractorPerformance >= 8.5 ? 'var(--green)' : site.contractorPerformance >= 7.0 ? 'var(--amber)' : 'var(--red)'}">
            ${site.contractorPerformance}
          </span>
        </td>
        <td style="text-align:center">
          <span style="color:${site.communitySatisfaction >= 8.5 ? 'var(--green)' : site.communitySatisfaction >= 7.0 ? 'var(--amber)' : 'var(--red)'}">
            ${site.communitySatisfaction}
          </span>
        </td>
        <td style="text-align:center;font-weight:700;color:${statusColor};font-size:14px">${overallScore.toFixed(1)}</td>
        <td><span class="badge" style="background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}44">${statusText}</span></td>
      </tr>
    `;
  }).join('');
}

function calculateOverallPerformance(site) {
  const weights = PERFORMANCE_WEIGHTS;
  const safetyScore = Math.max(0, 1 - Math.min(site.safetyIncidents || 0, 4) / 4);
  const score = (
    (site.scheduleAdherence / 100) * weights.scheduleAdherence +
    safetyScore * weights.safetyIncidents +
    (site.qualityScore / 10) * weights.qualityScore +
    (site.contractorPerformance / 10) * weights.contractorPerformance +
    (site.communitySatisfaction / 10) * weights.communitySatisfaction +
    (site.environmentalCompliance / 100) * weights.environmentalCompliance +
    (site.resourceUtilization / 100) * weights.resourceUtilization
  );
  return Math.round(score * 10) / 10; // Round to 1 decimal
}

function sortPerformanceTable(key) {
  if (key === performanceSortKey) {
    performanceSortDir *= -1;
  } else {
    performanceSortKey = key;
    performanceSortDir = key === 'name' ? 1 : -1;
  }
  renderPerformanceTable();
}

function filterPerformanceTable() {
  const search = document.getElementById('performance-search').value.toLowerCase();
  const tbody = document.getElementById('performance-tbody');
  if (!tbody) return;

  const rows = tbody.querySelectorAll('tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(search) ? '' : 'none';
  });
}

function exportPerformanceCSV() {
  const headers = ['Rank', 'Site Name', 'County', 'Schedule Adherence (%)', 'Quality Score', 'Contractor Performance', 'Community Satisfaction', 'Environmental Compliance (%)', 'Resource Utilization (%)', 'Overall Score', 'Status'];
  const sitesWithPerformance = SITES.map(site => ({
    ...site,
    overall: calculateOverallPerformance(site)
  })).sort((a, b) => b.overall - a.overall);

  const rows = sitesWithPerformance.map((site, index) => {
    const overallScore = site.overall;
    const statusText = overallScore >= 8.5 ? 'Excellent' : overallScore >= 7.0 ? 'Good' : 'Needs Attention';
    return [
      index + 1,
      `"${site.name}"`,
      site.county,
      site.scheduleAdherence,
      site.qualityScore,
      site.contractorPerformance,
      site.communitySatisfaction,
      site.environmentalCompliance,
      site.resourceUtilization,
      overallScore.toFixed(1),
      statusText
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile('kenya-construction-performance.csv', 'text/csv', csv);
  showToast('✓ Performance CSV exported successfully');
}

function initPerformanceCharts() {
  if (document.getElementById('chart-performance').chart) return;

  // Performance Rankings Chart
  const sitesWithPerformance = SITES.map(site => ({
    ...site,
    overall: calculateOverallPerformance(site)
  })).sort((a, b) => b.overall - a.overall).slice(0, 10);

  new Chart(document.getElementById('chart-performance'), {
    type: 'bar',
    data: {
      labels: sitesWithPerformance.map(s => s.shortName || s.name.split(' ')[0]),
      datasets: [{
        label: 'Overall Performance',
        data: sitesWithPerformance.map(s => s.overall),
        backgroundColor: sitesWithPerformance.map(s => s.overall >= 8.5 ? 'rgba(47, 158, 87, 0.8)' : s.overall >= 7.0 ? 'rgba(217, 138, 0, 0.8)' : 'rgba(214, 69, 95, 0.8)'),
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          max: 10,
          grid: { color: 'rgba(30,45,69,.8)', drawBorder: false },
          ticks: { color: 'rgba(107,127,160,.8)', font: { size: 11 } }
        },
        x: {
          grid: { display: false },
          ticks: { color: 'rgba(107,127,160,.8)', font: { size: 10 }, maxRotation: 45 }
        }
      }
    }
  });

  // Contractor Performance Distribution
  const contractorRanges = { excellent: 0, good: 0, needs_improvement: 0 };
  SITES.forEach(site => {
    if (site.contractorPerformance >= 8.5) contractorRanges.excellent++;
    else if (site.contractorPerformance >= 7.0) contractorRanges.good++;
    else contractorRanges.needs_improvement++;
  });

  new Chart(document.getElementById('chart-contractor'), {
    type: 'doughnut',
    data: {
      labels: ['Excellent (8.5+)', 'Good (7.0-8.4)', 'Needs Improvement (<7.0)'],
      datasets: [{
        data: [contractorRanges.excellent, contractorRanges.good, contractorRanges.needs_improvement],
        backgroundColor: ['rgba(47, 158, 87, 0.8)', 'rgba(217, 138, 0, 0.8)', 'rgba(214, 69, 95, 0.8)'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } }
      }
    }
  });

  // Schedule Adherence by Site
  const scheduleSites = SITES.map(site => ({
    ...site,
    overall: calculateOverallPerformance(site)
  })).sort((a, b) => b.scheduleAdherence - a.scheduleAdherence).slice(0, 8);

  new Chart(document.getElementById('chart-schedule'), {
    type: 'bar',
    data: {
      labels: scheduleSites.map(s => s.shortName || s.name.split(' ')[0]),
      datasets: [{
        label: 'Schedule Adherence (%)',
        data: scheduleSites.map(s => s.scheduleAdherence),
        backgroundColor: scheduleSites.map(s => s.scheduleAdherence >= 90 ? 'rgba(47, 158, 87, 0.8)' : s.scheduleAdherence >= 75 ? 'rgba(217, 138, 0, 0.8)' : 'rgba(214, 69, 95, 0.8)'),
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          grid: { color: 'rgba(30,45,69,.8)', drawBorder: false },
          ticks: { color: 'rgba(107,127,160,.8)', font: { size: 11 } }
        },
        y: {
          grid: { display: false },
          ticks: { color: 'rgba(107,127,160,.8)', font: { size: 10 } }
        }
      }
    }
  });

  // Community Satisfaction Trends
  const satisfactionSites = SITES.map(site => ({
    ...site,
    overall: calculateOverallPerformance(site)
  })).sort((a, b) => b.communitySatisfaction - a.communitySatisfaction).slice(0, 8);

  new Chart(document.getElementById('chart-satisfaction'), {
    type: 'horizontalBar',
    data: {
      labels: satisfactionSites.map(s => s.shortName || s.name.split(' ')[0]),
      datasets: [{
        label: 'Community Satisfaction',
        data: satisfactionSites.map(s => s.communitySatisfaction),
        backgroundColor: satisfactionSites.map(s => s.communitySatisfaction >= 8.5 ? 'rgba(47, 158, 87, 0.8)' : s.communitySatisfaction >= 7.0 ? 'rgba(217, 138, 0, 0.8)' : 'rgba(214, 69, 95, 0.8)'),
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          beginAtZero: true,
          max: 10,
          grid: { color: 'rgba(30,45,69,.8)', drawBorder: false },
          ticks: { color: 'rgba(107,127,160,.8)', font: { size: 11 } }
        },
        y: {
          grid: { display: false },
          ticks: { color: 'rgba(107,127,160,.8)', font: { size: 10 } }
        }
      }
    }
  });
}

function renderInvitedUsers() {
  const cont = document.getElementById('invited-users');
  if (!cont) return;
  cont.innerHTML = invitedUsers.map(email => `<div class="invite-pill"><span>${email}</span><button class="btn btn-sm btn-danger" onclick="removeInvite('${email.replace(/'/g, "\\'")}')">Remove</button></div>`).join('') || '<div style="font-size:12px;color:var(--muted)">No invited users yet.</div>';
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}
