/**
 * charts.js — Chart rendering and update logic
 *
 * Manages three charts:
 *   1. Radar chart  — 5-dimension risk breakdown for a selected zone
 *   2. Line chart   — safety score vs altitude for all zones
 *
 * All chart instances are stored in module-level variables so they can
 * be updated in-place (rather than destroyed and re-created on every
 * parameter change, which causes flickering).
 */

let radarChartInstance = null;
let lineChartInstance  = null;

// The 8 altitudes used for the line chart x-axis (in feet)
const CHART_ALTITUDES = [10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000];

// =====================================================================
// RADAR CHART — Risk factor breakdown
// =====================================================================

/**
 * initRadarChart(zone, params)
 * Creates the radar chart for the first time.
 */
function initRadarChart(zone, params) {
  const ctx = document.getElementById('radarChart').getContext('2d');
  const data = buildRadarData(zone, params);

  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 25,
            font: { size: 10, family: 'Space Mono' },
            color: '#8a90a0',
            backdropColor: 'transparent'
          },
          pointLabels: {
            font: { size: 11, family: 'Space Mono' },
            color: '#8a90a0'
          },
          grid:       { color: 'rgba(255,255,255,0.06)' },
          angleLines: { color: 'rgba(255,255,255,0.06)' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.raw}/100`
          }
        }
      }
    }
  });
}

/**
 * buildRadarData(zone, params)
 * Computes radar chart data for a zone.
 */
function buildRadarData(zone, params) {
  const result = computeScore(zone, params);
  return {
    labels: ['Vibration\nsafety', 'Pressure\nsafety', 'Thermal\nsafety', 'Maintenance\naccess', 'Structural\nexposure'],
    datasets: [{
      label: zone.name,
      data: [
        result.vibSafety,
        result.pressSafety,
        result.thermSafety,
        result.accessDisplay,
        result.structureSafety
      ],
      backgroundColor: 'rgba(58, 142, 255, 0.12)',
      borderColor: '#3a8eff',
      pointBackgroundColor: '#3a8eff',
      pointBorderColor: '#0b0e14',
      pointBorderWidth: 2,
      pointRadius: 4,
      borderWidth: 2
    }]
  };
}

/**
 * updateRadarChart(zone, params)
 * Updates an existing radar chart with new zone/params data.
 */
function updateRadarChart(zone, params) {
  if (!radarChartInstance) { initRadarChart(zone, params); return; }
  const data = buildRadarData(zone, params);
  radarChartInstance.data = data;
  radarChartInstance.update('active');
}


// =====================================================================
// LINE CHART — Safety score vs altitude
// =====================================================================

/**
 * initLineChart(params)
 * Creates the altitude trend line chart.
 */
function initLineChart(params) {
  const ctx = document.getElementById('lineChart').getContext('2d');
  const data = buildLineData(params);

  lineChartInstance = new Chart(ctx, {
    type: 'line',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: {
            font: { size: 10, family: 'Space Mono' },
            color: '#8a90a0',
            stepSize: 25
          },
          grid: { color: 'rgba(255,255,255,0.05)' },
          title: {
            display: true,
            text: 'Safety score',
            font: { size: 10, family: 'Space Mono' },
            color: '#8a90a0'
          }
        },
        x: {
          ticks: {
            font: { size: 10, family: 'Space Mono' },
            color: '#8a90a0',
            maxRotation: 45,
            autoSkip: false
          },
          grid: { color: 'rgba(255,255,255,0.05)' },
          title: {
            display: true,
            text: 'Altitude (ft)',
            font: { size: 10, family: 'Space Mono' },
            color: '#8a90a0'
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(17, 21, 32, 0.95)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          titleFont: { family: 'Space Mono', size: 11 },
          bodyFont:  { family: 'Space Mono', size: 11 },
          titleColor: '#e8eaf0',
          bodyColor: '#8a90a0',
          callbacks: {
            title: items => `Altitude: ${Number(items[0].label).toLocaleString()} ft`,
            label: ctx => ` ${ctx.dataset.label}: ${ctx.raw}/100`
          }
        }
      }
    }
  });

  renderLineLegend();
}

/**
 * buildLineData(params)
 * Builds dataset for line chart — one line per zone.
 */
function buildLineData(params) {
  return {
    labels: CHART_ALTITUDES.map(a => a.toLocaleString()),
    datasets: ZONES.map((zone, i) => ({
      label: zone.shortName,
      data: scoreAtAltitudes(zone, params, CHART_ALTITUDES),
      borderColor: ZONE_COLORS[i],
      backgroundColor: ZONE_COLORS[i] + '22',
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5,
      tension: 0.35,
      fill: false
    }))
  };
}

/**
 * updateLineChart(params)
 * Updates line chart with new params.
 */
function updateLineChart(params) {
  if (!lineChartInstance) { initLineChart(params); return; }
  const data = buildLineData(params);
  lineChartInstance.data = data;
  lineChartInstance.update('active');
}

/**
 * renderLineLegend()
 * Renders the custom HTML legend for the line chart.
 */
function renderLineLegend() {
  const container = document.getElementById('lineLegend');
  if (!container) return;
  container.innerHTML = ZONES.map((z, i) => `
    <span class="leg-item">
      <span class="leg-dot" style="background:${ZONE_COLORS[i]}"></span>
      ${z.shortName}
    </span>
  `).join('');
}
