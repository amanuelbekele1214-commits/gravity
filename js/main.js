/** Router: each nav link is a #hash; each section module exports render(container). */
import * as simulator from "./sections/simulator.js";
import * as graphs from "./sections/graphs.js";
import * as forces from "./sections/forces.js";
import * as newton from "./sections/newton.js";
import * as friction from "./sections/friction.js";
import * as balance from "./sections/balance.js";
import * as torque from "./sections/torque.js";
import * as motion from "./sections/motion.js";
import * as energy from "./sections/energy.js";
import * as practice from "./sections/practice.js";
import * as formulas from "./sections/formulas.js";
import * as progressView from "./sections/progressView.js";

const ROUTES = { sim: simulator, graphs, forces, newton, friction, balance, torque, motion, energy, practice, formulas, progress: progressView };
const view = document.getElementById("view");
let cleanup = null;

function go() {
  const name = (location.hash || "#sim").slice(1).split("?")[0];
  const route = ROUTES[name] ? name : "sim";
  document.querySelectorAll(".rail a").forEach(a => a.toggleAttribute("aria-current", a.getAttribute("href") === "#" + route));
  document.querySelectorAll(".rail a[aria-current]").forEach(a => a.setAttribute("aria-current", "page"));
  if (typeof cleanup === "function") cleanup();
  view.innerHTML = "";
  try {
    cleanup = ROUTES[route].render(view) || null;
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="panel"><h3>This section hit an error</h3><p class="muted">${String(err.message || err)}</p></div>`;
  }
  view.focus({ preventScroll: true });
  window.scrollTo(0, 0);
  document.querySelector(".rail a[aria-current]")?.scrollIntoView({ block: "nearest", inline: "nearest" });
}
window.addEventListener("hashchange", go);
go();
