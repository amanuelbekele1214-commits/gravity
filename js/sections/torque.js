/** Torque and rotational motion. Clockwise is positive in this lab. */
import { h, slider, select, fmt, readout, fitCanvas, onResize, sig } from "../ui/dom.js";
import { createPlot } from "../ui/plot.js";
import { FORCE_COLORS, arrow, comSymbol, resetLabels, label, rotationArrow } from "../ui/draw.js";
import { experiment, sectionHead } from "../ui/experiment.js";
import { practiceLink } from "../state.js";
import { torque2D, inertia } from "../physics/rotation.js";
import { progress } from "../progress.js";

const RAD = Math.PI / 180;
const PIVOTS = { toe: 0.20, ankle: 0, heel: -0.06 };

export function render(root) {
  const C = FORCE_COLORS();
  const cleanups = [];
  root.append(sectionHead("Learn · Unit 5: Torque and rotational dynamics", "Torque and rotation",
    "Torque measures how strongly a force tends to rotate something about a pivot: τ = rF sin θ, or force × lever arm. A falling person is a rotation problem: gravity's torque about the edge of the foot decides whether they swing back or keep going."));

  const T = { m: 65, H: 1.75, s: 0.57, lean: 8, pivot: "toe", F: 0, dir: 0, at: 0.8 };
  const cv = h("canvas", { "aria-label": "Leaning body with torque vectors" });
  const out = h("div");
  const graph = createPlot({ title: "Gravity's torque about the pivot vs lean angle", xName: "θ", xUnit: "°", xDigits: 1, xLabel: "lean θ (°)", height: 210,
    series: [{ key: "tau", label: "τ gravity", color: C.weight, unit: "N·m", digits: 1 }] });

  function calc() {
    const xp = PIVOTS[T.pivot];
    const u = { x: Math.sin(T.lean * RAD), y: Math.cos(T.lean * RAD) };
    const com = { x: T.s * T.H * u.x, y: T.s * T.H * u.y };
    const pF = { x: T.at * T.H * u.x, y: T.at * T.H * u.y };
    const g = 9.8, Fg = { x: 0, y: -T.m * g };
    const tg = torque2D(com.x - xp, com.y, Fg.x, Fg.y);
    const Fv = { x: T.F * Math.cos(T.dir * RAD), y: T.F * Math.sin(T.dir * RAD) };
    const tf = torque2D(pF.x - xp, pF.y, Fv.x, Fv.y);
    const d = Math.hypot(com.x - xp, com.y);
    const I = inertia.parallelAxis((T.m * T.H * T.H) / 12, T.m, d);
    const net = tg.cw + tf.cw;
    // angle between r (pivot → force point) and F
    const rF = { x: pF.x - xp, y: pF.y };
    let ang = 0;
    if (T.F > 0) {
      const dot = rF.x * Fv.x + rF.y * Fv.y;
      ang = Math.acos(Math.max(-1, Math.min(1, dot / (Math.hypot(rF.x, rF.y) * T.F)))) / RAD;
    }
    return { xp, u, com, pF, tg, tf, Fv, d, I, net, alpha: net / I, rF, ang };
  }

  function draw() {
    const r = calc();
    const { ctx, w, h: H } = fitCanvas(cv);
    ctx.clearRect(0, 0, w, H); resetLabels(ctx);
    const gy = H * 0.86, k = Math.min((gy - 30) / 1.95, w / 2.6), ox = w * 0.4;
    const X = x => ox + x * k, Y = y => gy - y * k;
    ctx.strokeStyle = C.ink2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, gy); ctx.lineTo(w - 10, gy); ctx.stroke();
    // body
    ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(X(-0.06), gy); ctx.lineTo(X(0.2), gy); ctx.stroke();
    const top = { x: T.H * 0.93 * r.u.x, y: T.H * 0.93 * r.u.y };
    ctx.beginPath(); ctx.moveTo(X(0), gy); ctx.lineTo(X(top.x), Y(top.y)); ctx.stroke();
    ctx.beginPath(); ctx.arc(X(T.H * 0.935 * r.u.x), Y(T.H * 0.935 * r.u.y), 0.065 * T.H * k, 0, 7); ctx.fillStyle = C.bg; ctx.fill(); ctx.stroke();
    // pivot
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(X(r.xp), gy, 6, 0, 7); ctx.fill();
    label(ctx, `pivot (${T.pivot})`, X(r.xp) + 8, gy + 18, 0, C.ink2);
    // r to COM
    ctx.setLineDash([2, 3]); ctx.strokeStyle = C.ink2; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(X(r.xp), gy); ctx.lineTo(X(r.com.x), Y(r.com.y)); ctx.stroke();
    // gravity line of action + lever arm
    ctx.setLineDash([5, 5]); ctx.strokeStyle = C.weight;
    ctx.beginPath(); ctx.moveTo(X(r.com.x), 8); ctx.lineTo(X(r.com.x), gy); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = C.weight; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(r.xp), gy - 4); ctx.lineTo(X(r.com.x), gy - 4); ctx.stroke();
    if (Math.abs(r.com.x - r.xp) > 0.005) label(ctx, `lever arm ${fmt(Math.abs(r.com.x - r.xp) * 100, 1)} cm`, Math.min(X(r.xp), X(r.com.x)), gy - 22, 0, C.weight);
    arrow(ctx, X(r.com.x), Y(r.com.y), X(r.com.x), Y(r.com.y) + 80, { color: C.weight, width: 3.5, label: `Fg ${fmt(T.m * 9.8, 0)} N` });
    comSymbol(ctx, X(r.com.x), Y(r.com.y), 7, C.ink);
    // applied force
    if (T.F > 0) {
      const len = Math.min(140, 30 + T.F / 4);
      const ux = Math.cos(T.dir * RAD), uy = Math.sin(T.dir * RAD);
      const px = X(r.pF.x), py = Y(r.pF.y);
      ctx.setLineDash([2, 6]); ctx.strokeStyle = C.applied; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(px - ux * 900, py + uy * 900); ctx.lineTo(px + ux * 900, py - uy * 900); ctx.stroke(); ctx.setLineDash([]);
      // perpendicular from pivot to the line of action
      const t = ((X(r.xp) - px) * ux + (gy - py) * -uy);
      const fx = px + ux * t, fy = py - uy * t;
      ctx.strokeStyle = C.applied; ctx.lineWidth = 2; ctx.setLineDash([1, 3]);
      ctx.beginPath(); ctx.moveTo(X(r.xp), gy); ctx.lineTo(fx, fy); ctx.stroke(); ctx.setLineDash([]);
      label(ctx, `lever arm ${fmt(r.tf.leverArm * 100, 1)} cm`, (X(r.xp) + fx) / 2 + 6, (gy + fy) / 2, 0, C.applied);
      ctx.strokeStyle = C.ink2; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(X(r.xp), gy); ctx.lineTo(px, py); ctx.stroke(); ctx.setLineDash([]);
      arrow(ctx, px, py, px + ux * len, py - uy * len, { color: C.applied, width: 3.5, label: `F ${fmt(T.F, 0)} N` });
    }
    if (Math.abs(r.net) > 0.5) rotationArrow(ctx, X(r.xp), gy - 40, 28, r.net > 0, C.ink, r.net > 0 ? "clockwise" : "counterclockwise");

    out.replaceChildren(
      readout([["τ gravity", `${fmt(r.tg.cw, 1)} N·m`], ["τ push", `${fmt(r.tf.cw, 1)} N·m`], ["Net torque Στ", `${fmt(r.net, 1)} N·m`],
        ["I about pivot", `${fmt(r.I, 1)} kg·m²`], ["α = Στ / I", `${fmt(r.alpha, 2)} rad/s²`], ["Direction", Math.abs(r.net) < 0.05 ? "balanced" : r.net > 0 ? "clockwise (falls forward)" : "counterclockwise (falls back)"]]),
      h("div.eq", { style: { marginTop: "10px" } }, `τ_g = m·g·d = ${fmt(T.m, 0)} × 9.8 × ${fmt(r.com.x - r.xp, 3)} = ${fmt(r.tg.cw, 1)} N·m   (d = x_COM − x_pivot)`),
      T.F > 0 ? h("div.eq", { style: { marginTop: "6px" } }, `τ_F = r·F·sin θ = ${fmt(Math.hypot(r.rF.x, r.rF.y), 3)} × ${fmt(T.F, 0)} × sin ${fmt(r.ang, 1)}° = ${fmt(Math.abs(r.tf.cw), 1)} N·m ${r.tf.cw >= 0 ? "(cw)" : "(ccw)"}`) : null,
      h("div.eq", { style: { marginTop: "6px" } }, `I = I_COM + m·d² = ${fmt(T.m * T.H * T.H / 12, 1)} + ${fmt(T.m, 0)} × ${fmt(r.d, 3)}² = ${fmt(r.I, 1)} kg·m²  (uniform-rod model)`));

    const angles = Array.from({ length: 151 }, (_, i) => -30 + i * 0.5);
    graph.setData(angles, { tau: angles.map(a => T.m * 9.8 * (T.s * T.H * Math.sin(a * RAD) - r.xp)) });
    graph.setDots([{ x: T.lean, y: r.tg.cw, color: C.weight }]);
  }

  const balanceAngle = () => Math.asin(Math.max(-1, Math.min(1, PIVOTS[T.pivot] / (T.s * T.H)))) / RAD;
  const expD = experiment({
    id: "D", letter: "D", title: "Torque and lever arm",
    predict: "Standing straight, you lean forward a little from the ankles. If you double the lean angle (still small), gravity's torque about your ankles…",
    choices: ["stays the same", "roughly doubles", "roughly quadruples", "drops to zero"],
    controls: [
      select({ label: "Pivot", value: T.pivot, options: [["toe", "Toe edge (tipping forward)"], ["ankle", "Ankle"], ["heel", "Heel edge (tipping back)"]], onChange: v => { T.pivot = v; draw(); } }).el,
      slider({ label: "Lean angle θ (+ forward)", unit: "°", min: -30, max: 45, step: 0.5, value: T.lean, onInput: v => { T.lean = v; draw(); } }).el,
      slider({ label: "Mass m", unit: "kg", min: 20, max: 120, step: 1, value: T.m, onInput: v => { T.m = v; draw(); } }).el,
      slider({ label: "COM height (fraction of height)", unit: "", min: 0.4, max: 0.7, step: 0.01, value: T.s, onInput: v => { T.s = v; draw(); } }).el,
      slider({ label: "Push F", unit: "N", min: 0, max: 400, step: 1, value: T.F, onInput: v => { T.F = v; draw(); } }).el,
      slider({ label: "Push direction (0° = right, 90° = up)", unit: "°", min: 0, max: 359, step: 1, value: T.dir, onInput: v => { T.dir = v; draw(); } }).el,
      slider({ label: "Push applied at (fraction of height)", unit: "", min: 0.1, max: 1, step: 0.01, value: T.at, onInput: v => { T.at = v; draw(); } }).el],
    result: h("div.stack", { style: { gap: "10px" } }, h("div.stage.tall", cv), out),
    graph: graph.el,
    conclusion: "<b>It roughly doubles.</b> Gravity acts straight down through the COM, so its lever arm is the horizontal distance from the pivot to the COM: d = (COM height)·sin θ. For small angles sin θ ≈ θ, so d and τ = m·g·d grow in proportion to the lean. On the graph the torque about the ankle is a sine curve through zero at θ = 0. About the toe it crosses zero where the COM is right above the toe; beyond that crossing the torque turns clockwise and the body tips forward.",
    reflection: { q: "Why is a crouching person harder to tip over than a standing person with the same feet?", a: "A lower COM means a smaller lever arm for the same lean, and the COM must tilt through a larger angle before it passes over the edge of the base (sin θ = edge distance / COM height). So crouching raises the tipping angle and lowers gravity's tipping torque." }
  });
  cleanups.push(onResize(cv.parentElement, draw));

  /* ---------- predict the torque drill ---------- */
  const drill = h("div.stack", { style: { gap: "10px" } });
  let q = null;
  const newQ = () => {
    const m = 40 + Math.round(Math.random() * 50), d = Math.round((0.03 + Math.random() * 0.25) * 100) / 100;
    q = { m, d, ans: m * 9.8 * d };
    const inp = h("input.input", { type: "text", inputmode: "decimal", "aria-label": "Your torque in newton-metres", style: { width: "140px" } });
    const fb = h("div");
    const check = () => {
      const v = parseFloat(inp.value.replace(/,/g, ""));
      if (!Number.isFinite(v)) { fb.innerHTML = `<p class="muted">Enter a number in N·m.</p>`; return; }
      const ok = Math.abs(v - q.ans) <= 0.03 * q.ans;
      progress.recordAnswer({ id: "torque-drill", topic: "torque", level: 1, ok });
      fb.replaceChildren(h("div.feedback" + (ok ? ".good" : ".bad"),
        h("b", ok ? "Correct." : "Not quite."),
        h("div.eq", `τ = m·g·d = ${q.m} × 9.8 × ${q.d} = ${sig(q.ans, 3)} N·m`),
        !ok && Math.abs(v - q.m * q.d) < 0.03 * q.m * q.d ? h("p", "You multiplied mass by distance. Torque needs a force: use the weight m·g, not the mass.") : null,
        !ok && Math.abs(v - q.ans / 100) < 0.03 * q.ans / 100 ? h("p", "Check your units: the distance must be in metres.") : null),
        h("div.row", { style: { marginTop: "8px" } }, h("button.btn.primary", { type: "button", onclick: newQ }, "Next one")));
    };
    drill.replaceChildren(
      h("p", { html: `A <b>${m} kg</b> person's COM is <b>${fmt(d * 100, 0)} cm</b> horizontally in front of their toes. What is the size of gravity's torque about the toes?` }),
      h("div.answer-row", inp, h("span.muted", "N·m"), h("button.btn.primary", { type: "button", onclick: check }, "Check")), fb);
    inp.addEventListener("keydown", e => { if (e.key === "Enter") check(); });
  };
  newQ();

  const concepts = h("section.panel",
    h("h3", "Rotation rules to know"),
    h("div.cols", { style: { marginTop: "10px" } },
      h("div.prose",
        h("p", { html: "<b>Signs.</b> Pick one rotation direction as positive and stick to it. This lab uses <b>clockwise +</b> because the person falls forward to the right. Gravity on a COM in front of the pivot gives clockwise torque; behind the pivot, counterclockwise." }),
        h("p", { html: "<b>Rotational second law.</b> For rotation about a fixed axis, Στ = I·α. A bigger moment of inertia means a smaller angular acceleration for the same torque. For a point mass I = m·r²; for a rigid body use the parallel-axis theorem I = I<sub>COM</sub> + m·d²." }),
        h("p", { html: "<b>Torque sets α, not ω.</b> If the net torque points opposite the rotation, the body keeps turning but slows down. Example: a person tipping back toward balance has ω forward-to-back while gravity's torque already points the other way once the COM passes over the foot." })),
      h("div.stack", { style: { gap: "10px" } }, h("h4", "Predict the torque"), drill)),
    h("div.row", { style: { marginTop: "12px" } }, practiceLink("torque"), practiceLink("rotation", "Rotation problems")));

  root.append(h("div.stack", expD, concepts));
  draw();
  void balanceAngle;
  return () => cleanups.forEach(f => f());
}
