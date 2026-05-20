/**
 * app.js — Main application controller
 *
 * Responsibilities:
 *   - Read current parameters from UI controls
 *   - Orchestrate calls to model.js and charts.js
 *   - Render all DOM elements (metric cards, bar chart, table, verdict)
 *   - Handle all user events (sliders, selects, buttons)
 *   - Manage selected zone state for the radar chart
 */

// =====================================================================
// STATE
// =====================================================================
let selectedZoneId = 'center_fuse';   // Default zone for radar chart

// =====================================================================
// PARAMETER READING
// =====================================================================

/**
 * getParams()
 * Reads all control values from the DOM and returns a params object.
 */
function getParams() {
  return {
    alt:  parseInt(document.getElementById('altitude').value, 10),
    psi:  parseInt(document.getElementById('pressure').value, 10),
    turb: parseInt(document.getElementById('turb').value, 10),
    ac:   document.getElementById('acType').value
  };
}

// =====================================================================
// METRIC CARDS
// =====================================================================

/**
 * renderMetrics(results)
 * Renders the 4 summary metric cards.
 *
 * @param {Array} results - sorted array from scoreAllZones()
 */
function renderMetrics(results) {
  const scores = results.map(r => r.score);
  const best   = results[0];
  const worst  = results[results.length - 1];
  const avg    = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const safeCount = scores.filter(s => s >= 70).length;

  const metrics = [
    {
      label: 'Average safety score',
      value: avg + '/100',
      color: getScoreColor(avg)
    },
    {
      label: 'Zones rated safe (≥70)',
      value: `${safeCount} / ${ZONES.length}`,
      color: safeCount >= 4 ? '#22c55e' : safeCount >= 2 ? '#f59e0b' : '#ef4444'
    },
    {
      label: 'Safest junction',
      value: best.zone.shortName,
      color: '#22c55e',
      sub: `Score: ${best.score}`
    },
    {
      label: 'Most dangerous junction',
      value: worst.zone.shortName,
      color: '#ef4444',
      sub: `Score: ${worst.score}`
    }
  ];

  const grid = document.getElementById('metricGrid');
  grid.innerHTML = metrics.map(m => `
    <div class="metric-card">
      <div class="m-label">${m.label}</div>
      <div class="m-value" style="color:${m.color};font-size:${m.sub ? '18px' : '26px'}">${m.value}</div>
      ${m.sub ? `<div style="font-size:11px;color:var(--text-muted);font-family:var(--mono);margin-top:4px">${m.sub}</div>` : ''}
    </div>
  `).join('');
}

// =====================================================================
// VERDICT BANNER
// =====================================================================

/**
 * renderVerdict(results, params)
 * Renders the verdict / recommendation banner.
 */
function renderVerdict(results, params) {
  const top3   = results.slice(0, 3);
  const bottom2 = results.slice(-2).reverse();
  const worst  = results[results.length - 1];

  const acLabels = {
    narrowbody: 'narrowbody commercial jet',
    widebody:   'widebody commercial jet',
    fighter:    'fighter jet',
    turboprop:  'regional turboprop'
  };
  const turbLabels = ['no', 'light', 'moderate', 'severe'];

  const topScore = top3[0].score;
  let verdictClass = 'safe';
  if (topScore < 70) verdictClass = 'warn';
  if (topScore < 50) verdictClass = 'danger';

  // Build a reason string for the worst zone
  const worstResult = results[results.length - 1];
  let worstReason = '';
  if (worstResult.zone.exposed) worstReason += 'exposed to direct aerodynamic flexing';
  if (worstResult.vibRisk > 0.7) worstReason += (worstReason ? ', ' : '') + 'extreme vibration risk';
  if (worstResult.pressRisk > 0.7) worstReason += (worstReason ? ', ' : '') + 'high structural pressure load';
  if (worstResult.accessScore < 0.3) worstReason += (worstReason ? ', ' : '') + 'very poor maintenance access';
  if (!worstReason) worstReason = 'combined high risk across multiple dimensions';

  const verdict = document.getElementById('verdict');
  verdict.className = `verdict-card ${verdictClass}`;
  verdict.innerHTML = `
    <strong>Analysis verdict</strong> —
    For a ${acLabels[params.ac]} at ${params.alt.toLocaleString()} ft /
    ${params.psi.toLocaleString()} PSI with ${turbLabels[params.turb]} turbulence:<br><br>
    ✔ <strong>Recommended junctions:</strong>
    ${top3.map(r => `<strong>${r.zone.name}</strong> (${r.score}/100)`).join(', ')}.<br>
    ✘ <strong>Avoid:</strong>
    ${bottom2.map(r => `<strong>${r.zone.name}</strong> (${r.score}/100)`).join(', ')} —
    ${worstReason}.
  `;
}

// =====================================================================
// BAR CHART (DOM-based, not canvas)
// =====================================================================

/**
 * renderBars(results)
 * Renders horizontal bar chart using pure HTML/CSS (no canvas needed).
 * This is intentional — bar charts with dynamic transitions are easier
 * to animate smoothly in CSS than in Chart.js for this use case.
 */
