import test from "node:test";
import assert from "node:assert/strict";
import { simulate, makeBody, DEFAULTS } from "../js/physics/fallSim.js";

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, msg ?? `${a} ≉ ${b} (tol ${tol})`);
const phases = r => [...new Set(r.samples.map(s => s.phase))];

test("standing upright stays in equilibrium with N = mg", () => {
  const r = simulate({ duration: 1 });
  assert.ok(r.ok);
  assert.deepEqual(phases(r), ["stand"]);
  for (const s of r.samples) { close(s.N, 65 * 9.8, 1e-9); close(s.vx, 0, 0); }
});

test("a small lean stays balanced; a large lean tips over and hits the ground", () => {
  const ok = simulate({ leanDeg: 5, duration: 1 });
  assert.deepEqual(phases(ok), ["lean"]);
  const fall = simulate({ leanDeg: 15, duration: 4 });
  assert.ok(phases(fall).includes("tip"));
  assert.equal(fall.samples.at(-1).phase, "down");
  assert.ok(fall.impact && fall.impact.speed > 3);
});

test("tipping without slipping conserves mechanical energy", () => {
  const r = simulate({ leanDeg: 15, duration: 4, muS: 2, muK: 1.5 });
  const tip = r.samples.filter(s => s.phase === "tip");
  assert.ok(tip.length > 50);
  const E0 = tip[0].E;
  for (const s of tip) close(s.E, E0, E0 * 2e-4);
});

test("first instant of tipping: α = m g d / I_edge", () => {
  const p = { ...DEFAULTS, leanDeg: 15 };
  const r = simulate({ leanDeg: 15, duration: 0.5, muS: 2, muK: 1.5 });
  const body = makeBody(p);
  const s0 = r.samples.find(s => s.phase === "tip");
  const toe = { x: p.footLen - p.heelBack, y: 0 };
  const dx = body.C0.x - toe.x, dy = body.C0.y;
  const I = body.Icm + p.m * (dx * dx + dy * dy);
  close(s0.alpha, (p.m * 9.8 * dx) / I, 1e-6);
});

test("frictionless floor: rotating while sliding still conserves energy", () => {
  const r = simulate({ leanDeg: 15, duration: 4, muS: 0, muK: 0 });
  const ts = r.samples.filter(s => s.phase === "tipslide");
  assert.ok(ts.length > 50, "should slide while tipping");
  const E0 = ts[0].E;
  for (const s of ts) close(s.E, E0, E0 * 5e-4);
  for (const s of ts) close(s.xc, ts[0].xc, 1e-6);   // no horizontal force: COM falls straight down
});

test("free fall from 1 m: feet land after √(2h/g) at √(2gh)", () => {
  const r = simulate({ h0: 1, duration: 1 });
  const land = r.events.find(e => e.type === "land");
  close(land.t, Math.sqrt(2 / 9.8), 0.002);
  const before = r.samples.filter(s => s.phase === "air").at(-1);
  close(-before.vy, 9.8 * before.t, 1e-6);
  const landS = r.samples.filter(s => s.phase === "land");
  close(landS[0].N, 65 * Math.sqrt(2 * 9.8 * 1) / 0.12 + 65 * 9.8, 15);
});

test("sliding on flat feet stops after v²/(2 μk g)", () => {
  const r = simulate({ v0x: 2, muS: 0.12, muK: 0.1, duration: 3 });
  assert.ok(!phases(r).includes("tip"));
  const stopped = r.samples.find(s => s.t > 0.1 && s.vx === 0);
  close(stopped.xc - r.samples[0].xc, 4 / (2 * 0.1 * 9.8), 0.01);
});

test("sliding on a grippy floor trips the person forward", () => {
  const r = simulate({ v0x: 3, muS: 0.9, muK: 0.7, duration: 3 });
  assert.ok(phases(r).some(p => p === "tip" || p === "tipslide"));
});

test("a push larger than μs·N slides, a small push holds", () => {
  const hold = simulate({ F: 100, muS: 0.9, pushTime: 0.3, duration: 0.5 });
  assert.deepEqual(phases(hold), ["lean", "stand"]);          // balanced during the push, upright after
  for (const s of hold.samples) if (s.t < 0.3) assert.ok(Math.abs(s.f + 100) < 1e-9, "static friction = −push");
  const slide = simulate({ F: 250, muS: 0.3, muK: 0.2, pushTime: 0.3, comFrac: 0.4, duration: 1 });
  assert.ok(phases(slide).includes("slide"));
});

test("invalid inputs are reported, not simulated", () => {
  const r = simulate({ m: 0 });
  assert.equal(r.ok, false);
  assert.ok(r.errors.length);
  assert.equal(simulate({ muS: 0.2, muK: 0.5 }).ok, false);
});
