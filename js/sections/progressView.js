/** Progress: accuracy by topic, weak areas, formulas, experiments, recent results, backup. */
import { h, fmt } from "../ui/dom.js";
import { sectionHead } from "../ui/experiment.js";
import { progress } from "../progress.js";
import { TOPICS } from "../data/problems.js";
import { FORMULAS } from "../data/formulas.js";
import { shared } from "../state.js";

const EXPERIMENTS = { A: ["Mass and weight", "#forces"], B: ["Friction and slipping", "#friction"], C: ["Center of mass", "#balance"], D: ["Torque and lever arm", "#torque"],
  E: ["Free fall", "#motion"], F: ["Air resistance", "#motion"], G: ["Landing", "#energy"], H: ["Graph interpretation", "#graphs"] };

export function render(root) {
  root.append(sectionHead("Practice", "Progress",
    "Saved in this browser only, no account needed. To move it to another device or keep a backup, copy the progress code below and paste it on the other device."));
  const body = h("div.stack");
  root.append(body);
  const draw = () => {
    const s = progress.get();
    const acc = s.attempts ? s.correct / s.attempts : 0;
    const weak = progress.weakTopics().filter(w => w.acc < 0.8);
    const topics = Object.keys(TOPICS);
    body.replaceChildren(
      h("section.panel", h("div.readouts",
        h("div", h("div.k", "Questions attempted"), h("div.v", String(s.attempts))),
        h("div", h("div.k", "Correct"), h("div.v", String(s.correct))),
        h("div", h("div.k", "Accuracy"), h("div.v", s.attempts ? `${fmt(acc * 100, 0)}%` : "—")),
        h("div", h("div.k", "Time practicing"), h("div.v", `${Math.floor(s.secondsPracticed / 60)} min`)),
        h("div", h("div.k", "Formulas mastered"), h("div.v", `${Object.keys(s.formulas).length} / ${FORMULAS.length}`)),
        h("div", h("div.k", "Experiments done"), h("div.v", `${Object.keys(s.experiments).length} / 8`)))),
      h("div.cols",
        h("section.panel", h("h3", "Accuracy by topic"), h("div.stack", { style: { gap: "10px", marginTop: "12px" } },
          topics.map(t => { const v = s.byTopic[t]; const a = v ? v.correct / v.attempts : 0; return h("div",
            h("div.row", { style: { justifyContent: "space-between" } }, h("span", TOPICS[t]), h("span.mono.small", v ? `${v.correct}/${v.attempts} · ${fmt(a * 100, 0)}%` : "not tried")),
            h("div.bar", h("i", { style: { width: `${v ? a * 100 : 0}%`, background: v ? (a >= 0.8 ? "var(--good)" : a >= 0.5 ? "var(--warn)" : "var(--bad)") : "transparent" } }))); }))),
        h("section.panel", h("h3", "Weak areas"),
          h("p.sub", { style: { marginTop: "6px" } }, weak.length ? "Topics under 80% (with at least 2 attempts). Personalized review picks problems from these first." : "No weak areas yet. Topics need at least 2 attempts to count."),
          h("ul", weak.map(w => h("li", `${TOPICS[w.topic] || w.topic}: ${fmt(w.acc * 100, 0)}% of ${w.attempts}`))),
          h("a.btn.primary", { href: "#practice", onclick: () => { shared.weakMode = true; } }, "Start personalized review →"),
          h("h3", { style: { marginTop: "20px" } }, "Experiments"),
          h("ul.events", Object.entries(EXPERIMENTS).map(([k, [n, href]]) => h("li", h("a", { href, style: { textDecoration: "none", color: "inherit" } }, `${s.experiments[k] ? "✓" : "○"} Experiment ${k}: ${n}`)))))),
      h("section.panel", h("h3", "Recent results"),
        s.recent.length ? h("div.table-wrap", h("table.data", h("thead", h("tr", h("th", "When"), h("th", "Topic"), h("th", "Level"), h("th", "Result"))),
          h("tbody", s.recent.slice(0, 15).map(r => h("tr", h("td.mono", new Date(r.t).toLocaleString()), h("td", TOPICS[r.topic] || r.topic), h("td", String(r.level)), h("td", h("span.pill." + (r.ok ? "good" : "bad"), r.ok ? "Correct" : "Missed"))))))) : h("p.muted", "Nothing yet. Try a practice problem.")),
      backupPanel());
  };
  function backupPanel() {
    const code = h("textarea.input", { readonly: true, "aria-label": "Progress code" }, progress.exportCode());
    const msg = h("p.small");
    const copy = h("button.btn", { type: "button", onclick: async () => {
      try { await navigator.clipboard.writeText(code.value); msg.textContent = "Copied. Paste it somewhere safe."; }
      catch { code.select(); msg.textContent = "Selected: press Ctrl+C (or ⌘C) to copy."; }
    } }, "Copy progress code");
    const paste = h("textarea.input", { "aria-label": "Paste a progress code to restore", placeholder: "Paste a progress code here" });
    const restore = h("button.btn", { type: "button", onclick: () => {
      try { progress.importCode(paste.value); msg.textContent = "Progress restored."; draw(); }
      catch (e) { msg.textContent = `Couldn't restore: ${e.message || "that code isn't valid."}`; }
    } }, "Restore");
    const confirmBox = h("div.row", { hidden: true }, h("span", "Erase all progress in this browser?"),
      h("button.btn", { type: "button", onclick: () => { progress.reset(); draw(); } }, "Yes, erase"),
      h("button.btn", { type: "button", onclick: () => { confirmBox.hidden = true; } }, "Cancel"));
    return h("section.panel", h("h3", "Back up or move your progress"),
      h("div.cols", { style: { marginTop: "10px" } },
        h("div.stack", { style: { gap: "8px" } }, h("p.small.muted", "1. Copy this code."), code, h("div.row", copy)),
        h("div.stack", { style: { gap: "8px" } }, h("p.small.muted", "2. On the other device, paste it and restore."), paste, h("div.row", restore,
          h("button.btn", { type: "button", onclick: () => { confirmBox.hidden = false; } }, "Reset progress")), confirmBox)),
      msg);
  }
  draw();
}
