/**
 * Progress tracking, saved in this browser (localStorage). No account needed.
 * Backup: copy the progress code (a text string) and paste it back to restore.
 */
const KEY = "fall-physics-lab-progress-v1";

const blank = () => ({
  attempts: 0, correct: 0,
  byTopic: {},            // topic → { attempts, correct }
  recent: [],             // last 30 results { t, id, topic, level, ok }
  formulas: {},           // formula id → true when marked mastered
  experiments: {},        // experiment id → true when completed
  secondsPracticed: 0,
  started: Date.now()
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    return { ...blank(), ...JSON.parse(raw) };
  } catch { return blank(); }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage blocked: keep in memory */ }
  listeners.forEach(fn => fn(state));
}
const listeners = new Set();

export const progress = {
  get: () => state,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  recordAnswer({ id, topic, level, ok }) {
    state.attempts++; if (ok) state.correct++;
    const t = (state.byTopic[topic] ||= { attempts: 0, correct: 0 });
    t.attempts++; if (ok) t.correct++;
    state.recent.unshift({ t: Date.now(), id, topic, level, ok });
    state.recent = state.recent.slice(0, 30);
    save();
  },
  setFormula(id, mastered) { if (mastered) state.formulas[id] = true; else delete state.formulas[id]; save(); },
  completeExperiment(id) { if (!state.experiments[id]) { state.experiments[id] = true; save(); } },
  addSeconds(s) { state.secondsPracticed += s; save(); },
  /** Topics sorted weakest first (needs at least 2 attempts to count). */
  weakTopics() {
    return Object.entries(state.byTopic)
      .filter(([, v]) => v.attempts >= 2)
      .map(([k, v]) => ({ topic: k, acc: v.correct / v.attempts, attempts: v.attempts }))
      .sort((a, b) => a.acc - b.acc);
  },
  exportCode() { return btoa(unescape(encodeURIComponent(JSON.stringify(state)))); },
  importCode(code) {
    const obj = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (typeof obj !== "object" || obj === null || typeof obj.attempts !== "number") throw new Error("That code is not a progress backup.");
    state = { ...blank(), ...obj }; save();
  },
  reset() { state = blank(); save(); }
};

/* Practice time: counts seconds while the tab is visible and the user was active in the last minute. */
let lastActive = Date.now();
["pointerdown", "keydown", "input"].forEach(ev => window.addEventListener(ev, () => { lastActive = Date.now(); }, { passive: true }));
setInterval(() => {
  if (document.visibilityState === "visible" && Date.now() - lastActive < 60000) {
    state.secondsPracticed += 15;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }
}, 15000);
