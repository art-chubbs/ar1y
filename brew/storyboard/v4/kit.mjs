// v4 kit: "night glass" look (after the NeuraFlow film by Zelios), translated to brew's brand.
// Dark stage, one volumetric beam from above, a planet horizon the product rises out of,
// glassmorphism UI, orbit rings, and brew's viewfinder brackets as the hero shape.
// Every element is a flat 2D layer (no skew/perspective) so it splits cleanly for After Effects.
import { C, D, S, M, W, H, T, TS, R, Ln, Ci, P, G, ML, LAYER, esc, rng, clipRect } from '../lib.mjs';
import { tw } from '../v3/kit.mjs';

// Night palette: brew's near-black, lit by brew green → teal instead of the reference's electric blue.
export const N = {
  base: '#040706', deep: '#07120F', panel: '#0B1613', panel2: '#0F1D19',
  ink: '#F2F2F0', ink2: '#B8C6C0', ink3: '#7D8B85', ink4: '#4E5A55',
  green: C.green, teal: C.teal, mint: '#9BF0C8', rim: '#E6FFF4', amber: C.amber, coral: C.coral,
};

// ---------- defs helpers (user-space so thin lines and strokes still render) ----------
export function lg(c, stops, [x1, y1, x2, y2], user = false) {
  const id = c.uid('lg');
  c.def(`<linearGradient id="${id}"${user ? ' gradientUnits="userSpaceOnUse"' : ''} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, col, op = 1]) => `<stop offset="${o}" stop-color="${col}" stop-opacity="${op}"/>`).join('')}</linearGradient>`);
  return `url(#${id})`;
}
export function rg(c, stops, o = {}) {
  const id = c.uid('rg');
  const u = o.user ? ` gradientUnits="userSpaceOnUse" cx="${o.cx}" cy="${o.cy}" r="${o.r}"${o.fx != null ? ` fx="${o.fx}" fy="${o.fy}"` : ''}` : ` cx="${o.cx ?? 0.5}" cy="${o.cy ?? 0.5}" r="${o.r ?? 0.5}"`;
  c.def(`<radialGradient id="${id}"${u}>${stops.map(([off, col, op = 1]) => `<stop offset="${off}" stop-color="${col}" stop-opacity="${op}"/>`).join('')}</radialGradient>`);
  return `url(#${id})`;
}
export function blurU(c, s) {
  const id = c.uid('bl');
  c.def(`<filter id="${id}" filterUnits="userSpaceOnUse" x="-400" y="-400" width="2720" height="1880"><feGaussianBlur stdDeviation="${s}"/></filter>`);
  return `url(#${id})`;
}
export const fx = (inner, filter, op) => `<g filter="${filter}"${op != null ? ` opacity="${op}"` : ''}>${inner}</g>`;
// Bloom: a blurred copy under the sharp element.
export const bloom = (c, svg, s = 10, op = 0.8) => fx(svg, blurU(c, s), op) + svg;

