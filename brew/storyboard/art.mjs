// Illustrated building blocks used across frames.
import { C, D, S, M, T, TS, R, Ln, Ci, P, G, ML, rng, waveform, clipRect, grad, rgrad, check, cross, tag } from './lib.mjs';

// ---------- the old workflow ----------
export function loopCard(x, y, label, step, o = {}) {
  const w = o.w || 360, h = o.h || 116, g = o.grey;
  const dot = g ? C.t3 : (o.dot || C.amber);
  const inner =
    R(-w / 2, -h / 2, w, h, { r: 14, fill: C.s1, stroke: g ? C.line : C.line2, sw: 1.2 }) +
    ML(-w / 2 + 24, -h / 2 + 36, `Step ${step}`, { size: 12, fill: g ? C.line2 : C.t3 }) +
    T(-w / 2 + 24, -h / 2 + 80, label, { f: S, w: 600, size: 30, fill: g ? C.t3 : C.text }) +
    Ci(w / 2 - 28, -h / 2 + 31, 6, { fill: dot }) +
    (o.status ? T(w / 2 - 44, -h / 2 + 36, o.status, { f: M, size: 12, fill: g ? C.line2 : C.t3, anchor: 'end', ls: 1 }) : '');
  return G(`translate(${x} ${y}) rotate(${o.rot || 0}) scale(${o.s || 1})`, inner, { op: o.op });
}

export function bubble(x, y, text, o = {}) {
  const w = text.length * 10.5 + 84, g = o.grey;
  return G(`translate(${x} ${y}) rotate(${o.rot || 0})`,
    R(0, 0, w, 56, { r: 18, fill: C.s2, stroke: C.line2 }) +
    Ci(30, 28, 14, { fill: g ? C.line2 : (o.av || C.teal) }) +
    T(56, 35, text, { f: S, size: 20, fill: g ? C.t3 : C.text }), { op: o.op });
}

export function fileChip(x, y, name, o = {}) {
  const w = name.length * 9.6 + 76, g = o.grey;
  return G(`translate(${x} ${y}) rotate(${o.rot || 0})`,
    R(0, 0, w, 48, { r: 10, fill: C.s2, stroke: C.line2 }) +
    R(16, 13, 18, 22, { r: 3, fill: 'none', stroke: g ? C.t3 : (o.col || C.t2), sw: 1.6 }) +
    T(48, 30, name, { f: M, size: 16, fill: g ? C.t3 : C.t2 }), { op: o.op });
}

export const badge = (x, y, n, grey) =>
  Ci(x, y, 16, { fill: grey ? C.line2 : C.coral }) + T(x, y + 6, n, { f: S, w: 600, size: 16, fill: grey ? C.t3 : C.text, anchor: 'middle' });

export function chaos(grey = false, o = {}) {
  const cards = [
    ['Find an editor', '01', 330, 300, -8, 'searching…'], ['Send the brief', '02', 780, 240, 5, 'sent'],
    ['Wait', '03', 1260, 300, -4, '2 days'], ['Review', '04', 1590, 470, 9, 'v2'],
    ['Request changes', '05', 1420, 760, -6, '14 notes'], ['Wait', '06', 900, 820, 3, '3 days'],
    ['Review again', '07', 420, 760, 7, 'v3'], ['Find a new editor', '01', 240, 520, -12, 'again'],
    ['Send the brief', '02', 1180, 560, -3, 're-sent'], ['Wait', '03', 640, 560, 11, '…'],
  ];
  let out = cards.map(([l, s, x, y, r, st], i) =>
    loopCard(x, y, l, s, { rot: r, grey, status: st, op: 0.55 + 0.45 * ((i * 37) % 10) / 10, dot: i % 3 ? C.amber : C.coral })).join('');
  out += bubble(1080, 150, 'any update on the edit?', { rot: -3, grey, av: C.teal });
  out += bubble(160, 880, 'can we try a different font?', { rot: 4, grey, av: C.amber });
  out += bubble(1240, 940, 'sorry, running a day late', { rot: -2, grey, av: C.coral });
  out += fileChip(560, 140, 'v3_FINAL_final.mp4', { rot: 6, grey });
  out += fileChip(1500, 620, 'script_v7_notes.docx', { rot: -9, grey });
  out += fileChip(120, 640, 'broll_maybe.zip', { rot: 10, grey });
  out += badge(470, 252, '3', grey) + badge(1415, 245, '12', grey) + badge(1736, 418, '7', grey) + badge(1050, 772, '2', grey);
  return G(null, out, { op: o.op });
}

