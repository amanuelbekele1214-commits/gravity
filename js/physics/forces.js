/**
 * Forces: weight, normal force, friction, air resistance, Newton's second law.
 * Pure functions. SI units: kg, m, s, N. Upward and rightward are positive
 * unless a function says otherwise.
 */

export const G_EARTH = 9.8;

/** Throws a readable error when a value is not a usable number. */
export function requireNumber(value, name, { min = -Infinity, max = Infinity, allowMin = true } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new RangeError(`${name} must be a number.`);
  if (allowMin ? value < min : value <= min) throw new RangeError(`${name} must be ${allowMin ? "at least" : "greater than"} ${min}.`);
  if (value > max) throw new RangeError(`${name} must be at most ${max}.`);
  return value;
}

/** Weight Fg = m g (magnitude, newtons). */
export function weight(m, g = G_EARTH) {
  requireNumber(m, "Mass", { min: 0, allowMin: false });
  requireNumber(g, "g", { min: 0 });
  return m * g;
}

/**
 * Normal force from the floor on a person, from Newton's second law in y:
 *   N + Fy_other − m g = m ay   →   N = m (g + ay) − Fy_other
 * ay: vertical acceleration (up +). Fy_other: any other vertical force (up +).
 * If the result is negative the surface would have to pull, so contact is lost.
 */
export function normalForce({ m, g = G_EARTH, ay = 0, FyOther = 0 }) {
  requireNumber(m, "Mass", { min: 0, allowMin: false });
  const N = m * (g + ay) - FyOther;
  return { N: Math.max(N, 0), inContact: N >= 0, required: N };
}

/**
 * Friction on an object that is pushed horizontally with force F (right +).
 * Static friction adjusts to whatever is needed, up to μs N.
 * If the needed friction is larger than μs N the object slides and
 * kinetic friction μk N acts opposite the sliding direction.
 * moving: current velocity (m/s). If it is non-zero, kinetic friction applies.
 */
export function friction({ F = 0, N, muS, muK, velocity = 0, m = null }) {
  requireNumber(N, "Normal force", { min: 0 });
  requireNumber(muS, "μs", { min: 0 });
  requireNumber(muK, "μk", { min: 0 });
  const fsMax = muS * N;
  const fk = muK * N;
  if (Math.abs(velocity) > 1e-9) {
    const f = -Math.sign(velocity) * fk;
    return { kind: "kinetic", f, fsMax, fk, slipping: true, ax: m ? (F + f) / m : null };
  }
  const needed = -F;
  if (Math.abs(needed) <= fsMax + 1e-12) {
    return { kind: "static", f: needed, fsMax, fk, slipping: false, ax: m ? 0 : null };
  }
  const f = -Math.sign(F) * fk;
  return { kind: "kinetic", f, fsMax, fk, slipping: true, ax: m ? (F + f) / m : null };
}

/** Linear air resistance  F = −b v  (component-wise, opposite velocity). */
export function dragLinear(b, v) {
  requireNumber(b, "b", { min: 0 });
  return -b * v;
}

/** Quadratic air resistance  F = −½ ρ Cd A v |v|  (opposite velocity). */
export function dragQuadratic({ rho = 1.2, Cd, A }, v) {
  requireNumber(Cd, "Cd", { min: 0 });
  requireNumber(A, "Area", { min: 0 });
  return -0.5 * rho * Cd * A * v * Math.abs(v);
}

/** 2-D drag vector for a velocity (vx, vy). model: 'none' | 'linear' | 'quadratic'. */
export function dragVector(drag, vx, vy) {
  if (!drag || drag.model === "none") return { x: 0, y: 0 };
  if (drag.model === "linear") return { x: -drag.b * vx, y: -drag.b * vy };
  const speed = Math.hypot(vx, vy);
  const k = 0.5 * (drag.rho ?? 1.2) * drag.Cd * drag.A;
  return { x: -k * speed * vx, y: -k * speed * vy };
}

/** Terminal speed: linear mg/b, quadratic sqrt(2mg/(ρ Cd A)). */
export function terminalSpeed(drag, m, g = G_EARTH) {
  if (!drag || drag.model === "none") return Infinity;
  if (drag.model === "linear") return drag.b > 0 ? (m * g) / drag.b : Infinity;
  const k = 0.5 * (drag.rho ?? 1.2) * drag.Cd * drag.A;
  return k > 0 ? Math.sqrt((m * g) / k) : Infinity;
}

/**
 * Force given as magnitude + direction angle (degrees, measured
 * counterclockwise from the +x axis) → components.
 */
export function components(magnitude, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  const x = magnitude * Math.cos(a), y = magnitude * Math.sin(a);
  return { x: Math.abs(x) < 1e-12 ? 0 : x, y: Math.abs(y) < 1e-12 ? 0 : y };
}

/** Newton's second law: sums the forces and divides by mass. */
export function newtonSecond(forces, m) {
  requireNumber(m, "Mass", { min: 0, allowMin: false });
  let Fx = 0, Fy = 0;
  for (const f of forces) { Fx += f.x; Fy += f.y; }
  const ax = Fx / m, ay = Fy / m;
  return {
    Fx, Fy, Fnet: Math.hypot(Fx, Fy),
    ax, ay, a: Math.hypot(ax, ay),
    directionDeg: Math.hypot(Fx, Fy) > 1e-12 ? (Math.atan2(Fy, Fx) * 180) / Math.PI : null
  };
}

/** Typical shoe-on-surface friction coefficients (approximate, for experiments). */
export const SURFACES = {
  rubberConcrete: { label: "Dry concrete (rubber sole)", muS: 0.9, muK: 0.7, color: "#3a3f45" },
  wood: { label: "Wood floor", muS: 0.6, muK: 0.45, color: "#5a3e26" },
  tile: { label: "Dry tile", muS: 0.5, muK: 0.4, color: "#4c5560" },
  wetTile: { label: "Wet tile", muS: 0.25, muK: 0.18, color: "#36506a" },
  ice: { label: "Ice", muS: 0.1, muK: 0.05, color: "#7fb3d5" }
};
