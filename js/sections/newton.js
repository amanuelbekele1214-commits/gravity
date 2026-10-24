/** Newton's three laws. */
import { h, slider, select, fmt, fitCanvas, onResize, readout } from "../ui/dom.js";
import { drawFBD } from "../ui/fbd.js";
import { FORCE_COLORS, arrow, resetLabels, label } from "../ui/draw.js";
import { sectionHead } from "../ui/experiment.js";
import { practiceLink } from "../state.js";
import { components, newtonSecond } from "../physics/forces.js";

export function render(root) {
  const C = FORCE_COLORS();
  const cleanups = [];
  root.append(sectionHead("Learn · Unit 2: Force and translational dynamics", "Newton's laws",
    "Three rules connect forces to motion. The first says what happens with no net force, the second says how much a net force accelerates a mass, and the third says forces always come in pairs acting on <b>different</b> objects."));

  /* ---------- first law ---------- */
  const firstCases = {
    stand: { name: "Standing still", forces: m => [{ sym: "Fg", x: 0, y: -9.8 * m, at: "com", color: C.weight }, { sym: "N", x: 0, y: 9.8 * m, at: "feet", color: C.normal, side: -1 }], v: { x: 0, y: 0 }, text: "N balances Fg, so ΣF = 0 and the person stays at rest." },
    ice: { name: "Gliding on frictionless ice at 3 m/s", forces: m => [{ sym: "Fg", x: 0, y: -9.8 * m, at: "com", color: C.weight }, { sym: "N", x: 0, y: 9.8 * m, at: "feet", color: C.normal, side: -1 }], v: { x: 1, y: 0 }, text: "Exactly the same forces as standing still, and still ΣF = 0. The person keeps moving at constant velocity: no force is needed to <b>keep</b> something moving, only to change its motion." },
    nofloor: { name: "The floor disappears (trapdoor)", forces: m => [{ sym: "Fg", x: 0, y: -9.8 * m, at: "com", color: C.weight }], v: { x: 0, y: 0 }, pose: "air", text: "Only gravity is left. ΣF ≠ 0, so the person accelerates downward at g. Losing a supporting force is exactly what starts a fall." }
  };
  let fc = "stand";
  const c1 = h("canvas", { "aria-label": "Free-body diagram for the first law" });
  const t1 = h("p.callout");
  const upd1 = () => {
    const k = firstCases[fc], F = k.forces(60);
    const Fy = F.reduce((s, f) => s + f.y, 0);
    drawFBD(c1, F.map(f => ({ ...f, label: `${f.sym} ${fmt(Math.abs(f.y), 0)} N` })), { pose: k.pose || "stand", v: k.v, a: { x: 0, y: Fy / 60 } });
    t1.innerHTML = `<b>ΣF = ${fmt(Fy, 0)} N.</b> ${k.text}`;
  };
  const first = h("section.panel",
    h("h3", "First law: no net force, no change in motion"),
    h("p.sub", "An object stays at rest, or keeps moving at constant velocity, unless a net external force acts on it. Standing works because two forces cancel."),
    h("div.cols", { style: { marginTop: "14px" } },
      h("div.stack", { style: { gap: "10px" } },
        select({ label: "Situation (60 kg person)", value: fc, options: Object.entries(firstCases).map(([k, v]) => [k, v.name]), onChange: v => { fc = v; upd1(); } }).el, t1),
      h("div.stage.tall", c1)));
  cleanups.push(onResize(c1.parentElement, upd1));

  /* ---------- second law calculator ---------- */
  const rows = [
    { on: true, name: "Weight", mag: 588, ang: 270, color: C.weight },
    { on: true, name: "Normal", mag: 588, ang: 90, color: C.normal },
    { on: true, name: "Push", mag: 150, ang: 0, color: C.applied },
    { on: true, name: "Friction", mag: 90, ang: 180, color: C.friction }
  ];
  let mass = 60;
  const c2 = h("canvas", { "aria-label": "Vector diagram of the forces and their sum" });
  const out2 = h("div");
  const tbody = h("tbody");
  const upd2 = () => {
    const act = rows.filter(r => r.on);
    const comps = act.map(r => ({ ...components(r.mag, r.ang), r }));
    let res;
    try { res = newtonSecond(comps, mass); } catch (e) { out2.textContent = e.message; return; }
    tbody.replaceChildren(...comps.map(c => h("tr",
      h("td", h("span.key", { style: { background: c.r.color } }), c.r.name),
      h("td.n", fmt(c.r.mag, 0)), h("td.n", `${fmt(c.r.ang, 0)}°`), h("td.n", fmt(c.x, 1)), h("td.n", fmt(c.y, 1)))),
      h("tr", h("td", h("b", "Sum ΣF")), h("td.n", fmt(res.Fnet, 1)), h("td.n", res.directionDeg == null ? "—" : `${fmt(res.directionDeg, 0)}°`), h("td.n", h("b", fmt(res.Fx, 1))), h("td.n", h("b", fmt(res.Fy, 1)))));
    out2.replaceChildren(
      readout([["ΣFₓ", `${fmt(res.Fx, 1)} N`], ["ΣF_y", `${fmt(res.Fy, 1)} N`], ["|ΣF|", `${fmt(res.Fnet, 1)} N`], ["aₓ", `${fmt(res.ax, 2)} m/s²`], ["a_y", `${fmt(res.ay, 2)} m/s²`], ["|a|", `${fmt(res.a, 2)} m/s²`]]),
      h("div.eq", { style: { marginTop: "10px" } }, `a = ΣF / m = ${fmt(res.Fnet, 1)} N / ${fmt(mass, 1)} kg = ${fmt(res.a, 2)} m/s²${res.directionDeg == null ? "" : ` at ${fmt(res.directionDeg, 0)}°`}`));
    // vector diagram: head to tail
    const { ctx, w, h: H } = fitCanvas(c2);
    ctx.clearRect(0, 0, w, H); resetLabels(ctx);
    const maxX = comps.reduce((s, c) => s + Math.abs(c.x), 0) || 1, maxY = comps.reduce((s, c) => s + Math.abs(c.y), 0) || 1;
    const k = Math.min((w - 60) / (2 * maxX), (H - 60) / (2 * maxY), 0.6);
    let x = w / 2, y = H / 2;
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
    for (const c of comps) { const nx = x + c.x * k, ny = y - c.y * k; arrow(ctx, x, y, nx, ny, { color: c.r.color, width: 3, label: c.r.name }); x = nx; y = ny; }
    if (res.Fnet > 0.5) arrow(ctx, w / 2, H / 2, w / 2 + res.Fx * k, H / 2 - res.Fy * k, { color: C.net, dash: [6, 4], width: 3, label: `ΣF ${fmt(res.Fnet, 0)} N` });
    else label(ctx, "Vectors close into a loop: ΣF = 0", 10, 16, 0, C.ink);
  };
  const rowCtl = rows.map((r, i) => h("div.cgroup",
    h("div.row", { style: { justifyContent: "space-between" } },
      h("label.row", h("input", { type: "checkbox", checked: r.on, onchange: e => { r.on = e.target.checked; upd2(); } }), h("span.key", { style: { background: r.color } }), h("b", r.name))),
    slider({ label: "Size", unit: "N", min: 0, max: 1200, step: 1, value: r.mag, onInput: v => { r.mag = v; upd2(); } }).el,
    slider({ label: "Direction (0° = right, 90° = up)", unit: "°", min: 0, max: 359, step: 1, value: r.ang, onInput: v => { r.ang = v; upd2(); } }).el));
  const second = h("section.panel",
    h("h3", "Second law calculator: ΣF = m·a"),
    h("p.sub", "Turn forces on or off and set their size and direction. The calculator breaks each into components, adds them, and divides by mass. The diagram places the vectors head to tail; the dashed arrow from start to finish is the net force."),
    h("div.cols", { style: { marginTop: "14px" } },
      h("div.stack", { style: { gap: "10px" } },
        slider({ label: "Mass m", unit: "kg", min: 1, max: 150, step: 1, value: mass, onInput: v => { mass = v; upd2(); } }).el,
        ...rowCtl),
      h("div.stack", { style: { gap: "12px" } },
        h("div.stage.square", c2),
        h("div.table-wrap", h("table.data", h("thead", h("tr", h("th", "Force"), h("th.n", "Size (N)"), h("th.n", "Angle"), h("th.n", "x (N)"), h("th.n", "y (N)"))), tbody)),
        out2)));
  cleanups.push(onResize(c2.parentElement, upd2));

  /* ---------- third law ---------- */
  const pairs = {
    stand: { name: "Standing on the floor", F: 588, A: "floor", text: "You push down on the floor with 588 N; the floor pushes up on you with 588 N. On <b>your</b> free-body diagram only the floor's push appears, and it balances your weight, which is a different force (from Earth)." },
    jump: { name: "Pushing off to jump", F: 1068, A: "floor", text: "Your legs push down on the floor with 1068 N, so the floor pushes up on you with 1068 N. That is more than your weight, so you accelerate upward. The floor (attached to Earth) barely moves because its mass is enormous." },
    land: { name: "Landing (collision with the ground)", F: 2940, A: "ground", text: "During a hard landing the ground pushes up on you with 2940 N and you push down on the ground with exactly 2940 N. Equal forces, but the effects are very different: your 60 kg body stops quickly, Earth's motion changes by an immeasurably small amount." },
    gravity: { name: "Gravity: you and Earth", F: 588, A: "Earth", text: "Earth pulls you down with 588 N, and you pull Earth up with 588 N. This, not the normal force, is the third-law partner of your weight." }
  };
  let pc = "stand";
  const c3 = h("canvas", { "aria-label": "Third-law pair diagram" });
  const t3 = h("p.callout");
  const upd3 = () => {
    const k = pairs[pc];
    const { ctx, w, h: H } = fitCanvas(c3);
    ctx.clearRect(0, 0, w, H); resetLabels(ctx);
    const midY = H * 0.55;
    // person block and other object, slightly separated
    ctx.fillStyle = C.panel; ctx.strokeStyle = C.ink2; ctx.lineWidth = 2;
    ctx.fillRect(w * 0.38, midY - 140, w * 0.24, 120); ctx.strokeRect(w * 0.38, midY - 140, w * 0.24, 120);
    ctx.fillRect(w * 0.1, midY + 16, w * 0.8, H - midY - 26); ctx.strokeRect(w * 0.1, midY + 16, w * 0.8, H - midY - 26);
    ctx.fillStyle = C.ink; ctx.font = "600 15px 'Atkinson Hyperlegible', sans-serif"; ctx.textAlign = "center";
    ctx.fillText("you (60 kg)", w * 0.5, midY - 80);
    ctx.fillText(k.A, w * 0.5, midY + 52);
    const L = Math.min(110, 30 + k.F / 30);
    const col = pc === "gravity" ? C.weight : C.normal;
    if (pc === "gravity") {
      arrow(ctx, w * 0.5, midY - 80 + 14, w * 0.5, midY - 80 + 14 + L * 0.6, { color: col, width: 4, label: `on you, by Earth: ${k.F} N down` });
      arrow(ctx, w * 0.5, midY + 52 - 18, w * 0.5, midY + 52 - 18 - L * 0.4, { color: col, width: 4, dash: [6, 4], label: `on Earth, by you: ${k.F} N up`, labelSide: -1 });
    } else {
      arrow(ctx, w * 0.44, midY - 20, w * 0.44, midY - 20 - L, { color: col, width: 4, label: `on you, by the ${k.A}: ${k.F} N up`, labelSide: -1 });
      arrow(ctx, w * 0.56, midY + 16, w * 0.56, midY + 16 + L * 0.6, { color: col, width: 4, dash: [6, 4], label: `on the ${k.A}, by you: ${k.F} N down` });
    }
    t3.innerHTML = k.text;
  };
  const third = h("section.panel",
    h("h3", "Third law: forces come in pairs"),
    h("p.sub", "When A pushes on B, B pushes on A with a force of equal size in the opposite direction. The two forces act on different objects, so they never appear on the same free-body diagram and never cancel each other."),
    h("div.cols", { style: { marginTop: "14px" } },
      h("div.stack", { style: { gap: "10px" } },
        select({ label: "Interaction", value: pc, options: Object.entries(pairs).map(([k, v]) => [k, v.name]), onChange: v => { pc = v; upd3(); } }).el, t3,
        h("div.prose", h("p", { html: "<b>Test for a pair:</b> the two forces are the same type (both contact, or both gravity), equal in size, opposite in direction, and each one's description swaps the words: \"on A by B\" ↔ \"on B by A\"." }))),
      h("div.stage.tall", c3)));
  cleanups.push(onResize(c3.parentElement, upd3));

  const worked = h("section.panel",
    h("h3", "Worked example: pushing off the floor"),
    h("div.worked", { style: { marginTop: "10px" } },
      h("p", "A 70 kg person pushes down on the floor and accelerates upward at 4.0 m/s² while their feet are still in contact. Find the normal force and the force the person exerts on the floor."),
      h("div.eq", "Up is +. On the person: N − m·g = m·a  →  N = m(g + a) = 70(9.8 + 4.0) = 966 N up"),
      h("div.eq", "Third law: the person pushes on the floor with 966 N down."),
      h("p", { html: "A frequent wrong answer is N = m·g = 686 N. That only holds when a_y = 0. Another is to add the person's push on the floor to their own free-body diagram; that force acts on the floor." })),
    h("div.row", { style: { marginTop: "12px" } }, practiceLink("newton")));

  root.append(h("div.stack", first, second, third, worked));
  upd1(); upd2(); upd3();
  return () => cleanups.forEach(f => f());
}
