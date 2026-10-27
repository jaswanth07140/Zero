# Zero Fast + Balanced upgrade — 2026-10-27

Scope: backend only — `api-single.php` (Fast legs + all single-model calls) and
`api-synth.php` (Balanced merge). No index files, student files, or plugin files
touched; nothing uploaded. Contracts unchanged: same request/response JSON
shapes, same guard.php behavior, same provider/`auto` semantics, explicit
provider/model choices still honored, no new providers, keys, or endpoints.

Files after this pass:
- api-single.php — 23,287 B, md5 7b43e02d06573945359c3cfc9e23fade (was 21,549 B / 8e8ef5cfc1f82da107f658f8fc5ec1f4)
- api-synth.php — 21,425 B, md5 826b401df9a6d513b45345414ecc0ba8 (was 18,530 B / 0294ef49de88ee0e43eb50e91b051fb6)
- Before/after diffs: /tmp/api-single.diff (105 lines), /tmp/api-synth.diff (83 lines)

## What was weak

### Fast (api-single.php)
1. **Timeouts blew the budget.** Primary call: 8s connect / 30s total. Retry:
   5s / 25s. Keyless fallback: 5s / 20s. Worst case ≈ 30 + 0.25 + 25 + 20 ≈
   **75 seconds** server-side for one request — while the homepage's client
   timeout per leg is 15s, so a single hung provider silently ate the whole
   answer window and returned nothing usable.
2. **The Groq fallback default was the weaker model**: when config has no
   Groq model list, the default was `openai/gpt-oss-20b`, not the lineup's
   strongest `openai/gpt-oss-120b`.
3. **No output-format discipline at the source**: the shared quality policy
   never told models to avoid raw LaTeX, so Fast answers could contain
   `\[...\]` / backslash-command math that the site's basic renderer shows
   literally (seen in the 2026-10-27 live test).
4. The retry ran unconditionally on transient failure — even when the primary
   had already burned 30s hanging, guaranteeing a stall instead of a fall-through.

Strongest-first itself **verified OK**: `auto` walks the provider order
health-gated (down providers skipped, fail-open), picks the first up+keyed
provider (Groq), and uses its configured `models[0]`; health-check.php keeps
`openai/gpt-oss-120b` first in its reconciliation preferences, and the verified
live lineup has it as Groq's first model. Explicit model requests are honored
as before.

### Balanced (api-synth.php)
1. **Prompt pushed heavy structure**: "beautiful, well-structured documents",
   title lines, `##` sections for everything — over-formatted simple answers.
2. **No math-format rule at all** — candidates' LaTeX passed straight through
   the merge and rendered raw on the page.
3. **Merge rule 2 was soft**: "Do NOT decide truth by majority vote *alone*"
   left room for vote/blend behavior; no base-candidate rule, no rule for
   folding in unique correct details or dropping lone unsupported claims.
4. **No self-check**: nothing asked the synthesizer to recompute numbers or
   recount countables before merging, so a wrong figure in the majority of
   candidates could survive.
5. **No health gating in the cascade** (unlike api-single/api-council): a
   provider whose key is dead (401) was still attempted in order, one slow
   failure at a time.
6. **Unbounded tail**: 25s per attempt × up to 13 providers, plus a 10s
   Tavily call before synthesis even started.

## What changed

### api-single.php
- **Groq default model** (`$modelInput` resolution): fallback default
  `openai/gpt-oss-20b` → `openai/gpt-oss-120b`. (Only fires when config has
  no Groq model list; configured order and explicit choices untouched.)
- **Request budget scaffolding** (before the provider switch): `$fastT0` /
  `$fastBudget = 5.0`, plus new helper `zeroFastRemaining($t0, $budget)`
  next to `zeroDownProviders()`.
- **Primary call timeouts**: connect 8s → **2s**, total 30s → **4s** (both the
  OpenAI-compatible path and the Anthropic branch, which was also 8/30).
