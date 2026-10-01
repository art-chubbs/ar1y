// brew launch film v3 — "light & calm" cut (after the Numtera reference). render(t) → SVG string.
// Runs in Node (exact text metrics via the v3 kit); the renderer rasterises each SVG in Chromium.
import { C, D, S, M, W, H, T, TS, R, Ln, Ci, P, G, ML, ctx, grad, rgrad, clipRect, check, cursor, brackets } from '../../storyboard/lib.mjs';
import { L as LT, tw, blur, fx, lightBg, darkBg, line, shadowCard, lapp, lwindow, chip, btn, scrNew, projectCard, logPanel,
  msgCard, fileCard, miniTimeline, invoiceCard } from '../../storyboard/v3/kit.mjs';
import { archivePhoto, serumShot, phone, panamaMap } from '../../storyboard/art.mjs';
import { thumb } from '../../storyboard/v2/ui.mjs';

export const DURATION = 93, FPS = 60;

// ---------- timing ----------
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
const bez = (x1, y1, x2, y2) => x => {
  if (x <= 0) return 0; if (x >= 1) return 1;
  let u = x;
  for (let i = 0; i < 10; i++) {
    const fx_ = 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u * u * (1 - u) + u ** 3 - x;
    const d = 3 * x1 * (1 - u) ** 2 + 6 * (x2 - x1) * u * (1 - u) + 3 * (1 - x2) * u * u;
    if (Math.abs(d) < 1e-6) break;
    u = cl(u - fx_ / d);
  }
  return 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u * u * (1 - u) + u ** 3;
};
const E = { out: bez(.16, 1, .3, 1), inout: bez(.65, 0, .35, 1), over: bez(.34, 1.45, .64, 1), in: x => x * x * x, lin: x => cl(x) };
const A = (t, s, d, e = E.out) => e(cl((t - s) / d));
const lr = (a, b, p) => a.map((v, i) => lerp(v, b[i], p));
const at = (x, y) => `translate(${x.toFixed(2)} ${y.toFixed(2)})`;
const sAt = (cx, cy, s, sy = s) => `translate(${cx} ${cy}) scale(${Math.max(1e-4, s).toFixed(4)} ${Math.max(1e-4, sy).toFixed(4)}) translate(${-cx} ${-cy})`;
const op = (inner, p) => (p <= 0.001 ? '' : p >= 0.999 ? inner : G(null, inner, { op: p.toFixed(3) }));
const fadeUp = (inner, p, dy = 18) => (p <= 0.001 ? '' : G(at(0, (1 - p) * dy), inner, { op: p < 1 ? p.toFixed(3) : null }));
const blurIf = (c, inner, b, bo = 0) => (b > 0.4 || bo > 0.4 ? fx(inner, blur(c, b.toFixed(1), bo.toFixed(1))) : inner);
const rect = (x, y, w, h, o) => R(x.toFixed(1), y.toFixed(1), Math.max(0, w).toFixed(1), Math.max(0, h).toFixed(1), o);
const tilt = (cx, cy, k) => `translate(${cx} ${cy}) skewY(${(-3.5 * k).toFixed(3)}) skewX(${(9 * k).toFixed(3)}) scale(${(1 - 0.05 * k).toFixed(4)} ${(1 - 0.12 * k).toFixed(4)}) translate(${-cx} ${-cy})`;
const blink = t => Math.floor(t * 2.2) % 2 === 0;

// Typed text: slice a parts array to n characters.
function typed(parts, n) {
  const out = [];
  let left = Math.max(0, Math.floor(n));
  for (const [s, o] of parts) { if (left <= 0) break; out.push([s.slice(0, left), o]); left -= s.length; }
  return out.length ? out : [['', {}]];
}
const nChars = parts => parts.reduce((a, [s]) => a + s.length, 0);

// Centred one-word/phrase helpers.
const word = (x, y, s, o) => T(x, y, s, { f: S, w: 500, anchor: 'middle', ...o });

// ---------- shared pieces ----------
function mess(c, t, near = 1, far = 1) {
  const dn = (t - 2) * -16, df = (t - 2) * -6;
  const farL = fx(msgCard(c, 120, 140, 'Editor', 'can we push the deadline?', C.teal) + fileCard(c, 1380, 120, 'script_v7_notes.docx', 'Edited 2 days ago') +
    invoiceCard(c, 1560, 640) + fileCard(c, 80, 820, 'broll_maybe.zip', '2.4 GB · uploading…', { col: C.amber }), blur(c, 7));
  const nearL = miniTimeline(c, 160, 330, 520, { play: 0.3 + (t % 6) / 12 }) + msgCard(c, 1240, 330, 'Client', 'any update on the edit?', C.amber) +
    fileCard(c, 1180, 470, 'v3_FINAL_final.mp4', '1.8 GB · 3 versions') + msgCard(c, 300, 690, 'Freelancer', 'sorry, running a day late', C.coral);
  return op(G(at(df, 0), farL), 0.55 * far) + op(G(at(dn, 0), nearL), near);
}
const plate = (o = 0.85) => R(540, 500, 840, 90, { r: 12, fill: LT.paper, op: o });

const LOG = [['check', 'Topic received'], ['progress', 'Researching · 14 sources', 1], ['found', 'Verified source found', 'Panama Canal Authority · 2023'],
  ['check', 'Script v1 · 6 beats · your voice'], ['check', 'Voice recorded · 00:54'], ['done', 'Edit assembled · ready for review'], ['ghost']];
