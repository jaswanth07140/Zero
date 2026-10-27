# Zero Website — Incremental Upgrade Sweep (2026-10-12)

Owner is away. All changes are LOCAL ONLY in `~/workspace/zero-redesign/`.
Nothing was uploaded (FTP login currently rejected — owner must upload manually or provide password).

## Changes made

### 1. Pending fixes — Task Mode / iframe browser (zerocode.html)
- **Added "Search Google" button** to the iframe browser bar. Opens
  `https://www.google.com/search?q=<current input>` in a new tab via new
  `searchGoogleExternal()` function. Styled to match the existing external-open button.
- **"Take control" → "Expand":** the visible button text was already "Expand"
  (verified); removed the dead `takeControl()` function — the last remnant of the
  old wording (its alert "No preview to take control of yet" could never fire;
  the function had zero callers). Only remaining trace is the camelCase element
  id `takeControlBtn`, which is not user-visible.
- **Why:** the old wording misled users into thinking the AI drives the iframe browser.
- **Verified:** all 4 inline JS blocks pass `node --check`; button/fn names unique;
  no user-visible "take control" strings remain (case-insensitive scan).

### 2. Performance — homepage image weight (index.html)
- Added `loading="lazy" decoding="async"` to **24 images** inside hidden containers:
  21 apps-menu icons, 2 Zero Mail logos, 1 QR code. These previously loaded eagerly
  (~2.3 MB total image weight on first paint); now deferred until their popup opens.
- **Why:** biggest safe mobile win; containers use `[hidden]`/`display:none`, so lazy
  loading genuinely defers them.
- **Verified:** markup intact (spot-checked tags); `node --check` on all 7 JS blocks passes.

### 3. Performance — animation + caching
- **index.html:** added `@media (prefers-reduced-motion: reduce)` that disables the
  infinite aurora/gradientShift animations and smooth scrolling. Respects OS setting,
  saves mobile battery; no visual change for anyone else.
- **.htaccess:** added 1-year `immutable` Cache-Control for versioned static assets
  (`.webp/.png/.jpg/.svg/.ico/.woff2`). Icons already use `?v=` cache-busting, so
  this is safe. Follows the file's existing `<IfModule mod_headers.c>` pattern.
- **Verified:** .htaccess edit mirrors existing syntax; no PHP files touched.

### 4. Bug fixes — broken image references
- **zero-computer.html:** favicon pointed at `icons/icon-192.png` (doesn't exist) →
  fixed to `icon-192.png` (root). Page had no favicon at all.
- **zerotube.html:** watch-view Share button used `icons/icon-ztshare.webp`
  (doesn't exist) → fixed to existing premium `icons/icon-share.webp`.
- **Verified:** audited 50 asset references across all HTML files; these were the
  only 2 broken. All 45 webp icons on disk; every other reference resolves.

### 5. Polish — focus states (zerocode.html)
- Added global `:focus-visible` rule (2px blue outline, offset 2px). Keyboard users
  get a visible focus ring; mouse/touch users see no change. Chat input previously
  had `outline:none` with no replacement indicator.
- **Verified:** CSS-only addition; no conflicts with existing `:focus` rules.

### 6. Bug hunt — preview panel behavior (zerocode.html, code inspection)
- Audited all 5 `artPane.classList.add("open")` call sites: real code preview,
  user-opened Browse tab, user "go to <site>" request, user-initiated screen share,
  task-option tap. **Panel never opens on idle.** No bug found; no change made.
- History Clear button (`#clrHist`) logic intact in index.html.

## Verification summary
- `node --check`: all inline JS blocks pass — index.html (7), zerocode.html (4),
  zerotube.html (3), zmaps.html (1), zerovault.html (1).
- `php -l`: unavailable (no PHP on this VM). No PHP files were edited.
- Asset audit: 50 refs checked → 2 broken → both fixed.
- Mobile: browse bar now has 4 buttons; flex layout with `min-width:0` input fits
  360px viewports (input narrows, no overflow). `prefers-reduced-motion` tested
  by code review only.
- ZeroTube thumbnails already use `loading="lazy"` + IntersectionObserver — left alone.

## Deliberately left alone (not incremental or needs owner call)
- **Emojis in production UI:** dozens remain (zmaps buttons/pins/directions,
  zerocode activity-log icons + AI greeting, index.html mail nav + AI-level buttons,
  zerocall/zeromessage/zerogen buttons). The standing rule says premium icons only,
  but a wholesale purge across 8+ files is not incremental and each replacement
  needs a design decision. → **Question for owner:** purge all emojis now, or
  prioritize specific pages?
- **Control-center icons:** the overlay covers the viewport even when invisible
  (`opacity:0`), so `loading="lazy"` would not defer them. Restructuring the
  overlay is not incremental. Left eager.
- **`takeControlBtn` element id:** cosmetic only; renaming touches CSS + 2 JS
  references for zero user benefit. Left as-is.
- **Screen-share code in zerocode.html:** uses the real `getDisplayMedia` API and
  is user-initiated — not the "fake screen sharing" that was killed. Removing
  features is out of scope.
- **No backend/PHP changes, no new features, no removed features, no new pages.**

## Questions for the owner
1. Emoji purge — full sweep now, or prioritize pages? (see above)
2. FTP upload is blocked (saved login rejected) — none of this is live. Provide
   the FTP password or upload the changed files manually: `index.html`,
   `zerocode.html`, `zerotube.html`, `zero-computer.html`, `.htaccess`.
3. "Search Google" button in the Zero AI browser bar — label okay, or prefer a
   shorter "Google" on phones?
