// Build the loose-file LAYERED After Effects script (expects layers/ and frames/ next to it).
//   node brew/ae/build_layered_script.mjs  → brew/ae/brew_storyboard_v3_LAYERED.jsx
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const m = JSON.parse(fs.readFileSync(path.join(here, 'layers.json'), 'utf8'));
const notes = JSON.parse(fs.readFileSync(path.join(here, 'shots.json'), 'utf8'));
const esc = s => JSON.stringify(String(s)).replace(/[\u007f-\uffff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const acts = { 1: 'The problem', 2: 'Meet brew', 3: 'We make it', 4: 'You drive it', 5: 'Close' };
const shots = m.map((s, i) => {
  const n = notes[i];
  const layers = s.layers.map(L => `[${esc(L.name)},${esc(L.file)},${L.x},${L.y},${L.w},${L.h}]`).join(',');
  return `  { name: ${esc(String(s.n).padStart(2, '0') + ' - ' + s.title)}, tin: ${s.tin}, tout: ${s.tout}, act: ${s.act}, actName: ${esc(acts[s.act])}, flat: ${esc(s.flat)},\n    notes: ${esc('VISUAL: ' + n.visual + '\r' + 'MOTION: ' + n.motion + '\r' + 'VO: ' + n.vo + '\r' + 'SFX: ' + n.sfx)},\n    layers: [${layers}] }`;
}).join(',\n');
const TEMPLATE = `// brew launch film v3 - storyboard as LAYERED After Effects timeline (no animation)
// Run: After Effects -> File -> Scripts -> Run Script File... -> pick this file.
// Keep this script next to the "layers" and "frames" folders and soundtrack_v3_temp.wav.
//
// Builds:
//   brew v3 storyboard (layered)/
//     MAIN - brew v3 storyboard timeline   1920x1080, 93 s: one precomp per shot, at its film time
//     Shots/  34 precomps, each with every element as its own layer (backgrounds, glows,
//             cards, text lines, buttons, cursor, brackets...), stacked and positioned exactly
//             as in the storyboard, plus a hidden REFERENCE layer of the flat frame
//     Elements/   every unique element PNG (imported once, reused across shots)
//     Reference frames/  the 34 flat storyboard frames
(function () {
  var FPS = 60;          // change to 30/25/24 if you prefer; times are in seconds
  var DURATION = 93;
  var LABEL_BY_ACT = { 1: 1, 2: 9, 3: 8, 4: 14, 5: 11 }; // red, green, blue, cyan, orange

  var shots = [
__SHOTS__
  ];

  var root = File($.fileName).parent;
  var layersDir = new Folder(root.fsName + "/layers"), framesDir = new Folder(root.fsName + "/frames");
  if (!layersDir.exists) { alert("Can\\u0027t find the \\"layers\\" folder next to this script:\\n" + layersDir.fsName); return; }

  app.beginUndoGroup("brew layered storyboard");
  var proj = app.project || app.newProject();
  var bin = proj.items.addFolder("brew v3 storyboard (layered)");
  var shotsBin = proj.items.addFolder("Shots"); shotsBin.parentFolder = bin;
  var elemBin = proj.items.addFolder("Elements"); elemBin.parentFolder = bin;
  var refBin = proj.items.addFolder("Reference frames"); refBin.parentFolder = bin;

  var cache = {}, missing = [];
  function footage(dir, file, parent) {
    var key = dir.fsName + "/" + file;
    if (cache[key]) return cache[key];
    var f = new File(key);
    if (!f.exists) { missing.push(file); return null; }
    var io = new ImportOptions(f); io.sequence = false;
    var it = proj.importFile(io); it.parentFolder = parent;
    cache[key] = it;
    return it;
  }

  var main = proj.items.addComp("MAIN - brew v3 storyboard timeline", 1920, 1080, 1, DURATION, FPS);
  main.parentFolder = bin;
  main.bgColor = [0.043, 0.043, 0.047];

  var count = 0;
  // Shots added in order: each add() lands on top, so shot 01 ends up at the BOTTOM and 34 at the top (staircase).
  for (var i = 0; i < shots.length; i++) {
    var s = shots[i];
    var pc = proj.items.addComp(s.name, 1920, 1080, 1, s.tout - s.tin, FPS);
    pc.parentFolder = shotsBin;
    pc.bgColor = [0, 0, 0];
    // bottom-most element first; each add() goes on top, so the stack matches the storyboard
    for (var k = 0; k < s.layers.length; k++) {
      var L = s.layers[k];
      var it = footage(layersDir, L[1], elemBin);
      if (!it) continue;
      var lay = pc.layers.add(it);
      lay.name = L[0];
      lay.property("Transform").property("Position").setValue([L[2] + L[4] / 2, L[3] + L[5] / 2]);
      count++;
    }
    var ref = footage(framesDir, s.flat, refBin);
    if (ref) {
      var rl = pc.layers.add(ref);
      rl.name = "REFERENCE (flat storyboard frame)";
      rl.guideLayer = true;
      rl.enabled = false;
      rl.label = 0;
    }
    var sl = main.layers.add(pc);
    sl.startTime = s.tin;
    sl.inPoint = s.tin;
    sl.outPoint = s.tout;
    sl.label = LABEL_BY_ACT[s.act] || 0;
    sl.comment = s.notes;
    var mv = new MarkerValue(s.name);
    mv.comment = s.name + "  [" + s.actName + "]\\r" + s.notes;
    mv.duration = s.tout - s.tin;
    var placed = false;
    try { main.markerProperty.setValueAtTime(s.tin, mv); placed = true; } catch (e) {}
    if (!placed) sl.property("Marker").setValueAtTime(s.tin, mv);
  }

  var wav = new File(root.fsName + "/soundtrack_v3_temp.wav");
  if (wav.exists) {
    var a = proj.importFile(new ImportOptions(wav)); a.parentFolder = bin;
    var al = main.layers.add(a); al.name = "Soundtrack (temp)"; al.moveToEnd();
  }

  main.openInViewer();
  app.endUndoGroup();
  alert("Done: " + shots.length + " shot precomps, " + count + " element layers." + (missing.length ? "\\nMissing files: " + missing.join(", ") : ""));
})();
`;
const jsx = TEMPLATE.replace('__SHOTS__', shots);
if (/[^\x00-\x7f]/.test(jsx)) throw new Error('non-ascii in jsx');
fs.writeFileSync(path.join(here, 'brew_storyboard_v3_LAYERED.jsx'), jsx);
console.log('LAYERED script', (jsx.length / 1e3).toFixed(0), 'KB');
