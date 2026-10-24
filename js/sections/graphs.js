/** Graph lab: interpret graphs from real simulations before seeing the answer (Experiment H). */
import { h, fmt, sig } from "../ui/dom.js";
import { createPlot } from "../ui/plot.js";
import { FORCE_COLORS } from "../ui/draw.js";
import { experiment, sectionHead } from "../ui/experiment.js";
import { simulateVerticalFall } from "../physics/kinematics.js";
import { simulate } from "../physics/fallSim.js";
import { progress } from "../progress.js";

const rnd = (a, b, step = 0.1) => Math.round((a + Math.random() * (b - a)) / step) * step;
const pickOne = arr => arr[Math.floor(Math.random() * arr.length)];

/** Each generator returns a question built from an actual calculation. */
function generators(C) {
  const jump = () => {
    const v0 = rnd(2, 5, 0.1); const r = simulateVerticalFall({ h0: 0, v0, m: 60 });
    return { v0, r, T: r.samples.map(s => s.t) };
  };
  return [
    { level: 1, make() {
      const { v0, r, T } = jump();
      return { prompt: `A person jumps straight up. Here is their velocity (up +). At what time is the velocity zero?`, unit: "s",
        graphs: [{ title: "Velocity v (m/s)", series: [{ key: "v", label: "v", color: C.vel, unit: "m/s", slopeUnit: "m/s²", slopeMeaning: "a" }], T, data: { v: r.samples.map(s => s.v) } }],
        answer: v0 / 9.8, tol: 0.04, solution: `The line crosses zero at t = v₀/g = ${fmt(v0, 1)}/9.8 = ${fmt(v0 / 9.8, 2)} s. That is the top of the jump: the person stops for an instant before falling.` };
    } },
    { level: 1, make() {
      const h0 = rnd(1, 6, 0.5); const r = simulateVerticalFall({ h0, m: 60 }); const T = r.samples.map(s => s.t);
      return { prompt: "A person drops from rest. When are they moving downward fastest?", type: "mc",
        graphs: [{ title: "Velocity v (up +, m/s)", series: [{ key: "v", label: "v", color: C.vel, unit: "m/s" }], T, data: { v: r.samples.map(s => s.v) } }],
        choices: ["At the start", "Halfway through the fall", "Just before landing", "The speed is constant"], answer: 2,
        solution: `Downward speed is the size of the negative velocity. The line keeps falling (slope −9.8 m/s²), so the most negative value, ${fmt(r.vLand, 2)} m/s, is just before landing at ${fmt(r.tLand, 2)} s.` };
    } },
    { level: 1, make() {
      const { r, T } = jump();
      return { prompt: "During this jump (after leaving the floor), what is the sign of the acceleration? Up is positive.", type: "mc",
        graphs: [{ title: "Acceleration a (m/s²)", series: [{ key: "a", label: "a", color: C.vel, unit: "m/s²" }], T, data: { a: r.samples.map(s => s.a) } }],
        choices: ["Positive on the way up, negative on the way down", "Always negative", "Zero at the top", "Always positive"], answer: 1,
        solution: "The graph is a flat line at −9.8 m/s² for the whole flight, including the top. Gravity is the only force, and it always points down." };
    } },
    { level: 2, make() {
      const v0 = rnd(2, 4, 0.1), mu = rnd(0.15, 0.4, 0.01), a = mu * 9.8, tStop = v0 / a;
      const T = Array.from({ length: 121 }, (_, i) => i * (tStop * 1.3) / 120);
      return { prompt: "A person slides across a floor on flat feet. Estimate the acceleration from the slope of this graph.", unit: "m/s²",
        graphs: [{ title: "Velocity vₓ (m/s)", series: [{ key: "v", label: "vₓ", color: C.vel, unit: "m/s", slopeUnit: "m/s²", slopeMeaning: "aₓ", areaUnit: "m", areaMeaning: "Δx" }], T, data: { v: T.map(t => Math.max(0, v0 - a * t)) } }],
        answer: -a, tol: 0.1 * a, rel: true,
        solution: `Slope = rise/run = (0 − ${fmt(v0, 1)} m/s)/(${fmt(tStop, 2)} s) = ${fmt(-a, 2)} m/s². That equals −μk·g with μk = ${fmt(mu, 2)}. After stopping, the slope is zero: static friction holds.` };
    } },
    { level: 2, make() {
      const v0 = rnd(2, 4, 0.1), mu = rnd(0.15, 0.4, 0.01), a = mu * 9.8, tStop = v0 / a, d = v0 * v0 / (2 * a);
      const T = Array.from({ length: 121 }, (_, i) => i * (tStop * 1.3) / 120);
      return { prompt: "Same kind of slide. Use the area under the velocity graph: how far does the person slide before stopping?", unit: "m",
        graphs: [{ title: "Velocity vₓ (m/s)", series: [{ key: "v", label: "vₓ", color: C.vel, unit: "m/s", areaUnit: "m", areaMeaning: "Δx" }], T, data: { v: T.map(t => Math.max(0, v0 - a * t)) } }],
        answer: d, tol: 0.08 * d,
        solution: `The area is a triangle: ½ × base × height = ½ × ${fmt(tStop, 2)} s × ${fmt(v0, 1)} m/s = ${fmt(d, 2)} m. The area under a velocity–time graph is the displacement.` };
    } },
    { level: 2, make() {
      const m = rnd(50, 90, 1), r = simulateVerticalFall({ h0: 600, m, drag: { model: "quadratic", Cd: 1, A: 0.7 }, tMax: 25 });
      const S = r.samples.filter(s => s.t <= 20), T = S.map(s => s.t);
      return { prompt: "A skydiver falls with air resistance. Near t = 18 s the acceleration is almost zero. Is the skydiver moving then?", type: "mc",
        graphs: [{ title: "Velocity v (up +, m/s)", series: [{ key: "v", label: "v", color: C.drag, unit: "m/s" }], T, data: { v: S.map(s => s.v) } },
          { title: "Acceleration a (up +, m/s²)", series: [{ key: "a", label: "a", color: C.drag, unit: "m/s²" }], T, data: { a: S.map(s => s.a) } }],
        choices: ["No: zero acceleration means at rest", "Yes: moving down at a nearly constant (terminal) speed", "Yes, and speeding up quickly", "Only if the parachute is open"], answer: 1,
        solution: `Zero acceleration means the velocity is constant, not zero. The velocity graph levels off at about ${fmt(S[S.length - 1].v, 1)} m/s: drag now balances weight.` };
    } },
    { level: 2, make() {
      const { v0, r, T } = jump();
      return { prompt: "Here is the height of a person's COM during a jump. When does the velocity change direction?", unit: "s",
        graphs: [{ title: "Height y (m)", series: [{ key: "y", label: "y", color: C.vel, unit: "m", slopeUnit: "m/s", slopeMeaning: "v" }], T, data: { y: r.samples.map(s => s.y) } }],
        answer: v0 / 9.8, tol: 0.05, solution: `Velocity is the slope of the position graph. The slope is zero at the peak, t = ${fmt(v0 / 9.8, 2)} s; before it the slope is positive (going up), after it negative (coming down).` };
    } },
    { level: 3, make() {
      const lean = rnd(12, 20, 1), r = simulate({ leanDeg: lean, duration: 3, muS: 2, muK: 1.5 });
      const S = r.samples.filter(s => s.phase === "tip"), T = S.map(s => s.t);
      const t1 = T[Math.floor(T.length * 0.3)], t2 = T[Math.floor(T.length * 0.7)];
      return { prompt: `A person leaning ${lean}° tips over about their toes. Between t = ${fmt(t1, 2)} s and ${fmt(t2, 2)} s, is the angular speed increasing or decreasing?`, type: "mc",
        graphs: [{ title: "Tilt θ (rad)", series: [{ key: "th", label: "θ", color: C.applied, unit: "rad", slopeUnit: "rad/s", slopeMeaning: "ω" }], T, data: { th: S.map(s => s.tiltDeg * Math.PI / 180) } }],
        choices: ["Increasing", "Decreasing", "Constant", "Zero"], answer: 0,
        solution: "Angular speed is the slope of θ(t). The curve gets steeper and steeper (it curves upward), so ω is increasing. Gravity's torque about the toe points in the direction of rotation, so it speeds the rotation up." };
    } },
    { level: 3, make() {
      const s = rnd(0.52, 0.6, 0.01), H = 1.75, toe = 0.2, ang = Math.asin(toe / (s * H)) * 180 / Math.PI;
      const xs = Array.from({ length: 121 }, (_, i) => -10 + i * 0.25);
      return { prompt: `Gravity's torque about the toe as a function of lean angle (COM at ${fmt(s * H, 2)} m, toe 0.20 m ahead of the ankle, clockwise +). At what lean angle is the torque zero?`, unit: "°",
        graphs: [{ title: "τ gravity about the toe (N·m)", xName: "θ", xUnit: "°", xLabel: "lean θ (°)", series: [{ key: "t", label: "τ", color: C.weight, unit: "N·m" }], T: xs, data: { t: xs.map(a => 65 * 9.8 * (s * H * Math.sin(a * Math.PI / 180) - toe)) } }],
        answer: ang, tol: 0.8,
        solution: `τ = m·g·(x_COM − x_toe) is zero when the COM is directly above the toe: (COM height)·sin θ = 0.20 m → θ = asin(0.20/${fmt(s * H, 2)}) = ${fmt(ang, 1)}°. Below that angle the torque is negative (pulls back to balance); above it, positive (tips forward).` };
    } },
    { level: 3, make() {
      const h0 = rnd(20, 60, 5); const a = simulateVerticalFall({ h0, m: 70 }), b = simulateVerticalFall({ h0, m: 70, drag: { model: "quadratic", Cd: 1, A: 0.7 } });
      const tEnd = b.tLand, T = Array.from({ length: Math.ceil(tEnd / 0.02) }, (_, i) => i * 0.02);
      const at = (r, t) => t >= r.tLand ? NaN : r.samples[Math.min(r.samples.length - 1, Math.round(t / 0.005))].v;
      return { prompt: "These are two falls from the same height, one with air resistance and one without. Which curve has air resistance, and how can you tell?", type: "mc",
        graphs: [{ title: "Velocity (up +, m/s)", series: [{ key: "A", label: "A", color: C.ink, unit: "m/s" }, { key: "B", label: "B", color: C.drag, unit: "m/s" }], T, data: { A: T.map(t => at(a, t)), B: T.map(t => at(b, t)) } }],
        choices: ["A: it is a straight line", "B: its slope gets smaller in size over time", "A: it ends sooner", "Neither: air resistance doesn't change v(t)"], answer: 1,
        solution: "Without air the slope is always −g, so the line is straight (A). With air, drag grows with speed and the net force shrinks, so the slope (acceleration) gets closer to zero and the curve flattens toward terminal speed (B)." };
    } },
    { level: 3, make() {
      const v = rnd(2, 5, 0.1), m = rnd(50, 90, 5), dt = rnd(0.05, 0.2, 0.01), F = m * v / dt;
      const T = Array.from({ length: 151 }, (_, i) => -0.05 + i * (dt + 0.1) / 150);
      return { prompt: `A ${m} kg person lands. This is the net force on them (up +). What is their momentum change?`, unit: "kg·m/s",
        graphs: [{ title: "Net force ΣF (N)", series: [{ key: "F", label: "ΣF", color: C.normal, unit: "N", areaUnit: "N·s", areaMeaning: "impulse = Δp" }], T, data: { F: T.map(t => (t >= 0 && t < dt ? F : 0)) } }],
        answer: m * v, tol: 0.05 * m * v,
        solution: `Impulse is the area under the net-force graph: ${fmt(F, 0)} N × ${fmt(dt, 2)} s = ${fmt(m * v, 0)} N·s = Δp (upward). The person arrived at ${fmt(v, 1)} m/s downward.` };
    } },
    { level: 1, make() {
      const v = rnd(1, 3, 0.1), T = Array.from({ length: 101 }, (_, i) => i * 0.01);
      return { prompt: "Which graph shows a person in free fall, and which shows motion at constant velocity?", type: "mc",
        graphs: [{ title: "Height (m)", series: [{ key: "A", label: "A", color: C.ink, unit: "m" }, { key: "B", label: "B", color: C.vel, unit: "m" }], T, data: { A: T.map(t => 5 - v * t), B: T.map(t => 5 - 4.9 * t * t) } }],
        choices: ["A is free fall, B is constant velocity", "B is free fall, A is constant velocity", "Both are free fall", "Both are constant velocity"], answer: 1,
        solution: "Constant velocity means a constant slope: a straight line (A). Free fall means the slope gets steeper at a steady rate: a parabola (B)." };
    } }
  ];
}

