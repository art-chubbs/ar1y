// ar1y — 12s motion piece. Everything is a pure function of time t (seconds),
// so the same code drives live preview and deterministic frame-by-frame rendering.
(() => {
  const W = 1920, H = 1080, DUR = 12, FPS = 60;
  const TAU = Math.PI * 2;
  const C = {
    bg: '#0B0B12', ink: '#F4F1EA', coral: '#FF5A4E',
    amber: '#FFB23F', mint: '#3DDC97', blue: '#4D7CFF',
  };

  const out = document.getElementById('c').getContext('2d');
  const buf = document.createElement('canvas');
  buf.width = W; buf.height = H;
  const ctx = buf.getContext('2d');

  // ---------- helpers ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (t, start, dur) => clamp((t - start) / dur);
  const E = {
    inQuad: x => x * x,
    outCubic: x => 1 - Math.pow(1 - x, 3),
    inCubic: x => x * x * x,
    inOutCubic: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outExpo: x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inExpo: x => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
    inOutExpo: x => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
    outBack: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    inBack: x => { const c1 = 1.70158, c3 = c1 + 1; return c3 * x * x * x - c1 * x * x; },
  };
  const hex = c => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`; };
  const rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };
  const rng = seed => () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  // Shape primitive. Squash/stretch is anchored at the shape's bottom edge.
  function shape(kind, x, y, size, rot = 0, sx = 1, sy = 1, color = C.ink, alpha = 1) {
    if (size <= 0.01 || alpha <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.translate(0, size);
    ctx.scale(sx, sy);
    ctx.translate(0, -size);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    if (kind === 'circle' || kind === 'ring') ctx.arc(0, 0, size, 0, TAU);
    else if (kind === 'square') ctx.roundRect(-size, -size, size * 2, size * 2, size * 0.14);
    else if (kind === 'tri') {
      const R = size * 1.25;
      for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + k * TAU / 3; ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R + size * 0.2); }
      ctx.closePath();
    }
    if (kind === 'ring') { ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, size * 0.22); ctx.stroke(); }
    else { ctx.fillStyle = color; ctx.fill(); }
    ctx.restore();
  }

  // ---------- layout (needs fonts) ----------
  const L = {};
  function layout() {
    // Kinetic words
    ctx.font = '900 300px IN';
    L.words = [
      { w: 'MOVE', bg: C.coral, s: 4.15 },
      { w: 'SHAPE', bg: C.blue, s: 4.95 },
      { w: 'FLOW', bg: C.mint, s: 5.75 },
    ].map(o => {
      const track = -8;
      const widths = [...o.w].map(ch => ctx.measureText(ch).width);
      const total = widths.reduce((a, b) => a + b, 0) + track * (widths.length - 1);
      let x = W / 2 - total / 2;
      const xs = widths.map(w => { const r = x; x += w + track; return r; });
      ctx.font = '900 150px IN';
      const unit = ctx.measureText(o.w + ' — ').width;
      ctx.font = '900 300px IN';
      return { ...o, xs, unit };
    });
    L.wordBase = H / 2 + 109;

    // Wordmark
    ctx.font = '700 300px SG';
    const letters = ['a', 'r', '1', 'y'];
    const track = -10;
    const widths = letters.map(ch => ctx.measureText(ch).width);
    L.dotR = 28;
    const gap = 16 + L.dotR * 2;
    const total = widths.reduce((a, b) => a + b, 0) + track * 3 + gap;
    let x = W / 2 - total / 2;
    L.logoX = x;
    L.logoW = total;
    L.letters = letters.map((ch, i) => { const r = { ch, x, w: widths[i] }; x += widths[i] + track; return r; });
    L.base = 600;
    L.dotX = x - track + 16 + L.dotR;
    L.oneX = L.letters[2].x + L.letters[2].w / 2;
    L.oneTop = L.base - ctx.measureText('1').actualBoundingBoxAscent;
  }

  // ---------- grain ----------
  const grain = [0, 1, 2, 3].map(i => {
    const g = document.createElement('canvas');
    g.width = g.height = 256;
    const gx = g.getContext('2d');
    const img = gx.createImageData(256, 256);
    const r = rng(1234 + i);
    for (let p = 0; p < img.data.length; p += 4) {
      const v = r() * 255;
      img.data[p] = img.data[p + 1] = img.data[p + 2] = v; img.data[p + 3] = 255;
    }
    gx.putImageData(img, 0, 0);
    return out.createPattern(g, 'repeat');
  });

  // ---------- particles (seeded, precomputed) ----------
  const parts = (() => {
    const r = rng(77);
    const cols = [C.coral, C.amber, C.mint, C.blue, C.ink];
    return Array.from({ length: 36 }, () => {
      const a = -Math.PI * (0.05 + 0.9 * r()) + (r() - 0.5) * 0.4;
      const sp = 500 + r() * 900;
      return { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: 4 + r() * 8, c: cols[(r() * cols.length) | 0], sq: r() < 0.4, rot: r() * TAU };
    });
  })();

  // ---------- scene pieces ----------
  function background(t) {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);

    // Crosshair shooting out from center
    const ch = E.outExpo(prog(t, 0.3, 0.9));
    const chFade = 1 - prog(t, 1.6, 0.6) * 0.8;
    ctx.strokeStyle = rgba(C.ink, 0.28 * chFade);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - ch * W / 2, H / 2); ctx.lineTo(W / 2 + ch * W / 2, H / 2);
    ctx.moveTo(W / 2, H / 2 - ch * H / 2); ctx.lineTo(W / 2, H / 2 + ch * H / 2);
    ctx.stroke();

    // Grid lines growing from the center outward
    const step = 120;
    ctx.strokeStyle = rgba(C.ink, 0.055);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -8; i <= 8; i++) {
      if (i === 0) continue;
      const g = E.outExpo(prog(t, 0.6 + Math.abs(i) * 0.05, 0.8));
      const x = W / 2 + i * step;
      ctx.moveTo(x, H / 2 - g * H / 2); ctx.lineTo(x, H / 2 + g * H / 2);
    }
    for (let j = -4; j <= 4; j++) {
      if (j === 0) continue;
      const g = E.outExpo(prog(t, 0.6 + Math.abs(j) * 0.08, 0.8));
      const y = H / 2 + j * step;
      ctx.moveTo(W / 2 - g * W / 2, y); ctx.lineTo(W / 2 + g * W / 2, y);
    }
    ctx.stroke();
  }

  function hud(t, frame) {
    const a = E.outCubic(prog(t, 0.5, 0.6)) * (1 - prog(t, 10.6, 0.4));
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a * 0.55;
    ctx.fillStyle = C.ink;
    ctx.font = '500 22px SG';
    ctx.letterSpacing = '4px';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText('AR1Y — MOTION STUDY 01', 72, 64);
    ctx.textAlign = 'right';
    const s = Math.floor(frame / FPS), f = frame % FPS;
    ctx.fillText(`00:00:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`, W - 72, 64);
    ctx.textBaseline = 'bottom';
    ctx.fillText('1920 × 1080 / 60', W - 72, H - 64);
    ctx.textAlign = 'left';
    ctx.fillText('© 2026', 72, H - 64);
    ctx.restore();
  }

  function bounce(t, s) {
    const a = prog(t, s, 0.14), j = prog(t, s + 0.14, 0.5), l = prog(t, s + 0.64, 0.22);
    if (t < s || l >= 1) return { dy: 0, sx: 1, sy: 1 };
    if (a < 1) { const k = Math.sin(Math.PI * a); return { dy: 0, sx: 1 + 0.12 * k, sy: 1 - 0.16 * k }; }
    if (j < 1) { const k = Math.sin(Math.PI * j); return { dy: -220 * 4 * j * (1 - j), sx: 1 - 0.1 * k, sy: 1 + 0.14 * k }; }
    const k = Math.sin(Math.PI * l);
    return { dy: 0, sx: 1 + 0.22 * k, sy: 1 - 0.24 * k };
  }

  function shapesScene(t) {
    if (t > 4.4) return;

    // Shockwave rings
    [[1.75, C.mint], [1.87, C.blue]].forEach(([s, col]) => {
      const q = prog(t, s, 0.9);
      if (q <= 0 || q >= 1) return;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, lerp(170, 760, E.outExpo(q)), 0, TAU);
      ctx.strokeStyle = rgba(col, 1 - q);
      ctx.lineWidth = lerp(10, 1, q);
      ctx.stroke();
    });

    const xs = [540, 960, 1380];
    const conv = E.inOutExpo(prog(t, 3.65, 0.6));
    const vanish = 1 - E.inExpo(prog(t, 3.85, 0.4));

    // Circle (born from the center dot)
    let r = 14 * E.outBack(prog(t, 0, 0.45));
    r = lerp(r, 170, E.outExpo(prog(t, 1.2, 0.6)));
    r = lerp(r, 130, E.inOutCubic(prog(t, 1.8, 0.6)));
    const cc = mix(C.ink, C.coral, E.outCubic(prog(t, 1.2, 0.3)));

    const sq = E.outExpo(prog(t, 1.75, 0.85));
    const tr = E.outExpo(prog(t, 1.85, 0.85));
    const items = [
      { kind: 'square', x: lerp(-300, xs[0], sq), rot: lerp(-Math.PI * 1.5, 0, sq), size: 115, col: C.blue, b: 2.6, dir: -1, on: sq > 0 },
      { kind: 'circle', x: xs[1], rot: 0, size: r, col: cc, b: 2.72, dir: 1, on: true },
      { kind: 'tri', x: lerp(W + 300, xs[2], tr), rot: lerp(Math.PI * 1.5, 0, tr), size: 115, col: C.amber, b: 2.84, dir: 1, on: tr > 0 },
    ];
    for (const it of items) {
      if (!it.on) continue;
      const bb = bounce(t, it.b);
      const x = lerp(it.x, W / 2, conv);
      const rot = it.rot + conv * TAU * it.dir;
      shape(it.kind, x, H / 2 + bb.dy, it.size * vanish, rot, bb.sx, bb.sy, it.col);
    }
  }

  function wipePoly(X, slant, keepLeft) {
    ctx.beginPath();
    if (keepLeft) { ctx.moveTo(-10, -10); ctx.lineTo(X, -10); ctx.lineTo(X - slant, H + 10); ctx.lineTo(-10, H + 10); }
    else { ctx.moveTo(X, -10); ctx.lineTo(W + 10, -10); ctx.lineTo(W + 10, H + 10); ctx.lineTo(X - slant, H + 10); }
    ctx.closePath();
  }

  function typeScene(t) {
    if (t < 4.15 || t > 7.0) return;
    const slant = 320;
    const pe = E.inOutExpo(prog(t, 6.45, 0.55));
    ctx.save();
    wipePoly(lerp(0, W + slant, pe), slant, false);
    ctx.clip();

    L.words.forEach((o, i) => {
      const p = E.inOutExpo(prog(t, o.s, 0.45));
      if (p <= 0) return;
      ctx.save();
      wipePoly(lerp(0, W + slant, p), slant, true);
      ctx.clip();
      ctx.fillStyle = o.bg;
      ctx.fillRect(0, 0, W, H);

      // Outlined marquee rows
      ctx.font = '900 150px IN';
      ctx.strokeStyle = rgba(C.bg, 0.2);
      ctx.lineWidth = 2;
      [[230, 1], [1000, -1]].forEach(([y, dir]) => {
        const off = ((t * 260 * dir) % o.unit + o.unit) % o.unit;
        for (let x = off - o.unit; x < W; x += o.unit) ctx.strokeText(o.w + ' — ', x, y);
      });

      // Corner labels
      ctx.fillStyle = C.bg;
      ctx.font = '500 24px SG';
      ctx.letterSpacing = '4px';
      ctx.textBaseline = 'top';
      ctx.fillText(`0${i + 1} / 03`, 72, 64);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('KINETIC TYPE', W - 72, H - 64);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.letterSpacing = '0px';

      // Masked letters rising in, then out
      ctx.beginPath();
      ctx.rect(0, L.wordBase - 260, W, 300);
      ctx.clip();
      ctx.font = '900 300px IN';
      [...o.w].forEach((ch, k) => {
        const inY = (1 - E.outExpo(prog(t, o.s + 0.12 + k * 0.035, 0.55))) * 330;
        const outY = -E.inExpo(prog(t, o.s + 0.6 + k * 0.03, 0.3)) * 330;
        ctx.fillText(ch, o.xs[k], L.wordBase + inY + outY);
      });
      ctx.restore();
    });
    ctx.restore();
  }

  function dotState(t) {
    const R = L.dotR;
    if (t < 7.55) return null;
    if (t < 8.0) {
      const a = E.inQuad(prog(t, 7.55, 0.45));
      return { x: L.oneX, y: lerp(-80, L.oneTop - R, a), sx: 1 - 0.1 * a, sy: 1 + 0.15 * a };
    }
    if (t < 8.6) {
      const h = prog(t, 8.0, 0.6);
      const y0 = L.oneTop - R, y1 = L.base - R;
      return { x: lerp(L.oneX, L.dotX, h), y: lerp(y0, y1, h) - 180 * 4 * h * (1 - h), sx: 1, sy: 1 };
    }
    const l = prog(t, 8.6, 0.22), k = Math.sin(Math.PI * l);
    return { x: L.dotX, y: L.base - R, sx: 1 + 0.3 * k, sy: 1 - 0.32 * k };
  }

  function logoScene(t) {
    if (t < 6.8) return;
    const base = L.base;

    // Ambient floating shapes
    [
      ['tri', 330, 290, 26, C.blue, 0], ['square', 1610, 270, 22, C.mint, 1.3],
      ['ring', 1560, 830, 22, C.coral, 2.1], ['circle', 360, 820, 16, C.amber, 3.4],
      ['square', 230, 560, 10, C.ink, 4.4], ['circle', 1730, 560, 9, C.ink, 5.2],
    ].forEach(([kind, x, y, size, col, ph], i) => {
      const s = E.outBack(prog(t, 7.3 + i * 0.08, 0.6));
      shape(kind, x + Math.cos(t * 0.8 + ph) * 8, y + Math.sin(t * 1.2 + ph) * 14, size * s, t * 0.5 * (i % 2 ? 1 : -1) + ph, 1, 1, col, 0.9);
    });

    // Wordmark letters rising through a mask
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, base - 320, W, 420);
    ctx.clip();
    ctx.font = '700 300px SG';
    ctx.textBaseline = 'alphabetic';
    L.letters.forEach((lt, i) => {
      const p = E.outExpo(prog(t, 6.85 + i * 0.08, 0.8));
      const dy = (1 - p) * 400;
      ctx.save();
      ctx.translate(lt.x + lt.w / 2, base + dy);
      if (lt.ch === '1') {
        const k = Math.sin(Math.PI * prog(t, 8.0, 0.25));
        ctx.scale(1 + 0.04 * k, 1 - 0.1 * k);
      }
      ctx.fillStyle = lt.ch === '1' ? C.coral : C.ink;
      ctx.fillText(lt.ch, -lt.w / 2, 0);
      ctx.restore();
    });
    ctx.restore();

    // Landing flash ring + particle burst
    const bx = L.dotX, by = base - L.dotR;
    const fr = prog(t, 8.6, 0.55);
    if (fr > 0 && fr < 1) {
      ctx.beginPath();
      ctx.arc(bx, by, lerp(L.dotR, 190, E.outExpo(fr)), 0, TAU);
      ctx.strokeStyle = rgba(C.amber, 1 - fr);
      ctx.lineWidth = lerp(8, 1, fr);
      ctx.stroke();
    }
    const dt = t - 8.6;
    if (dt > 0 && dt < 1.0) {
      const k = 3.5, damp = (1 - Math.exp(-k * dt)) / k;
      for (const p of parts) {
        const x = bx + p.vx * damp, y = by + p.vy * damp + 260 * dt * dt;
        const a = 1 - dt / 1.0;
        if (p.sq) shape('square', x, y, p.s * 0.6 * a + 1, p.rot + dt * 6, 1, 1, p.c, a);
        else shape('circle', x, y, p.s * 0.5 * a + 1, 0, 1, 1, p.c, a);
      }
    }

    // Underline sweep
    const u = E.outExpo(prog(t, 8.75, 0.7));
    if (u > 0) {
      const g = ctx.createLinearGradient(L.logoX, 0, L.logoX + L.logoW, 0);
      g.addColorStop(0, C.coral); g.addColorStop(0.35, C.amber); g.addColorStop(0.7, C.mint); g.addColorStop(1, C.blue);
      ctx.fillStyle = g;
      const uOut = E.inOutExpo(prog(t, 10.4, 0.5));
      ctx.fillRect(L.logoX + uOut * L.logoW, base + 100, (u - uOut) * L.logoW, 6);
    }

    // Tagline
    const tg = prog(t, 9.05, 0.7);
    if (tg > 0) {
      ctx.save();
      ctx.globalAlpha = E.outCubic(tg) * 0.85;
      ctx.fillStyle = C.ink;
      ctx.font = '500 38px IN';
      ctx.letterSpacing = '14px';
      ctx.textAlign = 'center';
      ctx.fillText('MOTION, BY DESIGN', W / 2 + 7, base + 185 + (1 - E.outCubic(tg)) * 26);
      ctx.restore();
    }
  }

  function dotAndIris(t) {
    const d = dotState(t);
    const ds = 1 - E.inBack(prog(t, 11.55, 0.4));
    const ir = prog(t, 10.85, 0.75);
    if (ir > 0) {
      const R = lerp(Math.hypot(W, H), L.dotR * ds, E.inOutExpo(ir));
      ctx.beginPath();
      ctx.rect(-W, -H, W * 3, H * 3);
      ctx.arc(L.dotX, L.base - L.dotR, Math.max(0, R), 0, TAU, true);
      ctx.fillStyle = '#000';
      ctx.fill();
    }
    if (d) shape('circle', d.x, d.y, L.dotR * ds, 0, d.sx, d.sy, C.amber);
  }

  // ---------- frame ----------
  function scene(t, frame) {
    ctx.save();
    const push = 1 + 0.035 * E.inOutCubic(prog(t, 8.6, 2.6));
    ctx.translate(W / 2, H / 2); ctx.scale(push, push); ctx.translate(-W / 2, -H / 2);
    background(t);
    hud(t, frame);
    shapesScene(t);
    logoScene(t);
    typeScene(t);
    dotAndIris(t);
    ctx.restore();
  }

  function renderFrame(t, subframes = 10) {
    const frame = Math.round(t * FPS);
    const shutter = 0.5 / FPS; // 180° shutter
    out.globalAlpha = 1;
    for (let k = 0; k < subframes; k++) {
      const ts = subframes > 1 ? t + (k / (subframes - 1) - 0.5) * shutter : t;
      scene(Math.max(0, ts), frame);
      out.globalAlpha = 1 / (k + 1);
      out.drawImage(buf, 0, 0);
    }
    // Vignette + film grain
    out.globalAlpha = 1;
    const v = out.createRadialGradient(W / 2, H / 2, 420, W / 2, H / 2, 1150);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.4)');
    out.fillStyle = v;
    out.fillRect(0, 0, W, H);
    out.globalAlpha = 0.045;
    out.fillStyle = grain[frame % grain.length];
    out.fillRect(0, 0, W, H);
    out.globalAlpha = 1;
  }

  window.ready = Promise.all([
    document.fonts.load('900 300px IN'), document.fonts.load('500 38px IN'),
    document.fonts.load('700 300px SG'), document.fonts.load('500 22px SG'),
  ]).then(() => { layout(); window.renderFrame = renderFrame; window.DURATION = DUR; window.FPS = FPS; });

  // Live preview when opened in a browser (render script sets ?render)
  if (!location.search.includes('render')) {
    window.ready.then(() => {
      const t0 = performance.now();
      const loop = () => { renderFrame(((performance.now() - t0) / 1000) % DUR, 1); requestAnimationFrame(loop); };
      loop();
    });
  }
})();