- **Retry gated on remaining budget**: after the existing 250ms pause, the
  retry only runs if ≥1.0s of the budget remains, and its timeout is the
  remaining budget (`CURLOPT_TIMEOUT = floor(remaining)`, connect ≤2s). A
  primary that hung for the full 4s is *not* retried — the request fails
  fast at ~4.3s and the caller's ensemble moves on.
- **Pollinations fallback gated the same way**: still auto-only, still
  transient-only, but now only starts with ≥1.5s of budget left and gets
  exactly the remaining time (was a flat 20s). New `$fallbackLeft` /
  `$fallbackTimeout` locals; success/selection logic unchanged.
- **Policy addition** (`$zeroQualityPolicy`, appended after ADAPTIVE
  SOLVING): "FORMATTING AND SELF-CHECK" — clean simple markdown (short
  paragraphs, simple lists, bold only for key terms/final results), **no
  LaTeX of any kind** (equations in plain text, e.g. `0.70 x P = 84`), and a
  silent pre-answer recompute/recount of arithmetic, countables, units,
  signs, dates, and day counts. Zero extra requests; rides in the existing
  system prompt of every api-single call (Fast legs, Balanced legs, vision).

### api-synth.php
- **New `zeroSynthDownProviders()`** — byte-for-byte the same health-file
  logic as api-single's `zeroDownProviders()` (fail-open), and the cascade
  now `continue`s past down providers, matching api-single/api-council
  gating. Council already had this; synth was the odd one out.
- **Cascade deadline**: `$synthT0` + `$synthDeadline = 12.0` — no new
  attempt starts after ~12s; per-attempt timeout is
  `max(3, min(10, ceil(remaining)))` with connect 3s (was a flat 8s/25s).
  First provider in the strength order is unchanged (Groq with the
  `openai/gpt-oss-120b` synthesis override / `synthesis_model` config wins
  as before).
- **Tavily grounding tightened**: connect 3s / total 10s → **6s**. Trigger
  conditions, query, result shaping, and `sources` output unchanged.
- **New FINAL SELF-CHECK paragraph** in the synthesis prompt (silent,
  inside the same single synth call — zero extra requests): recompute
  every number that will appear (arithmetic, percentages, totals),
  recount countables (letters, items, steps), re-verify dates/ages/day
  counts against the current date, check units/signs; a failed recompute
  overrides the candidate's value; disagreements on numbers are decided
  by the recompute, not by votes.
- **Merge rules 1–2 rewritten**: build on the single most complete
  CORRECT candidate as the base; fold in correct details unique to other
  candidates; drop claims that appear in only one candidate when they
  look unsupported/unverifiable/off-topic. Truth is NEVER decided by
  majority vote and conflicting facts are never averaged — disagreements
  are resolved by verifiable correctness (recompute / search evidence /
  soundest reasoning), with unresolved ones flagged briefly.
- **Presentation rewritten**: clean simple markdown for a basic renderer;
  short paragraphs; `##` headers only when an answer genuinely has
  several parts (no forced title/headers on simple questions); **bold**
  sparingly for key terms and final results. New MATH FORMATTING rule:
  no LaTeX of any kind (no dollar-sign math, no bracketed display
  equations, no backslash commands) — plain-text equations, with a narrow
  exception for advanced math where plain text would be unreadable, and
  even then minimal plain-text notation.
- Untouched, as required: the best-candidate fallback scorer, the
  single-candidate early return, response JSON
  (`answer`/`sources`/`ensemble_count`/`synthesis_used`), temperature
  0.2, max_tokens 2600, and all subject-quality prompt sections.

## Timeout budget math