// ---------- research / film content ----------
export function panamaMap(c, x, y, w, h, o = {}) {
  const px = (u, v) => `${(x + u * w).toFixed(1)},${(y + v * h).toFixed(1)}`;
  const up = [[0, .55], [.15, .48], [.3, .42], [.42, .36], [.5, .33], [.58, .36], [.7, .30], [.85, .26], [1, .30]];
  const lo = [[1, .62], [.85, .58], [.72, .66], [.62, .74], [.55, .78], [.48, .70], [.40, .72], [.30, .80], [.15, .76], [0, .85]];
  const land = [...up, ...lo].map(([u, v]) => px(u, v)).join(' ');
  const sa = [[.8, 1], [.9, .72], [1, .64], [1, 1]].map(([u, v]) => px(u, v)).join(' ');
  const clip = clipRect(c, x, y, w, h, o.r || 0);
  const s = w / 1000;
  const inner =
    R(x, y, w, h, { fill: '#DCDFD7' }) +
    `<polygon points="${land}" fill="#4DB37E"/><polygon points="${sa}" fill="#4DB37E"/>` +
    `<ellipse cx="${x + .53 * w}" cy="${y + .5 * h}" rx="${.045 * w}" ry="${.05 * h}" fill="#BFD6D0"/>` +
    P(`M${px(.5, .345)} C${px(.53, .45)} ${px(.5, .6)} ${px(.565, .755)}`.replace(/,/g, ' '), { stroke: '#1E2A22', sw: 4 * s, dash: `${10 * s} ${8 * s}`, cap: 'round' }) +
    Ci(x + .5 * w, y + .345 * h, 8 * s, { fill: '#1E2A22' }) + Ci(x + .565 * w, y + .755 * h, 8 * s, { fill: '#1E2A22' }) +
    T(x + .44 * w, y + .3 * h, 'COLÓN', { f: M, w: 500, size: 22 * s, fill: '#1E2A22', ls: 2 * s }) +
    (o.quiet ? '' : T(x + .6 * w, y + .84 * h, 'PANAMA CITY', { f: M, w: 500, size: 22 * s, fill: '#1E2A22', ls: 2 * s })) +
    (o.quiet ? '' : T(x + .12 * w, y + .17 * h, 'CARIBBEAN SEA', { f: M, size: 20 * s, fill: '#7C8A82', ls: 4 * s }) +
      T(x + .12 * w, y + .95 * h, 'PACIFIC OCEAN', { f: M, size: 20 * s, fill: '#7C8A82', ls: 4 * s })) +
    (o.label ? R(x + .06 * w, y + .62 * h, 270 * s, 46 * s, { r: 4 * s, fill: '#F2C94C' }) + T(x + .06 * w + 16 * s, y + .62 * h + 32 * s, o.label, { f: D, w: 800, size: 26 * s, fill: '#1E2A22' }) : '');
  return G(null, inner, { clip });
}

