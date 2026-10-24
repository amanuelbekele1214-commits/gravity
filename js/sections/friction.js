/** Friction and slipping: Experiment B and the tip-or-slip question. */
import { h, slider, fmt, readout, onResize, fitCanvas } from "../ui/dom.js";
import { createPlot } from "../ui/plot.js";
import { drawFBD } from "../ui/fbd.js";
import { FORCE_COLORS, arrow, resetLabels, comSymbol, label } from "../ui/draw.js";
import { experiment, sectionHead } from "../ui/experiment.js";
import { practiceLink } from "../state.js";
import { friction } from "../physics/forces.js";

export function render(root) {
  const C = FORCE_COLORS();
  const cleanups = [];
  root.append(sectionHead("Learn · friction", "Friction and slipping",
    "Most falls start at the feet: either friction can't hold them (a slip) or friction holds them so well that the body rotates over them (a trip). Both depend on the same rule: static friction can supply anything up to μ<sub>s</sub>N, and no more."));

  /* ---------- Experiment B ---------- */
  const B = { m: 60, muS: 0.5, muK: 0.35, F: 0 };
  let ramp = 0;
  const cB = h("canvas", { "aria-label": "Person being pushed: forces" });
  const outB = h("div");
  const plotB = createPlot({ title: "Friction vs push", xName: "F", xUnit: "N", xDigits: 0, xLabel: "push F (N)", height: 210,
    series: [{ key: "f", label: "|friction|", color: C.friction, unit: "N", digits: 0 }, { key: "F", label: "push", color: C.applied, unit: "N", digits: 0, dash: [5, 4] }] });
  const fSlider = slider({ label: "Push F (at the hips)", unit: "N", min: 0, max: 900, step: 1, value: 0, onInput: v => { B.F = v; cancelAnimationFrame(ramp); updB(); } });
  const updB = () => {
    const N = B.m * 9.8, r = friction({ F: B.F, N, muS: B.muS, muK: B.muK, m: B.m });
    drawFBD(cB, [
      { sym: "Fg", x: 0, y: -N, at: "com", color: C.weight, label: `Fg ${fmt(N, 0)} N` },
      { sym: "N", x: 0, y: N, at: "feet", color: C.normal, label: `N ${fmt(N, 0)} N`, side: -1 },
      { sym: "F", x: B.F, y: 0, at: "back", color: C.applied, label: `F ${fmt(B.F, 0)} N` },
      { sym: "f", x: r.f, y: 0, at: "feet", color: C.friction, label: `f ${fmt(Math.abs(r.f), 0)} N ${r.slipping ? "(kinetic)" : "(static)"}` }],
      { v: { x: r.slipping ? 1 : 0, y: 0 }, a: { x: r.ax, y: 0 } });
    outB.replaceChildren(readout([["μs·N", `${fmt(r.fsMax, 0)} N`], ["μk·N", `${fmt(r.fk, 0)} N`], ["Friction", `${fmt(Math.abs(r.f), 0)} N`], ["State", r.slipping ? "Sliding" : "Holding"], ["Acceleration", `${fmt(r.ax, 2)} m/s²`]]));
    const Fs = Array.from({ length: 451 }, (_, i) => i * 2);
    plotB.setData(Fs, { f: Fs.map(F => Math.abs(friction({ F, N, muS: B.muS, muK: B.muK }).f)), F: Fs });
    plotB.setDots([{ x: B.F, y: Math.abs(r.f), color: C.friction }]);
  };
  const rampBtn = h("button.btn", { type: "button" }, "Ramp the push up slowly");
  rampBtn.addEventListener("click", () => {
    cancelAnimationFrame(ramp);
    const N = B.m * 9.8, end = Math.min(900, 1.4 * B.muS * N), t0 = performance.now();
    const step = now => {
      const F = Math.min(end, ((now - t0) / 4000) * end);
      B.F = Math.round(F); fSlider.set(B.F, false); updB();
      if (F < end) ramp = requestAnimationFrame(step);
    };
    ramp = requestAnimationFrame(step);
  });
  const expB = experiment({
    id: "B", letter: "B", title: "Friction and slipping",
    predict: "A person stands on a floor and you push them sideways, harder and harder. When do their feet start to slide?",
    choices: ["As soon as there is any push", "When the push reaches μk·N", "When the push reaches μs·N", "Never, friction always matches the push"],
    controls: [
      slider({ label: "Mass m", unit: "kg", min: 20, max: 120, step: 1, value: B.m, onInput: v => { B.m = v; updB(); } }).el,
      slider({ label: "μs", unit: "", min: 0.05, max: 1.2, step: 0.01, value: B.muS, onInput: v => { B.muS = v; if (B.muK > v) B.muK = v; updB(); } }).el,
      slider({ label: "μk", unit: "", min: 0.02, max: 1.2, step: 0.01, value: B.muK, onInput: v => { B.muK = Math.min(v, B.muS); updB(); } }).el,
      fSlider.el, h("div.row", rampBtn)],
    result: h("div.stack", { style: { gap: "10px" } }, h("div.stage.tall", cB), outB),
    graph: plotB.el,
    conclusion: "<b>Slipping starts when the push exceeds μ<sub>s</sub>N.</b> Below that, the friction line rises at 45°: static friction equals the push exactly. At μ<sub>s</sub>N the line drops to μ<sub>k</sub>N and stays flat, because kinetic friction does not depend on how hard you push. That drop is why a slip, once started, is hard to stop: the feet now have less grip than they had a moment ago.",
    reflection: { q: "Why is it easier to keep a heavy box sliding than to start it sliding?", a: "Starting it requires a push greater than μs·N. Once it moves, friction falls to μk·N, which is smaller because μk < μs, so less push is needed to keep it moving (and any extra push accelerates it)." }
  });
  cleanups.push(onResize(cB.parentElement, updB), () => cancelAnimationFrame(ramp));

  /* ---------- tip or slip ---------- */
  const T = { m: 60, base: 0.26, hp: 1.0, muS: 0.6 };
  const cT = h("canvas", { "aria-label": "Tip or slip diagram" });
  const outT = h("div");
  const updT = () => {
    const W = T.m * 9.8, Fslip = T.muS * W, Ftip = W * (T.base / 2) / T.hp;
    const first = Ftip < Fslip ? "tip" : "slip";
    const { ctx, w, h: H } = fitCanvas(cT);
    ctx.clearRect(0, 0, w, H); resetLabels(ctx);
    const gy = H * 0.86, k = Math.min((gy - 30) / Math.max(T.hp + 0.3, 1.9), w / 2.2);
    const bw = T.base * k, bh = 1.75 * k * 0.98, x0 = w * 0.45 - bw / 2;
    ctx.strokeStyle = C.ink2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, gy); ctx.lineTo(w - 10, gy); ctx.stroke();
    ctx.fillStyle = C.panel; ctx.fillRect(x0, gy - bh, bw, bh); ctx.strokeStyle = C.ink; ctx.strokeRect(x0, gy - bh, bw, bh);
    const comY = gy - bh * 0.56;
    comSymbol(ctx, x0 + bw / 2, comY, 6, C.ink);
    const py = gy - T.hp * k;
    arrow(ctx, x0 - 90, py, x0, py, { color: C.applied, width: 3.5, label: "F" });
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x0 + bw, gy, 5, 0, 7); ctx.fill();
    label(ctx, "tipping edge", x0 + bw + 8, gy - 14, 0, C.ink2);
    ctx.setLineDash([3, 4]); ctx.strokeStyle = C.weight; ctx.beginPath(); ctx.moveTo(x0 + bw / 2, comY); ctx.lineTo(x0 + bw / 2, gy); ctx.stroke(); ctx.setLineDash([]);
    outT.replaceChildren(
      readout([["Push to slide", `${fmt(Fslip, 0)} N`], ["Push to tip", `${fmt(Ftip, 0)} N`], ["Happens first", first === "tip" ? "Tips over" : "Slides"]]),
      h("div.eq", { style: { marginTop: "10px" } }, `Slide when F > μs·m·g = ${fmt(T.muS, 2)} × ${fmt(W, 0)} = ${fmt(Fslip, 0)} N`),
      h("div.eq", { style: { marginTop: "6px" } }, `Tip when F·h > m·g·(b/2)  →  F > ${fmt(W, 0)} × ${fmt(T.base / 2, 3)} / ${fmt(T.hp, 2)} = ${fmt(Ftip, 0)} N`),
      h("p", { style: { marginTop: "8px" }, html: first === "tip"
        ? "The push wins the torque battle before it wins the friction battle: the body <b>rotates over the front edge</b> while the feet stay put. This is a trip-type fall."
        : "Friction gives out before the torque from the push can lift the back edge: the feet <b>slide</b>. Lower μ (ice, wet tile) or a lower push point makes this more likely." }));
  };
  const tip = h("section.panel",
    h("h3", "Tip or slip? Torque against friction"),
    h("p.sub", { html: "Treat the person as a rigid block with a base of width b (foot length) and the push applied at height h. About the front edge, the push's torque is F·h and gravity's restoring torque is m·g·(b/2). Compare the force needed to tip with the force needed to slide." }),
    h("div.cols", { style: { marginTop: "14px" } },
      h("div.stack", { style: { gap: "10px" } },
        slider({ label: "Mass m", unit: "kg", min: 20, max: 120, step: 1, value: T.m, onInput: v => { T.m = v; updT(); } }).el,
        slider({ label: "Base width b", unit: "m", min: 0.1, max: 0.8, step: 0.01, value: T.base, onInput: v => { T.base = v; updT(); } }).el,
        slider({ label: "Push height h", unit: "m", min: 0.05, max: 1.7, step: 0.01, value: T.hp, onInput: v => { T.hp = v; updT(); } }).el,
        slider({ label: "μs", unit: "", min: 0.02, max: 1.2, step: 0.01, value: T.muS, onInput: v => { T.muS = v; updT(); } }).el,
        outT),
      h("div.stage.tall", cT)));
  cleanups.push(onResize(cT.parentElement, updT));

  const worked = h("section.panel",
    h("h3", "Worked example: sliding to a stop"),
    h("div.worked", { style: { marginTop: "10px" } },
      h("p", "A 50 kg skater glides onto a rough patch at 3.0 m/s. μk = 0.25. How far until she stops?"),
      h("div.eq", "Vertical: N = m·g. Horizontal: −μk·N = m·a  →  a = −μk·g = −0.25 × 9.8 = −2.45 m/s²"),
      h("div.eq", "v² = v₀² + 2aΔx  →  0 = 3.0² + 2(−2.45)Δx  →  Δx = 9.0 / 4.9 = 1.84 m"),
      h("p", { html: "The mass cancels: heavier people have more friction but also more inertia. A common mistake is to use μ<sub>s</sub>, which only applies before sliding starts." })),
    h("div.row", { style: { marginTop: "12px" } }, practiceLink("friction")));

  root.append(h("div.stack", expB, tip, worked));
  updB(); updT();
  return () => cleanups.forEach(f => f());
}
