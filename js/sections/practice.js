/** Practice problems: randomized values, instant feedback, worked solutions, retry and related challenges. */
import { h, sig } from "../ui/dom.js";
import { sectionHead } from "../ui/experiment.js";
import { PROBLEMS, TOPICS } from "../data/problems.js";
import { progress } from "../progress.js";
import { shared } from "../state.js";

const R = {
  int: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
  num: (a, b, s = 0.1) => +(Math.round((a + Math.random() * (b - a)) / s) * s).toFixed(4),
  pick: arr => arr[Math.floor(Math.random() * arr.length)]
};
const close = (a, b, rel = 0.02) => Math.abs(a - b) <= Math.max(rel * Math.abs(b), 1e-3);

function build(tpl) {
  for (let i = 0; i < 20; i++) { const q = tpl.make(R); if (q) return { tpl, q: { type: "num", ...q } }; }
  return null;
}

export function render(root) {
  root.append(sectionHead("Practice", "Practice problems",
    `${PROBLEMS.length} problem types across ${Object.keys(TOPICS).length - 1} topics, with new random numbers every time. Answers stay hidden until you submit (or ask for a hint). Graph-reading questions live in the Graph lab.`));
  let topic = shared.practiceTopic || "all", level = 0, weak = shared.weakMode;
  shared.practiceTopic = null; shared.weakMode = false;

  const topicSel = h("select.input", { "aria-label": "Topic", style: { width: "auto" } },
    h("option", { value: "all" }, "All topics"), Object.entries(TOPICS).filter(([k]) => k !== "graphs").map(([k, v]) => h("option", { value: k }, v)));
  topicSel.value = TOPICS[topic] && topic !== "graphs" ? topic : "all";
  const levelSel = h("select.input", { "aria-label": "Level", style: { width: "auto" } },
    [["0", "All levels"], ["1", "Level 1: fundamentals"], ["2", "Level 2: intermediate"], ["3", "Level 3: AP exam"], ["4", "Level 4: multi-concept"]].map(([v, t]) => h("option", { value: v }, t)));
  const weakBtn = h("button.btn", { type: "button", "aria-pressed": String(weak) }, "Focus on my weak topics");
  const stat = h("span.small.muted");
  const card = h("section.panel.q-card");
  topicSel.addEventListener("change", () => { topic = topicSel.value; weak = false; weakBtn.setAttribute("aria-pressed", "false"); next(); });
  levelSel.addEventListener("change", () => { level = +levelSel.value; next(); });
  weakBtn.addEventListener("click", () => { weak = !weak; weakBtn.setAttribute("aria-pressed", String(weak)); next(); });
  const updStat = () => { const s = progress.get(); stat.textContent = `${s.correct}/${s.attempts} correct so far`; };

  function pool() {
    let P = PROBLEMS.filter(p => (!level || p.level === level));
    if (weak) {
      const weakT = progress.weakTopics().filter(w => w.acc < 0.8).map(w => w.topic);
      const tried = new Set(Object.keys(progress.get().byTopic));
      const focus = weakT.length ? weakT : Object.keys(TOPICS).filter(t => !tried.has(t));
      const W = P.filter(p => focus.includes(p.topic));
      return W.length ? W : P;
    }
    return topic === "all" ? P : P.filter(p => p.topic === topic);
  }
  let lastId = null;
  function next(specific) {
    const P = pool();
    if (!P.length && !specific) { card.replaceChildren(h("p.muted", "No problems at this topic and level. Choose another level.")); return; }
    let tpl = specific || R.pick(P);
    if (!specific && P.length > 1) while (tpl.id === lastId) tpl = R.pick(P);
    lastId = tpl.id;
    show(build(tpl));
  }

  function show(item, retry = false) {
    if (!item) { next(); return; }
    const { tpl, q } = item;
    let hintUsed = false;
    const fb = h("div");
    let input, box;
    if (q.type === "num") {
      input = h("input.input", { type: "text", inputmode: "decimal", "aria-label": `Your answer${q.unit ? " in " + q.unit : ""}` });
      input.addEventListener("keydown", e => { if (e.key === "Enter") check(); });
      box = h("div.answer-row", input, h("span.muted", q.unit || "(no unit)"));
    } else if (q.type === "mc" || q.type === "multi") {
      box = h("div.choices", q.choices.map((c, i) => h("label", h("input", { type: q.type === "mc" ? "radio" : "checkbox", name: "pq", value: i }), h("span", { html: c }))));
    } else {
      input = h("textarea.input", { "aria-label": "Your explanation", placeholder: "Write your explanation, then compare with the model answer.", rows: 5 });
      box = input;
    }
    const checkBtn = h("button.btn.primary", { type: "button" }, q.type === "free" ? "Compare with the model answer" : "Submit");
    const hintBtn = h("button.btn", { type: "button" }, "Hint");
    const hintBox = h("p.callout", { hidden: true, html: q.hint || "" });
    hintBtn.addEventListener("click", () => { hintUsed = true; hintBox.hidden = false; hintBtn.disabled = true; });
    if (!q.hint) hintBtn.hidden = true;

    function finish(ok, detail) {
      progress.recordAnswer({ id: tpl.id, topic: tpl.topic, level: tpl.level, ok });
      updStat();
      checkBtn.disabled = true;
      const related = PROBLEMS.find(p => p.id === tpl.related);
      fb.replaceChildren(h("div.feedback" + (ok ? ".good" : ".bad"),
        h("b", ok ? (hintUsed ? "Correct (with a hint)." : "Correct.") : "Not quite."),
        detail,
        q.steps ? h("div", h("b", "Step-by-step solution"), h("ol", q.steps.map(s => h("li", { html: s })))) : null,
        (q.wrong && q.wrong.length) || q.whys ? h("details", h("summary", "Why other approaches fail"),
          h("ul", [...(q.wrong || []).map(w => h("li", { html: `${sig(w.v, 3)} ${q.unit || ""}: ${w.why}` })),
            ...(q.whys ? (Array.isArray(q.whys) ? q.whys.map((w, i) => w ? h("li", { html: `"${q.choices[i]}": ${w}` }) : null) : Object.entries(q.whys).map(([i, w]) => h("li", { html: `"${q.choices[i]}": ${w}` }))) : [])])) : null),
        h("div.row", { style: { marginTop: "10px" } },
          !ok ? h("button.btn", { type: "button", onclick: () => show(item, true) }, "Retry the same problem") : null,
          h("button.btn", { type: "button", onclick: () => show(build(tpl)) }, "Same type, new numbers"),
          related ? h("button.btn", { type: "button", onclick: () => next(related) }, "Related challenge") : null,
          h("button.btn.primary", { type: "button", onclick: () => next() }, "Next problem")));
    }

    function check() {
      if (q.type === "num") {
        const v = parseFloat(input.value.replace(/,/g, "").replace(/[^\d.eE+-].*$/, ""));
        if (!Number.isFinite(v)) { fb.innerHTML = `<p class="muted">Enter a number${q.unit ? " in " + q.unit : ""}.</p>`; return; }
        const ok = close(v, q.answer, q.tol || 0.02) || (q.answer < 0 && close(-v, q.answer, q.tol || 0.02) && false);
        const match = !ok && (q.wrong || []).find(w => close(v, w.v));
        const signFlip = !ok && close(-v, q.answer, q.tol || 0.02);
        finish(ok, h("div",
          h("p", { html: `Answer: <b>${sig(q.answer, 3)} ${q.unit || ""}</b>${ok ? "" : ` (yours: ${v})`}. Answers within ${Math.round((q.tol || 0.02) * 100)}% count as correct.` }),
          match ? h("p", { html: `<b>Likely mistake:</b> ${match.why}` }) : null,
          signFlip ? h("p", { html: "<b>Likely mistake:</b> right size, wrong sign. Check your positive direction." }) : null));
      } else if (q.type === "mc") {
        const sel = box.querySelector("input:checked");
        if (!sel) { fb.innerHTML = `<p class="muted">Choose an answer.</p>`; return; }
        const ok = +sel.value === q.answer;
        finish(ok, h("p", { html: `Answer: <b>${q.choices[q.answer]}</b>` }));
      } else if (q.type === "multi") {
        const picked = [...box.querySelectorAll("input:checked")].map(i => +i.value).sort();
        const want = [...q.answer].sort();
        const ok = picked.length === want.length && picked.every((v, i) => v === want[i]);
        const missing = want.filter(i => !picked.includes(i)).map(i => q.choices[i]);
        const extra = picked.filter(i => !want.includes(i)).map(i => q.choices[i]);
        finish(ok, h("div", h("p", { html: `Forces that act: <b>${want.map(i => q.choices[i]).join("; ")}</b>` }),
          missing.length ? h("p", `Missing: ${missing.join("; ")}`) : null, extra.length ? h("p", `Not real forces here: ${extra.join("; ")}`) : null));
      } else {
        if (input.value.trim().length < 15) { fb.innerHTML = `<p class="muted">Write at least a sentence first.</p>`; return; }
        checkBtn.disabled = true;
        fb.replaceChildren(h("div.feedback", h("b", "Model answer"), h("p", q.model), h("p.small", "Did your explanation include the same key physics?"),
          h("div.row", h("button.btn", { type: "button", onclick: () => finish(true, h("p", "Marked as correct.")) }, "Yes, I got it"),
            h("button.btn", { type: "button", onclick: () => finish(false, h("p", "Marked for review.")) }, "I missed something"))));
      }
    }
    checkBtn.addEventListener("click", check);
    card.replaceChildren(
      h("div.q-meta", h("span.pill.info", TOPICS[tpl.topic]), h("span.pill.info", `Level ${tpl.level}`),
        h("span.pill.info", { num: "Numeric", mc: "Multiple choice", multi: "Free-body diagram", free: "Free response" }[q.type]), retry ? h("span.pill.warn", "Retry") : null),
      h("p.q-prompt", { html: q.prompt }),
      q.givens ? h("div.givens", q.givens.map(([k, v]) => h("span", { html: `${k} = ${v}` }))) : null,
      box, h("div.row", checkBtn, hintBtn), hintBox, fb);
  }

  root.append(h("div.row", { style: { marginBottom: "16px" } }, topicSel, levelSel, weakBtn, stat), card);
  updStat(); next();
}
