/** Interactive fall simulator: controls, animation, phases, synchronized graphs. */
import { h, slider, select, chip, fmt, readout, fitCanvas, onResize } from "../ui/dom.js";
import { createPlot } from "../ui/plot.js";
import { FORCE_COLORS, arrow, comSymbol, camera, ground, grid, person, rotationArrow, label, resetLabels } from "../ui/draw.js";
import { simulate, sampleAt, pointWorld, PHASE_INFO, DEFAULTS } from "../physics/fallSim.js";
import { SURFACES } from "../physics/forces.js";

const PRESETS = [
  ["Standing still", {}],
  ["Lean 8°: balanced", { leanDeg: 8 }],
  ["Lean 15°: tips over", { leanDeg: 15 }],
  ["Lean back 12°", { leanDeg: -12 }],
  ["Push on concrete", { F: 300, pushTime: 0.25 }],
  ["Same push on ice", { F: 300, pushTime: 0.25, surface: "ice" }],
  ["Trip while sliding", { v0x: 3 }],
  ["Slide on ice", { v0x: 3, surface: "ice", duration: 4 }],
  ["Jump up", { v0y: 2.5 }],
  ["Drop from 1 m", { h0: 1 }],
  ["Fall from 3 m with drag", { h0: 3, drag: "quadratic" }]
];

