# brew v3 storyboard -> After Effects timeline

Lays the 34 storyboard v3 frames onto an After Effects timeline at their exact times in the
93-second film v3 cut. **No animation**: every shot is a still layer with an in and out point.

## Contents
- `frames/`: 34 clean 1920x1080 PNGs (`01_...png` to `34_...png`), no board labels
- `soundtrack_v3_temp.wav`: the temp sound design from film v3, same timing
- `brew_storyboard_v3_timeline.jsx`: the script that builds the comp
- `shots.json`: the shot list (file, in/out seconds, notes) the script was generated from

## Use it
1. Keep the folder together (the script looks for `frames/` and the WAV next to itself).
2. After Effects -> **File -> Scripts -> Run Script File...** -> choose `brew_storyboard_v3_timeline.jsx`.
3. You get a bin **brew v3 storyboard** with a comp **brew v3 - storyboard timeline**
   (1920x1080, 60 fps, 93 s), and the comp opens.

## What's in the comp
- One still layer per shot, named `01 - Typed: "The same video."` etc., trimmed to its slot.
  Shot 01 is the top layer; the shots sit end to end with no gaps or overlaps.
- Layer label colours by act: red = The problem, green = Meet brew, blue = We make it,
  cyan = You drive it, orange = Close.
- A comp marker at each shot start, spanning the shot, with the full notes
  (visual, motion, VO, SFX). The layer comment holds the visual description.
- The temp soundtrack as the bottom layer.

To change the frame rate, edit `var FPS = 60;` at the top of the script (30, 25 and 24 all work;
the shot times are in seconds).
