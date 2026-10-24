/** Searchable formula reference. */
import { h } from "../ui/dom.js";
import { sectionHead } from "../ui/experiment.js";
import { FORMULAS } from "../data/formulas.js";
import { progress } from "../progress.js";
import { practiceLink } from "../state.js";

const strip = s => s.replace(/<[^>]+>/g, "");

export function render(root) {
  root.append(sectionHead("Practice", "Formula reference",
    "Every formula the lab uses, with what each symbol means, its SI unit, when it applies, a worked example and the mistakes to avoid. Mark a formula as mastered when you can use it without looking."));
  const search = h("input.input", { type: "search", placeholder: "Search: friction, torque, N·m, impulse…", "aria-label": "Search formulas", style: { maxWidth: "460px" } });
  const count = h("span.small.muted");
  const list = h("div.stack", { style: { gap: "14px" } });
  const cards = FORMULAS.map(f => {
    const mastered = h("input", { type: "checkbox", checked: !!progress.get().formulas[f.id], onchange: e => progress.setFormula(f.id, e.target.checked) });
    const el = h("article.panel",
      h("div.row", { style: { justifyContent: "space-between" } }, h("h3", f.name), h("label.row.small", mastered, "Mastered")),
      h("div.eq.big", { style: { marginTop: "10px" }, html: f.eq }),
      h("div.cols", { style: { marginTop: "12px" } },
        h("div.table-wrap", h("table.data",
          h("thead", h("tr", h("th", "Symbol"), h("th", "Meaning"), h("th", "SI unit"))),
          h("tbody", f.vars.map(([s, m, u]) => h("tr", h("td", { html: s }), h("td", { html: m }), h("td.mono", { html: u })))))),
        h("div.prose",
          h("p", { html: `<b>When it applies:</b> ${f.assume}` }),
          h("div.worked", h("b", "Example"), h("p", { html: f.ex.q }), ...f.ex.steps.map(s => h("div.eq", { html: s })), h("p", { html: `<b>Answer:</b> ${f.ex.a}` })),
          h("p", { html: "<b>Common mistakes:</b>" }), h("ul", f.ex && f.mistakes.map(m => h("li", { html: m }))))),
      h("div.row", { style: { marginTop: "10px" } }, practiceLink(f.topic, "Practice")));
    return { f, el, text: (f.name + " " + strip(f.eq) + " " + f.vars.map(v => strip(v.join(" "))).join(" ") + " " + f.topic + " " + strip(f.assume)).toLowerCase() };
  });
  const filter = () => {
    const q = search.value.trim().toLowerCase();
    const shown = cards.filter(c => !q || q.split(/\s+/).every(w => c.text.includes(w)));
    list.replaceChildren(...(shown.length ? shown.map(c => c.el) : [h("p.muted", "No formula matches that search. Try a symbol (τ, μ) or a topic (friction, energy).")]));
    count.textContent = `${shown.length} of ${cards.length} formulas`;
  };
  search.addEventListener("input", filter);
  root.append(h("div.row", { style: { marginBottom: "16px" } }, search, count), list);
  filter();
}
