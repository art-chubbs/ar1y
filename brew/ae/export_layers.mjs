// Split every storyboard v3 shot into its individual elements (backgrounds, glows, cards, text lines…)
// and export each as a tightly cropped transparent PNG + a manifest with positions and stacking order.
//   node brew/ae/export_layers.mjs   → brew/ae/layers/*.png (each unique element once), brew/ae/layers.json
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ctx } from '../storyboard/lib.mjs';
import { FRAMES } from '../storyboard/v3/frames.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const { PNG } = require('../storyboard/node_modules/pngjs');
const here = path.dirname(fileURLToPath(import.meta.url));
const brew = path.dirname(here);
const OUT = path.join(here, 'layers');
const shots = JSON.parse(fs.readFileSync(path.join(here, 'shots.json'), 'utf8'));

// ---- split an SVG body into top-level elements ----
function topLevel(str) {
  const out = []; let depth = 0, start = -1, i = 0;
  while (i < str.length) {
    if (str[i] !== '<') { i++; continue; }
    const end = str.indexOf('>', i);
    const tag = str.slice(i, end + 1);
    if (depth === 0) start = i;
    if (tag.startsWith('</')) depth--;
    else if (!tag.endsWith('/>')) depth++;
    i = end + 1;
    if (depth === 0) out.push(str.slice(start, i));
  }
  return out;
}
const openTag = el => el.slice(0, el.indexOf('>') + 1);
const innerOf = el => el.slice(el.indexOf('>') + 1, el.lastIndexOf('</'));
const unesc = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const textOf = el => unesc(el.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
function nameOf(el) {
  const dl = openTag(el).match(/data-layer="([^"]*)"/);
  if (dl) return unesc(dl[1]);
  const tag = el.match(/^<(\w+)/)[1];
  if (tag === 'text') return `Text · ${textOf(el).slice(0, 40)}`;
  const fill = (el.match(/fill="(#[0-9A-Fa-f]{6})"/) || [])[1];
  const col = fill ? ` ${fill.toUpperCase()}` : '';
  if (tag === 'rect') return /width="1920"/.test(el) && /height="1080"/.test(el) ? `Fill${col}` : `Shape · rectangle${col}`;
  if (tag === 'ellipse') return /url\(#/.test(el) ? 'Glow' : 'Shape · ellipse';
  if (tag === 'circle') return `Shape · dot${col}`;
  if (tag === 'line') return 'Shape · line';
  if (tag === 'polygon') return 'Shape · arrowhead';
  if (tag === 'path') return 'Shape · path';
  const inner = topLevel(innerOf(el)).map(nameOf).find(n => !n.startsWith('Shape') && n !== 'Group');
  return inner ? `${inner}` : 'Group';
}
// Groups without their own name are opened up so each child becomes a layer (wrappers carried along).
function split(el, wrappers = []) {
  const tag = el.match(/^<(\w+)/)[1];
  const open = openTag(el);
  // A blurred, faded app window stays one plate (splitting it would let its parts show through each other).
  const plate = /filter=/.test(open) && /data-layer="Window/.test(el);
  if (plate) return [{ name: 'App window (blurred plate)', svg: wrappers.join('') + el + '</g>'.repeat(wrappers.length) }];
  if (tag === 'g' && !/data-layer=/.test(open)) {
    const kids = topLevel(innerOf(el));
    return kids.flatMap(k => split(k, [...wrappers, open]));
  }
  const blurred = wrappers.some(w => /filter=/.test(w)) || /filter=/.test(open);
  return [{ name: nameOf(el) + (blurred ? ' (blurred)' : ''), svg: wrappers.join('') + el + '</g>'.repeat(wrappers.length) }];
}

// ---- rasterise + crop ----
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  if (u === '/clear.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); return r.end(fs.readFileSync(path.join(brew, 'film/v3/stage.html'), 'utf8').replace('html,body{margin:0;background:#000}', 'html,body{margin:0;background:transparent}')); }
  const f = path.join(brew, u); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': 'font/woff2' }); fs.createReadStream(f).pipe(r);
}).listen(0);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(`http://localhost:${server.address().port}/clear.html`); await page.evaluate(() => window.ready);

function crop(buf) {
  const png = PNG.sync.read(buf); const { width: w, height: h, data } = png;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 2) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, outp = new PNG({ width: cw, height: ch });
  PNG.bitblt(png, outp, x0, y0, cw, ch, 0, 0);
  return { buf: PNG.sync.write(outp), x: x0, y: y0, w: cw, h: ch };
}

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const byHash = {};
const manifest = [];
let total = 0;
for (let i = 0; i < FRAMES.length; i++) {
  const f = FRAMES[i], s = shots[i], c = ctx(`k${i}`);
  const body = f.art(c), defs = c.defs.join('');
  const layers = topLevel(body).flatMap(el => split(el));
  const seen = {}, entries = [];
  for (const [k, L] of layers.entries()) {
    seen[L.name] = (seen[L.name] || 0) + 1;
    const name = seen[L.name] > 1 ? `${L.name} ${seen[L.name]}` : L.name;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs>${defs}</defs>${L.svg}</svg>`;
    await page.evaluate(x => window.show(x), svg);
    const shot = await page.screenshot({ clip: { x: 0, y: 0, width: 1920, height: 1080 }, omitBackground: true });
    const cr = crop(shot);
    if (!cr) continue; // invisible element (e.g. fully transparent at this moment)
    const hash = crypto.createHash('sha1').update(cr.buf).digest('hex').slice(0, 10);
    let file = byHash[hash];
    if (!file) {
      file = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}_${hash}.png`;
      fs.writeFileSync(path.join(OUT, file), cr.buf);
      byHash[hash] = file;
    }
    entries.push({ name, file, x: cr.x, y: cr.y, w: cr.w, h: cr.h });
  }
  total += entries.length;
  manifest.push({ n: i + 1, title: s.title, tin: s.tin, tout: s.tout, act: s.act, flat: s.file, layers: entries });
  console.log(`${String(i + 1).padStart(2, '0')} ${s.title}: ${entries.length} layers`);
}
fs.writeFileSync(path.join(here, 'layers.json'), JSON.stringify(manifest, null, 1));
console.log('total layers', total, 'unique files', Object.keys(byHash).length);
await browser.close(); server.close();
