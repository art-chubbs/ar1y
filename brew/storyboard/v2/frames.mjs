// Storyboard v2 — cinematic SaaS launch cut (60 s). Product-led: the camera lives inside brew Studio.
import { C, D, S, M, W, H, T, TS, R, Ln, Ci, P, G, ML, tag, brackets, cursor, check, waveform, grad, rgrad, clipRect, pill } from '../lib.mjs';
import { skyline, archivePhoto, phone, factCard, timeline } from '../art.mjs';
import { glow, windowFrame, sidebar, screenNew, screenProduction, screenReview, screenLibrary, screenLanguages, screenBroll, statement, tilt, pipelineRow } from './ui.mjs';

const app = (c, x, y, w, h, screen, active) => windowFrame(c, x, y, w, h, sidebar(x, y + 44, h - 44, active) + screen(c, x + 260, y + 44, w - 260, h - 44));
const floor = c => R(0, 760, W, 320, { fill: grad(c, [[0, C.bg, 0], [1, '#000', 0.9]]) });
const beams = (c, op = 1) => {
  const g = grad(c, [[0, C.green, 0], [0.5, C.green, 0.12 * op], [1, C.green, 0]]);
  return [[300, 140], [900, 80], [1500, 160]].map(([x, w]) => `<polygon points="${x},0 ${x + w},0 ${x + w - 520},${H} ${x - 520},${H}" fill="${g}"/>`).join('');
};

export const ACTS = [['A', 'Hook', '0:00–0:06'], ['B', 'Product', '0:06–0:25'], ['C', 'Proof', '0:25–0:47'], ['D', 'Close', '0:47–1:00']];