// ---------- stage ----------
export function nightBg(c, o = {}) {
  const vig = rg(c, [[0, N.deep, 1], [0.6, N.base, 1], [1, '#000000', 1]], { user: true, cx: o.cx ?? 960, cy: o.cy ?? 380, r: 1250 });
  return LAYER('Background · night', R(0, 0, W, H, { fill: vig }));
}
// Faint square grid, fading out from the centre (the reference's "blueprint" floor).
export function grid(c, o = {}) {
  const id = c.uid('grid'), mid = c.uid('gm');
  const step = o.step || 120, cx = o.cx ?? 960, cy = o.cy ?? 420;
  c.def(`<pattern id="${id}" width="${step}" height="${step}" patternUnits="userSpaceOnUse" x="${cx % step}" y="${cy % step}"><path d="M${step} 0H0V${step}" fill="none" stroke="${N.mint}" stroke-opacity="${o.op ?? 0.07}" stroke-width="1"/></pattern>`);
  c.def(`<mask id="${mid}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${rg(c, [[0, '#fff', 1], [0.55, '#fff', 0.5], [1, '#fff', 0]], { user: true, cx, cy, r: o.r || 900 })}"/></mask>`);
  return LAYER('Grid', `<rect width="${W}" height="${H}" fill="url(#${id})" mask="url(#${mid})"/>`);
}
// Volumetric beam from the top of frame.
export function beam(c, o = {}) {
  const cx = o.cx ?? 960, k = o.k ?? 1, len = o.len ?? H;
  const cone = lg(c, [[0, N.teal, 0.55 * k], [0.45, N.green, 0.22 * k], [1, N.green, 0]], [0, 0, 0, len], true);
  const core = lg(c, [[0, N.rim, 0.85 * k], [0.35, N.mint, 0.35 * k], [1, N.mint, 0]], [0, 0, 0, len * 0.75], true);
  const top = rg(c, [[0, N.mint, 0.8 * k], [0.5, N.teal, 0.25 * k], [1, N.teal, 0]]);
  const w0 = o.w ?? 180, w1 = o.spread ?? 760;
  return LAYER('Light beam · cone', fx(`<polygon points="${cx - w0},0 ${cx + w0},0 ${cx + w1},${len} ${cx - w1},${len}" fill="${cone}"/>`, blurU(c, 60))) +
    LAYER('Light beam · core', fx(R(cx - w0 * 0.45, 0, w0 * 0.9, len * 0.8, { fill: core }), blurU(c, 34))) +
    LAYER('Light beam · hotspot', `<ellipse cx="${cx}" cy="-40" rx="620" ry="260" fill="${top}"/>`);
}
// Planet horizon: a huge dark sphere whose top rim catches the light.
export function horizon(c, o = {}) {
  const cx = o.cx ?? 960, top = o.y ?? 860, r = o.r ?? 1500, cy = top + r, k = o.k ?? 1;
  const body = rg(c, [[0, '#0E2A22', 1], [0.25, '#06110E', 1], [1, '#020403', 1]], { user: true, cx, cy: top + 60, r: r * 0.9 });
  const rim = lg(c, [[0, N.mint, 0], [0.32, N.teal, 0.5 * k], [0.5, N.rim, 1 * k], [0.68, N.teal, 0.5 * k], [1, N.mint, 0]], [cx - r, 0, cx + r, 0], true);
  const atmo = rg(c, [[0, N.green, 0.55 * k], [0.5, N.teal, 0.18 * k], [1, N.teal, 0]]);
  return LAYER('Horizon · atmosphere', `<ellipse cx="${cx}" cy="${top}" rx="${o.atmo ?? 700}" ry="${(o.atmo ?? 700) * 0.42}" fill="${atmo}"/>`) +
    LAYER('Horizon · planet', Ci(cx, cy, r, { fill: body })) +
    LAYER('Horizon · rim glow', fx(Ci(cx, cy, r, { stroke: rim, sw: 18 }), blurU(c, 16))) +
    LAYER('Horizon · rim light', Ci(cx, cy, r, { stroke: rim, sw: 2.5 }));
}
// Floating dust lit by the beam.
export function dust(c, o = {}) {
  const r = rng(o.seed ?? 7), n = o.n ?? 90, [x0, y0, x1, y1] = o.box || [360, 60, 1560, 900];
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), rad = 0.7 + r() * 1.8;
    s += Ci(x.toFixed(1), y.toFixed(1), rad.toFixed(2), { fill: r() > 0.7 ? N.rim : N.mint, op: (0.15 + r() * 0.7).toFixed(2) });
  }
  return LAYER('Dust particles', s);
}
// Horizontal lens streak (anamorphic flare).
export const streak = (c, x, y, w, o = {}) =>
  LAYER('Lens streak', fx(R(x - w / 2, y - 3, w, 6, { r: 3, fill: lg(c, [[0, N.teal, 0], [0.5, N.rim, o.op ?? 0.9], [1, N.teal, 0]], [x - w / 2, 0, x + w / 2, 0], true) }), blurU(c, 4)));

