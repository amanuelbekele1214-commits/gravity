/** Forces and free-body diagrams. */
import { h, slider, select, fmt, readout, onResize } from "../ui/dom.js";
import { createPlot } from "../ui/plot.js";
import { drawFBD } from "../ui/fbd.js";
import { FORCE_COLORS } from "../ui/draw.js";
import { experiment, sectionHead } from "../ui/experiment.js";
import { practiceLink } from "../state.js";
import { weight, normalForce, friction, terminalSpeed } from "../physics/forces.js";

const PLANETS = [["9.8", "Earth (9.8 m/s²)"], ["1.62", "Moon (1.62 m/s²)"], ["3.71", "Mars (3.71 m/s²)"], ["24.8", "Jupiter (24.8 m/s²)"]];

export function render(root) {
  const C = FORCE_COLORS();
  const cleanups = [];
  root.append(sectionHead("Learn · Unit 2: Force and translational dynamics", "Forces and free-body diagrams",
    "A force is a push or pull by one object on another. To predict motion, list every <b>external</b> force on the object you care about, draw them from where they act, then add them as vectors: ΣF = m·a."));

  /* ---------- A. weight ---------- */
  const W = { m: 60, g: 9.8 };
  const wOut = h("div");
  const wPlot = createPlot({ title: "Weight vs mass", xName: "m", xUnit: "kg", xDigits: 0, xLabel: "m (kg)", height: 200,
    series: [{ key: "W", label: "Fg", color: C.weight, unit: "N", digits: 0, slopeUnit: "N/kg = m/s²", slopeMeaning: "g" }] });
  const updW = () => {
    const Fg = weight(W.m, W.g);
    wOut.replaceChildren(readout([["Mass", `${fmt(W.m, 0)} kg`], ["g", `${fmt(W.g, 2)} m/s²`], ["Weight Fg", `${fmt(Fg, 1)} N`]]),
      h("div.eq", { style: { marginTop: "10px" } }, `Fg = m·g = ${fmt(W.m, 0)} kg × ${fmt(W.g, 2)} m/s² = ${fmt(Fg, 1)} N`));
    const ms = Array.from({ length: 151 }, (_, i) => i);
    wPlot.setData(ms, { W: ms.map(m => m * W.g) });
    wPlot.setDots([{ x: W.m, y: Fg, color: C.weight }]);
  };
  const expA = experiment({
    id: "A", letter: "A", title: "Mass and weight",
    predict: "If you double your mass, what happens to your weight?",
    choices: ["It stays the same", "It doubles", "It increases four times"],
    controls: [
      slider({ label: "Mass m", unit: "kg", min: 1, max: 150, step: 1, value: W.m, onInput: v => { W.m = v; updW(); } }).el,
      select({ label: "Planet", value: "9.8", options: PLANETS, onChange: v => { W.g = parseFloat(v); updW(); } }).el],
    result: wOut, graph: wPlot.el,
    conclusion: "<b>Weight is proportional to mass.</b> The graph is a straight line through the origin, and its slope is g. Turn on <b>Slope</b> on the graph: it reads 9.80 N/kg on Earth, which is the same as 9.80 m/s². Mass (kg) is how much matter you have; weight (N) is the gravitational force on it, so it changes from planet to planet while mass does not.",
    reflection: { q: "An astronaut has a mass of 80 kg. What are their mass and weight on the Moon?", a: "Mass stays 80 kg. Weight = 80 × 1.62 = 130 N on the Moon, compared with 784 N on Earth." }
  });
  updW();

  /* ---------- B. normal force ---------- */
  const NF = { m: 60, ay: 0, extra: 0 };
  const nCanvas = h("canvas", { "aria-label": "Free-body diagram of a person in an elevator" });
  const nOut = h("div");
  const updN = () => {
    const r = normalForce({ m: NF.m, ay: NF.ay, FyOther: NF.extra });
    const forces = [{ sym: "Fg", x: 0, y: -NF.m * 9.8, at: "com", color: C.weight, label: `Fg ${fmt(NF.m * 9.8, 0)} N` }];
    if (r.inContact) forces.push({ sym: "N", x: 0, y: r.N, at: "feet", color: C.normal, label: `N ${fmt(r.N, 0)} N`, side: -1 });
    if (NF.extra) forces.push({ sym: "F", x: 0, y: NF.extra, at: "hands", color: C.applied, label: `F ${fmt(Math.abs(NF.extra), 0)} N ${NF.extra > 0 ? "up" : "down"}` });
    drawFBD(nCanvas, forces, { elevator: true, a: { x: 0, y: NF.ay } });
    nOut.replaceChildren(
      h("div.eq", `ΣF_y = m·a_y  →  N + F − m·g = m·a_y  →  N = m(g + a_y) − F`),
      h("div.eq", { style: { marginTop: "6px" } }, `N = ${fmt(NF.m, 0)}(9.8 + ${fmt(NF.ay, 1)}) − ${fmt(NF.extra, 0)} = ${fmt(r.required, 0)} N`),
      h("p", { style: { marginTop: "8px" }, html: r.inContact
        ? `The scale reads <b>${fmt(r.N, 0)} N</b>, which is <b>${fmt(r.N / (NF.m * 9.8), 2)}×</b> your weight.`
        : `<b>N would be negative.</b> A floor can only push, so contact is lost: you float off the floor and only gravity (and F) act.` }));
  };
  const nPanel = h("section.panel",
    h("h3", "Normal force: not always m·g"),
    h("p.sub", "The normal force is the floor's perpendicular push. It is whatever size is needed to stop you sinking into the floor, so it changes when you accelerate up or down or when another vertical force acts. Picture standing on a scale in an elevator."),
    h("div.cols", { style: { marginTop: "14px" } },
      h("div.stack", { style: { gap: "10px" } },
        slider({ label: "Mass m", unit: "kg", min: 20, max: 120, step: 1, value: NF.m, onInput: v => { NF.m = v; updN(); } }).el,
        slider({ label: "Elevator acceleration a_y (+ up)", unit: "m/s²", min: -12, max: 6, step: 0.1, value: 0, onInput: v => { NF.ay = v; updN(); } }).el,
        slider({ label: "Extra vertical force F on you (+ up, e.g. pulling on a rail)", unit: "N", min: -300, max: 300, step: 5, value: 0, onInput: v => { NF.extra = v; updN(); } }).el,
        nOut),
      h("div.stage.tall", nCanvas)));
  cleanups.push(onResize(nCanvas.parentElement, updN));

  /* ---------- C. friction calculator ---------- */
  const FR = { m: 60, muS: 0.6, muK: 0.45, F: 200 };
  const frOut = h("div");
  const updF = () => {
    const N = FR.m * 9.8;
    const r = friction({ F: FR.F, N, muS: FR.muS, muK: FR.muK, m: FR.m });
    frOut.replaceChildren(
      readout([["Normal N", `${fmt(N, 0)} N`], ["Max static μs·N", `${fmt(r.fsMax, 0)} N`], ["Kinetic μk·N", `${fmt(r.fk, 0)} N`],
        ["Friction now", `${fmt(r.f, 0)} N`], ["State", r.slipping ? "Sliding" : "Holding"], ["Acceleration", `${fmt(r.ax, 2)} m/s²`]]),
      h("p", { style: { marginTop: "10px" }, html: r.slipping
        ? `The push (${fmt(Math.abs(FR.F), 0)} N) is more than the maximum static friction (${fmt(r.fsMax, 0)} N), so the feet slide. Kinetic friction is μk·N = ${fmt(r.fk, 0)} N, and a = (F + f)/m = <b>${fmt(r.ax, 2)} m/s²</b>.`
        : `Static friction matches the push exactly: f = ${fmt(r.f, 0)} N. It could go up to ${fmt(r.fsMax, 0)} N, so you are <b>${fmt(r.fsMax - Math.abs(FR.F), 0)} N</b> away from slipping.` }));
  };
  const frPanel = h("section.panel",
    h("h3", "Friction: static vs kinetic"),
    h("p.sub", { html: "Static friction <b>adjusts</b> to whatever is needed, up to a limit: |f<sub>s</sub>| ≤ μ<sub>s</sub>N. Once surfaces slide, kinetic friction has a fixed size f<sub>k</sub> = μ<sub>k</sub>N, opposite the sliding. The Friction section has the full experiment." }),
    h("div.cols", { style: { marginTop: "14px" } },
      h("div.stack", { style: { gap: "10px" } },
        slider({ label: "Mass m (N = m·g on flat ground)", unit: "kg", min: 10, max: 120, step: 1, value: FR.m, onInput: v => { FR.m = v; updF(); } }).el,
        slider({ label: "μs", unit: "", min: 0.05, max: 1.2, step: 0.01, value: FR.muS, onInput: v => { FR.muS = v; if (FR.muK > v) FR.muK = v; updF(); } }).el,
        slider({ label: "μk", unit: "", min: 0.02, max: 1.2, step: 0.01, value: FR.muK, onInput: v => { FR.muK = Math.min(v, FR.muS); updF(); } }).el,
        slider({ label: "Horizontal push F", unit: "N", min: -800, max: 800, step: 5, value: FR.F, onInput: v => { FR.F = v; updF(); } }).el),
      frOut));
  updF();

  /* ---------- D. air resistance ---------- */
  const AR = { b: 12, Cd: 1.0, A: 0.7, m: 70 };
  const arPlot = createPlot({ title: "Air resistance vs speed", xName: "v", xUnit: "m/s", xDigits: 1, xLabel: "speed (m/s)", height: 220,
    series: [
      { key: "lin", label: "linear b·v", color: C.drag, unit: "N", digits: 0 },
      { key: "quad", label: "quadratic ½ρCdA·v²", color: C.applied, unit: "N", digits: 0 },
      { key: "W", label: "weight m·g", color: C.weight, unit: "N", digits: 0, dash: [6, 4] }] });
  const arOut = h("div");
  const updAR = () => {
    const vs = Array.from({ length: 161 }, (_, i) => i * 0.5);
    arPlot.setData(vs, { lin: vs.map(v => AR.b * v), quad: vs.map(v => 0.5 * 1.2 * AR.Cd * AR.A * v * v), W: vs.map(() => AR.m * 9.8) });
    const vtL = terminalSpeed({ model: "linear", b: AR.b }, AR.m), vtQ = terminalSpeed({ model: "quadratic", Cd: AR.Cd, A: AR.A }, AR.m);
    arOut.replaceChildren(readout([["Terminal speed, linear", `${fmt(vtL, 1)} m/s`], ["Terminal speed, quadratic", `${fmt(vtQ, 1)} m/s`]]),
      h("p.small", { style: { marginTop: "8px" }, html: "Terminal speed is where a drag curve crosses the dashed weight line: drag = m·g, so ΣF = 0 and the speed stops growing." }));
  };
  const arPanel = h("section.panel",
    h("h3", "Air resistance: two models"),
    h("div.cols", { style: { marginTop: "10px" } },
      h("div.stack", { style: { gap: "10px" } },
        h("div.prose",
          h("p", { html: "<b>Linear:</b> F = −b·v. Good for small, slow objects (dust, tiny droplets) and the standard model in AP Physics C, because m·dv/dt = m·g − b·v can be solved with calculus." }),
          h("p", { html: "<b>Quadratic:</b> F = −½ρC<sub>d</sub>A·v², opposite the velocity. Good for people, balls and cars moving through air at everyday speeds." }),
          h("p", { html: "In both, drag points <b>opposite the velocity</b>, grows with speed, and depends on shape. For a person falling 1–2 m, drag is tiny (a few newtons), which is why the simulator turns it off by default." })),
        slider({ label: "b (linear)", unit: "kg/s", min: 1, max: 40, step: 1, value: AR.b, onInput: v => { AR.b = v; updAR(); } }).el,
        slider({ label: "Cd · A: Cd", unit: "", min: 0.3, max: 1.5, step: 0.05, value: AR.Cd, onInput: v => { AR.Cd = v; updAR(); } }).el,
        slider({ label: "Area A (0.7 = spread out, 0.2 = diving)", unit: "m²", min: 0.1, max: 1.2, step: 0.05, value: AR.A, onInput: v => { AR.A = v; updAR(); } }).el,
        slider({ label: "Mass m", unit: "kg", min: 20, max: 120, step: 1, value: AR.m, onInput: v => { AR.m = v; updAR(); } }).el),
      h("div.stack", { style: { gap: "10px" } }, arPlot.el, arOut)));
  updAR();

  /* ---------- E. free-body diagram tool ---------- */
  const S = {
    stand: { name: "Person standing still", params: { m: 60 } },
    up: { name: "Accelerating upward (elevator starts up)", params: { m: 60, a: 2 } },
    down: { name: "Accelerating downward (elevator starts down)", params: { m: 60, a: 2 } },
    wall: { name: "Pushing against a wall", params: { m: 60, P: 150, muS: 0.6 } },
    slip: { name: "Slipping on a surface", params: { m: 60, muK: 0.2 } },
    jump: { name: "Jumping: push-off (feet still on the floor)", params: { m: 60, a: 8 } },
    fall: { name: "Falling freely", params: { m: 60, v: 0, drag: 0 } },
    land: { name: "Landing on the ground", params: { m: 60, v: 4, dt: 0.1 } }
  };
  const PARAM_UI = {
    m: ["Mass m", "kg", 20, 120, 1], a: ["Acceleration size a", "m/s²", 0, 15, 0.1], P: ["Push on the wall P", "N", 0, 600, 5],
    muS: ["μs (floor)", "", 0.05, 1.2, 0.01], muK: ["μk (floor)", "", 0.02, 1, 0.01], v: ["Speed v", "m/s", 0, 50, 0.5],
    drag: ["Include air drag? (0 = no, 1 = yes)", "", 0, 1, 1], dt: ["Stopping time Δt", "s", 0.01, 0.5, 0.01]
  };
  let cur = "stand";
  const vals = {};
  const fbdCanvas = h("canvas", { "aria-label": "Free-body diagram" });
  const fbdParams = h("div.stack", { style: { gap: "10px" } });
  const fbdTable = h("div");
  const sitSel = select({ label: "Situation", value: cur, options: Object.entries(S).map(([k, s]) => [k, s.name]), onChange: v => { cur = v; buildParams(); } });

  function compute() {
    const p = { ...S[cur].params, ...vals[cur] };
    const m = p.m, g = 9.8, Fg = m * g;
    const fg = { sym: "Fg", name: "Weight", by: "Earth (gravity)", x: 0, y: -Fg, at: "com", color: C.weight, why: "Gravity pulls every bit of mass toward Earth's center. It acts at the center of mass." };
    const nrm = (N, why) => ({ sym: "N", name: "Normal force", by: "the floor", x: 0, y: N, at: "feet", color: C.normal, side: -1, why });
    let forces = [], ax = 0, ay = 0, v = { x: 0, y: 0 }, pose = "stand", wall = false, elevator = false, note = "";
    switch (cur) {
      case "stand":
        forces = [fg, nrm(Fg, "The floor pushes up just enough to stop you sinking: N = mg because a_y = 0.")];
        note = "Two forces, equal and opposite, on the same object: ΣF = 0, so a = 0 (Newton's first law). N and Fg are <b>not</b> a third-law pair: they act on the same object and come from different interactions.";
        break;
      case "up": {
        elevator = true; ay = p.a; const N = m * (g + p.a);
        forces = [fg, nrm(N, `N must be bigger than mg to give a net upward force: N = m(g + a) = ${fmt(N, 0)} N.`)];
        v = { x: 0, y: 1 };
        note = "You feel heavier because the floor pushes harder than your weight. The velocity could point down too (an elevator slowing down while descending) — the forces only fix the <b>acceleration</b>.";
        break;
      }
      case "down": {
        elevator = true; ay = -p.a; const N = Math.max(0, m * (g - p.a));
        forces = [fg, nrm(N, N > 0 ? `N is smaller than mg: N = m(g − a) = ${fmt(N, 0)} N.` : "With a ≥ g the floor cannot push at all: N = 0 (free fall).")];
        if (p.a > g) { ay = -g; note = "An elevator can't pull you down faster than g; you'd lift off the floor and fall freely with a = g."; }
        else note = "You feel lighter because the floor pushes less than your weight.";
        v = { x: 0, y: -1 };
        break;
      }
      case "wall": {
        wall = true; pose = "push";
        const fsMax = p.muS * Fg, holds = p.P <= fsMax;
        const f = holds ? p.P : 0.8 * p.muS * Fg;
        forces = [fg, nrm(Fg, "No vertical acceleration and no other vertical forces: N = mg."),
          { sym: "F_wall", name: "Wall's push", by: "the wall", x: -p.P, y: 0, at: "hands", color: C.applied, why: "You push the wall; by Newton's third law the wall pushes back on your hands with the same size, opposite direction." },
          { sym: "f", name: holds ? "Static friction" : "Kinetic friction (≈ μk N)", by: "the floor", x: f, y: 0, at: "feet", color: C.friction, why: holds ? `Static friction holds your feet: it matches the wall's push (${fmt(p.P, 0)} N ≤ μs·N = ${fmt(fsMax, 0)} N).` : `The wall's push (${fmt(p.P, 0)} N) is more than μs·N = ${fmt(fsMax, 0)} N, so your feet slide backward. Kinetic friction is shown with μk = 0.8·μs.` }];
        ax = holds ? 0 : (f - p.P) / m;
        if (!holds) v = { x: -1, y: 0 };
        note = "Your push on the wall is a force on the <b>wall</b>, so it does not appear here. What appears is the wall's push on you.";
        break;
      }
      case "slip": {
        const fk = p.muK * Fg;
        forces = [fg, nrm(Fg, "No vertical acceleration: N = mg."),
          { sym: "f_k", name: "Kinetic friction", by: "the floor", x: -fk, y: 0, at: "feet", color: C.friction, why: `Your feet slide to the right, so kinetic friction points left: f_k = μk·N = ${fmt(fk, 0)} N.` }];
        ax = -p.muK * g; v = { x: 1, y: 0 };
        note = "There is no forward force keeping you moving. Motion continues because of inertia; friction only slows you down (a = −μk·g).";
        break;
      }
      case "jump": {
        pose = "crouch"; ay = p.a; const N = m * (g + p.a);
        forces = [fg, nrm(N, `To accelerate upward, your legs push down on the floor and the floor pushes up with N = m(g + a) = ${fmt(N, 0)} N.`)];
        v = { x: 0, y: 1 };
        note = "The floor's push N is the external force that launches you. Your muscles are internal; they work by changing how hard you push on the floor.";
        break;
      }
      case "fall": {
        pose = "air"; const speed = p.v;
        forces = [fg];
        let D = 0;
        if (p.drag >= 0.5 && speed > 0) {
          D = 0.5 * 1.2 * 1.0 * 0.7 * speed * speed;
          forces.push({ sym: "D", name: "Air drag", by: "the air", x: 0, y: D, at: "com", color: C.drag, why: `Moving down through air: drag points up, ½ρCdA·v² = ${fmt(D, 0)} N (Cd = 1, A = 0.7 m²).` });
        }
        ay = (-Fg + D) / m; v = { x: 0, y: speed > 0 ? -1 : 0 };
        note = speed === 0 ? "At the instant of release v = 0, but the acceleration is already g downward." : "Without drag, only gravity acts: a = g down for any mass.";
        break;
      }
      case "land": {
        pose = "crouch"; const dp = m * p.v, Fnet = dp / p.dt, N = Fnet + Fg;
        forces = [fg, nrm(N, `Average contact force while stopping: N = m·v/Δt + m·g = ${fmt(Fnet, 0)} + ${fmt(Fg, 0)} = ${fmt(N, 0)} N.`)];
        ay = Fnet / m; v = { x: 0, y: -1 };
        note = `The velocity still points down while the acceleration points up: you are slowing down. N is ${fmt(N / Fg, 1)}× your weight.`;
        break;
      }
    }
    const Fx = forces.reduce((s, f) => s + f.x, 0), Fy = forces.reduce((s, f) => s + f.y, 0);
    return { p, m, forces, ax: Fx / m, ay: Fy / m, v, pose, wall, elevator, note, Fx, Fy };
  }

  function buildParams() {
    vals[cur] ||= {};
    const p = { ...S[cur].params, ...vals[cur] };
    fbdParams.replaceChildren(...Object.keys(S[cur].params).map(k => {
      const [label, unit, min, max, step] = PARAM_UI[k];
      return slider({ label, unit, min, max, step, value: p[k], onInput: v => { vals[cur][k] = v; updFBD(); } }).el;
    }));
    updFBD();
  }
  function updFBD() {
    const r = compute();
    drawFBD(fbdCanvas, r.forces.map(f => ({ ...f, label: `${f.sym} ${fmt(Math.hypot(f.x, f.y), 0)} N` })),
      { pose: r.pose, wall: r.wall, elevator: r.elevator, v: r.v, a: { x: r.ax, y: r.ay } });
    const sumX = r.forces.filter(f => f.x).map(f => `(${fmt(f.x, 0)})`).join(" + ") || "0";
    const sumY = r.forces.filter(f => f.y).map(f => `(${fmt(f.y, 0)})`).join(" + ") || "0";
    fbdTable.replaceChildren(
      h("div.table-wrap", h("table.data",
        h("thead", h("tr", h("th", "Force"), h("th", "Exerted by"), h("th.n", "x (N)"), h("th.n", "y (N)"), h("th.n", "Size (N)"), h("th", "Why it's there"))),
        h("tbody", r.forces.map(f => h("tr",
          h("td", h("span.key", { style: { background: f.color } }), h("b", f.sym), " ", f.name),
          h("td", f.by), h("td.n", fmt(f.x, 0)), h("td.n", fmt(f.y, 0)), h("td.n", fmt(Math.hypot(f.x, f.y), 0)), h("td", f.why)))))),
      h("div.eq", { style: { marginTop: "10px" } }, `ΣFₓ = ${sumX} = ${fmt(r.Fx, 0)} N = m·aₓ  →  aₓ = ${fmt(r.Fx / r.m, 2)} m/s²`),
      h("div.eq", { style: { marginTop: "6px" } }, `ΣF_y = ${sumY} = ${fmt(r.Fy, 0)} N = m·a_y  →  a_y = ${fmt(r.Fy / r.m, 2)} m/s²`),
      h("p.callout", { style: { marginTop: "10px" }, html: r.note }));
  }
  const fbdPanel = h("section.panel", { id: "fbd-tool" },
    h("h3", "Free-body diagram tool"),
    h("p.sub", "Pick a situation. The diagram shows only real external forces on the person, drawn from where they act and to scale. Velocity and acceleration sit in a separate box because they are not forces."),
    h("div.cols", { style: { marginTop: "14px" } },
      h("div.stack", { style: { gap: "10px" } }, sitSel.el, fbdParams),
      h("div.stage.tall", fbdCanvas)),
    h("div", { style: { marginTop: "14px" } }, fbdTable));
  cleanups.push(onResize(fbdCanvas.parentElement, updFBD));

  /* ---------- worked example ---------- */
  const worked = h("section.panel",
    h("h3", "Worked example: apparent weight"),
    h("div.worked", { style: { marginTop: "10px" } },
      h("p", "A 55 kg student stands on a scale in an elevator that accelerates downward at 1.5 m/s². What does the scale read?"),
      h("div.eq", "Take up as +. Forces: N (up), m·g (down). a_y = −1.5 m/s²."),
      h("div.eq", "ΣF_y = N − m·g = m·a_y  →  N = m(g + a_y) = 55(9.8 − 1.5) = 456.5 N ≈ 457 N"),
      h("p", { html: "The scale reads the normal force, <b>457 N</b>, less than the true weight of 539 N. A common mistake is to write N = m(g + 1.5): the sign of a comes from the direction, and down is negative here." })),
    h("div.row", { style: { marginTop: "12px" } }, practiceLink("forces"), practiceLink("fbd", "Free-body diagram questions")));

  root.append(h("div.stack", fbdPanel, expA, nPanel, frPanel, arPanel, worked));
  buildParams(); updN();
  return () => cleanups.forEach(f => f());
}
