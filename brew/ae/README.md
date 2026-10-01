# brew v3 storyboard -> After Effects

**Easiest: `brew_storyboard_v3_ONE_SCRIPT.jsx`** is a single self-contained file. It has every element
image, the reference frames and the temp soundtrack packed inside. Run it on its own: it unpacks its
images into `brew_v3_storyboard_assets/` next to itself and builds the full layered project below.
(Flat backgrounds become native AE solids; soft glows are stored at 1/4 size and scaled 400%.)

App windows are **flat and straight** in this export (shots 10 and 20 have no perspective/skew), so every UI
element is a plain 2D layer. The MAIN timeline stacks **bottom to top**: shot 01 at the bottom, 34 at the top.

The scripts below do the same from the loose files in this folder. All share the 93-second film v3
timing, and none adds any animation.

| Script | What you get |
|---|---|
| `brew_storyboard_v3_LAYERED.jsx` | **Every element as its own layer.** Each shot is a precomp (backgrounds, each gradient glow, each card, each text line, buttons, chips, cursor, brackets, app window parts...) stacked and positioned exactly like the storyboard. The precomps sit on a MAIN timeline at their film times. |
| `brew_storyboard_v3_timeline.jsx` | One flat image per shot on the timeline (quick reference). |

## Run
1. Keep this folder together (the scripts look for `layers/`, `frames/` and the WAV next to themselves).
2. After Effects -> **File -> Scripts -> Run Script File...** -> pick a script.

## The layered project
```
brew v3 storyboard (layered)/
  MAIN - brew v3 storyboard timeline   1920x1080 · 60 fps · 93 s
  Shots/              34 precomps, one per shot (double-click to see its layers)
  Elements/           261 unique element PNGs, imported once and reused
  Reference frames/   the 34 flat frames
```
- 401 element layers in total (261 unique images). `LAYERS.txt` lists every layer of every shot with its position and size.
- Each element is a tightly cropped transparent PNG, positioned with its anchor at its own centre,
  so it's ready to animate (scale/rotate from the middle of the card, not the comp).
- Each precomp also has a hidden **REFERENCE** guide layer (the flat frame). Switch it on to check alignment.
- Shot precomps on MAIN are colour-labelled by act and have a marker with the shot notes.
- Re-stacking the layers was checked against the flat frames: average difference under 0.6 of 255 on every shot.

## Notes
- Blurred elements (far "mess" cards, the faded app behind the lifted card) keep their blur baked in.
  The faded app in shot 12 is one plate on purpose.
- Text is rasterised (PNG) so it looks exactly like the storyboard on any machine. If you want live,
  editable AE text layers instead, ask and I'll generate them (needs Archivo, Bricolage Grotesque
  and IBM Plex Mono installed, all free on Google Fonts).
- To change the frame rate, edit `var FPS = 60;` at the top of the script.
- Regenerate everything from the storyboard source: `export_frames.mjs` → `export_layers.mjs` →
  `build_layered_script.mjs` + `build_single_script.mjs <soundtrack.mp3>`.
