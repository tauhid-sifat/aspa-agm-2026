# Design — Living Bengal Delta (LED event loop)

<!-- impeccable:design-schema 1 -->

## Thesis

A ceremony backdrop, not a festival visual: deep-ink Bangladesh green,
braided luminous tube-rivers, ivory inscriptional type. Refuses the
glow-blob screensaver and the neon-tube demo alike.

## Visual system

- **Ground:** near-black green `#031008`, exponential fog, vignette +
  title-rest scrim. Nothing pure black except linework.
- **Rivers:** 16 Three.js tube meshes on seeded CatmullRom braids —
  12 dark-green Phong bodies with warm specular, 3 amber + 1 red
  additive flow-shader tubes, 8 comet sprites riding curves,
  3 tilted gold tori + 2 dashed kantha loops, 2 counter-rotating
  dust layers. 3 orbiting point lights (amber/red/teal) + warm key.
- **Type:** Fraunces 900 ivory display (`GENERAL` / `MEETING`),
  Nunito 800 letterspaced gold/ivory labels. Mask-rise entrances,
  gold rule with red tip.
- **Foreground chrome:** hairline gold frame only. No buttons, no text
  beyond the headline lockup.
- **Motion:** two independent clocks — background `bgT` never resets;
  foreground 40 s scene loop (8/6/8/10/8, ~1 s crossfade wipes).
  Camera drifts on incommensurate sine periods (never visibly loops).
  Reduced motion → frozen headline frame.

## Scene order (fixed)

1. Headline lockup → 2. RTI (light sweep) → 3. ASPA + RTBD + RTITM →
4. RTBD + DRT1 + DMRT2 + DJRT3 + DYRT4 → 5. fiveclubs + draw-ring → loop.

## Provenance / engineering notes

- `three.min.js` r128 UMD embedded inline (offline playback).
- All 9 logos + 2 fonts embedded as data URIs by `build-site.cjs`.
- MeshStandardMaterial avoided: unverifiable under SwiftShader;
  Phong + emissive baseline used instead (verified pixel-bright).
- fiveclubs ships as PNG (lossless decode path).
- Detector `broken-image` warnings accepted as false positives:
  `<img data-logo>` srcs are assigned at boot from embedded assets;
  DOM dumps confirm all 10 resolve, none hidden, zero console errors.
- Finish verification: stills at t=4/11/18/27/36, transitions at
  t=8.5/39.7, loop-boundary clean, 1920×960, Edge headless.

## Finish

Unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster
carrying its provenance.