// ---------- glyphs ----------
export const sparklePath = (x, y, r) => {
  const k = r * 0.14;
  return `M${x} ${y - r}C${x + k} ${y - k} ${x + k} ${y - k} ${x + r} ${y}C${x + k} ${y + k} ${x + k} ${y + k} ${x} ${y + r}C${x - k} ${y + k} ${x - k} ${y + k} ${x - r} ${y}C${x - k} ${y - k} ${x - k} ${y - k} ${x} ${y - r}Z`;
};
export const sparkle = (c, x, y, r, o = {}) => LAYER('Sparkle', bloom(c, P(sparklePath(x, y, r), { fill: o.fill || N.rim }), r * 0.5, 0.9));

// brew mark: green viewfinder brackets holding the "e".
export function bracketsPath(x, y, w, h, l) {
  return `M${x} ${y + l}V${y}H${x + l}M${x + w - l} ${y}H${x + w}V${y + l}M${x + w} ${y + h - l}V${y + h}H${x + w - l}M${x + l} ${y + h}H${x}V${y + h - l}`;
}
export function mark(c, cx, cy, s, o = {}) {
  const half = s / 2, sw = Math.max(2, s * 0.06), col = o.col || N.green;
  const br = P(bracketsPath(cx - half, cy - half, s, s, s * 0.24), { stroke: col, sw, cap: 'square' });
  const e = T(cx, cy + s * 0.22, 'e', { f: D, w: 800, size: s * 0.66, fill: o.eFill || col, anchor: 'middle' });
  return LAYER('brew mark', o.glow === false ? br + e : bloom(c, br + e, s * 0.08, 0.9));
}
export function wordmark(c, x, y, size, o = {}) {
  const fill = o.fill || N.ink;
  return LAYER('brew wordmark', TS(x, y, [['br'], ['e', { fill: o.e || N.green }], ['w']], { f: D, w: 800, size, fill, ls: -size * 0.03, anchor: o.anchor }));
}
// Mark + wordmark lockup, centred on cx.
export function logo(c, cx, cy, size, o = {}) {
  const ms = size * 1.0, gap = size * 0.32, ww = tw('brew', size, 800, D) - size * 0.03 * 4;
  const x0 = cx - (ms + gap + ww) / 2;
  const glow = o.glow === false ? '' : LAYER('Logo glow', fx(`<ellipse cx="${cx}" cy="${cy}" rx="${(ms + gap + ww) * 0.7}" ry="${size * 0.8}" fill="${rg(c, [[0, N.green, 0.45], [1, N.green, 0]])}"/>`, blurU(c, 20)));
  return glow + mark(c, x0 + ms / 2, cy, ms) + wordmark(c, x0 + ms + gap, cy + size * 0.34, size);
}

// ---------- line icons (stroke, 24-unit grid scaled to s) ----------
const ICONS = {
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13M15.5 15.5L20 20',
  doc: 'M6 3h8l4 4v14H6zM14 3v4h4M9 11h6M9 14.5h6M9 18h4',
  mic: 'M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6',
  edit: 'M3 6h11M3 12h18M3 18h8M17 4v4M9 10v4M14 16v4',
  eye: 'M2 12c3-5 6.5-7 10-7s7 2 10 7c-3 5-6.5 7-10 7s-7-2-10-7zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  globe: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  play: 'M8 5.5v13l10.5-6.5z',
  film: 'M3 6h13v12H3zM16 10l5-3v10l-5-3',
  phone: 'M7.5 2.5h9v19h-9zM10.5 18.5h3',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3.5v4M16 3.5v4',
  chat: 'M4 5h16v11H9l-5 4z',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5h4',
  user: 'M12 4a4 4 0 1 0 0 8a4 4 0 1 0 0-8M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6',
  plus: 'M12 5v14M5 12h14',
  arrow: 'M7 17L17 7M9 7h8v8',
  send: 'M4 12l16-8l-6 16l-2.5-6.5z',
  chev: 'M7 10l5 5l5-5',
  upload: 'M12 16V4M7 9l5-5l5 5M4 20h16',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9c-4.5-1-8-4-8-9V6z',
};
export const icon = (name, cx, cy, s, o = {}) =>
  P(ICONS[name], { stroke: o.col || N.ink, sw: (o.sw || 1.7) * 24 / s, cap: 'round', join: 'round', tr: `translate(${cx - s / 2} ${cy - s / 2}) scale(${s / 24})`, fill: o.fill });