function renderBars(results) {
  const container = document.getElementById('barChart');

  container.innerHTML = results.map(r => {
    const color  = getBarColor(r.score);
    const rating = getRating(r.score);
    const badgeClass = rating === 'Safe' ? 'badge-safe' : rating === 'Marginal' ? 'badge-marginal' : 'badge-unsafe';

    return `
      <div class="bar-row">
        <div class="bar-zone-name" title="${r.zone.desc}">${r.zone.name}</div>
        <div class="bar-outer">
          <div class="bar-inner" style="width:${r.score}%;background:${color}">
            ${r.score >= 15 ? r.score : ''}
          </div>
        </div>
        <span class="bar-badge ${badgeClass}">${rating}</span>
      </div>
    `;
  }).join('');
}

// =====================================================================
// DATA TABLE
// =====================================================================

/**
 * renderTable(results)
 * Populates the full data table with per-zone scores.
 */
function renderTable(results) {
  const tbody = document.getElementById('tableBody');
  const rating = getRating;

  tbody.innerHTML = results.map(r => {
    const ratingStr = rating(r.score);
    const ratingClass = ratingStr === 'Safe' ? 'color-safe' : ratingStr === 'Marginal' ? 'color-warn' : 'color-danger';
    return `
      <tr>
        <td class="zone-name">${r.zone.name}</td>
        <td>${r.vibSafety}</td>
        <td>${r.pressSafety}</td>
        <td>${r.thermSafety}</td>
        <td>${r.accessDisplay}</td>
        <td>${r.zone.exposed ? '<span class="color-danger">Yes</span>' : '<span class="color-safe">No</span>'}</td>
        <td class="score-cell" style="color:${getScoreColor(r.score)}">${r.score}</td>
        <td class="${ratingClass}">${ratingStr}</td>
      </tr>
    `;
  }).join('');
}

// =====================================================================
// ZONE SELECTOR BUTTONS (for radar chart)
// =====================================================================

/**
 * renderZoneButtons()
 * Renders the zone selector buttons above the radar chart.
 */
function renderZoneButtons() {
  const container = document.getElementById('zoneBtns');
  container.innerHTML = ZONES.map(z => `
    <button
      class="zone-btn ${z.id === selectedZoneId ? 'active' : ''}"
      onclick="selectZone('${z.id}')"
    >${z.shortName}</button>
  `).join('');
}

/**
 * selectZone(id)
 * Called when a zone button is clicked — updates radar chart.
 */
function selectZone(id) {
  selectedZoneId = id;
  renderZoneButtons();
  const zone = ZONES.find(z => z.id === id);
  updateRadarChart(zone, getParams());
}

// =====================================================================
// SCENARIO PRESETS
// =====================================================================

/**
 * applyScenario(name)
 * Applies a preset scenario to all controls and re-renders.
 */
function applyScenario(name) {
  const sc = SCENARIOS[name];
  if (!sc) return;

  document.getElementById('altitude').value = sc.alt;
  document.getElementById('pressure').value = sc.psi;
  document.getElementById('turb').value     = sc.turb;
  document.getElementById('acType').value   = sc.ac;

  document.getElementById('altOut').textContent   = sc.alt.toLocaleString() + ' ft';
  document.getElementById('pressOut').textContent = sc.psi.toLocaleString() + ' PSI';

  renderAll();
}

// =====================================================================
// MASTER RENDER
// =====================================================================

/**
 * renderAll()
 * Main render function — called on every parameter change.
 * Computes scores and updates all UI sections.
 */
function renderAll() {
  const params  = getParams();
  const results = scoreAllZones(params);   // sorted best → worst (from model.js)

  renderMetrics(results);
  renderVerdict(results, params);
  renderBars(results);
  renderTable(results);
  renderZoneButtons();

  const selectedZone = ZONES.find(z => z.id === selectedZoneId);
  updateRadarChart(selectedZone, params);
  updateLineChart(params);
}

// =====================================================================
// EVENT LISTENERS
// =====================================================================

// Altitude slider
document.getElementById('altitude').addEventListener('input', e => {
  document.getElementById('altOut').textContent = Number(e.target.value).toLocaleString() + ' ft';
  renderAll();
});

// Pressure slider
document.getElementById('pressure').addEventListener('input', e => {
  document.getElementById('pressOut').textContent = Number(e.target.value).toLocaleString() + ' PSI';
  renderAll();
});

// Turbulence select
document.getElementById('turb').addEventListener('change', renderAll);

// Aircraft type select
document.getElementById('acType').addEventListener('change', renderAll);

// Scenario buttons (using event delegation)
document.querySelectorAll('.scenario-btn').forEach(btn => {
  btn.addEventListener('click', () => applyScenario(btn.dataset.scenario));
});

// =====================================================================
// INITIALISE
// =====================================================================

// Run initial render when page loads
document.addEventListener('DOMContentLoaded', () => {
  // Init charts first (they need canvas elements to exist)
  const initialParams = getParams();
  const initialZone   = ZONES.find(z => z.id === selectedZoneId);

  initRadarChart(initialZone, initialParams);
  initLineChart(initialParams);
  renderLineLegend();

  // Now render all DOM sections
  renderAll();
});