const LOG_Y = [0, 66, 152, 256, 322, 388, 454];

function libraryWindow(c, t, drop) {
  let s = ML(500, 230, 'Library · 11 delivered', { size: 11, fill: C.green });
  const kinds = ['map', 'archive', 'paper', 'cartoon', 'archive', 'meme'];
  const names = ['Why the Panama Canal Ran Short of Water', 'The 1919 Boston Molasses Tank', 'Why You Still Get Goosebumps', 'Why Your Diet Starts on Monday', 'The 1904 Olympic Marathon', 'Switzerland in meme format'];
  for (let i = 0; i < 6; i++) {
    const x = 500 + (i % 3) * 390, y = 260 + Math.floor(i / 3) * 330;
    const card = (i === 0 ? R(x - 6, y - 6, 362, 300, { r: 14, stroke: C.green, sw: 2 }) : '') + thumb(c, x, y, 350, 197, kinds[i]) +
      T(x, y + 230, names[i], { f: S, w: 600, size: 15, fill: LT.ink }) + (i === 0 ? chip(x, y + 248, 'Delivered · Day 3', C.green) : T(x, y + 256, 'Delivered', { f: S, size: 13, fill: LT.ink3 }));
    s += i === 0 ? G(at(0, (1 - drop) * -70), card, { op: cl(drop * 1.5).toFixed(3) }) : card;
  }
  let side = R(220, 200, 250, 780, { fill: '#F8F8F6' }) + Ln(470, 200, 470, 980, { stroke: LT.line }) + TS(288, 248, [['br'], ['e', { fill: C.green }], ['w']], { f: D, w: 800, size: 24, fill: LT.ink, ls: -0.8 });
  ['New video', 'In production', 'Review', 'Library', 'Languages', 'AI b-roll', 'UGC ads'].forEach((n, i) => {
    const y = 340 + i * 40, on = n === 'Library';
    side += (on ? R(232, y - 24, 226, 34, { r: 8, fill: C.green, fop: 0.12 }) : '') + Ci(250, y - 7, 4, { fill: on ? C.green : LT.line2 }) + T(264, y, n, { f: S, size: 15, w: on ? 600 : 400, fill: on ? LT.ink : LT.ink2 });
  });
  return lwindow(c, 220, 160, 1480, 820, side + s);
}

// ---------- scenes ----------
const SC = [];
const scene = (s, e, f) => SC.push({ s, e, f });