// ---------- glass ----------
// Frosted glass panel: soft shadow, translucent body, lit top edge.
function glassRaw(c, x, y, w, h, o = {}) {
  const r = o.r ?? 18, k = o.k ?? 1;
  const body = lg(c, [[0, o.tint || '#FFFFFF', 0.13 * k], [0.55, o.tint || '#FFFFFF', 0.05 * k], [1, o.tint || '#FFFFFF', 0.03 * k]], [x, y, x + w * 0.6, y + h], true);
  const edge = lg(c, [[0, '#FFFFFF', 0.55 * k], [0.18, '#FFFFFF', 0.16 * k], [0.7, '#FFFFFF', 0.06 * k], [1, N.mint, 0.18 * k]], [0, y, 0, y + h], true);
  return (o.shadow === false ? '' : fx(R(x + 10, y + 28, w - 20, h, { r, fill: '#000', op: 0.6 }), blurU(c, 26))) +
    (o.glow ? fx(R(x, y, w, h, { r, stroke: o.glow, sw: 6 }), blurU(c, 14), 0.7) : '') +
    R(x, y, w, h, { r, fill: o.base || N.panel, op: o.baseOp ?? 0.72 }) + R(x, y, w, h, { r, fill: body }) +
    R(x + 0.5, y + 0.5, w - 1, h - 1, { r, stroke: edge, sw: 1.2 });
}
export const glass = (c, x, y, w, h, o = {}) => LAYER(o.name || 'Glass card', glassRaw(c, x, y, w, h, o));

