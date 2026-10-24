/** Canvas drawing kit: arrows, labels, the person figure, ground, COM symbol. */
import { pointWorld } from "../physics/fallSim.js";

export const FORCE_COLORS = () => {
  const s = getComputedStyle(document.documentElement);
  const v = n => s.getPropertyValue(n).trim();
  return {
    weight: v("--f-weight"), normal: v("--f-normal"), friction: v("--f-friction"),
    applied: v("--f-applied"), drag: v("--f-drag"), net: v("--f-net"),
    vel: v("--m-vel"), acc: v("--m-acc"), ink: v("--ink"), ink2: v("--ink-2"), muted: v("--muted"),
    line: v("--line"), lineStrong: v("--line-strong"), bg: v("--bg"), panel: v("--panel")
  };
};

/**
 * Arrow from (x0,y0) to (x1,y1) in screen pixels.
 * style: { color, width, dash, hollow (motion arrows), label, labelSide }
 */
export function arrow(ctx, x0, y0, x1, y1, style = {}) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 2) return;
  const w = style.width ?? 3, head = Math.min(14, Math.max(8, len * 0.35));
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const bx = x1 - head * Math.cos(ang), by = y1 - head * Math.sin(ang);
  ctx.save();
  ctx.strokeStyle = style.color; ctx.fillStyle = style.color; ctx.lineWidth = w; ctx.lineCap = "round";
  if (style.dash) ctx.setLineDash(style.dash);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(bx, by); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(bx + (head * 0.55) * Math.sin(ang), by - (head * 0.55) * Math.cos(ang));
  ctx.lineTo(bx - (head * 0.55) * Math.sin(ang), by + (head * 0.55) * Math.cos(ang));
  ctx.closePath();
  if (style.hollow) { ctx.lineWidth = 2; ctx.fillStyle = style.bg || "#0b0f0e"; ctx.fill(); ctx.stroke(); } else ctx.fill();
  if (style.label) label(ctx, style.label, x1, y1, ang, style.color, style.labelSide);
  ctx.restore();
}

/** Text label placed just beyond an arrow tip, with a dark backing for legibility. */
export function label(ctx, text, x, y, ang = 0, color = "#ecebe4", side = 1) {
  ctx.save();
  ctx.font = "600 13px 'Atkinson Hyperlegible', system-ui, sans-serif";
  const pad = 4, tw = ctx.measureText(text).width;
  let lx = x + Math.cos(ang) * 10, ly = y + Math.sin(ang) * 10;
  // offset sideways for near-vertical arrows so labels don't sit on the line
  if (Math.abs(Math.cos(ang)) < 0.4) lx += 8 * side; else ly -= 10;
  if (Math.cos(ang) < -0.4) lx -= tw;
  else if (Math.abs(Math.cos(ang)) < 0.4 && side < 0) lx -= tw + 16;
  const W = ctx.canvas.width / (window.devicePixelRatio || 1);
  lx = Math.min(Math.max(lx, 2), W - tw - 2 * pad);
  // avoid overlapping labels already drawn this frame (see resetLabels)
  const placed = ctx.__labels || (ctx.__labels = []);
  const hit = (x, y) => placed.some(r => x < r.x + r.w && x + tw + 2 * pad > r.x && y - 11 < r.y + r.h && y + 11 > r.y);
  for (let k = 0; k < 8 && hit(lx - pad, ly); k++) ly += (k % 2 ? -1 : 1) * 20 * (k + 1);
  placed.push({ x: lx - pad, y: ly - 11, w: tw + 2 * pad, h: 22 });
  ctx.fillStyle = "rgba(8,11,10,0.82)";
  ctx.fillRect(lx - pad, ly - 9 - pad / 2, tw + 2 * pad, 18 + pad / 2);
  ctx.fillStyle = color; ctx.textBaseline = "middle"; ctx.fillText(text, lx, ly);
  ctx.restore();
}

/** Call at the start of each frame so label collision checks start fresh. */
export const resetLabels = ctx => { ctx.__labels = []; };

/** Center-of-mass symbol (quartered circle). */
export function comSymbol(ctx, x, y, r = 8, color = "#ecebe4") {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = "#0b0f0e"; ctx.fill();
  ctx.lineWidth = 1.6; ctx.strokeStyle = color; ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, -Math.PI / 2, 0); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, Math.PI / 2, Math.PI); ctx.closePath(); ctx.fill();
  ctx.restore();
}

/** Curved arrow showing rotation direction around (x, y). cw = true for clockwise. */
export function rotationArrow(ctx, x, y, r, cw, color, text) {
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.5;
  const a0 = -Math.PI * 0.85, a1 = -Math.PI * 0.15;
  const start = cw ? a0 : a1, endA = cw ? a1 : a0;
  ctx.beginPath(); ctx.arc(x, y, r, start, endA, !cw); ctx.stroke();
  const ex = x + r * Math.cos(endA), ey = y + r * Math.sin(endA);
  const tang = endA + (cw ? Math.PI / 2 : -Math.PI / 2);
  ctx.beginPath();
  ctx.moveTo(ex + 9 * Math.cos(tang), ey + 9 * Math.sin(tang));
  ctx.lineTo(ex + 6 * Math.cos(tang + 2.3), ey + 6 * Math.sin(tang + 2.3));
  ctx.lineTo(ex + 6 * Math.cos(tang - 2.3), ey + 6 * Math.sin(tang - 2.3));
  ctx.closePath(); ctx.fill();
  ctx.restore();
  if (text) label(ctx, text, x - r - 10, y - r - 4, Math.PI, color);
}

