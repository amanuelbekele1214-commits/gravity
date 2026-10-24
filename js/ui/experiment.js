/**
 * Experiment card: prediction → controls + live result + graph → conclusion → reflection.
 * The conclusion stays hidden until a prediction is locked in.
 */
import { h } from "./dom.js";
import { progress } from "../progress.js";

export function experiment({ id, letter, title, predict, choices, controls, result, graph, conclusion, reflection }) {
  const done = () => progress.completeExperiment(id);
  const predBox = h("div.choices", { role: "radiogroup", "aria-label": "Your prediction" },
    choices.map((c, i) => h("label", h("input", { type: "radio", name: `pred-${id}`, value: i }), h("span", c))));
  const lockBtn = h("button.btn.primary", { type: "button" }, "Lock in prediction");
  const status = h("p.small.muted", "Pick a prediction, then run the experiment.");
  const concl = h("div.callout", { hidden: true, html: conclusion });
  const refl = h("details.drawer", { hidden: true },
    h("summary", "Reflection question"),
    h("div.prose", { style: { marginTop: "8px" } }, h("p", { html: reflection.q }),
      h("textarea.input", { "aria-label": "Your answer", placeholder: "Write your answer in a sentence or two, then compare." }),
      h("details", h("summary.small", "Compare with a model answer"), h("p", { html: reflection.a, style: { marginTop: "6px" } }))));
  lockBtn.addEventListener("click", () => {
    const sel = predBox.querySelector("input:checked");
    if (!sel) { status.textContent = "Choose one of the predictions first."; return; }
    predBox.querySelectorAll("input").forEach(i => { i.disabled = true; });
    lockBtn.disabled = true;
    status.innerHTML = `Prediction locked: <b>${choices[+sel.value]}</b>. Now use the controls and compare.`;
    concl.hidden = false; refl.hidden = false; done();
  });
  return h("section.panel", { id: `exp-${id}` },
    h("div.row", { style: { justifyContent: "space-between" } }, h("h3", `Experiment ${letter}: ${title}`), h("span.pill.info", "Experiment")),
    h("div.cols", { style: { marginTop: "14px" } },
      h("div.stack", { style: { gap: "12px" } },
        h("div.prose", h("p", { html: `<b>Predict first:</b> ${predict}` })), predBox, h("div.row", lockBtn), status,
        h("div.controls", controls)),
      h("div.stack", { style: { gap: "12px" } }, result, graph || null)),
    h("div.stack", { style: { gap: "10px", marginTop: "14px" } }, concl, refl));
}

/** Section header used by every learning section. */
export function sectionHead(kicker, title, intro) {
  return h("header.section-head", h("span.kicker", kicker), h("h2", title), h("p", { html: intro }));
}
