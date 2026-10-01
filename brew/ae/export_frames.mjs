// Export clean storyboard v3 frames (no board labels, app windows flat) + the shot list timed to film v3.
//   node brew/ae/export_frames.mjs   → brew/ae/frames/*.png, brew/ae/shots.json
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { ctx } from '../storyboard/lib.mjs';
import { FRAMES, OPTS } from '../storyboard/v3/frames.mjs';

OPTS.flatUI = true;
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const here = path.dirname(fileURLToPath(import.meta.url)), brew = path.dirname(here);
// Shot timings as cut in film v3 (93 s); shots 18/19 share the merged payoff slot.
const T = [0, 2, 4.5, 6.3, 8.2, 9.4, 11, 12.3, 14.3, 17.3, 20.3, 23.3, 25, 31.5, 33.5, 35, 38.5, 40.5, 41.7, 44, 47.5, 49, 50.3, 53.8, 56, 59.5, 63, 68.5, 72.5, 75, 77, 79.5, 82.5, 87.5, 93];
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36);
const server = http.createServer((q, r) => { const f = path.join(brew, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html' : 'font/woff2' }); fs.createReadStream(f).pipe(r); }).listen(0);
const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(`http://localhost:${server.address().port}/film/v3/stage.html`); await page.evaluate(() => window.ready);
const dir = path.join(here, 'frames'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
const shots = [];
for (const [i, f] of FRAMES.entries()) {
  const c = ctx(`k${i}`), body = f.art(c), file = `${String(i + 1).padStart(2, '0')}_${slug(f.title)}.png`;
  await page.evaluate(s => window.show(s), `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs>${c.defs.join('')}</defs>${body}</svg>`);
  await page.screenshot({ path: path.join(dir, file), clip: { x: 0, y: 0, width: 1920, height: 1080 } });
  shots.push({ n: i + 1, file, tin: T[i], tout: T[i + 1], title: f.title, act: f.act, visual: f.visual, motion: f.motion, vo: f.vo, sfx: f.sfx });
}
fs.writeFileSync(path.join(here, 'shots.json'), JSON.stringify(shots, null, 1));
await browser.close(); server.close();
console.log(shots.length, 'frames, flat UI');