/** World ↔ screen camera. ppm = pixels per metre; (cx, groundY) = screen of world (camX, 0). */
export function camera(w, h, { ppm, camX = 0, groundFrac = 0.86 }) {
  const gy = h * groundFrac;
  return {
    ppm, w, h,
    sx: x => w / 2 + (x - camX) * ppm,
    sy: y => gy - y * ppm,
    gy
  };
}

/** Ground with surface color, hatching and 0.5 m distance ticks. */
export function ground(ctx, cam, { color = "#3a3f45", camX = 0, label: lab = "" } = {}) {
  const C = FORCE_COLORS();
  ctx.save();
  ctx.fillStyle = color; ctx.globalAlpha = 0.35;
  ctx.fillRect(0, cam.gy, cam.w, cam.h - cam.gy); ctx.globalAlpha = 1;
  ctx.strokeStyle = C.ink2; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, cam.gy); ctx.lineTo(cam.w, cam.gy); ctx.stroke();
  ctx.font = "11px 'JetBrains Mono', monospace"; ctx.fillStyle = C.muted; ctx.textAlign = "center"; ctx.textBaseline = "top";
  const step = cam.ppm > 120 ? 0.5 : cam.ppm > 40 ? 1 : 5;
  const xl = camX - cam.w / 2 / cam.ppm, xr = camX + cam.w / 2 / cam.ppm;
  for (let x = Math.ceil(xl / step) * step; x <= xr; x += step) {
    const px = cam.sx(x);
    ctx.strokeStyle = C.lineStrong; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, cam.gy); ctx.lineTo(px, cam.gy + 6); ctx.stroke();
    ctx.fillText(`${+x.toFixed(1)} m`, px, cam.gy + 8);
  }
  if (lab) { ctx.textAlign = "right"; ctx.fillStyle = C.ink2; ctx.fillText(lab, cam.w - 8, cam.h - 16); }
  ctx.restore();
}

/** Faint background grid (graph paper), 0.5 m squares. */
export function grid(ctx, cam, camX = 0) {
  const C = FORCE_COLORS();
  ctx.save(); ctx.strokeStyle = C.line; ctx.lineWidth = 1;
  const step = cam.ppm > 60 ? 0.5 : cam.ppm > 20 ? 1 : 5;
  const xl = camX - cam.w / 2 / cam.ppm, xr = camX + cam.w / 2 / cam.ppm;
  for (let x = Math.ceil(xl / step) * step; x <= xr; x += step) { const px = cam.sx(x); ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, cam.gy); ctx.stroke(); }
  for (let y = step; cam.sy(y) > 0; y += step) { const py = cam.sy(y); ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(cam.w, py); ctx.stroke(); }
  ctx.restore();
}

/**
 * Draws the person (rigid statue) for a pose {xc, yc, phi, crouch}.
 * Knees bend during landing (crouch): solved with two-segment geometry.
 */
export function person(ctx, cam, body, pose, { color = "#ecebe4", alpha = 1, H = 1.75 } = {}) {
  const P = name => pointWorld(body, pose, name);
  const S = q => [cam.sx(q.x), cam.sy(q.y)];
  const ankle = P("ankle"), hip = P("hip");
  // knee position: shank 0.285H, thigh 0.245H, bend forward
  const L1 = 0.285 * H, L2 = 0.245 * H;
  const dx = hip.x - ankle.x, dy = hip.y - ankle.y, D = Math.max(Math.hypot(dx, dy), Math.abs(L1 - L2) + 1e-3);
  const ex = dx / D, ey = dy / D;
  const a = Math.min((L1 * L1 - L2 * L2 + D * D) / (2 * D), L1);
  const hh = Math.sqrt(Math.max(L1 * L1 - a * a, 0));
  const knee = (pose.crouch || 0) > 0.002
    ? { x: ankle.x + ex * a + ey * hh, y: ankle.y + ey * a - ex * hh }
    : P("knee");
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(3, cam.ppm * 0.045); ctx.lineCap = "round"; ctx.lineJoin = "round";
  const line = (...pts) => { ctx.beginPath(); pts.forEach((q, i) => { const [x, y] = S(q); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); };
  line(P("heel"), P("toe"));
  line(P("heel"), ankle);
  line(ankle, knee, hip, P("shoulder"), P("neck"));
  line(P("shoulder"), P("elbow"), P("hand"));
  const head = P("head");
  ctx.beginPath(); ctx.arc(cam.sx(head.x), cam.sy(head.y), body.headRadius * cam.ppm, 0, 7);
  ctx.fillStyle = "#0b0f0e"; ctx.fill(); ctx.stroke();
  ctx.restore();
}
