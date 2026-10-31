# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Round Table Bangladesh members and delegates attending the ASPA AGM 2026 ceremony. They watch a large LED wall behind speakers during formal proceedings; the screen's job is prestige and atmosphere, not interaction.

## Product Purpose

A full-screen, continuously animated event-background loop for the AGM stage screen. Success: from across the room it reads as a premium motion-graphics identity for the event; up close it rewards with crafted detail. It plays silently for hours.

## Positioning

The official animated identity of the 3rd Annual General Meeting of Round Table Bangladesh (ASPA AGM 2026) — the only screen content carrying all member-club marks together with the event wording.

## Operating Context

Single LED wall with a 2:1 ratio screen, driven by a typical event playback computer. One self-contained `index.html` (embedded fonts, logos, no network). Keyboard: F fullscreen, Space pause, double-click toggles fullscreen. Reduced-motion viewers receive a frozen hero frame.

## Capabilities and Constraints

- 60-second seamless loop (t=60 identical to t=0); all motion periodic with integer cycles.
- Canvas 2D only; no heavy frameworks; 60 fps target on modest hardware.
- Build: `node build-site.cjs` embeds `engine.js`, `logos-opt/*`, fonts into `index.html`.
- Freeze-frame (`?t=N`) and debug (`?debug=1`) query flags for testing.

## Brand Commitments

- All 9 logos in `logos-opt/` (8 SVG rondels incl. RTITM + fiveclubs PNG) must appear; none dropped.
- Exact wording preserved verbatim: `ASPA AGM 2026`, `3RD ANNUAL`, `GENERAL`, `MEETING`, `ROUND TABLE BANGLADESH`, `ADOPT - ADAPT - IMPROVE`, `3RD ANNUAL GENERAL MEETING`.
- Colour family stays traceable to brand gold/green/red; no invented organizational details.

## Evidence on Hand

- `logos-opt/`: RTI.svg, ASPA.svg, RTBD.svg, DRT1.svg, DMRT2.svg, DJRT3.svg, DYRT4.svg, RTITM.svg, fiveclubs.png.
- Fonts: `nunito.woff2` (Nunito Sans), `fraunces-900.woff2` (Fraunces, display).
- Prior worlds (`engine.js` history): centered-glow "Delta Dawn", left-hero "Padma Light", seal-and-serif "Delta Seal" — all superseded; treat as anti-reference for a new concept, not authority.

## Product Principles

1. Ceremony over decoration: every element serves prestige and legibility at distance.
2. One screen, one composition: no UI chrome, no cards, no dashboard language.
3. Motion is the medium: the wall never reads as a static poster.
4. Truth in marks: real logos, real wording, always recognizable.

## Accessibility & Inclusion

prefers-reduced-motion renders a single static hero frame; essential text kept clear of screen edges.
