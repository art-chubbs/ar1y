# ar1y — motion study 01

A 12-second, 1920×1080, 60fps motion piece: shapes intro → kinetic type (MOVE / SHAPE / FLOW) → `ar1y.` logo reveal → iris outro.

The animation is code: `anim.js` draws every frame on a canvas as a pure function of time, so it plays live in a browser and renders deterministically to video.

- **Preview:** serve this folder (e.g. `npx serve motion`) and open `index.html`.
- **Render:** `node render.mjs` → `out/ar1y-motion.mp4` (needs Playwright + Chromium and an ffmpeg with libx264; set `PLAYWRIGHT` / `FFMPEG` env vars if they aren't on the default paths).
- **Quick stills:** `node render.mjs --stills 2,5.3,9.8` → `out/still-<t>.png`.

Timing lives in `anim.js` (each scene function uses `prog(t, start, duration)`), colors in the `C` palette at the top.

Fonts: Inter and Space Grotesk (SIL Open Font License, see `fonts/`).
