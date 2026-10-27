# Zero live-fix pass — 2026-10-27

Fixes for the six failures found in the 2026-10-27 live tests (plugin sweep 18:30–18:37 EDT, Council test 18:30–18:40 EDT). Applied identically to all four homepage files; **nothing uploaded**.

## Files (after fix)

| File | Bytes | MD5 |
|---|---|---|
| index.html | 232,028 | 725f7aeced21d5b2d7dcd869d688fd37 |
| index-upload.html | 232,028 | 725f7aeced21d5b2d7dcd869d688fd37 (byte-identical to index.html ✓) |
| index-student.html | 232,600 | 6563054c73699644f1a9af8434597590 |
| index-photos.html | 233,171 | b2d5451ae9bda9da8e57635efbe9d9f8 |

Sync invariants re-verified after patching: index-student.html = index.html + the exact pre-existing Zero Student tile lines only; index-photos.html = index-student.html + the exact pre-existing Zero Photos tile lines only (diff content identical to the pre-fix diffs; only line numbers shifted). Base was 226,431 B / md5 b946a2344d119aebcc58436bd841ff3b; the pass adds 5,597 B.

---

## 1. Plugin instant-answer cards never rendered on live search — FIXED

**Root cause (exact code path).** Plugins answer through the `zero-search-query` document event: each enabled plugin's `onEnable` registers a handler that unshifts `{type:"plugin", …}` into `e.detail.results`. In `runZeroSearch()` (index.html) the event is dispatched synchronously with `detail.results` = the shared results array `all` (≈line 2005), and `renderSearchResults()` renders card(s) from `all`. The bug is in the old plugin-card block of `renderSearchResults()`: it **destructively removed** the plugin hits from `all` (`all = all.filter(...)`) while rendering them.

`renderSearchResults()` runs **several times per search**: once from the search fetch's `.then()` when web results land, and again from `.finally()` → `finalizeSearch()` (plus an 8 s safety finalize). Each pass starts with `resBox.innerHTML = ""`. Pass 1 rendered the cards and removed them from `all`; pass 2 wiped the box and found no plugin hits left — so the final DOM never contained a card. Local tests passed because on `file://` the search fetch *rejects instantly*, so `.then()` never ran and only one render pass ever happened. Reproduced locally before fixing by stubbing the search fetch to succeed: 0 cards on every entry point.

A second wipe path: when a search produced *only* a plugin answer (no web results), the empty-state branch overwrote `resBox.innerHTML` at finalize, erasing the card.

Side effect of the old code: on the single-pass path, plugin items also leaked into the normal results pool and rendered a second time as dead link items.

**Fix (all inside `runZeroSearch`/`renderSearchResults`, the one shared path used by typed search via `go()` → `#q=` hash → `route()`, direct hash changes, related-search chips, and history/recent re-runs, which all call `go()`):**
- Line 2010: plugin hits are captured **once** into a closure list `pluginHits` immediately after the dispatch.
- Line 2048: the normal-results pool builder now skips `type === "plugin"` items (cards never double-render as links).
- Line 2067: the card block renders from the preserved `pluginHits` list on **every** pass; the destructive filter is gone.
- Line 2158: the empty state is only injected when `finalized && !pluginHits.length`, so a plugin-only answer is never wiped.

## 2. Stale-date "days until christmas" card — NOT our code, no change made

