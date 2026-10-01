// Render the animation to MP4: headless Chromium draws each frame, ffmpeg encodes.
//   node render.mjs                     -> out/ar1y-motion.mp4
//   node render.mjs --stills 1,3.2,5    -> out/still-<t>.png for quick checks
// Env: FFMPEG (path to ffmpeg), PLAYWRIGHT (path to playwright module)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, 'out');
fs.mkdirSync(outDir, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.addStyleTag({ content: '' }).catch(() => {});
await page.goto(`http://localhost:${port}/index.html?render`);
await page.evaluate(() => window.ready);
await page.addStyleTag({ content: 'canvas{width:1920px!important;height:1080px!important;max-width:none!important;max-height:none!important}' });
const { DURATION, FPS } = await page.evaluate(() => ({ DURATION: window.DURATION, FPS: window.FPS }));
const grab = () => page.locator('canvas').screenshot({ type: 'png' });

const stillsArg = process.argv.indexOf('--stills');
if (stillsArg > -1) {
  for (const t of process.argv[stillsArg + 1].split(',').map(Number)) {
    await page.evaluate(t => window.renderFrame(t), t);
    fs.writeFileSync(path.join(outDir, `still-${t.toFixed(2)}.png`), await grab());
  }
} else {
  const file = path.join(outDir, 'ar1y-motion.mp4');
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file],
  { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(DURATION * FPS);
  for (let f = 0; f < total; f++) {
    await page.evaluate(t => window.renderFrame(t), f / FPS);
    const png = await grab();
    if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 60 === 0) process.stdout.write(`frame ${f}/${total}\n`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  console.log('wrote', file);
}
await browser.close();
server.close();
