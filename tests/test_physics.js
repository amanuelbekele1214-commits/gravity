const P = require('../physics.js');
const ok = (c, msg) => console.log((c ? 'PASS ' : 'FAIL ') + msg);
for (const k in P.MOTORS) {
  const m = P.MOTORS[k];
  ok(Math.abs(P.impulseSoFar(m, m.burnTime) - m.impulse) < 1e-9,
     `${k} impulse ${m.impulse} N·s, burn ${m.burnTime}s, peak ${m.peakThrust.toFixed(1)} N`);
}
// 1. No drag: apogee must equal burnout height + v^2/2g
let r = P.simulate({ motor: 'C6', delay: 99, dryMass: 0.034, diameter: 0.025, cd: 0, chuteDiameter: 0, rodLength: 0.9 });
const b = r.events.burnout, pred = b.h + b.v * b.v / (2 * P.G);
ok(Math.abs(r.events.apogee.h - pred) / pred < 0.002, `no-drag apogee ${r.events.apogee.h.toFixed(1)} m vs physics ${pred.toFixed(1)} m`);
// 1b. burnout speed from impulse–momentum: v = ∫(T/m - g)dt, independent fine Euler
{ const m = P.MOTORS.C6; let v=0,h=0,t=0,dt=1e-5; const dry=0.034+m.totalMass-m.propMass;
  while(t<m.burnTime){const mass=dry+m.propMass*(1-P.impulseSoFar(m,t)/m.impulse); let a=P.thrustAt(m,t)/mass-P.G; if(h<=0&&a<0)a=0; v+=a*dt;h+=v*dt;t+=dt;}
  ok(Math.abs(v-b.v)/v<0.005, `burnout speed ${b.v.toFixed(2)} vs independent ${v.toFixed(2)} m/s`); }
// 2. Parachute: landing speed = terminal speed sqrt(2mg / (rho Cd A))
r = P.simulate({ motor: 'C6', delay: 5, dryMass: 0.034, diameter: 0.025, cd: 0.75, chuteDiameter: 0.3, chuteCd: 0.75, rodLength: 0.9 });
const mland = 0.034 + 0.024 - 0.011, A = Math.PI * 0.3 * 0.3 / 4, A2 = Math.PI*0.025*0.025/4;
const vt = Math.sqrt(2 * mland * P.G / (1.225 * (0.75 * A + 0.75*A2)));
ok(Math.abs(Math.abs(r.events.landing.v) - vt) / vt < 0.02, `landing ${Math.abs(r.events.landing.v).toFixed(2)} m/s vs terminal ${vt.toFixed(2)} m/s`);
console.log('  C6-5 sample: apogee', r.events.apogee.h.toFixed(0), 'm at', r.events.apogee.t.toFixed(2), 's; max', r.maxSpeed.toFixed(1), 'm/s,', r.maxAccelG.toFixed(1), 'G; rod exit', r.events.rodExit.v.toFixed(1), 'm/s; best delay', r.bestDelay, '; eject v', r.events.eject.v.toFixed(1));
// 3. Drag lowers apogee, heavier lowers apogee
const base = { motor: 'C6', delay: 5, dryMass: 0.034, diameter: 0.025, cd: 0.75, chuteDiameter: 0, rodLength: 0.9 };
const a1 = P.simulate(base).events.apogee.h, a2 = P.simulate({ ...base, cd: 1.0 }).events.apogee.h, a3 = P.simulate({ ...base, dryMass: 0.06 }).events.apogee.h;
ok(a2 < a1 && a3 < a1, `more drag ${a2.toFixed(0)} m and more mass ${a3.toFixed(0)} m both below ${a1.toFixed(0)} m`);
// 4. Barrowman limits and a typical rocket
const rk = { noseShape: 'ogive', noseLen: 0.07, bodyLen: 0.24, diameter: 0.0246, finCount: 3, rootChord: 0.06, tipChord: 0.025, span: 0.045, sweep: 0.035, finOffset: 0, cg: 0.19 };
const s = P.stability(rk);
console.log(`  typical rocket: CP ${(s.cp*100).toFixed(1)} cm, CG 19 cm, margin ${s.margin.toFixed(2)} cal`);
const tiny = P.stability({ ...rk, span: 1e-6 });
ok(Math.abs(tiny.cp - 0.466 * 0.07) < 1e-3, `no fins -> CP at nose CP ${(tiny.cp*100).toFixed(2)} cm`);
const huge = P.stability({ ...rk, span: 5 });
ok(Math.abs(huge.cp - huge.Xf) / huge.Xf < 0.01, `giant fins -> CP at fin CP`);
ok(P.stability({ ...rk, finCount: 4 }).cp > s.cp, 'more fins move CP back');
// 5. nose weight fix
const bad = P.stability({ ...rk, cg: 0.25 });
const w = P.noseWeightFor(bad, 0.058, 1.5, 0.07, 0.0246);
const fixedCg = (0.058 * 0.25 + w * 0.042) / (0.058 + w);
ok(Math.abs((bad.cp - fixedCg) / 0.0246 - 1.5) < 1e-6, `nose weight ${ (w*1000).toFixed(1)} g brings margin to 1.50`);
// 6. A8 on a light rocket, B6
for (const mo of ['A8','B6']) { const x = P.simulate({ ...base, motor: mo, delay: P.MOTORS[mo].delays[0] }); console.log(`  ${mo}: apogee ${x.events.apogee.h.toFixed(0)} m, best delay ${x.bestDelay}`); }