### Fast ≈ 5s (per api-single.php request)
| Path | Math | Total |
|---|---|---|
| Primary succeeds (typical Groq) | actual latency | ~0.8–3s |
| Primary fails instantly (429/5xx ≈0.2s) | 0.2 + 0.25 pause + retry ≤ remaining ≈4.5s | ≤ ~5.0s |
| Primary hangs | cut at 4.0s; remaining ≈0.75s < 1.0 → no retry; < 1.5 → no fallback | ~4.3s (clean error) |
| Primary fails at ~2s | retry gets ≈2.7s; fallback then has <1.5s → skipped | ≈ ~5.0s |

Hard worst case ≈ **5.0s** + JSON overhead (was ≈75s). Note the homepage's
Fast level is a 3-leg parallel mini-ensemble of these calls plus one synth
call, so every leg now lands inside the same ~5s envelope instead of one
hung leg eating the client's whole 15s window.

### Balanced ≈ 5–7s (api-synth.php, after parallel candidate collection)
- Candidate legs (browser-parallel api-single calls): each now resolves
  in ≤ ~5s worst case, typically 1–3s.
- Tavily (only for live-evidence questions): ≤ **6s** (was 10s).
- Synthesis: first up+configured provider (Groq gpt-oss-120b) typically
  answers the ~15KB prompt in ~2–6s; attempts are capped at ≤10s with a
  12s no-new-attempts deadline (was 25s × 13, unbounded).
- **Typical total: ~3–7s** (legs 1–3s + synth 2–4s, no Tavily). Degraded
  worst case (Tavily fires AND first synth providers fail): ~5 + 6 + ~12
  ≈ 23s — bounded, and if synthesis fails outright the best-candidate
  fallback still returns an answer immediately. The 5–7s figure is the
  typical healthy-provider path; no backend change can guarantee it when
  every free provider is degraded — what changed is the tail is now
  bounded instead of open-ended.

**Accepted trade-off**: very slow candidates (openrouter/free,
Pollinations on a slow day) will now be cut at ~4s server-side more
often and contribute fewer ensemble answers. That is the deliberate
price of meeting the time budget; the strong/fast providers (Groq,
Cerebras) are unaffected in practice.

## Verification (no PHP on this VM — nothing was executed)
- Full diffs reviewed line by line (saved at /tmp/api-single.diff and
  /tmp/api-synth.diff): only the intended hunks changed.
- Python string/comment-stripping balance check on both files:
  api-single `{}` 59/59, `()` 290/290, `[]` 147/147; api-synth `{}` 32/32,
  `()` 220/220, `[]` 154/154; no unterminated strings (stripper end-state
  clean). Deltas vs originals match the added constructs exactly
  (api-single +2 braces = new helper + retry gate; api-synth +5 = the new
  health-gating function).
- Doubled-backslash scan of all added diff lines: **0 hits** — every `\n`
  in the new prompt strings is a single backslash, matching file style.
- File heads/tails confirmed intact (`<?php` open, no stray closing tag,
  response blocks unchanged).

## What only a live test can prove
1. Real provider latencies under the new caps — specifically whether
   openrouter/free and Pollinations legs still contribute ensemble
   candidates often enough, or drop out (by design) most of the time.
2. Whether the 4s primary cap ever truncates a legitimately long answer
   from *other* api-single callers that pass max_tokens up to 4000
   (zerocode/panel-style calls) — worth watching after deploy.
3. Whether models actually obey the no-LaTeX / plain-text-equation and
   simple-markdown instructions at both levels (prompt-level behavior is
   model-dependent; the jacket-math and strawberry traps are the natural
   re-test: strawberry = recount check, jacket = plain-text equations +
   correct $120 / $90.72).
4. Whether the synth self-check measurably fixes numbers where candidates
   disagree (run a question whose candidates are known to split).
5. End-to-end Balanced wall time on the live host (InfinityFree PHP
   limits, real Tavily latency) vs the ~5–7s typical estimate above.
6. Basic PHP runtime sanity of the new code paths (budget helper, gated
   retry/fallback, synth deadline) — reviewed and structurally checked
   here, but never executed.
