// Zero Computer — background service worker.
// Polls the Zero relay for AI commands and executes them in this Chrome.
// The AI drives; the viewer just watches.

const RELAY = "https://zero.page.gd/zero-relay.php";
let KEY = null;

function genKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const rnd = crypto.getRandomValues(new Uint8Array(32));
  let s = "";
  for (let i = 0; i < 32; i++) s += chars[rnd[i] % chars.length];
  return s;
}

async function ensureKey() {
  if (KEY) return KEY;
  const s = await chrome.storage.local.get("zc_key");
  if (!s.zc_key) {
    const k = genKey();
    await chrome.storage.local.set({ zc_key: k });
    KEY = k;
  } else {
    KEY = s.zc_key;
  }
  return KEY;
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureKey();
  chrome.alarms.create("zc-poll", { periodInMinutes: 0.5 });
  await chrome.storage.local.set({ zc_last: 0, zc_status: "installed" });
});

// Instant wake-up ping from zero.page.gd (no 30s wait when the site nudges us)
chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "zc-wake") {
    poll().then(() => sendResponse({ ok: true }));
    return true;
  }
});

chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === "zc-poll") poll();
});

async function poll() {
  const key = await ensureKey();
  try {
    const r = await fetch(RELAY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "poll", key })
    });
    const j = await r.json();
    await chrome.storage.local.set({ zc_last: Date.now() });
    for (const item of j.commands || []) {
      let res;
      try {
        res = await execCmd(item.cmd);
      } catch (e) {
        res = { ok: false, error: String((e && e.message) || e) };
      }
      try {
        await fetch(RELAY, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "result", key, id: item.id, ok: !!res.ok, data: res })
        });
      } catch (e) { /* result will be retried next poll */ }
    }
    await chrome.storage.local.set({ zc_status: "ok" });
  } catch (e) {
    await chrome.storage.local.set({ zc_status: "offline" });
  }
}

async function activeTab() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tabs[0]) throw new Error("no active tab");
  return tabs[0];
}

function waitForLoad(tabId, timeoutMs = 25000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const iv = setInterval(async () => {
      try {
        const t = await chrome.tabs.get(tabId);
        if (t.status === "complete" || Date.now() - start > timeoutMs) {
          clearInterval(iv);
          resolve();
        }
      } catch (e) {
        clearInterval(iv);
        resolve();
      }
    }, 500);
  });
}

async function execCmd(cmd) {
  switch (cmd.action) {
    case "navigate": {
      if (!cmd.url || !/^https?:\/\//i.test(cmd.url)) return { ok: false, error: "bad url" };
      let tab;
      try { tab = await activeTab(); } catch (e) { tab = null; }
      if (tab && !/^chrome:|^about:/.test(tab.url || "")) {
        await chrome.tabs.update(tab.id, { url: cmd.url });
      } else {
        tab = await chrome.tabs.create({ url: cmd.url });
      }
      await waitForLoad(tab.id);
      await new Promise(r => setTimeout(r, 1200)); // let late JS settle
      const t = await chrome.tabs.get(tab.id);
      return { ok: true, title: t.title || "", url: t.url || "" };
    }
    case "read": {
      const tab = await activeTab();
      if (/^chrome:|^about:/.test(tab.url || "")) return { ok: false, error: "cannot read this page" };
      const res = await chrome.tabs.sendMessage(tab.id, { cmd: "read" }).catch(() => null);
      const t = await chrome.tabs.get(tab.id);
      return {
        ok: true, title: t.title || "", url: t.url || "",
        text: ((res && res.text) || "").slice(0, 12000),
        links: ((res && res.links) || []).slice(0, 60),
        fields: ((res && res.fields) || []).slice(0, 20)
      };
    }
    case "click": {
      const tab = await activeTab();
      if (/^chrome:|^about:/.test(tab.url || "")) return { ok: false, error: "cannot click here" };
      const res = await chrome.tabs.sendMessage(tab.id, { cmd: "click", selector: cmd.selector }).catch(() => null);
      if (!res) return { ok: false, error: "page not ready" };
      await new Promise(r => setTimeout(r, 1500));
      return { ok: !!res.ok, error: res.error };
    }
    case "fill": {
      const tab = await activeTab();
      if (/^chrome:|^about:/.test(tab.url || "")) return { ok: false, error: "cannot fill here" };
      const res = await chrome.tabs.sendMessage(tab.id, { cmd: "fill", selector: cmd.selector, value: cmd.value }).catch(() => null);
      if (!res) return { ok: false, error: "page not ready" };
      return { ok: !!res.ok, error: res.error };
    }
    case "shot": {
      const win = await chrome.windows.getLastFocused().catch(() => null);
      const dataUrl = await chrome.tabs.captureVisibleTab(win ? win.id : undefined, { format: "jpeg", quality: 50 });
      return { ok: true, image: dataUrl };
    }
  }
  return { ok: false, error: "unknown action: " + (cmd.action || "?") };
}

// poll once on worker startup too
ensureKey().then(() => poll());