export function render(root) {
  // ---------- parameters ----------
  const P = { ...DEFAULTS, drag: { ...DEFAULTS.drag }, surface: "rubberConcrete" };
  let result = null, t = 0, playing = false, speed = 1, slow = false, raf = 0, lastFrame = 0, frameCount = 0;
  const show = { weight: true, normal: true, friction: true, applied: true, drag: true, net: false, vel: true, acc: false, gline: true, lever: true };

  const head = h("header.section-head",
    h("span.kicker", "Simulate"),
    h("h2", "Fall simulator"),
    h("p", "A person modeled as one rigid body. Change the lean, the push, the floor or the starting motion, then watch which forces act and why the body stands, rotates, slides, flies or lands. Every number and graph comes from the same calculation."));

  const presetRow = h("div.chips", { role: "group", "aria-label": "Scenarios" });

  // stage
  const canvas = h("canvas", { role: "img", "aria-label": "Animation of the person and the forces on them" });
  const stage = h("div.stage", canvas);

  // transport
  const startBtn = h("button.btn.primary", { type: "button" }, "▶ Start");
  const pauseBtn = h("button.btn", { type: "button", disabled: true }, "❚❚ Pause");
  const stepBtn = h("button.btn", { type: "button", title: "Advance one frame (0.01 s)" }, "Step +0.01 s");
  const resetBtn = h("button.btn", { type: "button", title: "Stop and return to t = 0" }, "↺ Reset");
  const slowBtn = h("button.btn", { type: "button", "aria-pressed": "false", title: "Play at quarter speed" }, "Slow motion");
  const speedSel = h("select.input", { "aria-label": "Playback speed", style: { width: "auto" } },
    [["0.1", "0.1×"], ["0.25", "0.25×"], ["0.5", "0.5×"], ["1", "1×"], ["2", "2×"]].map(([v, l]) => h("option", { value: v }, l)));
  speedSel.value = "1";
  const scrub = h("input", { type: "range", min: 0, max: P.duration, step: 0.005, value: 0, "aria-label": "Simulation time" });
  const tLabel = h("span.mono", { style: { minWidth: "88px" } }, "t = 0.000 s");
  const transport = h("div.transport", startBtn, pauseBtn, stepBtn, resetBtn, slowBtn, speedSel, scrub, tLabel);

  const C0 = FORCE_COLORS();
  const toggles = h("div.chips", { role: "group", "aria-label": "Show or hide arrows" },
    chip("Weight Fg", { color: C0.weight, onToggle: v => { show.weight = v; drawFrame(); } }),
    chip("Normal N", { color: C0.normal, onToggle: v => { show.normal = v; drawFrame(); } }),
    chip("Friction f", { color: C0.friction, onToggle: v => { show.friction = v; drawFrame(); } }),
    chip("Push F", { color: C0.applied, onToggle: v => { show.applied = v; drawFrame(); } }),
    chip("Air drag", { color: C0.drag, onToggle: v => { show.drag = v; drawFrame(); } }),
    chip("Net force ΣF", { color: C0.net, pressed: false, onToggle: v => { show.net = v; drawFrame(); } }),
    chip("Velocity v", { color: C0.vel, onToggle: v => { show.vel = v; drawFrame(); } }),
    chip("Acceleration a", { color: C0.acc, pressed: false, onToggle: v => { show.acc = v; drawFrame(); } }),
    chip("Line of gravity", { onToggle: v => { show.gline = v; drawFrame(); } }),
    chip("Lever arm d", { onToggle: v => { show.lever = v; drawFrame(); } }));

  const R = readout([
    ["Situation", "—", "r-phase", true], ["Time", "—", "r-t"], ["COM x, y", "—", "r-pos"], ["Velocity", "—", "r-v"],
    ["Acceleration", "—", "r-a"], ["Normal N", "—", "r-N"], ["Friction f", "—", "r-f"], ["Max static μsN", "—", "r-fmax"],
    ["Net force", "—", "r-F"], ["Tilt θ", "—", "r-th"], ["ω", "—", "r-w"], ["α", "—", "r-al"],
    ["τ gravity (edge)", "—", "r-tau"], ["K", "—", "r-K"], ["U", "—", "r-U"], ["E = K + U", "—", "r-E"]]);

  // phases + events
  const phaseOrder = ["stand", "lean", "tip", "slide", "tipslide", "air", "land", "down"];
  const phaseList = h("ul.phases", phaseOrder.map(k => h("li", { "data-phase": k }, h("span.dot"), PHASE_INFO[k].label)));
  const modelBox = h("p.model-box");
  const eventList = h("ul.events");
  const errBox = h("div.callout", { hidden: true });

  const side = h("div.stack",
    h("div.panel", h("h3", "What is happening"), h("div", { style: { height: "10px" } }), phaseList, h("div", { style: { height: "10px" } }), modelBox),
    h("div.panel", h("h3", "Events"), h("p.sub.small", "Tap an event to jump to that moment."), h("div", { style: { height: "8px" } }), eventList));

  // ---------- parameter controls ----------
  const ctl = {};
  const rerun = () => run(true);
  const mk = (key, label, unit, min, max, step) => (ctl[key] = slider({ label, unit, min, max, step, value: P[key], onInput: v => { P[key] = v; rerun(); } })).el;
  const surfaceSel = select({
    label: "Ground surface", value: P.surface,
    options: [...Object.entries(SURFACES).map(([k, s]) => [k, `${s.label} (μs ${s.muS}, μk ${s.muK})`]), ["custom", "Custom μ values"]],
    onChange: v => {
      P.surface = v;
      if (SURFACES[v]) { P.muS = SURFACES[v].muS; P.muK = SURFACES[v].muK; ctl.muS.set(P.muS, false); ctl.muK.set(P.muK, false); }
      rerun();
    }
  });
  const dragSel = select({
    label: "Air resistance", value: P.drag.model,
    options: [["none", "Off"], ["linear", "Linear: F = −b·v"], ["quadratic", "Quadratic: F = −½ρCdA·v²"]],
    onChange: v => { P.drag.model = v; syncDragVis(); rerun(); }
  });
  const bCtl = slider({ label: "b (linear)", unit: "kg/s", min: 0, max: 60, step: 1, value: P.drag.b, onInput: v => { P.drag.b = v; rerun(); } });
  const cdCtl = slider({ label: "Cd (quadratic)", unit: "", min: 0.3, max: 1.5, step: 0.05, value: P.drag.Cd, onInput: v => { P.drag.Cd = v; rerun(); } });
  const aCtl = slider({ label: "Area A", unit: "m²", min: 0.1, max: 1.2, step: 0.05, value: P.drag.A, onInput: v => { P.drag.A = v; rerun(); } });
  const syncDragVis = () => { bCtl.el.hidden = P.drag.model !== "linear"; cdCtl.el.hidden = aCtl.el.hidden = P.drag.model !== "quadratic"; };
  const gSel = select({
    label: "Gravity g", value: String(P.g),
    options: [["9.8", "Earth 9.8 m/s²"], ["1.62", "Moon 1.62 m/s²"], ["3.71", "Mars 3.71 m/s²"], ["24.8", "Jupiter 24.8 m/s²"]],
    onChange: v => { P.g = parseFloat(v); rerun(); }
  });
  const muEl = [mk("muS", "μs static", "", 0, 1.5, 0.01), mk("muK", "μk kinetic", "", 0, 1.5, 0.01)];
  [ctl.muS, ctl.muK].forEach(c => c.range.addEventListener("input", () => { P.surface = "custom"; surfaceSel.set("custom"); }));

  const params = h("div.panel",
    h("div.row", { style: { justifyContent: "space-between" } }, h("h3", "Variables"),
      h("button.btn.small", { type: "button", onclick: () => applyPreset({}) }, "Reset variables")),
    h("div", { style: { height: "12px" } }),
    h("div.cols-3",
      h("div.cgroup", h("h4", "Person"),
        mk("m", "Mass m", "kg", 20, 150, 1), mk("H", "Height", "m", 1.2, 2.1, 0.01),
        mk("comFrac", "COM height (fraction of height)", "", 0.4, 0.7, 0.01),
        mk("leanDeg", "Lean angle θ₀ (+ forward)", "°", -30, 45, 0.5), mk("footLen", "Foot length (base)", "m", 0.15, 0.4, 0.01)),
      h("div.cgroup", h("h4", "Ground"), surfaceSel.el, ...muEl,
        h("h4", { style: { marginTop: "6px" } }, "Push at the COM"),
        mk("F", "Applied force F (+ right)", "N", -800, 800, 5), mk("pushTime", "Push lasts", "s", 0, 6, 0.05)),
      h("div.cgroup", h("h4", "Start of motion"),
        mk("v0x", "Initial vₓ", "m/s", -5, 5, 0.1), mk("v0y", "Initial v_y (+ up)", "m/s", -5, 6, 0.1),
        mk("h0", "Feet above the ground", "m", 0, 5, 0.05),
        h("h4", { style: { marginTop: "6px" } }, "Run"),
        mk("duration", "Time duration", "s", 0.5, 8, 0.1), mk("stopTime", "Landing stopping time Δt", "s", 0.02, 0.5, 0.01),
        gSel.el, dragSel.el, bCtl.el, cdCtl.el, aCtl.el)));
  syncDragVis();

  // ---------- graphs ----------
  const C = FORCE_COLORS();
  const col = { x: C.vel, y: C.ink, a: C.applied, b: C.drag };
  const defs = [
    { id: "pos", title: "Position of the COM", series: [
      { key: "xc", label: "x", color: col.x, unit: "m", slopeUnit: "m/s", slopeMeaning: "vₓ" },
      { key: "yc", label: "y", color: col.y, unit: "m", slopeUnit: "m/s", slopeMeaning: "v_y" }] },
    { id: "vel", title: "Velocity of the COM", series: [
      { key: "vx", label: "vₓ", color: col.x, unit: "m/s", slopeUnit: "m/s²", slopeMeaning: "aₓ", areaUnit: "m", areaMeaning: "Δx" },
      { key: "vy", label: "v_y", color: col.y, unit: "m/s", slopeUnit: "m/s²", slopeMeaning: "a_y", areaUnit: "m", areaMeaning: "Δy" }] },
    { id: "acc", title: "Acceleration of the COM", series: [
      { key: "ax", label: "aₓ", color: col.x, unit: "m/s²", areaUnit: "m/s", areaMeaning: "Δvₓ" },
      { key: "ay", label: "a_y", color: col.y, unit: "m/s²", areaUnit: "m/s", areaMeaning: "Δv_y" }] },
    { id: "net", title: "Net force ΣF", series: [
      { key: "Fx", label: "ΣFₓ", color: col.x, unit: "N", digits: 0, areaUnit: "N·s", areaMeaning: "impulse = Δpₓ" },
      { key: "Fy", label: "ΣF_y", color: col.y, unit: "N", digits: 0, areaUnit: "N·s", areaMeaning: "impulse = Δp_y" }] },
    { id: "contact", title: "Contact forces from the ground", series: [
      { key: "N", label: "N", color: C.normal, unit: "N", digits: 0, areaUnit: "N·s", areaMeaning: "impulse of N" },
      { key: "f", label: "f", color: C.friction, unit: "N", digits: 0, areaUnit: "N·s", areaMeaning: "impulse of f" },
      { key: "fmax", label: "μs·N", color: C.friction, dash: [5, 4], unit: "N", digits: 0 }] },
    { id: "tau", title: "Torque (clockwise +)", series: [
      { key: "tauSupport", label: "τ gravity about edge", color: C.weight, unit: "N·m", digits: 1 },
      { key: "tauCOM", label: "Στ about COM", color: col.y, unit: "N·m", digits: 1, areaUnit: "N·m·s", areaMeaning: "angular impulse = ΔL" }] },
    { id: "th", title: "Angular position θ (tilt)", series: [
      { key: "th", label: "θ", color: col.a, unit: "rad", digits: 3, slopeUnit: "rad/s", slopeMeaning: "ω" }] },
    { id: "w", title: "Angular velocity ω", series: [
      { key: "w", label: "ω", color: col.a, unit: "rad/s", slopeUnit: "rad/s²", slopeMeaning: "α", areaUnit: "rad", areaMeaning: "Δθ" }] },
    { id: "al", title: "Angular acceleration α", series: [
      { key: "al", label: "α", color: col.a, unit: "rad/s²", areaUnit: "rad/s", areaMeaning: "Δω" }] },
    { id: "en", title: "Energy", series: [
      { key: "K", label: "K", color: col.x, unit: "J", digits: 0, slopeUnit: "W", slopeMeaning: "power" },
      { key: "U", label: "U", color: C.weight, unit: "J", digits: 0, slopeUnit: "W", slopeMeaning: "power" },
      { key: "E", label: "K + U", color: col.y, dash: [6, 4], unit: "J", digits: 0 }] }
  ];
  const plots = defs.map(d => {
    const p = createPlot({ title: d.title, series: d.series });
    p.onCursor = x => { pause(); setTime(x); };
    return p;
  });

  const graphPanel = h("div.panel",
    h("h3", "Synchronized graphs"),
    h("p.sub", "All ten graphs come from the same run as the animation. Drag on any graph to move every cursor and the person to that time. Use Slope for the tangent line and Area for the area under the curve."),
    h("div", { style: { height: "14px" } }),
    h("div.graph-grid", plots.map(p => p.el)));

  const about = h("details.drawer.panel",
    h("summary", "How this simulator models the fall"),
    h("div.prose", { style: { marginTop: "12px" } },
      h("p", { html: "The person is one <b>rigid body</b>: a straight body leaning at the chosen angle, rigidly joined to a flat foot. The mass is <b>m</b>, the center of mass sits at the chosen fraction of the height, and the moment of inertia about the COM uses the uniform-rod value <b>I = mH²/12</b>." }),
      h("ul", phaseOrder.map(k => h("li", h("b", PHASE_INFO[k].label + ": "), PHASE_INFO[k].model))),
      h("p", { html: "<b>What it leaves out:</b> muscles and reflexes (real people step, bend and swing their arms to stay up), body bending except the knees while landing, wind, and rotation during the short landing. Real falls are messier, but each stage uses the same Newton's-law reasoning you use on the AP exam." }),
      h("p", { html: "<b>Signs:</b> x is right, y is up. Angles, ω, α and τ are <b>clockwise-positive</b> so a forward fall gives positive numbers. Many AP problems use counterclockwise-positive; the physics is identical with the signs flipped." }),
      h("p", { html: "<b>Numerics:</b> fourth-order Runge–Kutta with 0.5 ms steps. Checked by automated tests: energy is conserved while tipping without slipping, free-fall landing time equals √(2h/g), and sliding stops after v²/(2μ<sub>k</sub>g)." })));

  root.append(head,
    h("div.stack",
      presetRow,
      errBox,
      h("div.bench",
        h("div.stack", { style: { gap: "12px" } }, stage, transport, toggles, R),
        side),
      params, graphPanel, about));

  for (const [name, p] of PRESETS) {
    presetRow.append(h("button.chip", { type: "button", "aria-pressed": "false", onclick: e => {
      presetRow.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", "false"));
      e.currentTarget.setAttribute("aria-pressed", "true");
      applyPreset(p);
      play(true);
    } }, name));
  }

  /* ---------- logic ---------- */
  function applyPreset(p) {
    Object.assign(P, { ...DEFAULTS, drag: { ...DEFAULTS.drag }, surface: "rubberConcrete" });
    const { surface, drag, ...rest } = p;
    Object.assign(P, rest);
    if (surface) { P.surface = surface; P.muS = SURFACES[surface].muS; P.muK = SURFACES[surface].muK; }
    else { P.muS = SURFACES.rubberConcrete.muS; P.muK = SURFACES.rubberConcrete.muK; }
    if (drag) P.drag.model = drag;
    for (const k in ctl) ctl[k].set(P[k], false);
    surfaceSel.set(P.surface); dragSel.set(P.drag.model); gSel.set(String(P.g));
    bCtl.set(P.drag.b, false); cdCtl.set(P.drag.Cd, false); aCtl.set(P.drag.A, false);
    syncDragVis();
    run(false);
  }

  let cam = null;
  function run(keepTime) {
    const { surface, ...simParams } = P;
    const r = simulate(simParams);
    if (!r.ok) {
      errBox.hidden = false;
      errBox.innerHTML = `<b>Check the variables:</b> ${r.errors.join("; ")}.`;
      return;
    }
    errBox.hidden = true;
    result = r;
    scrub.max = P.duration;
    if (!keepTime) t = 0;
    t = Math.min(t, P.duration);
    // camera: fit the tallest point of the run and follow sideways if needed
    const H = P.H;
    let top = H + 0.25, xmin = Infinity, xmax = -Infinity;
    for (const s of r.samples) { top = Math.max(top, s.yc + (1 - P.comFrac) * H + 0.3); xmin = Math.min(xmin, s.xc); xmax = Math.max(xmax, s.xc); }
    cam = { top, xmin, xmax };
    // graph data
    const S = r.samples, T = S.map(s => s.t);
    const pick = f => S.map(f);
    const data = {
      xc: pick(s => s.xc), yc: pick(s => s.yc), vx: pick(s => s.vx), vy: pick(s => s.vy),
      ax: pick(s => s.ax), ay: pick(s => s.ay), Fx: pick(s => s.Fx), Fy: pick(s => s.Fy),
      N: pick(s => s.N), f: pick(s => s.f), fmax: pick(s => ["air", "down"].includes(s.phase) ? NaN : P.muS * s.N),
      tauSupport: pick(s => s.tauSupport ?? NaN), tauCOM: pick(s => s.tauCOM),
      th: pick(s => s.tiltDeg * Math.PI / 180), w: pick(s => s.omega), al: pick(s => s.alpha),
      K: pick(s => s.K), U: pick(s => s.U), E: pick(s => s.E)
    };
    const markers = r.events.map(e => ({ x: e.t }));
    plots.forEach(p => { p.setData(T, data, { keepView: true }); p.setMarkers(markers); });
    // phases seen + events
    const seen = new Set(S.map(s => s.phase));
    phaseList.querySelectorAll("li").forEach(li => li.classList.toggle("seen", seen.has(li.dataset.phase)));
    eventList.innerHTML = "";
    if (!r.events.length) eventList.append(h("li.muted.small", "No changes: the person stays in equilibrium for the whole run."));
    for (const e of r.events) eventList.append(h("li", h("button", { type: "button", onclick: () => { pause(); setTime(e.t + 0.0001); } }, h("span.t", `${fmt(e.t, 3)} s`), h("span", e.text))));
    setTime(t);
  }

  function setTime(x) {
    t = Math.min(Math.max(x, 0), P.duration);
    scrub.value = t;
    tLabel.textContent = `t = ${fmt(t, 3)} s`;
    drawFrame();
    updateReadouts();
    if (!playing || frameCount % 3 === 0) plots.forEach(p => p.setCursor(t));
  }

  function updateReadouts() {
    const s = result && sampleAt(result, t); if (!s) return;
    const set = (id, v) => { const el = R.querySelector("#" + id); if (el) el.textContent = v; };
    set("r-phase", PHASE_INFO[s.phase].label.split(":")[0]);
    set("r-t", `${fmt(s.t, 3)} s`);
    set("r-pos", `${fmt(s.xc, 2)}, ${fmt(s.yc, 2)} m`);
    set("r-v", `${fmt(Math.hypot(s.vx, s.vy), 2)} m/s`);
    set("r-a", `${fmt(Math.hypot(s.ax, s.ay), 2)} m/s²`);
    set("r-N", `${fmt(s.N, 0)} N`);
    set("r-f", `${fmt(s.f, 0)} N`);
    set("r-fmax", ["air", "down"].includes(s.phase) ? "—" : `${fmt(P.muS * s.N, 0)} N`);
    set("r-F", `${fmt(Math.hypot(s.Fx, s.Fy), 0)} N`);
    set("r-th", `${fmt(s.tiltDeg, 1)}°`);
    set("r-w", `${fmt(s.omega, 2)} rad/s`);
    set("r-al", `${fmt(s.alpha, 2)} rad/s²`);
    set("r-tau", s.tauSupport == null ? "—" : `${fmt(s.tauSupport, 1)} N·m`);
    set("r-K", `${fmt(s.K, 0)} J`); set("r-U", `${fmt(s.U, 0)} J`); set("r-E", `${fmt(s.E, 0)} J`);
    phaseList.querySelectorAll("li").forEach(li => li.classList.toggle("now", li.dataset.phase === s.phase));
    modelBox.innerHTML = `<b>Model now:</b> ${PHASE_INFO[s.phase].model}`;
  }

  function drawFrame() {
    if (!result || !cam) return;
    const s = sampleAt(result, t); if (!s) return;
    const { ctx, w, h: Hh } = fitCanvas(canvas);
    const C = FORCE_COLORS();
    ctx.clearRect(0, 0, w, Hh);
    resetLabels(ctx);
    const groundFrac = 0.84;
    const ppm = Math.min((Hh * groundFrac - 16) / cam.top, w / 3);
    const halfW = w / 2 / ppm;
    const fits = cam.xmax - cam.xmin < 2 * halfW - 2.2;
    const camX = fits ? (cam.xmin + cam.xmax) / 2 + 0.2 : s.xc;
    const K = camera(w, Hh, { ppm, camX, groundFrac });
    grid(ctx, K, camX);
    const surf = SURFACES[P.surface];
    ground(ctx, K, { color: surf ? surf.color : "#3a3f45", camX, label: surf ? surf.label : `μs ${P.muS}, μk ${P.muK}` });

    const body = result.body, pose = s.pose;
    const feetDown = ["stand", "lean", "slide", "land"].includes(s.phase);
    // base of support
    if (feetDown) {
      const hx = pointWorld(body, pose, "heel").x, tx = pointWorld(body, pose, "toe").x;
      ctx.save(); ctx.strokeStyle = C.normal; ctx.globalAlpha = 0.6; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(K.sx(hx), K.gy + 3); ctx.lineTo(K.sx(tx), K.gy + 3); ctx.stroke(); ctx.restore();
    }
    // line of action of gravity
    if (show.gline) {
      ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = C.weight; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(K.sx(s.xc), K.sy(s.yc)); ctx.lineTo(K.sx(s.xc), K.gy); ctx.stroke(); ctx.restore();
    }
    // lever arm about the support edge
    if (show.lever && s.edge && s.phase !== "down") {
      const ex = pointWorld(body, pose, s.edge).x;
      const y = K.gy + 34;
      ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(K.sx(ex), y); ctx.lineTo(K.sx(s.xc), y);
      ctx.moveTo(K.sx(ex), y - 5); ctx.lineTo(K.sx(ex), y + 5); ctx.moveTo(K.sx(s.xc), y - 5); ctx.lineTo(K.sx(s.xc), y + 5); ctx.stroke();
      ctx.restore();
      if (Math.abs(K.sx(s.xc) - K.sx(ex)) > 6) label(ctx, `lever arm d = ${fmt(Math.abs(s.xc - ex), 3)} m`, Math.max(K.sx(ex), K.sx(s.xc)) + 4, y + 10, 0, C.ink);
    }
    // pivot
    if (s.phase === "tip" || s.phase === "tipslide") {
      const pv = pointWorld(body, pose, s.edge);
      ctx.save(); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(K.sx(pv.x), K.sy(pv.y), 5, 0, 7); ctx.fill(); ctx.restore();
    }

    person(ctx, K, body, pose, { H: P.H, color: C.ink });
    const cx = K.sx(s.xc), cy = K.sy(s.yc);

    // forces (newtons → pixels)
    const W = P.m * P.g;
    const ppn = 70 / W;
    const L = F => Math.sign(F) * Math.min(Math.abs(F) * ppn, 170);
    const tag = (name, F) => `${name} ${fmt(Math.abs(F), 0)} N${Math.abs(F) * ppn > 170 ? " ≫" : ""}`;
    if (show.weight) arrow(ctx, cx, cy, cx, cy + L(W), { color: C.weight, label: tag("Fg", W) });
    const contact = s.contact;
    if (contact != null && s.N > 0 && !["air", "down"].includes(s.phase)) {
      const px = K.sx(contact);
      if (show.normal) arrow(ctx, px, K.gy, px, K.gy - L(s.N), { color: C.normal, label: tag("N", s.N), labelSide: -1 });
      if (show.friction && Math.abs(s.f) > 0.5) arrow(ctx, px, K.gy + 2, px + L(s.f), K.gy + 2, { color: C.friction, label: tag("f", s.f) });
    }
    if (show.applied && Math.abs(s.Fapp) > 0.5) arrow(ctx, cx, cy - 10, cx + L(s.Fapp), cy - 10, { color: C.applied, label: tag("F", s.Fapp) });
    if (show.drag && Math.hypot(s.drag.x, s.drag.y) > 0.5) arrow(ctx, cx, cy, cx + L(s.drag.x), cy - L(s.drag.y), { color: C.drag, label: tag("D", Math.hypot(s.drag.x, s.drag.y)) });
    if (show.net && Math.hypot(s.Fx, s.Fy) > 0.5) arrow(ctx, cx, cy, cx + L(s.Fx), cy - L(s.Fy), { color: C.net, dash: [6, 4], label: tag("ΣF", Math.hypot(s.Fx, s.Fy)) });
    // motion (not forces)
    if (show.vel && Math.hypot(s.vx, s.vy) > 0.02) {
      const k = 28, vx = s.vx * k, vy = s.vy * k, n = Math.hypot(vx, vy), c = Math.min(1, 160 / n);
      arrow(ctx, cx, cy, cx + vx * c, cy - vy * c, { color: C.vel, hollow: true, width: 2, label: `v ${fmt(Math.hypot(s.vx, s.vy), 2)} m/s` });
    }
    if (show.acc && Math.hypot(s.ax, s.ay) > 0.02) {
      const k = 9, ax = s.ax * k, ay = s.ay * k, n = Math.hypot(ax, ay), c = Math.min(1, 160 / n);
      arrow(ctx, cx, cy, cx + ax * c, cy - ay * c, { color: C.acc, hollow: true, width: 2, dash: [3, 3], label: `a ${fmt(Math.hypot(s.ax, s.ay), 2)} m/s²` });
    }
    if (Math.abs(s.omega) > 0.05) rotationArrow(ctx, cx, cy, 26, s.omega > 0, C.ink2, `ω ${fmt(s.omega, 2)}`);
    comSymbol(ctx, cx, cy, 7, C.ink);

    // caption
    ctx.save(); ctx.font = "600 14px 'Atkinson Hyperlegible', sans-serif"; ctx.fillStyle = C.ink; ctx.textBaseline = "top";
    ctx.fillText(PHASE_INFO[s.phase].label, 12, 10);
    ctx.font = "12px 'JetBrains Mono', monospace"; ctx.fillStyle = C.muted;
    ctx.fillText(`t = ${fmt(s.t, 3)} s   tilt ${fmt(s.tiltDeg, 1)}°`, 12, 30);
    ctx.fillText("hollow arrows: motion (not forces)", 12, 46);
    ctx.restore();
  }

  /* ---------- playback ---------- */
  function loop(now) {
    if (!playing) return;
    const dtReal = Math.min(0.05, (now - lastFrame) / 1000); lastFrame = now; frameCount++;
    const next = t + dtReal * (slow ? 0.25 : speed);
    if (next >= P.duration) { setTime(P.duration); stop(); return; }
    setTime(next);
    raf = requestAnimationFrame(loop);
  }
  function play(fromStart) {
    if (fromStart || t >= P.duration - 1e-6) setTime(0);
    playing = true; lastFrame = performance.now();
    startBtn.textContent = "▶ Restart"; pauseBtn.disabled = false; pauseBtn.textContent = "❚❚ Pause";
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function pause() { if (!playing) return; playing = false; cancelAnimationFrame(raf); pauseBtn.textContent = "▶ Resume"; plots.forEach(p => p.setCursor(t)); }
  function stop() { playing = false; cancelAnimationFrame(raf); pauseBtn.textContent = "▶ Resume"; pauseBtn.disabled = true; startBtn.textContent = "▶ Replay"; plots.forEach(p => p.setCursor(t)); }

  startBtn.addEventListener("click", () => play(true));
  pauseBtn.addEventListener("click", () => { if (playing) pause(); else play(false); });
  stepBtn.addEventListener("click", () => { pause(); pauseBtn.disabled = false; setTime(t + 0.01); plots.forEach(p => p.setCursor(t)); });
  resetBtn.addEventListener("click", () => { pause(); setTime(0); startBtn.textContent = "▶ Start"; pauseBtn.disabled = true; pauseBtn.textContent = "❚❚ Pause"; plots.forEach(p => p.setCursor(0)); });
  slowBtn.addEventListener("click", () => { slow = !slow; slowBtn.setAttribute("aria-pressed", String(slow)); });
  speedSel.addEventListener("change", () => { speed = parseFloat(speedSel.value); slow = false; slowBtn.setAttribute("aria-pressed", "false"); });
  scrub.addEventListener("input", () => { pause(); pauseBtn.disabled = false; setTime(parseFloat(scrub.value)); plots.forEach(p => p.setCursor(t)); });

  const offResize = onResize(stage, drawFrame);
  applyPreset({});
  presetRow.querySelector(".chip").setAttribute("aria-pressed", "true");

  return () => { playing = false; cancelAnimationFrame(raf); offResize(); };
}
