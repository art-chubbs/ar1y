# brew storyboard v4: night glass

A 30-second, music-led launch film for brew, modelled on the "NeuraFlow" SaaS film by Zelios
(https://youtu.be/aSte18D2_YE) and translated to brew's brand: near-black stage, one green-to-teal
volumetric beam, a planet horizon the product rises out of, dark glassmorphism UI, an orbit of brew's
six stages, a chat exchange, a curved card carousel, and brew's viewfinder brackets as the mask that
turns into the logo.

16 shots, 7 board pages (cover, reference and pacing, look kit, 4 shot pages).
Every element is a flat 2D layer (no perspective or skew) and tagged with `data-layer`,
so the shots split cleanly into After Effects layers.

- `out/brew-storyboard-v4-night-glass.pdf`: the board
- `out/frames/*.svg`, `out/png/*.png`: each shot at 1920x1080
- Figma: file "brew — Launch Film Storyboards", page "v3 + v4", section "v4 — Night glass launch"

Build: `node v4/build.mjs` then
`OUT=v4/out PDF=brew-storyboard-v4-night-glass.pdf node render.mjs` (from `brew/storyboard`).
Edit shots in `frames.mjs`, the look in `kit.mjs`. Swap `N.green`/`N.teal`/`N.mint` in `kit.mjs` to change the light colour.
