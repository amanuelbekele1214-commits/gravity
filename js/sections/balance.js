/** Center of mass and balance: segment model (side view), stance width (front view), prediction game. */
import { h, slider, select, fmt, readout, fitCanvas, onResize } from "../ui/dom.js";
import { FORCE_COLORS, comSymbol, resetLabels, label } from "../ui/draw.js";
import { experiment, sectionHead } from "../ui/experiment.js";
import { practiceLink } from "../state.js";
import { centerOfMass, balanceCheck, SEGMENT_FRACTIONS } from "../physics/rotation.js";
import { progress } from "../progress.js";

const RAD = Math.PI / 180;
const Hb = 1.75;                        // body height used for proportions (m)
const HEEL = -0.06, TOE = 0.20;          // base of support relative to the ankle (m)

/** Segment positions for a pose. Returns joints and point masses. */
export function pose({ m, lean, hip, arm, pack, packSide, masses }) {
  const dir = deg => ({ x: Math.sin(deg * RAD), y: Math.cos(deg * RAD) });   // angle from vertical, + forward
  const add = (p, d, L) => ({ x: p.x + d.x * L, y: p.y + d.y * L });
  const along = (a, b, f) => ({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
  const ankle = { x: 0, y: 0 };
  const legDir = dir(lean), trunkDir = dir(lean + hip);
  const knee = add(ankle, legDir, 0.285 * Hb), hipJ = add(knee, legDir, 0.245 * Hb);
  const shoulder = add(hipJ, trunkDir, 0.288 * Hb);
  const head = add(shoulder, trunkDir, 0.11 * Hb);
  // arm: hanging = opposite the trunk direction, then rotated forward by `arm`
  const armDir = dir(lean + hip + 180 - arm);
  const elbow = add(shoulder, armDir, 0.186 * Hb), hand = add(elbow, armDir, 0.254 * Hb);
  const back = { x: -trunkDir.y, y: trunkDir.x };     // perpendicular toward the back
  const packAt = add(along(hipJ, shoulder, 0.62), back, (packSide === "front" ? -1 : 1) * 0.16);
  const M = masses || defaultMasses(m);
  const parts = [
    { name: "Feet", m: M.feet, ...{ x: (HEEL + TOE) / 2, y: 0.03 } },
    { name: "Shanks", m: M.shanks, ...along(knee, ankle, 0.433) },
    { name: "Thighs", m: M.thighs, ...along(hipJ, knee, 0.433) },
    { name: "Trunk", m: M.trunk, ...along(hipJ, shoulder, 0.5) },
    { name: "Head and neck", m: M.head, ...along(shoulder, head, 0.6) },
    { name: "Upper arms", m: M.upperArms, ...along(shoulder, elbow, 0.436) },
    { name: "Forearms and hands", m: M.forearms, ...along(elbow, hand, 0.682 * 0.6) }
  ];
  if (pack > 0) parts.push({ name: "Backpack", m: pack, ...packAt });
  return { joints: { ankle, knee, hip: hipJ, shoulder, head, elbow, hand }, parts, packAt };
}
export function defaultMasses(m) {
  const F = SEGMENT_FRACTIONS;
  return { feet: 2 * F.foot * m, shanks: 2 * F.shank * m, thighs: 2 * F.thigh * m, trunk: F.trunk * m, head: F.headNeck * m, upperArms: 2 * F.upperArm * m, forearms: 2 * F.forearmHand * m };
}

export function render(root) {
  const C = FORCE_COLORS();
  const cleanups = [];
  root.append(sectionHead("Learn · center of mass", "Center of mass and balance",
    "Your center of mass (COM) is the mass-weighted average position of every part of your body. Standing still works when the point straight below the COM lies inside your <b>base of support</b>, the area under and between your feet."));

  /* ---------- side view segment model ---------- */
  const S = { m: 65, lean: 0, hip: 0, arm: 0, pack: 0, packSide: "back", masses: null, hide: false };
  const cS = h("canvas", { "aria-label": "Side view of the body with segment centers and the overall center of mass" });
  const outS = h("div"), tableBody = h("tbody");
  const ctl = {};
  const sl = (key, label, unit, min, max, step) => (ctl[key] = slider({ label, unit, min, max, step, value: S[key], onInput: v => { S[key] = v; if (key === "m") S.masses = null; upd(); } })).el;

  function upd() {
    const P = pose(S);
    const com = centerOfMass(P.parts);
    const bal = balanceCheck(com.x, HEEL, TOE);
    const { ctx, w, h: H } = fitCanvas(cS);
    ctx.clearRect(0, 0, w, H); resetLabels(ctx);
    const gy = H * 0.88, k = Math.min((gy - 20) / 1.95, w / 2.4), ox = w * 0.45;
    const X = x => ox + x * k, Y = y => gy - y * k;
    // ground + base
    ctx.strokeStyle = C.ink2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, gy); ctx.lineTo(w - 10, gy); ctx.stroke();
    if (!S.hide) {
      ctx.strokeStyle = bal.state === "balanced" ? C.normal : "#ff7b7b"; ctx.lineWidth = 7; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.moveTo(X(HEEL), gy + 4); ctx.lineTo(X(TOE), gy + 4); ctx.stroke(); ctx.globalAlpha = 1;
    }
    // body lines
    const J = P.joints;
    ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round";
    const L = (...pts) => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))); ctx.stroke(); };
    L({ x: HEEL, y: 0 }, { x: TOE, y: 0 }); L(J.ankle, J.knee, J.hip, J.shoulder); L(J.shoulder, J.elbow, J.hand);
    ctx.beginPath(); ctx.arc(X(J.head.x), Y(J.head.y), 0.065 * Hb * k, 0, 7); ctx.fillStyle = C.bg; ctx.fill(); ctx.stroke();
    if (S.pack > 0) { ctx.fillStyle = C.drag; ctx.fillRect(X(P.packAt.x) - 0.08 * k, Y(P.packAt.y) - 0.12 * k, 0.16 * k, 0.24 * k); }
    // segment centers
    for (const p of P.parts) {
      const r = Math.max(2.5, Math.sqrt(p.m) * 1.3);
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), r, 0, 7); ctx.fillStyle = C.applied; ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1;
    }
    if (!S.hide) {
      ctx.setLineDash([4, 5]); ctx.strokeStyle = C.weight; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(X(com.x), Y(com.y)); ctx.lineTo(X(com.x), gy); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.weight; ctx.beginPath(); ctx.moveTo(X(com.x), gy); ctx.lineTo(X(com.x) - 6, gy - 10); ctx.lineTo(X(com.x) + 6, gy - 10); ctx.fill();
      comSymbol(ctx, X(com.x), Y(com.y), 9, C.ink);
      label(ctx, `COM (${fmt(com.x * 100, 1)}, ${fmt(com.y * 100, 1)}) cm`, X(com.x) + 12, Y(com.y) - 14, 0, C.ink);
    } else label(ctx, "COM hidden: make your prediction", 12, 20, 0, C.ink);
    label(ctx, "base of support", X(HEEL), gy + 20, 0, C.muted);

    // table + status
    tableBody.replaceChildren(...P.parts.map((p, i) => h("tr",
      h("td", p.name),
      h("td.n", p.name === "Backpack" ? fmt(p.m, 1)
        : h("input.input", { type: "number", min: 0, step: 0.1, value: p.m.toFixed(1), style: { width: "80px", textAlign: "right" }, "aria-label": `${p.name} mass in kg`,
          onchange: e => {
            const v = parseFloat(e.target.value); if (!(v >= 0)) { e.target.value = p.m.toFixed(1); return; }
            const keys = ["feet", "shanks", "thighs", "trunk", "head", "upperArms", "forearms"];
            S.masses = { ...(S.masses || defaultMasses(S.m)), [keys[i]]: v }; upd();
          } })),
      h("td.n", fmt(p.x * 100, 1)), h("td.n", fmt(p.y * 100, 1)), h("td.n", fmt(p.m * p.x * 100, 1)))));
    if (S.hide) { outS.replaceChildren(h("p.muted", "The COM and the verdict are hidden until you predict.")); return { com, bal }; }
    const step = bal.state === "outside" ? bal.distance : 0;
    outS.replaceChildren(
      readout([["Total mass", `${fmt(com.M, 1)} kg`], ["x_COM", `${fmt(com.x * 100, 1)} cm`], ["y_COM", `${fmt(com.y * 100, 1)} cm`], ["Base", `${HEEL * 100} to ${TOE * 100} cm`]]),
      h("div.eq", { style: { marginTop: "10px" } }, `x_COM = Σ(mᵢxᵢ) / Σmᵢ = ${fmt(P.parts.reduce((s, p) => s + p.m * p.x * 100, 0), 1)} kg·cm / ${fmt(com.M, 1)} kg = ${fmt(com.x * 100, 1)} cm`),
      h("p", { style: { marginTop: "8px" }, html: bal.state === "balanced"
        ? `<span class="pill good">Balanced</span> The COM is above the base, ${fmt(bal.margin * 100, 1)} cm from the nearest edge. The floor's push can line up under the COM, so no net torque.`
        : `<span class="pill bad">Outside the base</span> The COM is ${fmt(step * 100, 1)} cm beyond the ${bal.edge === "front" ? "toes" : "heels"}. As a rigid statue, gravity's torque about that edge would start a rotation. A real person can still recover: <b>step about ${fmt(step * 100 + 3, 0)} cm ${bal.edge === "front" ? "forward" : "back"}</b>, or bend at the hips and move the arms to bring the COM back.` }));
    return { com, bal };
  }

  // prediction game
  const game = h("div.stack", { style: { gap: "8px" } });
  let answer = null;
  const newPose = () => {
    S.lean = Math.round((Math.random() * 20 - 6) * 2) / 2; S.hip = Math.round(Math.random() * 70); S.arm = Math.round(Math.random() * 180);
    S.pack = Math.random() < 0.5 ? 0 : Math.round(Math.random() * 15); S.packSide = Math.random() < 0.5 ? "back" : "front";
    for (const kk of ["lean", "hip", "arm", "pack"]) ctl[kk].set(S[kk], false);
    packSel.set(S.packSide);
    S.hide = true; const r = upd(); answer = r.bal.state;
    game.replaceChildren(h("p", "Will this pose balance with the feet where they are?"),
      h("div.row",
        h("button.btn", { type: "button", onclick: () => reveal("balanced") }, "Balanced"),
        h("button.btn", { type: "button", onclick: () => reveal("outside") }, "Starts to rotate: needs a step")));
  };
  const reveal = guess => {
    S.hide = false; upd();
    const ok = guess === answer;
    progress.recordAnswer({ id: "com-predict", topic: "com", level: 1, ok });
    game.replaceChildren(h("p", { html: ok ? `<span class="pill good">Correct</span> ${answer === "balanced" ? "The COM projection stayed inside the base." : "The COM projection left the base."}` : `<span class="pill bad">Not this time</span> It was ${answer === "balanced" ? "balanced: the COM projection stayed inside the base" : "outside the base"}. Look at where the arms, trunk and pack moved the COM.` }),
      h("div.row", h("button.btn.primary", { type: "button", onclick: newPose }, "Try another pose")));
  };
  game.append(h("div.row", h("button.btn.primary", { type: "button", onclick: newPose }, "Give me a random pose to predict")));
  const packSel = select({ label: "Backpack position", value: S.packSide, options: [["back", "On the back"], ["front", "Carried in front"]], onChange: v => { S.packSide = v; upd(); } });

  const expC = experiment({
    id: "C", letter: "C", title: "Moving the center of mass",
    predict: "Keep your body straight and lean forward from the ankles. At about what lean angle does the COM pass over the toes? (Toes 20 cm ahead of the ankle, COM about 1 m up.)",
    choices: ["About 3°", "About 12°", "About 30°", "About 45°"],
    controls: [sl("lean", "Lean from the ankles", "°", -20, 30, 0.5), sl("hip", "Bend at the hips", "°", 0, 110, 1), sl("arm", "Raise the arms (0 = hanging)", "°", 0, 180, 1),
      sl("pack", "Backpack mass", "kg", 0, 25, 0.5), packSel.el, sl("m", "Body mass", "kg", 30, 120, 1)],
    result: h("div.stack", { style: { gap: "10px" } }, h("div.stage.tall", cS), outS),
    graph: h("div.stack", { style: { gap: "8px" } }, h("h4", "Predict-the-balance game"), game),
    conclusion: "<b>About 12°.</b> The COM is about 1.0 m above the ankle, so its horizontal position is about 1.0·sin θ. It reaches the toes (0.20 m) when sin θ = 0.20/1.0, θ ≈ 11.5°. Bending at the hips moves the trunk forward but pushes the hips back; raising the arms forward or wearing a front pack shifts the COM forward; a heavy backpack shifts it backward. Balance depends on where the COM is <b>relative to the base</b>, not on any one body part.",
    reflection: { q: "Why do people carrying a heavy backpack lean forward?", a: "The pack moves the combined COM backward, toward or past the heels. Leaning the body forward moves the rest of the mass forward so the combined COM is back over the feet." }
  });
  cleanups.push(onResize(cS.parentElement, upd));

  const segTable = h("section.panel",
    h("h3", "Segment table: edit the masses"),
    h("p.sub", "Each body segment is a point mass at its own center (approximate Dempster/Winter data). Change any mass to see the COM move. x is measured forward from the ankle, y up from the floor."),
    h("div.table-wrap", { style: { marginTop: "10px" } }, h("table.data",
      h("thead", h("tr", h("th", "Segment"), h("th.n", "Mass (kg)"), h("th.n", "x (cm)"), h("th.n", "y (cm)"), h("th.n", "m·x (kg·cm)"))), tableBody)),
    h("div.row", { style: { marginTop: "10px" } }, h("button.btn.small", { type: "button", onclick: () => { S.masses = null; upd(); } }, "Reset masses")));

  /* ---------- front view: stance width ---------- */
  const Fv = { stance: 0.2, side: 0 };
  const cF = h("canvas", { "aria-label": "Front view: stance width and sideways lean" });
  const outF = h("div");
  const updF = () => {
    const footW = 0.1, half = Fv.stance / 2 + footW / 2;
    const comX = 1.0 * Math.sin(Fv.side * RAD);
    const bal = balanceCheck(comX, -half, half);
    const { ctx, w, h: H } = fitCanvas(cF);
    ctx.clearRect(0, 0, w, H); resetLabels(ctx);
    const gy = H * 0.88, k = Math.min((gy - 20) / 1.9, w / 1.6), ox = w / 2;
    const X = x => ox + x * k, Y = y => gy - y * k;
    ctx.strokeStyle = C.ink2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, gy); ctx.lineTo(w - 10, gy); ctx.stroke();
    ctx.strokeStyle = bal.state === "balanced" ? C.normal : "#ff7b7b"; ctx.lineWidth = 7; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.moveTo(X(-half), gy + 4); ctx.lineTo(X(half), gy + 4); ctx.stroke(); ctx.globalAlpha = 1;
    const s = Math.sin(Fv.side * RAD), c = Math.cos(Fv.side * RAD);
    const hipC = { x: 0.93 * s, y: 0.93 * c }, top = { x: 1.5 * s, y: 1.5 * c }, headC = { x: 1.64 * s, y: 1.64 * c };
    ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.lineCap = "round";
    for (const fx of [-Fv.stance / 2, Fv.stance / 2]) {
      ctx.beginPath(); ctx.moveTo(X(fx - footW / 2), gy); ctx.lineTo(X(fx + footW / 2), gy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X(fx), gy); ctx.lineTo(X(hipC.x + fx * 0.4), Y(hipC.y)); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(X(hipC.x), Y(hipC.y)); ctx.lineTo(X(top.x), Y(top.y)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X(top.x - 0.2 * c), Y(top.y + 0.2 * s)); ctx.lineTo(X(top.x + 0.2 * c), Y(top.y - 0.2 * s)); ctx.stroke();
    ctx.beginPath(); ctx.arc(X(headC.x), Y(headC.y), 0.11 * k, 0, 7); ctx.fillStyle = C.bg; ctx.fill(); ctx.stroke();
    ctx.setLineDash([4, 5]); ctx.strokeStyle = C.weight; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(X(comX), Y(1.0 * c)); ctx.lineTo(X(comX), gy); ctx.stroke(); ctx.setLineDash([]);
    comSymbol(ctx, X(comX), Y(1.0 * c), 9, C.ink);
    const maxLean = Math.asin(Math.min(1, half / 1.0)) / RAD;
    outF.replaceChildren(readout([["Base width", `${fmt(2 * half * 100, 0)} cm`], ["Max sideways lean", `${fmt(maxLean, 1)}°`], ["State", bal.state === "balanced" ? "Balanced" : "Outside the base"]]),
      h("p.small", { style: { marginTop: "8px" } }, "Wider feet widen the base, so the COM can move farther sideways before it leaves it. That is why people stand with their feet apart on a moving bus."));
  };
  const front = h("section.panel",
    h("h3", "Front view: why feet apart helps"),
    h("div.cols", { style: { marginTop: "12px" } },
      h("div.stack", { style: { gap: "10px" } },
        slider({ label: "Distance between the feet", unit: "m", min: 0, max: 0.7, step: 0.01, value: Fv.stance, onInput: v => { Fv.stance = v; updF(); } }).el,
        slider({ label: "Sideways lean", unit: "°", min: -25, max: 25, step: 0.5, value: Fv.side, onInput: v => { Fv.side = v; updF(); } }).el,
        outF),
      h("div.stage.tall", cF)));
  cleanups.push(onResize(cF.parentElement, updF));

  const teach = h("section.panel",
    h("h3", "What to remember"),
    h("div.prose", { style: { marginTop: "8px" } },
      h("p", { html: "<b>Projection matters, not height alone.</b> Drop a vertical line from the COM. If it hits the ground inside the base, the floor can push directly under the COM and the torques balance." }),
      h("p", { html: "<b>Leaning shifts the COM</b> horizontally by about (COM height)·sin θ, so a tall COM leaves the base at a smaller angle." }),
      h("p", { html: "<b>Moving the arms or legs moves the COM</b>, because the COM is a mass-weighted average. Arms are about 10% of body mass, so swinging them shifts the COM a few centimetres: enough to save a near-fall." }),
      h("p", { html: "<b>Outside the base is not a guaranteed fall.</b> A rigid statue would rotate, but people step to make a new base, bend at the hips, or grab something. Falls happen when the COM moves out faster than a step can catch it." })),
    h("div.row", { style: { marginTop: "12px" } }, practiceLink("com")));

  root.append(h("div.stack", expC, segTable, front, teach));
  upd(); updF();
  return () => cleanups.forEach(f => f());
}
