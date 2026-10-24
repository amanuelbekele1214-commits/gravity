/*
  Gravity Rocket Lab: physics engine
  ----------------------------------
  Two jobs:
    1. stability(): Barrowman equations -> center of pressure (CP), stability margin
    2. simulate():  step-by-step flight (thrust, gravity, drag, burning fuel, parachute)

  Units inside the engine are SI: metres, kilograms, seconds, newtons.
  The page converts from cm and grams before calling these functions.
  Works in the browser (window.RocketPhysics) and in Node (module.exports) for tests.
*/
(function (root) {
  "use strict";

  const G = 9.80665;          // gravity, m/s^2
  const RHO0 = 1.225;         // air density at sea level, kg/m^3
  const SCALE_HEIGHT = 8500;  // how fast air thins with height, m

  /* ---------- Motors ----------
     Curve shapes: published Estes RASP thrust data.
     Each curve is rescaled so its total impulse matches the ThrustCurve.org listing
     (A8 2.5 N·s, B6 4.3 N·s, C6 8.8 N·s). Masses are from the same listings. */
  const MOTORS = {
    A8: {
      name: "Estes A8", impulse: 2.5, propMass: 0.003, totalMass: 0.016, delays: [3, 5],
      curve: [[0,0],[0.041,0.512],[0.084,2.115],[0.127,4.358],[0.166,6.794],[0.192,8.588],
        [0.206,9.294],[0.226,9.73],[0.236,8.845],[0.247,7.179],[0.261,5.063],[0.277,3.717],
        [0.306,3.205],[0.351,2.884],[0.405,2.636],[0.483,2.499],[0.53,2.371],[0.6,2.307],
        [0.693,2.307],[0.774,2.371],[0.809,2.403],[0.842,2.307],[0.866,2.218],[0.904,1.858],
        [0.926,1.411],[0.947,0.808],[0.966,0.271],[0.982,0]]
    },
    B6: {
      name: "Estes B6", impulse: 4.3, propMass: 0.006, totalMass: 0.019, delays: [2, 4, 6],
      curve: [[0,0],[0.023,0.688],[0.057,2.457],[0.089,4.816],[0.116,7.274],[0.148,9.929],
        [0.171,12.14],[0.191,11.695],[0.2,10.719],[0.209,9.24],[0.23,7.667],[0.255,6.488],
        [0.305,5.505],[0.375,4.816],[0.477,4.62],[0.58,4.62],[0.671,4.521],[0.746,4.226],
        [0.786,4.325],[0.802,3.9],[0.825,3.244],[0.86,1.475],[0.873,0]]
    },
    C6: {
      name: "Estes C6", impulse: 8.8, propMass: 0.011, totalMass: 0.024, delays: [3, 5, 7],
      curve: [[0,0],[0.031,0.946],[0.092,4.826],[0.139,9.936],[0.192,14.09],[0.209,11.446],
        [0.231,7.381],[0.248,6.151],[0.292,5.489],[0.37,4.921],[0.475,4.448],[0.671,4.258],
        [0.702,4.542],[0.723,4.164],[0.85,4.448],[1.063,4.353],[1.211,4.353],[1.242,4.069],
        [1.303,4.258],[1.468,4.353],[1.656,4.448],[1.821,4.448],[1.834,2.933],[1.847,1.325],
        [1.86,0]]
    }
  };

  function trapz(curve) {
    let s = 0;
    for (let i = 1; i < curve.length; i++)
      s += (curve[i][0] - curve[i - 1][0]) * (curve[i][1] + curve[i - 1][1]) / 2;
    return s;
  }

  // Rescale every curve once so its area equals the listed total impulse.
  for (const k in MOTORS) {
    const m = MOTORS[k];
    const f = m.impulse / trapz(m.curve);
    m.curve = m.curve.map(([t, F]) => [t, F * f]);
    m.burnTime = m.curve[m.curve.length - 1][0];
    m.peakThrust = Math.max(...m.curve.map(p => p[1]));
    // cumulative impulse at each point, used to burn propellant in step with thrust
    m.cum = [0];
    for (let i = 1; i < m.curve.length; i++) {
      const a = m.curve[i - 1], b = m.curve[i];
      m.cum.push(m.cum[i - 1] + (b[0] - a[0]) * (a[1] + b[1]) / 2);
    }
  }

  function thrustAt(m, t) {
    const c = m.curve;
    if (t <= 0 || t >= m.burnTime) return 0;
    for (let i = 1; i < c.length; i++) {
      if (t <= c[i][0]) {
        const a = c[i - 1], b = c[i];
        return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]);
      }
    }
    return 0;
  }

  // impulse delivered so far (N·s): area under the curve from 0 to t
  function impulseSoFar(m, t) {
    const c = m.curve;
    if (t <= 0) return 0;
    if (t >= m.burnTime) return m.impulse;
    for (let i = 1; i < c.length; i++) {
      if (t <= c[i][0]) {
        const a = c[i - 1], Fa = a[1], Ft = thrustAt(m, t);
        return m.cum[i - 1] + (t - a[0]) * (Fa + Ft) / 2;
      }
    }
    return m.impulse;
  }

  /* ---------- Stability (Barrowman equations) ----------
     r: { noseShape, noseLen, bodyLen, diameter, finCount, rootChord, tipChord,
          span, sweep, finOffset, cg }       all lengths in metres
     finOffset = gap between the bottom of the body and the fins' trailing root edge
     cg        = balance point measured from the nose tip, motor installed */
  const NOSE_CP = { cone: 0.666, ogive: 0.466, parabolic: 0.5 };

  function stability(r) {
    const d = r.diameter, R = d / 2;
    const L = r.noseLen + r.bodyLen;

    // Nose cone: normal force coefficient is 2 for every shape; only its CP spot changes
    const CNn = 2;
    const Xn = NOSE_CP[r.noseShape] * r.noseLen;

    // Fins
    const N = r.finCount, Cr = r.rootChord, Ct = r.tipChord, s = r.span, Xs = r.sweep;
    const Xb = L - r.finOffset - Cr;                       // nose tip -> fin root leading edge
    const midChord = Math.sqrt(s * s + Math.pow(Xs + Ct / 2 - Cr / 2, 2));
    const interference = 1 + R / (s + R);                  // the body boosts the fins a little
    const CNf = interference * (4 * N * Math.pow(s / d, 2)) /
                (1 + Math.sqrt(1 + Math.pow(2 * midChord / (Cr + Ct), 2)));
    const Xf = Xb + (Xs / 3) * (Cr + 2 * Ct) / (Cr + Ct) +
               (1 / 6) * ((Cr + Ct) - (Cr * Ct) / (Cr + Ct));

    const CN = CNn + CNf;
    const cp = (CNn * Xn + CNf * Xf) / CN;
    const margin = (cp - r.cg) / d;                        // in "calibers" (body widths)

    return { cp, cg: r.cg, margin, length: L, CNn, Xn, CNf, Xf };
  }

  // How much clay in the nose (kg) would bring the margin to `target` calibers?
  function noseWeightFor(st, totalMass, target, noseLen, diameter) {
    const want = st.cp - target * diameter;                // where the CG needs to be
    const at = noseLen * 0.6;                              // clay sits inside the nose cone
    if (st.cg <= want) return 0;
    if (want <= at) return Infinity;                       // can't fix with weight alone
    return totalMass * (st.cg - want) / (want - at);
  }

  /* ---------- Flight simulation ----------
     o: { motor:"C6", delay:5, dryMass (kg, rocket without motor), diameter (m),
          cd, chuteDiameter (m), chuteCd, rodLength (m), dt }
     Straight up (1-D). Returns a time series plus the key events. */
  function simulate(o) {
    const m = MOTORS[o.motor];
    const dt = o.dt || 0.002;
    const area = Math.PI * o.diameter * o.diameter / 4;
    const chuteArea = Math.PI * o.chuteDiameter * o.chuteDiameter / 4;
    const chuteCd = o.chuteCd == null ? 0.75 : o.chuteCd;
    const caseMass = m.totalMass - m.propMass;
    const ejectAt = m.burnTime + o.delay;

    let t = 0, h = 0, v = 0, chute = false, onPad = true;
    const ev = { burnout: { t: m.burnTime }, eject: { t: ejectAt } };
    const series = [];
    let maxV = 0, maxA = 0, apogee = null, rodExit = null, prevA = 0;

    const massAt = time =>
      o.dryMass + caseMass + m.propMass * (1 - impulseSoFar(m, time) / m.impulse);
    const rho = alt => RHO0 * Math.exp(-Math.max(alt, 0) / SCALE_HEIGHT);

    function accel(time, alt, vel, chuteOpen) {
      const mass = massAt(time);
      const T = thrustAt(m, time);
      const sign = vel >= 0 ? 1 : -1;
      let drag = 0.5 * rho(alt) * vel * vel * o.cd * area;
      if (chuteOpen) drag += 0.5 * rho(alt) * vel * vel * chuteCd * chuteArea;
      const a = (T - sign * drag) / mass - G;
      return { a, T, drag, mass };
    }

    let k = 0;
    while (t < 300) {
      // ejection charge fires: parachute opens
      if (!chute && t >= ejectAt) {
        chute = chuteArea > 0;
        ev.eject.h = h; ev.eject.v = v;
      }

      // RK4 step (a careful way to add up tiny changes)
      const f = (tt, hh, vv) => accel(tt, hh, vv, chute).a;
      const k1v = f(t, h, v),                       k1h = v;
      const k2v = f(t + dt / 2, h + k1h * dt / 2, v + k1v * dt / 2), k2h = v + k1v * dt / 2;
      const k3v = f(t + dt / 2, h + k2h * dt / 2, v + k2v * dt / 2), k3h = v + k2v * dt / 2;
      const k4v = f(t + dt, h + k3h * dt, v + k3v * dt),             k4h = v + k3v * dt;
      let nv = v + dt * (k1v + 2 * k2v + 2 * k3v + k4v) / 6;
      let nh = h + dt * (k1h + 2 * k2h + 2 * k3h + k4h) / 6;

      // sitting on the pad until thrust is bigger than weight
      if (onPad && nh <= 0) { nh = 0; nv = Math.max(nv, 0); }
      if (nh > 0) onPad = false;

      const info = accel(t, h, v, chute);
      const aNow = onPad && h === 0 && info.a < 0 ? 0 : info.a;

      if (k % 10 === 0) series.push({ t, h, v, a: aNow, T: info.T, mass: info.mass, chute });
      if (t < m.burnTime + 0.2) maxA = Math.max(maxA, aNow);
      maxV = Math.max(maxV, v);

      if (rodExit === null && h >= o.rodLength) rodExit = { t, v };
      if (apogee === null && !onPad && v > 0 && nv <= 0) {
        apogee = { t: t + dt * v / (v - nv), h: Math.max(h, nh) };
      }

      prevA = aNow;
      t += dt; h = nh; v = nv; k++;

      if (!onPad && h <= 0) {
        h = 0;
        series.push({ t, h: 0, v, a: 0, T: 0, mass: massAt(t), chute });
        ev.landing = { t, v };
        break;
      }
    }

    ev.burnout.h = series.reduce((b, p) => Math.abs(p.t - m.burnTime) < Math.abs(b.t - m.burnTime) ? p : b).h;
    ev.burnout.v = series.reduce((b, p) => Math.abs(p.t - m.burnTime) < Math.abs(b.t - m.burnTime) ? p : b).v;
    ev.apogee = apogee || { t: 0, h: 0 };
    ev.rodExit = rodExit || { t: 0, v: 0 };
    if (!ev.landing) ev.landing = { t, v };
    if (ev.eject.v === undefined) {          // landed before the charge fired
      ev.eject.h = 0; ev.eject.v = ev.landing.v; ev.eject.afterLanding = true;
    }

    // which delay would fire closest to apogee?
    const best = m.delays.reduce((b, d) =>
      Math.abs(m.burnTime + d - ev.apogee.t) < Math.abs(m.burnTime + b - ev.apogee.t) ? d : b);

    return {
      motor: m, series, events: ev, bestDelay: best,
      maxSpeed: maxV, maxAccelG: maxA / G,
      liftoffMass: massAt(0)
    };
  }

  const api = { MOTORS, G, thrustAt, impulseSoFar, stability, noseWeightFor, simulate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.RocketPhysics = api;
})(this);
