# Sidekick 2-Hour Sprint Log
Started: 2026-10-20 ~18:54 EDT | Base version: 3.3.9

## Bugs Found → Fixed → Verified

### 1. Rapid double-send race condition (Coordinator)
**Bug:** Clicking Send twice rapidly bypassed the `busy` guard. `busy=true` was set in doSendNow AFTER the async `currentTab()` callback, so a second click before the callback ran would start a second send → duplicate _tmp shares, duplicate messages in history.
**Fix:** Set `busy=true` and disable send button immediately at the top of doSend(), before any async work. Removed the redundant later `busy=true`.
**Verified:** node --check OK. Logic: busy is now set synchronously on first click, second click returns early.

### 2. Empty-message dead send button (Coordinator)
**Bug:** Introduced by fix #1 — the early return for empty text (`if(!text&&!attachedImg)return`) didn't reset busy, leaving the Send button permanently disabled.
**Fix:** Reset busy=false and re-enable send button before the early return.
**Verified:** node --check OK.

### 3. Task mode completely broken (Coordinator) — CRITICAL
**Bug:** doSend() set busy=true, then called skRunTask(). But skRunTask() starts with `if(busy)return` — so it returned immediately without doing anything. Task requests ("go to google...") did NOTHING.
**Fix:** Reset busy=false before calling skRunTask() in doSend, so skRunTask's own guard works correctly.
**Verified:** node --check OK. Trace: doSend (busy=true) → reset (busy=false) → skRunTask (sees busy=false, sets busy=true, proceeds).

### 4. Multi-formula math rendering (Coordinator)
**Bug:** skRenderMath only rendered the first formula per text node. The `_skMath2` second-pass flag allowed exactly 2 passes, so "a \\(1\\) b \\(2\\) c \\(3\\)" would leave \\(3\\) as raw LaTeX.
**Fix:** Rewrote node processing to loop and render ALL formulas in a single pass — finds the earliest match across all three patterns (inline, display \[\], $$), renders it, continues with remaining text.
**Verified:** node --check OK. Node test script confirms 3 inline + 1 display formula all extracted correctly.

### 5. Email/graph block regex too strict (Coordinator)
**Bug:** The regex for ```email and ```graph blocks required a newline after the opening fence (```email\\n). But EMAIL_SYS tells the AI to output "one-line JSON", so it might write ```email {"to":...}``` on one line — which wouldn't match, silently dropping the email.
**Fix:** Made the newline optional (\\n? instead of \\n) for both email and graph blocks.
**Verified:** node --check OK. Node test confirms both newline and same-line formats extract correctly.

## Improvements Made
(none yet)

## Could Not Fix
(none yet)

## Test Coverage
- Team A: Chat + Math + Rendering (running)
- Team B: Tab Sharing + Auto-share (running)
- Team C: Task Mode + Zero Mail + Code-fix (running)
- Team D: Robustness + Error Paths + Privacy (running)
- Coordinator: critical path review — found 3 bugs above, all fixed
