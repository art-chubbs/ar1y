// Storyboard v4 — "night glass" launch film, modelled on the NeuraFlow film by Zelios, in brew's brand.
// 30 s, music-led, one continuous camera: beam → logo → product rises out of the horizon → orbit →
// chat → glass cards → carousel → brackets mask → logo. All elements flat 2D (no perspective).
import {
  N, W, H, T, TS, R, Ln, Ci, P, G, ML, LAYER, tw, rng, clipRect, lg, rg, blurU, fx, bloom,
  nightBg, grid, beam, horizon, dust, streak, sparkle, sparklePath, bracketsPath, mark, wordmark, logo, icon,
  glass, glassChip, pillBtn, orb, lightLine, headline, watermark, guides, avatar, studio,
} from './kit.mjs';
import { panamaMap } from '../art.mjs';
import { D, S, M } from '../lib.mjs';

export const ACTS = [['1', 'Light & logo', '0:00–0:04'], ['2', 'The studio', '0:04–0:12'], ['3', 'Ask, and it\'s made', '0:12–0:19.5'], ['4', 'Everything brew makes', '0:19.5–0:25'], ['5', 'Logo', '0:25–0:30']];
export const END = 30;

// Portrait glass feature card (the reference's icon cards).
function featureCard(c, cx, cy, s, label, ic, sub, o = {}) {
  const w = 300 * s, h = 400 * s, x = cx - w / 2, y = cy - h / 2, k = o.k ?? 1;
  return glass(c, x, y, w, h, { name: `Card · ${label}`, r: 26 * s, k: 1.2 * k, glow: k > 0.9 ? N.teal : null, baseOp: 0.55 + 0.3 * k }) +
    LAYER(`Card · ${label} · content`, G(null,
      orb(c, cx, y + 130 * s, 46 * s, { icon: ic, name: `Icon · ${label}`, halo: 0.45 * k }) +
      T(cx, y + 240 * s, label, { f: S, w: 600, size: 26 * s, fill: N.ink, anchor: 'middle' }) +
      sub.map((l, i) => T(cx, y + (278 + i * 22) * s, l, { f: S, size: 15 * s, fill: N.ink3, anchor: 'middle' })).join('') +
      R(x + 30 * s, y + 340 * s, w - 60 * s, 1, { fill: '#FFFFFF', op: 0.12 }) +
      T(cx, y + 372 * s, o.meta || '', { f: M, size: 12 * s, fill: N.ink4, anchor: 'middle', ls: 1 }), { op: k < 1 ? (0.35 + 0.65 * k).toFixed(2) : null }));
}
const CAROUSEL = [['Library', 'grid', ['Every video,', 'ready to upload'], 'DELIVERED'], ['9 languages', 'globe', ['Same edit,', 'nine voices'], 'EN DE FR ES +5'],
  ['AI b-roll', 'film', ['Type the shot,', 'keep the best take'], 'SELF SERVE'], ['Explainers', 'play', ['Researched, written,', 'voiced and cut'], 'YOUTUBE'],
  ['UGC ads', 'phone', ['Ads that look shot,', 'not generated'], 'META · TIKTOK'], ['Human review', 'eye', ['15 checks,', 'frame by frame'], 'BY A PERSON'], ['Your voice', 'mic', ['Scripts that sound', 'like your channel'], 'ANY STYLE']];
function carousel(c, o = {}) {
  const items = CAROUSEL.map((it, j) => { const i = j - 3, th = i * 0.46, z = Math.cos(th); return { it, x: 960 + 760 * Math.sin(th), z, s: 0.62 + 0.4 * z * z, y: (o.cy ?? 560) - (1 - z) * 190 }; });
  return items.sort((a, b) => a.z - b.z).map(({ it: [l, ic, sub, meta], x, y, s, z }) => featureCard(c, x, y, s, l, ic, sub, { k: Math.max(0.25, z * z), meta })).join('');
}
const NODES = [['Research', 'search', 200], ['Script', 'doc', 255], ['Voice', 'mic', 310], ['Edit', 'edit', 15], ['Review', 'eye', 90], ['Deliver', 'check', 150]];