// Glass chip with icon + label (the reference's floating "Calendar" / "Chat" chips).
export function glassChip(c, x, y, label, ic, o = {}) {
  const size = o.size || 22, wd = tw(label, size, 500) + (ic ? size * 3.4 : size * 1.6), h = size * 2.5;
  return LAYER(`Chip · ${label}`, glassRaw(c, x, y, wd, h, { r: o.r ?? 14, k: 1.3, glow: o.glow, tint: o.tint }) +
    (ic ? icon(ic, x + size * 1.35, y + h / 2, size * 1.05, { col: N.ink2 }) : '') +
    T(x + (ic ? size * 2.5 : size * 0.8), y + h / 2 + size * 0.36, label, { f: S, w: 500, size, fill: N.ink }));
}
// Pill button; solid glows green.
export function pillBtn(c, x, y, label, o = {}) {
  const size = o.size || 15, ic = o.icon, wd = tw(label, size, 600) + (ic ? size * 3 : size * 2), h = size * 2.4;
  const fill = o.solid ? lg(c, [[0, N.mint, 1], [1, N.green, 1]], [x, y, x + wd, y + h], true) : null;
  return LAYER(`Button · ${label}`, (o.solid ? fx(R(x, y + 6, wd, h, { r: h / 2, fill: N.green }), blurU(c, 12), 0.7) + R(x, y, wd, h, { r: h / 2, fill }) :
    R(x, y, wd, h, { r: h / 2, fill: '#FFFFFF', fop: 0.06, stroke: '#FFFFFF', sw: 1 }).replace('stroke="#FFFFFF"', 'stroke="#FFFFFF" stroke-opacity="0.16"')) +
    (ic ? icon(ic, x + size * 1.4, y + h / 2, size * 1.1, { col: o.solid ? N.base : N.ink2 }) : '') +
    T(x + (ic ? size * 2.4 : size), y + h / 2 + size * 0.36, label, { f: S, w: 600, size, fill: o.solid ? N.base : N.ink }));
}
// Glass sphere badge (orb) with an icon or the brew mark.
export function orb(c, cx, cy, r, o = {}) {
  const body = rg(c, [[0, N.teal, 0.55], [0.6, '#0B2A24', 0.9], [1, '#06120F', 0.95]], { user: true, cx: cx - r * 0.25, cy: cy - r * 0.35, r: r * 1.4 });
  const rim = lg(c, [[0, N.rim, 0.95], [0.5, N.mint, 0.25], [1, N.teal, 0.6]], [0, cy - r, 0, cy + r], true);
  const inner = o.mark ? mark(c, cx, cy, r * 0.95, { glow: true }) : o.icon ? bloom(c, icon(o.icon, cx, cy, r * 0.9, { col: N.rim, sw: 1.6 }), 4, 0.7) : '';
  return LAYER(o.name || 'Orb', fx(Ci(cx, cy, r * 1.25, { fill: N.green }), blurU(c, r * 0.45), o.halo ?? 0.55) +
    Ci(cx, cy, r, { fill: body }) + Ci(cx, cy, r - 0.75, { stroke: rim, sw: 1.5 }) +
    fx(`<ellipse cx="${cx - r * 0.18}" cy="${cy - r * 0.62}" rx="${r * 0.42}" ry="${r * 0.13}" fill="${N.rim}"/>`, blurU(c, Math.max(1.5, r * 0.06)), 0.16) + inner);
}
// Thin glowing rule fading at both ends, with sparkle nodes.
export function lightLine(c, x1, x2, y, o = {}) {
  const g = lg(c, [[0, N.mint, 0], [0.5, o.col || N.mint, o.op ?? 0.9], [1, N.mint, 0]], [x1, 0, x2, 0], true);
  return LAYER(o.name || 'Light line', fx(Ln(x1, y, x2, y, { stroke: g, sw: 6 }), blurU(c, 5), 0.8) + Ln(x1, y, x2, y, { stroke: g, sw: 1.5 })) +
    (o.nodes || []).map(nx => sparkle(c, nx, y, 9)).join('');
}
// Gradient headline (white → mint), with a faint bloom.
export function headline(c, x, y, s, o = {}) {
  const size = o.size || 72, w = o.w || 600, f = o.f || S;
  const g = lg(c, [[0, o.top || '#FFFFFF', 1], [1, o.bottom || N.mint, 1]], [0, 0, 0, 1]); // bounding-box units: imports into Figma
  const t = T(x, y, s, { f, w, size, fill: g, anchor: o.anchor ?? 'middle', ls: o.ls ?? -size * 0.02, op: o.op });
  return LAYER(`Text · ${s}`, o.bloom === false ? t : bloom(c, t, size * 0.12, 0.35));
}
// Huge faded wordmark behind the product (the reference's background "NeuraFlow").
export function watermark(c, cx, y, size, o = {}) {
  const g = lg(c, [[0, N.mint, o.op ?? 0.3], [0.55, N.teal, (o.op ?? 0.3) * 0.35], [1, N.teal, 0]], [0, 0, 0, 1]);
  return LAYER('Wordmark · background', T(cx, y, 'brew', { f: D, w: 800, size, fill: g, anchor: 'middle', ls: -size * 0.04 }));
}
// UI construction guides (thin lines that run off the card edges).
export const guides = (lines) => LAYER('Guide lines', lines.map(([x1, y1, x2, y2]) => Ln(x1, y1, x2, y2, { stroke: N.mint, op: 0.14 })).join(''));
export const avatar = (c, cx, cy, r, o = {}) => LAYER(o.name || 'Avatar', Ci(cx, cy, r, { fill: '#FFFFFF', op: 0.07 }) + Ci(cx, cy, r, { stroke: N.ink3, sw: 1.2 }) + icon('user', cx, cy, r * 1.1, { col: N.ink2, sw: 1.5 }));

