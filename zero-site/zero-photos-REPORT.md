# Zero Photos — build report (2026-10-27)

Built locally only. Nothing uploaded. `index.html`, `index-upload.html`, and
`index-student.html` were NOT modified (md5s unchanged: index/index-upload
`b946a2344d119aebcc58436bd841ff3b`, index-student `d4b5a81b2cdea260d33723c3f4554870`).

## The design rule (the whole point)

Zero Photos stores **nothing** on any server and uploads **nothing**. It is a
gallery front-end for media that stays on the user's own device. Verified by
grep: **0** occurrences of `fetch(`, `XMLHttpRequest`, `sendBeacon`,
`WebSocket`, or any external URL (the only `http://` string in the file is the
SVG `xmlns` namespace identifier, which loads nothing). The page is fully
self-contained — inline CSS/JS, no CDNs — and the headless test recorded an
**empty network resource list** after load and interaction.

The only things that persist, both tiny metadata:

- **IndexedDB** (`zero-photos` DB, store `meta`): the `FileSystemDirectoryHandle`
  for the last folder the user opened, so "Reopen my folder" can restore the
  library after the browser re-asks permission. No file data, no thumbnails.
- **localStorage**: exactly one key, `zero-photos-sort`, holding a short string
  like `date-asc`. The headless test confirmed `Object.keys(localStorage)`
  is exactly `["zero-photos-sort"]` after adding media — no media data, no
  base64, ever.

All media lives in memory only, via object URLs that are revoked when an item
is removed from view and on `pagehide`.

## Files created

| File | Size | What it is |
|---|---|---|
| `zerophotos.html` | 32,850 B | The Zero Photos app (single self-contained page). |
| `index-photos.html` | 227,574 B | STAGED homepage: copy of `index-student.html` (227,003 B) + the Zero Photos tile (571 B of additions, 5 lines in 4 spots). |
| `zero-photos-REPORT.md` | this file | Build/test report. |

The tile icon uses the already-existing `icons/icon-photos.webp` — no new icon
file is needed.

## How each feature works

- **Open photos & videos** — `<input type=file multiple accept="image/*,video/*">`.
  Files are classified by MIME type, de-duplicated by name+size+last-modified,
  and added to the in-memory library. Nothing is copied or uploaded.
- **Open a folder** — `showDirectoryPicker()` where available (Chromium);
  the handle is walked recursively (depth cap 6, 5,000-file cap) and the handle
  is saved to IndexedDB. Fallback: a `webkitdirectory` input. After a later
  visit, the **Reopen "‹folder›"** button appears; clicking re-checks/requests
  read permission (`queryPermission`/`requestPermission`) and re-reads the
  folder from the device — the files were never stored anywhere.
- **Gallery** — responsive grid, thumbnails are the files themselves via object
  URLs (images) or muted metadata-preload `<video>` elements (videos), each
  with a PHOTO / VIDEO / SCREENSHOT badge, filename, size and date. Sort by
  name A–Z / Z–A or date newest / oldest (preference persisted); live search
  filters by filename. Drag & drop onto the page also adds files.
- **Viewer (lightbox)** — full-size image, or a native `<video controls>` player
  for videos. Prev/next buttons and arrow keys; filename + kind/size/date
  caption; **Download** saves the original file (same object URL, `download`
  attribute — zero server involvement); **Remove from view** opens an in-page
  modal (never a native `confirm()`) that states plainly the real file is NOT
  deleted — it only leaves this gallery view.
- **Take screenshot** — `navigator.mediaDevices.getDisplayMedia()` → one frame
  drawn to canvas → PNG blob added to the gallery with a SCREENSHOT badge and
  offered in the lightbox for download. The stream is stopped immediately
  after the single frame. The UI says up front, in plain text, that the
  browser will ask which screen/window/tab to capture — a web page cannot
  silently screenshot other tabs.
- **Honesty line** — under the toolbar: "Your photos and videos never leave
  your device. Zero stores nothing — your library is your own files, shown
  here. No uploads, no copies on any server."

Styling matches Zero's Atelier look: ivory `#f6f4ef`, card `#fbfaf7`, ink
`#1d1c19`, `#e5e2d9` lines, blue accent, white-circle/blue-"0" brand mark,
sticky blurred header with a back link (`‹ Zero`) to `index.html`.

