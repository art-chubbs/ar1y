// Build ONE self-contained After Effects script for the layered storyboard v3.
// Everything is packed inside the .jsx: element PNGs (base64), reference frames, temp soundtrack.
//   - flat full-frame backgrounds  → native AE solids (no image)
//   - soft glows / light leaks      → stored at 1/4 size, scaled 400% in AE (pure blur, looks identical)
//   - reference frames              → stored at 1/4 size, hidden guide layer scaled 400%
//   node brew/ae/build_single_script.mjs <soundtrack.mp3>  → brew/ae/brew_storyboard_v3_ONE_SCRIPT.jsx
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { PNG } = require('../storyboard/node_modules/pngjs');
const here = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(here, 'layers.json'), 'utf8'));
const notes = JSON.parse(fs.readFileSync(path.join(here, 'shots.json'), 'utf8'));
const mp3 = process.argv[2];

function downscale(png, k) {
  const w = Math.ceil(png.width / k), h = Math.ceil(png.height / k), out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) {
      const sx = x * k + dx, sy = y * k + dy;
      if (sx >= png.width || sy >= png.height) continue;
      const i = (sy * png.width + sx) * 4, al = png.data[i + 3];
      r += png.data[i] * al; g += png.data[i + 1] * al; b += png.data[i + 2] * al; a += al; n++;
    }
    const o = (y * w + x) * 4;
    out.data[o] = a ? r / a : 0; out.data[o + 1] = a ? g / a : 0; out.data[o + 2] = a ? b / a : 0; out.data[o + 3] = n ? a / n : 0;
  }
  return out;
}
function solidColour(png) {
  const d = png.data;
  for (let i = 4; i < d.length; i += 4) if (d[i] !== d[0] || d[i + 1] !== d[1] || d[i + 2] !== d[2] || d[i + 3] !== 255) return null;
  return d[3] === 255 ? [d[0], d[1], d[2]] : null;
}
const isGlow = name => /^(Glow|Light leak)/.test(name) || / \(blurred plate\)$/.test(name);

// ---- process unique element files ----
const assets = {};   // packed name -> base64
const info = {};     // element file -> { solid:[r,g,b] } | { file, scale }
for (const s of manifest) for (const L of s.layers) {
  if (info[L.file]) continue;
  const png = PNG.sync.read(fs.readFileSync(path.join(here, 'layers', L.file)));
  const col = L.w === 1920 && L.h === 1080 ? solidColour(png) : null;
  if (col) { info[L.file] = { solid: col }; continue; }
  if (isGlow(L.name)) {
    const k = / \(blurred plate\)$/.test(L.name) ? 2 : 4;
    const small = PNG.sync.write(downscale(png, k));
    const name = L.file.replace(/\.png$/, `_x${k}.png`);
    assets[name] = small.toString('base64');
    info[L.file] = { file: name, scale: k };
  } else {
    assets[L.file] = fs.readFileSync(path.join(here, 'layers', L.file)).toString('base64');
    info[L.file] = { file: L.file, scale: 1 };
  }
}
// reference frames at 1/4 size
const refs = {};
for (const s of manifest) {
  const name = s.flat.replace(/\.png$/, '_ref_x4.png');
  assets[name] = PNG.sync.write(downscale(PNG.sync.read(fs.readFileSync(path.join(here, 'frames', s.flat))), 4)).toString('base64');
  refs[s.n] = name;
}
if (mp3 && fs.existsSync(mp3)) assets['soundtrack_v3_temp.mp3'] = fs.readFileSync(mp3).toString('base64');

