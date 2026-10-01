// The brew launch film, 72s, 16:9. Each frame: production notes + art(c) returning SVG.
import { C, D, S, M, W, H, T, TS, R, Ln, Ci, P, G, ML, pill, tag, stepper, brackets, cursor, check, cross, waveform, grad, rgrad, rng } from './lib.mjs';
import { loopCard, bubble, fileChip, chaos, panamaMap, archivePhoto, skyline, serumShot, phone, player, chartCard, factCard, timeline, videoCard } from './art.mjs';

const title = (x, y, lines, o = {}) => lines.map((l, i) =>
  (Array.isArray(l) ? TS(x, y + i * (o.lh || o.size * 1.02), l, { f: D, w: o.w || 600, size: o.size, anchor: o.anchor, ls: o.ls ?? -2 })
    : T(x, y + i * (o.lh || o.size * 1.02), l, { f: D, w: o.w || 600, size: o.size, anchor: o.anchor, ls: o.ls ?? -2, fill: o.fill }))).join('');

const RING = ['Find an editor', 'Send the brief', 'Wait', 'Review', 'Request changes', 'Wait again'];
const ring = (o = {}) => RING.map((l, i) => {
  const a = -Math.PI / 2 + i * Math.PI * 2 / 6, rx = o.rx || 640, ry = o.ry || 330;
  return loopCard(W / 2 + Math.cos(a) * rx, H / 2 + 20 + Math.sin(a) * ry, l, `0${i + 1}`, { grey: o.grey, op: o.op, s: o.s || 0.9, w: 340, status: ['', '', '2 days', 'v2', '14 notes', '3 days'][i] });
}).join('') + (o.arrows === false ? '' :
  `<ellipse cx="${W / 2}" cy="${H / 2 + 20}" rx="${(o.rx || 640) - 10}" ry="${(o.ry || 330) - 10}" fill="none" stroke="${o.grey ? C.line2 : C.t3}" stroke-width="1.5" stroke-dasharray="4 10" opacity="${o.op ?? 0.8}"/>`);

export const ACTS = [
  ['I', 'The loop', '0:00–0:06'], ['II', 'Freeze & reveal', '0:06–0:11'], ['III', 'The pipeline', '0:11–0:25'],
  ['IV', 'A person watches', '0:25–0:34'], ['V', 'What we make', '0:34–1:05'], ['VI', 'You approve', '1:05–1:12'],
];

