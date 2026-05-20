# AeroHydro — Aircraft Hydraulic Safety Simulator
### A data science project in aerospace engineering

---

## What this project does

This simulator models the safety of different **hydraulic line junction locations** on an aircraft fuselage. A hydraulic junction is where two or more hydraulic lines meet — fittings, manifolds, actuator connections. These are the most failure-prone points in any hydraulic system because they concentrate stress.

The goal: given a set of flight conditions, **which fuselage locations are safe places to route hydraulic junctions, and which should be avoided?**

The Instagram project that inspired this was right — the vertical fin tip is a terrible choice. This simulator quantifies exactly *why*, and by how much.

---

## Project structure

```
hydraulic-sim/
├── index.html          ← Main page (structure and layout)
├── css/
│   └── style.css       ← All styling (dark industrial theme)
└── js/
    ├── data.js         ← Zone definitions, aircraft types, scenario presets
    ├── model.js        ← Core safety scoring engine (the "data science" layer)
    ├── charts.js       ← Chart.js radar and line chart rendering
    └── app.js          ← UI controller, event handling, DOM rendering
```

---

## How to run it

No build tools, no npm, no dependencies to install. Just open `index.html` in a browser.

```bash
# Option 1: Just double-click index.html in your file manager

# Option 2: Use a local server (avoids CORS issues on some browsers)
cd hydraulic-sim
python3 -m http.server 8080
# then open http://localhost:8080
```

---

## The data science model (explained)

### What we're scoring

Every zone gets a **Safety Score from 0–100**, where 100 = perfectly safe location for a hydraulic junction.

The score is computed from **5 dimensions**:

---

### Dimension 1: Vibration Risk (30% weight)

```
vibRisk = zone.baseVib × (1 + turbulenceFactor × 0.6) × aircraft.vibMod
```

Vibration fatigue is the **#1 cause of hydraulic fitting failure** in aircraft. Metal fittings subjected to repeated micro-flexing develop hairline cracks, which eventually fail under pressure — often suddenly.

- `zone.baseVib`: How much this zone naturally vibrates (0–1). The vertical fin tip scores 0.95 because it's a cantilevered surface that flexes in every yaw motion.
- `turbulenceFactor`: CAT 3 turbulence adds 60% extra vibration at exposed zones.
- `aircraft.vibMod`: Fighter jets (1.55×) experience far more vibration than turboprops (0.90×).

---

### Dimension 2: Pressure Load Risk (30% weight)

```
pressRisk = zone.basePressLoad × (0.4 + psiFactor × 0.6) × aircraft.pressMod
```

Modern aircraft hydraulic systems operate at **3,000–5,000 PSI** (some military at 8,000+ PSI). At high pressure, any existing stress concentration becomes catastrophic:
- A fitting with a small crack at 1,500 PSI = slow drip
- Same fitting at 5,000 PSI = explosive decompression

`zone.basePressLoad` captures the structural load that already exists in that zone (wing roots have high bending loads; the center fuselage keel is in compression — more stable).

---

### Dimension 3: Thermal Stress Risk (20% weight)

```
thermRisk = zone.baseThermal × (0.5 + altitudeFactor × 0.5) × aircraft.thermMod
```

At 35,000 ft, outside air temperature is around −54°C. On the ground in summer it might be +40°C. This **±94°C thermal swing** causes seals and O-rings to expand and contract constantly, degrading them over time.

- Engine pylon zones (`baseThermal = 0.88`) are additionally exposed to exhaust heat in flight
- Higher altitude = larger temperature differential = worse seal degradation

---

### Dimension 4: Maintenance Access (20% weight)

```
accessRisk = 1 − zone.baseAccess
```

This is the most underrated safety factor. A leaking junction that **can't be easily inspected** is far more dangerous than a leaking one that's immediately visible during walkaround.

- `zone.baseAccess = 0.92` for the central fuselage bay — mechanics can reach it easily through belly panels
- `zone.baseAccess = 0.15` for the fin tip — requires scaffolding, working in a confined space at height, often a multi-hour job