export function archivePhoto(c, x, y, w, h, o = {}) {
  const pad = w * 0.05, cap = h * 0.12;
  const sep = grad(c, [[0, '#A68B68'], [1, '#4A3B2C']]);
  const vig = rgrad(c, [[0.55, '#000', 0], [1, '#1A130C', 0.55]]);
  const ix = x + pad, iy = y + pad, iw = w - pad * 2, ih = h - pad - cap;
  const clip = clipRect(c, ix, iy, iw, ih);
  const u = (a) => ix + a * iw, v = (b) => iy + b * ih;
  const figure =
    P(`M${u(.12)} ${v(1)} C${u(.18)} ${v(.72)} ${u(.34)} ${v(.62)} ${u(.5)} ${v(.62)} C${u(.66)} ${v(.62)} ${u(.82)} ${v(.72)} ${u(.88)} ${v(1)} Z`, { fill: '#2B2219' }) +
    P(`M${u(.44)} ${v(.62)} L${u(.5)} ${v(.74)} L${u(.56)} ${v(.62)} Z`, { fill: '#D9CDB4' }) +
    R(u(.455), v(.5), iw * .09, ih * .14, { fill: '#5B4734' }) +
    `<ellipse cx="${u(.5)}" cy="${v(.4)}" rx="${iw * .12}" ry="${ih * .16}" fill="#6E5640"/>` +
    P(`M${u(.33)} ${v(.32)} C${u(.36)} ${v(.14)} ${u(.64)} ${v(.14)} ${u(.67)} ${v(.32)} L${u(.62)} ${v(.27)} L${u(.38)} ${v(.27)} Z`, { fill: '#E4D9C3' }) +
    P(`M${u(.38)} ${v(.33)} C${u(.42)} ${v(.29)} ${u(.58)} ${v(.29)} ${u(.62)} ${v(.33)}`, { stroke: '#3B2E22', sw: iw * .02 });
  return G(o.tr || null,
    R(x, y, w, h, { r: 3, fill: '#E9E1CE' }) +
    G(null, R(ix, iy, iw, ih, { fill: sep }) + figure + R(ix, iy, iw, ih, { fill: vig }), { clip }) +
    T(x + pad, y + h - cap * 0.38, o.caption || 'R. FREEDMAN · 1911', { f: M, w: 500, size: cap * 0.32, fill: '#5A4A38', ls: 2 }), { op: o.op });
}

export function skyline(c, x, y, w, h, o = {}) {
  const sky = grad(c, [[0, '#6E8FB8'], [0.65, '#E7B48A'], [1, '#F2C79A']]);
  const clip = clipRect(c, x, y, w, h, o.r || 0);
  const r = rng(11);
  let b = '';
  let bx = x - 10;
  while (bx < x + w) {
    const bw = w * (0.04 + r() * 0.06), bh = h * (0.25 + r() * 0.5);
    b += R(bx, y + h - bh, bw, bh, { fill: '#2B3648' });
    for (let wy = y + h - bh + 14; wy < y + h - 10; wy += 22) for (let wx = bx + 8; wx < bx + bw - 8; wx += 16) if (r() < 0.45) b += R(wx, wy, 6, 9, { fill: '#F5D9A0', op: 0.65 });
    bx += bw + 4;
  }
  return G(null,
    R(x, y, w, h, { fill: sky }) + Ci(x + w * 0.7, y + h * 0.55, h * 0.12, { fill: '#FBE3B8', op: 0.9 }) + b +
    T(x + w / 2, y + h * 0.5, 'stock', { f: D, w: 800, size: h * 0.3, fill: '#FFFFFF', op: 0.16, anchor: 'middle' }), { clip, op: o.op });
}