## Homepage integration (STAGED ONLY — `index-photos.html`)

Base: `index-student.html` (the staged homepage that already carries the Zero
Student tile). Diff vs base is exactly the tile addition, mirroring the Zero
Student pattern line for line:

1. Apps menu, after the Zero Student tile:
   `<a href="zerophotos.html" id="zeroPhotosTile">…icon-photos.webp…Zero Photos</a>`
2. Control Center grid, after `cc-student`:
   `<div class="cc-tile" id="cc-photos">…icon-photos.webp…Zero Photos</div>`
3. `ccBind("cc-photos", function(){ openZeroApp(null, "zerophotos.html", "Zero Photos"); });`
4. Apps-menu binding: `zpTile` click → `openZeroApp(e, "zerophotos.html", "Zero Photos")`
   — the same internal-tab path (`openUrlTab`) the ZeroTube/Notes tiles use.

## Local test results (headless Chromium/CDP, `file://`)

zerophotos.html — all PASS, **0 page exceptions, 0 console errors**:

- Renders with title "Zero Photos"; empty state visible; all buttons present
  (Open photos & videos, Open a folder, Take screenshot, both empty-state
  buttons, sort select, search); Reopen button correctly hidden before any
  folder was opened; honesty info line + screenshot note present.
- Simulated adds: a PNG `File` → card with **PHOTO** badge; an MP4 `File` →
  card with **VIDEO** badge; count line "Showing 2 of 2 — 1 photo, 1 video."
- Simulated screenshot blob → third card with **SCREENSHOT** badge.
- Search "clip" → exactly 1 card; clearing restores all.
- Sort change → `zero-photos-sort` = `date-asc` persisted, oldest file first;
  localStorage keys exactly `["zero-photos-sort"]`.
- Lightbox: click opens it with the image and correct filename; Next moves to
  the video item; **Remove from view** opens the in-page modal with the honest
  "your actual file stays exactly where it is" text; confirming removes the
  item (3 → 2) and closes the lightbox.
- Network: 0 fetch/XHR resource entries; full resource list empty.
- Script block passes `node --check`; static greps: `fetch(` 0,
  `XMLHttpRequest` 0, `sendBeacon` 0, `WebSocket` 0, `confirm(` 0, `alert(` 0.

index-photos.html — all PASS, **0 page exceptions, 0 console errors**:
Zero Photos tile present (`href="zerophotos.html"`, label "Zero Photos"),
Control Center `cc-photos` tile present, Zero Student and ZeroTube tiles
intact; all 9 real script blocks pass `node --check`.

What local testing cannot prove (needs the live deploy round): the folder
picker / `getDisplayMedia` permission flows in the user's real browser
(headless has no screen to share and no user gesture), and behavior inside
Zero's internal tab iframe on the live site.

## Honest limits (already stated to the user, repeated in the UI)

- **"Unlimited + forever + zero storage" does not literally exist** — every
  photo/video is data that must live somewhere. Zero Photos meets the intent
  the only honest way: the library is unlimited because it is the user's own
  files on their own device; it lasts as long as their files do; and it takes
  zero storage on Zero's servers because nothing is ever sent or kept there.
- Files live on the device only — there is **no server backup**. If the user
  deletes a file in their file manager, it's gone from Zero Photos too.
- Screenshots require the browser's share picker each time (platform rule).
- Folder reopening needs Chrome/Edge-style File System Access support;
  other browsers use the folder picker each visit (nothing is remembered
  without a handle).
- Videos play only in formats the browser itself can play.

## Upload list for the deploy round (via webftp.phpwebhosting.com → /htdocs)

1. `zerophotos.html` (32,850 B) → `/htdocs/zerophotos.html`
2. `index-photos.html` (227,574 B) → upload as `index-upload.html`, rename over
   `index.html` LAST, after the Zero Student round's `index-student.html` has
   landed (this file is based on it; deploying it earlier would drop the
   Zero Student tile).

After upload: live-verify the tiles open Zero Photos inside a Zero tab
(Ctrl+Shift+R hard refresh), the empty state renders, a real folder opens,
a video plays, and a screenshot capture + PNG download works.