export function render(root) {
  const C = FORCE_COLORS();
  const gens = generators(C);
  root.append(sectionHead("Simulate", "Graph lab",
    "Real graphs from the lab's physics, shown without labels or tools until you answer. Read slopes, areas and zero crossings, then reveal the full interactive graph and the solution."));

  const expH = experiment({
    id: "H", letter: "H", title: "Graph interpretation",
    predict: "On the velocity–time graph of a jump, what is the slope at the very top of the jump?",
    choices: ["Zero, because the person stops", "−9.8 m/s², the same as everywhere else in the air", "+9.8 m/s²", "It is undefined"],
    controls: [h("p.small.muted", "Use the drill below. Each question uses a fresh simulation with random values.")],
    result: h("div.table-wrap", h("table.data",
      h("thead", h("tr", h("th", "Graph"), h("th", "Slope means"), h("th", "Area means"))),
      h("tbody",
        h("tr", h("td", "position y(t)"), h("td", "velocity v = dy/dt"), h("td", "—")),
        h("tr", h("td", "velocity v(t)"), h("td", "acceleration a = dv/dt"), h("td", "displacement Δy = ∫v dt")),
        h("tr", h("td", "acceleration a(t)"), h("td", "jerk (not on the AP exam)"), h("td", "change in velocity Δv = ∫a dt")),
        h("tr", h("td", "net force F(t)"), h("td", "—"), h("td", "impulse J = Δp")),
        h("tr", h("td", "angle θ(t)"), h("td", "angular velocity ω = dθ/dt"), h("td", "—")),
        h("tr", h("td", "angular velocity ω(t)"), h("td", "angular acceleration α = dω/dt"), h("td", "angle turned Δθ")),
        h("tr", h("td", "torque τ(t)"), h("td", "—"), h("td", "angular impulse = ΔL"))))),
    graph: null,
    conclusion: "<b>−9.8 m/s².</b> The velocity is zero at the top, but the slope of v(t) is the acceleration, and gravity is still acting. The v–t line is straight through the top. Confusing \"value is zero\" with \"slope is zero\" is the most common graph mistake.",
    reflection: { q: "On a position–time graph, what does a point where the curve is flat (horizontal tangent) tell you?", a: "The velocity (the slope) is zero at that instant. It does not tell you the acceleration; for that you need how the slope is changing (the curvature)." }
  });

  let level = 0;
  const card = h("div.q-card");
  const levelBtns = [["Mixed", 0], ["Level 1", 1], ["Level 2", 2], ["Level 3", 3]].map(([t, l]) => {
    const b = h("button.btn.small", { type: "button", "aria-pressed": String(l === level) }, t);
    b.addEventListener("click", () => { level = l; levelBtns.forEach(x => x.setAttribute("aria-pressed", String(x === b))); next(); });
    return b;
  });
  let streak = 0;
  function next() {
    const pool = gens.filter(g => !level || g.level === level);
    const g = pickOne(pool), q = g.make();
    const plots = q.graphs.map(gr => {
      const p = createPlot({ title: gr.title, series: gr.series, minimal: true, height: 220, xName: gr.xName, xUnit: gr.xUnit, xLabel: gr.xLabel });
      p.setData(gr.T, gr.data); p.setLocked(true);
      return p;
    });
    const graphBox = h("div.stack", { style: { gap: "12px" } }, plots.map(p => p.el));
    let input, choiceBox;
    if (q.type === "mc") {
      choiceBox = h("div.choices", q.choices.map((c, i) => h("label", h("input", { type: "radio", name: "gq", value: i }), h("span", c))));
    } else {
      input = h("input.input", { type: "text", inputmode: "decimal", "aria-label": `Answer in ${q.unit}` });
      input.addEventListener("keydown", e => { if (e.key === "Enter") check(); });
    }
    const fb = h("div");
    const checkBtn = h("button.btn.primary", { type: "button" }, "Check");
    function check() {
      let ok, given;
      if (q.type === "mc") {
        const sel = choiceBox.querySelector("input:checked");
        if (!sel) { fb.innerHTML = `<p class="muted">Choose an answer first.</p>`; return; }
        given = +sel.value; ok = given === q.answer;
      } else {
        given = parseFloat(input.value.replace(/,/g, ""));
        if (!Number.isFinite(given)) { fb.innerHTML = `<p class="muted">Enter a number in ${q.unit}.</p>`; return; }
        ok = Math.abs(given - q.answer) <= Math.abs(q.tol);
      }
      checkBtn.disabled = true;
      progress.recordAnswer({ id: "graph-lab", topic: "graphs", level: g.level, ok });
      streak = ok ? streak + 1 : 0;
      // reveal the full interactive graph
      graphBox.replaceChildren(...q.graphs.map(gr => {
        const p = createPlot({ title: gr.title, series: gr.series, height: 220, xName: gr.xName, xUnit: gr.xUnit, xLabel: gr.xLabel });
        p.setData(gr.T, gr.data);
        return p.el;
      }));
      fb.replaceChildren(h("div.feedback" + (ok ? ".good" : ".bad"),
        h("b", ok ? "Correct." : "Not quite."),
        q.type === "mc" ? h("p", `Answer: ${q.choices[q.answer]}`) : h("p", `Answer: ${sig(q.answer, 3)} ${q.unit} (accepted within ±${sig(Math.abs(q.tol), 2)} ${q.unit})`),
        h("p", q.solution),
        h("p.small.muted", "The graph is now fully interactive: try Slope, Area and the cursor to check the answer yourself.")),
        h("div.row", { style: { marginTop: "8px" } }, h("button.btn.primary", { type: "button", onclick: next }, "Next graph"), streak > 1 ? h("span.pill.good", `${streak} in a row`) : null));
    }
    checkBtn.addEventListener("click", check);
    card.replaceChildren(
      h("div.q-meta", h("span.pill.info", `Level ${g.level}`), h("span.pill.info", "Graph reading")),
      h("p.q-prompt", q.prompt), graphBox,
      q.type === "mc" ? choiceBox : h("div.answer-row", input, h("span.muted", q.unit)),
      h("div.row", checkBtn), fb);
  }

  const drill = h("section.panel",
    h("div.row", { style: { justifyContent: "space-between" } }, h("h3", "Graph-reading drill"), h("div.row", levelBtns)),
    h("div", { style: { height: "14px" } }), card);
  root.append(h("div.stack", expH, drill));
  next();
}
