# Zero premium-ultimate pass — 2026-10-27

User direction: "upgrade the UI of zero as well as the logo — like make it premium ultimate."
Applied identically to all four homepage files; **nothing uploaded**. The livefix pass's work was
read first (zero-livefix-REPORT.md) and is fully preserved: renderAnswer math/markdown handling,
the pluginHits render path, the pill order home | » | + | All tabs | CC | history, the KaTeX head
links, the Council Deep ternary (api-council.php), and the newsy grounding v2 code are untouched.

## Files (after this pass)

| File | Bytes | MD5 |
|---|---|---|
| index.html | 236,445 | 8314a7e29848e02e7a56b48efcbe0227 |
| index-upload.html | 236,445 | 8314a7e29848e02e7a56b48efcbe0227 (byte-identical ✓) |
| index-student.html | 237,017 | 61de423153b0e7ffd0410a643fe33cec |
| index-photos.html | 237,588 | 8ef9525bf39309c17fc0b0d261ba6a1d |
| zero-mark.svg (new, logo source) | 2,100 | 8908404c16609bc3049ba6b3f600cb42 |
| icon-512.png (regenerated) | 12,979 | beaf32858097e8244dbb0ed2f98c84a0 |
| icon-192.png (regenerated) | 4,326 | ab866224a89a991beff3a93b7ec950aa |
| apple-touch-icon.png (regenerated) | 3,967 | 6668d90b1e6a03bf6973ee587f5597b5 |

Invariants re-proven after patching: the index→student diff and the student→photos diff are
content-identical to the pre-pass diffs (only the pre-existing Zero Student / Zero Photos tile
lines; line numbers shifted). Every anchor in the patch script was asserted exactly once per
file (icon `?v=3` exactly 3× per file). Original icons backed up at /tmp/zero-icons-orig/.

## 1. Logo refinement — same mark, premium finish

The mark stays exactly the identity the user loves: a white circle with a blue "0". New source
of truth: `zero-mark.svg`, refined with —

