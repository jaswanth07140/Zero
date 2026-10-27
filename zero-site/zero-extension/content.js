// Zero Computer — content script. Runs in every page, executes DOM actions for the AI.
// Safety: never touches password fields.

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.cmd === "read") {
        const links = Array.from(document.querySelectorAll("a[href]"))
          .slice(0, 60)
          .map(a => ({ t: (a.innerText || "").trim().slice(0, 80), href: a.href,
                       sel: 'a[href="' + a.href.replace(/"/g, "%22") + '"]' }))
          .filter(l => l.t && l.href);
        const fields = Array.from(document.querySelectorAll("input,textarea,select"))
          .filter(el => {
            const t = (el.type || "").toLowerCase();
            return t !== "password" && t !== "hidden" && t !== "submit" && t !== "button" && t !== "image";
          })
          .slice(0, 20)
          .map(el => {
            const tag = el.tagName.toLowerCase();
            let sel;
            if (el.id) sel = "#" + CSS.escape(el.id);
            else if (el.name) sel = tag + '[name="' + el.name.replace(/"/g, "") + '"]';
            else if (el.getAttribute("aria-label")) sel = tag + '[aria-label="' + el.getAttribute("aria-label").replace(/"/g, "") + '"]';
            else if (el.placeholder) sel = tag + '[placeholder="' + el.placeholder.replace(/"/g, "") + '"]';
            else sel = tag;
            return { sel, kind: el.type || tag, name: el.name || "", hint: (el.placeholder || el.getAttribute("aria-label") || "").slice(0, 60) };
          });
        sendResponse({
          text: document.body ? document.body.innerText.slice(0, 12000) : "",
          links, fields
        });
      } else if (msg.cmd === "click") {
        const el = document.querySelector(msg.selector);
        if (!el) return sendResponse({ ok: false, error: "not found: " + msg.selector });
        try { el.scrollIntoView({ block: "center" }); } catch (e) {}
        el.click();
        sendResponse({ ok: true });
      } else if (msg.cmd === "fill") {
        const el = document.querySelector(msg.selector);
        if (!el) return sendResponse({ ok: false, error: "not found: " + msg.selector });
        if (el.type === "password") return sendResponse({ ok: false, error: "refuses password fields" });
        el.focus();
        try {
          document.execCommand("selectAll", false, null);
          document.execCommand("insertText", false, String(msg.value || ""));
        } catch (e) {
          el.value = msg.value;
        }
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        sendResponse({ ok: true });
      } else {
        sendResponse({ ok: false, error: "unknown cmd" });
      }
    } catch (e) {
      sendResponse({ ok: false, error: String(e.message || e) });
    }
  })();
  return true; // async response
});
