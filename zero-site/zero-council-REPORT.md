# Zero Council — build report (2026-10-27)

Zero's own AI orchestration layer: instead of trusting one model or a plain
merge, the Deep level now runs a council — several models answer, a judge
grades them, a synthesis pass merges the best parts, and a verification pass
re-checks factual answers. Built locally only; NOT uploaded yet.

## Files created / changed

| File | Change | Size |
|---|---|---|
| `api-council.php` | NEW — the council endpoint | 23,908 B |
| `index.html` | Deep level routes to `api-council.php` (one ternary + 2-line comment at the synthesis fetch, ~line 1563) | 226,431 B (md5 b946a2344d119aebcc58436bd841ff3b) |
| `index-upload.html` | Same edit, kept byte-identical to `index.html` per the deploy convention | 226,431 B (same md5) |

`config.php` untouched. No keys read, printed, or copied — the council reads
provider entries from the config at runtime exactly like api-single.php /
api-synth.php do.

## How each council step works

All in `api-council.php`, behind the same `guard.php` (origin lock + rate
limit) and the same request/response contract as `api-synth.php`:
POST `{messages, responses?}` → `{answer, sources, ensemble_count}` plus
`"council": true` and a `council_steps` summary object.

1. **Fan-out (candidates).** If the browser already collected ≥2 candidates
   (the frontend fans out in parallel via api-single.php, as today), those are
   used. Otherwise the council fans out server-side with `curl_multi` to up to
   4 health-gated "up" providers (priority: groq, openrouter, cerebras,
   mistral, gemini, deepseek, openai, together, pollinations), skipping any
   provider marked "down" in `zero-provider-health.json` — the same fail-open
   gating as api-single.php / zero-lineup.php. Each provider uses its
   configured first model; Pollinations works keyless; unconfigured/down
   providers are skipped. Results are deduped and capped at 6.
2. **Judge pass.** One strong-model call (cascade: groq `openai/gpt-oss-120b`
   → openrouter → cerebras → … → pollinations; a provider's
   `synthesis_model` config override wins when set). The judge scores every
   candidate /10 for correctness and completeness, lists every factual
   disagreement and which side is most likely right, flags likely-fabricated
   claims, and notes unique correct details worth keeping. Output is capped at
   3,000 chars and fed to synthesis as evidence, not gospel.
3. **Synthesis pass.** One strong-model call with the user request, recent
   conversation context, the judge assessment, all candidates, and (when
   applicable) live web results. Rules mirror api-synth.php's quality bar,
   plus an explicit council rule: resolve disagreements by stating the correct
   position — never average two conflicting facts, never decide by majority
   vote alone. The council/judge/models are never mentioned in the answer.
4. **Verification pass (factual questions only).** Runs when the question is
   factual (the same "needs live evidence" pattern as api-synth.php, or a
   who/what/when/where/how-many style question). It reuses the existing
   Tavily web grounding from api-synth.php when `web_search` is enabled in
   config (results also populate the response `sources`). The verifier gets
   the draft + candidate evidence (+ web results) and must return the draft
   exactly unchanged if every claim holds, or the full corrected answer if
   not. Its output is accepted only if it's at least 20 chars and ≥40% of the
   draft's length, so a stub or meta-comment can never replace a real answer.
   Skipped for non-factual questions, for drafts over 6,000 chars (so a long
   answer can't be truncated by the checker), and when the time budget is
   nearly spent.

## Timeouts and time budget

- Fan-out: one shared 14 s window for all parallel calls (5 s connect).
- Judge: 15 s. Synthesis: 25 s. Verification: 15 s.
- Elapsed-time gates: web search only before 20 s, judge before 25 s,
  synthesis before 50 s, verification before 55 s. A pass that misses its
  gate is skipped, never failed. `@set_time_limit(120)` is set defensively
  (InfinityFree may ignore it).
- Typical Deep request (browser supplied candidates): judge + synthesis
  ≈ 5–20 s total; worst case stays bounded by the gates above.

## Fallback behavior (never a hard error while any answer is possible)

- Fan-out yields 0 candidates → one plain single-model cascade call
  ("single-model-rescue", same idea as api-single.php auto-routing).
- Exactly 1 candidate → returned as-is, like api-synth.php.
- Judge fails/times out → synthesis proceeds without judge notes.
- Synthesis fails/times out → api-synth.php's own best-candidate scorer picks
  the strongest candidate (`council_steps.fallback: "best-candidate"`).
- Verification fails or looks like a stub → the synthesized draft ships.
- Only when no provider returns anything at all does the endpoint answer
  502 `{"error":"Could not get a model answer."}` — the same shape the
  frontend already handles (error box + one auto-retry).

## Frontend wiring

In `answer()`'s `_send()`, the final fetch is now
`_level === "deep" ? "api-council.php" : "api-synth.php"`. Fast and Balanced
are byte-for-byte unchanged in behavior. The fresh web grounding v2 code
(`isNewsyQuery` / `fetchNewsCtx`, grep count 4) is untouched. The change is a
single ternary — reverting it restores the old behavior exactly.

## Verification done locally

- PHP is not installed on this VM, so no `php -l`. Instead: a Python pass
  stripped strings/comments and confirmed balanced `{}`, `()`, `[]` across
  the whole file; confirmed no `\\'` escape-trap sequences (the known
  muse.edit doubling hazard), no closing `?>` (matches house style), and no
  credential-shaped tokens anywhere in the file.
- The endpoint map, health-gating reader, provider-entry parser, Tavily
  block, and best-candidate scorer were diffed by eye against api-single.php
  / api-synth.php and reuse their exact logic and constants.
- JS: the inline `<script>` block containing the change passes
  `node --check`; all other real JS blocks pass too (the two "failing"
  blocks are JSON-LD structured data, not JS). `index.html` and
  `index-upload.html` md5-identical after the edit.
- Request/response shapes match what the frontend already parses
  (`answer`, `sources`); `council` / `council_steps` are additive and ignored
  by current rendering code.

## Could not verify locally / open risks

- **Not live-tested.** PHP syntax is reviewed, not executed. First deploy
  should be followed immediately by a Deep-level live test (one factual
  question with a known answer, one math question, one creative question)
  before announcing it.
- **Server-side fan-out on InfinityFree** (curl_multi to 4 providers at
  once) is coded defensively (shared window, sequential fallback when
  curl_multi is missing) but unproven on this host; in practice the browser
  supplies ≥2 candidates for Deep, so the server fan-out path is a backup.
- **Latency:** Deep now costs 2–3 sequential model calls after the fan-out.
  With browser candidates this is judge (~2–6 s) + synthesis (~3–10 s) +
  optional verify (~2–6 s). Acceptable for Deep, but if the host's PHP
  execution cap is lower than expected, the elapsed-gates degrade the
  council to best-candidate rather than timing out.
- **Rate limits:** Deep requests now make more upstream calls per question;
  heavy Deep usage could hit Groq free-tier limits sooner. The health gate +
  cascade spread this across providers.
- Claim discipline: the council should measurably beat a single model on
  accuracy (cross-checking + judge + verification), but "smarter than
  Claude/ChatGPT" is not claimed until live side-by-side comparisons prove
  it — the models underneath are still the same free providers; the council
  is Zero's own brain on top of them.
