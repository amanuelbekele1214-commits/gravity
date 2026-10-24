/** Small DOM helpers shared by every section. */

/** h("div.class#id", {attrs}, ...children) */
export function h(tag, attrs, ...children) {
  const [name, ...rest] = tag.split(/(?=[.#])/);
  const el = document.createElement(name || "div");
  for (const r of rest) {
    if (r[0] === ".") el.classList.add(r.slice(1));
    else if (r[0] === "#") el.id = r.slice(1);
  }
  if (attrs && (typeof attrs !== "object" || attrs instanceof Node || Array.isArray(attrs))) { children.unshift(attrs); attrs = null; }
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (k === "html") el.innerHTML = v;
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? "" : v);
    }
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** HTML string helper (for content with <sub>, <b> etc). */
export const html = s => { const t = document.createElement("template"); t.innerHTML = s.trim(); return t.content; };

let uid = 0;
/**
 * Slider + number box that stay in sync.
 * opts: { label, unit, min, max, step, value, onInput(value), digits }
 */
export function slider(opts) {
  const id = opts.id || `ctl-${++uid}`;
  const range = h("input", { type: "range", id, min: opts.min, max: opts.max, step: opts.step, value: opts.value, "aria-label": opts.label });
  const box = h("input", { type: "number", id: id + "-n", min: opts.min, max: opts.max, step: opts.step, value: opts.value, "aria-label": `${opts.label} value` });
  const wrap = h("div.ctl",
    h("label", { for: id }, h("span", opts.label), h("span.unit", opts.unit || "")),
    range, box);
  const set = (v, fire = true) => {
    if (!Number.isFinite(v)) return;
    range.value = v; box.value = v;
    if (fire) opts.onInput?.(v);
  };
  range.addEventListener("input", () => set(parseFloat(range.value)));
  box.addEventListener("change", () => {
    let v = parseFloat(box.value);
    if (!Number.isFinite(v)) { box.value = range.value; return; }
    v = Math.min(Math.max(v, opts.min), opts.max);        // clamp out-of-range typing
    set(v);
  });
  return { el: wrap, get value() { return parseFloat(range.value); }, set, range, box };
}

/** <select> with a label. options: [[value, text], ...] */
export function select(opts) {
  const id = opts.id || `sel-${++uid}`;
  const sel = h("select.input", { id }, opts.options.map(([v, t]) => h("option", { value: v }, t)));
  sel.value = opts.value;
  sel.addEventListener("change", () => opts.onChange?.(sel.value));
  const wrap = h("div.ctl.select", h("label", { for: id }, h("span", opts.label)), sel);
  return { el: wrap, sel, get value() { return sel.value; }, set: v => { sel.value = v; } };
}

/** Toggle chip with an optional color swatch. */
export function chip(label, { pressed = true, color = null, onToggle } = {}) {
  const b = h("button.chip", { type: "button", "aria-pressed": String(pressed) },
    color ? h("span.sw", { style: { background: color } }) : null, label);
  b.addEventListener("click", () => {
    const now = b.getAttribute("aria-pressed") !== "true";
    b.setAttribute("aria-pressed", String(now));
    onToggle?.(now);
  });
  return b;
}

export const fmt = (x, d = 2) => {
  if (x == null || !Number.isFinite(x)) return "—";
  const v = Math.abs(x) < 0.5 * Math.pow(10, -d) ? 0 : x;
  return v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
};

/** Significant-figure formatting for answers. */
export function sig(x, n = 3) {
  if (!Number.isFinite(x)) return "—";
  if (x === 0) return "0";
  const d = Math.max(0, n - 1 - Math.floor(Math.log10(Math.abs(x))));
  return fmt(x, Math.min(d, 6));
}

export function readout(pairs) {
  return h("div.readouts", pairs.map(([k, v, id, wide]) => h(wide ? "div.wide" : "div", h("div.k", k), h("div.v", { id }, v))));
}

/** Resize a canvas to its CSS box at device-pixel resolution; returns {ctx, w, h}. */
export function fitCanvas(canvas) {
  const r = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.round(r.width)), hh = Math.max(1, Math.round(r.height));
  if (canvas.width !== w * dpr || canvas.height !== hh * dpr) { canvas.width = w * dpr; canvas.height = hh * dpr; }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h: hh };
}

export const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Calls fn when the element changes size (debounced by animation frame). */
export function onResize(el, fn) {
  let raf = 0;
  const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fn); });
  ro.observe(el);
  return () => ro.disconnect();
}
