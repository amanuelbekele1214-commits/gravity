/**
 * Torque, moment of inertia, center of mass.
 * Sign convention in this lab: CLOCKWISE is positive for angles, ω, α and τ,
 * because the person in the simulator falls forward (to the right, +x).
 * torque2D() below also returns the standard counterclockwise value for reference.
 */
import { requireNumber, G_EARTH } from "./forces.js";

const RAD = Math.PI / 180;

/** τ = r F sin θ, θ = angle between the position vector r and the force. */
export function torqueMagnitude(r, F, thetaDeg) {
  requireNumber(r, "r", { min: 0 });
  requireNumber(F, "F", { min: 0 });
  const t = r * F * Math.sin(thetaDeg * RAD);
  return Math.abs(t) < 1e-12 ? 0 : t;
}

/**
 * Torque of force (Fx, Fy) applied at r = (rx, ry) measured from the pivot.
 * ccw = rx Fy − ry Fx (standard). cw = −ccw (this lab's convention).
 * leverArm = perpendicular distance from the pivot to the line of action.
 */
export function torque2D(rx, ry, Fx, Fy) {
  const ccw = rx * Fy - ry * Fx;
  const F = Math.hypot(Fx, Fy);
  return { ccw, cw: -ccw, leverArm: F > 0 ? Math.abs(ccw) / F : 0 };
}

/** Gravity's torque about a pivot on the ground: cw τ = m g (xCOM − xPivot). */
export function gravityTorque(m, xCom, xPivot, g = G_EARTH) {
  const d = xCom - xPivot;
  return { tau: m * g * d, leverArm: Math.abs(d) };
}

export const inertia = {
  point: (m, r) => m * r * r,
  rodAboutCenter: (m, L) => (m * L * L) / 12,
  rodAboutEnd: (m, L) => (m * L * L) / 3,
  parallelAxis: (Icm, m, d) => Icm + m * d * d
};

/** Center of mass of point masses [{m, x, y}]. */
export function centerOfMass(parts) {
  let M = 0, sx = 0, sy = 0;
  for (const p of parts) {
    requireNumber(p.m, "Segment mass", { min: 0 });
    M += p.m; sx += p.m * p.x; sy += p.m * p.y;
  }
  if (M <= 0) throw new RangeError("Total mass must be greater than 0.");
  return { x: sx / M, y: sy / M, M };
}

/**
 * Balance check against a base of support [xMin, xMax] on the ground.
 * Rigid-body statics only: a real person can step, bend or swing their arms to recover.
 */
export function balanceCheck(xCom, xMin, xMax) {
  if (xCom >= xMin && xCom <= xMax) {
    return { state: "balanced", margin: Math.min(xCom - xMin, xMax - xCom) };
  }
  const over = xCom > xMax ? xCom - xMax : xMin - xCom;
  return { state: "outside", edge: xCom > xMax ? "front" : "back", distance: over };
}

/**
 * Approximate body-segment mass fractions (Dempster data as tabulated by Winter).
 * They add up to 1.000.
 */
export const SEGMENT_FRACTIONS = {
  headNeck: 0.081, trunk: 0.497,
  upperArm: 0.028, forearmHand: 0.022,
  thigh: 0.100, shank: 0.0465, foot: 0.0145
};
