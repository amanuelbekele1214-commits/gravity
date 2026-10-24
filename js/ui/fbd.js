/** Free-body diagram renderer: a simple person, only the external forces on them,
 *  plus a separate "motion" box for velocity and acceleration (which are NOT forces). */
import { fitCanvas } from "./dom.js";
import { FORCE_COLORS, arrow, comSymbol, resetLabels } from "./draw.js";

/**
 * forces: [{ sym, x, y, at: 'com'|'feet'|'hands'|'back'|'head', color }] — x, y in newtons (up +)
 * opts: { pose: 'stand'|'air'|'push'|'crouch'|'lean', wall: bool, ground: bool, v: {x,y}, a: {x,y} }
 */
export function drawFBD(canvas, forces, opts = {}) {
  const { ctx, w, h } = fitCanvas(canvas);
  const C = FORCE_COLORS();
  ctx.clearRect(0, 0, w, h);
  resetLabels(ctx);
  const cx = w * 0.42, groundY = h * 0.84;
  const H = Math.min(h * 0.62, 230);
  const air = opts.pose === "air";
  const lift = air ? h * 0.08 : 0;
  const feetY = groundY - lift, comY = feetY - H * 0.56;
  const crouch = opts.pose === "crouch" ? H * 0.12 : 0;
  const pts = {
    feet: { x: cx, y: feetY }, com: { x: cx, y: comY + crouch * 0.6 },
    hands: { x: cx + (opts.pose === "push" ? H * 0.33 : H * 0.05), y: feetY - H * 0.72 + crouch },
    head: { x: cx, y: feetY - H * 0.93 + crouch }, back: { x: cx - H * 0.08, y: feetY - H * 0.7 + crouch }
  };

  // surroundings
  if (opts.ground !== false) {
    ctx.strokeStyle = C.ink2; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(10, groundY); ctx.lineTo(w - 10, groundY); ctx.stroke();
    ctx.strokeStyle = C.lineStrong; ctx.lineWidth = 1;
    for (let x = 14; x < w - 10; x += 12) { ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x - 8, groundY + 8); ctx.stroke(); }
  }
  if (opts.wall) {
    const wx = pts.hands.x + 4;
    ctx.fillStyle = C.panel; ctx.fillRect(wx, 10, 16, groundY - 10);
    ctx.strokeStyle = C.ink2; ctx.lineWidth = 2; ctx.strokeRect(wx, 10, 16, groundY - 10);
  }
  if (opts.elevator) {
    ctx.strokeStyle = C.lineStrong; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
    ctx.strokeRect(cx - H * 0.45, feetY - H * 1.08, H * 0.9, H * 1.08); ctx.setLineDash([]);
  }

  // faint person
  ctx.save(); ctx.globalAlpha = 0.45; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.lineCap = "round";
  const hip = { x: cx, y: feetY - H * 0.53 + crouch }, sh = { x: cx, y: feetY - H * 0.82 + crouch };
  const knee = { x: cx + crouch * 0.9, y: feetY - H * 0.28 + crouch * 0.5 };
  ctx.beginPath(); ctx.moveTo(cx - 10, feetY); ctx.lineTo(cx + 22, feetY);
  ctx.moveTo(cx, feetY); ctx.lineTo(knee.x, knee.y); ctx.lineTo(hip.x, hip.y); ctx.lineTo(sh.x, sh.y);
  ctx.moveTo(sh.x, sh.y); ctx.lineTo(pts.hands.x, pts.hands.y); ctx.stroke();
  ctx.beginPath(); ctx.arc(pts.head.x, pts.head.y, H * 0.065, 0, 7); ctx.stroke();
  ctx.restore();

  // forces
  const maxF = Math.max(1, ...forces.map(f => Math.hypot(f.x, f.y)));
  const k = Math.min(H * 0.55, 140) / maxF;
  for (const f of forces) {
    const p = pts[f.at] || pts.com;
    const len = Math.hypot(f.x, f.y);
    if (len < 1e-9) continue;
    let x0 = p.x, y0 = p.y;
    if (f.at === "feet" && Math.abs(f.y) > Math.abs(f.x)) x0 -= 14;   // keep N beside, not on top of, the weight arrow
    if (f.at === "com" && Math.abs(f.y) > Math.abs(f.x) && f.y < 0) x0 += 6;
    // contact forces at the feet start at the surface and point away from it
    arrow(ctx, x0, y0, x0 + f.x * k, y0 - f.y * k, { color: f.color, width: 3.5, label: f.label || f.sym, labelSide: f.side || 1 });
  }
  comSymbol(ctx, pts.com.x, pts.com.y, 6, C.ink);

  // motion box (not forces)
  if (opts.v || opts.a) {
    const bx = w - 128, by = 12, bw = 116, bh = 92;
    ctx.save();
    ctx.fillStyle = C.bg; ctx.strokeStyle = C.lineStrong; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
    ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh); ctx.setLineDash([]);
    ctx.font = "11px 'JetBrains Mono', monospace"; ctx.fillStyle = C.muted; ctx.textBaseline = "top";
    ctx.fillText("motion, not forces", bx + 6, by + 5);
    const draw = (vec, color, name, oy) => {
      ctx.fillStyle = color; ctx.font = "600 12px 'Atkinson Hyperlegible', sans-serif"; ctx.fillText(name, bx + 8, by + oy - 6);
      const n = Math.hypot(vec.x, vec.y);
      if (n < 1e-9) { ctx.fillText("= 0", bx + 26, by + oy - 6); return; }
      const L = 26, ux = vec.x / n, uy = vec.y / n, x0 = bx + 74, y0 = by + oy;
      arrow(ctx, x0 - ux * L / 2, y0 + uy * L / 2, x0 + ux * L / 2, y0 - uy * L / 2, { color, hollow: true, width: 2 });
    };
    if (opts.v) draw(opts.v, C.vel, "v", 40);
    if (opts.a) draw(opts.a, C.acc, "a", 72);
    ctx.restore();
  }
}
