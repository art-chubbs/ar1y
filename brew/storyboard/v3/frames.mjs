// Storyboard v3 — "light & calm" SaaS launch, modelled on the Numtera reference (ObiN Studio), in brew's brand.
import { C, D, S, M, W, H, T, TS, R, Ln, Ci, P, G, ML, grad, rgrad, clipRect, check, cursor, brackets,
  L, tw, blur, fx, lightBg, darkBg, line, blurWord, shadowCard, lapp, lwindow, chip, btn, scrNew, projectCard, logPanel,
  msgCard, fileCard, miniTimeline, invoiceCard } from './kit.mjs';
import { panamaMap, archivePhoto, serumShot, phone } from '../art.mjs';
import { thumb } from '../v2/ui.mjs';

// OPTS.flatUI = true lays every app window flat and straight (used for the After Effects export).
export const OPTS = { flatUI: false };
const tilt = (cx, cy, k = 1) => OPTS.flatUI ? null : `translate(${cx} ${cy}) skewY(${-3.5 * k}) skewX(${9 * k}) scale(${1 - 0.05 * k} ${1 - 0.12 * k}) translate(${-cx} ${-cy})`;

// The floating "mess" behind the hook — depth of field: near cards sharp, far cards blurred.
const mess = (c, o = {}) => {
  const far = fx(
    msgCard(c, 120, 140, 'Editor', 'can we push the deadline?', C.teal) + fileCard(c, 1380, 120, 'script_v7_notes.docx', 'Edited 2 days ago') +
    invoiceCard(c, 1560, 640) + fileCard(c, 80, 820, 'broll_maybe.zip', '2.4 GB · uploading…', { col: C.amber }), blur(c, 7), 0.55);
  const near = miniTimeline(c, 160, 330, 520) + msgCard(c, 1240, 330, 'Client', 'any update on the edit?', C.amber) +
    fileCard(c, 1180, 470, 'v3_FINAL_final.mp4', '1.8 GB · 3 versions') + msgCard(c, 300, 690, 'Freelancer', 'sorry, running a day late', C.coral);
  return far + G(null, near, { op: o.near ?? 1 });
};

const PROJECT_LOG = [
  ['check', 'Topic received'], ['progress', 'Researching · 14 sources', 1], ['found', 'Verified source found', 'Panama Canal Authority · 2023'],
  ['check', 'Script v1 · 6 beats · your voice'], ['check', 'Voice recorded · 00:54'], ['done', 'Edit assembled · ready for review'], ['ghost'],
];

export const ACTS = [['1', 'The problem', '0:00–0:12'], ['2', 'Meet brew', '0:12–0:22'], ['3', 'We make it', '0:22–0:52'], ['4', 'You drive it', '0:52–1:11'], ['5', 'Close', '1:11–1:30']];

