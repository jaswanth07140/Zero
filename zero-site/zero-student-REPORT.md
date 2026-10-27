# Zero Student — build report (2026-10-27)

Zero Student = the full StudyPlus feature set as a section inside Zero (zero.page.gd), built locally in
`~/workspace/zero-redesign/`. **Nothing was uploaded.** `index.html` and `index-upload.html` were NOT modified
(md5 still `b946a2344d119aebcc58436bd841ff3b`, 226,431 B — verified before and after the build).

## Files created (all in ~/workspace/zero-redesign/)

| File | Bytes | Source / notes |
|---|---|---|
| student.html | 220,742 | Adapted copy of StudyPlus `index-live.html` (220,197 B); md5 404e3d3ff0795c185cf015b7a011ee2d |
| student-school.html | 292,365 | Adapted copy of StudyPlus `school.html` (292,317 B); md5 0a1ffc70990c969a851a4453758c2f13 |
| index-student.html | 227,003 | STAGED homepage = index.html + Zero Student tiles only (+572 B); md5 d4b5a81b2cdea260d33723c3f4554870 |
| studyplus-features.js | 51,473 | Byte-identical copy (Plus Tools 25; index references this exact filename) |
| sp-auth.php | 4,577 | Byte-identical copy |
| sp-progress.php | 3,132 | Byte-identical copy |
| sp-notes.php | 6,411 | Byte-identical copy |
| canvas-proxy.php | 4,563 | Copy with origin re-lock (below) |
| schoolahead-auth.php | 6,883 | Copy with origin re-lock (below) |
| student-manifest.json | 493 | New PWA manifest (Zero Student branding; does NOT touch Zero's own manifest.json) |
| student-icon-192.png | 8,220 | StudyPlus book icon under a non-colliding name (Zero's icon-192.png untouched) |
| student-icon-512.png | 28,826 | Same |
| student-icon.svg | 1,145 | Same (school page favicon) |
| icons/icon-student.webp | 3,816 | Generated from the book icon for the homepage tiles |

No filename collisions with existing Zero files (all target names were checked first).

## Adaptations — student.html
- Brand: sidebar H1 is now "Zero **Student**", sub-line "Part of Zero · AI Teacher"; `<title>` and meta
  description rebranded; all 19 user-visible/prompt occurrences of "StudyPlus" → "Zero Student" (teacher
  system prompt, greetings, "Zero Student Teacher" labels, Notebook/My AIs prompts and caps text, comments).
- **Back link**: "← Back to Zero" (`#back-to-zero`, → `index.html`) inserted between the brand and the nav.
- School nav link and the Ctrl+K jump-modal School entry now point to `student-school.html` (was `school.html`).
- Manifest → `student-manifest.json`; apple-touch-icon → `student-icon-192.png`.
- Cookie-warmup iframe: `https://zero.page.gd/?spcookie=1` → relative `index.html?spcookie=1` (same-origin now).
- **Untouched on purpose**: `const API='api-single.php';` is still RELATIVE (resolves to Zero's own
  api-single.php — zero occurrences of `studyplus.page.gd` or any absolute API URL); every localStorage key
  (all `studyplus-*` keys kept verbatim — zero.page.gd is a different origin, so Zero Student starts with
  fresh data, as expected); the in-page sign-out modal (`#signout-modal` present); `confirm(` count = 0.

## Adaptations — student-school.html
- Brand sub: "Part of Zero Student · ← Zero Student"; back link → `student.html` (was index.html/StudyPlus).
- `<title>` + og:title → "School · Zero Student"; og:url → `https://zero.page.gd/student-school.html`.
- Manifest → `student-manifest.json`; favicon → `student-icon.svg`; PNG icons → `student-icon-*.png`.
- Kept as-is: `schoolahead-v2` localStorage key (data starts fresh on this origin); relative fetches to
  `canvas-proxy.php` and `schoolahead-auth.php` (the copies below use those exact names).
- **Known phase-2 limit (same as the StudyPlus School copy)**: the companion-extension download links and the
  import bookmarklets inside the School page still target `schoolahead.page.gd` — Zero-targeted extension
  builds do not exist yet, so those sync paths still hand off to the original SchoolAhead. Canvas token sync
  and calendar (.ics) import work through the local `canvas-proxy.php` copy.

## PHP origin locks
- `canvas-proxy.php`: origin regex `studyplus.page.gd` → `zero.page.gd`; User-Agent strings →
  `Zero-Student-School/1.0`; header comment updated. Nothing else changed (diff-verified).
- `schoolahead-auth.php`: same-origin check `https://studyplus.page.gd` → `https://zero.page.gd`. Nothing
  else changed (diff-verified). Its data dir `sa_data/` and session keys (`sa_user`) are its own.
- `sp-auth.php` / `sp-progress.php` / `sp-notes.php`: no hardcoded origin of their own — they
  `require __DIR__ . "/guard.php"`, and Zero's existing `guard.php` is already locked to zero.page.gd
  (allowed origins: zero.page.gd + studyplus.page.gd) with rate limiting, so the byte-identical copies are
  correctly locked on Zero with no edits. They create `sp_data/` server-side on first use (PHP-exit-prefixed
  data files, same design as live StudyPlus). Session keys `spuser`/`spuid` don't collide with Zero's auth
  or School's `sa_user`.

## Staged homepage (index-student.html) — diff vs index.html is ONLY:
1. Apps menu: one new tile after ZeroTube —
   `<a href="student.html" id="zeroStudentTile">…icon-student.webp…Zero Student</a>`
2. Control Center: one new tile after ZeroTube — `cc-student` with the same icon.
3. JS: `ccBind("cc-student", … openZeroApp(null, "student.html", "Zero Student"))` and a `zeroStudentTile`
   click binding calling `openZeroApp(e, "student.html", "Zero Student")` — the exact pattern the
   ZeroTube/Notes/Tasks tiles use (opens inside Zero's internal tab system via `openUrlTab`).
   Diff confirms 5 inserted lines, zero modified lines.
   When deploying: upload as `index-upload.html`, rename over `index.html` (same flow as the current build),
   or copy index-student.html over both local files first. Do NOT upload it before the student files.

## Local test results (headless Chromium/CDP, file:// URLs)
student.html — ALL PASS:
- Renders in the light theme: body background `rgb(250, 249, 246)`; title "Zero Student — Your AI Teacher".
- Brand H1 "Zero Student", sub "PART OF ZERO · AI TEACHER"; Back to Zero link present → index.html.
- Sidebar sections all render: Learn, Videos, Quiz, Test, Progress, Tools, Notebooks, My AIs, School
  (→ student-school.html), plus the injected "Plus Tools (25)" button. All 8 views present; Learn active;
  branded greeting ("Hello! I'm your Zero Student teacher…"); Sign in button renders; sign-out modal exists.
- Plus Tools panel opens and injects exactly **25 cards**; spot-check: Quadratic Solver with a=1, b=−5, c=6
  → "Discriminant: 1 / Roots: 3 and 2" (correct). **Zero page exceptions.**
student-school.html — PASS: title "School · Zero Student", brand "Part of Zero Student · ← Zero Student"
(back link → student.html), full School dashboard renders (Home, Chat, Calendar, Courses, Grades, Study,
SAT/ACT testprep, Khan Academy, Integrations), zero page exceptions.
JS syntax: every inline script block in student.html, student-school.html, and index-student.html passes
`node --check`; index-student.html's pass/fail profile is identical to index.html's (its only non-passing
blocks are the two pre-existing JSON-LD data blocks, unchanged). studyplus-features.js passes `node --check`.

## What local testing cannot prove (honest limits)
- PHP is not installed on this VM, so sp-auth.php / sp-progress.php / sp-notes.php / canvas-proxy.php /
  schoolahead-auth.php were reviewed and diff-checked only, never executed. First deploy needs a live
  round: create a throwaway Zero Student account, sign out/in, save a server note, save/load progress,
  and a Canvas/calendar import through the School page.
- AI answers, Videos (Piped), and Notebooks website sources need the live origin (guard.php rejects
  non-zero.page.gd referers by design, and file:// has no PHP backend).
- Zero Student sign-in accounts are a NEW store on zero.page.gd (sp_data/) — StudyPlus accounts do not
  carry over; School data (localStorage, per-origin) starts empty, same as the StudyPlus School section did.

## Exact upload list for the deploy round (webftp.phpwebhosting.com → /htdocs, one at a time)
1. student.html
2. student-school.html
3. studyplus-features.js
4. sp-auth.php
5. sp-progress.php
6. sp-notes.php
7. canvas-proxy.php
8. schoolahead-auth.php
9. student-manifest.json
10. student-icon-192.png
11. student-icon-512.png
12. student-icon.svg
13. icons/icon-student.webp  (into /htdocs/icons/)
14. LAST: index-student.html uploaded as index-upload.html, then renamed over index.html;
    verify listing sizes (index.html ≈ 222 KB displayed) and live-test the tile + student.html.

---

## Upgrade pass 2026-10-27 (security hardening · premium UI/logo · Council AI · additions)

User asks covered: (1) "very encrypted as everything else", (2) upgrade everything — UI, logo, AI,
(3) "add everything to make it better", (4) premium quality. Local only, nothing uploaded.
`index*.html` untouched by this pass (the parallel livefix pass owns them; they stayed
byte-identical to each other throughout).

### 1. Security audit + hardening — findings

Audited `sp-auth.php`, `sp-progress.php`, `sp-notes.php` line by line against the StudyPlus
originals and the Zero codebase's protection pattern. **All three files are byte-identical to the
live StudyPlus originals, and no weakness below that standard was found — so no PHP code changes
were needed.** What is actually in place:

- **Passwords**: stored ONLY as `password_hash(..., PASSWORD_DEFAULT)` in sp-auth.php; verified
  with `password_verify`. Plaintext passwords are never stored, logged, or returned.
- **Sign-in lockout**: per-account failed counter — 5 bad attempts → 15-minute lock
  (`locked_until`), generic "Wrong username or password" errors (no user enumeration).
- **Sessions**: `session_regenerate_id(true)` on register and login; session cookie set with
  `httponly => true`, `samesite => Lax`, `secure` whenever HTTPS — the same pattern used across
  the codebase. Logout clears the session and expires the cookie.
- **guard.php on every endpoint**: all three files `require guard.php` — Zero's guard enforces
  the origin lock (zero.page.gd) and per-IP rate limiting (120 req/min, HTTP 429) before any
  handler runs.
- **Owner-locked data**: progress and notes require a signed-in session and read/write ONLY the
  file named by the session's own uid (`preg_replace`-sanitized, mismatch rejected). One user
  cannot read another user's notes or progress — there is no parameter that selects a user.
- **Data files are not web-accessible**: every store (`sp_data/users.dat.php`,
  `sp_data/progress/<uid>.dat.php`, `sp_data/notes/<uid>.dat.php`) starts with the PHP-exit 403
  prefix, and directories are created `0700`. Notes writes are serialized with an explicit file
  lock on top of `LOCK_EX`.
- **No sensitive data in URLs**: everything except `?action=me` / `?action=load` is POST with a
  JSON body; passwords never appear in a URL.
- **Caps held**: progress history ≤ 60 / topics ≤ 30 with field sanitizing; notes title ≤ 200,
  body/summary ≤ 200,000 chars (unchanged from the live design).

**Honest encryption framing** (also how it must be described to the user): Zero Student accounts
are protected by **HTTPS in transit + hashed passwords at rest + owner-locked server files** —
the same protection level as StudyPlus and Zero's own sign-in. It is **NOT end-to-end
encryption**: unlike Zero Message (where the server only ever sees ciphertext), the server can
read note/progress contents, because the features require it. Nothing in the UI or this report
claims E2E.

### 2. UI premium polish (light theme kept — white panels, dark text, gold accent)

Additive "premium pass" CSS blocks appended to the existing style blocks (the files' own
established pattern — no existing rules rewritten, no ids/handlers touched):

- **student.html**: two-layer `--shadow` + new `--shadow-lg`; sidebar gets a soft side shadow;
  brand block gets more air and the brand mark gains an inset top highlight + warm inner base
  (premium sheen on the existing gold gradient); primary buttons get an inset top highlight,
  ghost buttons a soft hover shadow; tool cards lift on hover with `--shadow-lg` and a gold-tinted
  border; setup cards, AI message bubbles, chat input bar, and modals all sit on the layered
  shadow; chips gain a gentle hover lift; "Back to Zero" slides slightly on hover.
- **student-school.html**: the School page keeps its own SchoolAhead identity (light surfaces +
  dark sidebar + its own dark mode — deliberately not recolored to gold, that would be a redesign,
  not polish): deeper two-layer `--shadow` for light mode only (dark-mode values untouched),
  brand mark shadow + inset highlight, nav buttons slide on hover, gold-free selection/focus
  colors matched to its indigo accent, and a styled scrollbar to match student.html.
- Verified after the changes: light theme still `rgb(250,249,246)`, all 8 views render, Plus
  Tools still injects exactly 25 cards, School page renders, **zero page exceptions**.

### 3. Logo refinement (same open-book + gold identity)

- `student-icon.svg` (1,745 B) refined: richer 4-stop gold gradient, a soft top sheen, a contact
  shadow under the book, a fine white inner rim, and a second smaller sparkle beside the original
  one. Book geometry, spine, and text lines are unchanged — it reads as the same logo, finished
  better. The sidebar brand mark in student.html gained the matching small sparkle.
- Derivatives regenerated from the new SVG (headless-Chromium raster + PIL alpha reconstruction
  for the transparent rounded corners, then palette-quantized): `student-icon-512.png` 10,347 B
  (was 28,826), `student-icon-192.png` 4,263 B (was 8,220), `icons/icon-student.webp` 5,582 B
  (was 3,816). All keep transparent corners; fidelity check vs the full-color render: mean RGB
  error ≈ 3/255. Manifest unchanged (already points at these filenames).

### 4. AI upgrade — "Deep think" toggle (Zero Council)

- Learn view header gains a **Deep think** pill toggle (next to Focus/Export/History), default
  OFF, persisted in `localStorage` key `studyplus-deepthink-v1` ('1'/'0', one value).
- `askAI()` gained a 4th parameter `route`: `route==='council'` posts the same `{messages}`
  body to `api-council.php` (Zero Council — several models answer in parallel, cross-check/judge,
  synthesize) and returns its `{answer}` through the exact same parsing path. Council requests
  get a 120 s timeout instead of 40 s (multi-pass). With the toggle OFF, every call is
  byte-for-byte the old behavior.
- Call sites routed: **Learn chat** (`sendChat`) and the **Homework Solver's double-check**
  (`verifySolution`) — the solver had one clean single call site, so it was included. The
  solver's existing accept-guards (exact `AGREE`, or a <300-char correction) keep the check
  safe even if a Council synthesis answers verbosely: a non-conforming reply simply shows no
  note, as before.
- While a Deep answer is in flight, the typing row shows *"Thinking deeper — the Council is
  cross-checking this one…"* under the dots.
- **Verified headlessly with a stubbed `fetch`**: toggle flips state + `aria-pressed` + persisted
  value; ON → Learn posts to `api-council.php` and the "thinking deeper" note renders during the
  request; OFF → posts to `api-single.php`; solver verify with ON → `api-council.php`; state
  survives reload. **The live round-trip is still deploy-test work** — PHP cannot execute on this
  VM, so the first deploy round must send one Deep question end-to-end.

### 5. Additions (3, all storage-capped)

1. **Shortcut hints** — a hint line under the Learn chat input (`Enter` to send ·
   `Shift`+`Enter` new line · `Ctrl`+`K` jump) with styled `<kbd>` chips, and the Ctrl+K jump
   modal's footer converted to the same chips. Storage: **zero** (static markup).
2. **Flashcard deck export** — an "Export deck" button in the deck controls downloads the deck
   as a printable `.md` (questions, answers, Mastered/Need-review marks), using the exact Blob
   download pattern of the existing chat export. Storage: **zero** (file goes to the user's
   downloads; nothing new is stored).
3. **Focus mode for Learn** — a "Focus" button in the Learn header hides the sidebar/mobile bar,
   centers the lesson at 800 px, and focuses the input; `Esc` or the button exits. Storage:
   **zero** (session-only class toggle, not persisted).

No new server endpoints, no new external services, no native `confirm()` (count still 0).

### 6. File sizes / md5 after this pass

| File | Bytes | md5 |
|---|---|---|
| student.html | 226,803 | 6f0806cd28567446e28bd1222066afc3 |
| student-school.html | 293,100 | ca7ed39b28f22af8162842351a8bc945 |
| sp-auth.php | 4,577 (unchanged) | ef85bd6fab107f910048d6f2fc1d64b8 |
| sp-progress.php | 3,132 (unchanged) | 9bb145a97f379487750185a913e6b954 |
| sp-notes.php | 6,411 (unchanged) | c1516c2608b2c49267ba75836497321f |
| studyplus-features.js | 51,473 (unchanged) | ce496fab3731a606e7d22dec8d2ad026 |
| student-manifest.json | 493 (unchanged) | — |
| student-icon.svg | 1,745 | 3abd8b740da11cf78e1b00bb2086d287 |
| student-icon-192.png | 4,263 | 43483dbacb0e8db011726fb77e857939 |
| student-icon-512.png | 10,347 | 9ae0394bec338eb25fff7c8e4b7229ba |
| icons/icon-student.webp | 5,582 | afc6b59366c3159d7351dee78d1f6424 |

Deploy note: the upload list in the build section above is unchanged — same filenames, and
`student.html` / `student-school.html` / the three icon files / `student-icon.svg` now carry this
pass's versions. Add to the first live round: one Deep think question in Learn (toggle ON)
verified end-to-end against `api-council.php`.
