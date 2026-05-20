/**
 * model.js — Core safety scoring engine
 *
 * This is the "data science" layer of the project. It takes raw zone
 * properties and current flight parameters, then computes a composite
 * safety score using a weighted multi-factor model.
 *
 * =====================================================================
 * THE SAFETY MODEL — How it works
 * =====================================================================
 *
 * Each hydraulic junction zone is scored across 4 risk dimensions:
 *
 *   1. VIBRATION RISK
 *      Formula: zone.baseVib × (1 + turbulenceFactor × 0.6) × aircraft.vibMod
 *      Rationale: Vibration is the #1 cause of fatigue failure in hydraulic
 *      fittings. It scales with both the zone's inherent flex and current
 *      turbulence. CAT-3 turbulence nearly doubles the risk at exposed zones.
 *
 *   2. PRESSURE LOAD RISK
 *      Formula: zone.basePressLoad × (0.4 + psiFactor × 0.6) × aircraft.pressMod
 *      Rationale: Higher system pressure amplifies every existing stress
 *      concentration. A cracked fitting at 1,500 PSI is a slow leak;
 *      at 5,000 PSI it's a catastrophic blowout.
 *
 *   3. THERMAL STRESS RISK
 *      Formula: zone.baseThermal × (0.5 + altitudeFactor × 0.5) × aircraft.thermMod
 *      Rationale: At altitude, temperature extremes are larger (stratosphere
 *      to de-icing cycles). Thermal cycling fatigues seals and O-rings over time.
 *
 *   4. MAINTENANCE ACCESS
 *      Formula: (1 − zone.baseAccess)  [inaccessibility as risk]
 *      Rationale: A hidden junction that can't be inspected is a ticking clock.
 *      When a junction is found to be leaking, inaccessible ones cause delays
 *      that ground the aircraft — or worse, go undetected.
 *
 *   5. STRUCTURAL EXPOSURE PENALTY (binary)
 *      Formula: +0.15 if the zone is directly exposed to aerodynamic loads
 *      Rationale: Any zone on a flexing control surface or extremity
 *      experiences cyclic bending loads. Hydraulic lines must NOT flex
 *      repeatedly — they will crack.
 *
 * COMPOSITE FORMULA:
 *   rawRisk = (vibRisk × 0.30) + (pressRisk × 0.30) + (thermRisk × 0.20)
 *           + (1 − access) × 0.20 + exposedPenalty
 *
 *   safetyScore = clamp(round((1 − rawRisk) × 100), 0, 100)
 *
 * WEIGHTS chosen to reflect real aerospace maintenance priorities:
 *   - Vibration + pressure = 60% (primary failure modes for hydraulic fittings)
 *   - Thermal = 20% (important but slower-acting)
 *   - Access = 20% (safety factor multiplier, not direct failure mode)
 * =====================================================================
 */

/**
 * computeScore(zone, params)
 * Returns a detailed score object for a single zone under given parameters.
 *
 * @param {Object} zone    - A zone object from ZONES array
 * @param {Object} params  - { alt: number, psi: number, turb: number, ac: string }
 * @returns {Object}       - { score, vibRisk, pressRisk, thermRisk, accessScore, exposedPenalty }
 */
function computeScore(zone, params) {
  const mod = AIRCRAFT_MODS[params.ac];

  // Normalise flight parameters to 0–1 factors
  const altFactor  = params.alt / 45000;         // 0 at 0ft → 1 at 45,000ft
  const psiFactor  = params.psi / 5000;          // 0 at 0 PSI → 1 at 5,000 PSI
  const turbFactor = params.turb / 3;            // 0 = calm, 1 = severe turbulence

  // --- Dimension 1: Vibration risk ---
  // Turbulence amplifies base vibration. Exposed zones flex more.
  const vibRisk = zone.baseVib * (1 + turbFactor * 0.6) * mod.vibMod;

  // --- Dimension 2: Pressure load risk ---
  // Low-pressure systems have a baseline load (0.4 offset); high pressure amplifies it.
  const pressRisk = zone.basePressLoad * (0.4 + psiFactor * 0.6) * mod.pressMod;

  // --- Dimension 3: Thermal stress risk ---
  // Temperature delta increases with altitude. Engine zones have high base thermal.
  const thermRisk = zone.baseThermal * (0.5 + altFactor * 0.5) * mod.thermMod;

  // --- Dimension 4: Maintenance access (as inaccessibility risk) ---
  const accessInaccessibility = 1 - zone.baseAccess;

  // --- Penalty: Exposed structural zone ---
  const exposedPenalty = zone.exposed ? 0.15 : 0.0;

  // --- Clamp all risks to [0, 1] range (prevent overflow) ---
  const vibClamped   = Math.min(1, Math.max(0, vibRisk));
  const pressClamped = Math.min(1, Math.max(0, pressRisk));
  const thermClamped = Math.min(1, Math.max(0, thermRisk));

  // --- Weighted composite risk ---
  const rawRisk = (
    vibClamped  * 0.30 +
    pressClamped * 0.30 +
    thermClamped * 0.20 +
    accessInaccessibility * 0.20 +
    exposedPenalty
  );

  // --- Convert to safety score (higher = safer) ---
  const score = Math.max(0, Math.min(100, Math.round((1 - rawRisk) * 100)));

  return {
    score,
    vibRisk:   Math.min(1, vibClamped),
    pressRisk: Math.min(1, pressClamped),
    thermRisk: Math.min(1, thermClamped),
    accessScore: zone.baseAccess,
    exposedPenalty,
    // Safety dimension scores (inverse of risk, 0–100 for radar chart)
    vibSafety:    Math.round((1 - vibClamped) * 100),
    pressSafety:  Math.round((1 - pressClamped) * 100),
    thermSafety:  Math.round((1 - thermClamped) * 100),
    accessDisplay: Math.round(zone.baseAccess * 100),
    structureSafety: zone.exposed ? 0 : 100
  };
}

/**
 * scoreAllZones(params)
 * Computes scores for all zones, sorted by score descending.
 *
 * @param {Object} params
 * @returns {Array} array of { zone, ...scoreData } sorted best→worst
 */
function scoreAllZones(params) {
  return ZONES
    .map(zone => ({ zone, ...computeScore(zone, params) }))
    .sort((a, b) => b.score - a.score);
}

/**
 * getRating(score)
 * Returns a human-readable rating string for a given score.
 */
function getRating(score) {
  if (score >= 70) return 'Safe';
  if (score >= 50) return 'Marginal';
  return 'Unsafe';
}

/**
 * getScoreColor(score)
 * Returns a CSS hex color appropriate for the score value.
 */
function getScoreColor(score) {
  if (score >= 70) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

/**
 * getBarColor(score)
 * Returns a hex color for bar fill.
 */
function getBarColor(score) {
  if (score >= 70) return '#2563eb';
  if (score >= 50) return '#d97706';
  return '#dc2626';
}

/**
 * scoreAtAltitudes(zone, params)
 * Returns safety scores for a zone across a range of altitudes.
 * Used for the altitude trend line chart.
 *
 * @param {Object} zone
 * @param {Object} params   - base params (alt will be overridden)
 * @param {Array}  altitudes - array of altitude numbers to evaluate
 * @returns {Array} array of scores
 */
function scoreAtAltitudes(zone, params, altitudes) {
  return altitudes.map(alt => computeScore(zone, { ...params, alt }).score);
}
