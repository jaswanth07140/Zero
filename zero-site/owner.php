<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Zero · Owner Console</title>
<style>
:root{--bg:#0e0d12;--card:#17161d;--line:#2a2933;--ink:#f2f1f6;--muted:#9b98a8;--blue:#3b82f6;--red:#ef4444;--green:#22c55e}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;min-height:100vh;display:flex;justify-content:center;padding:32px 16px}
.wrap{width:100%;max-width:560px}
.brand{display:flex;align-items:center;gap:12px;margin-bottom:28px}
.mark{width:44px;height:44px;border-radius:50%;background:#fff;color:var(--blue);font-weight:900;font-size:24px;display:flex;align-items:center;justify-content:center}
.brand h1{font-size:20px;letter-spacing:-.4px}
.brand p{font-size:12px;color:var(--muted)}
.card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:24px;margin-bottom:16px}
.card h2{font-size:15px;margin-bottom:14px;letter-spacing:-.2px}
.row{display:flex;align-items:center;justify-content:space-between;gap:12px}
.pill{font-size:12px;font-weight:800;padding:6px 14px;border-radius:999px;letter-spacing:.4px}
.pill.on{background:rgba(34,197,94,.15);color:var(--green);border:1px solid rgba(34,197,94,.4)}
.pill.off{background:rgba(239,68,68,.15);color:var(--red);border:1px solid rgba(239,68,68,.4)}
.kill{width:100%;padding:18px;border-radius:16px;border:none;font-size:17px;font-weight:900;letter-spacing:-.3px;cursor:pointer;margin-top:16px;transition:transform .12s ease,opacity .2s}
.kill:active{transform:scale(.98)}
.kill.stop{background:var(--red);color:#fff}
.kill.start{background:var(--green);color:#04120a}
.kill:disabled{opacity:.5;cursor:wait}
.hint{font-size:12.5px;color:var(--muted);line-height:1.6;margin-top:12px}
input[type=password]{width:100%;background:var(--bg);border:1px solid var(--line);color:var(--ink);border-radius:12px;padding:13px 16px;font-size:15px;outline:none;margin-bottom:12px}
input[type=password]:focus{border-color:var(--blue)}
.btn{background:var(--blue);color:#fff;border:none;border-radius:12px;padding:13px 22px;font-size:15px;font-weight:800;cursor:pointer;width:100%}
.btn:active{transform:scale(.98)}
.err{color:var(--red);font-size:13px;margin-top:10px;display:none}
.upg{border-top:1px solid var(--line);padding:12px 0;display:flex;gap:12px;align-items:flex-start}
.upg:last-child{border-bottom:1px solid var(--line)}
.dot{width:9px;height:9px;border-radius:50%;margin-top:5px;flex-shrink:0}
.dot.models{background:var(--blue)}.dot.system{background:var(--muted)}.dot.kill{background:var(--red)}.dot.revive{background:var(--green)}.dot.revert{background:#f59e0b}
.upg .t{font-size:13px;line-height:1.5}
.upg .d{font-size:11px;color:var(--muted);margin-top:3px}
.upg .rv{margin-left:auto;flex-shrink:0;background:transparent;border:1px solid var(--line);color:var(--ink);border-radius:9px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer}
.upg .rv:hover{border-color:#f59e0b;color:#f59e0b}
.lock{font-size:12px;color:var(--muted);text-align:center;margin-top:20px;line-height:1.7}
.shake{animation:shake .4s}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}
</style>
</head>
<body>
<div class="wrap">
  <div class="brand">
    <div class="mark">0</div>
    <div><h1>Owner Console</h1><p>Only the owner gets in here.</p></div>
  </div>

  <div class="card" id="gate">
    <h2>Enter your owner key</h2>
    <input type="password" id="keyIn" placeholder="Owner key" autocomplete="off">
    <button class="btn" id="keyGo">Unlock</button>
    <div class="err" id="keyErr">Wrong key. Try again.</div>
  </div>

  <div id="console" style="display:none">
    <div class="card">
      <div class="row">
        <h2>Website status</h2>
        <span class="pill on" id="statusPill">ONLINE</span>
      </div>
      <button class="kill stop" id="killBtn">STOP THE ENTIRE WEBSITE</button>
      <div class="hint" id="killHint">One click takes everything offline — search, AI, apps, all of it. Viewers see a "taking a break" page. One click brings it back.</div>
    </div>
    <div class="card">
      <h2>Self-upgrade history</h2>
      <div id="upgList"><p class="hint">Loading…</p></div>
      <p class="hint">Don't like an AI lineup change? Hit <b>Revert</b> next to it — Zero goes back to the previous working lineup instantly.</p>
    </div>
  </div>

  <p class="lock"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg> This page asks for your owner key every visit.<br>Nothing here is visible to viewers.</p>
</div>
<script>
(function(){
"use strict";
var key = sessionStorage.getItem("zero-owner-key") || "";
var gate = document.getElementById("gate"),
    cons = document.getElementById("console"),
    keyIn = document.getElementById("keyIn"),
    keyErr = document.getElementById("keyErr"),
    pill = document.getElementById("statusPill"),
    killBtn = document.getElementById("killBtn"),
    upgList = document.getElementById("upgList");
function post(action, extra){
  var fd = new FormData();
  fd.append("key", key); fd.append("action", action);
  if(extra) for(var k in extra) fd.append(k, extra[k]);
  return fetch("zero-upgrades.php", {method:"POST", body:fd, credentials:"same-origin"})
    .then(function(r){ return r.json(); });
}
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
function renderStatus(d){
  var off = !!d.offline;
  pill.textContent = off ? "OFFLINE" : "ONLINE";
  pill.className = "pill " + (off ? "off" : "on");
  killBtn.textContent = off ? "START THE WEBSITE AGAIN" : "STOP THE ENTIRE WEBSITE";
  killBtn.className = "kill " + (off ? "start" : "stop");
}
function renderUpgrades(list){
  if(!list || !list.length){ upgList.innerHTML = '<p class="hint">No upgrades recorded yet.</p>'; return; }
  upgList.innerHTML = list.map(function(u){
    var dt = new Date(u.ts*1000);
    var when = dt.toLocaleString();
    var rv = (u.kind === "models") ? '<button class="rv" data-ts="'+esc(tsOf(u))+'">Revert</button>' : '';
    return '<div class="upg"><span class="dot '+esc(u.kind)+'"></span><div><div class="t">'+esc(u.detail)+'</div><div class="d">'+esc(when)+'</div></div>'+rv+'</div>';
  }).join("");
  upgList.querySelectorAll(".rv").forEach(function(b){
    b.onclick = function(){ doRevert(b.getAttribute("data-ts"), b); };
  });
}
function tsOf(u){
  var m = /backup ts (\d+)/.exec(u.detail || "");
  return m ? m[1] : "";
}
function refresh(){
  post("status").then(function(d){
    if(d.error){ gate.style.display=""; cons.style.display="none"; keyErr.style.display="block"; return; }
    renderStatus(d); renderUpgrades(d.upgrades);
  }).catch(function(){ keyErr.textContent = "Couldn't reach the server."; keyErr.style.display="block"; });
}
function unlock(){
  key = keyIn.value.trim();
  if(!key) return;
  keyErr.style.display = "none";
  post("status").then(function(d){
    if(d.error){
      keyErr.textContent = "Wrong key. Try again.";
      keyErr.style.display = "block";
      gate.classList.remove("shake"); void gate.offsetWidth; gate.classList.add("shake");
      return;
    }
    sessionStorage.setItem("zero-owner-key", key);
    gate.style.display = "none"; cons.style.display = "";
    renderStatus(d); renderUpgrades(d.upgrades);
  }).catch(function(){
    keyErr.textContent = "Couldn't reach the server."; keyErr.style.display = "block";
  });
}
killBtn.onclick = function(){
  var goingOff = killBtn.classList.contains("stop");
  killBtn.disabled = true;
  post(goingOff ? "kill" : "revive").then(function(d){
    killBtn.disabled = false;
    if(d.error){ alert(d.error); return; }
    refresh();
  }).catch(function(){ killBtn.disabled = false; alert("Couldn't reach the server."); });
};
function doRevert(ts, btn){
  if(!ts){ alert("No backup recorded for that upgrade."); return; }
  btn.disabled = true; btn.textContent = "…";
  post("revert", {ts: ts}).then(function(d){
    if(d.error){ alert(d.error); btn.disabled=false; btn.textContent="Revert"; return; }
    refresh();
  }).catch(function(){ alert("Couldn't reach the server."); btn.disabled=false; btn.textContent="Revert"; });
}
document.getElementById("keyGo").onclick = unlock;
keyIn.addEventListener("keydown", function(e){ if(e.key === "Enter") unlock(); });
if(key){ keyIn.value = key; unlock(); }
})();
</script>
</body>
</html>
