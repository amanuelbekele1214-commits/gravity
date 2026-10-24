/** Cross-section hand-off (e.g. "practice this topic" buttons). */
export const shared = { practiceTopic: null, weakMode: false };
export function practiceLink(topic, label = "Practice problems on this") {
  const a = document.createElement("a");
  a.href = "#practice"; a.className = "btn"; a.textContent = label + " →";
  a.addEventListener("click", () => { shared.practiceTopic = topic; shared.weakMode = false; });
  return a;
}