export const FRAMES = [
  // ---------- 1. THE PROBLEM ----------
  {
    act: '1', t: 0, title: 'Typed: "The same video."',
    visual: 'Clean off-white stage, a soft green glow far below frame. One centred line typed on with a blinking caret.',
    motion: 'Typing at a natural pace with tiny timing jitter; caret blinks on the off-beats. Ref: Numtera opens the same way ("The same issue|").',
    vo: '(none; on-screen type carries it)', sfx: 'Soft key taps, room tone.', next: 'The line extends; UI cards fade in around it.',
    art: c => lightBg(c, { g: 0.25, t: 0.15 }) + line(W / 2, 560, [['The same video']], { caret: true }),
  },
  {
    act: '1', t: 2, title: 'The mess, in depth',
    visual: '"The same video, a different editor." Floating light-UI fragments of making video by hand: a timeline, client nudges, v3_FINAL_final.mp4, an overdue invoice. Near cards sharp, far ones blurred.',
    motion: 'Slow parallax drift (near cards move 3× the far ones). Rack focus breathes between layers. Ref: floating ticket UI with depth of field.',
    vo: '—', sfx: 'Muted notification pings, low in the mix.', next: 'A selection highlight sweeps over "a different editor".',
    art: c => lightBg(c, { g: 0.3, t: 0.2 }) + mess(c) + R(560, 500, 800, 90, { r: 12, fill: L.paper, op: 0.85 }) +
      line(W / 2, 562, [['The same video, a different editor.']], { size: 54 }),
  },
  {
    act: '1', t: 4.5, title: 'Selection highlight',
    visual: 'The words "a different editor" get selected, in brew green with white text, like a cursor dragging across a doc.',
    motion: 'Highlight wipes L→R in 300 ms (e-out). Cards behind keep drifting. Ref: the "Different channels" selection.',
    vo: '—', sfx: 'A soft text-select "tick".', next: 'Line retypes into the question.',
    art: c => lightBg(c, { g: 0.3, t: 0.2 }) + mess(c) + R(560, 500, 800, 90, { r: 12, fill: L.paper, op: 0.85 }) +
      line(W / 2, 562, [['The same video, '], ['a different editor', { sel: true }], ['.']], { size: 54 }),
  },
  {
    act: '1', t: 6.5, title: 'Same brief… again?',
    visual: '"Same brief… again?" The near cards slide out of frame; only blurred far cards remain.',
    motion: 'Near layer exits with gravity (down-left) over 0.5 s; type stays dead centre.',
    vo: '—', sfx: 'Exhale-like whoosh.', next: 'Hard cut to a huge motion-blurred "Stop".',
    art: c => lightBg(c, { g: 0.3, t: 0.2 }) + mess(c, { near: 0 }) + line(W / 2, 562, [['Same brief… again?']], { size: 64 }),
  },
  {
    act: '1', t: 8.5, title: '"Stop"',
    visual: 'One giant word, "Stop", crashing toward camera with horizontal motion blur and a ghost trail.',
    motion: 'Scale 0.7 → 1.15 with a 6-frame directional blur, then snaps sharp. Ref: Numtera\'s "Stop".',
    vo: '—', sfx: 'Sub drop + whoosh hit.', next: '"Stop assembling videos." types beside it as it shrinks.',
    art: c => lightBg(c, { g: 0.45, t: 0.35 }) + blurWord(c, W / 2, 640, 'Stop', { size: 380, blur: 14, ghost: 40, w: 600 }),
  },
  {
    act: '1', t: 10, title: '"Stop assembling videos."',
    visual: '"Stop" settles small; "assembling videos." resolves out of blur beside it, one word at a time.',
    motion: 'Each word focus-pulls in (blur 18 → 0) with a 120 ms stagger. A thin green arc sweeps behind.',
    vo: '—', sfx: 'Two soft clicks on the words.', next: 'Background floods into the brew gradient; "Meet" pulls focus.',
    art: c => lightBg(c, { g: 0.45, t: 0.35 }) + line(W / 2, 560, [['Stop '], ['assembling ', { op: 0.6 }], ['videos.', { op: 0.35 }]], { size: 72 }) +
      P('M 260 900 C 700 500, 1200 380, 1760 300', { stroke: C.green, sw: 2, op: 0.4 }),
  },
  // ---------- 2. MEET BREW ----------
  {
    act: '2', t: 12, title: '"Meet" focus pull',
    visual: 'The gradient takes over: off-white top, green → teal glow rising from below. "Meet" pulls into focus left to right: M sharp, "et" still soft.',
    motion: 'Rack focus across the word in 600 ms. Glow breathes up 5%. Ref: Numtera\'s thumbnail "Meet".',
    vo: '"Meet…"', sfx: 'Music enters: warm pad + light pulse.', next: 'Word shrinks left; the brew mark slides in after it.',
    art: c => lightBg(c, { g: 0.9, t: 0.7, at: [1500, 1080] }) +
      G(null, T(560, 690, 'Me', { f: S, w: 500, size: 300, fill: L.ink, ls: -9 }), {}) + fx(T(560 + tw('Me', 300, 500) - 18, 690, 'et', { f: S, w: 500, size: 300, fill: C.green, ls: -9 }), blur(c, 10)),
  },
  {
    act: '2', t: 13.5, title: 'Meet [mark] brew',
    visual: '"Meet  [e]  brew": the brew mark (green viewfinder brackets holding a green "e") slides in between the two words, then "brew" lands in the wordmark style.',
    motion: 'Mark enters with a short horizontal blur, brackets snap closed (overshoot). Ref: the Numtera icon dropping between "Meet" and the name.',
    vo: '"…brew."', sfx: 'The brew signature chord.', next: 'Line wipes into the positioning statement.',
    art: c => {
      const y = 600, s = 120, mw = tw('Meet', s, 500), bw = 150, total = mw + 40 + bw + 40 + tw('brew', s, 700, D);
      const x0 = W / 2 - total / 2, bx = x0 + mw + 40;
      return lightBg(c, { g: 0.9, t: 0.7, at: [1500, 1080] }) + T(x0, y, 'Meet', { f: S, w: 500, size: s, fill: L.ink, ls: -3 }) +
        R(bx, y - 118, bw, bw, { r: 30, fill: L.white }) + brackets(bx + 22, y - 96, bw - 44, bw - 44, { len: 24, sw: 7 }) + T(bx + bw / 2, y - 12, 'e', { f: D, w: 800, size: 96, fill: C.green, anchor: 'middle' }) +
        TS(bx + bw + 40, y, [['br'], ['e', { fill: C.green }], ['w']], { f: D, w: 800, size: s, fill: L.ink, ls: -4 });
    },
  },
  {
    act: '2', t: 16, title: 'Positioning line',
    visual: '"The AI-powered video studio, watched by people." "watched by people" in brew green. Calm, centred, small.',
    motion: 'Words fade-rise in 40 ms stagger; green words arrive last with a tiny glow pulse.',
    vo: '"The AI-powered video studio, watched by people."', sfx: 'Pad swells.', next: 'Camera tilts down into the product.',
    art: c => lightBg(c, { g: 0.9, t: 0.7, at: [1500, 1080] }) + line(W / 2, 560, [['The AI-powered video studio, '], ['watched by people.', { fill: C.green }]], { size: 56 }),
  },
  {
    act: '2', t: 19, title: 'Product reveal in perspective',
    visual: 'brew Studio (light theme) sweeps up in 3D perspective out of the glow. Top-right label: "For channels that post every week".',
    motion: 'Camera cranes down + rotates 18° → 6° over 2.5 s. Heavy depth of field on the window\'s far edge. Ref: the "For Complex Operations" reveal.',
    vo: '"For channels that post every week."', sfx: 'Air swell, glassy shimmer as the edge catches light.', next: 'Push into the New video form.',
    art: c => lightBg(c, { g: 1, t: 0.8, at: [1300, 1120] }) + G(tilt(960, 600, 1.1), lapp(c, 300, 230, 1320, 760, 'New video', scrNew)) +
      T(1840, 140, 'For channels that', { f: S, w: 500, size: 40, fill: C.green, anchor: 'end' }) + T(1840, 190, 'post every week', { f: S, w: 500, size: 40, fill: C.green, anchor: 'end' }),
  },
  // ---------- 3. WE MAKE IT ----------
  {
    act: '3', t: 22, title: 'One line in',
    visual: 'Straight-on New video screen. The topic "Why the Panama Canal ran short of water" is typed; the cursor clicks "Send to brew".',
    motion: 'Slow push 4%. Typing with caret. Click compresses the button 2 px; a green ring pulses out.',
    vo: '"Send a topic, or a script."', sfx: 'Keys; a crisp click.', next: 'The UI blurs away; the project card isolates into white space.',
    art: c => lightBg(c, { g: 0.7, t: 0.5 }) + lapp(c, 160, 110, 1600, 860, 'New video', scrNew) + cursor(1630, 590, 1.6) + Ci(1610, 575, 40, { stroke: C.green, sw: 2, op: 0.5 }),
  },
  {
    act: '3', t: 24.5, title: 'The card isolates',
    visual: 'The new project card lifts out of the interface and floats alone in white space; the app behind it melts into blur.',
    motion: 'Card scales 1 → 1.4 toward camera while the UI behind defocuses (blur 0 → 24). Ref: the single ticket card pulled out of the inbox.',
    vo: '—', sfx: 'Soft lift whoosh.', next: 'A dark panel slides in from the right: the split screen.',
    art: c => lightBg(c, { g: 0.7, t: 0.5 }) + fx(lapp(c, 160, 110, 1600, 860, 'In production', scrNew), blur(c, 16), 0.55) +
      G('translate(960 520) scale(1.45) translate(-380 -68)', projectCard(c, 0, 0, 760, { active: 0 })),
  },
  {
    act: '3', t: 26.5, title: 'HERO: the production panel',
    visual: 'Split screen. Left, light: the project card. Right, brew-dark: a monospace system panel ticking down the whole job: topic received → researching 14 sources → verified source found → script → voice → edit assembled. A green arrow links card to panel.',
    motion: 'Dark panel wipes in from the right (shape transition, hard vertical edge). Rows land one per beat over a 6 s hold (the reference\'s longest beat); progress bars fill in real time. Ref: Numtera\'s "Connected to your infrastructure" knowledge-lock moment.',
    vo: '"We research it, write it, voice it, and cut it."', sfx: 'Beat drops in; a mechanical tick per row.', next: 'Panel completes; the light half wipes back over.',
    art: c => R(0, 0, W, H, { fill: L.paper }) + lightBg(c, { g: 0.35, t: 0.25, at: [500, 1150] }) +
      G('translate(120 470) scale(1.0)', projectCard(c, 0, 0, 760, { active: 4 })) +
      R(1000, 0, 920, H, { fill: C.bg }) + `<ellipse cx="1900" cy="1080" rx="620" ry="420" fill="${rgrad(c, [[0, C.green, 0.35], [1, C.green, 0]], { r: 0.5 })}"/>` +
      Ln(880, 538, 1040, 538, { stroke: C.green, sw: 2 }) + `<polygon points="1040,530 1056,538 1040,546" fill="${C.green}"/>` +
      logPanel(c, 1080, 150, 740, PROJECT_LOG),
  },
  {
    act: '3', t: 32.5, title: 'A person reviews it { frame by frame }',
    visual: 'White stage. "A person reviews it { frame by frame }" with the braces and phrase in green IBM Plex Mono.',
    motion: 'Sentence fades in; the braced phrase types on last. Ref: "Agent Approves it as { learning }".',
    vo: '"Then a person reviews it, frame by frame."', sfx: 'Music thins to the pad.', next: 'Words fall away; "{ frame by frame }" stretches into a green bar.',
    art: c => lightBg(c, { g: 0.2, t: 0.15 }) + line(W / 2, 560, [['A person reviews it  '], ['{ frame by frame }', { fill: C.green }]], { size: 60 }),
  },
  {
    act: '3', t: 34.5, title: 'Shape morph: phrase → bar',
    visual: 'The braced phrase stretches into a full-width green bar reading "reviewing…" with a progress track.',
    motion: 'Shape transition: the text block\'s bounds morph into a 1700 px bar (e-in-out, 500 ms) and the text cross-dissolves to mono "reviewing…". Ref: "{ learning }" → "learning…" bar.',
    vo: '—', sfx: 'Rising tone that tracks the bar.', next: 'The bar shrinks into the header of a review card.',
    art: c => lightBg(c, { g: 0.2, t: 0.15 }) + R(110, 470, 1700, 120, { r: 10, fill: C.green }) + T(160, 545, 'reviewing…', { f: M, w: 500, size: 44, fill: '#FFF' }) +
      R(160, 566, 1600, 6, { r: 3, fill: '#FFFFFF', op: 0.35 }) + R(160, 566, 140, 6, { r: 3, fill: '#FFF' }),
  },
  {
    act: '3', t: 36.5, title: 'Review card + scan line',
    visual: 'The bar is now the green header of a small review card: the Rose Freedman frame, a scan line sweeping across it, and a log underneath: "Named people match the narration ✓ / Places dated and sourced ✓ / Numbers legible on pause ✓".',
    motion: 'Scan line passes top → bottom twice (teal glow). Log lines type on in mono. Ref: the ticket card being scanned.',
    vo: '"Every name, every place, every number. Checked."', sfx: 'Soft scanner hum; ticks.', next: 'Card resolves to "Review complete".',
    art: c => lightBg(c, { g: 0.35, t: 0.3, at: [1700, 200] }) + shadowCard(c, 660, 250, 600, 580, { r: 14 }) +
      R(660, 250, 600, 46, { r: 14, fill: C.green }) + R(660, 280, 600, 16, { fill: C.green }) + T(684, 280, 'reviewing…   15 / 15', { f: M, w: 500, size: 15, fill: '#FFF' }) +
      R(684, 316, 552, 300, { r: 8, fill: '#E9E1CE' }) + archivePhoto(c, 860, 326, 200, 280) +
      R(684, 450, 552, 3, { fill: C.teal }) + `<rect x="684" y="420" width="552" height="30" fill="${grad(c, [[0, C.teal, 0], [1, C.teal, 0.35]])}"/>` +
      ['Named people match the narration', 'Places dated and sourced', 'Numbers legible on pause', 'Watched start to finish'].map((s, i) =>
        check(700, 656 + i * 40, 9) + T(720, 662 + i * 40, s, { f: M, size: 15, fill: L.ink2 })).join(''),
  },
  {
    act: '3', t: 39.5, title: 'Review complete',
    visual: 'Card collapses to a compact confirmation: "Review complete · Approved for delivery" with the reviewer: "Watched by Maya K. · all 54 seconds".',
    motion: 'Card height animates down (shape morph) with content cross-fading; a check draws on.',
    vo: '—', sfx: 'Warm confirmation tone.', next: 'Hard cut to brew-dark statement.',
    art: c => lightBg(c, { g: 0.35, t: 0.3, at: [1700, 200] }) + shadowCard(c, 660, 420, 600, 200, { r: 14 }) +
      R(660, 420, 600, 46, { r: 14, fill: C.green }) + R(660, 450, 600, 16, { fill: C.green }) + T(684, 450, 'Review complete', { f: M, w: 500, size: 15, fill: '#FFF' }) +
      check(708, 520, 16) + T(740, 528, 'Approved for delivery', { f: S, w: 600, size: 24, fill: L.ink }) +
      Ci(712, 580, 16, { fill: C.amber }) + T(712, 585, 'MK', { f: S, w: 600, size: 11, fill: '#FFF', anchor: 'middle' }) + T(740, 586, 'Watched by Maya K. · all 54 seconds', { f: S, size: 16, fill: L.ink3 }),
  },
  {
    act: '3', t: 41.5, title: 'it turns your idea into…',
    visual: 'brew-dark stage with green and teal light leaks in opposite corners. "it turns your idea into" small, centred, soft grey-white.',
    motion: 'Words drift in with blur → sharp. Light leaks slowly rotate. Ref: "it turns the solution into".',
    vo: '"It turns your idea into…"', sfx: 'Bass swell.', next: 'Brackets snap around the payoff phrase.',
    art: c => darkBg(c) + line(W / 2, 560, [['it turns your idea into']], { size: 52, ink: C.t2 }),
  },
  {
    act: '3', t: 43.5, title: '[ A finished file ]',
    visual: 'brew\'s viewfinder brackets close around "A finished file" in green. The brackets are the brand mark, so this is the logo device doing the talking.',
    motion: 'Brackets snap in with overshoot; then the camera zooms THROUGH the brackets (they fly past the lens) into the next shot. Ref: "[ Reusable knowledge ]".',
    vo: '"…a finished file."', sfx: 'Snap + whoosh-through.', next: 'Through the brackets into the Library.',
    art: c => darkBg(c) + brackets(W / 2 - 420, 450, 840, 170, { len: 46, sw: 7 }) + line(W / 2, 560, [['A finished file', { fill: C.green }]], { size: 72, w: 600 }),
  },
  {
    act: '3', t: 45.5, title: 'Delivered, in the Library',
    visual: 'Light Library screen in soft perspective; the Panama film appears at the top as "Delivered · Day 3" with a green chip. Cursor hovers it.',
    motion: 'New card drops in, pushing the grid down (layout animation). Slow lateral glide. Glow from bottom-right.',
    vo: '"Ready to upload. Day three."', sfx: 'Card drop; soft ding.', next: 'Cut to the big blurred word "Delivered."',
    art: c => lightBg(c, { g: 0.8, t: 0.6, at: [1600, 1120] }) + G(tilt(960, 560, 0.5), lwindow(c, 220, 160, 1480, 820, (() => {
      let s = ML(500, 230, 'Library · 11 delivered', { size: 11, fill: C.green });
      for (let i = 0; i < 6; i++) {
        const x = 500 + (i % 3) * 390, y = 260 + Math.floor(i / 3) * 330;
        s += (i === 0 ? R(x - 6, y - 6, 362, 300, { r: 14, stroke: C.green, sw: 2 }) : '') + thumb(c, x, y, 350, 197, ['map', 'archive', 'paper', 'cartoon', 'archive', 'meme'][i]) +
          T(x, y + 230, i === 0 ? 'Why the Panama Canal Ran Short of Water' : ['The 1919 Boston Molasses Tank', 'Why You Still Get Goosebumps', 'Why Your Diet Starts on Monday', 'The 1904 Olympic Marathon', 'Switzerland in meme format'][i - 1], { f: S, w: 600, size: 15, fill: L.ink }) +
          (i === 0 ? chip(x, y + 248, 'Delivered · Day 3', C.green) : T(x, y + 256, 'Delivered', { f: S, size: 13, fill: L.ink3 }));
      }
      return lsidebarLib() + s;
    })())) + cursor(860, 420, 1.5),
  },
  {
    act: '3', t: 48, title: '"Delivered."',
    visual: 'brew gradient. One big word, "Delivered.", resolving out of blur.',
    motion: 'Focus pull, 500 ms. Hold. Ref: "Auto-resolved".',
    vo: '—', sfx: 'Hit on the downbeat.', next: '"And" crashes in with motion blur.',
    art: c => lightBg(c, { g: 0.9, t: 0.7, at: [1500, 1080] }) + blurWord(c, W / 2, 600, 'Delivered.', { size: 200, blur: 3 }),
  },
  {
    act: '3', t: 50, title: '"And"',
    visual: 'brew-dark. A huge white "And" sweeping left with heavy motion blur.',
    motion: 'Whip-pan: the word travels L 400 px with directional blur. Ref: Numtera\'s "And".',
    vo: '"And…"', sfx: 'Whoosh L.', next: 'Small line: "when you need one exact shot".',
    art: c => darkBg(c, { lx: 1700, ly: 1000, rx: 200, ry: 80 }) + blurWord(c, 760, 680, 'And', { size: 360, fill: C.text, blur: 22, ghost: 60, w: 600 }),
  },
  // ---------- 4. YOU DRIVE IT ----------
  {
    act: '4', t: 52, title: 'You can type the shot',
    visual: 'Dark. "when you need one exact shot" then "you can type it yourself", with "type" in teal (b-roll\'s colour on the site).',
    motion: 'Words space out and slide together (tracking animation). Ref: "You can define the response".',
    vo: '"When you need one exact shot, you can type it yourself."', sfx: 'Light keys.', next: 'Teal glass dropdown opens on a bright gradient.',
    art: c => darkBg(c, { lx: 1700, ly: 1000, rx: 200, ry: 80 }) + line(W / 2, 500, [['when you need one exact shot']], { size: 44, ink: C.t3 }) +
      line(W / 2, 600, [['you can '], ['type', { fill: C.teal }], [' it yourself']], { size: 56, ink: C.text }),
  },
  {
    act: '4', t: 54.5, title: 'Glass menu → AI b-roll',
    visual: 'Bright teal-white gradient. A frosted brew menu opens; the cursor slides to "AI b-roll".',
    motion: 'Menu unfolds from its header (scaleY with 40 ms item stagger); hover highlight follows cursor. Ref: Numtera menu → Workflows.',
    vo: '—', sfx: 'Glassy tick per item.', next: 'Zoom into the b-roll screen in perspective.',
    art: c => lightBg(c, { g: 0.5, t: 1, at: [1500, 1100] }) + shadowCard(c, 760, 300, 400, 440, { r: 16, fill: '#FFFFFF', op: 0.92 }) +
      brackets(784, 324, 28, 28, { len: 8, sw: 3 }) + T(798, 345, 'e', { f: D, w: 800, size: 18, fill: C.green, anchor: 'middle' }) + T(828, 347, 'brew', { f: D, w: 800, size: 20, fill: L.ink }) +
      ML(784, 400, 'Workspace', { size: 10, fill: L.ink3 }) +
      ['New video', 'Library', 'Languages', 'AI b-roll', 'UGC ads'].map((n, i) => (i === 3 ? R(772, 418 + i * 56, 376, 44, { r: 8, fill: C.teal, fop: 0.14 }) : '') +
        T(800, 448 + i * 56, n, { f: S, size: 18, w: i === 3 ? 600 : 400, fill: L.ink })).join('') + cursor(1020, 590, 1.5),
  },
  {
    act: '4', t: 56.5, title: 'Macro: filling the shot',
    visual: 'Macro on two form fields, huge and soft-edged: "Describe the shot" → "Our serum bottle, in a hand, on wet marble"; "Length" → "10 s".',
    motion: 'Fields slide up as the camera tracks down the form; text types in. Shallow depth of field, background washed teal. Ref: "Workflow Name (Button Label)" macro.',
    vo: '—', sfx: 'Close keys.', next: 'Pull back: four takes appear.',
    art: c => lightBg(c, { g: 0.4, t: 1, at: [1500, 1100] }) + T(220, 330, 'Describe the shot', { f: S, w: 500, size: 50, fill: L.ink }) +
      R(200, 370, 1720, 130, { r: 26, fill: '#FFFFFF', op: 0.75 }) + T(250, 455, 'Our serum bottle, in a hand, on wet marble', { f: S, size: 58, fill: L.ink }) + R(250 + tw('Our serum bottle, in a hand, on wet marble', 58, 400) + 8, 405, 4, 64, { fill: C.teal }) +
      T(220, 640, 'Length', { f: S, w: 500, size: 50, fill: L.ink, op: 0.8 }) + R(200, 680, 600, 130, { r: 26, fill: '#FFFFFF', op: 0.6 }) + T(250, 765, '10 s', { f: S, size: 58, fill: L.ink3 }),
  },
  {
    act: '4', t: 60, title: 'Four takes, keep one',
    visual: 'Glass panel with four generated takes in a 2×2. One gets a teal outline and a "Keep" button. Credits counter top-right.',
    motion: 'Takes resolve from soft noise to sharp, 60 ms stagger. Cursor clicks Keep; the chosen take lifts forward.',
    vo: '"Download it in minutes."', sfx: 'Shimmer resolve; click.', next: 'Kept take flips into a vertical UGC ad.',
    art: c => lightBg(c, { g: 0.4, t: 0.9, at: [1500, 1100] }) + shadowCard(c, 360, 150, 1200, 780, { r: 18, fill: '#FFFFFF', op: 0.9 }) +
      ML(400, 200, 'AI b-roll · 4 takes', { size: 11, fill: C.teal }) + T(1520, 200, 'CREDITS 240', { f: M, size: 12, fill: L.ink3, anchor: 'end', ls: 2 }) +
      [0, 1, 2, 3].map(i => { const x = 400 + (i % 2) * 570, y = 230 + Math.floor(i / 2) * 340; return serumShot(c, x, y, 550, 310, { r: 12 }) + (i === 1 ? R(x - 4, y - 4, 558, 318, { r: 14, stroke: C.teal, sw: 4 }) + btn(x + 530, y + 254, 'Keep', { anchor: 'end', col: C.teal }) : ''); }).join('') +
      cursor(1460, 520, 1.5),
  },
  {
    act: '4', t: 63, title: 'UGC ad, step by step',
    visual: 'The kept take is now inside a vertical ad on the left. Right: numbered steps like a builder: 1 HOOK "I was so wrong about serums" · 2 DEMO "30 seconds, morning light" · 3 PAYOFF "okay this actually worked". Coral tags.',
    motion: 'Steps build one at a time over 5 s (about 1.5 s each, like the reference\'s workflow builder), with a connecting line drawing down. Ref: Numtera\'s numbered workflow steps (MESSAGE / INPUT).',
    vo: '"Ads that look shot, not generated."', sfx: 'One pluck per step.', next: 'Ad duplicates sideways into variations.',
    art: c => lightBg(c, { g: 0.3, t: 0.3, at: [300, 1100] }) + phone(c, 260, 160, 400, 711, { label: 'Hook 01', caption: 'I was so wrong about serums', prop: true, prog: 0.3 }) +
      Ln(820, 330, 820, 760, { stroke: L.line2, sw: 2 }) +
      [['Hook', 'I was so wrong about serums'], ['Demo', '30 seconds, morning light'], ['Payoff', 'okay this actually worked']].map(([k, v], i) => {
        const y = 300 + i * 200;
        return Ci(820, y + 40, 22, { fill: L.white, stroke: L.line2 }) + T(820, y + 47, String(i + 1), { f: M, w: 500, size: 18, fill: L.ink, anchor: 'middle' }) +
          shadowCard(c, 880, y, 900, 84, { r: 14, op: 0.95 }) + chip(910, y + 28, k, C.coral, { solid: true }) + T(1010, y + 50, `— ${v}`, { f: S, size: 22, fill: L.ink2 });
      }).join(''),
  },
  {
    act: '4', t: 68, title: 'One edit, nine voices',
    visual: 'A single player centre-frame; a vertical list of the nine languages beside it with the selection stepping EN → DE → FR. The waveform under the player reshapes each time.',
    motion: 'Selection steps on each beat; waveform morphs; picture never moves. Small chip: "Upload it nine times, not once."',
    vo: '"And upload it nine times, not once."', sfx: 'The same phrase in three languages, crossfading.', next: 'Pull back into white: the summary line.',
    art: c => lightBg(c, { g: 0.6, t: 0.4 }) + shadowCard(c, 260, 220, 960, 560, { r: 16 }) + panamaMap(c, 280, 240, 920, 518, { r: 10 }) +
      shadowCard(c, 1280, 220, 380, 560, { r: 16 }) +
      ['English', 'German', 'French', 'Spanish', 'Portuguese', 'Italian', 'Polish', 'Indonesian', 'Danish'].map((l, i) => (i === 2 ? R(1292, 236 + i * 58, 356, 46, { r: 8, fill: C.green, fop: 0.14 }) : '') +
        T(1316, 266 + i * 58, l, { f: S, size: 18, w: i === 2 ? 600 : 400, fill: L.ink }) + (i <= 2 ? check(1628, 260 + i * 58, 9) : '')).join('') +
      R(560, 830, 800, 64, { r: 32, fill: L.white, stroke: C.green }) + line(960, 873, [['Upload it nine times, not once.']], { size: 24, w: 600 }),
  },
  // ---------- 5. CLOSE ----------
  {
    act: '5', t: 71.5, title: 'The channel keeps posting',
    visual: 'Bright gradient, one calm line: "The channel keeps posting. Every week." with "Every week." in brew green.',
    motion: 'Words fade in spaced wide, then tracking tightens. Ref: "The system gets smarter — forever".',
    vo: '"Your channel keeps posting, every week."', sfx: 'Pad + soft pulse.', next: 'Cut to white: the contrast lines.',
    art: c => lightBg(c, { g: 1, t: 0.9, at: [960, 900] }) + line(W / 2, 560, [['The channel keeps posting. '], ['Every week.', { fill: C.green }]], { size: 56 }),
  },
  {
    act: '5', t: 74, title: 'Others hand you a tool.',
    visual: 'White stage, near-black text: "Others hand you a tool." "tool" slightly out of focus.',
    motion: 'Line types on; "tool" drifts out of focus as it lands. Ref: "They close tickets".',
    vo: '"Others hand you a tool."', sfx: 'One dry key click.', next: 'Line flips to green.',
    art: c => lightBg(c, { g: 0.35, t: 0.3 }) + line(W / 2, 560, [['Others hand you a ']], { size: 72 }) + fx(T(W / 2 + tw('Others hand you a ', 72, 500) / 2 + 4, 560, 'tool.', { f: S, w: 500, size: 72, fill: L.ink }), blur(c, 4)),
  },
  {
    act: '5', t: 76, title: 'We hand you the video.',
    visual: '"We hand you the video." in brew green on the gradient; "video" sharp, the rest softening.',
    motion: 'Cross-dissolve from the previous line with a 6 px vertical slide. Ref: "We Eliminate them".',
    vo: '"We hand you the video."', sfx: 'brew signature, soft.', next: 'Logo resolves on white glow.',
    art: c => lightBg(c, { g: 0.9, t: 0.7, at: [1500, 1080] }) + line(W / 2, 560, [['We hand you the video.', { fill: C.green }]], { size: 72 }),
  },
  {
    act: '5', t: 78.5, title: 'Logo',
    visual: 'White glow. The brew mark and wordmark, side by side, mid-size, calm.',
    motion: 'Mark lands first; letters of "brew" type on (b, r, e, w) with the green "e" last. Ref: Numtera logo typing on.',
    vo: '—', sfx: 'Signature chord, full.', next: 'Cut to black: tagline typed.',
    art: c => lightBg(c, { g: 0.7, t: 0.6, at: [1500, 1100] }) + R(690, 450, 150, 150, { r: 30, fill: L.white }) + brackets(712, 472, 106, 106, { len: 24, sw: 7 }) +
      T(765, 564, 'e', { f: D, w: 800, size: 96, fill: C.green, anchor: 'middle' }) + TS(870, 576, [['br'], ['e', { fill: C.green }], ['w']], { f: D, w: 800, size: 140, fill: L.ink, ls: -5 }),
  },
  {
    act: '5', t: 81.5, title: 'Tagline on black',
    visual: 'brew-dark with green and teal light leaks drifting in from the corners. Typed: "Every frame watched by a person."',
    motion: 'Typed with caret; light leaks slowly orbit. Ref: "The self-learning support OS|".',
    vo: '"Every frame, watched by a person."', sfx: 'Music resolves to a single held chord.', next: 'Line swaps to the CTA.',
    art: c => darkBg(c) + line(W / 2, 560, [['Every frame watched by a person.']], { size: 52, ink: C.text, caret: true, caretCol: C.green }),
  },
  {
    act: '5', t: 85, title: 'CTA',
    visual: '"Your first video is free." centred on black, a green "Send us a script →" button, and scalewithbrew.com small beneath.',
    motion: 'Headline fades up; button pops (overshoot); URL types on. Hold 4 s, then fade to black.',
    vo: '"Your first video is free."', sfx: 'Final note; tail.', next: 'Black.',
    art: c => darkBg(c, { lx: 1840, ly: 0, rx: 80, ry: 1080 }) + line(W / 2, 520, [['Your first video is free.']], { size: 64, ink: C.text, w: 600 }) +
      btn(W / 2 - tw('Send us a script  →', 30, 600) / 2 - 18, 590, 'Send us a script  →', { size: 30 }) + T(W / 2, 760, 'scalewithbrew.com', { f: M, size: 20, fill: C.t2, anchor: 'middle', ls: 1 }),
  },
];

function lsidebarLib() {
  // Static sidebar for the Library window (positioned to the tilted window above).
  let s = R(220, 200, 250, 780, { fill: '#F8F8F6' }) + Ln(470, 200, 470, 980, { stroke: L.line }) + TS(288, 248, [['br'], ['e', { fill: C.green }], ['w']], { f: D, w: 800, size: 24, fill: L.ink, ls: -0.8 });
  ['New video', 'In production', 'Review', 'Library', 'Languages', 'AI b-roll', 'UGC ads'].forEach((n, i) => {
    const y = 340 + i * 40, on = n === 'Library';
    s += (on ? R(232, y - 24, 226, 34, { r: 8, fill: C.green, fop: 0.12 }) : '') + Ci(250, y - 7, 4, { fill: on ? C.green : L.line2 }) + T(264, y, n, { f: S, size: 15, w: on ? 600 : 400, fill: on ? L.ink : L.ink2 });
  });
  return s;
}
