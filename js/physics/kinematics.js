/**
 * Kinematics in one dimension (vertical), up is positive unless stated.
 * Constant-acceleration equations, plus numerical falls with air resistance
 * and the exact (calculus) solution for linear drag.
 */
import { requireNumber, G_EARTH } from "./forces.js";

/** y(t) and v(t) for constant acceleration a. */
export function constantAccel({ y0 = 0, v0 = 0, a }, t) {
  return { y: y0 + v0 * t + 0.5 * a * t * t, v: v0 + a * t, a };
}

/**
 * Smallest positive time when y(t) = yTarget for constant acceleration.
 * Returns null if it never happens.
 */
export function timeToReach({ y0 = 0, v0 = 0, a }, yTarget) {
  // ½ a t² + v0 t + (y0 − yTarget) = 0
  const A = 0.5 * a, B = v0, C = y0 - yTarget;
  if (Math.abs(A) < 1e-15) {
    if (Math.abs(B) < 1e-15) return null;
    const t = -C / B;
    return t >= 0 ? t : null;
  }
  const disc = B * B - 4 * A * C;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  const roots = [(-B - s) / (2 * A), (-B + s) / (2 * A)].filter(t => t >= -1e-12).sort((p, q) => p - q);
  return roots.length ? Math.max(roots[0], 0) : null;
}

/** Ideal free fall from rest, DOWNWARD positive: v = g t, d = ½ g t². */
export function freeFallFromRest(t, g = G_EARTH) {
  requireNumber(t, "Time", { min: 0 });
  return { v: g * t, d: 0.5 * g * t * t };
}

/**
 * Exact solution with linear drag F = −b v (up positive):
 *   m dv/dt = −m g − b v
 *   v(t) = −vT + (v0 + vT) e^(−t/τ),  vT = m g / b,  τ = m / b
 *   y(t) = y0 − vT t + τ (v0 + vT)(1 − e^(−t/τ))
 */
export function linearDragExact({ y0 = 0, v0 = 0, m, b, g = G_EARTH }, t) {
  const vT = (m * g) / b, tau = m / b, e = Math.exp(-t / tau);
  return {
    v: -vT + (v0 + vT) * e,
    y: y0 - vT * t + tau * (v0 + vT) * (1 - e),
    a: -(v0 + vT) * e / tau,
    vT, tau
  };
}

/**
 * Numerical 1-D vertical fall until the object reaches the ground (y = 0)
 * or tMax. drag: { model:'none'|'linear'|'quadratic', b, rho, Cd, A }.
 * Returns samples (t, y, v, a, Fdrag) and the landing time and speed.
 */
export function simulateVerticalFall({ h0, v0 = 0, m, g = G_EARTH, drag = { model: "none" }, dt = 0.0005, tMax = 60, sampleEvery = 0.005 }) {
  requireNumber(h0, "Height", { min: 0 });
  requireNumber(m, "Mass", { min: 0, allowMin: false });
  const dragF = v => {
    if (drag.model === "linear") return -drag.b * v;
    if (drag.model === "quadratic") return -0.5 * (drag.rho ?? 1.2) * drag.Cd * drag.A * v * Math.abs(v);
    return 0;
  };
  const acc = v => -g + dragF(v) / m;
  let t = 0, y = h0, v = v0;
  const samples = [{ t, y, v, a: acc(v), Fdrag: dragF(v) }];
  let nextSample = sampleEvery;
  if (h0 === 0 && v0 <= 0) return { samples, tLand: 0, vLand: v0 };
  while (t < tMax) {
    // RK4
    const k1v = acc(v), k1y = v;
    const k2v = acc(v + 0.5 * dt * k1v), k2y = v + 0.5 * dt * k1v;
    const k3v = acc(v + 0.5 * dt * k2v), k3y = v + 0.5 * dt * k2v;
    const k4v = acc(v + dt * k3v), k4y = v + dt * k3v;
    const ny = y + (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
    const nv = v + (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
    if (ny <= 0 && t > 0) {
      const frac = y / (y - ny);            // interpolate the landing moment
      const tl = t + frac * dt, vl = v + frac * (nv - v);
      samples.push({ t: tl, y: 0, v: vl, a: acc(vl), Fdrag: dragF(vl) });
      return { samples, tLand: tl, vLand: vl };
    }
    t += dt; y = ny; v = nv;
    if (t >= nextSample - 1e-12) { samples.push({ t, y, v, a: acc(v), Fdrag: dragF(v) }); nextSample += sampleEvery; }
  }
  return { samples, tLand: null, vLand: v };
}
