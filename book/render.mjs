// Render dist/book.html + dist/cover.html to PDF with Chromium.
// Usage: node render.mjs <out-body.pdf> <out-cover.pdf>
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
let pw;
try { pw = require("playwright"); } catch { pw = require("/opt/node22/lib/node_modules/playwright"); }

const here = path.dirname(fileURLToPath(import.meta.url));
const [bodyOut, coverOut] = process.argv.slice(2);

const footer = `
<div style="width:100%;font-family:Inter,Arial,sans-serif;font-size:7px;color:#6b7280;
            padding:0 0.75in;display:flex;justify-content:space-between;letter-spacing:0.06em;">
  <span>SYSTEM DESIGN &middot; FROM FIRST PRINCIPLES TO PLANET SCALE</span>
  <span style="font-weight:700;color:#1b1f27;"><span class="pageNumber"></span></span>
</div>`;

const browser = await pw.chromium.launch();
const page = await browser.newPage();

await page.goto("file://" + path.join(here, "dist/book.html"), { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.pdf({
  path: bodyOut,
  width: "7in",
  height: "10in",
  preferCSSPageSize: true,
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: footer,
  outline: true,
  tagged: true,
});

await page.goto("file://" + path.join(here, "dist/cover.html"), { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: coverOut, width: "7in", height: "10in", printBackground: true, preferCSSPageSize: true });

await browser.close();