export const FRAMES = [
  {
    act: 'A', t: 0, title: 'Macro: timecode',
    visual: 'Extreme close-up of brew\'s timecode in IBM Plex Mono, digits rolling. A green playhead slides through frame. Shallow depth of field: outer digits fall off into blur.',
    motion: 'Camera: 100mm macro, slow push 3%. Digits roll on the beat. Playhead crosses L→R in 1.2s; anamorphic green flare on its edge.',
    vo: '(music only)', sfx: 'Single low sub hit on frame 1, then a ticking clock pattern in the hats.', next: 'Hard cut on the downbeat to type.',
    art: c => glow(c, 960, 540, 900, 380, C.green, 0.18) +
      T(960, 640, '00:00:00:00', { f: M, w: 500, size: 300, fill: C.text, anchor: 'middle', ls: 6 }) +
      R(0, 380, 300, 320, { fill: grad(c, [[0, C.bg], [1, C.bg, 0]], { dir: [0, 0, 1, 0] }) }) + R(1620, 380, 300, 320, { fill: grad(c, [[0, C.bg, 0], [1, C.bg]], { dir: [0, 0, 1, 0] }) }) +
      Ln(1010, 300, 1010, 780, { stroke: C.green, sw: 6 }) + `<ellipse cx="1010" cy="540" rx="18" ry="260" fill="${rgrad(c, [[0, C.green, 0.5], [1, C.green, 0]])}"/>` +
      R(0, 535, W, 10, { fill: grad(c, [[0, C.green, 0], [0.5, C.greenL, 0.6], [1, C.green, 0]], { dir: [0, 0, 1, 0] }) }),
  },
  {
    act: 'A', t: 2, title: 'You have the ideas.',
    visual: 'Full-bleed statement, white with a soft top-to-bottom gradient. Nothing else on screen.',
    motion: 'Words cut on in time with kick drums (one word per beat), each with a 4px vertical settle. No fades.',
    vo: '"You have the ideas."', sfx: 'Kick on each word.', next: 'Cut to the counter-line.',
    art: c => statement(c, ['You have', 'the ideas.'], { y: 500, lh: 210 }),
  },
  {
    act: 'A', t: 4, title: 'Not the edit bay.',
    visual: '"Not the edit bay." in grey, with ghosted timeline tracks and a hundred tiny file chips stacked behind it at 6% opacity. The mess is texture, not content.',
    motion: 'Background tracks drift left at different speeds (parallax). Statement holds still: the only calm thing on screen.',
    vo: '"Not the edit bay."', sfx: 'A muffled pile of notification pings under the music, ducked.', next: 'Lights drop to black; a green glow rises from below.',
    art: c => G(null, timeline(c, -100, 200, 2100, 680), { op: 0.08 }) + statement(c, ['Not the', 'edit bay.'], { y: 500, lh: 210, fills: [C.t3, C.t3] }),
  },
  {
    act: 'B', t: 6, title: 'Product reveal',
    visual: 'brew Studio rises out of darkness, tilted in perspective, lit from below by a green glow, with diagonal light beams raking across its glass edge. Floor reflection under the window.',
    motion: 'Camera: low angle crane up, 20° → 8° tilt over 2.5s (ease in-out). Glass edge catches the beams as they pass. Logo resolves top-centre.',
    vo: '"Meet brew."', sfx: 'Music opens up: pad + bass enter. Soft "air" swell into the logo tick.', next: 'Push into the prompt field.',
    art: c => beams(c) + glow(c, 960, 900, 1000, 260, C.green, 0.35) +
      G(tilt(960, 560, 1), app(c, 360, 240, 1200, 680, screenNew, 'New video')) + floor(c) +
      TS(960, 150, [['br'], ['e', { fill: C.green }], ['w']], { f: D, w: 800, size: 64, anchor: 'middle', ls: -2 }) + ML(960, 192, 'Studio', { size: 14, anchor: 'middle', ls: 6 }),
  },
  {
    act: 'B', t: 9, title: 'Macro: one line in',
    visual: 'Macro on the prompt: "Why the Panama Canal ran short of water" being typed, the green caret, the Send to brew button in sharp focus while the rest of the UI melts into blur.',
    motion: 'Rack focus from caret to button. Cursor glides in and clicks; button compresses 2px and the green spills outward as light.',
    vo: '"Send a topic, or a script…"', sfx: 'Close-mic keyboard, one tick per character; tactile click.', next: 'The button\'s light streaks right into the pipeline.',
    art: c => G(null, G('translate(-560 -560) scale(2)', app(c, 360, 240, 1200, 680, screenNew, 'New video')), { clip: clipRect(c, 0, 0, W, H) }) +
      R(0, 0, W, 260, { fill: grad(c, [[0, C.bg], [1, C.bg, 0]]) }) + R(0, 860, W, 220, { fill: grad(c, [[0, C.bg, 0], [1, C.bg]]) }) +
      cursor(1580, 820, 2),
  },
  {
    act: 'B', t: 12, title: 'Tracking shot: the pipeline',
    visual: 'The seven pipeline stages from the site, scaled up into a physical track. Camera tracks sideways along it; done stages dim, EDIT burns green. Beneath each stage a tiny artifact: sources, script, waveform, timeline.',
    motion: 'Lateral dolly R→L at constant speed, 3s. Motion blur on the passing pills. Each stage lights on a hi-hat.',
    vo: '"…we research it, write it, voice it, and cut it."', sfx: 'A rising arpeggio, one note per stage.', next: 'Split into a 2×2 of macro shots.',
    art: c => glow(c, 1300, 520, 700, 200, C.green, 0.2) +
      G('translate(-180 260) scale(2.6)', pipelineRow(0, 0, 4, { size: 16 })) +
      [['Sources', '14 checked'], ['Script', 'v1 · 6 beats'], ['Voice', '00:54'], ['Edit', 'assembling']].map(([k, v], i) =>
        R(220 + i * 400, 560, 340, 150, { r: 14, fill: C.s1, stroke: i === 3 ? C.green : C.line2 }) + ML(248 + i * 400, 600, k, { size: 12, fill: i === 3 ? C.green : C.t3 }) +
        T(248 + i * 400, 650, v, { f: S, w: 600, size: 26 }) + (i === 2 ? waveform(248 + i * 400, 690, 280, 26, 40, 4, C.green) : '')).join('') +
      R(0, 0, 240, H, { fill: grad(c, [[0, C.bg], [1, C.bg, 0]], { dir: [0, 0, 1, 0] }) }),
  },
  {
    act: 'B', t: 16, title: '2×2 macro montage',
    visual: 'Four macro tiles on the beat: a verified fact (50,000,000 gallons), a highlighted script line, the voice waveform, timeline clips snapping together.',
    motion: 'Tiles cut in clockwise on four beats, then all four push in 4% together. Thin green hairlines between tiles.',
    vo: '(music)', sfx: 'Four percussive UI clicks on the beats.', next: 'Tiles collapse into the review player.',
    art: c => {
      const tile = (x, y, inner) => G(null, R(x, y, 900, 460, { r: 18, fill: C.s1, stroke: C.line2 }) + inner, { clip: clipRect(c, x, y, 900, 460, 18) });
      return tile(40, 60, factCard(120, 130, 740, 320, 'Fresh water per crossing', '50,000,000', 'gallons · Panama Canal Authority', { ok: true, vs: 96 })) +
        tile(980, 60, R(1020, 210, 820, 90, { r: 10, fill: C.green, fop: 0.1, stroke: C.green }) + T(1050, 268, 'Every ship that crosses uses 50 million', { f: S, size: 32, w: 500 }) + ML(1020, 170, 'Script · beat 03', { size: 12, fill: C.green }) + T(1050, 360, 'gallons of fresh water.', { f: S, size: 32, fill: C.t2 })) +
        tile(40, 560, waveform(100, 790, 780, 240, 70, 5, C.green) + ML(100, 620, 'Voice · EN', { size: 12 })) +
        tile(980, 560, G('translate(980 560) scale(0.56)', timeline(c, 0, 0, 1600, 330, { play: 0.5 })) + ML(1020, 820, 'Edit · clips snap to the script', { size: 12 }));
    },
  },
  {
    act: 'B', t: 19, title: 'Review: a person watches',
    visual: 'The review screen in hero light: Rose Freedman\'s 1911 photograph in the player, the 15-point checklist at 15/15, and the reviewer card "Watched by Maya K." The viewfinder brackets lock onto the player.',
    motion: 'Music drops to a single pad. Slow 2s push in. Brackets snap with overshoot. Checklist ticks down in 60ms steps.',
    vo: '"Then a person watches all of it."', sfx: 'Near silence, then soft ticks and one warm confirmation tone.', next: 'Cut to black statement.',
    art: c => glow(c, 760, 560, 800, 400, C.green, 0.2) + G(tilt(960, 560, 0.35), app(c, 160, 170, 1600, 780, (c2, x, y, w, h) => screenReview(c2, x, y, w, h), 'Review')) +
      brackets(400, 230, 860, 560, { len: 50, sw: 7 }),
  },
  {
    act: 'C', t: 22, title: 'Every frame. Watched by a person.',
    visual: 'Statement, two lines. "person." in brand green, held inside the brackets.',
    motion: 'Line one cuts on; line two rises through a mask; brackets draw around "person." last.',
    vo: '"Every frame. Before you ever see it."', sfx: 'The brew signature chord.', next: 'Hard cut into the comparison.',
    art: c => statement(c, ['Every frame.'], { y: 470, size: 170 }) +
      TS(960, 700, [['Watched by a '], ['person.', { fill: C.green }]], { f: D, w: 800, size: 130, anchor: 'middle', ls: -5 }) +
      brackets(1150, 570, 600, 170, { len: 36, sw: 6 }),
  },
  {
    act: 'C', t: 25, title: 'Compare: tool vs brew',
    visual: 'Full-bleed split with a draggable divider. Left: the stock skyline a tool picks when the narration says "Rose Freedman". Right: her actual 1911 photograph on paper. The divider sweeps across.',
    motion: 'Divider wipes from right to left over 1.6s, revealing the archive photo. Left half desaturates as it shrinks.',
    vo: '"An AI tool picks on mood. We find her."', sfx: 'Paper slide; shutter click when the divider settles.', next: 'Pull back into the library.',
    art: c => skyline(c, 0, 0, 900, H) + R(0, 0, 900, H, { fill: C.bg, op: 0.35 }) +
      R(900, 0, 1020, H, { fill: '#E9E1CE' }) + archivePhoto(c, 1170, 160, 480, 660, { tr: 'rotate(-2 1410 490)' }) +
      Ln(900, 0, 900, H, { stroke: C.text, sw: 3 }) + Ci(900, 540, 34, { fill: C.text }) + P('M884 540l-8 8m8-8l-8-8M916 540l8 8m-8-8l8-8', { stroke: C.bg, sw: 3, cap: 'round' }) +
      tag(60, 940, 'What a tool gives you', C.coral, true) + tag(1560, 940, 'What we deliver', C.green, true),
  },
  {
    act: 'C', t: 28, title: 'Library glide',
    visual: 'The Library screen at a steep isometric angle: ten delivered films across nine styles (explainer, archive, stick, cartoon, brainrot). Thumbnails glow faintly.',
    motion: 'Camera glides diagonally across the grid (crane + pan), 3s, parallax between window and glow. One card lifts on hover.',
    vo: '"Long-form YouTube, any style, up to sixty minutes."', sfx: 'Smooth whoosh; soft card lift.', next: 'Language dropdown opens in the same window.',
    art: c => glow(c, 960, 600, 900, 300, C.amber, 0.14) + G(tilt(960, 560, 1.2), app(c, 260, 160, 1400, 800, screenLibrary, 'Library')) + floor(c) +
      tag(80, 80, 'We run it · YouTube', C.amber),
  },
  {
    act: 'C', t: 32, title: 'Nine languages',
    visual: 'Languages screen: same player, a language list on the right (exactly the nine on the site). The selection steps EN → DE → FR while the waveform reshapes and the picture stays locked.',
    motion: 'Selection highlight steps down on each beat. Waveform morphs per language. Small floating chip: "Upload it nine times, not once."',
    vo: '"Upload it nine times, not once."', sfx: 'The same VO phrase, crossfading through languages.', next: 'Window swaps to the teal b-roll screen (shared-element on the player).',
    art: c => glow(c, 960, 560, 900, 360, C.green, 0.16) + app(c, 160, 130, 1600, 820, (c2, x, y, w, h) => screenLanguages(c2, x, y, w, h, { sel: 2 }), 'Languages') +
      R(1260, 960, 520, 70, { r: 35, fill: C.s2, stroke: C.green }) + T(1520, 1004, 'Upload it nine times, not once.', { f: S, w: 600, size: 22, anchor: 'middle' }),
  },
  {
    act: 'C', t: 35, title: 'AI b-roll',
    visual: 'Teal-lit b-roll screen: the prompt "our serum bottle, in a hand, on wet marble" and four generated takes; one gets the Keep button.',
    motion: 'Takes resolve in a 2×2 from noise to image (40ms stagger). Camera eases to the kept take, which expands to full-bleed on the cut.',
    vo: '"Need a shot that doesn\'t exist? Type it."', sfx: 'Granular shimmer as the takes resolve; click on Keep.', next: 'The kept take morphs into a vertical phone.',
    art: c => glow(c, 960, 560, 900, 360, C.teal, 0.16) + G(tilt(960, 560, 0.4), app(c, 200, 120, 1520, 860, screenBroll, 'AI b-roll')) + tag(80, 80, 'Self serve', C.teal),
  },
  {
    act: 'C', t: 39, title: 'UGC carousel',
    visual: 'Five vertical ads on a curved carousel, coral rim light: centre phone sharp and large, sides smaller and dimmer. HOOK / DEMO / PAYOFF labels, on-screen AI-GENERATED tags.',
    motion: 'Carousel rotates one step per beat (3 steps). Centre phone plays; captions highlight word by word.',
    vo: '"Ads that look shot, not generated."', sfx: 'Three swipes, each a different voice snippet.', next: 'Phones flatten into the stat row.',
    art: c => {
      const pals = [['#4A3F3A', '#1E1A18', '#C99A7A', '#2A1E16', '#7A8F6B'], ['#3A4452', '#171B22', '#8D5E42', '#1A1410', '#D9A441'], ['#4A3A4F', '#1B161E', '#E0B394', '#6B3A1E', '#3FB8C4'], ['#3D4A40', '#161C18', '#B07E5E', '#222', '#E2634A']];
      const spots = [[140, 330, 230, 0.4, 'Hook 01'], [430, 260, 290, 0.65, 'Hook 02'], [790, 170, 340, 1, 'Demo 01'], [1200, 260, 290, 0.65, 'Hook 03'], [1550, 330, 230, 0.4, 'Payoff']];
      return glow(c, 960, 620, 900, 300, C.coral, 0.22) + tag(80, 80, 'We run it · UGC ads', C.coral) +
        spots.map(([x, y, w, op, l], i) => phone(c, x, y, w, w * 16 / 9, { label: l, pal: pals[i % 4], prop: true, caption: i === 2 ? 'okay this actually worked' : '', op, prog: 0.4 })).join('');
    },
  },
  {
    act: 'C', t: 43, title: 'The numbers',
    visual: 'Four stat cards, each a single big number from the site: 3 days · 9 languages · $1.50 a finished minute · 15-point review.',
    motion: 'Numbers count up on four consecutive beats; cards rise 22px with 40ms stagger. Prices are the site\'s published figures (checked 20 Sep 2026).',
    vo: '"Three days. Nine languages. One published price."', sfx: 'Mechanical counter ticks, a stamp per card.', next: 'Fade to the customer quote.',
    art: c => [['3 days', 'Start to finish', C.text], ['9', 'Languages, same edit', C.text], ['$1.50', 'A finished minute at 700 min', C.green], ['15', 'Point review by a person', C.text]].map(([v, l, col], i) =>
      R(80 + i * 450, 340, 420, 400, { r: 20, fill: C.s1, stroke: C.line2 }) + T(120 + i * 450, 520, v, { f: D, w: 800, size: v.length > 3 ? 104 : 140, fill: col, ls: -4 }) +
      ML(120 + i * 450, 680, l, { size: 13 })).join('') + ML(960, 860, 'Published prices · nothing is a starting-from figure', { size: 13, anchor: 'middle' }),
  },
  {
    act: 'D', t: 47, title: 'Customer quote',
    visual: 'The site\'s testimonial, set large: "Compared to your quality I actually like yours more. Theirs has a cheap look." Attribution in mono.',
    motion: 'Quote types on by phrase, not character. Slow 2% push. Everything else black.',
    vo: '(read by the customer, or left as text)', sfx: 'Music thins to pad + a single piano note.', next: 'Cut to the payoff line.',
    art: c => T(160, 360, '“', { f: D, w: 800, size: 220, fill: C.green }) +
      ['Compared to your quality,', 'I actually like yours more.', 'Theirs has a cheap look.'].map((l, i) => T(160, 480 + i * 110, l, { f: D, w: 600, size: 84, ls: -2, fill: i === 2 ? C.t3 : C.text })).join('') +
      ML(160, 860, 'Andrea · History channel · 2026', { size: 15, ls: 3 }),
  },
  {
    act: 'D', t: 50, title: 'You approve.',
    visual: 'Statement, single line, massive.',
    motion: 'Cuts on the downbeat. Hold 1.5s. The full stop pulses green once.',
    vo: '"You approve."', sfx: 'Kick + clap.', next: 'Hard cut to the second half.',
    art: c => statement(c, ['You approve.'], { y: 610, size: 220 }),
  },
  {
    act: 'D', t: 52, title: 'You don\'t assemble.',
    visual: 'Statement in grey: "You don\'t assemble." The scattered UI fragments from the hook shot drift away behind it and dissolve.',
    motion: 'Fragments fall out of frame with gravity; type stays.',
    vo: '"You don\'t assemble."', sfx: 'Reverse cymbal into silence.', next: 'Silence; a single button fades up.',
    art: c => G(null, timeline(c, -100, 640, 2100, 420), { op: 0.06 }) + statement(c, ['You don\'t', 'assemble.'], { y: 500, lh: 210, fills: [C.t3, C.t3] }),
  },
  {
    act: 'D', t: 54, title: 'Macro: Approve',
    visual: 'Macro on the Approve button in brew Studio, cursor arriving. The finished file name sits beside it: panama-canal_final.mp4 · Ready to upload.',
    motion: 'Rack focus from file name to button. Click. A green ring blooms out and becomes the end-card brackets.',
    vo: '(silence, then the click)', sfx: 'One crisp click. The brew signature starts.', next: 'Ring opens into the end card.',
    art: c => glow(c, 1180, 560, 700, 300, C.green, 0.25) +
      R(260, 400, 1400, 280, { r: 28, fill: C.s1, stroke: C.line2 }) + R(310, 450, 300, 180, { r: 14, fill: '#4DB37E', op: 0.6 }) +
      T(660, 530, 'panama-canal_final.mp4', { f: M, w: 500, size: 40 }) + ML(660, 590, '58:24 · 1080p · Ready to upload', { size: 18 }) +
      R(1240, 470, 360, 140, { r: 20, fill: C.green }) + P('M1290 540l18 18l36 -40', { stroke: C.bg, sw: 9, cap: 'round', join: 'round' }) + T(1460, 562, 'Approve', { f: S, w: 600, size: 44, fill: C.bg, anchor: 'middle' }) +
      Ci(1420, 540, 230, { stroke: C.green, sw: 3, op: 0.35 }) + cursor(1500, 580, 2.2),
  },
  {
    act: 'D', t: 57, title: 'End card',
    visual: 'brew logo in the viewfinder brackets. "Your first video is free." CTA button "Send us a script →". scalewithbrew.com. Light beams drift.',
    motion: 'Brackets close in; logo letters rise; CTA button pops with overshoot. Hold 2.5s. Cut to black on the final note.',
    vo: '"Your first video is free. brew."', sfx: 'Signature resolves; tail.', next: 'Black.',
    art: c => beams(c, 0.8) + brackets(660, 170, 600, 330, { len: 56, sw: 8 }) +
      TS(960, 395, [['br'], ['e', { fill: C.green }], ['w']], { f: D, w: 800, size: 190, anchor: 'middle', ls: -7 }) +
      T(960, 630, 'Your first video is free.', { f: D, w: 600, size: 72, anchor: 'middle', ls: -2 }) +
      R(780, 690, 360, 72, { r: 10, fill: C.green }) + T(960, 736, 'Send us a script  →', { f: S, w: 600, size: 26, fill: C.bg, anchor: 'middle' }) +
      T(960, 840, 'scalewithbrew.com', { f: M, w: 500, size: 24, fill: C.t2, anchor: 'middle', ls: 1 }),
  },
];
