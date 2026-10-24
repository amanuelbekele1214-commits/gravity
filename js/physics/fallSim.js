/**
 * Fall simulator: a person modeled as ONE RIGID BODY ("a statue").
 *
 * Shape: a straight body (ankle → head) leaning by the chosen angle, rigidly joined
 * to a flat foot (heel → toe). Mass m, center of mass (COM) at a chosen fraction of
 * the height, moment of inertia about the COM taken as a uniform rod: I = m H² / 12.
 *
 * Each situation uses its own model:
 *  stand    – static equilibrium. ΣF = 0 and Στ = 0. The ground force acts at the
 *             "center of pressure" x_p = x_COM − y_COM·f/N, which must lie under the foot.
 *  slide    – feet flat and sliding: translation only, kinetic friction f = −μk N sign(v).
 *  tip      – rotation about a fixed foot edge (toe or heel): Στ_edge = I_edge α,
 *             I_edge = I_COM + m d² (parallel-axis theorem). Contact forces from ΣF = m a_COM.
 *  tipslide – rotating while the foot edge slides: N, α and the edge's acceleration
 *             solved together, with kinetic friction at the edge.
 *  air      – free fall: only gravity (+ optional drag, applied force). No torque about
 *             the COM, so ω stays constant.
 *  land     – idealized feet-first landing: constant contact force stops the vertical
 *             motion in the chosen stopping time; the legs bend by ½·v·Δt.
 *  down     – the body has hit the ground; the simulation records the impact and stops.
 *
 * Limitations (on purpose, for learning): no muscles or reflexes (real people step,
 * bend and swing their arms to recover), no wind, the body never bends except the
 * knees during landing, and rotation is held during the short landing phase.
 *
 * Sign convention: x right (+), y up (+). Angles φ, θ, ω, α, τ are CLOCKWISE-positive,
 * so falling forward (to the right) gives positive values.
 */
import { G_EARTH, dragVector } from "./forces.js";

const DEG = Math.PI / 180;

export const DEFAULTS = Object.freeze({
  m: 65, H: 1.75, comFrac: 0.56, leanDeg: 0, footLen: 0.26, heelBack: 0.06,
  muS: 0.9, muK: 0.7, v0x: 0, v0y: 0, h0: 0,
  F: 0, pushTime: 0.3, duration: 3, g: G_EARTH,
  drag: { model: "none", b: 10, rho: 1.2, Cd: 1.0, A: 0.7 },
  stopTime: 0.12
});

export function validate(p) {
  const errors = [];
  const num = (k, lo, hi) => {
    const v = p[k];
    if (typeof v !== "number" || !Number.isFinite(v)) errors.push(`${k} must be a number`);
    else if (v < lo || v > hi) errors.push(`${k} must be between ${lo} and ${hi}`);
  };
  num("m", 1, 500); num("H", 0.5, 2.5); num("comFrac", 0.3, 0.8); num("leanDeg", -45, 60);
  num("footLen", 0.05, 1); num("heelBack", 0, p.footLen ?? 1); num("muS", 0, 2); num("muK", 0, 2);
  num("v0x", -20, 20); num("v0y", -30, 30); num("h0", 0, 50); num("F", -5000, 5000);
  num("pushTime", 0, 60); num("duration", 0.1, 30); num("g", 0.1, 30); num("stopTime", 0.005, 2);
  if (p.muK > p.muS) errors.push("μk should not be larger than μs");
  return errors;
}

/** Rotate a vector clockwise by angle a (radians). */
const rotCW = (x, y, a) => ({ x: x * Math.cos(a) + y * Math.sin(a), y: -x * Math.sin(a) + y * Math.cos(a) });

/** Builds the rigid shape (points relative to the COM when φ = 0). */
export function makeBody(p) {
  const H = p.H, th = p.leanDeg * DEG;
  const u = { x: Math.sin(th), y: Math.cos(th) };          // along the body
  const n = { x: Math.cos(th), y: -Math.sin(th) };         // forward, across the body
  const along = (f, side = 0) => ({ x: u.x * f * H + n.x * side * H, y: u.y * f * H + n.y * side * H });
  const C0 = along(p.comFrac);
  const pts = {
    ankle: { x: 0, y: 0 }, knee: along(0.285, 0.012), hip: along(0.53), shoulder: along(0.82),
    neck: along(0.87), head: along(0.935), headTop: along(1.0),
    elbow: along(0.645, 0.03), hand: along(0.47, 0.045),
    heel: { x: -p.heelBack, y: 0 }, toe: { x: p.footLen - p.heelBack, y: 0 }
  };
  const rel = {};
  for (const k in pts) rel[k] = { x: pts[k].x - C0.x, y: pts[k].y - C0.y };
  return {
    rel, C0,
    Icm: (p.m * H * H) / 12,
    headRadius: 0.065 * H,
    feet: ["heel", "toe"],
    bodyPoints: ["knee", "hip", "shoulder", "headTop", "head", "elbow", "hand"]
  };
}

