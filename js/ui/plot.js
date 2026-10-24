/**
 * Interactive time graph (canvas, no library).
 *  - toggle curves (legend chips)
 *  - time cursor: drag/tap on the plot; readout of every visible curve
 *  - zoom (buttons, Ctrl/⌘ + scroll, two-finger pinch) and pan (Pan mode or ◀ ▶)
 *  - tangent line + slope at the cursor, with its physical meaning
 *  - shaded area under a curve from a chosen start time to the cursor (trapezoid rule)
 */
import { h, fitCanvas, cssVar, fmt, onResize } from "./dom.js";

function niceStep(span, target) {
  if (!(span > 0)) return 1;
  const raw = span / target, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
}
const decimals = step => Math.max(0, Math.min(4, -Math.floor(Math.log10(step) + 1e-9)));

function lowerIndex(xs, x) {
  let lo = 0, hi = xs.length - 1;
  if (x <= xs[0]) return 0;
  if (x >= xs[hi]) return hi;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid] <= x) lo = mid; else hi = mid; }
  return lo;
}
function interp(xs, ys, x) {
  const i = lowerIndex(xs, x);
  if (i >= xs.length - 1) return ys[xs.length - 1];
  const t = (x - xs[i]) / (xs[i + 1] - xs[i] || 1);
  return ys[i] + t * (ys[i + 1] - ys[i]);
}
function slopeAt(xs, ys, x) {
  const i = lowerIndex(xs, x);
  const a = Math.max(0, i - 2), b = Math.min(xs.length - 1, i + 3);
  if (b === a) return 0;
  return (ys[b] - ys[a]) / (xs[b] - xs[a]);
}
function areaBetween(xs, ys, x0, x1) {
  const sign = x1 >= x0 ? 1 : -1;
  const lo = Math.min(x0, x1), hi = Math.max(x0, x1);
  let s = 0, prevX = lo, prevY = interp(xs, ys, lo);
  for (let i = lowerIndex(xs, lo) + 1; i < xs.length && xs[i] < hi; i++) {
    s += (xs[i] - prevX) * (ys[i] + prevY) / 2; prevX = xs[i]; prevY = ys[i];
  }
  const yHi = interp(xs, ys, hi);
  s += (hi - prevX) * (yHi + prevY) / 2;
  return sign * s;
}

