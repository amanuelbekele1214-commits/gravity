/** Energy and momentum: height-vs-speed, tipping energy, Experiment G (landing). */
import { h, slider, fmt, readout, fitCanvas, onResize } from "../ui/dom.js";
import { createPlot } from "../ui/plot.js";
import { FORCE_COLORS, resetLabels } from "../ui/draw.js";
import { experiment, sectionHead } from "../ui/experiment.js";
import { practiceLink } from "../state.js";
import { simulateVerticalFall } from "../physics/kinematics.js";
import { landing, speedFromDrop } from "../physics/energy.js";
import { simulate, makeBody, DEFAULTS } from "../physics/fallSim.js";

export function render(root) {
  const C = FORCE_COLORS();
  const cleanups = [];
  root.append(sectionHead("Learn · Units 3, 4 and 6: energy and momentum", "Energy and momentum",
    "Energy explains how fast you are moving when you hit the ground. Momentum and impulse explain how hard the ground has to push to stop you, and why bending your knees matters so much."));

  /* ---------- height vs speed ---------- */
  const HS = { h: 2, m: 60, f: 1 };
  const cBar = h("canvas", { "aria-label": "Energy bar chart" });
  const outHS = h("div");
  const plotHS = createPlot({ title: "Landing speed vs drop height", xName: "h", xUnit: "m", xDigits: 2, xLabel: "drop height (m)", height: 200,
    series: [{ key: "pred", label: "energy prediction √(2gh)", color: C.weight, unit: "m/s" }, { key: "sim", label: "simulation, with air drag", color: C.drag, unit: "m/s", dash: [5, 4] }] });
  const updHS = () => {
    const r = simulateVerticalFall({ h0: HS.h, m: HS.m });
    const tNow = HS.f * r.tLand;
    const S = r.samples, s = S[Math.min(S.length - 1, Math.round(tNow / 0.005))];
    const K = 0.5 * HS.m * s.v * s.v, U = HS.m * 9.8 * s.y, E = HS.m * 9.8 * HS.h;
    const { ctx, w, h: H } = fitCanvas(cBar);
    ctx.clearRect(0, 0, w, H); resetLabels(ctx);
    const bars = [["K", K, C.vel], ["U", U, C.weight], ["K + U", K + U, C.ink]];
    const bw = Math.min(70, w / 5), base = H - 30, top = 24, scale = (base - top) / Math.max(E, 1);
    bars.forEach(([name, v, col], i) => {
      const x = w * (0.2 + i * 0.27) - bw / 2;
      ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.fillRect(x, base - v * scale, bw, v * scale); ctx.globalAlpha = 1;
      ctx.fillStyle = C.ink; ctx.font = "600 13px 'Atkinson Hyperlegible', sans-serif"; ctx.textAlign = "center";
      ctx.fillText(name, x + bw / 2, base + 18);
      ctx.font = "12px 'JetBrains Mono', monospace"; ctx.fillText(`${fmt(v, 0)} J`, x + bw / 2, base - v * scale - 8);
    });
    ctx.strokeStyle = C.lineStrong; ctx.beginPath(); ctx.moveTo(10, base); ctx.lineTo(w - 10, base); ctx.stroke();
    const vPred = speedFromDrop(HS.h);
    outHS.replaceChildren(readout([["Height now", `${fmt(s.y, 2)} m`], ["Speed now", `${fmt(Math.abs(s.v), 2)} m/s`], ["Predicted landing", `${fmt(vPred, 2)} m/s`], ["Simulated landing", `${fmt(Math.abs(r.vLand), 2)} m/s`]]),
      h("div.eq", { style: { marginTop: "10px" } }, `m·g·h = ½·m·v²  →  v = √(2·g·h) = √(2 × 9.8 × ${fmt(HS.h, 2)}) = ${fmt(vPred, 2)} m/s`));
    const hs = Array.from({ length: 101 }, (_, i) => 0.1 + i * 0.1);
    plotHS.setData(hs, { pred: hs.map(speedFromDrop), sim: hs.map(hh => Math.abs(simulateVerticalFall({ h0: hh, m: HS.m, drag: { model: "quadratic", Cd: 1, A: 0.7 } }).vLand)) });
    plotHS.setDots([{ x: HS.h, y: vPred, color: C.weight }]);
  };
  const hsPanel = h("section.panel",
    h("h3", "Height versus speed: energy conservation"),
    h("p.sub", { html: "Without air resistance, mechanical energy is conserved: K₁ + U₁ = K₂ + U₂. Every joule of gravitational potential energy (U = mgh) lost becomes kinetic energy (K = ½mv²), so the mass cancels and v = √(2gh)." }),
    h("div.cols", { style: { marginTop: "12px" } },
      h("div.stack", { style: { gap: "10px" } },
        slider({ label: "Drop height h", unit: "m", min: 0.1, max: 10, step: 0.05, value: HS.h, onInput: v => { HS.h = v; updHS(); } }).el,
        slider({ label: "Mass m", unit: "kg", min: 20, max: 120, step: 1, value: HS.m, onInput: v => { HS.m = v; updHS(); } }).el,
        slider({ label: "Moment in the fall (0 = release, 1 = landing)", unit: "", min: 0, max: 1, step: 0.01, value: HS.f, onInput: v => { HS.f = v; updHS(); } }).el,
        h("div.stage", cBar), outHS),
      plotHS.el));
  cleanups.push(onResize(cBar.parentElement, updHS));

  /* ---------- rotational energy while tipping ---------- */
  const tipRun = simulate({ leanDeg: 15, duration: 4, muS: 2, muK: 1.5 });
  const body = makeBody(DEFAULTS);
  const tip = tipRun.samples.filter(s => s.phase === "tip");
  const s0 = tip[0], s1 = tip[tip.length - 1];
  const toe = { x: DEFAULTS.footLen - DEFAULTS.heelBack };
  const d = Math.hypot(body.C0.x - toe.x, body.C0.y);
  const Ip = body.Icm + DEFAULTS.m * d * d;
  const dU = s0.U - s1.U, wPred = Math.sqrt(2 * dU / Ip);
  const rotPanel = h("section.panel",
    h("h3", "Rotational kinetic energy: tipping over"),
    h("div.cols", { style: { marginTop: "10px" } },
      h("div.prose",
        h("p", { html: "When a rigid body pivots about a fixed edge, the lost potential energy becomes rotational kinetic energy about that edge: <b>m·g·Δh = ½·I<sub>edge</sub>·ω²</b>. The same energy can be split as translational ½mv<sub>COM</sub>² plus rotational ½I<sub>COM</sub>ω² about the COM." }),
        h("p", { html: `The simulator's "lean 15°" person (65 kg, 1.75 m, I<sub>COM</sub> = mH²/12) pivots about the toe. Check the energy method against the step-by-step simulation, taken just before the foot starts to slip:` })),
      h("div.stack", { style: { gap: "8px" } },
        readout([["COM drop Δh", `${fmt(dU / (DEFAULTS.m * 9.8), 3)} m`], ["I about the toe", `${fmt(Ip, 1)} kg·m²`], ["ω from energy", `${fmt(wPred, 3)} rad/s`], ["ω from simulation", `${fmt(s1.omega, 3)} rad/s`]]),
        h("div.eq", `ω = √(2·m·g·Δh / I) = √(2 × ${fmt(dU, 1)} J / ${fmt(Ip, 1)}) = ${fmt(wPred, 3)} rad/s`),
        h("p.small.muted", "They agree because static friction and the normal force act at a point that does not move, so they do no work."))));

  /* ---------- Experiment G: landing ---------- */
  const G = { m: 60, h: 0.8, dt: 0.1 };
  const outG = h("div");
  const plotG = createPlot({ title: "Average force vs stopping time", xName: "Δt", xUnit: "s", xDigits: 3, xLabel: "stopping time Δt (s)", height: 200,
    series: [{ key: "net", label: "average net force", color: C.ink, unit: "N", digits: 0 }, { key: "N", label: "average contact force N", color: C.normal, unit: "N", digits: 0 }] });
  const plotFt = createPlot({ title: "Net force vs time during the landing", height: 180,
    series: [{ key: "stiff", label: "stiff legs (0.02 s)", color: C.acc, unit: "N", digits: 0, areaUnit: "N·s", areaMeaning: "impulse = Δp" },
      { key: "soft", label: "your Δt", color: C.normal, unit: "N", digits: 0, areaUnit: "N·s", areaMeaning: "impulse = Δp" }] });
  const updG = () => {
    const v = speedFromDrop(G.h);
    const L = landing({ m: G.m, vImpact: v, stopTime: G.dt });
    outG.replaceChildren(
      readout([["Impact speed", `${fmt(v, 2)} m/s`], ["Δp", `${fmt(L.dp, 1)} kg·m/s`], ["Avg net force", `${fmt(L.Fnet, 0)} N`], ["Avg contact N", `${fmt(L.N, 0)} N`], ["N ÷ weight", `${fmt(L.timesWeight, 1)}×`], ["Stopping distance", `${fmt(L.stopDistance * 100, 1)} cm`]]),
      h("div.eq", { style: { marginTop: "10px" } }, `Δp = m·v = ${fmt(G.m, 0)} × ${fmt(v, 2)} = ${fmt(L.dp, 1)} kg·m/s (up)`),
      h("div.eq", { style: { marginTop: "6px" } }, `ΣF_avg = Δp / Δt = ${fmt(L.dp, 1)} / ${fmt(G.dt, 3)} = ${fmt(L.Fnet, 0)} N`),
      h("div.eq", { style: { marginTop: "6px" } }, `N − m·g = ΣF_avg  →  N = ${fmt(L.Fnet, 0)} + ${fmt(G.m * 9.8, 0)} = ${fmt(L.N, 0)} N`));
    const dts = Array.from({ length: 200 }, (_, i) => 0.01 + i * 0.0025);
    plotG.setData(dts, { net: dts.map(t => L.dp / t), N: dts.map(t => L.dp / t + G.m * 9.8) });
    plotG.setDots([{ x: G.dt, y: L.N, color: C.normal }, { x: G.dt, y: L.Fnet, color: C.ink }]);
    const T = Array.from({ length: 301 }, (_, i) => i * 0.002 - 0.05);
    plotFt.setData(T, { stiff: T.map(t => (t >= 0 && t < 0.02 ? L.dp / 0.02 : 0)), soft: T.map(t => (t >= 0 && t < G.dt ? L.dp / G.dt : 0)) });
  };
  const expG = experiment({
    id: "G", letter: "G", title: "Landing",
    predict: "You land from the same height twice: once with stiff legs (stopping in 0.02 s) and once bending your knees (0.10 s). How do the average forces compare?",
    choices: ["Same force: same height, same momentum", "Bending the knees cuts the force to about one fifth", "Bending the knees doubles the force", "Bending changes the momentum change"],
    controls: [
      slider({ label: "Mass m", unit: "kg", min: 20, max: 120, step: 1, value: G.m, onInput: v => { G.m = v; updG(); } }).el,
      slider({ label: "Drop height (feet first)", unit: "m", min: 0.1, max: 3, step: 0.05, value: G.h, onInput: v => { G.h = v; updG(); } }).el,
      slider({ label: "Stopping time Δt", unit: "s", min: 0.01, max: 0.5, step: 0.005, value: G.dt, onInput: v => { G.dt = v; updG(); } }).el],
    result: outG,
    graph: h("div.stack", { style: { gap: "12px" } }, plotG.el, plotFt.el),
    conclusion: "<b>The net force drops to about one fifth.</b> The momentum change is fixed by the impact speed: Δp = m·v. Impulse = average net force × time, so stretching the stopping time 5× divides the average net force by 5. Use Area on the force–time graph: both rectangles have the same area, Δp. The contact force from the ground is the net force <b>plus</b> m·g, because the ground must also hold up your weight while it stops you.",
    reflection: { q: "Why do gymnastics mats and car airbags reduce injuries even though they don't change how fast you're going when you hit them?", a: "They don't change Δp, but they make the stop take longer (and spread over a larger area). A longer Δt means a smaller average force for the same impulse." }
  });

  const momPanel = h("section.panel",
    h("h3", "Momentum and impulse"),
    h("div.prose", { style: { marginTop: "8px" } },
      h("p", { html: "<b>Momentum</b> p = m·v is a vector. <b>Impulse</b> J = ∫F dt is the area under a force–time graph, and the impulse of the <b>net</b> force equals the change in momentum: J = Δp. For a constant (or average) net force, J = F<sub>net</sub>·Δt." }),
      h("p", { html: "During a landing, keep two forces separate: the <b>net</b> force (ΣF = Δp/Δt) and the ground's <b>contact</b> force N. With up positive, N − mg = Δp/Δt, so N = Δp/Δt + mg. Mixing them up is the most common error on landing problems." })),
    h("div.row", { style: { marginTop: "12px" } }, practiceLink("energy"), practiceLink("momentum", "Momentum problems")));

  root.append(h("div.stack", expG, hsPanel, rotPanel, momPanel));
  updHS(); updG();
  return () => cleanups.forEach(f => f());
}
