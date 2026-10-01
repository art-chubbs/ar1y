// Render the film: N parallel headless pages draw frames → PNG sequence → ffmpeg (with soundtrack if present).
//   node render.mjs                 full film → out/brew-launch-film.mp4
//   node render.mjs --stills 1,9.5  PNG stills to out/stills/
//   env: PLAYWRIGHT, FFMPEG, FPS (default 60), WORKERS (default 4)
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(here); // brew/
const out = path.join(here, 'out');
const FPS = +(process.env.FPS || 60), WORKERS = +(process.env.WORKERS || 4);
const types = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const url = `http://localhost:${server.address().port}/film/index.html?render`;
const browser = await chromium.launch();
async function newPage() {
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('pageerror', e => console.error('pageerror', e.message));
  await p.goto(url); await p.evaluate(() => window.ready);
  return p;
}
const shot = async (p, t, file) => { await p.evaluate(t => window.draw(t), t); await p.screenshot({ path: file, clip: { x: 0, y: 0, width: 1920, height: 1080 } }); };

const si = process.argv.indexOf('--stills');
if (si > -1) {
  const dir = path.join(out, 'stills'); fs.mkdirSync(dir, { recursive: true });
  const p = await newPage();
  for (const t of process.argv[si + 1].split(',').map(Number)) await shot(p, t, path.join(dir, `t${t.toFixed(2).padStart(6, '0')}.png`));
} else {
  const frames = path.join(out, 'frames'); fs.mkdirSync(frames, { recursive: true });
  const DUR = await (await newPage()).evaluate(() => window.DURATION);
  const total = Math.round(DUR * FPS);
  let next = 0, done = 0;
  await Promise.all(Array.from({ length: WORKERS }, async () => {
    const p = await newPage();
    while (next < total) {
      const f = next++;
      const file = path.join(frames, `f${String(f).padStart(5, '0')}.png`);
      if (!fs.existsSync(file)) await shot(p, f / FPS, file);
      if (++done % 300 === 0) console.log(`frame ${done}/${total}`);
    }
  }));
  const FF = process.env.FFMPEG || 'ffmpeg';
  const audio = path.join(here, 'out', 'soundtrack.wav');
  const args = ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f%05d.png')];
  if (fs.existsSync(audio)) args.push('-i', audio);
  args.push('-vf', 'noise=alls=5:allf=t,vignette=PI/5', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-tune', 'grain', '-pix_fmt', 'yuv420p');
  if (fs.existsSync(audio)) args.push('-c:a', 'aac', '-b:a', '256k', '-shortest');
  args.push('-movflags', '+faststart', path.join(out, 'brew-launch-film.mp4'));
  const r = spawnSync(FF, args, { stdio: 'inherit' });
  console.log(r.status === 0 ? 'wrote out/brew-launch-film.mp4' : 'ffmpeg failed');
}
await browser.close(); server.close();
