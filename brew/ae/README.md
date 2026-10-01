# brew v3 storyboard -> After Effects

Two scripts, same timing (the 93-second film v3 cut). Neither adds any animation.

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
  Elements/           285 unique element PNGs, imported once and reused
  Reference frames/   the 34 flat frames
```
- 401 element layers in total. `LAYERS.txt` lists every layer of every shot with its position and size.
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
- `export_layers.mjs` regenerates `layers/` + `layers.json` from the storyboard source.