// 1–4 · the problem
const P1 = [['The same video, a different editor.']];
scene(0, 6.3, (t, c) => {
  let out = lightBg(c, { g: 0.25 + 0.05 * A(t, 2, 1), t: 0.15 + 0.05 * A(t, 2, 1) });
  out += op(mess(c, t), A(t, 2.05, 0.8)) + op(plate(), A(t, 2.1, 0.5));
  const n = t < 2 ? 14 * A(t, 0.3, 1.2, E.lin) : 14 + 21 * A(t, 2.2, 1.5, E.lin);
  const size = t < 2 ? 64 : lerp(64, 54, A(t, 2.0, 0.4, E.inout));
  out += line(W / 2, 562, typed(P1, n), { size, caret: n < 35 || blink(t) });
  // selection highlight sweeps over "a different editor"
  const hp = A(t, 4.7, 0.35);
  if (hp > 0) {
    const x0 = W / 2 - tw(P1[0][0], 54, 500) / 2, xs = x0 + tw('The same video, ', 54, 500), ws = tw('a different editor', 54, 500);
    const clipId = clipRect(c, xs - 4, 562 - 54 * 0.86, (ws + 8) * hp, 54 * 1.12, 6);
    out += rect(xs - 4, 562 - 54 * 0.86, (ws + 8) * hp, 54 * 1.12, { r: 6, fill: C.green }) +
      G(null, T(xs.toFixed(1), 562, 'a different editor', { f: S, w: 500, size: 54, fill: '#FFFFFF' }), { clip: clipId });
  }
  return out;
});
scene(6.3, 8.2, (t, c) => {
  const g = A(t, 6.3, 0.6, E.in);
  return lightBg(c, { g: 0.3, t: 0.2 }) + mess(c, t, 0, 1) + op(G(`translate(${-140 * g} ${520 * g}) rotate(${-8 * g} 960 540)`, mess(c, t, 1, 0)), 1 - g) +
    line(W / 2, 562, typed([['Same brief… again?']], 18 * A(t, 6.45, 1.0, E.lin)), { size: 64, caret: true });
});
// 5 · Stop (crash zoom with motion blur)
scene(8.2, 9.4, (t, c) => {
  const p = A(t, 8.2, 0.35), b = 26 * (1 - p), s = lerp(0.7, 1.0, p) * lerp(1, 0.28, A(t, 9.15, 0.25, E.inout));
  const y = lerp(640, 562, A(t, 9.15, 0.25, E.inout)), x = lerp(W / 2, W / 2 - tw('Stop assembling videos.', 72, 500) / 2 + tw('Stop', 72, 500) / 2, A(t, 9.15, 0.25, E.inout));
  return lightBg(c, { g: 0.45, t: 0.35 }) + G(sAt(x, y - 120, s), blurIf(c, word(x, y, 'Stop', { size: 380, w: 600, fill: LT.ink, ls: -11 }), b, b * 0.15));
});
// 6 · Stop assembling videos.
scene(9.4, 11, (t, c) => {
  const y = 562, size = 72, x0 = W / 2 - tw('Stop assembling videos.', size, 500) / 2;
  const words = [['Stop ', 0], ['assembling ', 9.45], ['videos.', 9.6]];
  let x = x0, out = lightBg(c, { g: lerp(0.45, 0.9, A(t, 10.6, 0.5, E.inout)), t: lerp(0.35, 0.7, A(t, 10.6, 0.5, E.inout)), at: [1500, lerp(1150, 1080, A(t, 10.6, 0.5))] });
  for (const [w, s0] of words) {
    const p = s0 ? A(t, s0, 0.5) : 1;
    out += op(blurIf(c, T(x.toFixed(1), y, w.trim(), { f: S, w: 500, size, fill: LT.ink }), 18 * (1 - p)), cl(p * 1.4));
    x += tw(w, size, 500);
  }
  const arc = A(t, 9.5, 1.2, E.inout);
  out += P('M 260 900 C 700 500, 1200 380, 1760 300', { stroke: C.green, sw: 2, op: 0.4, dash: `${1700 * arc} 2000` });
  return op(out, 1 - A(t, 10.75, 0.25)) + (t > 10.75 ? op(lightBg(c, { g: 0.9, t: 0.7, at: [1500, 1080] }), A(t, 10.75, 0.25)) : '');
});
// 7–9 · Meet [mark] brew, positioning
const BG_MEET = c => lightBg(c, { g: 0.9, t: 0.7, at: [1500, 1080] });
scene(11, 14.3, (t, c) => {
  let out = BG_MEET(c);
  const shrink = A(t, 12.3, 0.45, E.inout);
  const s = lerp(300, 120, shrink);
  const finalTotal = tw('Meet', 120, 500) + 40 + 150 + 40 + tw('brew', 120, 700, D);
  const x0 = lerp(W / 2 - tw('Meet', 300, 500) / 2, W / 2 - finalTotal / 2, shrink), y = lerp(690, 600, shrink);
  const meW = tw('Me', s, 500);
  out += blurIf(c, T(x0.toFixed(1), y, 'Me', { f: S, w: 500, size: s.toFixed(1), fill: LT.ink, ls: -s * 0.03 }), 10 * (1 - A(t, 11.0, 0.45)));
  out += blurIf(c, T((x0 + meW - s * 0.06).toFixed(1), y, 'et', { f: S, w: 500, size: s.toFixed(1), fill: shrink > 0.5 ? LT.ink : C.green, ls: -s * 0.03 }), 10 * (1 - A(t, 11.35, 0.55)));
  if (t > 12.5) {
    const bx = W / 2 - finalTotal / 2 + tw('Meet', 120, 500) + 40, mp = A(t, 12.6, 0.4);
    const mx = lerp(bx + 260, bx, mp), bs = A(t, 12.75, 0.35, E.over);
    out += blurIf(c, rect(mx, 482, 150, 150, { r: 30, fill: LT.white }) +
      brackets(mx + 22 + (1 - bs) * 18, 504 + (1 - bs) * 18, 106 - (1 - bs) * 36, 106 - (1 - bs) * 36, { len: 24, sw: 7 }) +
      T(mx + 75, 588, 'e', { f: D, w: 800, size: 96, fill: C.green, anchor: 'middle' }), 16 * (1 - mp), 0);
    const letters = ['b', 'r', 'e', 'w'];
    let lx = bx + 190;
    letters.forEach((ch, i) => {
      if (t > 13.0 + i * 0.1) out += T(lx.toFixed(1), 600, ch, { f: D, w: 800, size: 120, fill: ch === 'e' ? C.green : LT.ink });
      lx += tw(ch, 120, 800, D) - 4;
    });
  }
  return out;
});
scene(14.3, 17.3, (t, c) => {
  const p1 = A(t, 14.35, 0.5), p2 = A(t, 14.85, 0.6);
  return BG_MEET(c) + G(at(0, (1 - p1) * 14), line(W / 2, 560, [['The AI-powered video studio, ', { op: p1 }], ['watched by people.', { fill: C.green, op: p2 }]], { size: 56 }));
});
// 10 · reveal in perspective
scene(17.3, 20.3, (t, c) => {
  const p = A(t, 17.3, 2.4, E.inout);
  const k = lerp(1.9, 1.1, p), y = lerp(420, 0, p), s = lerp(0.82, 1, p);
  return lightBg(c, { g: lerp(0.9, 1, p), t: lerp(0.7, 0.8, p), at: [1300, 1120] }) +
    op(G(`${at(0, y)} ${sAt(960, 600, s)}`, G(tilt(960, 600, k), lapp(c, 300, 230, 1320, 760, 'New video', (c2, x, yy, w, h) => scrNew(c2, x, yy, w, h, { typed: '', caret: false })))), A(t, 17.3, 0.6)) +
    fadeUp(T(1840, 140, 'For channels that', { f: S, w: 500, size: 40, fill: C.green, anchor: 'end' }) + T(1840, 190, 'post every week', { f: S, w: 500, size: 40, fill: C.green, anchor: 'end' }), A(t, 18.4, 0.7));
});
// 11–12 · one line in → the card isolates
const TOPIC = 'Why the Panama Canal ran short of water';
scene(20.3, 25, (t, c) => {
  const flat = A(t, 20.3, 0.6, E.inout);
  const push = lerp(1, 1.04, A(t, 20.3, 3, E.lin));
  const n = Math.round(TOPIC.length * A(t, 20.75, 1.7, E.lin));
  const appSvg = lapp(c, 160, 110, 1600, 860, 'New video', (c2, x, y, w, h) => scrNew(c2, x, y, w, h, { typed: TOPIC.slice(0, n), caret: n < TOPIC.length || blink(t) }));
  const defocus = A(t, 23.3, 0.7, E.inout);
  let out = lightBg(c, { g: 0.7, t: 0.5 });
  out += op(blurIf(c, G(sAt(960, 540, push), G(tilt(960, 540, lerp(1.1, 0, flat)), appSvg)), 16 * defocus), lerp(1, 0.55, defocus));
  // cursor and click on "Send to brew"
  const cp = A(t, 22.45, 0.5, E.inout), click = Math.sin(Math.PI * cl((t - 23.0) / 0.16));
  if (t > 22.3 && t < 23.4) out += op(cursor(lerp(1500, 1630, cp), lerp(820, 590, cp), 1.6 * (1 - 0.08 * click)), A(t, 22.3, 0.15));
  const ring = cl((t - 23.0) / 0.5);
  if (ring > 0 && ring < 1) out += Ci(1615, 575, lerp(20, 90, E.out(ring)), { stroke: C.green, sw: 2, op: (1 - ring).toFixed(2) });
  // project card lifts out from the button
  const lift = A(t, 23.3, 0.75, E.inout);
  if (lift > 0) out += G(`translate(${lerp(1615, 960, lift).toFixed(1)} ${lerp(575, 520, lift).toFixed(1)}) scale(${lerp(0.3, 1.45, lift).toFixed(3)}) translate(-380 -68)`, projectCard(c, 0, 0, 760, { active: 0 }), { op: cl(lift * 2).toFixed(3) });
  return out;
});
// 13 · HERO: production panel (split screen)
scene(25, 31.5, (t, c) => {
  const wipe = A(t, 25, 0.55, E.inout), move = A(t, 25, 0.6, E.inout);
  const shown = LOG.filter((_, i) => t > 25.8 + i * 0.8).length;
  const rows = LOG.slice(0, shown).map((r, i) => r[0] === 'progress' ? ['progress', r[1], A(t, 25.8 + i * 0.8, 0.7, E.inout)] : r);
  const active = Math.min(4, Math.max(0, shown - 1));
  const back = A(t, 31.15, 0.35, E.inout);
  let out = lightBg(c, { g: 0.35, t: 0.25, at: [500, 1150] });
  out += G(`translate(${lerp(960, 500, move)} ${lerp(520, 538, move)}) scale(${lerp(1.45, 1, move)}) translate(-380 -68)`, projectCard(c, 0, 0, 760, { active }));
  const px = lerp(W, 1000, wipe);
  out += rect(px, 0, W - px, H, { fill: C.bg }) + G(at(px - 1000, 0),
    `<ellipse cx="1900" cy="1080" rx="620" ry="420" fill="${rgrad(c, [[0, C.green, 0.35], [1, C.green, 0]], { r: 0.5 })}"/>` +
    rows.map((r, i) => fadeUp(logPanel(c, 1080, 150 + LOG_Y[i], 740, [r]), A(t, 25.8 + i * 0.8, 0.35), 14)).join(''));
  const ar = A(t, 25.6, 0.4, E.inout);
  if (ar > 0) out += Ln(880, 538, lerp(880, 1040, ar), 538, { stroke: C.green, sw: 2 }) + (ar > 0.95 ? `<polygon points="1040,530 1056,538 1040,546" fill="${C.green}"/>` : '');
  if (back > 0) out += rect(0, 0, W * back, H, { fill: LT.paper });
  return out;
});
// 14–17 · a person reviews it { frame by frame } → bar → review card → complete
const PH1 = [['A person reviews it  '], ['{ frame by frame }', { fill: C.green }]];
scene(31.5, 40.5, (t, c) => {
  let out = lightBg(c, { g: lerp(0.2, 0.35, A(t, 35, 0.5)), t: lerp(0.15, 0.3, A(t, 35, 0.5)), at: [lerp(1500, 1700, A(t, 35, 0.5)), lerp(1150, 200, A(t, 35, 0.8))] });
  const size = 60, full = nChars(PH1), x0 = W / 2 - tw(PH1.map(p => p[0]).join(''), size, 500) / 2;
  const phraseX = x0 + tw(PH1[0][0], size, 500), phraseW = tw(PH1[1][0], size, 500);
  if (t < 33.6) {
    const p1 = A(t, 31.55, 0.5);
    const n = PH1[0][0].length + Math.round(PH1[1][0].length * A(t, 32.1, 1.1, E.lin));
    out += op(line(W / 2, 560, typed(PH1, n), { size, caret: n < full }), p1);
    return out;
  }
  // phrase bounds morph into a full-width bar
  const m = A(t, 33.5, 0.5, E.inout);
  const bar = [110, 470, 1700, 120], ph = [phraseX - 10, 560 - size * 0.86, phraseW + 20, size * 1.12];
  const hdr = A(t, 35, 0.55, E.inout);
  const card = [660, 250, 600, 580];
  const collapse = A(t, 38.5, 0.45, E.inout);
  const cardH = lerp(lerp(46, 580, A(t, 35.4, 0.6, E.inout)), 200, collapse);
  const cardY = lerp(250, 420, collapse);
  const r = t < 35 ? lr(ph, bar, m) : lr(bar, [660, cardY, 600, 46], hdr);
  if (t < 35) {
    out += op(T(x0.toFixed(1), 560, PH1[0][0].trimEnd(), { f: S, w: 500, size, fill: LT.ink }), 1 - m);
    out += rect(...r, { r: 10, fill: C.green });
    out += op(T(160, 545, 'reviewing…', { f: M, w: 500, size: 44, fill: '#FFF' }) + R(160, 566, 1600, 6, { r: 3, fill: '#FFFFFF', op: 0.35 }) + rect(160, 566, 1600 * 0.3 * A(t, 34.0, 1, E.lin), 6, { r: 3, fill: '#FFF' }), A(t, 33.85, 0.25));
    out += op(T(phraseX, 560, PH1[1][0], { f: S, w: 500, size, fill: '#FFF' }), 1 - A(t, 33.5, 0.2));
    return out;
  }
  // review card: header is the bar, body grows; scan line sweeps; log ticks; then collapses to "complete"
  const body = shadowCard(c, 660, cardY, 600, cardH, { r: 14 });
  const scanY = 316 + ((t - 35.6) % 1.4) / 1.4 * 300;
  const count = Math.min(15, Math.floor(A(t, 35.8, 2.4, E.lin) * 15));
  let inner = '';
  if (collapse < 1) inner += op(R(684, 316, 552, 300, { r: 8, fill: '#E9E1CE' }) + archivePhoto(c, 860, 326, 200, 280) +
      (t > 35.6 ? rect(684, scanY, 552, 3, { fill: C.teal }) + `<rect x="684" y="${(scanY - 30).toFixed(1)}" width="552" height="30" fill="${grad(c, [[0, C.teal, 0], [1, C.teal, 0.35]])}"/>` : '') +
      ['Named people match the narration', 'Places dated and sourced', 'Numbers legible on pause', 'Watched start to finish'].map((s, i) =>
        fadeUp(check(700, 656 + i * 40, 9) + T(720, 662 + i * 40, s, { f: M, size: 15, fill: LT.ink2 }), A(t, 36.2 + i * 0.45, 0.3), 8)).join(''), (1 - collapse) * A(t, 35.6, 0.4));
  if (collapse > 0) inner += op(check(708, 520, 16) + T(740, 528, 'Approved for delivery', { f: S, w: 600, size: 24, fill: LT.ink }) +
      Ci(712, 580, 16, { fill: C.amber }) + T(712, 585, 'MK', { f: S, w: 600, size: 11, fill: '#FFF', anchor: 'middle' }) + T(740, 586, 'Watched by Maya K. · all 54 seconds', { f: S, size: 16, fill: LT.ink3 }), A(t, 38.75, 0.35));
  out += body + G(null, inner, { clip: clipRect(c, 660, cardY, 600, cardH, 14) }) +
    rect(...r, { r: 14, fill: C.green }) + rect(r[0], r[1] + 30, r[2], 16, { fill: C.green }) +
    T(684, cardY + 30, collapse > 0.5 ? 'Review complete' : `reviewing…   ${String(count).padStart(2, '0')} / 15`, { f: M, w: 500, size: 15, fill: '#FFF' });
  return out;
});
// 18–19 · it turns your idea into [ A finished file ] → fly through the brackets
scene(40.5, 44, (t, c) => {
  const through = A(t, 43.35, 0.65, E.in);
  const p1 = A(t, 40.6, 0.6), up = A(t, 41.5, 0.5, E.inout), p2 = A(t, 41.7, 0.5), br = A(t, 42.1, 0.45, E.over);
  const inner = G(at(0, lerp(0, -60, up)), op(blurIf(c, line(W / 2, 560, [['it turns your idea into']], { size: 52, ink: C.t2 }), 12 * (1 - p1)), p1)) +
    op(line(W / 2, 640, [['A finished file', { fill: C.green }]], { size: 72, w: 600 }), p2) +
    (br > 0 ? brackets(W / 2 - 420 - (1 - br) * 60, 530 - (1 - br) * 40, 840 + (1 - br) * 120, 170 + (1 - br) * 80, { len: 46, sw: 7, op: cl(br * 2).toFixed(2) }) : '');
  return darkBg(c, { lx: 120 + t * 8, ly: 980 - t * 4 }) + G(sAt(W / 2, 615, lerp(1, 9, through)), inner, { op: (1 - through).toFixed(3) }) +
    (through > 0.6 ? op(lightBg(c, { g: 0.8, t: 0.6, at: [1600, 1120] }), (through - 0.6) / 0.4) : '');
});
// 20 · delivered in the Library
scene(44, 47.5, (t, c) => {
  const s = lerp(1.25, 1, A(t, 44, 0.9, E.out)), glide = lerp(-30, 30, A(t, 44, 3.5, E.lin));
  const cp = A(t, 45.6, 0.7, E.inout);
  return lightBg(c, { g: 0.8, t: 0.6, at: [1600, 1120] }) +
    G(`${at(glide, 0)} ${sAt(960, 560, s)}`, G(tilt(960, 560, 0.5), libraryWindow(c, t, A(t, 44.6, 0.6, E.over)))) +
    op(cursor(lerp(1200, 860, cp) + glide, lerp(760, 420, cp), 1.5), A(t, 45.5, 0.2));
});
// 21 · Delivered.
scene(47.5, 49, (t, c) => {
  const p = A(t, 47.5, 0.5);
  return lightBg(c, { g: 0.9, t: 0.7, at: [1500, 1080] }) + G(sAt(W / 2, 540, lerp(1.08, 1, p)), blurIf(c, word(W / 2, 600, 'Delivered.', { size: 200, fill: LT.ink, ls: -6 }), 14 * (1 - p)));
});
// 22 · And (whip)
scene(49, 50.3, (t, c) => {
  const pin = A(t, 49, 0.25), pout = A(t, 50.05, 0.25, E.in);
  const x = lerp(1500, 760, pin) - 700 * pout, b = 40 * (1 - pin) + 50 * pout;
  return darkBg(c, { lx: 1700, ly: 1000, rx: 200, ry: 80 }) + blurIf(c, word(x, 680, 'And', { size: 360, w: 600, fill: C.text, ls: -11 }), b, b * 0.06);
});
// 23 · you can type it yourself
scene(50.3, 53.8, (t, c) => {
  const p1 = A(t, 50.4, 0.6), p2 = A(t, 51.0, 0.9);
  return darkBg(c, { lx: 1700, ly: 1000, rx: 200, ry: 80 }) + op(line(W / 2, 500, [['when you need one exact shot']], { size: 44, ink: C.t3 }), p1) +
    G(`${sAt(W / 2, 580, lerp(1.25, 1, p2), 1)}`, line(W / 2, 600, [['you can '], ['type', { fill: C.teal }], [' it yourself']], { size: 56, ink: C.text }), { op: p2.toFixed(3) }) +
    (t > 53.5 ? op(R(0, 0, W, H, { fill: '#FFFFFF' }), A(t, 53.5, 0.3)) : '');
});
// 24 · glass menu → AI b-roll
const MENU = ['New video', 'Library', 'Languages', 'AI b-roll', 'UGC ads'];
scene(53.8, 56, (t, c) => {
  const unfold = A(t, 53.9, 0.45, E.out), zoom = A(t, 55.7, 0.3, E.in);
  const cp = A(t, 54.7, 0.55, E.inout), hover = A(t, 55.2, 0.2);
  let menu = shadowCard(c, 760, 300, 400, 440, { r: 16, fill: '#FFFFFF', op: 0.92 }) +
    brackets(784, 324, 28, 28, { len: 8, sw: 3 }) + T(798, 345, 'e', { f: D, w: 800, size: 18, fill: C.green, anchor: 'middle' }) + T(828, 347, 'brew', { f: D, w: 800, size: 20, fill: LT.ink }) +
    ML(784, 400, 'Workspace', { size: 10, fill: LT.ink3 });
  MENU.forEach((n, i) => {
    menu += op((i === 3 && hover > 0 ? op(R(772, 418 + i * 56, 376, 44, { r: 8, fill: C.teal, fop: 0.14 }), hover) : '') + T(800, 448 + i * 56, n, { f: S, size: 18, w: i === 3 && hover > 0.5 ? 600 : 400, fill: LT.ink }), A(t, 54.1 + i * 0.05, 0.3));
  });
  return lightBg(c, { g: 0.5, t: 1, at: [1500, 1100] }) + op(R(0, 0, W, H, { fill: '#FFFFFF' }), 1 - A(t, 53.8, 0.25)) +
    G(sAt(960, 590, lerp(1, 2.2, zoom)), G(sAt(960, 300, 1, unfold), menu), { op: (1 - zoom).toFixed(3) }) +
    op(cursor(lerp(1260, 1020, cp), lerp(820, 590, cp), 1.5), A(t, 54.6, 0.2) * (1 - zoom));
});
// 25 · macro: filling the shot
const SHOT = 'Our serum bottle, in a hand, on wet marble';
scene(56, 59.5, (t, c) => {
  const track = lerp(160, -40, A(t, 56, 3.5, E.inout)), n = Math.round(SHOT.length * A(t, 56.35, 2.3, E.lin)), txt = SHOT.slice(0, n);
  const len = A(t, 58.9, 0.3);
  return lightBg(c, { g: 0.4, t: 1, at: [1500, 1100] }) + G(at(0, track),
    T(220, 330, 'Describe the shot', { f: S, w: 500, size: 50, fill: LT.ink }) + R(200, 370, 1720, 130, { r: 26, fill: '#FFFFFF', op: 0.75 }) +
    T(250, 455, txt, { f: S, size: 58, fill: LT.ink }) + (n < SHOT.length || blink(t) ? rect(250 + tw(txt, 58, 400) + 8, 405, 4, 64, { fill: C.teal }) : '') +
    blurIf(c, T(220, 640, 'Length', { f: S, w: 500, size: 50, fill: LT.ink, op: 0.8 }) + R(200, 680, 600, 130, { r: 26, fill: '#FFFFFF', op: 0.6 }) +
      T(250, 765, len > 0.5 ? '10 s' : '', { f: S, size: 58, fill: LT.ink }), 6 * (1 - A(t, 58.4, 0.6))));
});
// 26 · four takes, keep one
scene(59.5, 63, (t, c) => {
  const pin = A(t, 59.5, 0.45);
  const cp = A(t, 61.3, 0.5, E.inout), click = Math.sin(Math.PI * cl((t - 61.85) / 0.16)), chosen = A(t, 61.2, 0.3);
  let takes = '';
  [0, 1, 2, 3].forEach(i => {
    const x = 400 + (i % 2) * 570, y = 230 + Math.floor(i / 2) * 340, p = A(t, 59.8 + i * 0.12, 0.6);
    const lift = i === 1 ? A(t, 61.95, 0.4, E.over) : 0;
    takes += G(sAt(x + 275, y + 155, 1 + 0.03 * lift), op(blurIf(c, serumShot(c, x, y, 550, 310, { r: 12 }), 20 * (1 - p)), cl(p * 1.5)) +
      (i === 1 && chosen > 0 ? op(R(x - 4, y - 4, 558, 318, { r: 14, stroke: C.teal, sw: 4 }) + G(at(0, 2 * click), btn(x + 530, y + 254, 'Keep', { anchor: 'end', col: C.teal })), chosen) : ''));
  });
  return lightBg(c, { g: 0.4, t: 0.9, at: [1500, 1100] }) + G(sAt(960, 540, lerp(0.95, 1, pin)),
    shadowCard(c, 360, 150, 1200, 780, { r: 18, fill: '#FFFFFF', op: 0.9 }) + ML(400, 200, 'AI b-roll · 4 takes', { size: 11, fill: C.teal }) +
    T(1520, 200, `CREDITS ${t > 61.9 ? 228 : 240}`, { f: M, size: 12, fill: LT.ink3, anchor: 'end', ls: 2 }) + takes, { op: pin.toFixed(3) }) +
    op(cursor(lerp(1250, 1460, cp), lerp(900, 520, cp), 1.5 * (1 - 0.08 * click)), A(t, 61.2, 0.2));
});
// 27 · UGC ad, step by step
const STEPS = [['Hook', 'I was so wrong about serums'], ['Demo', '30 seconds, morning light'], ['Payoff', 'okay this actually worked']];
scene(63, 68.5, (t, c) => {
  const flip = A(t, 63, 0.45, E.over);
  const cur = STEPS.reduce((a, _, i) => (t > 64.0 + i * 1.5 ? i : a), 0);
  let out = lightBg(c, { g: 0.3, t: 0.3, at: [300, 1100] }) +
    G(sAt(460, 515, Math.max(0.01, flip), 1), phone(c, 260, 160, 400, 711, { label: ['Hook 01', 'Demo 01', 'Payoff'][cur], caption: STEPS[cur][1], prop: true, prog: ((t - 63) * 0.18) % 1 }));
  const ln = A(t, 63.6, 4, E.inout);
  out += rect(819, 330, 2, 430 * ln, { fill: LT.line2 });
  STEPS.forEach(([k, v], i) => {
    const y = 300 + i * 200, p = A(t, 64.0 + i * 1.5, 0.5, E.over);
    if (p <= 0) return;
    out += G(at(0, (1 - p) * -30), Ci(820, y + 40, 22, { fill: LT.white, stroke: i === cur ? C.coral : LT.line2, sw: i === cur ? 2 : 1 }) + T(820, y + 47, String(i + 1), { f: M, w: 500, size: 18, fill: LT.ink, anchor: 'middle' }) +
      shadowCard(c, 880, y, 900, 84, { r: 14, op: 0.95 }) + chip(910, y + 28, k, C.coral, { solid: true }) + T(1010, y + 50, `— ${v}`, { f: S, size: 22, fill: LT.ink2 }), { op: cl(p * 2).toFixed(3) });
  });
  return out;
});
// 28 · one edit, nine voices
const LANGS = ['English', 'German', 'French', 'Spanish', 'Portuguese', 'Italian', 'Polish', 'Indonesian', 'Danish'];
scene(68.5, 72.5, (t, c) => {
  const pin = A(t, 68.5, 0.5), sel = Math.min(3, Math.floor(Math.max(0, t - 68.8) / 0.9));
  const glide = A(t, 69, 0.3);
  let out = lightBg(c, { g: 0.6, t: 0.4 }) + G(sAt(960, 500, lerp(0.96, 1, pin)),
    shadowCard(c, 260, 220, 960, 560, { r: 16 }) + panamaMap(c, 280, 240, 920, 518, { r: 10 }) +
    R(296, 256, 66, 34, { r: 5, fill: C.green }) + T(329, 279, ['EN', 'DE', 'FR', 'ES'][sel], { f: M, w: 500, size: 16, fill: '#FFF', anchor: 'middle' }) +
    shadowCard(c, 1280, 220, 380, 560, { r: 16 }) +
    rect(1292, 236 + sel * 58, 356, 46, { r: 8, fill: C.green, fop: 0.14 }) +
    LANGS.map((l, i) => T(1316, 266 + i * 58, l, { f: S, size: 18, w: i === sel ? 600 : 400, fill: LT.ink }) + (i < sel || (i === sel && glide > 0.5) ? check(1628, 260 + i * 58, 9) : '')).join(''), { op: pin.toFixed(3) });
  // waveform reshapes per language; the picture never moves
  let wv = '';
  for (let i = 0; i < 80; i++) {
    const v = Math.abs(Math.sin(i * 0.37 + sel * 1.9) * Math.cos(i * 0.11 + sel)) * 0.8 + 0.15 + 0.1 * Math.sin(t * 9 + i);
    wv += R((280 + i * 11.5).toFixed(1), (800 - v * 18).toFixed(1), 6, (v * 36).toFixed(1), { r: 3, fill: C.green });
  }
  out += op(wv, pin) + fadeUp(R(560, 860, 800, 64, { r: 32, fill: LT.white, stroke: C.green }) + line(960, 903, [['Upload it nine times, not once.']], { size: 24, w: 600 }), A(t, 69.6, 0.5));
  return out;
});
// 29–31 · the channel keeps posting · others hand you a tool · we hand you the video
scene(72.5, 75, (t, c) => {
  const p = A(t, 72.6, 1.2, E.inout);
  return lightBg(c, { g: 1, t: 0.9, at: [960, 900] }) + G(sAt(W / 2, 545, lerp(1.18, 1, p), 1), line(W / 2, 560, [['The channel keeps posting. '], ['Every week.', { fill: C.green }]], { size: 56 }), { op: cl(p * 1.6).toFixed(3) });
});
scene(75, 79.5, (t, c) => {
  const P2 = [['Others hand you a '], ['tool.']];
  const n = Math.round(23 * A(t, 75.1, 1.1, E.lin));
  const toolBlur = 4 * A(t, 76.3, 0.4);
  const swap = A(t, 77, 0.45, E.inout);
  let out = lightBg(c, { g: lerp(0.35, 0.9, swap), t: lerp(0.3, 0.7, swap), at: [1500, lerp(1150, 1080, swap)] });
  if (swap < 1) {
    const x0 = W / 2 - tw('Others hand you a tool.', 72, 500) / 2;
    const first = typed(P2, n);
    let inner = T(x0.toFixed(1), 560, first[0][0], { f: S, w: 500, size: 72, fill: LT.ink });
    if (first[1]) inner += blurIf(c, T((x0 + tw('Others hand you a ', 72, 500)).toFixed(1), 560, first[1][0], { f: S, w: 500, size: 72, fill: LT.ink }), toolBlur);
    if (n < 23 || blink(t)) inner += rect(x0 + tw(first.map(p => p[0]).join(''), 72, 500) + 6, 500, 3.5, 70, { fill: LT.ink });
    out += G(at(0, -6 * swap), inner, { op: (1 - swap).toFixed(3) });
  }
  if (swap > 0) out += G(at(0, 6 * (1 - swap)), line(W / 2, 560, [['We hand you the video.', { fill: C.green }]], { size: 72 }), { op: swap.toFixed(3) });
  return out;
});
// 32 · logo
scene(79.5, 82.5, (t, c) => {
  const mk = A(t, 79.6, 0.45, E.over);
  let out = lightBg(c, { g: 0.7, t: 0.6, at: [1500, 1100] }) +
    G(sAt(765, 525, Math.max(0.01, mk)), R(690, 450, 150, 150, { r: 30, fill: LT.white }) + brackets(712, 472, 106, 106, { len: 24, sw: 7 }) + T(765, 564, 'e', { f: D, w: 800, size: 96, fill: C.green, anchor: 'middle' }), { op: cl(mk * 2).toFixed(3) });
  let lx = 870;
  ['b', 'r', 'e', 'w'].forEach((ch, i) => {
    const p = A(t, 80.0 + i * 0.12, 0.3);
    if (p > 0) out += fadeUp(T(lx.toFixed(1), 576, ch, { f: D, w: 800, size: 140, fill: ch === 'e' ? C.green : LT.ink }), p, 14);
    lx += tw(ch, 140, 800, D) - 5;
  });
  return out + (t > 82.2 ? op(R(0, 0, W, H, { fill: C.bg }), A(t, 82.2, 0.3)) : '');
});
// 33 · tagline on black (typed)
scene(82.5, 87.5, (t, c) => {
  const TG = 'Every frame watched by a person.', n = Math.round(TG.length * A(t, 82.9, 2.6, E.lin));
  return darkBg(c, { lx: 120 + Math.sin(t * 0.4) * 160, ly: 980 + Math.cos(t * 0.3) * 60, rx: 1840 - Math.sin(t * 0.35) * 160, ry: 60 }) +
    line(W / 2, 560, [[TG.slice(0, n)]], { size: 52, ink: C.text, caret: n < TG.length || blink(t), caretCol: C.green });
});
// 34 · CTA
scene(87.5, 93.01, (t, c) => {
  const URL = 'scalewithbrew.com', n = Math.round(URL.length * A(t, 88.5, 1.0, E.lin));
  const bw = tw('Send us a script  →', 30, 600);
  return darkBg(c, { lx: 1840, ly: 0, rx: 80, ry: 1080 }) +
    fadeUp(line(W / 2, 520, [['Your first video is free.']], { size: 64, ink: C.text, w: 600 }), A(t, 87.6, 0.6)) +
    G(sAt(W / 2, 616, Math.max(0.01, A(t, 88.1, 0.45, E.over))), btn(W / 2 - bw / 2 - 18, 590, 'Send us a script  →', { size: 30 })) +
    T(W / 2, 760, URL.slice(0, n), { f: M, size: 20, fill: C.t2, anchor: 'middle', ls: 1 });
});

export function render(t) {
  const c = ctx('f');
  let body = '';
  for (const s of SC) if (t >= s.s && t < s.e) body += s.f(t, c);
  const black = A(t, 92.2, 0.8, E.inout);
  if (black > 0) body += R(0, 0, W, H, { fill: '#000', op: black.toFixed(3) });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${c.defs.join('')}</defs>${body}</svg>`;
}