export const FRAMES = [
  // ---------------- ACT I — THE LOOP ----------------
  {
    act: 'I', t: 0.0, title: 'Cold open',
    visual: 'Black. The brand timecode ruler draws across the top. One card lands centre: FIND AN EDITOR, status "searching…". A cursor clicks it.',
    motion: 'Ruler wipes L→R (e-out, 400ms). Card drops 22px and settles with overshoot. Cursor click = 0.92 scale pop.',
    vo: '"Making one video is easy."', sfx: 'Room tone, a single trackpad click, keyboard tick.', next: 'Card flips to reveal the next card behind it; the loop starts.',
    art: c => loopCard(W / 2, H / 2, 'Find an editor', '01', { w: 520, h: 150, s: 1.15, status: 'searching…' }) + cursor(1180, 600, 1.4) +
      Ci(1180, 600, 26, { stroke: C.text, sw: 2, op: 0.4 }),
  },
  {
    act: 'I', t: 1.5, title: 'The loop forms',
    visual: 'Six cards form a ring: Find an editor → Send the brief → Wait → Review → Request changes → Wait again. Centre super.',
    motion: 'Cards deal in clockwise, 40ms stagger. The dashed orbit starts rotating slowly; a highlight steps card to card like a clock hand.',
    vo: '(continues) "…one video is easy."', sfx: 'Each card = soft paper tick, rising pitch.', next: 'Ring accelerates; cards duplicate off the orbit.',
    art: c => ring() + title(W / 2, H / 2 + 40, ['Making one video is easy.'], { size: 64, anchor: 'middle', w: 500 }),
  },
  {
    act: 'I', t: 3.5, title: 'Fifty of them',
    visual: 'The loop multiplies: cards overlap, messages and files pile in ("any update on the edit?", v3_FINAL_final.mp4). Counter climbs VIDEO 07 → 23 → 50.',
    motion: 'Speed ramp up. Cards spawn with motion blur and random 4–12° tilt; camera drifts and shakes 2px. Counter rolls digits.',
    vo: '"Making fifty — week after week — is another story."', sfx: 'Overlapping notifications, Slack pings, error blip, keyboard flurry building.', next: 'Hard freeze on a single frame.',
    art: c => chaos() + R(0, 0, W, H, { fill: C.bg, op: 0.35 }) +
      R(W - 360, 80, 300, 70, { r: 10, fill: C.s1, stroke: C.coral }) + ML(W - 340, 124, 'Video 23 / 50', { size: 22, fill: C.coral, ls: 3 }) +
      R(330, 440, 1260, 200, { r: 20, fill: C.bg, op: 0.86 }) + title(W / 2, 572, ['Making fifty is another story.'], { size: 84, anchor: 'middle', w: 800 }),
  },
  {
    act: 'I', t: 5.5, title: 'Freeze',
    visual: 'Everything stops mid-air and drains to grey. Only the timecode stays lit, held on one frame.',
    motion: 'Hard freeze (0 frames ease). Desaturate over 6 frames. A thin scan line passes once.',
    vo: '(silence)', sfx: 'All sound cuts dead. 600ms of silence; the loudest moment in the film.', next: 'Green corner brackets enter from the edges of frame.',
    art: c => chaos(true) + R(0, 0, W, H, { fill: C.bg, op: 0.25 }) + Ln(0, 610, W, 610, { stroke: C.text, op: 0.12, sw: 2 }) +
      R(W / 2 - 140, H - 120, 280, 44, { r: 22, fill: C.s1, stroke: C.line2 }) + T(W / 2, H - 91, 'HOLD  00:00:05:12', { f: M, size: 16, fill: C.t2, anchor: 'middle', ls: 1 }),
  },
  // ---------------- ACT II — REVEAL ----------------
  {
    act: 'II', t: 6.2, title: 'The brackets arrive',
    visual: 'The four corners of the brew viewfinder mark slide in from the edges and frame the frozen mess.',
    motion: 'Brackets travel inward on e-out (.16,1,.3,1), 500ms; ghost trails. The frame behind dims to 35%.',
    vo: '(silence)', sfx: 'One low, clean "thunk" as the brackets land. First sonic hint of the brew signature.', next: 'Brackets keep closing, compressing everything inside them.',
    art: c => chaos(true, { op: 0.35 }) +
      brackets(140, 120, W - 280, H - 240, { len: 90, sw: 8, op: 0.18 }) + brackets(90, 80, W - 180, H - 160, { len: 90, sw: 8, op: 0.08 }) +
      brackets(200, 160, W - 400, H - 320, { len: 90, sw: 8 }),
  },
  {
    act: 'II', t: 7.5, title: 'Compress',
    visual: 'The brackets squeeze the whole loop into a single small frame. Green light rakes diagonally across the dark.',
    motion: 'Scale-to-fit with a 1.5s ease-in-out (.65,0,.35,1); the mess inside turns into a clean dark tile. Aurora rake passes L→R.',
    vo: '"So hand it over."', sfx: 'Air pull / reverse swell into a soft click.', next: 'The tile flips to the brew wordmark.',
    aurora: 1,
    art: c => G(`translate(${W / 2 - 300} ${H / 2 - 169}) scale(0.3125)`, R(0, 0, W, H, { fill: C.bg }) + chaos(true, { op: 0.5 })) +
      R(W / 2 - 300, H / 2 - 169, 600, 338, { r: 6, stroke: C.line2 }) + brackets(W / 2 - 340, H / 2 - 209, 680, 418, { len: 56, sw: 7 }),
  },
  {
    act: 'II', t: 9.0, title: 'brew',
    visual: 'The brew logo: lowercase wordmark, green "e", inside the viewfinder brackets. Super: "We make the whole video."',
    motion: 'Letters rise through a mask, 40ms stagger; the green "e" lands last with a slight overshoot. Super fades up 22px.',
    vo: '"We make the whole video."', sfx: 'The brew sonic signature: one warm, rounded synth note.', next: 'The bracket frame stretches into a text field.',
    aurora: 0.8,
    art: c => brackets(W / 2 - 330, 260, 660, 360, { len: 60, sw: 8 }) +
      TS(W / 2, 515, [['br'], ['e', { fill: C.green }], ['w']], { f: D, w: 800, size: 220, anchor: 'middle', ls: -8 }) +
      title(W / 2, 760, ['We make the whole video.'], { size: 64, anchor: 'middle', w: 500 }) + ML(W / 2, 830, 'Scale With Brew', { anchor: 'middle', size: 15, ls: 5 }),
  },
  // ---------------- ACT III — PIPELINE ----------------
  {
    act: 'III', t: 11.0, title: 'Topic',
    visual: 'The bracket frame becomes an input. The seven pipeline pills from the site appear top centre; TOPIC is lit. One line gets typed.',
    motion: 'Bracket corners morph into the field\'s corners. Typing at ~28 chars/s with a green caret. Pills fade in, 40ms stagger.',
    vo: '"Send a topic, or a script."', sfx: 'Soft mechanical keys, one per character, low in the mix.', next: 'Enter → the line splits into source cards.',
    art: c => stepper(0) + ML(400, 420, 'Send a topic, or a script', { size: 15 }) +
      R(400, 450, 1120, 130, { r: 14, fill: C.s1, stroke: C.green, sw: 1.5 }) + brackets(384, 434, 1152, 162, { len: 34, sw: 5 }) +
      T(444, 532, 'Why the Panama Canal ran short of water', { f: S, size: 44, w: 500 }) + R(1260, 495, 4, 52, { fill: C.green }) +
      ML(400, 640, 'Five minutes', { size: 13, fill: C.t3 }) + T(1520, 640, '↵ Enter', { f: M, size: 15, fill: C.t3, anchor: 'end' }),
  },
  {
    act: 'III', t: 13.0, title: 'Research',
    visual: 'The topic line shatters into verified source cards: rainfall −41% (Oct 2023), 50,000,000 gallons a crossing, a 26 m lock climb, a map and an archive print. Each gets a green check.',
    motion: 'Cards fly out from the line along curved paths, rotate to 0° and snap into a grid. Checks pop in 80ms after each lands.',
    vo: '"We research it…"', sfx: 'Paper flicks; a small "tick" per verified check.', next: 'Cards collapse into lines of text.',
    art: c => stepper(1) + T(160, 200, 'Why the Panama Canal ran short of water', { f: S, size: 26, fill: C.t3 }) +
      chartCard(160, 250, 520, 300) +
      factCard(720, 250, 520, 300, 'Fresh water per crossing', '50,000,000', 'gallons · Panama Canal Authority', { ok: true, vs: 64 }) +
      factCard(1280, 250, 480, 300, 'Lock staircase', '26 m', 'climb, three chambers', { ok: true, vs: 80, vcol: C.amber }) +
      panamaMap(c, 160, 590, 640, 360, { r: 14 }) + check(770, 620, 12) +
      archivePhoto(c, 850, 600, 300, 340, { caption: 'GATUN LOCKS · 1914' }) + check(1130, 620, 12) +
      factCard(1210, 640, 520, 260, 'Source', 'Checked', 'every claim against the line it sits under', { vs: 48, vcol: C.green, rot: 4, op: 0.85 }),
  },
  {
    act: 'III', t: 15.5, title: 'Script',
    visual: 'Sources collapse into a structured script. Numbered beats; each line tagged with the visual it needs (MAP, CHART, DIAGRAM). Line 03 is highlighted.',
    motion: 'Text lines slide in from the right and lock to a baseline grid. Tags snap on after their line. Highlight bar wipes across line 03.',
    vo: '"…write it…"', sfx: 'Typewriter-soft ticks, much quieter than Act I.', next: 'The script lines stretch sideways into a waveform.',
    art: c => {
      const lines = [['In October 2023, the rain didn\'t come.', 'CHART'], ['Gatun Lake fell to its lowest level in years.', 'MAP'],
        ['Every ship that crosses uses 50 million gallons of fresh water.', 'GRAPHIC'], ['The locks climb 26 metres, one chamber at a time.', 'DIAGRAM'],
        ['So the canal did the only thing it could.', 'ARCHIVE'], ['It let fewer ships through.', 'MAP']];
      return stepper(2) + R(260, 190, 1400, 760, { r: 18, fill: C.s1, stroke: C.line2 }) + ML(310, 250, 'Script · v1 · 0:54', { size: 13 }) +
        ML(1610, 250, 'In your channel\'s voice', { size: 13, anchor: 'end', fill: C.green }) +
        lines.map(([l, tg], i) => {
          const y = 340 + i * 100, hi = i === 2;
          return (hi ? R(290, y - 52, 1340, 80, { r: 10, fill: C.green, fop: 0.1, stroke: C.green }) : '') +
            T(320, y, `0${i + 1}`, { f: M, size: 18, fill: hi ? C.green : C.t3 }) + T(390, y, l, { f: S, size: 34, w: hi ? 500 : 400, fill: hi ? C.text : C.t2 }) +
            tag(1490, y - 26, tg, hi ? C.green : C.t3, false, 12);
        }).join('');
    },
  },
  {
    act: 'III', t: 17.5, title: 'Voice',
    visual: 'The script lines stretch horizontally into bars, and the bars become a green voice waveform spanning the frame. Label VO · EN.',
    motion: 'Object transformation (the brief\'s transition system): each text line scales X ×4 and loses its letters into bars over 12 frames; bars ripple into waveform peaks.',
    vo: '"…voice it…"', sfx: 'A breath, then the first syllable of the read, bit-crushed into a soft digital texture.', next: 'Waveform drops into a timeline track.',
    art: c => stepper(3) +
      T(160, 330, 'Every ship that crosses uses 50 million gallons…', { f: S, size: 34, fill: C.t3, op: 0.6 }) +
      R(160, 380, 1100, 14, { r: 7, fill: C.t3, op: 0.35 }) + R(160, 420, 1400, 14, { r: 7, fill: C.green, op: 0.45 }) +
      waveform(160, 640, 1600, 260, 120, 7, C.green) + ML(160, 830, 'VO · EN · 00:54 · in your channel\'s voice', { size: 14 }) +
      T(1760, 830, '00:00:12:06', { f: M, size: 14, fill: C.green, anchor: 'end' }),
  },
  {
    act: 'III', t: 19.5, title: 'Sourced & edit',
    visual: 'The waveform drops into A1 of an edit timeline. Map, archive and lock-diagram clips fly into V1; graphics (−41%, 26 m, 50M gal) into V2; music bed into A2. Programme monitor above.',
    motion: 'Clips slide in on their tracks and butt-join with a satisfying snap. Playhead sweeps; the monitor updates per clip.',
    vo: '"…source every shot, and cut it."', sfx: 'Timeline snaps (magnetic clicks), a quick scrub.', next: 'Timeline folds up into a single player.',
    art: c => stepper(4) + player(c, 560, 160, 800, 450, panamaMap(c, 560, 160, 800, 450, { label: 'LAKE GATUN' }), { prog: 0.42, time: '00:22 / 00:54' }) +
      timeline(c, 160, 650, 1600, 330, { play: 0.42 }),
  },
  {
    act: 'III', t: 22.5, title: 'Compressed to a file',
    visual: 'The timeline tracks fold upward into one finished player. REVIEWED is next in the pills. The pace starts to slow.',
    motion: 'Tracks stack and collapse into the player\'s bottom edge (accordion). Start of the speed ramp: 100% → 40% over 2s.',
    vo: '(beat)', sfx: 'Sound thins out; music filter closes.', next: 'Brackets return around the player.',
    art: c => stepper(5) + player(c, 360, 170, 1200, 675, panamaMap(c, 360, 170, 1200, 675, { label: 'LAKE GATUN' }), { prog: 0.62, time: '00:33 / 00:54' }) +
      [0, 1, 2, 3].map(i => R(380 + i * 6, 870 + i * 22, 1160 - i * 12, 14, { r: 7, fill: [C.coral, '#4DB37E', C.green, C.t3][i], op: 0.5 - i * 0.1 })).join(''),
  },
  // ---------------- ACT IV — HUMAN QC ----------------
  {
    act: 'IV', t: 25.0, title: 'A person watches',
    visual: 'Slow motion. The brackets close around the player. A cursor scrubs; the caption reads "…a nurse named Rose Freedman…" but the picture is a generic stock skyline.',
    motion: 'Everything at 40% speed. Brackets settle with a long ease. Cursor drags the scrubber frame by frame.',
    vo: '"Then a person watches all of it."', sfx: 'Near silence. A slow, tactile scrub sound, frame ticks.', next: 'Freeze on the wrong shot.',
    art: c => stepper(5) + ML(420, 150, 'Review · frame by frame', { size: 14, fill: C.green }) +
      player(c, 360, 190, 1200, 675, skyline(c, 360, 190, 1200, 675) +
        R(560, 740, 800, 56, { r: 6, fill: '#000', op: 0.7 }) +
        TS(W / 2, 778, [['…a nurse named '], ['Rose Freedman', { fill: '#F2C94C', w: 600 }], ['…']], { f: S, size: 28, anchor: 'middle' }),
        { prog: 0.57, time: '00:31 / 00:54' }) +
      brackets(330, 160, 1260, 735, { len: 60, sw: 7 }) + cursor(1035, 850, 1.3),
  },
  {
    act: 'IV', t: 27.0, title: 'What a tool gives you',
    visual: 'Frame holds. Header: THE NARRATION SAYS "ROSE FREEDMAN". The stock skyline is marked with a coral cross: "A stock city skyline. Atmospheric, generic, and not her."',
    motion: 'Player shrinks left to a card; coral rule draws along its top edge. The cross stamps in with a small shake.',
    vo: '"An AI tool picks on mood…"', sfx: 'Dull, muted "wrong" blip.', next: 'The brackets lock onto the empty right side.',
    art: c => ML(160, 210, 'The narration says "Rose Freedman"', { size: 16, ls: 3 }) +
      R(160, 250, 760, 600, { r: 16, fill: C.s1, stroke: C.line2 }) + Ln(160, 251, 920, 251, { stroke: C.coral, sw: 3 }) +
      skyline(c, 184, 274, 712, 400, { r: 10 }) + cross(860, 314, 22) +
      ML(184, 718, 'What a tool gives you', { size: 13, fill: C.coral }) + T(184, 768, 'A stock city skyline', { f: D, w: 700, size: 40 }) +
      T(184, 810, 'Atmospheric, generic, and not her.', { f: S, size: 22, fill: C.t3 }) +
      R(1000, 250, 760, 600, { r: 16, stroke: C.line2, dash: '6 8' }) + T(1380, 560, '?', { f: D, w: 700, size: 120, fill: C.line2, anchor: 'middle' }),
  },
  {
    act: 'IV', t: 29.0, title: 'What we deliver',
    visual: 'The brackets lock onto the right card and her actual photograph lands: "Her photograph, 1911. Found, checked against the line it sits under, and cleared."',
    motion: 'Brackets snap with overshoot (.34,1.45,.64,1). Photo drops in like a print on a desk, 2° settle. Green rule draws; check pops.',
    vo: '"…we find her."', sfx: 'Crisp camera-shutter click + warm confirmation tone (the signature, softer).', next: 'Push into a checklist.',
    art: c => G(null, R(160, 250, 760, 600, { r: 16, fill: C.s1, stroke: C.line2 }) + skyline(c, 184, 274, 712, 400, { r: 10 }) + cross(860, 314, 22) +
        T(184, 768, 'A stock city skyline', { f: D, w: 700, size: 40 }), { op: 0.35 }) +
      ML(160, 210, 'What tools make. What we make.', { size: 16, ls: 3 }) +
      R(1000, 250, 760, 600, { r: 16, fill: C.s1, stroke: C.line2 }) + Ln(1000, 251, 1760, 251, { stroke: C.green, sw: 3 }) +
      archivePhoto(c, 1230, 280, 300, 400, { tr: 'rotate(-2 1380 480)' }) + check(1700, 314, 22) +
      ML(1024, 718, 'What we deliver', { size: 13, fill: C.green }) + T(1024, 768, 'Her photograph, 1911', { f: D, w: 700, size: 40 }) +
      T(1024, 810, 'Found, checked against the line, and cleared.', { f: S, size: 22, fill: C.t3 }) +
      brackets(980, 230, 800, 640, { len: 56, sw: 7 }),
  },
  {
    act: 'IV', t: 31.0, title: 'Fifteen points',
    visual: 'A clean checklist: the 15-point review. Items tick down two columns; counter reads 15 / 15. (Item wording is placeholder: swap in brew\'s real list.)',
    motion: 'Each row: check pops, text brightens from grey to white, 60ms stagger, accelerating slightly toward the end.',
    vo: '"Every frame, before you ever see it."', sfx: 'A rhythm of soft ticks that resolves into a chord.', next: 'Checklist fades; super comes forward.',
    art: c => {
      const items = ['Named people match the narration', 'Places dated and sourced', 'Numbers legible on pause', 'Spelling on screen', 'Voice matches the script',
        'Audio levels', 'Music sits under the voice', 'Pacing holds attention', 'Cuts land on the beat', 'Continuity', 'Captions in sync',
        'Grade consistent', 'No stock under a real name', 'Licences cleared', 'Watched start to finish'];
      return ML(160, 200, 'Review · 15-point list', { size: 16, ls: 3, fill: C.green }) + T(1760, 210, '15 / 15', { f: M, w: 500, size: 44, fill: C.green, anchor: 'end' }) +
        items.map((it, i) => {
          const col = i < 8 ? 0 : 1, row = i < 8 ? i : i - 8, x = 160 + col * 820, y = 290 + row * 86;
          return Ln(x, y + 30, x + 760, y + 30, { stroke: C.line }) + check(x + 18, y, 14) + T(x + 52, y + 9, it, { f: S, size: 28, fill: i === 14 ? C.text : C.t2, w: i === 14 ? 600 : 400 }) +
            T(x + 760, y + 8, String(i + 1).padStart(2, '0'), { f: M, size: 14, fill: C.t3, anchor: 'end' });
        }).join('');
    },
  },
  {
    act: 'IV', t: 33.0, title: 'Every frame watched by a person',
    visual: 'Hero type, the site\'s own line: "Every frame watched by a person." "person" in brand green, framed by small brackets. Pills: REVIEWED done, DELIVERED lights.',
    motion: 'Words rise through a mask, 40ms stagger; the brackets snap around "person". Speed returns to 100% on the cut out.',
    vo: '(VO rests; let the line read.)', sfx: 'The brew signature note, full.', next: 'Whip-pan to amber: YouTube.',
    aurora: 0.6,
    art: c => stepper(6) + title(160, 470, ['Every frame', 'watched by a'], { size: 150, w: 700, lh: 150, ls: -5 }) +
      T(160, 770, 'person.', { f: D, w: 800, size: 150, fill: C.green, ls: -5 }) + brackets(140, 640, 560, 170, { len: 34, sw: 6 }),
  },
  // ---------------- ACT V — WHAT WE MAKE ----------------
  {
    act: 'V', t: 34.5, title: 'YouTube: up to sixty minutes',
    visual: 'Amber accent (the site\'s YouTube colour). A timeline bar grows across the frame while the counter rolls 10:00 → 20:00 → 40:00 → 60:00. Everything brew does hangs off it as tags.',
    motion: 'Bar extends in 4 hits (one per milestone) with a slight overshoot each. Tags drop on strings and swing to rest.',
    vo: '"Long-form YouTube, up to sixty minutes…"', sfx: 'Four rising "stamp" hits on the milestones.', next: 'Bar folds into a finished video card.',
    art: c => {
      const tags = ['Ideation', 'Research', 'Script', 'Voice', 'Sourcing', 'Edit', 'Grade', 'Review'];
      return tag(160, 170, 'We run it', C.amber) + title(160, 300, ['YouTube videos, done for you.'], { size: 72, w: 600 }) +
        T(1760, 300, '60:00', { f: M, w: 500, size: 72, fill: C.amber, anchor: 'end' }) +
        R(160, 540, 1600, 18, { r: 9, fill: C.line }) + R(160, 540, 1600, 18, { r: 9, fill: C.amber }) +
        [10, 20, 40, 60].map(m => { const x = 160 + 1600 * m / 60; return Ln(x, 520, x, 578, { stroke: C.text, sw: 2 }) + T(x, 610, `${m}:00`, { f: M, size: 16, fill: C.t2, anchor: m === 60 ? 'end' : 'middle' }); }).join('') +
        tags.map((t, i) => { const x = 220 + i * 196, y = i % 2 ? 760 : 700; return Ln(x + 40, 558, x + 40, y - 30, { stroke: C.line2, dash: '3 5' }) + pill(x, y - 30, t, { state: 'done' }).svg; }).join('') +
        ML(160, 920, 'Three days · Two rounds of notes · Nine languages from the same edit', { size: 15 });
    },
  },
  {
    act: 'V', t: 39.5, title: 'A file, not a first draft',
    visual: 'The timeline folds into a finished, brand-neutral video card: map thumbnail with "PANAMA RAN DRY", 58:24 badge, "Ready to upload · Day 3". Super: "A file, not a first draft."',
    motion: 'Card scales up from the bar; thumbnail parallax 8px. Delivered tag stamps in.',
    vo: '"…three days, start to finish."', sfx: 'Soft whoosh into a clean "ding".', next: 'Hard cut to teal; the thumbnail\'s map dissolves into a prompt field.',
    art: c => tag(160, 170, 'We run it', C.amber) + videoCard(c, 860, 200, 900, {}) +
      title(160, 470, ['A file,', 'not a first', 'draft.'], { size: 96, w: 700, lh: 100, ls: -3 }) + ML(160, 800, 'Ready to upload · Day 3', { size: 15, fill: C.amber }),
  },
  {
    act: 'V', t: 43.0, title: 'AI b-roll: type the shot',
    visual: 'Teal accent, SELF SERVE tag (the site\'s own labelling). A prompt field: "our serum bottle, in a hand, on wet marble, morning light". Options: 1080p · 10s · 12.5 credits. Generate button.',
    motion: 'Typing with teal caret. Options flip in. Cursor glides to Generate and clicks (button depresses 2px).',
    vo: '"Need a shot that doesn\'t exist? Type it."', sfx: 'Lighter, faster keys than Act III; button click.', next: 'Button press blooms into the generated clip.',
    art: c => tag(160, 170, 'Self serve', C.teal) + T(1760, 196, 'CREDITS  240', { f: M, w: 500, size: 18, fill: C.t2, anchor: 'end', ls: 2 }) +
      title(160, 320, ['AI b-roll, on demand.'], { size: 72 }) +
      R(160, 430, 1600, 150, { r: 16, fill: C.s1, stroke: C.teal, sw: 1.5 }) +
      T(210, 522, 'our serum bottle, in a hand, on wet marble, morning light', { f: S, size: 40 }) + R(1290, 486, 4, 50, { fill: C.teal }) +
      ['1080p', '10 s', '16:9', '12.5 credits'].map((o, i) => pill(160 + i * 170, 610, o, { state: i === 3 ? 'active' : 'done', color: C.teal }).svg).join('') +
      R(1500, 610, 260, 64, { r: 10, fill: C.teal }) + T(1630, 652, 'Generate', { f: S, w: 600, size: 24, fill: C.bg, anchor: 'middle' }) + cursor(1660, 650, 1.3) +
      ML(160, 780, 'The shots stock libraries do not have', { size: 15 }),
  },
  {
    act: 'V', t: 46.0, title: 'Keep the shot',
    visual: 'The generated clip fills the frame: the serum bottle in a hand on wet marble. UI chips float over it: MP4 · 1080p · 0:10, "In your library · 3 min", Download.',
    motion: 'Clip expands from the button\'s bounds to full-bleed (shared-element transition). Subtle 3% push-in. Chips slide up, 40ms stagger.',
    vo: '"Download it in minutes."', sfx: 'Bloom swell; download "tok".', next: 'Clip shrinks into a vertical phone frame.',
    art: c => serumShot(c, 0, 0, W, H) + R(0, H - 260, W, 260, { fill: grad(c, [[0, '#000', 0], [1, '#000', 0.7]]) }) +
      tag(80, 80, 'Self serve', C.teal, true) +
      T(80, H - 130, 'Type the shot. Keep the shot.', { f: D, w: 700, size: 64, ls: -2 }) +
      T(80, H - 80, 'Two free re-rolls a clip. We eat the failures.', { f: S, size: 24, fill: C.t2 }) +
      R(1360, H - 190, 480, 110, { r: 14, fill: C.bg, op: 0.85 }) + ML(1390, H - 150, 'MP4 · 1080p · 0:10', { size: 15, fill: C.text }) +
      ML(1390, H - 112, 'In your library · 3 min', { size: 13, fill: C.teal }) + R(1700, H - 170, 116, 70, { r: 10, fill: C.teal }) +
      T(1758, H - 126, '↓', { f: S, w: 600, size: 34, fill: C.bg, anchor: 'middle' }),
  },
  {
    act: 'V', t: 49.0, title: 'UGC ads: hooks',
    visual: 'Coral accent. Three vertical ads side by side, each a different synthetic creator holding the same product. HOOK 01 / 02 / 03, burned-in captions, on-screen AI-GENERATED label.',
    motion: 'Phones flip in on Y axis, staggered. Captions highlight word by word (as on brew\'s commentary samples).',
    vo: '"Ads that look shot, not generated."', sfx: 'Three quick social-feed swipes, each a different voice snippet.', next: 'Phones duplicate into a grid.',
    art: c => tag(160, 170, 'We run it · UGC ads', C.coral) +
      phone(c, 440, 200, 340, 604, { label: 'Hook 01', caption: 'I was so wrong about serums', prop: true, pal: ['#4A3F3A', '#1E1A18', '#C99A7A', '#2A1E16', '#7A8F6B'], prog: 0.3 }) +
      phone(c, 790, 200, 340, 604, { label: 'Hook 02', caption: 'POV: 6am, no filter', prop: true, pal: ['#3A4452', '#171B22', '#8D5E42', '#1A1410', '#D9A441'], prog: 0.55 }) +
      phone(c, 1140, 200, 340, 604, { label: 'Hook 03', caption: 'okay this actually worked', prop: true, pal: ['#4A3A4F', '#1B161E', '#E0B394', '#6B3A1E', '#3FB8C4'], prog: 0.2 }) +
      ML(W / 2, 880, 'Synthetic cast only · AI label on screen', { size: 15, anchor: 'middle' }),
  },
  {
    act: 'V', t: 52.5, title: 'One concept, twelve ads',
    visual: 'The three phones multiply into a grid of 12: HOOK × DEMO × PAYOFF combinations. Counter: 1 concept → 12 ads ready to test.',
    motion: 'Grid builds outward from the centre column, 30ms stagger; camera pulls back to reveal scale. Counter rolls.',
    vo: '"Hooks, demos and payoffs, at the volume you actually test."', sfx: 'Rapid cascade of soft pops, one per ad.', next: 'Grid collapses into one horizontal video for languages.',
    art: c => {
      const pals = [['#4A3F3A', '#1E1A18', '#C99A7A', '#2A1E16', '#7A8F6B'], ['#3A4452', '#171B22', '#8D5E42', '#1A1410', '#D9A441'], ['#4A3A4F', '#1B161E', '#E0B394', '#6B3A1E', '#3FB8C4'], ['#3D4A40', '#161C18', '#B07E5E', '#222', '#E2634A']];
      const labels = ['Hook 01', 'Hook 02', 'Hook 03', 'Demo 01', 'Demo 02', 'Payoff'];
      let out = tag(160, 110, 'We run it · UGC ads', C.coral) + T(1760, 136, '1 concept → 12 ads', { f: M, w: 500, size: 26, fill: C.coral, anchor: 'end' }) +
        title(160, 210, ['Vertical ads that look shot, not generated.'], { size: 48, w: 600 });
      for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) {
        out += phone(c, 160 + k * 272, 250 + r * 380, 200, 356, { label: labels[k], pal: pals[(k + r) % 4], prop: k > 2, prog: ((k + r * 3) % 5) / 5 + 0.1 });
      }
      return out;
    },
  },
  {
    act: 'V', t: 56.0, title: 'Nine languages',
    visual: 'One finished video centre (EN). Eight copies fan out around it (DE FR ES PT IT PL ID DA), the exact nine on brew\'s site. Same picture in every copy; only the waveform under each changes.',
    motion: 'Copies clone out of the centre player along radial paths, 50ms stagger. Each waveform re-draws in a new shape while the picture stays locked.',
    vo: '"And when a video works, upload it nine times, not once."', sfx: 'One phrase of VO repeated, cross-fading through languages.', next: 'All nine stack into a film strip.',
    art: c => {
      const langs = ['DE', 'FR', 'ES', 'PT', 'IT', 'PL', 'ID', 'DA'];
      const pos = [[160, 250], [400, 250], [160, 520], [400, 520], [1320, 250], [1560, 250], [1320, 520], [1560, 520]];
      const mini = (x, y, w, h, code, seed, main) => {
        const hh = w * 9 / 16;
        return player(c, x, y, w, hh, panamaMap(c, x, y, w, hh), { prog: 0.4, r: 10 }) +
          R(x + 12, y + 12, main ? 70 : 52, main ? 38 : 30, { r: 4, fill: main ? C.green : C.bg, op: 0.9 }) +
          T(x + 12 + (main ? 35 : 26), y + (main ? 38 : 33), code, { f: M, w: 500, size: main ? 20 : 15, fill: main ? C.bg : C.text, anchor: 'middle' }) +
          waveform(x, y + hh + (main ? 36 : 24), w, main ? 44 : 26, main ? 90 : 50, seed, main ? C.green : C.t2);
      };
      return pos.map(([x, y], i) => mini(x, y, 200, 0, langs[i], i + 20)).join('') +
        mini(660, 250, 600, 0, 'EN', 2, true) +
        title(W / 2, 880, ['Upload it nine times, not once.'], { size: 72, anchor: 'middle', w: 600 }) + ML(W / 2, 940, 'Same edit · new voice · nine languages', { size: 15, anchor: 'middle', fill: C.green });
    },
  },
  {
    act: 'V', t: 62.0, title: 'The thumbnail, drawn by a person',
    visual: 'A film strip of frames from the actual video. The brackets pick one real frame; it lifts out and type is set over it by hand: "PANAMA RAN DRY". Label: DRAWN BY A PERSON.',
    motion: 'Strip scrolls R→L, decelerates; brackets snap to frame 3; frame lifts (shadow grows) and scales to the thumbnail canvas. Type slams in, 2 words.',
    vo: '"Even the thumbnail is drawn by a person."', sfx: 'Strip whir slowing to a stop; pen-tablet scribble; stamp.', next: 'Thumbnail slides away; the old loop ghosts back in.',
    art: c => {
      let strip = '';
      for (let i = 0; i < 7; i++) {
        const x = 110 + i * 250, w = 230, h = 130;
        strip += i % 3 === 1 ? archivePhoto(c, x, 170, w, h + 20, { caption: '1914' }) : panamaMap(c, x, 180, w, h, { r: 6, quiet: true });
      }
      return strip + brackets(590, 155, 270, 180, { len: 24, sw: 5 }) +
        P('M725 340 C 760 420, 820 450, 900 470', { stroke: C.green, sw: 2, dash: '4 6' }) +
        G(null, panamaMap(c, 560, 420, 800, 450, { r: 12, quiet: true }) +
          T(600, 760, 'PANAMA', { f: D, w: 800, size: 120, fill: '#111', ls: -4 }) + T(600, 850, 'RAN DRY', { f: D, w: 800, size: 120, fill: C.coral, ls: -4 }) +
          R(560, 420, 800, 450, { r: 12, stroke: C.text, sw: 2 })) +
        tag(1400, 440, 'Drawn by a person', C.green) + T(1400, 520, 'From a frame', { f: S, size: 26, fill: C.t2 }) + T(1400, 556, 'actually in the film.', { f: S, size: 26, fill: C.t2 }) +
        T(1400, 620, 'No prompt. No six-fingered hands.', { f: S, size: 20, fill: C.t3 });
    },
  },
  // ---------------- ACT VI — PAYOFF ----------------
  {
    act: 'VI', t: 65.0, title: 'The loop, one last time',
    visual: 'The Act I loop ghosts back in, grey, then collapses into a single green button: "Send us a script →" (brew\'s real CTA). The cursor clicks it.',
    motion: 'Ring cards fall inward and dissolve into the button (gravity well). Click: button depresses, two green ripple rings.',
    vo: '"You don\'t manage any of that."', sfx: 'Reverse of the Act I notification cluster, sucked into one click.', next: 'Button blooms into the finished file.',
    art: c => ring({ grey: true, op: 0.22, rx: 560, ry: 300, s: 0.75 }) +
      Ci(W / 2, H / 2 + 20, 240, { stroke: C.green, sw: 1.5, op: 0.15 }) + Ci(W / 2, H / 2 + 20, 170, { stroke: C.green, sw: 2, op: 0.3 }) +
      R(W / 2 - 220, H / 2 - 20, 440, 84, { r: 10, fill: C.green }) + T(W / 2, H / 2 + 34, 'Send us a script  →', { f: S, w: 600, size: 32, fill: C.bg, anchor: 'middle' }) +
      cursor(W / 2 + 120, H / 2 + 36, 1.4),
  },
  {
    act: 'VI', t: 67.0, title: 'You approve',
    visual: 'One finished file: panama-canal_final.mp4 · 58:24 · 1080p · READY TO UPLOAD, with a single Approve button. Super, two lines: "You approve." / "You don\'t assemble."',
    motion: 'File card rises; "You approve." types on; cursor clicks Approve (check fills); "You don\'t assemble." lands on the click.',
    vo: '"You approve. You don\'t assemble."', sfx: 'One clean click; the brew signature begins.', next: 'Card flips to the end card.',
    art: c => title(160, 420, ['You approve.'], { size: 130, w: 700, ls: -4 }) + title(160, 560, ['You don\'t assemble.'], { size: 130, w: 700, ls: -4, fill: C.t3 }) +
      R(160, 680, 1000, 150, { r: 16, fill: C.s1, stroke: C.line2 }) + R(190, 712, 150, 86, { r: 8, fill: '#4DB37E', op: 0.6 }) +
      T(370, 748, 'panama-canal_final.mp4', { f: M, w: 500, size: 24 }) + ML(370, 790, '58:24 · 1080p · Ready to upload', { size: 14 }) +
      R(930, 718, 200, 74, { r: 10, fill: C.green }) + P('M962 755L970 763L986 745', { stroke: C.bg, sw: 4, cap: 'round', join: 'round' }) + T(1060, 765, 'Approve', { f: S, w: 600, size: 24, fill: C.bg, anchor: 'middle' }) +
      cursor(1080, 770, 1.3),
  },
  {
    act: 'VI', t: 69.5, title: 'End card',
    visual: 'brew logo in brackets. "Your first video is free." scalewithbrew.com. Product row: YouTube videos (amber) · AI b-roll (teal) · UGC ads (coral). "Scale With Brew" small.',
    motion: 'Brackets draw in; logo resolves; lines fade up on 40ms stagger. Hold 2s. Aurora rake drifts slowly. Cut to black on the last note.',
    vo: '"Your first video is free. brew."', sfx: 'brew signature resolves; tail out.', next: 'Black.',
    aurora: 1,
    art: c => brackets(W / 2 - 290, 200, 580, 320, { len: 56, sw: 8 }) +
      TS(W / 2, 425, [['br'], ['e', { fill: C.green }], ['w']], { f: D, w: 800, size: 190, anchor: 'middle', ls: -7 }) +
      title(W / 2, 640, ['Your first video is free.'], { size: 72, anchor: 'middle', w: 600 }) +
      T(W / 2, 710, 'scalewithbrew.com', { f: M, w: 500, size: 28, fill: C.green, anchor: 'middle', ls: 1 }) +
      [['YouTube videos', C.amber], ['AI b-roll', C.teal], ['UGC ads', C.coral]].map(([l, col], i) => {
        const x = W / 2 - 390 + i * 280;
        return Ci(x, 820, 7, { fill: col }) + T(x + 20, 828, l, { f: S, w: 500, size: 24, fill: C.t2 });
      }).join('') + ML(W / 2, 920, 'Scale With Brew · Every frame watched by a person', { size: 13, anchor: 'middle', ls: 3 }),
  },
];
