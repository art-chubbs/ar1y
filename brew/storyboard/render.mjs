// Rasterise the storyboard: PNG per frame + per board page, and one PDF of the board.
//   node render.mjs   (run build.mjs first)
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, 'out');

const css = `
@font-face{font-family:'Bricolage Grotesque';font-weight:200 800;src:url(/fonts/bricolage-grotesque-latin-wght-normal.woff2) format('woff2')}
@font-face{font-family:'Archivo';font-weight:400;src:url(/fonts/archivo-latin-400-normal.woff2) format('woff2')}
@font-face{font-family:'Archivo';font-weight:500;src:url(/fonts/archivo-latin-500-normal.woff2) format('woff2')}
@font-face{font-family:'Archivo';font-weight:600;src:url(/fonts/archivo-latin-600-normal.woff2) format('woff2')}
@font-face{font-family:'IBM Plex Mono';font-weight:400;src:url(/fonts/ibm-plex-mono-latin-400-normal.woff2) format('woff2')}
@font-face{font-family:'IBM Plex Mono';font-weight:500;src:url(/fonts/ibm-plex-mono-latin-500-normal.woff2) format('woff2')}
html,body{margin:0;background:#0B0B0C}svg{display:block}
@page{margin:0}`;

const server = http.createServer((req, res) => {
  const f = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': f.endsWith('.woff2') ? 'font/woff2' : f.endsWith('.html') ? 'text/html' : 'image/svg+xml' });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch();
const page = await browser.newPage();
const fontsReady = () => page.evaluate(async () => {
  await Promise.all(['800 40px "Bricolage Grotesque"', '400 20px Archivo', '600 20px Archivo', '500 20px "IBM Plex Mono"'].map(f => document.fonts.load(f)));
  await document.fonts.ready;
});

async function shoot(svgFile, pngFile, w, h, scale = 1) {
  await page.setViewportSize({ width: w, height: h });
  fs.writeFileSync(path.join(outDir, '_tmp.html'), `<!doctype html><meta charset="utf-8"><style>${css}</style>${fs.readFileSync(svgFile, 'utf8').replace(/^<\?xml[^>]*>\s*/, '')}`);
  await page.goto(`${base}/out/_tmp.html`);
  await fontsReady();
  await page.screenshot({ path: pngFile, clip: { x: 0, y: 0, width: w, height: h }, scale: scale < 1 ? 'css' : 'device' });
}

fs.mkdirSync(path.join(outDir, 'png'), { recursive: true });
const frames = fs.readdirSync(path.join(outDir, 'frames')).filter(f => f.endsWith('.svg')).sort();
for (const f of frames) await shoot(path.join(outDir, 'frames', f), path.join(outDir, 'png', f.replace('.svg', '.png')), 1920, 1080);
const boards = fs.readdirSync(path.join(outDir, 'board')).filter(f => f.endsWith('.svg')).sort();
for (const f of boards) await shoot(path.join(outDir, 'board', f), path.join(outDir, 'png', f.replace('.svg', '.png')), 1920, 1820);

// PDF: every board page, one per PDF page
const html = `<!doctype html><meta charset="utf-8"><style>${css} .pg{width:1920px;height:1820px;page-break-after:always;overflow:hidden}</style>` +
  boards.map(f => `<div class="pg">${fs.readFileSync(path.join(outDir, 'board', f), 'utf8').replace(/^<\?xml[^>]*>\s*/, '')}</div>`).join('');
fs.writeFileSync(path.join(outDir, '_tmp.html'), html);
await page.goto(`${base}/out/_tmp.html`);
await fontsReady();
await page.pdf({ path: path.join(outDir, 'brew-storyboard-v1.pdf'), width: '1920px', height: '1820px', printBackground: true });
fs.unlinkSync(path.join(outDir, '_tmp.html'));
await browser.close();
server.close();
console.log(`png: ${frames.length + boards.length}, pdf: 1`);