export function serumShot(c, x, y, w, h, o = {}) {
  const clip = clipRect(c, x, y, w, h, o.r || 0);
  const marble = grad(c, [[0, '#EEECE7'], [1, '#C9C4BB']], { dir: [0, 0, 1, 1] });
  const light = rgrad(c, [[0, '#FFF6E0', 0.55], [1, '#FFF6E0', 0]], { cx: 0.2, cy: 0.1, r: 0.8 });
  const glass = grad(c, [[0, '#C9772A'], [0.5, '#8E4A12'], [1, '#C9772A']], { dir: [0, 0, 1, 0] });
  const u = a => x + a * w, v = b => y + b * h;
  const r = rng(5);
  let veins = '';
  for (let i = 0; i < 7; i++) {
    const sx = r(), sy = r();
    veins += P(`M${u(sx)} ${v(sy)} C${u(sx + .15)} ${v(sy + .05)} ${u(sx + .2)} ${v(sy - .08)} ${u(sx + .38)} ${v(sy + .02)}`, { stroke: '#9E9890', sw: 1.5 + r() * 2, op: 0.35 });
  }
  let drops = '';
  for (let i = 0; i < 18; i++) drops += Ci(u(r()), v(.7 + r() * .28), 3 + r() * 7, { fill: '#FFFFFF', op: 0.5, stroke: '#B8B2A8', sw: 1 });
  const bottle =
    R(u(.46), v(.3), w * .1, h * .36, { r: w * .012, fill: glass }) +
    R(u(.475), v(.36), w * .07, h * .14, { r: 4, fill: '#F2EADB' }) +
    T(u(.51), v(.42), 'SERUM', { f: M, w: 500, size: h * .022, fill: '#5A4A38', anchor: 'middle', ls: 2 }) +
    T(u(.51), v(.46), '30 ml', { f: M, size: h * .018, fill: '#8A7A66', anchor: 'middle' }) +
    R(u(.48), v(.24), w * .06, h * .07, { r: 3, fill: '#1A1A1A' }) +
    `<ellipse cx="${u(.51)}" cy="${v(.2)}" rx="${w * .026}" ry="${h * .05}" fill="#222"/>` +
    R(u(.468), v(.31), w * .012, h * .32, { r: 4, fill: '#FFFFFF', op: 0.25 });
  const hand =
    P(`M${u(.30)} ${v(1)} C${u(.33)} ${v(.82)} ${u(.40)} ${v(.66)} ${u(.47)} ${v(.6)} L${u(.58)} ${v(.56)} C${u(.6)} ${v(.6)} ${u(.59)} ${v(.66)} ${u(.55)} ${v(.68)} L${u(.6)} ${v(.68)} C${u(.63)} ${v(.71)} ${u(.61)} ${v(.76)} ${u(.56)} ${v(.77)} C${u(.6)} ${v(.8)} ${u(.58)} ${v(.85)} ${u(.53)} ${v(.85)} C${u(.52)} ${v(.92)} ${u(.5)} ${v(1)} ${u(.5)} ${v(1)} Z`, { fill: '#C99A7A' }) +
    P(`M${u(.47)} ${v(.6)} C${u(.44)} ${v(.52)} ${u(.45)} ${v(.46)} ${u(.47)} ${v(.44)} C${u(.49)} ${v(.5)} ${u(.5)} ${v(.56)} ${u(.5)} ${v(.6)} Z`, { fill: '#B98A6A' });
  return G(null,
    R(x, y, w, h, { fill: marble }) + veins + drops +
    `<ellipse cx="${u(.52)}" cy="${v(.97)}" rx="${w * .2}" ry="${h * .04}" fill="#000" opacity="0.12"/>` +
    bottle + hand + R(x, y, w, h, { fill: light }), { clip });
}

export function phone(c, x, y, w, h, o = {}) {
  const r = w * 0.08, clip = clipRect(c, x, y, w, h, r);
  const pal = o.pal || ['#3A3F4A', '#1C1F26', '#C99A7A', '#2B2B2B', '#E2634A'];
  const bg = grad(c, [[0, pal[0]], [1, pal[1]]]);
  const u = a => x + a * w, v = b => y + b * h;
  const person =
    P(`M${u(.12)} ${v(1)} C${u(.14)} ${v(.74)} ${u(.3)} ${v(.62)} ${u(.5)} ${v(.62)} C${u(.7)} ${v(.62)} ${u(.86)} ${v(.74)} ${u(.88)} ${v(1)} Z`, { fill: pal[4] }) +
    R(u(.44), v(.5), w * .12, h * .1, { fill: pal[2] }) +
    `<ellipse cx="${u(.5)}" cy="${v(.42)}" rx="${w * .16}" ry="${h * .1}" fill="${pal[2]}"/>` +
    P(`M${u(.33)} ${v(.42)} C${u(.31)} ${v(.26)} ${u(.69)} ${v(.26)} ${u(.67)} ${v(.42)} C${u(.64)} ${v(.34)} ${u(.4)} ${v(.32)} ${u(.33)} ${v(.42)} Z`, { fill: pal[3] }) +
    (o.prop ? R(u(.62), v(.66), w * .1, h * .16, { r: 6, fill: '#B5651D' }) + R(u(.635), v(.63), w * .07, h * .035, { r: 2, fill: '#1A1A1A' }) : '');
  const capW = Math.min(w * 0.86, (o.caption || '').length * h * 0.021 + 30);
  return G(null,
    G(null,
      R(x, y, w, h, { fill: bg }) + person +
      (o.caption ? R(x + (w - capW) / 2, v(.78), capW, h * .07, { r: 8, fill: '#FFFFFF' }) +
        T(u(.5), v(.78) + h * .047, o.caption, { f: S, w: 600, size: h * .034, fill: '#111', anchor: 'middle' }) : '') +
      R(u(.06), v(.035), w * .88, 3, { r: 1.5, fill: '#FFFFFF', op: 0.35 }) + R(u(.06), v(.035), w * .88 * (o.prog ?? .4), 3, { r: 1.5, fill: '#FFFFFF' }) +
      (o.label ? tag(u(.06), v(.06), o.label, C.coral, true, Math.max(10, h * 0.022)) : '') +
      T(u(.94), v(.08), 'AI-GENERATED', { f: M, size: Math.max(8, h * 0.016), fill: '#FFFFFF', op: 0.75, anchor: 'end', ls: 1 }), { clip }) +
    R(x, y, w, h, { r, stroke: C.line2, sw: 1.5 }), { op: o.op });
}

