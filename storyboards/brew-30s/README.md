# Brew · 30s explainer · shot board v2

Zelios-style storyboard for a 30-second Brew explainer. It's a new board: the original Figma page (`brew 30s explainer · shot board`) was not modified.

**Live canvas:** https://claude.ai/artifact/3Db24PufzyzdCjaYpm4NfG

This folder holds the source for that canvas: `canvas.json` is the layout index, and each `*.dc.html` file is one artboard.

## Boards

| # | Beat | Time | VO |
|---|------|------|----|
| — | Cover | — | Script, timing, and specs |
| — | Direction | — | Palette, type, and motion rules |
| 01 | Hook | 0:00–0:02.5 | "Your product ships every week." |
| 02 | Problem | 0:02.5–0:06 | "But your emails? Still stuck in a ten-tab workflow." |
| 03 | Reveal | 0:06–0:08 | "Meet Brew." |
| 04 | Prompt | 0:08–0:11 | "Just describe the campaign in plain English…" |
| 05 | Build | 0:11–0:14 | "…Brew writes the copy, designs the email…" |
| 06 | Audience | 0:14–0:16 | "…picks the right audience…" |
| 07 | Render | 0:16–0:19 | "…and ships HTML that renders everywhere." |
| 08 | Integrations | 0:19–0:23 | "Send from Brew, or push straight to your ESP." |
| 09 | Payoff | 0:23–0:27 | "Less busywork. More campaigns that land." |
| 10 | End card | 0:27–0:30 | "Brew. Email marketing, brewed in seconds." |

Each shot board has the frame, a 30s position bar, the VO line, and notes on animation, camera, transition out, and sound.

## Palette

| Name | Hex | Role |
|------|-----|------|
| Brew Green | `#1FC977` (stand-in) | The colour kept from the original. Used for the solution world, CTAs, and The Drop |
| Espresso | `#1B1512` | Ink, dark grounds |
| Crema | `#F6EFE6` | Light ground |
| Oat | `#E6DACB` | UI skeletons, dividers |
| Roast | `#6B6058` | Captions, the grey world |
| Lilac | `#B7A4FF` | The only second accent |
| Deep Green / Mint Foam | derived from green | Green on light backgrounds, calm grounds |
| Annotation | `#6A4DF4` | Board-only markup, never used in final frames |

Type: Bricolage Grotesque (display) · Geist (UI/body) · Geist Mono (timecodes, labels).

## Swapping in the exact green

Each board has a `green` tweak (Tweaks panel), and Deep Green and Mint Foam are derived from it. To change it everywhere, update the `"default"` of `green` in each file's `data-props` and the `'#1FC977'` fallbacks in its `renderVals()`.

## Placeholders to confirm

- Logo lockup (03, 10): a placeholder set in the display face. Swap it for the brand logo.
- Tagline "Email marketing, brewed in seconds.": a draft line.
- `[SEGMENT SIZE]`, `[Your brand]`, `[TRACK]`.