/** World position of a body point for a pose {xc, yc, phi, crouch}. */
export function pointWorld(body, pose, name) {
  const r = body.rel[name];
  const ry = (name === "heel" || name === "toe" || name === "ankle") ? r.y + (pose.crouch || 0) : r.y;
  const w = rotCW(r.x, ry, pose.phi);
  return { x: pose.xc + w.x, y: pose.yc + w.y };
}

export const PHASE_INFO = {
  stand: { label: "Standing in equilibrium", model: "Statics: ΣF = 0 and Στ = 0. Static friction balances any push; the ground force acts under the foot." },
  lean: { label: "Leaning but balanced", model: "Statics: the center of pressure is still under the foot, so the ground can supply the balancing torque." },
  tip: { label: "Losing balance: rotating", model: "Fixed-axis rotation about the foot edge: Στ = I·α with I = I_COM + m·d²." },
  slide: { label: "Sliding: friction too small", model: "Translation with kinetic friction: f = μk·N, opposite the sliding." },
  tipslide: { label: "Rotating while the foot slides", model: "Rotation plus sliding edge: N, α and the edge's acceleration solved together with f = μk·N." },
  air: { label: "Free fall", model: "Only gravity (plus drag or a push if switched on): a_y = −g, no torque about the COM so ω is constant." },
  land: { label: "Landing: contact force", model: "Idealized landing: constant contact force stops the fall in the chosen time. N = m·v/Δt + m·g." },
  down: { label: "Hit the ground", model: "The body touched the ground. The simulation records the impact speed and stops moving." }
};

