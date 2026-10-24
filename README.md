# Fall Physics Lab

An interactive AP Physics C study lab about **why people fall**: forces, free-body diagrams, Newton's laws, friction, center of mass, torque, kinematics, energy and momentum, all built around a working fall simulator.

## Run it

No install needed. Any static web server works:

```
python3 -m http.server 8000
```

Then open http://localhost:8000 (in Codespaces, open port 8000 from the Ports tab).
On GitHub Pages: Settings → Pages → Deploy from a branch → `main` / root.

Run the physics tests (Node 18+):

```
node --test tests/*.test.js
```

## What's inside

| Section | What you can do |
|---|---|
| Fall simulator | Rigid-body person with separate models for standing, leaning, tipping (Στ = Iα), sliding, tipping while sliding, free fall, landing and impact. All controls, arrow toggles, phase tracker, event log, and 10 synchronized graphs with cursor, zoom, pan, tangent slope and area. |
| Graph lab | Experiment H plus a randomized graph-reading drill built from real simulations (3 levels). |
| Forces & FBDs | Free-body diagram tool (8 situations, force table, ΣF equations), Experiment A, normal force in an elevator, friction calculator, linear vs quadratic drag. |
| Newton's laws | First-law cases, second-law vector calculator, third-law pairs. |
| Friction | Experiment B (static → kinetic), tip-or-slip analysis. |
| Center of mass | Segment model (Dempster/Winter mass fractions) with editable masses, Experiment C, front-view stance width, predict-the-balance game. |
| Torque | Lever arm and line of action, torque vs lean graph, Experiment D, predict-the-torque drill. |
| Falling motion | Kinematics equations with coordinate choice, Experiments E and F, calculus solution for linear drag. |
| Energy & momentum | Experiment G (landing), height vs speed, rotational energy check against the simulator. |
| Practice | 71 randomized problem types (numeric, multiple choice, free-body diagram, written), 4 levels, hints, step-by-step solutions, common-mistake detection, retry, related challenge, weak-topic review. |
| Formula reference | 19 searchable formulas with variables, SI units, assumptions, worked examples and common mistakes. |
| Progress | Accuracy by topic, weak areas, experiments, recent results, backup code to copy/restore. Saved in the browser. |

## Code layout

- `js/physics/` – pure physics functions (no DOM): `forces.js`, `kinematics.js`, `rotation.js`, `energy.js`, `fallSim.js`
- `js/ui/` – reusable pieces: interactive plot, drawing kit, free-body diagrams, experiment cards
- `js/sections/` – one file per page
- `js/data/` – formulas and problem templates
- `tests/` – 24 automated checks (e.g. energy conserved while tipping, linear-drag simulation matches the exact solution, free-fall landing time = √(2h/g))

Sign convention in the simulator: x right, y up; angles, ω, α and τ are clockwise-positive (falling forward is positive).
