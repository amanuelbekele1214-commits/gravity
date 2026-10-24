/** Falling motion and kinematics: Experiments E (free fall) and F (air resistance). */
import { h, slider, select, fmt, readout } from "../ui/dom.js";
import { createPlot } from "../ui/plot.js";
import { FORCE_COLORS } from "../ui/draw.js";
import { experiment, sectionHead } from "../ui/experiment.js";
import { practiceLink } from "../state.js";
import { simulateVerticalFall, timeToReach, linearDragExact } from "../physics/kinematics.js";
import { terminalSpeed } from "../physics/forces.js";

const GS = [["9.8", "Earth 9.8 m/s²"], ["1.62", "Moon 1.62 m/s²"], ["3.71", "Mars 3.71 m/s²"]];

export function render(root) {
  const C = FORCE_COLORS();
  root.append(sectionHead("Learn · Unit 1: Kinematics", "Falling motion",
    "Once the feet leave the ground, the only force (without air) is gravity, so the acceleration is constant and the four kinematics equations apply. Before that, while the body tips, the acceleration changes every instant and you need forces and torques instead."));

  /* ---------- equations + coordinate choice ---------- */
  let upPos = true;
  const eqBox = h("div.stack", { style: { gap: "6px" } });
  const updEq = () => {
    const g = upPos ? "−9.8" : "+9.8";
    eqBox.replaceChildren(
      h("p.small.muted", upPos ? "Up is positive: a = −g = −9.8 m/s², heights above the ground are positive, falling velocities are negative." : "Down is positive: a = +g = +9.8 m/s², falling velocities are positive, displacement toward the ground is positive."),
      h("div.eq", `v = v₀ + a·t            (a = ${g} m/s²)`),
      h("div.eq", "Δy = v₀·t + ½·a·t²"),
      h("div.eq", "v² = v₀² + 2·a·Δy"),
      h("div.eq", "Δy = ½·(v₀ + v)·t"),
      h("p.small", { html: upPos ? "Free fall from rest, written with <b>down positive</b> instead: v = g·t and d = ½·g·t²." : "From rest: v = g·t, d = ½·g·t² (this simple form assumes down positive and v₀ = 0)." }));
  };
  const eqPanel = h("section.panel",
    h("h3", "Constant-acceleration equations"),
    h("div.cols", { style: { marginTop: "10px" } },
      h("div.stack", { style: { gap: "10px" } },
        select({ label: "Coordinate system", value: "up", options: [["up", "Up is positive"], ["down", "Down is positive"]], onChange: v => { upPos = v === "up"; updEq(); } }).el,
        eqBox),
      h("div.worked",
        h("b", "Worked example: falling for 0.50 s"),
        h("p", "A person falls freely from rest for 0.50 s. How fast are they moving and how far have they fallen?"),
        h("div.eq", "Down positive, v₀ = 0, a = g = 9.8 m/s²"),
        h("div.eq", "v = g·t = 9.8 × 0.50 = 4.9 m/s downward"),
        h("div.eq", "d = ½·g·t² = ½ × 9.8 × 0.50² = 1.225 m downward"),
        h("p", { html: "Notice the distance is not 9.8 × 0.5 × 0.5 = 2.45 m: the speed grows from 0, so the average speed is only half the final speed." }))));
  updEq();

  /* ---------- Experiment E ---------- */
  const E = { h0: 1, v0: 0, g: 9.8 };
  const outE = h("div");
  const plotsE = [
    createPlot({ title: "Height y (up +)", height: 180, series: [{ key: "y", label: "y", color: C.vel, unit: "m", slopeUnit: "m/s", slopeMeaning: "v" }] }),
    createPlot({ title: "Velocity v (up +)", height: 180, series: [{ key: "v", label: "v", color: C.vel, unit: "m/s", slopeUnit: "m/s²", slopeMeaning: "a", areaUnit: "m", areaMeaning: "Δy" }] }),
    createPlot({ title: "Acceleration a (up +)", height: 160, series: [{ key: "a", label: "a", color: C.vel, unit: "m/s²", areaUnit: "m/s", areaMeaning: "Δv" }] })];
  const updE = () => {
    const r = simulateVerticalFall({ h0: E.h0, v0: E.v0, m: 60, g: E.g });
    const T = r.samples.map(s => s.t);
    plotsE[0].setData(T, { y: r.samples.map(s => s.y) });
    plotsE[1].setData(T, { v: r.samples.map(s => s.v) });
    plotsE[2].setData(T, { a: r.samples.map(s => s.a) });
    const tEq = timeToReach({ y0: E.h0, v0: E.v0, a: -E.g }, 0);
    const vEq = E.v0 - E.g * tEq;
    const top = E.v0 > 0 ? E.h0 + E.v0 * E.v0 / (2 * E.g) : E.h0;
    outE.replaceChildren(
      readout([["Fall time", `${fmt(r.tLand, 3)} s`], ["Landing speed", `${fmt(Math.abs(r.vLand), 2)} m/s`], ["Highest point", `${fmt(top, 2)} m`]]),
      h("div.eq", { style: { marginTop: "10px" } }, `0 = ${fmt(E.h0, 2)} + (${fmt(E.v0, 1)})t − ½(${fmt(E.g, 2)})t²  →  t = ${fmt(tEq, 3)} s`),
      h("div.eq", { style: { marginTop: "6px" } }, `v = v₀ + a·t = ${fmt(E.v0, 1)} − ${fmt(E.g, 2)} × ${fmt(tEq, 3)} = ${fmt(vEq, 2)} m/s   (check: √(v₀² + 2g·h) = ${fmt(Math.sqrt(E.v0 * E.v0 + 2 * E.g * E.h0), 2)})`),
      h("p.small.muted", { style: { marginTop: "6px" } }, "The numbers in the readout come from the step-by-step simulation; the equations above come from algebra. They agree."));
  };
  const expE = experiment({
    id: "E", letter: "E", title: "Free fall",
    predict: "Dropped from rest, how does the fall time change if you fall from 4 times the height?",
    choices: ["It stays the same", "It doubles", "It becomes 4 times longer", "It becomes 16 times longer"],
    controls: [
      slider({ label: "Starting height h", unit: "m", min: 0.1, max: 50, step: 0.1, value: E.h0, onInput: v => { E.h0 = v; updE(); } }).el,
      slider({ label: "Initial velocity v₀ (up +)", unit: "m/s", min: -10, max: 10, step: 0.1, value: E.v0, onInput: v => { E.v0 = v; updE(); } }).el,
      select({ label: "Gravity", value: "9.8", options: GS, onChange: v => { E.g = parseFloat(v); updE(); } }).el],
    result: outE,
    graph: h("div.stack", { style: { gap: "12px" } }, plotsE.map(p => p.el)),
    conclusion: "<b>It doubles.</b> From h = ½·g·t², t = √(2h/g): the time grows with the square root of the height, so 4× the height gives 2× the time. The landing speed √(2gh) also doubles. The position graph is a parabola, the velocity graph a straight line with slope −g, and the acceleration graph a flat line at −g: try Slope on the velocity graph and Area on the acceleration graph.",
    reflection: { q: "A ball is thrown straight up. At the very top, what are its velocity and acceleration?", a: "Velocity is zero for an instant, but acceleration is still −9.8 m/s² (down). If the acceleration were zero there, the ball would stay at the top forever." }
  });

  /* ---------- Experiment F ---------- */
  const F = { h0: 30, m: 70, model: "quadratic", b: 12, Cd: 1.0, A: 0.7, on: true };
  const outF = h("div");
  const plotsF = [
    createPlot({ title: "Velocity: with vs without air", height: 200, series: [
      { key: "v0", label: "no air", color: C.ink, unit: "m/s", dash: [6, 4], slopeUnit: "m/s²", slopeMeaning: "a" },
      { key: "v1", label: "with air", color: C.drag, unit: "m/s", slopeUnit: "m/s²", slopeMeaning: "a", areaUnit: "m", areaMeaning: "Δy" }] }),
    createPlot({ title: "Acceleration: with vs without air", height: 180, series: [
      { key: "a0", label: "no air", color: C.ink, unit: "m/s²", dash: [6, 4] }, { key: "a1", label: "with air", color: C.drag, unit: "m/s²", areaUnit: "m/s", areaMeaning: "Δv" }] }),
    createPlot({ title: "Height: with vs without air", height: 180, series: [
      { key: "y0", label: "no air", color: C.ink, unit: "m", dash: [6, 4] }, { key: "y1", label: "with air", color: C.drag, unit: "m" }] })];
  const dragSel = select({ label: "Drag model", value: F.model, options: [["quadratic", "Quadratic ½ρCdA·v²"], ["linear", "Linear b·v"]], onChange: v => { F.model = v; updF(); } });
  const onSel = select({ label: "Air resistance", value: "on", options: [["on", "On"], ["off", "Off (both curves identical)"]], onChange: v => { F.on = v === "on"; updF(); } });
  const updF = () => {
    const drag = F.on ? (F.model === "linear" ? { model: "linear", b: F.b } : { model: "quadratic", Cd: F.Cd, A: F.A, rho: 1.2 }) : { model: "none" };
    const a = simulateVerticalFall({ h0: F.h0, m: F.m }), b = simulateVerticalFall({ h0: F.h0, m: F.m, drag });
    const tEnd = Math.max(a.tLand, b.tLand);
    const T = Array.from({ length: Math.ceil(tEnd / 0.01) + 1 }, (_, i) => Math.min(i * 0.01, tEnd));
    const at = (r, key, t) => {
      if (t >= r.tLand) return NaN;
      const S = r.samples, i = Math.min(S.length - 1, Math.round(t / 0.005));
      return S[i][key];
    };
    plotsF[0].setData(T, { v0: T.map(t => at(a, "v", t)), v1: T.map(t => at(b, "v", t)) });
    plotsF[1].setData(T, { a0: T.map(t => at(a, "a", t)), a1: T.map(t => at(b, "a", t)) });
    plotsF[2].setData(T, { y0: T.map(t => at(a, "y", t)), y1: T.map(t => at(b, "y", t)) });
    const vt = terminalSpeed(drag, F.m);
    const extra = [];
    if (F.on && F.model === "linear") {
      const ex = linearDragExact({ y0: F.h0, m: F.m, b: F.b }, b.tLand * 0.5);
      extra.push(h("div.eq", { style: { marginTop: "8px" } }, `Calculus check at t = ${fmt(b.tLand * 0.5, 2)} s: v = −v_T(1 − e^(−t/τ)) = ${fmt(ex.v, 3)} m/s, simulation ${fmt(at(b, "v", b.tLand * 0.5), 3)} m/s`));
    }
    outF.replaceChildren(readout([
      ["Fall time, no air", `${fmt(a.tLand, 2)} s`], ["Fall time, air", `${fmt(b.tLand, 2)} s`],
      ["Landing speed, no air", `${fmt(Math.abs(a.vLand), 1)} m/s`], ["Landing speed, air", `${fmt(Math.abs(b.vLand), 1)} m/s`],
      ["Terminal speed", Number.isFinite(vt) ? `${fmt(vt, 1)} m/s` : "none"]]), ...extra);
  };
  const expF = experiment({
    id: "F", letter: "F", title: "Air resistance",
    predict: "Two people with the same body shape jump from the same height, one 50 kg and one 100 kg. With air resistance, who reaches the ground first?",
    choices: ["The lighter person", "The heavier person", "They land together", "It depends only on height"],
    controls: [onSel.el, dragSel.el,
      slider({ label: "Mass m", unit: "kg", min: 10, max: 150, step: 1, value: F.m, onInput: v => { F.m = v; updF(); } }).el,
      slider({ label: "Drop height", unit: "m", min: 2, max: 300, step: 1, value: F.h0, onInput: v => { F.h0 = v; updF(); } }).el,
      slider({ label: "b (linear)", unit: "kg/s", min: 1, max: 60, step: 1, value: F.b, onInput: v => { F.b = v; updF(); } }).el,
      slider({ label: "Cd (quadratic)", unit: "", min: 0.3, max: 1.5, step: 0.05, value: F.Cd, onInput: v => { F.Cd = v; updF(); } }).el,
      slider({ label: "Area A", unit: "m²", min: 0.1, max: 1.2, step: 0.05, value: F.A, onInput: v => { F.A = v; updF(); } }).el],
    result: outF,
    graph: h("div.stack", { style: { gap: "12px" } }, plotsF.map(p => p.el)),
    conclusion: "<b>The heavier person.</b> Without air, mass cancels: a = m·g/m = g for everyone. With air, a = g − D/m. The same shape at the same speed has the same drag D, but dividing by a larger mass makes D/m smaller, so the heavier person accelerates closer to g and reaches a higher terminal speed. On the velocity graph the air curve bends away from the straight no-air line and levels off at the terminal speed, where the acceleration graph reaches zero.",
    reflection: { q: "When a skydiver opens their parachute, which way does their acceleration point, and why?", a: "Upward. The bigger area makes the drag much larger than the weight at the current speed, so the net force is up; the skydiver keeps moving down but slows until drag equals weight again at a new, lower terminal speed." }
  });

  /* ---------- AP C calculus box ---------- */
  const calc = h("section.panel",
    h("h3", "AP Physics C: solving linear drag with calculus"),
    h("div.prose", { style: { marginTop: "10px" } },
      h("p", { html: "With up positive and drag F = −b·v, Newton's second law is a differential equation:" }),
      h("div.eq.big", "m·dv/dt = −m·g − b·v"),
      h("p", { html: "Separate variables and integrate from v₀ at t = 0 to get" }),
      h("div.eq.big", "v(t) = −v_T + (v₀ + v_T)·e^(−t/τ),   v_T = m·g/b,   τ = m/b"),
      h("p", { html: "The speed approaches v<sub>T</sub> exponentially; after one time constant τ a fall from rest has reached 63% of terminal speed. Integrating again gives y(t). The lab's numerical solver matches this formula to six decimal places (checked in the automated tests), and Experiment F shows the check live when you pick the linear model." })),
    h("div.row", { style: { marginTop: "12px" } }, practiceLink("kinematics"), practiceLink("drag", "Air-resistance problems")));

  const phases = h("section.panel",
    h("h3", "Three stages of a fall"),
    h("div.cols-3", { style: { marginTop: "10px" } },
      h("div.prose", h("p", { html: "<b>1. Tipping.</b> The feet are still on the ground. Gravity's torque about the foot edge rotates the body. The COM moves on a circle, so its acceleration changes direction and size: constant-acceleration equations do <b>not</b> apply." })),
      h("div.prose", h("p", { html: "<b>2. Airborne.</b> Contact is lost. Only gravity acts (plus a little drag), so a = g downward and the kinematics equations work. With no torque about the COM, the body keeps spinning at a constant ω." })),
      h("div.prose", h("p", { html: "<b>3. Landing.</b> The ground pushes hard for a short time and changes the momentum to zero. The contact force can be many times the body weight: see Energy and momentum." }))));

  root.append(h("div.stack", eqPanel, expE, expF, calc, phases));
  updE(); updF();
}
