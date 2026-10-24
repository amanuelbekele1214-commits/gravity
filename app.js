/* Gravity Rocket Lab: page logic (inputs -> physics -> report, graphs, diagram) */
(function () {
  "use strict";
  const P = window.RocketPhysics;
  const $ = id => document.getElementById(id);
  const cm = x => x / 100, g2kg = x => x / 1000;
  const fmt = (x, d = 0) => Number(x).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  const ft = m => m * 3.28084, mph = ms => ms * 2.23694;

  /* ---------- example rockets ---------- */
  const PRESETS = {
    beginner:  { bodyLen: 24, diameter: 2.46, noseShape: "ogive", noseLen: 7, finCount: "3", span: 4.5, rootChord: 6, tipChord: 2.5, sweep: 3.5, finOffset: 0, dryMass: 34, cg: 21, motor: "C6", delay: "5", chute: 30, rod: 90, cd: 0.75 },
    tinyfins:  { bodyLen: 24, diameter: 2.46, noseShape: "ogive", noseLen: 7, finCount: "3", span: 1.6, rootChord: 3, tipChord: 1.5, sweep: 1.5, finOffset: 0, dryMass: 30, cg: 20, motor: "C6", delay: "5", chute: 30, rod: 90, cd: 0.75 },
    latechute: { bodyLen: 24, diameter: 2.46, noseShape: "ogive", noseLen: 7, finCount: "3", span: 4.5, rootChord: 6, tipChord: 2.5, sweep: 3.5, finOffset: 0, dryMass: 34, cg: 21, motor: "A8", delay: "5", chute: 30, rod: 90, cd: 0.75 },
    heavy:     { bodyLen: 30, diameter: 3.3, noseShape: "cone", noseLen: 9, finCount: "4", span: 5, rootChord: 7, tipChord: 3, sweep: 4, finOffset: 0, dryMass: 85, cg: 22, motor: "C6", delay: "3", chute: 20, rod: 90, cd: 0.8 }
  };
  const FIELDS = ["bodyLen", "diameter", "noseShape", "noseLen", "finCount", "span", "rootChord", "tipChord", "sweep", "finOffset", "dryMass", "cg", "motor", "delay", "chute", "rod", "cd"];

  // motor list
  for (const k of Object.keys(P.MOTORS)) {
    const o = document.createElement("option");
    o.value = k; o.textContent = `${P.MOTORS[k].name} (${P.MOTORS[k].impulse} N·s)`;
    $("motor").appendChild(o);
  }
  function fillDelays(keep) {
    const m = P.MOTORS[$("motor").value], sel = $("delay");
    sel.innerHTML = "";
    for (const d of m.delays) { const o = document.createElement("option"); o.value = d; o.textContent = d; sel.appendChild(o); }
    if (keep && m.delays.includes(+keep)) sel.value = keep;
  }

  function loadPreset(name) {
    const p = PRESETS[name];
    for (const f of FIELDS) if (f !== "delay") $(f).value = p[f];
    fillDelays(p.delay);
    document.querySelectorAll("[data-preset]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.preset === name)));
    run();
  }

  function read() {
    const v = {};
    for (const f of FIELDS) v[f] = $(f).value;
    const n = k => { const x = parseFloat(v[k]); return isFinite(x) ? x : 0; };
    return {
      noseShape: v.noseShape, motor: v.motor, delay: n("delay"), finCount: parseInt(v.finCount, 10),
      bodyLen: n("bodyLen"), diameter: n("diameter"), noseLen: n("noseLen"), span: n("span"),
      rootChord: n("rootChord"), tipChord: n("tipChord"), sweep: n("sweep"), finOffset: n("finOffset"),
      dryMass: n("dryMass"), cg: n("cg"), chute: n("chute"), rod: n("rod"), cd: n("cd") || 0.75
    };
  }

  /* ---------- the main calculation ---------- */
  let last = null, range = "up";

  function run() {
    const i = read();
    if (i.diameter <= 0 || i.bodyLen <= 0 || i.dryMass <= 0) return;
    const geom = {
      noseShape: i.noseShape, noseLen: cm(i.noseLen), bodyLen: cm(i.bodyLen), diameter: cm(i.diameter),
      finCount: i.finCount, rootChord: cm(i.rootChord), tipChord: cm(i.tipChord), span: cm(Math.max(i.span, 0.01)),
      sweep: cm(i.sweep), finOffset: cm(i.finOffset), cg: cm(i.cg)
    };
    const st = P.stability(geom);
    const sim = P.simulate({
      motor: i.motor, delay: i.delay, dryMass: g2kg(i.dryMass), diameter: cm(i.diameter),
      cd: i.cd, chuteDiameter: cm(i.chute), chuteCd: 0.75, rodLength: cm(i.rod)
    });
    last = { i, geom, st, sim };
    renderHeadline(last);
    renderChecks(last);
    renderDiagram(last);
    renderCharts(last);
  }

  /* ---------- headline numbers ---------- */
  function renderHeadline({ i, sim }) {
    const e = sim.events;
    $("motorTag").textContent = `${sim.motor.name.replace("Estes ", "")}-${i.delay} · liftoff ${fmt(sim.liftoffMass * 1000)} g`;
    const cells = [
      ["Max altitude", `${fmt(e.apogee.h)} m`, `${fmt(ft(e.apogee.h))} ft at ${fmt(e.apogee.t, 1)} s`],
      ["Top speed", `${fmt(sim.maxSpeed)} m/s`, `${fmt(mph(sim.maxSpeed))} mph`],
      ["Peak push", `${fmt(sim.maxAccelG, 1)} G`, `${fmt(sim.maxAccelG * 9.81)} m/s²`],
      ["Flight time", `${fmt(e.landing.t, 1)} s`, `lands at ${fmt(Math.abs(e.landing.v), 1)} m/s`]
    ];
    $("headline").innerHTML = cells.map(([l, b, s]) =>
      `<div><div class="label">${l}</div><div class="big">${b}</div><div class="sub">${s}</div></div>`).join("");
  }

  /* ---------- pre-flight checks: the "assistant" ---------- */
  const ICON = {
    good: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.5l2.5 2.5L10 3.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    warn: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5L11 10.5H1Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6 5v2.5" stroke="currentColor" stroke-width="1.6"/></svg>',
    bad: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" stroke-width="2"/></svg>'
  };
  const WORD = { good: "Good", warn: "Check", bad: "Fix" };

  function spanForMargin(geom, target) {
    // try bigger fins until the margin reaches the target (simple search)
    let lo = geom.span, hi = geom.span * 6;
    if (P.stability({ ...geom, span: hi }).margin < target) return null;
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2;
      if (P.stability({ ...geom, span: mid }).margin < target) lo = mid; else hi = mid;
    }
    return hi;
  }

  function renderChecks({ i, geom, st, sim }) {
    const e = sim.events, out = [];
    const mg = st.margin;

    // 1. stability
    if (mg < 1) {
      const w = P.noseWeightFor(st, sim.liftoffMass, 1.5, geom.noseLen, geom.diameter);
      const span = spanForMargin(geom, 1.5);
      const fixes = [];
      if (isFinite(w) && w > 0) fixes.push(`add about <b>${fmt(w * 1000)} g of clay</b> inside the nose cone`);
      if (span) fixes.push(`make the fins <b>${fmt(span * 100, 1)} cm tall</b> instead of ${fmt(i.span, 1)} cm`);
      const how = fixes.length ? ` To reach a safe 1.5 calibers, ${fixes.join(", or ")}.` : "";
      out.push([mg < 0 ? "bad" : "warn", "Stability",
        mg < 0
          ? `The center of pressure is <b>in front of</b> the balance point (margin ${fmt(mg, 2)}). The rocket will flip and tumble instead of flying straight, so the graphs below show a flight it would not really get.${how}`
          : `Margin is <b>${fmt(mg, 2)} calibers</b>, under the safe range of 1 to 2. It may wobble or veer, especially in wind.${how}`]);
    } else if (mg <= 2.5) {
      out.push(["good", "Stability", `Margin is <b>${fmt(mg, 2)} calibers</b>. The air pushes behind the balance point, so the rocket points into its path like an arrow.`]);
    } else {
      out.push(["warn", "Stability", `Margin is <b>${fmt(mg, 2)} calibers</b>, very stable. That is safe, but in wind an overstable rocket turns into the wind and flies off at an angle. Smaller fins or less nose weight would help.`]);
    }

    // 2. leaving the launch rod
    const rv = e.rodExit.v;
    out.push(rv >= 13
      ? ["good", "Speed off the rod", `It leaves the ${fmt(i.rod)} cm rod at <b>${fmt(rv, 1)} m/s</b>. Fins need about 13 m/s of airflow to steer, so it is fast enough.`]
      : ["warn", "Speed off the rod", `It leaves the rod at only <b>${fmt(rv, 1)} m/s</b>; fins need about 13 m/s to steer. Use a longer rod, a lighter rocket, or a stronger motor.`]);

    // 3. parachute timing
    const gap = e.eject.t - e.apogee.t;
    const motorCode = sim.motor.name.replace("Estes ", "");
    if (e.eject.afterLanding) {
      out.push(["bad", "Parachute timing", `The rocket hits the ground before the ejection charge fires. Use a <b>${motorCode}-${sim.bestDelay}</b>.`]);
    } else if (Math.abs(gap) <= 1) {
      out.push(["good", "Parachute timing", `The parachute pops ${fmt(Math.abs(gap), 1)} s ${gap >= 0 ? "after" : "before"} the top of the flight, while the rocket moves only <b>${fmt(Math.abs(e.eject.v), 1)} m/s</b>.`]);
    } else {
      const better = sim.bestDelay !== i.delay ? ` Switch to a <b>${motorCode}-${sim.bestDelay}</b>.` : " No delay for this motor fits well; try a different motor or rocket weight.";
      out.push([Math.abs(e.eject.v) > 20 ? "bad" : "warn", "Parachute timing",
        gap > 0
          ? `The parachute opens ${fmt(gap, 1)} s after the top, while the rocket is already falling at <b>${fmt(Math.abs(e.eject.v), 1)} m/s</b>. That can rip the parachute.${better}`
          : `The parachute opens ${fmt(-gap, 1)} s before the top, while the rocket still climbs at <b>${fmt(e.eject.v, 1)} m/s</b>. That can break the shock cord.${better}`]);
    }

    // 4. landing speed
    const lv = Math.abs(e.landing.v);
    const landMass = sim.liftoffMass - sim.motor.propMass;
    const needArea = 2 * landMass * P.G / (1.225 * 0.75 * 4.5 * 4.5);
    const needD = Math.sqrt(4 * needArea / Math.PI) * 100;
    if (i.chute <= 0) {
      out.push(["bad", "Landing speed", `No parachute, so it lands at <b>${fmt(lv)} m/s</b>. Add a parachute about <b>${fmt(needD)} cm</b> wide.`]);
    } else if (lv <= 5) {
      out.push(["good", "Landing speed", `It drifts down at <b>${fmt(lv, 1)} m/s</b>, gentle enough that nothing breaks.`]);
    } else {
      out.push([lv > 7 ? "bad" : "warn", "Landing speed", `It lands at <b>${fmt(lv, 1)} m/s</b>; under 5 m/s is safe. A parachute about <b>${fmt(needD)} cm</b> wide would slow it to 4.5 m/s.`]);
    }

    $("checks").innerHTML = out.map(([s, h, p]) =>
      `<li class="check ${s}"><span class="pill">${ICON[s]}${WORD[s]}</span><h3>${h}</h3><p>${p}</p></li>`).join("");
  }

  /* ---------- rocket diagram (SVG, drawn to scale) ---------- */
  function renderDiagram({ i, st }) {
    const svg = $("rocketSvg");
    const L = i.noseLen + i.bodyLen, d = i.diameter;
    const W = 760, pad = 40, s = (W - 2 * pad) / L;            // pixels per cm
    const H = Math.max(140, (d + 2 * i.span) * s + 90), cy = H / 2 - 6;
    const r = d * s / 2, x0 = pad, xn = x0 + i.noseLen * s, xe = x0 + L * s;

    let nose;
    if (i.noseShape === "cone") nose = `M${x0},${cy} L${xn},${cy - r} L${xn},${cy + r} Z`;
    else if (i.noseShape === "parabolic") nose = `M${x0},${cy} C${x0},${cy - r} ${x0 + (xn - x0) * 0.35},${cy - r} ${xn},${cy - r} L${xn},${cy + r} C${x0 + (xn - x0) * 0.35},${cy + r} ${x0},${cy + r} ${x0},${cy} Z`;
    else nose = `M${x0},${cy} Q${x0 + (xn - x0) * 0.45},${cy - r * 1.02} ${xn},${cy - r} L${xn},${cy + r} Q${x0 + (xn - x0) * 0.45},${cy + r * 1.02} ${x0},${cy} Z`;

    const rootTE = xe - i.finOffset * s, rootLE = rootTE - i.rootChord * s;
    const tipLE = rootLE + i.sweep * s, tipTE = tipLE + i.tipChord * s, sp = i.span * s;
    const fin = sgn => `M${rootLE},${cy + sgn * r} L${tipLE},${cy + sgn * (r + sp)} L${tipTE},${cy + sgn * (r + sp)} L${rootTE},${cy + sgn * r} Z`;

    const xcg = x0 + st.cg * 100 * s, xcp = x0 + st.cp * 100 * s;
    const sym = (x, kind) => kind === "cg"
      ? `<g><circle cx="${x}" cy="${cy}" r="9" fill="var(--card)" stroke="var(--cg)" stroke-width="2"/><path d="M${x} ${cy}V${cy - 9}A9 9 0 0 1 ${x + 9} ${cy}Z M${x} ${cy}V${cy + 9}A9 9 0 0 1 ${x - 9} ${cy}Z" fill="var(--cg)"/></g>`
      : `<g><circle cx="${x}" cy="${cy}" r="9" fill="var(--card)" stroke="var(--cp)" stroke-width="2"/><circle cx="${x}" cy="${cy}" r="3.2" fill="var(--cp)"/></g>`;

    const yDim = cy + r + sp + 26;
    const lo = Math.min(xcg, xcp), hi = Math.max(xcg, xcp);
    // ruler ticks every 5 cm
    let ticks = "";
    for (let c = 0; c <= L + 0.001; c += 5) {
      const x = x0 + c * s;
      ticks += `<line x1="${x}" y1="${H - 18}" x2="${x}" y2="${H - 12}" stroke="var(--muted)"/><text x="${x}" y="${H - 2}" font-size="11" text-anchor="middle" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${c}</text>`;
    }

    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = `
      <line x1="${x0}" y1="${H - 15}" x2="${xe}" y2="${H - 15}" stroke="var(--muted)"/>
      ${ticks}
      <text x="${xe + 6}" y="${H - 2}" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono, monospace">cm</text>
      <path d="${fin(-1)}" fill="#141b23" stroke="var(--ink-2)" stroke-width="1.5"/>
      <path d="${fin(1)}" fill="#141b23" stroke="var(--ink-2)" stroke-width="1.5"/>
      <rect x="${xn}" y="${cy - r}" width="${xe - xn}" height="${2 * r}" fill="#1a222c" stroke="var(--ink-2)" stroke-width="1.5"/>
      <path d="${nose}" fill="#1a222c" stroke="var(--ink-2)" stroke-width="1.5"/>
      <defs><filter id="flameGlow" x="-50%" y="-80%" width="200%" height="260%"><feGaussianBlur stdDeviation="4"/></filter></defs>
      <path d="M${xe},${cy - r * 0.55} L${xe + Math.min(r * 1.6, 34)},${cy} L${xe},${cy + r * 0.55} Z" fill="var(--accent)" filter="url(#flameGlow)"/>
      <path d="M${xe},${cy - r * 0.35} L${xe + Math.min(r * 1.1, 24)},${cy} L${xe},${cy + r * 0.35} Z" fill="#ffd2a8"/>
      <rect x="${xe - 7 * s}" y="${cy - r + 3}" width="${7 * s}" height="${Math.max(2 * r - 6, 2)}" fill="var(--accent-soft)" stroke="var(--accent)" stroke-dasharray="3 2"/>
      ${sym(xcg, "cg")}${sym(xcp, "cp")}
      <line x1="${lo}" y1="${yDim}" x2="${hi}" y2="${yDim}" stroke="${st.margin >= 1 ? "var(--good)" : st.margin >= 0 ? "var(--warn)" : "var(--bad)"}" stroke-width="2"/>
      <line x1="${xcg}" y1="${cy + 10}" x2="${xcg}" y2="${yDim + 5}" stroke="var(--cg)" stroke-dasharray="2 2"/>
      <line x1="${xcp}" y1="${cy + 10}" x2="${xcp}" y2="${yDim + 5}" stroke="var(--cp)" stroke-dasharray="2 2"/>
      <text x="${xcg}" y="${cy - r - sp - 10 > 12 ? cy - r - sp - 10 : 12}" font-size="12" text-anchor="middle" fill="var(--cg)" font-family="IBM Plex Mono, monospace">CG ${fmt(st.cg * 100, 1)}</text>
      <text x="${xcp}" y="${(cy - r - sp - 10 > 12 ? cy - r - sp - 10 : 12) + (Math.abs(xcp - xcg) < 70 ? 14 : 0)}" font-size="12" text-anchor="middle" fill="var(--cp)" font-family="IBM Plex Mono, monospace">CP ${fmt(st.cp * 100, 1)}</text>
      <text x="${(lo + hi) / 2}" y="${yDim + 16}" font-size="12" text-anchor="middle" fill="var(--ink-2)" font-family="IBM Plex Mono, monospace">${fmt(st.margin, 2)} cal</text>`;

    $("marginTag").textContent = `margin ${fmt(st.margin, 2)} calibers`;
    $("diagramNote").textContent = st.margin >= 0
      ? `The CP sits ${fmt((st.cp - st.cg) * 100, 1)} cm behind the CG, which is ${fmt(st.margin, 2)} body diameters. When the rocket tilts, the air pushes on the CP and swings the nose back into line, like the feathers on an arrow. The dashed box is the motor.`
      : `The CP sits ${fmt((st.cg - st.cp) * 100, 1)} cm in front of the CG. When the rocket tilts, the air pushes the tail forward and the rocket flips. Move the CG forward (nose weight) or the CP back (bigger fins). The dashed box is the motor.`;
  }

  /* ---------- charts (canvas, no library) ---------- */
  function niceStep(span, n) {
    const raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
  }
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function chart(box, data, opts) {
    box.innerHTML = "";
    const cv = document.createElement("canvas"), tip = document.createElement("div");
    tip.className = "tip"; tip.hidden = true;
    cv.setAttribute("role", "img"); cv.setAttribute("aria-label", opts.aria);
    box.append(cv, tip);
    const dpr = window.devicePixelRatio || 1;
    const Wc = box.clientWidth, Hc = box.clientHeight;
    cv.width = Wc * dpr; cv.height = Hc * dpr;
    const ctx = cv.getContext("2d"); ctx.scale(dpr, dpr);
    const m = { l: 46, r: 12, t: 22, b: 26 };
    const xs = data.map(p => p[0]), ys = data.map(p => p[1]);
    const x0 = opts.xMin ?? 0, x1 = opts.xMax ?? Math.max(...xs);
    let y0 = Math.min(0, ...ys), y1 = Math.max(...ys);
    if (y1 - y0 < 1e-6) y1 = y0 + 1;
    const yStep = niceStep(y1 - y0, 4); y0 = Math.floor(y0 / yStep) * yStep; y1 = Math.ceil(y1 / yStep) * yStep;
    const X = x => m.l + (x - x0) / (x1 - x0) * (Wc - m.l - m.r);
    const Y = y => m.t + (1 - (y - y0) / (y1 - y0)) * (Hc - m.t - m.b);
    const ink2 = css("--ink-2"), muted = css("--muted"), rule = css("--rule"), accent = css("--accent"), card = css("--card");

    function draw(hover) {
      ctx.clearRect(0, 0, Wc, Hc);
      ctx.font = "11px 'IBM Plex Mono', monospace"; ctx.lineWidth = 1;
      // grid + y labels
      for (let y = y0; y <= y1 + 1e-9; y += yStep) {
        ctx.strokeStyle = Math.abs(y) < 1e-9 ? css("--rule-strong") : rule;
        ctx.beginPath(); ctx.moveTo(m.l, Y(y)); ctx.lineTo(Wc - m.r, Y(y)); ctx.stroke();
        ctx.fillStyle = muted; ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.fillText(fmt(y, yStep < 1 ? 1 : 0), m.l - 6, Y(y));
      }
      // x labels
      const xStep = niceStep(x1 - x0, Wc < 380 ? 4 : 6);
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (let x = Math.ceil(x0 / xStep) * xStep; x <= x1 + 1e-9; x += xStep) ctx.fillText(fmt(x, xStep < 1 ? 1 : 0), X(x), Hc - m.b + 6);
      ctx.textAlign = "right"; ctx.fillText("s", Wc - m.r, Hc - m.b + 6);
      // events
      let row = 0;
      for (const ev of opts.events || []) {
        if (ev.t < x0 || ev.t > x1) continue;
        ctx.strokeStyle = ink2; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(X(ev.t), m.t); ctx.lineTo(X(ev.t), Hc - m.b); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = ink2; ctx.textAlign = X(ev.t) > Wc - 70 ? "right" : "left"; ctx.textBaseline = "top";
        ctx.fillText(ev.label, X(ev.t) + (ctx.textAlign === "left" ? 4 : -4), 2 + (row++ % 2) * 0);
      }
      // area + line
      const vis = data.filter(p => p[0] >= x0 && p[0] <= x1);
      const zeroY = Y(Math.max(y0, Math.min(0, y1)));
      ctx.beginPath(); vis.forEach((p, k) => k ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])));
      ctx.lineTo(X(vis[vis.length - 1][0]), zeroY); ctx.lineTo(X(vis[0][0]), zeroY); ctx.closePath();
      const grad = ctx.createLinearGradient(0, m.t, 0, Hc - m.b);
      grad.addColorStop(0, "rgba(255,106,31,0.35)"); grad.addColorStop(1, "rgba(255,106,31,0.02)");
      ctx.fillStyle = grad; ctx.fill();
      ctx.beginPath(); vis.forEach((p, k) => k ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])));
      ctx.save(); ctx.shadowColor = css("--glow"); ctx.shadowBlur = 10;
      ctx.strokeStyle = accent; ctx.lineWidth = 2.2; ctx.lineJoin = "round"; ctx.stroke(); ctx.restore();
      // highlighted peak
      if (opts.peak) {
        const pk = vis.reduce((b, p) => (p[1] > b[1] ? p : b));
        ctx.beginPath(); ctx.arc(X(pk[0]), Y(pk[1]), 4.5, 0, 7); ctx.fillStyle = accent; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = card; ctx.stroke();
      }
      // hover
      if (hover) {
        ctx.strokeStyle = ink2; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(X(hover[0]), m.t); ctx.lineTo(X(hover[0]), Hc - m.b); ctx.stroke();
        ctx.beginPath(); ctx.arc(X(hover[0]), Y(hover[1]), 5, 0, 7); ctx.fillStyle = accent; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = card; ctx.stroke();
      }
    }
    draw(null);

    const vis = data.filter(p => p[0] >= x0 && p[0] <= x1);
    function move(ev) {
      const rect = cv.getBoundingClientRect(), mx = ev.clientX - rect.left;
      const t = x0 + (mx - m.l) / (Wc - m.l - m.r) * (x1 - x0);
      if (t < x0 || t > x1) { leave(); return; }
      let best = vis[0];
      for (const p of vis) if (Math.abs(p[0] - t) < Math.abs(best[0] - t)) best = p;
      draw(best);
      tip.hidden = false;
      tip.textContent = `${fmt(best[0], 2)} s · ${fmt(best[1], opts.dp ?? 1)} ${opts.unit}`;
      const tx = Math.min(Math.max(X(best[0]), 70), Wc - 70);
      tip.style.left = tx + "px"; tip.style.top = Math.max(Y(best[1]), 34) + "px";
    }
    function leave() { tip.hidden = true; draw(null); }
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerdown", move);
    cv.addEventListener("pointerleave", leave);
  }

  function renderCharts({ i, sim }) {
    const e = sim.events, S = sim.series, mo = sim.motor;
    const xMax = range === "up" ? Math.min(e.landing.t, Math.max(e.eject.t, e.apogee.t) + 2) : e.landing.t;
    const events = [
      { t: e.burnout.t, label: "burnout" },
      { t: e.apogee.t, label: "top" },
      { t: e.eject.t, label: "chute" }
    ].sort((a, b) => a.t - b.t);
    // keep labels from colliding: drop a label if it is too close to the previous one
    const evs = [];
    for (const ev of events) {
      const prev = evs[evs.length - 1];
      if (prev && Math.abs(ev.t - prev.t) < xMax * 0.08) prev.label += " + " + ev.label;
      else evs.push({ ...ev });
    }

    chart($("pAlt"), S.map(p => [p.t, p.h]), { xMax, events: evs, unit: "m", dp: 1, peak: true, aria: `Altitude over time, peaking at ${fmt(e.apogee.h)} metres` });
    chart($("pVel"), S.map(p => [p.t, p.v]), { xMax, events: evs, unit: "m/s", dp: 1, peak: true, aria: `Speed over time, top speed ${fmt(sim.maxSpeed)} m/s` });
    chart($("pAcc"), S.map(p => [p.t, p.a / P.G]), { xMax, events: evs, unit: "G", dp: 1, peak: true, aria: `Acceleration over time, peak ${fmt(sim.maxAccelG, 1)} G` });
    chart($("pThr"), mo.curve.map(p => [p[0], p[1]]), { xMin: 0, xMax: mo.burnTime, unit: "N", dp: 1, peak: true, aria: `${mo.name} thrust curve, peak ${fmt(mo.peakThrust, 1)} newtons` });

    const coast = e.apogee.t - mo.burnTime;
    $("cAlt").innerHTML = `The motor burns for <b>${fmt(mo.burnTime, 2)} s</b>, then the rocket coasts upward for another ${fmt(coast, 1)} s, slowing as gravity and drag pull back. It peaks at <b>${fmt(e.apogee.h)} m (${fmt(ft(e.apogee.h))} ft)</b>${range === "all" ? `, then drifts down under the parachute and lands at ${fmt(e.landing.t, 1)} s` : ""}.`;
    $("cVel").innerHTML = `Speed peaks at <b>${fmt(sim.maxSpeed)} m/s (${fmt(mph(sim.maxSpeed))} mph)</b> right at burnout, when the push stops. After that it drops; the line crosses zero at the top of the flight. Below zero means falling. ${i.chute > 0 ? `With the parachute open it settles at <b>${fmt(Math.abs(e.landing.v), 1)} m/s</b>, its terminal speed.` : ""}`;
    $("cAcc").innerHTML = `The rocket feels <b>${fmt(sim.maxAccelG, 1)} G</b> during the motor's first spike. When the motor stops, acceleration drops below zero: gravity and drag are now slowing it down, about ${fmt(Math.abs(S.find(p => p.t > mo.burnTime + 0.05)?.a / P.G || 1), 1)} G right after burnout.`;
    const letter = mo.name.slice(-2, -1);
    const classes = { A: "1.26–2.5", B: "2.51–5", C: "5.01–10" };
    $("cThr").innerHTML = `The ${mo.name} pushes hardest at the start (<b>${fmt(mo.peakThrust, 1)} N</b>) to get off the pad, then settles lower. The area under this curve is the total impulse, <b>${fmt(mo.impulse, 1)} N·s</b>; the letter "${letter}" means ${classes[letter]} N·s. The number after the dash on the motor (${mo.name.slice(-2)}-${i.delay}) is the delay in seconds before the parachute charge fires.`;
  }

  /* ---------- wiring ---------- */
  document.querySelectorAll("[data-preset]").forEach(b => b.addEventListener("click", () => loadPreset(b.dataset.preset)));
  document.querySelectorAll("[data-range]").forEach(b => b.addEventListener("click", () => {
    range = b.dataset.range;
    document.querySelectorAll("[data-range]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    if (last) renderCharts(last);
  }));
  $("card").addEventListener("submit", e => e.preventDefault());
  $("motor").addEventListener("change", () => { fillDelays($("delay").value); run(); });
  $("card").addEventListener("input", () => {
    document.querySelectorAll("[data-preset]").forEach(b => b.setAttribute("aria-pressed", "false"));
    run();
  });
  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => last && renderCharts(last), 120); });
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener && mq.addEventListener("change", () => last && renderCharts(last));
  new MutationObserver(() => last && renderCharts(last)).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => last && renderCharts(last));

  loadPreset("beginner");
})();