export function player(c, x, y, w, h, inner, o = {}) {
  const clip = clipRect(c, x, y, w, h, o.r ?? 14);
  const shade = grad(c, [[0.75, '#000', 0], [1, '#000', 0.6]]);
  const p = o.prog ?? 0.35;
  return G(null,
    G(null, inner + R(x, y, w, h, { fill: shade }) +
      (o.sub ? o.sub : '') +
      R(x + 24, y + h - 26, w - 48, 4, { r: 2, fill: '#FFFFFF', op: 0.25 }) + R(x + 24, y + h - 26, (w - 48) * p, 4, { r: 2, fill: o.col || C.green }) +
      Ci(x + 24 + (w - 48) * p, y + h - 24, 8, { fill: C.text }) +
      (o.time ? T(x + w - 24, y + h - 40, o.time, { f: M, size: 14, fill: C.text, anchor: 'end', op: 0.85 }) : ''), { clip }) +
    R(x, y, w, h, { r: o.r ?? 14, stroke: C.line2, sw: 1.5 }));
}

export function chartCard(x, y, w, h, o = {}) {
  const bars = [0.8, 0.75, 0.85, 0.7, 0.78, 0.46];
  let b = '';
  const bw = (w - 80) / bars.length;
  bars.forEach((v, i) => { b += R(x + 40 + i * bw + 6, y + h - 30 - v * (h - 120), bw - 12, v * (h - 120), { r: 3, fill: i === 5 ? C.coral : C.line2 }); });
  return R(x, y, w, h, { r: 14, fill: C.s1, stroke: C.line2 }) + ML(x + 24, y + 36, 'Rainfall · Oct 2023', { size: 12 }) +
    T(x + w - 24, y + 44, '−41%', { f: D, w: 700, size: 36, fill: C.coral, anchor: 'end' }) + b;
}

export function factCard(x, y, w, h, label, value, sub, o = {}) {
  return G(`translate(${x} ${y}) rotate(${o.rot || 0})`,
    R(0, 0, w, h, { r: 14, fill: C.s1, stroke: o.stroke || C.line2, sw: 1.2 }) +
    ML(24, 38, label, { size: 12 }) +
    T(24, 38 + (o.vs || 56) + 10, value, { f: D, w: 700, size: o.vs || 56, fill: o.vcol || C.text }) +
    T(24, h - 24, sub, { f: S, size: 17, fill: C.t3 }) +
    (o.ok ? check(w - 30, 32, 12) : ''), { op: o.op });
}

