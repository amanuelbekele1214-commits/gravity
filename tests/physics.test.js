// Run with:  node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { weight, normalForce, friction, dragQuadratic, dragLinear, newtonSecond, components, terminalSpeed } from "../js/physics/forces.js";
import { constantAccel, timeToReach, freeFallFromRest, linearDragExact, simulateVerticalFall } from "../js/physics/kinematics.js";
import { torqueMagnitude, torque2D, gravityTorque, inertia, centerOfMass, balanceCheck, SEGMENT_FRACTIONS } from "../js/physics/rotation.js";
import { landing, speedFromDrop } from "../js/physics/energy.js";

const close = (a, b, tol = 1e-9, msg) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), msg ?? `${a} ≉ ${b}`);

test("weight: 60 kg → 588 N", () => close(weight(60), 588));
test("weight rejects zero or negative mass", () => {
  assert.throws(() => weight(0));
  assert.throws(() => weight(-5));
  assert.throws(() => weight(NaN));
});

test("normal force in an accelerating elevator", () => {
  close(normalForce({ m: 50, ay: 2 }).N, 50 * 11.8);
  close(normalForce({ m: 50, ay: -2 }).N, 50 * 7.8);
  const free = normalForce({ m: 50, ay: -9.8 });
  close(free.N, 0);
  assert.equal(normalForce({ m: 50, ay: -12 }).inContact, false);
});

test("static friction matches the push until μs N, then kinetic", () => {
  const N = 600;
  const a = friction({ F: 200, N, muS: 0.5, muK: 0.4 });
  assert.equal(a.kind, "static"); close(a.f, -200);
  const b = friction({ F: 300, N, muS: 0.5, muK: 0.4 });
  assert.equal(b.kind, "static"); close(b.f, -300);           // exactly at the limit holds
  const c = friction({ F: 301, N, muS: 0.5, muK: 0.4, m: 60 });
  assert.equal(c.kind, "kinetic"); close(c.f, -240); close(c.ax, 61 / 60);
  const d = friction({ F: 0, N, muS: 0.5, muK: 0.4, velocity: -2 });
  close(d.f, 240);
});

test("drag opposes velocity", () => {
  close(dragLinear(2, 3), -6);
  close(dragQuadratic({ rho: 1.2, Cd: 1, A: 0.5 }, -10), 30);
  close(terminalSpeed({ model: "linear", b: 10 }, 60), 58.8);
});

test("Newton's second law with components", () => {
  const r = newtonSecond([components(10, 0), components(10, 90), { x: 0, y: -10 }], 2);
  close(r.ax, 5); close(r.ay, 0, 1e-12); close(r.directionDeg, 0, 1e-9);
  assert.throws(() => newtonSecond([], 0));
});

test("constant-acceleration equations agree with each other", () => {
  const { y, v } = constantAccel({ y0: 10, v0: 3, a: -9.8 }, 1.2);
  close(v * v, 9 + 2 * -9.8 * (y - 10), 1e-9);                 // v² = v0² + 2aΔy
  close(y - 10, ((3 + v) / 2) * 1.2, 1e-9);                    // Δy = (v0+v)/2 · t
  close(timeToReach({ y0: 10, v0: 0, a: -9.8 }, 0), Math.sqrt(20 / 9.8), 1e-12);
  assert.equal(timeToReach({ y0: 0, v0: 1, a: -9.8 }, 5), null);
});

test("free fall from rest 0.50 s: 4.9 m/s and 1.225 m", () => {
  const r = freeFallFromRest(0.5);
  close(r.v, 4.9); close(r.d, 1.225);
});

test("numerical fall with linear drag matches the exact calculus solution", () => {
  const m = 2, b = 0.8, h0 = 40;
  const sim = simulateVerticalFall({ h0, m, drag: { model: "linear", b } });
  for (const s of sim.samples.slice(0, -1)) {
    const ex = linearDragExact({ y0: h0, m, b }, s.t);
    close(s.y, ex.y, 1e-6); close(s.v, ex.v, 1e-6);
  }
});

test("fall without drag lands at √(2h/g) with speed √(2gh)", () => {
  const sim = simulateVerticalFall({ h0: 5, m: 70 });
  close(sim.tLand, Math.sqrt(10 / 9.8), 1e-6);
  close(-sim.vLand, speedFromDrop(5), 1e-6);
});

test("torque: τ = rF sinθ and the lever arm", () => {
  close(torqueMagnitude(2, 10, 90), 20);
  close(torqueMagnitude(2, 10, 30), 10);
  close(torqueMagnitude(2, 10, 180), 0);
  const t = torque2D(0, 1, 5, 0);                               // push right at height 1 m
  close(t.cw, 5); close(t.leverArm, 1);
  close(gravityTorque(60, 0.1, 0).tau, 60 * 9.8 * 0.1);
});

test("moment of inertia and parallel-axis theorem", () => {
  close(inertia.parallelAxis(inertia.rodAboutCenter(3, 2), 3, 1), inertia.rodAboutEnd(3, 2));
});

test("center of mass and balance", () => {
  const c = centerOfMass([{ m: 1, x: 0, y: 0 }, { m: 3, x: 4, y: 0 }]);
  close(c.x, 3);
  assert.equal(balanceCheck(0.1, -0.06, 0.2).state, "balanced");
  assert.equal(balanceCheck(0.25, -0.06, 0.2).edge, "front");
  assert.throws(() => centerOfMass([{ m: 0, x: 0, y: 0 }]));
  const total = Object.entries(SEGMENT_FRACTIONS).reduce((s, [k, v]) => s + (["headNeck", "trunk"].includes(k) ? v : 2 * v), 0);
  close(total, 1, 1e-9);
});

test("landing: net force vs contact force", () => {
  const L = landing({ m: 60, vImpact: 4, stopTime: 0.1 });
  close(L.dp, 240); close(L.Fnet, 2400); close(L.N, 2400 + 588);
  assert.throws(() => landing({ m: 60, vImpact: 4, stopTime: 0 }));
});