export function simulate(input = {}) {
  const p = { ...DEFAULTS, ...input, drag: { ...DEFAULTS.drag, ...(input.drag || {}) } };
  const errors = validate(p);
  if (errors.length) return { ok: false, errors, params: p };

  const body = makeBody(p);
  const { m, g, muS, muK } = p;
  const Icm = body.Icm;
  const dt = 0.0005, sampleEvery = 0.005;
  const appliedF = t => (t < p.pushTime ? p.F : 0);

  const s = {
    phase: "stand", t: 0,
    xc: body.C0.x, yc: body.C0.y + p.h0, vx: p.v0x, vy: p.v0y,
    phi: 0, omega: 0, crouch: 0,
    pivot: null, xp: 0, vp: 0, slipDir: 1,
    landStart: 0, landN: 0, landV: 0, impact: null
  };
  const samples = [], events = [];
  const event = (type, text) => events.push({ t: s.t, type, text });

  const pt = (name, st = s) => pointWorld(body, st, name);
  const footY = () => Math.min(pt("heel").y, pt("toe").y);
  const relWorld = (name, phi, crouch = s.crouch) => {
    const r = body.rel[name];
    return rotCW(r.x, (name === "heel" || name === "toe") ? r.y + crouch : r.y, phi);
  };
  const extForces = (t, vx, vy) => {             // forces acting at the COM, except contact
    const D = dragVector(p.drag, vx, vy);
    return { x: appliedF(t) + D.x, y: -m * g + D.y, D };
  };

  /* ---------- per-phase physics ---------- */

  // Stand / slide: feet flat on the ground.
  function standCheck() {
    const F = appliedF(s.t);
    const N = m * g;
    const fNeeded = -F;
    const xp = s.xc - s.yc * fNeeded / N;        // center of pressure
    const xHeel = pt("heel").x, xToe = pt("toe").x;
    if (xp > xToe + 1e-9) return { next: "tip", edge: "toe" };
    if (xp < xHeel - 1e-9) return { next: "tip", edge: "heel" };
    if (Math.abs(fNeeded) > muS * N + 1e-9) return { next: "slide", dir: Math.sign(F) };
    return { next: "stand", N, f: fNeeded, xp };
  }

  // Rotation about a fixed edge. Returns α, contact forces and COM acceleration.
  function tipDynamics(phi, omega, t) {
    const rp = relWorld(s.pivot, phi);           // COM → pivot
    const rx = -rp.x, ry = -rp.y;                // pivot → COM
    const vcx = omega * ry, vcy = -omega * rx;
    const E = extForces(t, vcx, vcy);
    const Ip = Icm + m * (rx * rx + ry * ry);
    const tau = ry * E.x - rx * E.y;             // clockwise torque about the pivot
    const alpha = tau / Ip;
    const ax = alpha * ry - omega * omega * rx;
    const ay = -alpha * rx - omega * omega * ry;
    const f = m * ax - E.x, N = m * ay - E.y;
    return { alpha, ax, ay, f, N, vcx, vcy, rx, ry, Ip, tau, E };
  }

  // Rotation while the edge slides with kinetic friction (direction slipDir).
  function tipSlideDynamics(phi, omega, vp, t) {
    const rp = relWorld(s.pivot, phi);
    const rx = -rp.x, ry = -rp.y;
    const vcx = vp + omega * ry, vcy = -omega * rx;
    const E = extForces(t, vcx, vcy);
    const sd = Math.abs(vp) > 1e-9 ? Math.sign(vp) : s.slipDir;
    const k = rx + muK * sd * ry;
    const den = Icm + k * m * rx;
    const alpha = den > 1e-9 ? (-k * (m * omega * omega * ry + E.y)) / den : 0;
    const ay = -alpha * rx - omega * omega * ry;
    const N = m * ay - E.y;
    const f = -muK * sd * N;
    const ax = (f + E.x) / m;
    const apx = ax - (alpha * ry - omega * omega * rx);
    return { alpha, ax, ay, f, N, apx, vcx, vcy, rx, ry, E, sd };
  }

  function rk4(state, deriv, h) {
    const k1 = deriv(state, 0);
    const add = (st, k, c) => st.map((v, i) => v + c * k[i]);
    const k2 = deriv(add(state, k1, h / 2), h / 2);
    const k3 = deriv(add(state, k2, h / 2), h / 2);
    const k4 = deriv(add(state, k3, h), h);
    return state.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  }

  const bodyHitsGround = () => {
    for (const nm of body.bodyPoints) {
      const q = pt(nm);
      const lim = nm === "head" ? body.headRadius : 0;
      if (q.y - lim <= 0) return nm;
    }
    return null;
  };

  function goDown(pointName) {
    // speed of that point at impact: v_COM + ω × r
    const q = pt(pointName), rx = q.x - s.xc, ry = q.y - s.yc;
    const vx = s.vx + s.omega * ry, vy = s.vy - s.omega * rx;
    s.impact = { point: pointName, speed: Math.hypot(vx, vy), vy, t: s.t };
    event("down", `The ${pointName === "headTop" || pointName === "head" ? "head" : pointName} hits the ground at ${Math.hypot(vx, vy).toFixed(2)} m/s.`);
    s.phase = "down"; s.vx = s.vy = s.omega = 0;
  }

  function enterFromStandCheck() {
    const c = standCheck();
    if (c.next === "tip") {
      s.pivot = c.edge; s.xp = pt(c.edge).x; s.vp = 0;
      s.phase = "tip";
      event("tip", `The center of pressure reaches the ${c.edge}. The body starts to rotate about the ${c.edge}.`);
      // static friction may already be too small: checked on the first tip step
    } else if (c.next === "slide") {
      s.phase = "slide"; s.slipDir = c.dir;
      event("slide", `The push needs more friction than μs·N = ${(muS * m * g).toFixed(0)} N. The feet start to slide.`);
    } else {
      s.phase = "stand";
    }
  }

  /* ---------- initial state ---------- */
  if (p.h0 > 0 || p.v0y > 0) {
    s.phase = "air";
    event("air", p.h0 > 0 ? `Released ${p.h0} m above the ground: free fall.` : `Jumps with v₀y = ${p.v0y} m/s: airborne.`);
  } else if (Math.abs(p.v0x) > 1e-9) {
    s.phase = "slide"; s.slipDir = Math.sign(p.v0x);
    event("slide", `The feet move at ${p.v0x} m/s relative to the ground: kinetic friction acts.`);
  } else {
    enterFromStandCheck();
  }

  /* ---------- record one sample ---------- */
  let lastRec = null;
  function record(extra) {
    const v2 = s.vx * s.vx + s.vy * s.vy;
    const Kt = 0.5 * m * v2, Kr = 0.5 * Icm * s.omega * s.omega;
    const pose = { xc: s.xc, yc: s.yc, phi: s.phi, crouch: s.crouch };
    let tauSupport = null, edge = null;
    if (s.phase === "tip" || s.phase === "tipslide") { edge = s.pivot; }
    else if (s.phase === "stand" || s.phase === "slide") { edge = (extra.xp ?? s.xc) >= pt("ankle").x ? "toe" : "heel"; }
    if (edge) tauSupport = m * g * (s.xc - pt(edge).x);
    const rec = {
      t: s.t, phase: s.phase === "stand" && (Math.abs(p.leanDeg) > 0.5 || Math.abs(appliedF(s.t)) > 0) ? "lean" : s.phase,
      xc: s.xc, yc: s.yc, vx: s.vx, vy: s.vy,
      ax: extra.ax ?? 0, ay: extra.ay ?? 0,
      Fx: m * (extra.ax ?? 0), Fy: m * (extra.ay ?? 0),
      N: extra.N ?? 0, f: extra.f ?? 0, xp: extra.xp ?? null, contact: extra.contact ?? null,
      Fapp: appliedF(s.t), drag: extra.D ?? { x: 0, y: 0 },
      phiDeg: s.phi / DEG, tiltDeg: p.leanDeg + s.phi / DEG,
      omega: s.omega, alpha: extra.alpha ?? 0,
      tauSupport, edge, tauCOM: Icm * (extra.alpha ?? 0),
      K: Kt + Kr, Ktrans: Kt, Krot: Kr, U: m * g * s.yc, E: Kt + Kr + m * g * s.yc,
      pose
    };
    samples.push(rec);
    lastRec = rec;
  }

  /* ---------- main loop ---------- */
  let nextSample = 0;
  const steps = Math.ceil(p.duration / dt);
  for (let i = 0; i <= steps; i++) {
    let info = {};

    if (s.phase === "stand") {
      const c = standCheck();
      if (c.next !== "stand") { enterFromStandCheck(); }
      else info = { N: c.N, f: c.f, xp: c.xp, contact: c.xp, ax: 0, ay: 0 };
    }

    if (s.phase === "slide") {
      const F = appliedF(s.t);
      const dir = Math.abs(s.vx) > 1e-9 ? Math.sign(s.vx) : s.slipDir;
      const D = dragVector(p.drag, s.vx, 0);
      const N = m * g;
      const f = -muK * N * dir;
      const ax = (F + f + D.x) / m;
      const xp = s.xc - s.yc * f / N;
      const xHeel = pt("heel").x, xToe = pt("toe").x;
      if (xp > xToe || xp < xHeel) {
        s.pivot = xp > xToe ? "toe" : "heel";
        s.xp = pt(s.pivot).x; s.vp = s.vx; s.slipDir = dir;
        s.phase = Math.abs(s.vx) > 1e-6 ? "tipslide" : "tip";
        event("tip", `Friction at the feet pushes the center of pressure past the ${s.pivot}: the body trips and starts rotating.`);
      } else {
        info = { N, f, xp, contact: xp, ax, ay: 0, D };
        if (i % Math.round(sampleEvery / dt) === 0) record(info);
        const nvx = s.vx + ax * dt;
        s.xc += 0.5 * (s.vx + nvx) * dt;
        if (Math.abs(s.vx) > 1e-9 && Math.sign(nvx) !== Math.sign(s.vx)) {
          s.vx = 0;
          const c = standCheck();
          if (c.next === "stand") { s.phase = "stand"; event("stop", "Friction stops the sliding. Static friction now holds the feet."); }
          else enterFromStandCheck();
        } else s.vx = nvx;
        s.t += dt;
        if (s.t > p.duration + 1e-9) break;
        continue;
      }
    }

    if (s.phase === "tip") {
      const d = tipDynamics(s.phi, s.omega, s.t);
      if (d.N < 0) {
        s.phase = "air"; event("air", "The ground can no longer push: contact is lost and the body flies free.");
      } else if (Math.abs(d.f) > muS * d.N + 1e-9) {
        s.phase = "tipslide"; s.slipDir = -Math.sign(d.f); s.vp = 0;
        event("slip", `Rotation needs ${Math.abs(d.f).toFixed(0)} N of friction but static friction can give only ${(muS * d.N).toFixed(0)} N: the foot slips.`);
      } else {
        info = { N: d.N, f: d.f, contact: s.xp, ax: d.ax, ay: d.ay, alpha: d.alpha, D: d.E.D };
        if (i % Math.round(sampleEvery / dt) === 0) record(info);
        const deriv = (st, h) => { const q = tipDynamics(st[0], st[1], s.t + h); return [st[1], q.alpha]; };
        const [nphi, nom] = rk4([s.phi, s.omega], deriv, dt);
        s.phi = nphi; s.omega = nom; s.t += dt;
        const rp = relWorld(s.pivot, s.phi);
        s.xc = s.xp - rp.x; s.yc = 0 - rp.y;
        const rx = s.xc - s.xp, ry = s.yc;
        s.vx = s.omega * ry; s.vy = -s.omega * rx;
        // feet back flat?
        if ((s.pivot === "toe" && s.phi < 0) || (s.pivot === "heel" && s.phi > 0)) {
          s.phi = 0; s.omega = 0; s.vx = s.vy = 0;
          const rp0 = relWorld(s.pivot, 0); s.xc = s.xp - rp0.x; s.yc = -rp0.y;
          event("flat", "The foot lands flat again (heel/toe strike). Rotation stops.");
          enterFromStandCheck();
        } else {
          const hit = bodyHitsGround();
          if (hit) goDown(hit);
        }
        if (s.t > p.duration + 1e-9) break;
        continue;
      }
    }

    if (s.phase === "tipslide") {
      const d = tipSlideDynamics(s.phi, s.omega, s.vp, s.t);
      if (d.N < 0) {
        s.phase = "air"; event("air", "The ground can no longer push: contact is lost and the body flies free.");
      } else {
        info = { N: d.N, f: d.f, contact: s.xp, ax: d.ax, ay: d.ay, alpha: d.alpha, D: d.E.D };
        if (i % Math.round(sampleEvery / dt) === 0) record(info);
        const deriv = (st, h) => {
          const q = tipSlideDynamics(st[2], st[3], st[1], s.t + h);
          return [st[1], q.apx, st[3], q.alpha];
        };
        const prevVp = s.vp;
        const [nxp, nvp, nphi, nom] = rk4([s.xp, s.vp, s.phi, s.omega], deriv, dt);
        s.xp = nxp; s.vp = nvp; s.phi = nphi; s.omega = nom; s.t += dt;
        const rp = relWorld(s.pivot, s.phi);
        s.xc = s.xp - rp.x; s.yc = -rp.y;
        const rx = s.xc - s.xp, ry = s.yc;
        s.vx = s.vp + s.omega * ry; s.vy = -s.omega * rx;
        const reversed = Math.abs(prevVp) > 1e-9 ? Math.sign(s.vp) !== Math.sign(prevVp)
                                                 : Math.sign(s.vp) === -s.slipDir;
        if (reversed) {
          s.vp = 0;
          const q = tipDynamics(s.phi, s.omega, s.t);
          if (Math.abs(q.f) <= muS * q.N) { s.phase = "tip"; event("stick", "The foot stops sliding; static friction grips again."); }
          else s.slipDir = -Math.sign(q.f);
        }
        if ((s.pivot === "toe" && s.phi < 0) || (s.pivot === "heel" && s.phi > 0)) {
          s.phi = 0; s.omega = 0; s.vy = 0;
          const rp0 = relWorld(s.pivot, 0); s.xc = s.xp - rp0.x; s.yc = -rp0.y;
          s.vx = s.vp;
          s.phase = Math.abs(s.vx) > 1e-6 ? "slide" : "stand";
          event("flat", "The foot lands flat again.");
          if (s.phase === "stand") enterFromStandCheck();
        } else {
          const hit = bodyHitsGround();
          if (hit) goDown(hit);
        }
        if (s.t > p.duration + 1e-9) break;
        continue;
      }
    }

    if (s.phase === "air") {
      const E = extForces(s.t, s.vx, s.vy);
      const ax = E.x / m, ay = E.y / m;
      info = { ax, ay, alpha: 0, D: E.D };
      if (i % Math.round(sampleEvery / dt) === 0) record(info);
      const deriv = (st, h) => { const q = extForces(s.t + h, st[2], st[3]); return [st[2], st[3], q.x / m, q.y / m]; };
      const [nx, ny, nvx, nvy] = rk4([s.xc, s.yc, s.vx, s.vy], deriv, dt);
      s.xc = nx; s.yc = ny; s.vx = nvx; s.vy = nvy;
      s.phi += s.omega * dt; s.t += dt;
      // ground contact?
      const lowFoot = pt("heel").y < pt("toe").y ? "heel" : "toe";
      const hit = bodyHitsGround();
      if (hit && pt(hit).y < pt(lowFoot).y) { goDown(hit); }
      else if (pt(lowFoot).y <= 0 && s.vy < 0) {
        s.yc -= pt(lowFoot).y;                     // put the foot exactly on the ground
        const tilt = Math.abs(p.leanDeg + s.phi / DEG);
        if (tilt > 45) { goDown(lowFoot); }
        else {
          s.phase = "land"; s.landStart = s.t; s.landV = -s.vy;
          const L = { N: m * s.landV / p.stopTime + m * g };
          s.landN = L.N;
          event("land", `Feet hit the ground at ${s.landV.toFixed(2)} m/s. Average contact force ≈ ${L.N.toFixed(0)} N (${(L.N / (m * g)).toFixed(1)}× body weight) for ${p.stopTime} s.`);
          s.pivot = lowFoot;
        }
      }
      if (s.t > p.duration + 1e-9) break;
      continue;
    }

    if (s.phase === "land") {
      const ay = s.landV / p.stopTime;              // constant upward acceleration
      const N = s.landN;
      const fk = muK * N;
      let ax = 0, f = 0;
      if (Math.abs(s.vx) > 1e-9) { f = -Math.sign(s.vx) * fk; ax = (f + appliedF(s.t)) / m; }
      info = { N, f, contact: pt(s.pivot).x, ax, ay, alpha: 0 };
      if (i % Math.round(sampleEvery / dt) === 0) record(info);
      const nvy = Math.min(s.vy + ay * dt, 0);
      const drop = -(0.5 * (s.vy + nvy) * dt);
      s.crouch += drop; s.yc -= drop; s.vy = nvy;
      const nvx = s.vx + ax * dt;
      s.xc += 0.5 * (s.vx + nvx) * dt;
      s.vx = (Math.abs(s.vx) > 1e-9 && Math.sign(nvx) !== Math.sign(s.vx)) ? 0 : nvx;
      s.t += dt;
      if (s.vy >= 0 || s.t - s.landStart >= p.stopTime - 1e-12) {
        s.vy = 0; s.omega = 0;
        const yh = pt("heel").y, yt = pt("toe").y;
        if (Math.abs(yh - yt) < 0.015) {
          // snap feet flat
          s.phi = 0;
          const low = Math.min(pt("heel").y, pt("toe").y); s.yc -= low;
          event("landed", "Landing finished: the person has stopped moving down.");
          if (Math.abs(s.vx) > 1e-6) { s.phase = "slide"; s.slipDir = Math.sign(s.vx); }
          else enterFromStandCheck();
        } else {
          s.pivot = yh < yt ? "heel" : "toe"; s.xp = pt(s.pivot).x; s.vp = 0; s.vx = 0;
          s.phase = "tip";
          event("landed", `Landing finished on the ${s.pivot} only: the body now pivots about it.`);
        }
      }
      if (s.t > p.duration + 1e-9) break;
      continue;
    }

    if (s.phase === "down") {
      info = { ax: 0, ay: 0, alpha: 0, N: m * g };
      if (i % Math.round(sampleEvery / dt) === 0) record(info);
      s.t += dt;
      if (s.t > p.duration + 1e-9) break;
      continue;
    }

    // stand (no motion)
    if (i % Math.round(sampleEvery / dt) === 0) record(info);
    s.t += dt;
    if (s.t > p.duration + 1e-9) break;
  }
  if (lastRec && lastRec.t < p.duration - 1e-9) record({});

  return { ok: true, params: p, body, samples, events, impact: s.impact };
}

/** Sample closest to time t (samples are evenly spaced). */
export function sampleAt(result, t) {
  const S = result.samples;
  if (!S.length) return null;
  let lo = 0, hi = S.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (S[mid].t < t) lo = mid; else hi = mid; }
  return Math.abs(S[lo].t - t) <= Math.abs(S[hi].t - t) ? S[lo] : S[hi];
}