// ---------- brew Studio, dark glass ----------
const NAV = [['New video', 'plus'], ['In production', 'edit'], ['Review', 'eye'], ['Library', 'grid'], ['Languages', 'globe'], ['AI b-roll', 'film'], ['UGC ads', 'phone']];
function sidebarRaw(c, x, y, h, active) {
  let s = Ln(x + 250, y + 20, x + 250, y + h, { stroke: '#FFFFFF', op: 0.08 }) +
    mark(c, x + 46, y + 46, 30, { glow: false }) + TS(x + 74, y + 56, [['br'], ['e', { fill: N.green }], ['w']], { f: D, w: 800, size: 26, fill: N.ink, ls: -0.8 }) +
    R(x + 20, y + 92, 210, 58, { r: 12, fill: '#FFFFFF', fop: 0.05, stroke: '#FFFFFF', sw: 1 }).replace('stroke="#FFFFFF"', 'stroke="#FFFFFF" stroke-opacity="0.1"') +
    Ci(x + 48, y + 121, 16, { fill: N.amber }) + T(x + 48, y + 126, 'SC', { f: S, w: 600, size: 12, fill: N.base, anchor: 'middle' }) +
    T(x + 74, y + 117, 'Sam Carter', { f: S, w: 600, size: 15, fill: N.ink }) + T(x + 74, y + 137, 'Creator plan', { f: S, size: 12, fill: N.ink3 }) +
    icon('chev', x + 210, y + 121, 16, { col: N.ink3 });
  NAV.forEach(([n, ic], i) => {
    const ny = y + 200 + i * 44, on = n === active;
    s += (on ? R(x + 14, ny - 27, 222, 40, { r: 10, fill: lg(c, [[0, N.green, 0.35], [1, N.green, 0.05]], [x + 14, 0, x + 236, 0], true) }) + R(x + 14, ny - 27, 222, 40, { r: 10, stroke: N.mint, sw: 1, op: 0.3 }) : '') +
      icon(ic, x + 38, ny - 7, 17, { col: on ? N.rim : N.ink3 }) + T(x + 58, ny - 1, n, { f: S, size: 15, w: on ? 600 : 400, fill: on ? N.ink : N.ink2 });
  });
  s += ML(x + 24, y + 540, 'Account', { size: 10, fill: N.ink4 }) +
    [['Minutes', 'edit'], ['Help centre', 'chat']].map(([n, ic], i) => icon(ic, x + 38, y + 576 + i * 40 - 7, 17, { col: N.ink3 }) + T(x + 58, y + 576 + i * 40 - 1, n, { f: S, size: 15, fill: N.ink2 })).join('');
  return s;
}
function gauge(c, cx, cy, r, v) {
  const arc = (a0, a1) => { const p = a => [cx + r * Math.cos(Math.PI * (1 + a)), cy + r * Math.sin(Math.PI * (1 + a))]; const [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
  const g = lg(c, [[0, N.teal, 1], [1, N.mint, 1]], [cx - r, 0, cx + r, 0], true);
  return P(arc(0, 1), { stroke: '#FFFFFF', sw: 14, cap: 'round', op: 0.08 }) + fx(P(arc(0, v), { stroke: N.green, sw: 18, cap: 'round' }), blurU(c, 10), 0.6) +
    P(arc(0, v), { stroke: g, sw: 14, cap: 'round' });
}
// The main-area screens.
function homeScreen(c, x, y, w, h, o = {}) {
  const L = (n, s) => LAYER(n, s);
  let s = L('Search bar', R(x + 32, y + 22, 420, 44, { r: 22, fill: '#FFFFFF', fop: 0.05, stroke: '#FFFFFF', sw: 1 }).replace('stroke="#FFFFFF"', 'stroke="#FFFFFF" stroke-opacity="0.1"') +
    icon('search', x + 58, y + 44, 17, { col: N.ink3 }) + T(x + 80, y + 50, 'Search your videos', { f: S, size: 15, fill: N.ink3 })) +
    L('Top bar icons', ['calendar', 'chat', 'bell'].map((ic, i) => Ci(x + w - 150 + i * 52, y + 44, 21, { fill: '#FFFFFF', op: 0.06 }) + icon(ic, x + w - 150 + i * 52, y + 44, 18, { col: N.ink2 })).join('')) +
    Ln(x, y + 92, x + w, y + 92, { stroke: '#FFFFFF', op: 0.07 }) +
    L('Text · Hello, Sam', T(x + 40, y + 168, 'Hello, Sam', { f: S, w: 600, size: 42, fill: N.ink, ls: -0.8 })) +
    L('Text · What should we make this week?', T(x + 40, y + 222, 'What should we make this week?', { f: S, w: 600, size: 42, fill: lg(c, [[0, N.mint, 1], [1, N.teal, 1]], [0, 0, 1, 0]), ls: -0.8 }));
  let bx = x + 40;
  for (const [lab, ic, solid] of [['Send a topic', 'send', true], ['Upload a script', 'upload'], ['New video', 'plus']]) {
    s += pillBtn(c, bx, y + 252, lab, { icon: ic, solid, size: 15 }); bx += tw(lab, 15, 600) + 15 * 3 + 12;
  }
  const cy = y + 330;
  if (o.screen === 'chart') {
    const cw = w - 80 - 360;
    s += glass(c, x + 40, cy, cw, 300, { name: 'Card · delivered chart', r: 18, shadow: false }) +
      L('Card · delivered chart · text', ML(x + 68, cy + 40, 'Delivered · last 12 weeks', { size: 11, fill: N.ink3 }) + T(x + 68, cy + 86, '12 videos', { f: S, w: 600, size: 32, fill: N.ink }) + T(x + 68, cy + 112, 'One every week, on schedule', { f: S, size: 14, fill: N.ink3 }));
    const bars = [0.55, 0.7, 0.6, 0.8, 0.65, 0.75, 0.9, 0.7, 0.85, 0.95, 0.8, 1];
    const bw = (cw - 300) / bars.length;
    s += L('Card · delivered chart · bars', bars.map((v, i) => R(x + 330 + i * bw, cy + 260 - v * 190, bw * 0.55, v * 190, { r: 4, fill: lg(c, [[0, N.mint, i === 11 ? 1 : 0.75], [1, N.teal, 0.08]], [0, cy + 70, 0, cy + 260], true) })).join(''));
    s += glass(c, x + w - 340, cy, 300, 300, { name: 'Card · languages', r: 18, shadow: false }) +
      L('Card · languages · ring', ML(x + w - 312, cy + 40, 'Languages', { size: 11, fill: N.ink3 }) +
        Array.from({ length: 9 }, (_, i) => { const a0 = -Math.PI / 2 + i * 2 * Math.PI / 9 + 0.05, a1 = a0 + 2 * Math.PI / 9 - 0.1, rr = 82, ccx = x + w - 190, ccy = cy + 170; return P(`M${(ccx + rr * Math.cos(a0)).toFixed(1)} ${(ccy + rr * Math.sin(a0)).toFixed(1)}A${rr} ${rr} 0 0 1 ${(ccx + rr * Math.cos(a1)).toFixed(1)} ${(ccy + rr * Math.sin(a1)).toFixed(1)}`, { stroke: i < 3 ? N.mint : N.teal, sw: 16, op: i < 3 ? 1 : 0.35 }); }).join('') +
        T(x + w - 190, cy + 182, '9', { f: S, w: 600, size: 40, fill: N.ink, anchor: 'middle' }) + T(x + w - 190, cy + 278, 'EN DE FR ES PT IT PL ID DA', { f: M, size: 11, fill: N.ink3, anchor: 'middle', ls: 0.5 }));
    return s;
  }
  const aw = w - 80 - 380;
  s += glass(c, x + 40, cy, aw, 330, { name: 'Card · in production', r: 18, shadow: false }) +
    L('Card · in production · text', T(x + 68, cy + 46, 'In production', { f: S, size: 14, fill: N.ink3 }) +
      T(x + 68, cy + 88, 'Why the Panama Canal', { f: S, w: 600, size: 28, fill: N.ink }) + T(x + 68, cy + 122, 'ran short of water', { f: S, w: 600, size: 28, fill: N.ink }) +
      T(x + 68, cy + 156, 'Visual explainer · 10 min · in your voice', { f: S, size: 15, fill: N.ink3 })) +
    L('Card · in production · arrow', Ci(x + 40 + aw - 40, cy + 40, 17, { stroke: '#FFFFFF', sw: 1, op: 0.3 }) + icon('arrow', x + 40 + aw - 40, cy + 40, 14, { col: N.ink2 }));
  let px = x + 68;
  ['Research', 'Script', 'Voice', 'Edit', 'Review'].forEach((st, i) => {
    const done = i < 3, on = i === 3, lw = tw(st, 13, 500) + (done ? 42 : 26);
    s += L(`Step · ${st}`, R(px, cy + 190, lw, 32, { r: 16, fill: on ? N.green : '#FFFFFF', fop: on ? 0.25 : 0.05, stroke: on ? N.mint : '#FFFFFF', sw: 1 }).replace('stroke="#FFFFFF"', 'stroke="#FFFFFF" stroke-opacity="0.12"') +
      (done ? icon('check', px + 18, cy + 206, 14, { col: N.mint, sw: 2.2 }) : '') + T(px + (done ? 32 : 13), cy + 211, st, { f: S, w: 500, size: 13, fill: on ? N.rim : done ? N.ink2 : N.ink3 }));
    px += lw + 8;
  });
  s += glass(c, x + 68, cy + 244, aw - 56, 62, { name: 'Card · day counter', r: 12, shadow: false, k: 0.8 }) +
    L('Card · day counter · text', T(x + 90, cy + 282, 'Day 2 of 3', { f: M, w: 500, size: 15, fill: N.mint }) + T(x + 210, cy + 282, 'Edit assembling · map, archive, lock diagram', { f: S, size: 14, fill: N.ink2 }));
  s += glass(c, x + w - 360, cy, 320, 330, { name: 'Card · review', r: 18, shadow: false }) +
    L('Card · review · text', T(x + w - 332, cy + 46, 'Human review', { f: S, w: 600, size: 18, fill: N.ink }) + T(x + w - 332, cy + 70, '15-point check, by a person', { f: S, size: 13, fill: N.ink3 })) +
    L('Card · review · gauge', gauge(c, x + w - 200, cy + 222, 100, 0.86) + icon('check', x + w - 200, cy + 196, 34, { col: N.mint, sw: 2 }) +
      T(x + w - 200, cy + 268, '13 / 15', { f: S, w: 600, size: 26, fill: N.ink, anchor: 'middle' }) + T(x + w - 300, cy + 300, '0', { f: M, size: 11, fill: N.ink4, anchor: 'middle' }) + T(x + w - 100, cy + 300, '15', { f: M, size: 11, fill: N.ink4, anchor: 'middle' }));
  return s;
}
// Full window: glass shell + sidebar + screen. Flat, straight, no perspective.
export function studio(c, x, y, w, h, o = {}) {
  const clip = clipRect(c, x, y, w, h, 24);
  const topEdge = lg(c, [[0, N.mint, 0], [0.5, N.rim, 0.9], [1, N.mint, 0]], [x, 0, x + w, 0], true);
  return LAYER('Window · shadow', fx(R(x + 30, y + 60, w - 60, h, { r: 30, fill: '#000', op: 0.75 }), blurU(c, 40))) +
    LAYER('Window · glow', fx(R(x, y, w, h, { r: 24, stroke: N.teal, sw: 10 }), blurU(c, 30), 0.5)) +
    G(null, LAYER('Window · glass', R(x, y, w, h, { fill: lg(c, [[0, '#132621', 0.96], [0.4, N.panel, 0.95], [1, '#070E0C', 0.97]], [0, y, 0, y + h], true) })) +
      LAYER(`Window · sidebar (${o.active || 'New video'})`, sidebarRaw(c, x, y, h, o.active || 'New video')) + homeScreen(c, x + 250, y, w - 250, h, o), { clip }) +
    LAYER('Window · edge', R(x + 0.75, y + 0.75, w - 1.5, h - 1.5, { r: 24, stroke: '#FFFFFF', sw: 1.2, op: 0.14 }) + Ln(x + 40, y + 0.75, x + w - 40, y + 0.75, { stroke: topEdge, sw: 1.6 }));
}

export { C, D, S, M, W, H, T, TS, R, Ln, Ci, P, G, ML, LAYER, tw, rng, clipRect, esc };
