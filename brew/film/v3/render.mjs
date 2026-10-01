// Render film v3: scenes.mjs builds each frame's SVG in Node; N headless pages rasterise in parallel; ffmpeg encodes.
//   node render.mjs --stills 3,25,40   → out/stills/
//   node render.mjs                    → out/frames/ + out/brew-launch-film-v3.mp4 (uses out/soundtrack.wav if present)
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { render, DURATION, FPS } from './scenes.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const brew = path.resolve(here, '..', '..');
const out = path.join(here, 'out');
const WORKERS = +(process.env.WORKERS || 4);
const types = { '.html': 'text/html', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = u === '/stage.html' ? path.join(here, 'stage.html') : path.join(brew, u);
  if (!f.startsWith(brew) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const browser = await chromium.launch();
async function page() {
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('pageerror', e => console.error('pageerror', e.message));
  await p.goto(`http://localhost:${server.address().port}/stage.html`);
  await p.evaluate(() => window.ready);
  return p;
}
const shot = async (p, t, file) => { await p.evaluate(svg => window.show(svg), render(t)); await p.screenshot({ path: file, clip: { x: 0, y: 0, width: 1920, height: 1080 } }); };

const si = process.argv.indexOf('--stills');
if (si > -1) {
  const dir = path.join(out, 'stills'); fs.mkdirSync(dir, { recursive: true });
  const p = await page();
  for (const t of process.argv[si + 1].split(',').map(Number)) await shot(p, t, path.join(dir, `t${t.toFixed(2).padStart(6, '0')}.png`));
} else {
  const dir = path.join(out, 'frames'); fs.mkdirSync(dir, { recursive: true });
  const total = Math.round(DURATION * FPS);
  let next = 0, done = 0;
  await Promise.all(Array.from({ length: WORKERS }, async () => {
    const p = await page();
    while (next < total) {
      const f = next++, file = path.join(dir, `f${String(f).padStart(5, '0')}.png`);
      if (!fs.existsSync(file)) await shot(p, f / FPS, file);
      if (++done % 600 === 0) console.log(`frame ${done}/${total}`);
    }
  }));
  const FF = process.env.FFMPEG || 'ffmpeg', audio = path.join(out, 'soundtrack.wav');
  const args = ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f%05d.png')];
  if (fs.existsSync(audio)) args.push('-i', audio);
  args.push('-vf', 'noise=alls=2:allf=t', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p');
  if (fs.existsSync(audio)) args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  args.push('-movflags', '+faststart', path.join(out, 'brew-launch-film-v3.mp4'));
  const r = spawnSync(FF, args, { stdio: 'inherit' });
  console.log(r.status === 0 ? 'wrote out/brew-launch-film-v3.mp4' : 'ffmpeg failed');
}
await browser.close(); server.close();
