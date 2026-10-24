# Gravity Rocket Lab

A model rocket flight simulator that runs in the browser. Enter a rocket's measurements and the lab:

- **checks stability** with the Barrowman equations (center of pressure vs. balance point) and tells you how to fix an unstable rocket (how many grams of nose weight, or how tall the fins should be)
- **simulates the flight** using real Estes A8, B6 and C6 thrust curves: thrust, gravity, air drag, propellant burning off, ejection delay and parachute descent
- **runs pre-flight checks**: stability margin, speed leaving the launch rod, parachute timing (and the best delay to use), landing speed
- **draws the graphs** (altitude, speed, acceleration, thrust) and explains each one in plain language

## Run it

Open `index.html` in any browser. No install or build step.

To publish it with GitHub Pages: **Settings → Pages → Source: Deploy from a branch → `main` / root**.

## How the physics works

| Part | Equation |
|---|---|
| Newton's second law | `a = (Thrust − Drag − m·g) / m` |
| Air drag | `Drag = ½ · ρ · v² · Cd · A` (ρ thins with altitude) |
| Burning fuel | `m(t) = m_dry + m_case + m_prop · (1 − I(t) / I_total)` |
| Stability margin | `(CP − CG) / diameter`, safe range 1–2 calibers |
| Time stepping | 4th-order Runge–Kutta, 2 ms steps |

Assumptions: straight-up flight, no wind, constant drag coefficient, parachute opens instantly, no launch-rod friction.

## Files

- `physics.js` – the physics engine (stability + flight simulation). Works in the browser and in Node.
- `app.js` – the page: reads the inputs, runs the physics, draws the rocket diagram and graphs.
- `index.html` – layout and styles.
- `tests/test_physics.js` – checks the engine against hand calculations. Run with `node tests/test_physics.js`.

## Validation

The tests check that:

- with drag turned off, the apogee equals burnout height + v²/2g
- burnout speed matches an independent fine-step integration
- landing speed under the parachute equals terminal velocity √(2mg / ρ·Cd·A)
- the center of pressure moves correctly in the limits (no fins → nose CP, huge fins → fin CP)
- the suggested nose weight brings the margin to exactly 1.5 calibers

Next step: compare apogee predictions with OpenRocket for the same rockets.

## Data sources

Motor thrust-curve shapes come from published Estes RASP files, scaled to the total impulse and masses listed on [ThrustCurve.org](https://www.thrustcurve.org/).