export const FRAMES = [
  // ---------- 1. LIGHT & LOGO ----------
  {
    act: '1', t: 0, title: 'Light on',
    visual: 'Near-black stage with a faint square grid. A soft green-teal glow begins to open at the top centre; a few motes of dust catch it.',
    motion: 'Fade up from black over 0.6 s; the grid drifts down 1 px/frame (camera slowly tilting). Ref 0:00–0:00.4.',
    vo: 'No VO. Music-led, like the reference.', sfx: 'Low airy riser starts.', next: 'The beam opens fully onto the logo.',
    art: c => nightBg(c) + grid(c, { op: 0.14, cy: 560, r: 1000 }) + beam(c, { k: 0.35, spread: 520 }) + dust(c, { n: 40, seed: 3 }) +
      LAYER('Glow · floor', `<ellipse cx="960" cy="1120" rx="900" ry="240" fill="${rg(c, [[0, N.teal, 0.28], [1, N.teal, 0]])}"/>`),
  },
  {
    act: '1', t: 1, title: 'Logo in the light',
    visual: 'The beam pours down onto the brew mark and wordmark, centred and glowing. Below, a dark planet rises into frame; its rim catches the light.',
    motion: 'Logo resolves out of a 20 px blur with 105 → 100% scale (e-out, 0.5 s). Planet rises 120 px. Ref 0:00.4–0:01.',
    vo: 'Super: brew', sfx: 'Soft shimmer as the logo resolves; riser continues.', next: 'Camera tilts down: the horizon flares and the product rises behind it.',
    art: c => nightBg(c) + grid(c, { op: 0.05 }) + beam(c) + dust(c, { seed: 5 }) + horizon(c, { y: 860, r: 1500 }) + logo(c, 960, 500, 110),
  },
  {
    act: '1', t: 2.6, title: 'Sunrise: the product rises',
    visual: 'The horizon flares with a horizontal lens streak. brew Studio climbs up from behind the planet like a sunrise; the logo has lifted to the top of frame.',
    motion: 'Tilt down 300 px with a slight push (e-in-out, 1.4 s). The window rises 360 px from behind the planet edge; streak flashes on the crest. Ref 0:01–0:01.6 (the dome reveal).',
    vo: '—', sfx: 'Whoosh into a deep, warm hit as the window clears the horizon.', next: 'Window settles; the headline lands above it.',
    art: c => nightBg(c) + grid(c, { op: 0.05, cy: 300 }) + beam(c, { k: 0.9 }) + logo(c, 960, 230, 64) +
      studio(c, 290, 520, 1340, 800) + horizon(c, { y: 640, r: 1700, k: 1.3, atmo: 900 }) + streak(c, 960, 640, 1500) + dust(c, { seed: 9, box: [300, 300, 1620, 640] }),
  },
  // ---------- 2. THE STUDIO ----------
  {
    act: '2', t: 4, title: '"Stop assembling videos."',
    visual: 'Hero composition. A glowing orb with the brew mark sits on two light rules. "Stop assembling videos." in a white-to-mint gradient, "We make them for you." beneath. brew Studio fills the lower frame with the dome of light behind it. Glass chips (Script, Voice) and a "New video" card float off its edges.',
    motion: 'Slow push-in, ~3% per second. Headline words rise 12 px and unblur with a 60 ms stagger. Chips drift on separate parallax planes (near ones 2× faster). Ref 0:01.6–0:04 ("Smart Control").',
    vo: 'Super: Stop assembling videos. / We make them for you.', sfx: 'Beat enters: soft kick and pluck.', next: 'Pull back: the window shrinks and a giant brew wordmark appears behind it.',
    art: c => nightBg(c) + grid(c, { op: 0.05, cy: 300 }) + beam(c, { k: 0.85, spread: 900 }) + horizon(c, { y: 290, r: 1100, k: 1.1, atmo: 760 }) + dust(c, { seed: 11, box: [520, 230, 1400, 420] }) +
      lightLine(c, 600, 912, 92, { nodes: [612] }) + lightLine(c, 1008, 1320, 92, { nodes: [1308] }) + orb(c, 960, 92, 32, { mark: true, name: 'Orb · brew mark' }) +
      headline(c, 960, 196, 'Stop assembling videos.', { size: 64 }) + headline(c, 960, 254, 'We make them for you.', { size: 46, w: 400, top: N.ink2, bottom: N.ink2, bloom: false }) +
      studio(c, 290, 330, 1340, 800) +
      glassChip(c, 170, 620, 'Script', 'doc', { size: 22 }) + glassChip(c, 120, 712, 'Voice', 'mic', { size: 22 }) +
      glass(c, 1440, 480, 400, 214, { name: 'Card · New video', r: 18, k: 1.4, glow: N.teal }) +
      LAYER('Card · New video · content', T(1466, 516, 'New video', { f: S, size: 14, fill: N.ink3 }) + Ci(1806, 510, 14, { stroke: '#FFFFFF', op: 0.3 }) + icon('arrow', 1806, 510, 12, { col: N.ink2 }) +
        T(1466, 552, 'Why the Panama Canal ran', { f: S, w: 600, size: 21, fill: N.ink }) + T(1466, 580, 'short of water', { f: S, w: 600, size: 21, fill: N.ink }) +
        R(1466, 600, 104, 30, { r: 15, fill: '#FFFFFF', fop: 0.08 }) + T(1518, 620, 'Explainer', { f: S, size: 13, fill: N.ink2, anchor: 'middle' }) +
        R(1578, 600, 114, 30, { r: 15, fill: '#FFFFFF', fop: 0.08 }) + T(1635, 620, '9 languages', { f: S, size: 13, fill: N.ink2, anchor: 'middle' }) +
        Ln(1466, 646, 1814, 646, { stroke: '#FFFFFF', op: 0.1 }) + icon('check', 1478, 668, 16, { col: N.mint, sw: 2 }) + T(1494, 673, 'Script approved', { f: S, size: 13, fill: N.ink2 }) +
        T(1814, 673, 'Day 2 of 3', { f: M, size: 12, fill: N.mint, anchor: 'end' })),
  },
  {
    act: '2', t: 7, title: 'Pull back: the wordmark',
    visual: 'The camera pulls back. brew Studio, now showing a delivered-per-week chart and a nine-language ring, floats small and sharp in the middle. A huge faded "brew" wordmark fills the top of frame; other screens (Library, Languages) hang blurred in the dark on either side.',
    motion: 'Pull back from 100% to 62% (e-in-out, 0.8 s), then a gentle drift right. Background panels sit on a deeper parallax plane with heavy depth of field. Ref 0:04–0:07 (giant "NeuraFlow" behind the dashboard).',
    vo: 'Super (small, top-left of window): One every week, on schedule.', sfx: 'Filtered sweep down; beat continues.', next: 'A ring draws itself around the centre of frame.',
    art: c => {
      const ghostL = glass(c, -120, 330, 520, 560, { name: 'Panel · Library', r: 22, shadow: false }) + LAYER('Panel · Library · thumbs', [0, 1, 2, 3].map(i => R(-90 + (i % 2) * 240, 400 + Math.floor(i / 2) * 200, 220, 124, { r: 10, fill: [N.teal, N.green, N.amber, N.teal][i], op: 0.25 })).join(''));
      const ghostR = glass(c, 1530, 330, 520, 560, { name: 'Panel · Languages', r: 22, shadow: false }) + LAYER('Panel · Languages · list', ['English', 'German', 'French', 'Spanish', 'Portuguese', 'Italian'].map((l, i) => T(1570, 410 + i * 70, l, { f: S, size: 26, fill: N.ink2 })).join(''));
      return nightBg(c, { cy: 600 }) + grid(c, { op: 0.05, cy: 640 }) + watermark(c, 960, 430, 470, { op: 0.34 }) +
        fx(ghostL + ghostR, blurU(c, 9), 0.55) + beam(c, { k: 0.7, spread: 820 }) +
        G('translate(960 640) scale(0.62) translate(-670 -400)', studio(c, 0, 0, 1340, 800, { screen: 'chart', active: 'Library' })) +
        fx(glass(c, 260, 980, 1400, 220, { name: 'Panel · foreground', r: 24, shadow: false }), blurU(c, 14), 0.5) + dust(c, { seed: 21, n: 60, box: [200, 120, 1720, 900] });
    },
  },
  {
    act: '2', t: 9.5, title: 'Orbit: Topic in. Video out.',
    visual: 'A glass sphere reading "Topic in. / Video out." sits inside a bright ring. The six stages of a brew video (Research, Script, Voice, Edit, Review, Deliver) orbit it as glass icon nodes; fainter rings spread outward.',
    motion: 'The inner ring draws on clockwise (0.4 s), the sphere pops 90 → 100% with overshoot, then nodes ride their orbits at ~20°/s while the whole system slowly rotates 6°. Ref 0:07–0:09 ("New Updates" orbit).',
    vo: 'Super: Topic in. Video out.', sfx: 'Glassy ping per node; low hum under the ring.', next: 'Cut on the beat: a single prompt bar in the dark.',
    art: c => {
      const cx = 960, cy = 560;
      const ringG = lg(c, [[0, N.rim, 1], [0.5, N.teal, 0.35], [1, N.mint, 0.9]], [cx - 210, cy - 210, cx + 210, cy + 210], true);
      let s = nightBg(c, { cy: 560 }) + beam(c, { k: 0.6, spread: 700 }) + dust(c, { seed: 31, n: 70, box: [300, 80, 1620, 1000] }) +
        LAYER('Orbit · outer rings', Ci(cx, cy, 680, { stroke: N.mint, op: 0.08 }) + Ci(cx, cy, 500, { stroke: N.mint, op: 0.16 }) + Ci(cx, cy, 340, { stroke: N.mint, op: 0.3, dash: '2 7' })) +
        LAYER('Orbit · inner ring', fx(Ci(cx, cy, 212, { stroke: N.teal, sw: 14 }), blurU(c, 14), 0.7) + Ci(cx, cy, 212, { stroke: ringG, sw: 2.5 })) +
        sparkle(c, cx + 500 * Math.cos(-0.6), cy + 500 * Math.sin(-0.6), 8) + sparkle(c, cx + 680 * Math.cos(2.7), cy + 680 * Math.sin(2.7), 7) +
        orb(c, cx, cy, 168, { name: 'Orb · centre', halo: 0.4 }) +
        headline(c, cx, cy - 8, 'Topic in.', { size: 50, w: 600 }) + headline(c, cx, cy + 52, 'Video out.', { size: 50, w: 600, top: N.mint, bottom: N.teal });
      for (const [lab, ic, deg] of NODES) {
        const a = deg * Math.PI / 180, x = cx + 340 * Math.cos(a), y = cy + 340 * Math.sin(a);
        s += orb(c, x, y, 40, { icon: ic, name: `Node · ${lab}`, halo: 0.35 }) + LAYER(`Label · ${lab}`, T(x, y + 70, lab.toUpperCase(), { f: M, w: 500, size: 13, fill: N.ink2, anchor: 'middle', ls: 2 }));
      }
      return s;
    },
  },
  // ---------- 3. ASK, AND IT'S MADE ----------
  {
    act: '3', t: 12, title: 'The prompt',
    visual: 'Darkness under the beam. A creator avatar and a gradient glass prompt bar: "Make a 10-minute explainer: why the Panama Canal ran short of water". Three glowing typing dots wait to the right.',
    motion: 'Bar slides in from the left 40 px and unblurs; text types at ~25 characters/s; dots pulse in sequence. Ref 0:09–0:10 (Mark Smith question).',
    vo: 'Super is the prompt itself.', sfx: 'Soft key ticks under the music.', next: 'The brew orb flies in from the right trailing light.',
    art: c => {
      const q = 'Make a 10-minute explainer: why the Panama Canal ran short of water';
      const bw = tw(q, 20, 500) + 64;
      return nightBg(c) + beam(c, { k: 0.8, spread: 700 }) + dust(c, { seed: 41, n: 50 }) +
        avatar(c, 504, 488, 24, { name: 'Avatar · Sam' }) + LAYER('Label · Sam', T(548, 452, 'Sam Carter · Creator', { f: S, size: 15, fill: N.ink3 })) +
        LAYER('Prompt bar', fx(R(548, 470, bw, 62, { r: 14, fill: N.teal }), blurU(c, 18), 0.35) +
          R(548, 470, bw, 62, { r: 14, fill: lg(c, [[0, N.green, 0.55], [0.6, N.teal, 0.25], [1, N.teal, 0.12]], [548, 0, 548 + bw, 0], true) }) +
          R(548.5, 470.5, bw - 1, 61, { r: 14, stroke: lg(c, [[0, '#FFFFFF', 0.5], [1, '#FFFFFF', 0.08]], [0, 470, 0, 532], true), sw: 1.2 })) +
        LAYER(`Text · ${q}`, T(580, 508, q, { f: S, w: 500, size: 20, fill: N.ink })) +
        LAYER('Typing dots', [0, 1, 2].map(i => bloom(c, Ci(1310 + i * 26, 600, 7, { fill: N.mint, op: [1, 0.6, 0.3][i] }), 6, 0.8)).join(''));
    },
  },
  {
    act: '3', t: 13.5, title: 'brew answers',
    visual: 'The prompt has moved up. The brew orb has landed on the right, "brew team" beside it, a trail of light behind. Under it a glass answer card lists what happens next: research, script, voice and cut, human review. Thin construction lines run off every edge.',
    motion: 'Orb flies in on an arc from frame right (0.5 s, e-out) shedding particles; the card unfolds downward from its header (height 0 → 100%), lines appear one by one 120 ms apart. Guide lines draw outward from the card corners. Ref 0:10–0:13 (AI Agent answer).',
    vo: 'Super is the answer card.', sfx: 'Glass "ping" on landing; soft ticks per line.', next: 'The card flips into the review card.',
    art: c => {
      const q = 'Make a 10-minute explainer: why the Panama Canal ran short of water', bw = tw(q, 20, 500) + 64;
      const r = rng(4); let trail = '';
      for (let i = 0; i < 26; i++) { const t = i / 26, x = 1400 + t * 520 + r() * 30, y = 548 - Math.sin(t * 2.4) * 150 - t * 60 + r() * 24; trail += Ci(x.toFixed(1), y.toFixed(1), (2.4 * (1 - t) + 0.6).toFixed(2), { fill: N.mint, op: (0.9 * (1 - t)).toFixed(2) }); }
      const rows = [['search', 'Researching 14 sources, each one checked'], ['doc', 'Script in your channel\'s voice · 6 beats'], ['mic', 'Voiced and cut by our editors'], ['eye', 'Watched frame by frame before delivery']];
      return nightBg(c) + beam(c, { k: 0.8, spread: 700 }) + dust(c, { seed: 43, n: 40 }) +
        guides([[0, 370, W, 370], [0, 552, W, 552], [0, 858, W, 858], [548, 250, 548, 980], [548 + bw, 250, 548 + bw, 980]]) +
        avatar(c, 504, 388, 24, { name: 'Avatar · Sam' }) + LAYER('Label · Sam', T(548, 352, 'Sam Carter · Creator', { f: S, size: 15, fill: N.ink3 })) +
        LAYER('Prompt bar', R(548, 370, bw, 62, { r: 14, fill: lg(c, [[0, N.green, 0.55], [0.6, N.teal, 0.25], [1, N.teal, 0.12]], [548, 0, 548 + bw, 0], true) }) +
          R(548.5, 370.5, bw - 1, 61, { r: 14, stroke: '#FFFFFF', sw: 1, op: 0.25 })) + LAYER(`Text · ${q}`, T(580, 408, q, { f: S, w: 500, size: 20, fill: N.ink })) +
        LAYER('Light trail', trail) + orb(c, 1380, 520, 28, { mark: true, name: 'Orb · brew' }) + LAYER('Label · brew team', T(1336, 494, 'brew team', { f: S, size: 15, fill: N.ink3, anchor: 'end' })) +
        glass(c, 548, 552, bw, 306, { name: 'Card · answer', r: 18, k: 1.3 }) +
        LAYER('Card · answer · text', T(580, 598, 'On it. Here\'s the plan:', { f: S, w: 600, size: 20, fill: N.ink }) +
          rows.map(([ic, l], i) => Ci(596, 652 + i * 50, 17, { fill: N.green, op: 0.18 }) + icon(ic, 596, 652 + i * 50, 18, { col: N.mint }) + T(628, 659 + i * 50, l, { f: S, size: 18, fill: i < 2 ? N.ink : N.ink2 })).join('') +
          T(548 + bw - 32, 598, 'Delivered in 3 days', { f: M, size: 13, fill: N.mint, anchor: 'end' }));
    },
  },
  {
    act: '3', t: 16, title: 'Watched by a person',
    visual: 'A glass review card: the finished Panama Canal edit in a player, a teal scan line sweeping across it, and the review checklist beneath (names, places, numbers, start to finish). Reviewer chip: "Watched by Maya K."',
    motion: 'Card re-forms from the answer card (shape morph: width/height animate, content cross-fades, 0.4 s). Scan line passes top → bottom once per second; checks tick on in order. Slow push 2%/s.',
    vo: 'Super: Watched by a person.', sfx: 'Scanner shimmer; tick per check.', next: 'Card collapses into a compact "Delivered" notification.',
    art: c => {
      const x = 580, y = 190, w = 760, h = 660;
      const items = ['Names match the narration', 'Places dated and sourced', 'Numbers legible on pause', 'Watched start to finish'];
      return nightBg(c) + beam(c, { k: 0.75, spread: 760 }) + dust(c, { seed: 51, n: 40 }) +
        headline(c, 960, 130, 'Watched by a person.', { size: 40, w: 500 }) +
        glass(c, x, y, w, h, { name: 'Card · review', r: 22, k: 1.3, glow: N.teal }) +
        LAYER('Card · review · header', icon('eye', x + 40, y + 42, 22, { col: N.mint }) + T(x + 64, y + 49, 'Human review', { f: S, w: 600, size: 20, fill: N.ink }) + T(x + w - 30, y + 49, '15 / 15', { f: M, w: 500, size: 18, fill: N.mint, anchor: 'end' })) +
        LAYER('Player', G(null, panamaMap(c, x + 30, y + 78, w - 60, 340, { r: 12 }), {}) + R(x + 30, y + 78, w - 60, 340, { r: 12, stroke: '#FFFFFF', op: 0.15 }) +
          R(x + 50, y + 392, w - 100, 4, { r: 2, fill: '#FFFFFF', op: 0.25 }) + R(x + 50, y + 392, (w - 100) * 0.62, 4, { r: 2, fill: N.mint })) +
        LAYER('Scan line', `<rect x="${x + 30}" y="${y + 210}" width="${w - 60}" height="46" fill="${lg(c, [[0, N.teal, 0], [1, N.teal, 0.45]], [0, y + 210, 0, y + 256], true)}"/>` + bloom(c, R(x + 30, y + 255, w - 60, 2.5, { fill: N.rim }), 6, 0.9)) +
        LAYER('Checklist', items.map((t, i) => { const ix = x + 40 + (i % 2) * 350, iy = y + 466 + Math.floor(i / 2) * 46; return Ci(ix + 10, iy, 12, { fill: N.green, op: 0.25 }) + icon('check', ix + 10, iy, 15, { col: N.mint, sw: 2.4 }) + T(ix + 32, iy + 6, t, { f: S, size: 17, fill: N.ink2 }); }).join('')) +
        LAYER('Reviewer chip', R(x + 30, y + 572, w - 60, 60, { r: 14, fill: '#FFFFFF', op: 0.05 }) + Ci(x + 66, y + 602, 18, { fill: N.amber }) + T(x + 66, y + 607, 'MK', { f: S, w: 600, size: 13, fill: N.base, anchor: 'middle' }) +
          T(x + 96, y + 597, 'Watched by Maya K.', { f: S, w: 600, size: 16, fill: N.ink }) + T(x + 96, y + 618, 'Every frame, before it reaches you', { f: S, size: 13, fill: N.ink3 }) + T(x + w - 54, y + 608, 'Approved', { f: M, size: 13, fill: N.mint, anchor: 'end' }));
    },
  },
  {
    act: '3', t: 18, title: 'Delivered',
    visual: 'A compact glass notification: green check orb, "Delivered · Day 3", the video title and its thumbnail. Under it, nine glass language chips light up one after another.',
    motion: 'Notification drops 30 px and settles (overshoot); check draws on; chips pop left → right 50 ms apart. Sparkles twinkle at the card corners.',
    vo: 'Super: Delivered. In nine languages.', sfx: 'Warm two-note "done" chime; nine light ticks.', next: 'Everything clears except the beam; a single glass card descends.',
    art: c => {
      const langs = ['EN', 'DE', 'FR', 'ES', 'PT', 'IT', 'PL', 'ID', 'DA'];
      return nightBg(c) + beam(c, { k: 0.8, spread: 760 }) + dust(c, { seed: 61, n: 50 }) +
        glass(c, 560, 350, 800, 230, { name: 'Card · delivered', r: 22, k: 1.4, glow: N.teal }) +
        orb(c, 640, 465, 38, { icon: 'check', name: 'Orb · check' }) +
        LAYER('Card · delivered · text', T(700, 440, 'Delivered · Day 3', { f: S, w: 600, size: 30, fill: N.ink }) + T(700, 476, 'Why the Panama Canal ran short of water', { f: S, size: 17, fill: N.ink2 }) +
          T(700, 508, 'Ready to upload · 10:04', { f: M, size: 13, fill: N.mint })) +
        G(null, panamaMap(c, 1110, 395, 222, 125, { r: 10, quiet: true })) + LAYER('Thumbnail · edge', R(1110, 395, 222, 125, { r: 10, stroke: '#FFFFFF', op: 0.2 })) +
        langs.map((l, i) => glassChip(c, 560 + i * 90, 640, l, null, { size: 18, r: 12, glow: i < 3 ? N.teal : null })).join('') +
        sparkle(c, 572, 352, 10) + sparkle(c, 1352, 578, 8) + sparkle(c, 1420, 300, 6);
    },
  },
  // ---------- 4. EVERYTHING BREW MAKES ----------
  {
    act: '4', t: 19.5, title: 'One glass card',
    visual: 'A single portrait glass card under the beam: a glowing play-icon orb, "Explainers", "Researched, written, voiced and cut".',
    motion: 'Card descends 60 px out of the beam and rotates 0° (stays flat); light rakes across its face left → right. Ref 0:13–0:13.4.',
    vo: '—', sfx: 'Glassy chime.', next: 'It splits into three.',
    art: c => nightBg(c) + beam(c, { k: 1, spread: 640 }) + dust(c, { seed: 71, n: 60 }) +
      featureCard(c, 960, 560, 1.15, 'Explainers', 'play', ['Researched, written,', 'voiced and cut'], { meta: 'YOUTUBE' }),
  },
  {
    act: '4', t: 20.7, title: 'Three cards',
    visual: 'The card has split: "AI b-roll" and "UGC ads" slide out from behind "Explainers", slightly smaller and dimmer.',
    motion: 'Side cards slide out 300 px with 0.08 s offset, scaling 90 → 95%. Ref 0:13.4–0:14.',
    vo: '—', sfx: 'Two soft swishes.', next: 'More cards join; the row bends into a carousel.',
    art: c => nightBg(c) + beam(c, { k: 0.95, spread: 700 }) + dust(c, { seed: 73, n: 60 }) +
      featureCard(c, 640, 580, 0.95, 'AI b-roll', 'film', ['Type the shot,', 'keep the best take'], { k: 0.6, meta: 'SELF SERVE' }) +
      featureCard(c, 1280, 580, 0.95, 'UGC ads', 'phone', ['Ads that look shot,', 'not generated'], { k: 0.6, meta: 'META · TIKTOK' }) +
      featureCard(c, 960, 560, 1.15, 'Explainers', 'play', ['Researched, written,', 'voiced and cut'], { meta: 'YOUTUBE' }),
  },
  {
    act: '4', t: 22, title: 'The carousel',
    visual: 'Seven glass cards in a curved carousel: Library, 9 languages, AI b-roll, Explainers (front), UGC ads, Human review, Your voice. Cards toward the back are smaller, higher and dimmer.',
    motion: 'Carousel turns one card every 0.6 s (e-in-out) so each feature takes the front once; depth is faked with scale + opacity only (flat layers, no skew). Ref 0:14–0:16.',
    vo: '—', sfx: 'A tick per card turn, tuned to the beat.', next: 'brew\'s brackets close in over the carousel.',
    art: c => nightBg(c) + beam(c, { k: 0.9, spread: 900 }) + dust(c, { seed: 79, n: 70 }) + carousel(c),
  },
  // ---------- 5. LOGO ----------
  {
    act: '5', t: 24, title: 'Brackets mask',
    visual: 'Giant glowing brew brackets frame the centre of the carousel; everything outside them sinks into darkness. The brackets are the mask: the shape transition into the logo.',
    motion: 'Brackets fly in from beyond the frame corners (scale 300 → 100%, 0.35 s, e-out) and the outside darkens with them. Then the bracket window shrinks toward centre, carrying the cards inside it. Ref 0:16–0:17 (the sparkle-star mask).',
    vo: '—', sfx: 'Big whoosh in, reversed cymbal into the logo.', next: 'Brackets shrink to logo size; the "e" appears inside.',
    art: c => {
      const x = 640, y = 220, s = 640, l = 150;
      return nightBg(c) + beam(c, { k: 0.9, spread: 900 }) + carousel(c) +
        LAYER('Mask · outside darkness', P(`M0 0H${W}V${H}H0Z M${x + 30} ${y + 30}h${s - 60}v${s - 60}h${-(s - 60)}Z`, { fill: '#020403', op: 0.86 }).replace('<path', '<path fill-rule="evenodd"')) +
        LAYER('Brackets · glow', fx(P(bracketsPath(x, y, s, s, l), { stroke: N.green, sw: 60, cap: 'square' }), blurU(c, 40), 0.7)) +
        LAYER('Brackets', bloom(c, P(bracketsPath(x, y, s, s, l), { stroke: lg(c, [[0, N.rim, 1], [0.5, N.mint, 1], [1, N.green, 1]], [x, y, x + s, y + s], true), sw: 26, cap: 'square' }), 10, 0.9));
    },
  },
  {
    act: '5', t: 25.2, title: 'The mark lands',
    visual: 'The brackets, now logo-sized, hold a green "e": the brew mark, glowing in the beam with a burst of sparkles.',
    motion: 'Bracket window shrinks to 220 px (e-in-out 0.4 s); "e" scales up from 0 with overshoot as the cards inside vanish; sparkle burst radiates and fades. Ref 0:17–0:17.6.',
    vo: '—', sfx: 'Signature chord hit.', next: 'Mark slides left; "brew" types on beside it.',
    art: c => {
      const r = rng(17); let burst = '';
      for (let i = 0; i < 18; i++) { const a = r() * Math.PI * 2, d = 170 + r() * 220; burst += P(sparklePath(960 + d * Math.cos(a), 520 + d * Math.sin(a), 3 + r() * 7), { fill: N.rim, op: (0.3 + r() * 0.6).toFixed(2) }); }
      return nightBg(c) + beam(c, { k: 1, spread: 700 }) + dust(c, { seed: 83, n: 60 }) + LAYER('Sparkle burst', burst) + streak(c, 960, 520, 900, { op: 0.6 }) + mark(c, 960, 520, 230);
    },
  },
  {
    act: '5', t: 26.2, title: 'End card',
    visual: 'The full brew logo in the beam, the planet horizon back at the bottom (bookending the open). "Your first video is free." and scalewithbrew.com beneath.',
    motion: 'Wordmark letters type on b-r-e-w (green "e" last); horizon rises 80 px; lines fade up 0.3 s later. Hold 3 s, beam slowly dims to black on the last 0.5 s. Ref 0:17.6–0:20.',
    vo: 'Super: Your first video is free. / scalewithbrew.com', sfx: 'Music resolves; long tail.', next: 'Black.',
    art: c => nightBg(c) + grid(c, { op: 0.04 }) + beam(c) + dust(c, { seed: 89 }) + horizon(c, { y: 900, r: 1700 }) + logo(c, 960, 450, 120) +
      headline(c, 960, 590, 'Your first video is free.', { size: 34, w: 500, top: N.ink, bottom: N.ink2, bloom: false }) +
      LAYER('Text · scalewithbrew.com', T(960, 640, 'scalewithbrew.com', { f: M, size: 18, fill: N.mint, anchor: 'middle', ls: 1.5 })),
  },
];
