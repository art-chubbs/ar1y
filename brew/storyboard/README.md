# brew launch film: storyboard v1

72-second, 16:9 launch film for brew (Scale With Brew). 29 frames across 6 acts, plus a cover, VO script and style/motion page.
Brand research lives in `../research/brand-notes.md`.

## Files
- `out/brew-storyboard-v1.pdf`: the full board (11 pages) to read and share.
- `out/frames/*.svg`: each frame at 1920×1080, editable vectors with live text. **These are the Figma files.**
- `out/board/*.svg`: each board page (frames + notes) as editable vectors.
- `out/png/`: PNG previews of every frame and page.

## Into Figma
1. Select the SVGs in `out/frames/` (and `out/board/` if you want the annotated pages) and drag them onto a Figma canvas.
2. Each one becomes a frame with editable layers and text. The fonts are all on Google Fonts and available in Figma by default:
   **Bricolage Grotesque**, **Archivo**, **IBM Plex Mono**.
3. Background dot grid uses an SVG pattern; if Figma flattens it, delete that layer or replace it with a dot-grid fill.

## Rebuilding
Frames are generated from code so wording, timing and layout stay consistent across the board.
- Edit frame art and notes in `frames.mjs`, components in `art.mjs`, brand helpers in `lib.mjs`.
- `node build.mjs`: writes the SVGs.
- `PLAYWRIGHT=/path/to/playwright node render.mjs`: writes PNGs and the PDF.

## Placeholders to replace before production
- The Rose Freedman archive photo, Panama map, serum product shot and UGC creators are drawn stand-ins.
- The 15-point review list wording is illustrative; swap in brew's real checklist.
- Product used in the b-roll/UGC scenes (serum) is a generic example; swap for a real client case if there is one.