export function timeline(c, x, y, w, h, o = {}) {
  const rows = [['V2', 'gfx'], ['V1', 'vid'], ['A1', 'vo'], ['A2', 'mus']];
  const rh = (h - 60) / rows.length;
  let out = R(x, y, w, h, { r: 16, fill: C.s1, stroke: C.line2 });
  for (let i = 0; i <= 12; i++) {
    const tx = x + 90 + i * (w - 110) / 12;
    out += Ln(tx, y + 18, tx, y + 30, { stroke: C.line2 }) + T(tx + 4, y + 30, `${String(i * 5).padStart(2, '0')}s`, { f: M, size: 11, fill: C.t3 });
  }
  const clips = {
    gfx: [[.06, .14, '−41%', C.coral], [.38, .16, '26 m', C.amber], [.7, .14, '50M gal', C.teal]],
    vid: [[0, .22, 'MAP · ISTHMUS', '#4DB37E'], [.23, .2, 'ARCHIVE · 1914', '#A68B68'], [.44, .24, 'LOCKS · DIAGRAM', C.teal], [.69, .3, 'MAP · LAKE GATUN', '#4DB37E']],
  };
  rows.forEach(([lab, kind], i) => {
    const ry = y + 48 + i * rh, cx0 = x + 90, cw = w - 110;
    out += ML(x + 24, ry + rh / 2 + 5, lab, { size: 13 }) + Ln(x + 80, ry, x + w - 10, ry, { stroke: C.line });
    if (clips[kind]) clips[kind].forEach(([s, l, name, col]) => {
      out += R(cx0 + s * cw, ry + 8, l * cw - 6, rh - 16, { r: 6, fill: col, fop: 0.22, stroke: col, sw: 1.2 }) +
        T(cx0 + s * cw + 12, ry + rh / 2 + 5, name, { f: M, size: 12, fill: C.text, ls: 1 });
    });
    if (kind === 'vo') out += R(cx0, ry + 8, cw * .97, rh - 16, { r: 6, fill: C.green, fop: 0.12, stroke: C.green, sw: 1 }) + waveform(cx0 + 8, ry + rh / 2, cw * .95, rh - 28, 140, 3, C.green);
    if (kind === 'mus') out += R(cx0, ry + 8, cw, rh - 16, { r: 6, fill: C.t3, fop: 0.1, stroke: C.line2 }) + waveform(cx0 + 8, ry + rh / 2, cw - 16, rh - 34, 160, 9, C.t3, { flat: true, op: 0.6 });
  });
  const ph = x + 90 + (w - 110) * (o.play ?? 0.42);
  out += Ln(ph, y + 12, ph, y + h - 8, { stroke: C.green, sw: 2 }) + `<polygon points="${ph - 7},${y + 12} ${ph + 7},${y + 12} ${ph},${y + 22}" fill="${C.green}"/>`;
  return out;
}

export function videoCard(c, x, y, w, o = {}) {
  const th = w * 9 / 16;
  return R(x, y, w, th + 150, { r: 18, fill: C.s1, stroke: C.line2 }) +
    G(null, panamaMap(c, x + 14, y + 14, w - 28, th - 28, { r: 10, quiet: true }) +
      T(x + 46, y + th * 0.62, 'PANAMA', { f: D, w: 800, size: w * 0.085, fill: '#111', ls: -3 }) +
      T(x + 46, y + th * 0.62 + w * 0.08, 'RAN DRY', { f: D, w: 800, size: w * 0.085, fill: C.coral, ls: -3 })) +
    R(x + w - 120, y + th - 64, 92, 32, { r: 6, fill: '#000', op: 0.8 }) + T(x + w - 74, y + th - 41, o.dur || '58:24', { f: M, w: 500, size: 16, fill: C.text, anchor: 'middle' }) +
    T(x + 28, y + th + 40, 'Why the Panama Canal Ran Short of Water', { f: S, w: 600, size: 26, fill: C.text }) +
    T(x + 28, y + th + 76, 'Ready to upload · Day 3 · Two rounds of notes included', { f: S, size: 18, fill: C.t3 }) +
    tag(x + 28, y + th + 100, 'Delivered', C.green, true, 12) + tag(x + 150, y + th + 100, 'Reviewed by a person', C.green, false, 12);
}
