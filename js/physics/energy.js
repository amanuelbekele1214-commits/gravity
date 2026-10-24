/** Energy, momentum, impulse and an idealized landing. SI units, up positive. */
import { requireNumber, G_EARTH } from "./forces.js";

export const kinetic = (m, v) => 0.5 * m * v * v;
export const rotationalKinetic = (I, w) => 0.5 * I * w * w;
export const gravitationalPE = (m, h, g = G_EARTH) => m * g * h;
export const momentum = (m, v) => m * v;

/** Speed after falling height h from rest, from K1 + U1 = K2 + U2 (no drag). */
export function speedFromDrop(h, g = G_EARTH) {
  requireNumber(h, "Height", { min: 0 });
  return Math.sqrt(2 * g * h);
}

/**
 * Idealized landing: the person arrives moving down at speed vImpact (m/s, > 0)
 * and is brought to rest in stopTime seconds by a constant contact force.
 *   Δp = m (0 − (−vImpact)) = m vImpact   (upward)
 *   average NET force       = Δp / Δt
 *   average CONTACT force N : N − m g = Δp/Δt  →  N = m vImpact/Δt + m g
 */
export function landing({ m, vImpact, stopTime, g = G_EARTH }) {
  requireNumber(m, "Mass", { min: 0, allowMin: false });
  requireNumber(vImpact, "Impact speed", { min: 0 });
  requireNumber(stopTime, "Stopping time", { min: 0, allowMin: false });
  const dp = m * vImpact;
  const Fnet = dp / stopTime;
  const N = Fnet + m * g;
  return {
    dp, impulse: dp, Fnet, N,
    timesWeight: N / (m * g),
    stopDistance: 0.5 * vImpact * stopTime   // constant deceleration: average speed × time
  };
}