export function createPlot(opt) {
  const series = opt.series.map(s => ({ visible: true, ...s }));
  const st = { xs: [], data: {}, x0: 0, x1: 1, cursor: null, areaStart: 0, pan: false, slope: false, area: false, markers: [], full: [0, 1] };

  const canvas = h("canvas", { role: "img", "aria-label": opt.title + " graph" });
  const box = h("div.plot-canvas", canvas);
  const readEl = h("div.plot-read", { "aria-live": "polite" });
  const chips = series.map(s => {
    const b = h("button.chip", { type: "button", "aria-pressed": String(s.visible) }, h("span.sw", { style: { background: s.color } }), s.label);
    b.addEventListener("click", () => { s.visible = !s.visible; b.setAttribute("aria-pressed", String(s.visible)); draw(); });
    return b;
  });
  const tb = (label, title, fn, toggle) => {
    const b = h("button.btn", { type: "button", title, "aria-label": title, ...(toggle ? { "aria-pressed": "false" } : {}) }, label);
    b.addEventListener("click", () => fn(b));
    return b;
  };
  const zoom = f => {
    const c = st.cursor ?? (st.x0 + st.x1) / 2;
    const span = Math.max((st.x1 - st.x0) * f, (st.full[1] - st.full[0]) / 400);
    st.x0 = c - (c - st.x0) * span / (st.x1 - st.x0);
    st.x1 = st.x0 + span; clampView(); draw();
  };
  const panBy = frac => { const d = (st.x1 - st.x0) * frac; st.x0 += d; st.x1 += d; clampView(); draw(); };
  const tools = h("div.plot-tools",
    tb("+", "Zoom in", () => zoom(0.6)),
    tb("−", "Zoom out", () => zoom(1 / 0.6)),
    tb("◀", "Pan left", () => panBy(-0.25)),
    tb("▶", "Pan right", () => panBy(0.25)),
    tb("Fit", "Show the whole time range", () => { st.x0 = st.full[0]; st.x1 = st.full[1]; draw(); }),
    tb("Pan", "Drag to pan instead of moving the cursor", b => { st.pan = !st.pan; b.setAttribute("aria-pressed", String(st.pan)); }, true),
    tb("Slope", "Show the tangent line and slope at the cursor", b => { st.slope = !st.slope; b.setAttribute("aria-pressed", String(st.slope)); draw(); }, true),
    tb("Area", "Shade the area under the curve from the start mark to the cursor", b => { st.area = !st.area; b.setAttribute("aria-pressed", String(st.area)); draw(); }, true),
    tb("Start ⇤", "Set the area's start time at the cursor", () => { if (st.cursor != null) { st.areaStart = st.cursor; st.area = true; tools.querySelector('[title^="Shade"]').setAttribute("aria-pressed", "true"); draw(); } })
  );
  const el = h("div.plot",
    h("div.plot-head", h("h4", { html: opt.title }), h("div.chips", chips)),
    box, opt.minimal ? null : tools, opt.minimal ? null : readEl);
  if (opt.height) box.style.height = opt.height + "px";

  function clampView() {
    const [a, b] = st.full, span = st.x1 - st.x0;
    if (span >= b - a) { st.x0 = a; st.x1 = b; return; }
    if (st.x0 < a) { st.x0 = a; st.x1 = a + span; }
    if (st.x1 > b) { st.x1 = b; st.x0 = b - span; }
  }

  let geom = null;
  function draw() {
    const { ctx, w, h: H } = fitCanvas(canvas);
    ctx.clearRect(0, 0, w, H);
    const m = { l: 52, r: 10, t: 14, b: 24 };
    geom = { m, w, H };
    const xs = st.xs;
    if (!xs.length) return;
    const vis = series.filter(s => s.visible && st.data[s.key]);
    // y range from visible data inside the view
    let lo = Infinity, hi = -Infinity;
    const i0 = lowerIndex(xs, st.x0), i1 = Math.min(xs.length - 1, lowerIndex(xs, st.x1) + 1);
    for (const s of vis) { const ys = st.data[s.key]; for (let i = i0; i <= i1; i++) { const y = ys[i]; if (Number.isFinite(y)) { if (y < lo) lo = y; if (y > hi) hi = y; } } }
    if (!Number.isFinite(lo)) { lo = -1; hi = 1; }
    if (lo > 0 && lo < 0.35 * hi) lo = 0;
    if (hi < 0 && hi > 0.35 * lo) hi = 0;
    if (hi - lo < 1e-9) { const c = lo; lo = c - (Math.abs(c) * 0.1 || 1); hi = c + (Math.abs(c) * 0.1 || 1); }
    const yStep = niceStep(hi - lo, H < 180 ? 3 : 4);
    lo = Math.floor(lo / yStep + 1e-9) * yStep; hi = Math.ceil(hi / yStep - 1e-9) * yStep;
    if (hi - lo < yStep) hi = lo + yStep;
    const X = x => m.l + (x - st.x0) / (st.x1 - st.x0) * (w - m.l - m.r);
    const Y = y => m.t + (1 - (y - lo) / (hi - lo)) * (H - m.t - m.b);
    geom.X = X; geom.Y = Y; geom.lo = lo; geom.hi = hi;
    const ink2 = cssVar("--ink-2"), muted = cssVar("--muted"), line = cssVar("--line"), lineStrong = cssVar("--line-strong"), ink = cssVar("--ink");

    ctx.font = "11px 'JetBrains Mono', monospace"; ctx.lineWidth = 1;
    const yd = decimals(yStep);
    for (let y = lo; y <= hi + yStep * 1e-6; y += yStep) {
      ctx.strokeStyle = Math.abs(y) < yStep * 1e-6 ? lineStrong : line;
      ctx.beginPath(); ctx.moveTo(m.l, Y(y)); ctx.lineTo(w - m.r, Y(y)); ctx.stroke();
      ctx.fillStyle = muted; ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText(fmt(y, yd), m.l - 6, Y(y));
    }
    const xStep = niceStep(st.x1 - st.x0, w < 420 ? 4 : 7);
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (let x = Math.ceil(st.x0 / xStep - 1e-9) * xStep; x <= st.x1 + 1e-9; x += xStep) {
      ctx.strokeStyle = line; ctx.beginPath(); ctx.moveTo(X(x), m.t); ctx.lineTo(X(x), H - m.b); ctx.stroke();
      ctx.fillStyle = muted; ctx.fillText(fmt(x, decimals(xStep)), X(x), H - m.b + 6);
    }
    ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillStyle = muted; ctx.fillText(opt.xLabel || "t (s)", w - m.r - 2, H - m.b - 2);

    // phase/event markers
    ctx.save(); ctx.setLineDash([2, 4]); ctx.strokeStyle = lineStrong;
    for (const mk of st.markers) if (mk.x >= st.x0 && mk.x <= st.x1) { ctx.beginPath(); ctx.moveTo(X(mk.x), m.t); ctx.lineTo(X(mk.x), H - m.b); ctx.stroke(); }
    ctx.restore();

    ctx.save(); ctx.beginPath(); ctx.rect(m.l, m.t, w - m.l - m.r, H - m.t - m.b); ctx.clip();
    // area
    if (st.area && st.cursor != null && vis[0]) {
      const s = vis[0], ys = st.data[s.key];
      const a = Math.min(st.areaStart, st.cursor), b = Math.max(st.areaStart, st.cursor);
      ctx.beginPath(); ctx.moveTo(X(a), Y(0));
      ctx.lineTo(X(a), Y(interp(xs, ys, a)));
      for (let i = lowerIndex(xs, a) + 1; i < xs.length && xs[i] < b; i++) ctx.lineTo(X(xs[i]), Y(ys[i]));
      ctx.lineTo(X(b), Y(interp(xs, ys, b))); ctx.lineTo(X(b), Y(0)); ctx.closePath();
      ctx.globalAlpha = 0.22; ctx.fillStyle = s.color; ctx.fill(); ctx.globalAlpha = 1;
    }
    // curves
    for (const s of vis) {
      const ys = st.data[s.key];
      ctx.beginPath(); let started = false;
      for (let i = i0; i <= i1; i++) {
        const y = ys[i]; if (!Number.isFinite(y)) { started = false; continue; }
        if (!started) { ctx.moveTo(X(xs[i]), Y(y)); started = true; } else ctx.lineTo(X(xs[i]), Y(y));
      }
      ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.setLineDash(s.dash || []); ctx.stroke(); ctx.setLineDash([]);
    }
    // tangent
    if (st.slope && st.cursor != null) {
      for (const s of vis) {
        const ys = st.data[s.key], y = interp(xs, ys, st.cursor), k = slopeAt(xs, ys, st.cursor);
        const span = (st.x1 - st.x0) * 0.18;
        ctx.setLineDash([5, 4]); ctx.strokeStyle = ink; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(X(st.cursor - span), Y(y - k * span)); ctx.lineTo(X(st.cursor + span), Y(y + k * span)); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    ctx.restore();
    // cursor
    if (st.cursor != null && st.cursor >= st.x0 && st.cursor <= st.x1) {
      ctx.strokeStyle = ink; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(st.cursor), m.t); ctx.lineTo(X(st.cursor), H - m.b); ctx.stroke();
      for (const s of vis) {
        const y = interp(xs, st.data[s.key], st.cursor);
        if (!Number.isFinite(y)) continue;
        ctx.beginPath(); ctx.arc(X(st.cursor), Y(y), 4.5, 0, 7); ctx.fillStyle = s.color; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = "#080b0a"; ctx.stroke();
      }
      if (st.area) {
        ctx.fillStyle = ink2; ctx.textAlign = "center"; ctx.textBaseline = "top";
        if (st.areaStart >= st.x0 && st.areaStart <= st.x1) {
          ctx.setLineDash([2, 2]); ctx.strokeStyle = ink2; ctx.beginPath(); ctx.moveTo(X(st.areaStart), m.t); ctx.lineTo(X(st.areaStart), H - m.b); ctx.stroke(); ctx.setLineDash([]);
        }
      }
    }
    for (const d of st.dots || []) {
      if (d.x < st.x0 || d.x > st.x1) continue;
      ctx.beginPath(); ctx.arc(X(d.x), Y(d.y), 6, 0, 7); ctx.fillStyle = d.color || ink; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = "#080b0a"; ctx.stroke();
    }
    writeReadout(vis);
  }

  function writeReadout(vis) {
    if (st.cursor == null) { readEl.innerHTML = `<span class="muted">Tap or drag on the graph to read values. Ctrl + scroll zooms.</span>`; return; }
    const t = st.cursor, xs = st.xs;
    const parts = [`${opt.xName || "t"} = <b>${fmt(t, opt.xDigits ?? 3)} ${opt.xUnit ?? "s"}</b>`];
    for (const s of vis) parts.push(`${s.label} = <b>${fmt(interp(xs, st.data[s.key], t), s.digits ?? 2)}</b> ${s.unit || ""}`);
    let out = parts.join(" · ");
    if (st.slope) {
      out += "<br>" + vis.map(s => `slope of ${s.label} = <b>${fmt(slopeAt(xs, st.data[s.key], t), 2)}</b> ${s.slopeUnit || ""}${s.slopeMeaning ? ` (${s.slopeMeaning})` : ""}`).join(" · ");
    }
    if (st.area) {
      out += "<br>" + vis.map(s => `area of ${s.label} from ${fmt(st.areaStart, 2)} to ${fmt(t, 2)} ${opt.xUnit ?? "s"} = <b>${fmt(areaBetween(xs, st.data[s.key], st.areaStart, t), 3)}</b> ${s.areaUnit || ""}${s.areaMeaning ? ` (${s.areaMeaning})` : ""}`).join(" · ");
    }
    readEl.innerHTML = out;
  }

  /* ---------- pointer interaction ---------- */
  const pointers = new Map();
  let pinch = null, dragStart = null;
  const toX = clientX => {
    const r = canvas.getBoundingClientRect(); const g = geom; if (!g) return null;
    const px = clientX - r.left;
    return st.x0 + (px - g.m.l) / (g.w - g.m.l - g.m.r) * (st.x1 - st.x0);
  };
  const setFromEvent = e => {
    const x = toX(e.clientX); if (x == null) return;
    api.setCursor(Math.min(Math.max(x, st.full[0]), st.full[1]));
    api.onCursor?.(st.cursor);
  };
  box.addEventListener("pointerdown", e => {
    if (st.locked) return;
    box.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, e.clientX);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.abs(a - b), x0: st.x0, x1: st.x1, mid: toX((a + b) / 2) };
    } else if (st.pan) dragStart = { x: e.clientX, x0: st.x0, x1: st.x1 };
    else setFromEvent(e);
  });
  box.addEventListener("pointermove", e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, e.clientX);
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const f = pinch.d / Math.max(20, Math.abs(a - b));
      const span = (pinch.x1 - pinch.x0) * f;
      st.x0 = pinch.mid - (pinch.mid - pinch.x0) * f; st.x1 = st.x0 + span; clampView(); draw();
    } else if (dragStart && geom) {
      const dx = (e.clientX - dragStart.x) / (geom.w - geom.m.l - geom.m.r) * (dragStart.x1 - dragStart.x0);
      st.x0 = dragStart.x0 - dx; st.x1 = dragStart.x1 - dx; clampView(); draw();
    } else if (!st.pan && pointers.size === 1) setFromEvent(e);
  });
  const end = e => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; if (!pointers.size) dragStart = null; };
  box.addEventListener("pointerup", end); box.addEventListener("pointercancel", end);
  box.addEventListener("wheel", e => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const c = toX(e.clientX); const f = e.deltaY > 0 ? 1.2 : 1 / 1.2;
    const span = Math.max((st.x1 - st.x0) * f, (st.full[1] - st.full[0]) / 400);
    st.x0 = c - (c - st.x0) * span / (st.x1 - st.x0); st.x1 = st.x0 + span; clampView(); draw();
  }, { passive: false });
  onResize(box, draw);

  const api = {
    el,
    /** xs: time array; data: { key: number[] } */
    setData(xs, data, { keepView = false } = {}) {
      st.xs = xs; st.data = data;
      const a = xs[0] ?? 0, b = xs[xs.length - 1] ?? 1;
      const sameRange = st.full[0] === a && st.full[1] === b;
      st.full = [a, b > a ? b : a + 1];
      if (!keepView || !sameRange) { st.x0 = st.full[0]; st.x1 = st.full[1]; }
      if (st.cursor != null) st.cursor = Math.min(Math.max(st.cursor, st.full[0]), st.full[1]);
      draw();
    },
    setCursor(x) { st.cursor = x; draw(); },
    setLocked(v) { st.locked = v; },
    /** points: [{x, y, color}] drawn as dots (e.g. the current setting on an x–y graph) */
    setDots(d) { st.dots = d; draw(); },
    setMarkers(ms) { st.markers = ms; draw(); },
    redraw: draw,
    onCursor: null
  };
  return api;
}