// ---- emit the script ----
const esc = s => JSON.stringify(String(s)).replace(/[\u007f-￿]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const acts = { 1: 'The problem', 2: 'Meet brew', 3: 'We make it', 4: 'You drive it', 5: 'Close' };
const shotsJs = manifest.map((s, i) => {
  const n = notes[i];
  const layers = s.layers.map(L => {
    const f = info[L.file];
    return f.solid ? `[${esc(L.name)},0,${L.x},${L.y},${L.w},${L.h},[${f.solid.map(v => (v / 255).toFixed(4)).join(',')}]]`
      : `[${esc(L.name)},${esc(f.file)},${L.x},${L.y},${L.w},${L.h},${f.scale}]`;
  }).join(',');
  return `{name:${esc(String(s.n).padStart(2, '0') + ' - ' + s.title)},tin:${s.tin},tout:${s.tout},act:${s.act},actName:${esc(acts[s.act])},ref:${esc(refs[s.n])},` +
    `notes:${esc('VISUAL: ' + n.visual + '\r' + 'MOTION: ' + n.motion + '\r' + 'VO: ' + n.vo + '\r' + 'SFX: ' + n.sfx)},layers:[${layers}]}`;
}).join(',\n');
const dataJs = Object.entries(assets).map(([k, v]) => `${esc(k)}:"${v}"`).join(',\n');

const jsx = `// brew launch film v3 - LAYERED storyboard timeline - ONE self-contained script (no animation)
// Run: After Effects -> File -> Scripts -> Run Script File... -> pick this file. That's all.
// The images and temp soundtrack are packed inside this file. On first run they are unpacked
// into a folder "brew_v3_storyboard_assets" next to this script (AE needs them on disk).
// Unpacking takes a little while (roughly a minute); AE may look busy until the "Done" message.
//
// Builds:  brew v3 storyboard (layered)/
//   MAIN - brew v3 storyboard timeline   1920x1080, 60 fps, 93 s, one precomp per shot at its film time
//   Shots/       34 precomps: every element its own layer (backgrounds, glows, cards, text, buttons...)
//   Elements/    the element images
(function () {
  var FPS = 60;          // change to 30/25/24 if you prefer; times are in seconds
  var DURATION = 93;
  var LABEL_BY_ACT = { 1: 1, 2: 9, 3: 8, 4: 14, 5: 11 }; // red, green, blue, cyan, orange

  var SHOTS = [
${shotsJs}
  ];

  var DATA = {
${dataJs}
  };

  // ---- unpack ----
  var B = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var LUT = []; for (var q = 0; q < 256; q++) LUT[q] = 0; for (var q2 = 0; q2 < 64; q2++) LUT[B.charCodeAt(q2)] = q2;
  function b64(s) {
    var parts = [], buf = [], n = s.length, i = 0;
    while (i < n) {
      var c1 = s.charCodeAt(i), c2 = s.charCodeAt(i + 1), c3 = s.charCodeAt(i + 2), c4 = s.charCodeAt(i + 3); i += 4;
      var v = (LUT[c1] << 18) | (LUT[c2] << 12) | (LUT[c3] << 6) | LUT[c4];
      buf.push((v >> 16) & 255);
      if (c3 !== 61) buf.push((v >> 8) & 255);
      if (c4 !== 61) buf.push(v & 255);
      if (buf.length > 8000) { parts.push(String.fromCharCode.apply(null, buf)); buf = []; }
    }
    parts.push(String.fromCharCode.apply(null, buf));
    return parts.join("");
  }
  var dir = new Folder((new File($.fileName)).parent.fsName + "/brew_v3_storyboard_assets");
  if (!dir.exists && !dir.create()) { dir = new Folder(Folder.myDocuments.fsName + "/brew_v3_storyboard_assets"); dir.create(); }
  function unpack(name) {
    var f = new File(dir.fsName + "/" + name);
    if (!f.exists) { f.encoding = "BINARY"; f.open("w"); f.write(b64(DATA[name])); f.close(); }
    return f;
  }

  app.beginUndoGroup("brew layered storyboard");
  var proj = app.project || app.newProject();
  var bin = proj.items.addFolder("brew v3 storyboard (layered)");
  var shotsBin = proj.items.addFolder("Shots"); shotsBin.parentFolder = bin;
  var elemBin = proj.items.addFolder("Elements"); elemBin.parentFolder = bin;
  var refBin = proj.items.addFolder("Reference frames"); refBin.parentFolder = bin;
  var cache = {};
  function footage(name, parent) {
    if (cache[name]) return cache[name];
    var io = new ImportOptions(unpack(name)); io.sequence = false;
    var it = proj.importFile(io); it.parentFolder = parent; cache[name] = it; return it;
  }

  var main = proj.items.addComp("MAIN - brew v3 storyboard timeline", 1920, 1080, 1, DURATION, FPS);
  main.parentFolder = bin; main.bgColor = [0.043, 0.043, 0.047];
  var count = 0;
  // Shots added in order: each add() lands on top, so shot 01 ends up at the BOTTOM and 34 at the top (staircase).
  for (var i = 0; i < SHOTS.length; i++) {
    var s = SHOTS[i];
    var pc = proj.items.addComp(s.name, 1920, 1080, 1, s.tout - s.tin, FPS);
    pc.parentFolder = shotsBin; pc.bgColor = [0, 0, 0];
    for (var k = 0; k < s.layers.length; k++) {          // bottom-most first; each add() lands on top
      var L = s.layers[k], lay;
      if (L[1] === 0) {
        lay = pc.layers.addSolid(L[6], L[0], 1920, 1080, 1);
      } else {
        lay = pc.layers.add(footage(L[1], elemBin));
        lay.name = L[0];
        var sc = L[6] * 100;
        lay.property("Transform").property("Scale").setValue([sc, sc]);
        lay.property("Transform").property("Position").setValue([L[2] + L[4] / 2, L[3] + L[5] / 2]);
      }
      count++;
    }
    var rl = pc.layers.add(footage(s.ref, refBin));
    rl.name = "REFERENCE (flat storyboard frame)"; rl.guideLayer = true; rl.enabled = false;
    rl.property("Transform").property("Scale").setValue([400, 400]);
    rl.property("Transform").property("Position").setValue([960, 540]);

    var sl = main.layers.add(pc);
    sl.startTime = s.tin; sl.inPoint = s.tin; sl.outPoint = s.tout;
    sl.label = LABEL_BY_ACT[s.act] || 0; sl.comment = s.notes;
    var mv = new MarkerValue(s.name);
    mv.comment = s.name + "  [" + s.actName + "]\\r" + s.notes; mv.duration = s.tout - s.tin;
    var placed = false;
    try { main.markerProperty.setValueAtTime(s.tin, mv); placed = true; } catch (e) {}
    if (!placed) sl.property("Marker").setValueAtTime(s.tin, mv);
  }
  if (DATA["soundtrack_v3_temp.mp3"]) {
    var al = main.layers.add(footage("soundtrack_v3_temp.mp3", bin));
    al.name = "Soundtrack (temp)"; al.moveToEnd();
  }
  main.openInViewer();
  app.endUndoGroup();
  alert("Done: " + SHOTS.length + " shot precomps, " + count + " element layers.\\nAssets unpacked to:\\n" + dir.fsName);
})();
`;
if (/[^\x00-\x7f]/.test(jsx)) throw new Error('non-ascii in jsx');
const outFile = path.join(here, 'brew_storyboard_v3_ONE_SCRIPT.jsx');
fs.writeFileSync(outFile, jsx);
console.log('assets', Object.keys(assets).length, 'solids', Object.values(info).filter(x => x.solid).length, 'script MB', (jsx.length / 1e6).toFixed(1));