**Verdict: the card was the AI/search answer, not the Days Until plugin and not any built-in card.** Evidence:
- Pack 2's Days Until plugin (zero-plugins-pack2.js, id `daysuntil`) only matches `days until YYYY-MM-DD`, computes from the viewer's real date (`todayUTC()` = `new Date()`), and outputs title `"N days"` / snippet `"Until <date> (from today)"` — it cannot produce the text "Today is Thursday, May 22, 2024" or a named-holiday answer at all ("christmas" doesn't match its pattern).
- The string "Today is" appears **nowhere** in index.html, zero-plugins.js, zero-plugins-builtin.js, or zero-plugins-pack2.js (grep count 0 in all four).
- The plugin itself is provably correct: in the local harness, `days until 2026-12-25` returned **59 days** on 2026-10-27 — the correct count to Dec 25, 2026.

The stale 2024 text matches an AI answer built from a stale web snippet. No code changed for this item.

## 3. Pill home (⌂) icon did nothing from a results view — FIXED

**Root cause.** The pill's home icon is the home tab element built by `makeTabEl()`; its click handler called `switchTab(homeId)`. The wrapped `go()` stores every search on the *active* tab (`t.q = q`), so the home tab's saved query is the current search; `switchTab()` therefore just re-set `location.hash` to the same `#q=…` — no hash change, no navigation, icon looks dead.

**Fix** (index.html line 2796, in `makeTabEl`'s onclick): if the element is the home tab (`isHome`), run `goHome()` — the exact action of the working "Zero home" button (line ~3430: `location.hash=""; route(); $("q1").focus();`) — and return. Non-home tab behavior (tap active tab to close) is unchanged.

## 4. No "»" button in the pill — FIXED

**Fix** (index.html line ~3134): a new `tp-mini-btn` button `#pillMoreBtn` with text `»` is created in the pill builder and inserted immediately after the home icon and before the `+` button (`panel.insertBefore(moreBtn, addBtn)`), giving the standing order home (blue) → » → + → history (others white). Its click toggles the same tabs-list popup as the existing "All tabs" squares button (which keeps its own icon and behavior). Verified pill child order in the harness: tab group (home) | pillMoreBtn | tabAddFloat (+) | tabGridBtn (All tabs) | divider | Control Center | history | AI | Image Studio | Apps | Plugins.

## 5. Control Center didn't close on Escape — FIXED

**Fix** (index.html line 3794, inside the Control Center IIFE): added a `keydown` listener — `if(e.key === "Escape" && overlay.classList.contains("open")) overlay.classList.remove("open")`. It only acts when the Control Center is open and doesn't touch the other Escape behaviors (mac menus, plugin panel, mail view, results keyboard nav). Regression-checked: the plugin panel still closes on Escape in the harness.

## 6. AI answers rendered raw markdown/LaTeX literally — FIXED

**Root cause.** Homepage answers (Fast and Deep) are rendered by the hand-rolled `renderAnswer(md, sources)` in index.html (line 1230). It handled `**bold**`, headings `#{1,3}` only, lists, tables, code — but:
- **single-asterisk italics were never implemented**, so `*not*`, `*Viking 1*` showed literally;
- **headings stopped at `###`**, so `#### A useful tip` showed literally;
- **no math handling existed at all**, and neither KaTeX nor marked is loaded on this path — `\[ … \]`, `\( … \)`, `\times`, `^2` all passed through as raw text.

**Fix (all in/around `renderAnswer`, plus head/CSS):**
- **Fragment stash** (line 1236): code blocks and math segments are replaced by placeholder tokens before the emphasis/citation/block passes and swapped back at the end (line 1352), so formulas and code can no longer be mangled by markdown passes.
- **Math extraction** (line 1278): `\[…\]` and `$$…$$` (display), `\(…\)` and guarded `$…$` (inline; the guards keep prices like "$5 and $10" untouched). Each segment renders through `mathHtml()` (line 1259): **KaTeX `renderToString`** when KaTeX is present, otherwise a readable Unicode fallback (`prettyTex`: `\frac{a}{b}` → (a)/(b), `\times` → ×, `\sqrt` → √, `^{…}`/`_{…}` → real superscripts/subscripts, `\text{…}` unwrapped, common symbols mapped) in a styled `.math-txt` span — raw LaTeX is never shown either way.
- **KaTeX added to the page head** (lines 941–942): pinned `katex@0.16.11` CSS + deferred JS from jsDelivr, same as the renderer expects (`window.katex`). If the CDN is ever blocked, the fallback above carries the rendering.
- **Italics** (line 1288): `*text*` → `<em>` after the bold pass; the pattern requires a non-space after the opening `*`, so `* bullet` list lines and `2 * 3` are not italicized.
- **Headings** (line 1304): pattern extended to `#{1,6}`, levels capped at `<h4>`; `.ai-answer h4` added to the heading CSS rule plus a font-size (lines 701–702). New CSS for `.katex-display` and `.math-txt` alongside.
- **Untouched by design:** the code-block generator (same HTML, buttons, highlighting — now stash-protected), inline code spans, the file-card website-build previews (separate code path, not `renderAnswer`), tables, citations, lists.

---

## Verification (all local, headless Chromium/CDP on `file://`, UI-driven)

- **Syntax:** all 9 inline script blocks of the patched index.html pass `node --check` (2 JSON-LD blocks skipped). Only the renderer chunk differs per file region — the same edits were byte-asserted (each anchor found exactly once) in all four files.
- **Bug reproduction first:** with the search fetch stubbed to succeed (the live timing), the *unfixed* page rendered 0 plugin cards on every search; the fixed page renders them.
- **Plugin cards (fixed page, stubbed live-like fetch):** `15% of 240` → card "36" ✓; `roman 1994` → "MCMXCIV" ✓; `binary 42` with **zero** web results → "101010" survives finalize (empty-state path) ✓; `days until 2026-12-25` → "59 days", computed from the real current date (2026-10-27) ✓. 0 page exceptions.
- **Entry points:** typed search, hash change, and re-runs all funnel through `go()` → `#q=` → `route()` → `runZeroSearch()`; the hash path was exercised directly. History/recent item clicks call `go(item.q)` in code (verified by inspection); a literal history-item click could not be exercised headlessly because history entries are only created after a completed AI answer, which needs the live backend — the shared path it lands on is the one tested.
- **Pill home:** from a results view, clicking the pill ⌂ clears the hash and leaves the results view ✓.
- **» button:** exists, opens the tabs popup, second click closes it ✓.
- **Control Center:** opens from the pill button; a real CDP Escape keypress closes it ✓. Plugin panel Escape still works ✓.
- **renderAnswer sample** (`**bold**`, `*italic*`, `####` heading, `\[ 0.70 \times 120 = 84 \]`, `\( x^2 + 1 \)`, a code block, an inline snippet, bullets, prices): Node unit test 13/13 PASS — `<strong>`, `<em>`, `<h4>` produced; no literal `####`, `\[`, or `\times` in output; fallback math reads "0.70 × 120 = 84" and "x² + 1"; code block + copy button + inline `<code>` unchanged; "$5 and $10" untouched; no stray placeholder tokens. In-browser run of the same sample also PASS. The KaTeX branch was verified with a stubbed `window.katex` (branch selection + displayMode flags correct); the real CDN script did not load inside the sandbox browser (no CDN reachability from `file://` there), so on the live https site KaTeX itself will render math, with the verified fallback covering any CDN failure.

## Not done / notes

- Nothing was uploaded; the four files are ready for the parent agent's deploy round (index-upload.html is the upload copy of index.html, as usual).
- No other files were modified.