A hidden hydraulic leak can cause **loss of flight control surface authority** — exactly the failure mode that contributed to several historic accidents.

---

### Dimension 5: Structural Exposure Penalty (flat −15 points)

```
exposedPenalty = zone.exposed ? 0.15 : 0.0
```

Zones directly on aerodynamic surfaces (fin tip, wing tip, aft pylon) experience **cyclic bending loads** with every gust, manoeuvre, and landing. Hydraulic lines **must not flex** — they're rigid metal tubes. Putting a junction in a flexing zone guarantees eventual fatigue failure.

---

### The composite formula

```
rawRisk = (vibRisk × 0.30)
        + (pressRisk × 0.30)
        + (thermRisk × 0.20)
        + (1 − accessScore) × 0.20
        + exposedPenalty

safetyScore = clamp(round((1 − rawRisk) × 100), 0, 100)
```

**Weight rationale:**
- Vibration + Pressure = 60% because these are the direct failure mechanisms for hydraulic hardware
- Thermal = 20% because seal degradation is a slower-acting risk (detected during scheduled maintenance)
- Access = 20% because it's a multiplier on how bad any failure becomes, not a direct cause

---

## Key findings

Under nominal conditions (narrowbody, 35,000 ft, 3,000 PSI, light turbulence):

| Zone | Score | Why |
|------|-------|-----|
| Central fuselage bay | ~82 | Low vibration, good access, protected |
| Nose section | ~75 | Rigid structure, close to maintenance panels |
| Fin root | ~65 | Acceptable if not at tip |
| **Vertical fin tip** | **~18** | Extreme vibration, flex loads, inaccessible |
| **Wing tip** | **~22** | Flutter, poor access, exposure |
| **Aft engine pylon** | **~28** | Thermal overload, vibration, exposed |

The simulator confirms what aerospace engineers know from experience: **the center fuselage keel area is almost always the right choice** for primary hydraulic junction routing. Modern aircraft like the 777 and A380 locate their primary hydraulic manifolds there for exactly this reason.

---

## Possible extensions for a deeper project

1. **Monte Carlo simulation** — Instead of deterministic scores, add statistical distributions to each risk factor and run 10,000 iterations. Report the *probability* of failure per flight hour rather than a score.

2. **Real MTBF data** — Connect to actual hydraulic component Mean Time Between Failure data from FAA SDR (Service Difficulty Reports) database (public).

3. **3D fuselage visualisation** — Use Three.js to render an aircraft model with zones colour-coded by score, updating live with controls.

4. **Redundancy modelling** — Real aircraft have 2 or 3 independent hydraulic systems. Model the probability that ALL systems fail simultaneously given junction placement.

5. **Historical incident overlay** — Cross-reference known hydraulic failures (United 232, Alaska 261, etc.) with the zones implicated and see if the model correctly identifies them as high-risk.

6. **Machine learning** — Train a regression model on real-world inspection data (FAA SDR database) to derive data-driven weights instead of the expert-estimated ones used here.

---

## Technologies used

- **Vanilla HTML/CSS/JavaScript** — no framework dependencies
- **Chart.js 4.4** — radar and line charts
- **Google Fonts** — Space Mono (monospace labels) + DM Sans (body text)
- **CSS custom properties** — theming and consistent design tokens

---

## Academic / engineering context

This project bridges **aerospace systems engineering** and **data science**:

- The risk dimensions mirror the FAA's AC 25.1435 (Hydraulic Systems) and AC 25.1309 (System Design and Analysis) advisory circulars
- The weighting methodology is analogous to FMEA (Failure Mode and Effects Analysis) severity × occurrence × detection scoring
- The multi-criteria decision framework is a simplified version of what Boeing and Airbus use in their initial design phase trade studies

---

*Built for educational purposes. Not for use in actual aircraft design decisions.*
