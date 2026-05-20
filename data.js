/**
 * data.js — Zone definitions and scenario presets
 *
 * Each ZONE represents a physical location on the aircraft fuselage where
 * hydraulic lines could potentially meet (junction point). The properties
 * represent the BASELINE risk/safety characteristics of that zone in
 * neutral conditions (sea level, low pressure, calm air).
 *
 * Values are normalised 0–1 where 1 = worst (most risky)
 */

const ZONES = [
  {
    id: 'nose',
    name: 'Nose section',
    shortName: 'Nose',
    desc: 'Forward avionics/equipment bay. Protected, pressurized, with good access panels.',
    // Risk baselines (0 = safe, 1 = dangerous)
    baseVib:       0.35,   // Low vibration — rigid fuselage structure forward
    basePressLoad: 0.45,   // Moderate pressure load — some flex during manoeuvres
    baseThermal:   0.30,   // Low thermal stress — far from engines
    baseAccess:    0.80,   // 0–1 where 1 = very accessible
    exposed: false         // Not exposed to direct aerodynamic loads
  },
  {
    id: 'fin_tip',
    name: 'Vertical fin tip',
    shortName: 'Fin tip',
    desc: 'Extreme tip of vertical stabilizer. High flex, poor access, exposed to maximum lateral wind loads. The canonical "bad idea" zone.',
    baseVib:       0.95,   // Extreme: fin tip flexes significantly, especially in yaw
    basePressLoad: 0.85,   // Highest structural load outside direct engine zones
    baseThermal:   0.40,   // Moderate thermal — elevated altitude exposure
    baseAccess:    0.15,   // Very hard to reach: needs scaffolding, narrow space
    exposed: true          // Direct aerodynamic surface — flexes under load
  },
  {
    id: 'fin_base',
    name: 'Fin root / aft fuselage',
    shortName: 'Fin root',
    desc: 'Base of vertical stabilizer where it meets the fuselage. Structurally robust, reasonable access.',
    baseVib:       0.50,
    basePressLoad: 0.55,
    baseThermal:   0.35,
    baseAccess:    0.65,
    exposed: false
  },
  {
    id: 'wing_root',
    name: 'Wing root',
    shortName: 'Wing root',
    desc: 'Wing-body fairing junction. High bending loads but excellent internal access via wing root panels.',
    baseVib:       0.65,
    basePressLoad: 0.70,   // High: wing bending moment peaks here
    baseThermal:   0.55,   // Moderate: fuel proximity can cause thermal cycling
    baseAccess:    0.75,
    exposed: false
  },
  {
    id: 'wing_tip',
    name: 'Wing tip / aileron bay',
    shortName: 'Wing tip',
    desc: 'Outboard control surface region. Extreme flexural loads, poor access, exposed to aeroelastic effects.',
    baseVib:       0.88,   // Very high: wing tip deflects ±2–3 m on large jets
    basePressLoad: 0.75,
    baseThermal:   0.30,
    baseAccess:    0.20,   // Terrible access — very small panels, no room to work
    exposed: true
  },
  {
    id: 'center_fuse',
    name: 'Central fuselage bay',
    shortName: 'Center bay',
    desc: 'Pressurized mid-body keel area beneath cabin floor. Rigid, protected, wide access panels. Industry standard preferred location.',
    baseVib:       0.25,   // Very low: central keel is the most rigid part of fuselage
    basePressLoad: 0.35,
    baseThermal:   0.40,
    baseAccess:    0.92,   // Excellent: large belly access panels
    exposed: false
  },
  {
    id: 'belly_fwd',
    name: 'Forward belly fairing',
    shortName: 'Belly fwd',
    desc: 'Nose gear well and forward undercarriage bay. Good access, moderate vibration from gear cycling.',
    baseVib:       0.50,
    basePressLoad: 0.50,
    baseThermal:   0.60,   // Gear door cycling creates thermal shock
    baseAccess:    0.72,
    exposed: false
  },
  {
    id: 'aft_pylon',
    name: 'Aft engine pylon',
    shortName: 'Aft pylon',
    desc: 'Rear-mount engine attach structure (e.g. 727, MD-80 style). Extreme thermal exposure from engine exhaust proximity.',
    baseVib:       0.78,
    basePressLoad: 0.68,
    baseThermal:   0.88,   // Critical: engine exhaust bakes the structure continuously
    baseAccess:    0.45,
    exposed: true
  }
];

/**
 * Aircraft type modifiers
 * Each aircraft type scales the raw risk factors differently.
 * A fighter jet operates at higher G-loads and pressures; a turboprop
 * has lower system pressures but more vibration per unit mass.
 */
const AIRCRAFT_MODS = {
  narrowbody: {
    label: 'Narrowbody (737-class)',
    pressMod: 1.00,
    vibMod:   1.00,
    thermMod: 1.00
  },
  widebody: {
    label: 'Widebody (777-class)',
    pressMod: 1.15,   // Higher system pressure (5,000 PSI systems)
    vibMod:   0.85,   // Heavier/stiffer structure damps vibration better
    thermMod: 1.10    // More thermal mass but also more engine heat
  },
  fighter: {
    label: 'Fighter jet (F-class)',
    pressMod: 1.65,   // 8,000+ PSI hydraulic systems
    vibMod:   1.55,   // Extreme G-loads, buffet, aeroelastic flutter
    thermMod: 1.45    // Afterburner proximity, supersonic kinetic heating
  },
  turboprop: {
    label: 'Regional turboprop',
    pressMod: 0.70,   // Lower pressure systems (~2,000 PSI typical)
    vibMod:   0.90,   // Propeller vibration dampened by engine mounts
    thermMod: 0.80
  }
};

/**
 * Scenario presets — configure all controls at once for common mission profiles
 */
const SCENARIOS = {
  nominal: {
    label: 'Nominal cruise',
    alt: 35000,
    psi: 3000,
    turb: 1,
    ac: 'narrowbody'
  },
  storm: {
    label: 'Storm penetration',
    alt: 28000,
    psi: 3200,
    turb: 3,
    ac: 'widebody'
  },
  military: {
    label: 'Military intercept',
    alt: 40000,
    psi: 5000,
    turb: 2,
    ac: 'fighter'
  },
  lowalt: {
    label: 'Low-altitude ops',
    alt: 10000,
    psi: 1800,
    turb: 1,
    ac: 'turboprop'
  }
};

/**
 * Chart colors for each zone (used consistently across all charts)
 */
const ZONE_COLORS = [
  '#3a8eff',   // nose         — blue
  '#ef4444',   // fin_tip      — red (intentionally alarming)
  '#f59e0b',   // fin_base     — amber
  '#8b5cf6',   // wing_root    — purple
  '#ec4899',   // wing_tip     — pink
  '#22c55e',   // center_fuse  — green (intentionally positive)
  '#06b6d4',   // belly_fwd    — cyan
  '#f97316',   // aft_pylon    — orange
];