- **Disc depth:** subtle radial gradient (white core → #f5f7fc → #e6ebf7 edge), a soft blurred
  top-left highlight, and a faint indigo ambient shade at the bottom of the disc.
- **Crisp ring:** a 1.1-unit ring stroke in theme indigo at 20% opacity plus a fine white
  inner rim (r=45.5) — the edge now reads sharp at every size instead of the old flat pale edge.
- **The "0":** rebuilt as an even-odd ellipse-ring path (font-independent, crisp at 16px) with
  a vertical blue gradient in the Atelier family (#5f86ef → #3a5fd9 → #2a47b0), a white sheen
  fading down its top half, and a soft indigo drop shadow lifting it off the disc.

Derivatives regenerated exactly the way the Student icons were made (headless-Chromium raster
at 1024 → PIL LANCZOS downscale → palette-quantize, transparent corners preserved; alpha bbox
measured 974×974 — perfectly circular): icon-512.png, icon-192.png, apple-touch-icon.png (180).
The in-page `<link rel="icon">`, apple-touch link, and the macbar `<img>` were cache-busted
`?v=3` → `?v=4` so browsers pick up the refined mark. manifest.json already points at these
filenames, so no manifest change was needed. The mark also shows in the macbar (verified in the
hero screenshot).

## 2. UI premium polish

CSS-first, as one additive layer ("PREMIUM ULTIMATE LAYER") at the end of the main stylesheet,
plus the two wordmark edits below. Theme colors unchanged (Atelier ivory/ink + gold hairlines +
indigo interactive); no layout moves.

- **Wordmark gradient:** retuned from the legacy purple (#7c7cf4/#5a5ae6/#7c3aed) to the Atelier
  indigo family with a light #8aa2ee stop for dark-theme legibility; still animated
  (gradientShift, 7s). Letter-spacing set to -.038em and the drop shadow deepened to a layered
  indigo glow + hairline top light. The word "ZERO" itself is unchanged — no category text added.
- **Search bar (.bar):** layered shadow stack (hairline + mid + wide indigo-tinted), an inset
  glass top edge, deeper hover lift, and a refined focus ring (4px indigo halo + deep soft
  shadow); dark-theme counterparts included. The Atelier layer's translateY(-2px) focus lift
  is preserved.
- **Cards:** widgets and result items (.zs-item) get layered neutral shadows (indigo-tinted on
  result hover; the Atelier gold hairline hover still applies). Answer text gets a hair of
  letter-spacing; answer headings tighten to -.012em. Suggestion dropdown gets the deep layered
  shadow + row transitions. Results minibar gets a soft shadow.
- **Pill:** now true glass — translucent card color (color-mix 76%) with blur(22px) saturate
  (1.55), a hairline border, an inset top highlight, and a layered drop shadow (dark variant
  included). Tab icons gain soft depth shadows (stronger on hover); mini buttons gain layered
  shadows with a smooth box-shadow transition. **Icon colors untouched — home is still the only
  blue** (verified by computed style).
- **Apps menu + tabs popup:** hairline border + deep layered shadows, rounder tiles (14px),
  hover shadow, and app icons that gain a deeper shadow on hover.
- **Control Center:** panel shadow deepened; tiles gain layered shadows, a hover lift
  (translateY(-2px)) and box-shadow transitions (they previously had no hover state); tile icon
  shadows refined.
- **Buttons:** .btn gains full state transitions + hover shadow + active press (scale .97).
  The macbar mark gets a hairline ring + soft shadow; the results-view mini wordmark tightens.
- **Reduced motion:** the stylesheet's existing global reduced-motion kill-switch covers the
  new transitions; the layer additionally disables the new hover lifts under
  prefers-reduced-motion.

## 3. The lone-"0" flash — FIXED

**Verdict: it was the staged wordmark reveal, not a loading bug.** `.wm-zero` faded the "0" in
first (zeroFade) while `.wm-zer` started at max-width:0/opacity:0 and expanded late
(zerExpand) — so for the first second the hero showed a single large "0", exactly what the live
test noted. **Fix:** both span rules replaced with one static rule (inline-block, no staged
animations, no max-width clamp); the gradient animation now comes from the shared
`.wordmark span` rule, and the whole wordmark enters as one unit via the existing wordmarkIn
animation on the `<h1>`. First paint is now the final layout (no reflow from the reveal). The
orphaned zeroFade/zerExpand keyframes remain defined but unused (zero-risk to leave; the
reduced-motion media query still references only class names).

## 4. Verification (all local, headless Chromium/CDP on file://)

- **Syntax:** all 9 inline script blocks pass `node --check` in each of the four files.
- **Harness (16/16 PASS)** on index.html with the livefix approach (fetch stubbed live-like,
  Percentage/Roman/Binary/Days Until enabled):
  - Wordmark text is exactly the "ZER0" brand; .wm-zer computed opacity 1 / max-width none;
    span animation is gradientShift only; `<h1>` animation is wordmarkIn.
  - Pill order by DOM position: home | » | + | All tabs | CC | history; "»" glyph present.
  - Home .t-ico computed background = rgb(58, 95, 217) (the theme blue); », +, history
    backgrounds = card color (not blue). Pill computed backdrop-filter = blur(22px) saturate(1.55).
  - Plugin card renders through the real search path: "15% of 240" → card "36 · 15% of 240 = ·
    Plugin · percentage".
  - Apps menu opens from the pill (11 tiles). Control Center opens from the pill and closes on
    a real CDP Escape keypress.
  - 0 page exceptions / console errors on index.html and index-photos.html; index-photos.html
    still carries both the Zero Student and Zero Photos tiles.
- **renderAnswer regression (Node, livefix's method):** sample with **bold**, *italic*, a ####
  heading, a \[ 0.70 \times 120 = 84 \] block and "$5 and $10" → all checks PASS (strong/em/h4
  produced, no raw LaTeX or ####, prices untouched). The function region was not modified by
  this pass (patch anchors were all in head/CSS/icon links).
- **Visual:** hero screenshot — unified indigo ZER0 wordmark, glass pill with blue home and
  white » / +, layered search bar with the refined focus glow, refined mark in the macbar;
  results-view screenshot — pill/card polish consistent.

## Deploy note

This pass changes only the four index files plus the three regenerated icon PNGs and the new
zero-mark.svg source. Per the standing deploy plan, the round uploads **index-photos.html as
the homepage** (it carries everything: base + Student tile + Photos tile + livefix + this
polish), alongside the Student/Photos round files and — new in this pass — icon-192.png,
icon-512.png, apple-touch-icon.png, and zero-mark.svg.
