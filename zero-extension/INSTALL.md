# Zero Sidekick — Install on any computer

Zero Sidekick is a Chrome/Edge extension (Manifest V3) that puts Zero AI in your
browser's side panel: chat, see your tabs, and do browser tasks while you watch.

Nothing in it is tied to one computer — no accounts, no license keys, no
per-machine setup. If you can load an unpacked extension in Chrome, it works.

## Install (2 minutes)

1. Download the latest zip: https://zero.page.gd/zero-sidekick.zip
2. Unzip it into a folder (keep the folder — Chrome reads the extension from it).
3. Open Chrome and go to `chrome://extensions`
4. Turn on **Developer mode** (toggle, top right).
5. Click **Load unpacked** and select the unzipped folder.
6. Click the puzzle-piece icon in Chrome's toolbar and **pin Zero Sidekick**,
   then open it from the toolbar or the side-panel icon.

To update later: the panel itself tells you when a new version is out.
Download the new zip, unzip it, remove the old extension at
`chrome://extensions`, and Load unpacked the new folder.

## What it asks permission for (and why)

- **Read and change data on websites** — only so it can drive tabs when you
  explicitly ask it to ("go to google.com and search…"). It never runs on its
  own.
- **Tabs / activeTab / scripting** — to read the tab you share and to perform
  the driving steps you asked for.
- **Side panel** — to live in Chrome's side panel.

## Privacy & safety

- No sign-in, no account, no tracking, no analytics.
- Your chats live only in the panel's memory — closing it wipes them.
  (There is deliberately no chat history and no learning from you.)
- Password, username, email and login fields are hard-blocked in code: the
  Sidekick will not read them, and it only ever fills a sensitive value you
  type into its masked one-time input.
- AI answers come through Zero's own relay at zero.page.gd. The first time on
  a new computer, open zero.page.gd once in a normal tab so its bot check
  passes, then the panel connects on its own.

## School / office laptops — one honest note

On a personal computer the steps above just work. On a **managed** school or
office laptop, your IT admin may have turned off Developer mode or blocked
unpacked extensions entirely. If `chrome://extensions` won't let you turn on
Developer mode, no setting inside the extension can override that — it's a
Chrome policy your admin controls. The only fix is asking them to allow it
(or to allowlist Zero Sidekick). A Chrome Web Store listing would install
anywhere with one click, but it isn't published there.

## Phones & tablets — the honest picture

**The Zero website works fully on phones.** zero.page.gd, Zero AI, and the
web panel are phone-friendly — just open them in your phone's browser. No
install needed; this is the path that works everywhere, guaranteed.

**The extension on phones is limited by the phones themselves** — stock
Chrome and Safari on iPhone/Android do not run Chrome extensions at all
(Apple/Google don't allow it). The options that do exist:

- **iPhone / iPad:** the free **Orion** browser (App Store) can load unpacked
  Chrome extensions. Install it, then in Orion load the unzipped Sidekick
  folder from its extensions screen. Caveat: Orion's support for Chrome's
  side-panel UI is still maturing — if the panel won't open, use the web
  panel at zero.page.gd/panel.html instead.
- **Android:** **Quetta** or **Lemur** browsers (Play Store) support
  `chrome://extensions` → Developer mode → Load unpacked. (Kiwi, the old
  favorite, was discontinued in 2025 — don't sideload its APK.) Same
  caveat: the side-panel surface may not be available on mobile, so keep
  zero.page.gd/panel.html as the fallback.
- **Firefox on Android:** not viable for this extension (no side-panel API).

Before promising yourself it'll work, treat the extension-on-phone route as
an experiment: it needs a real-device test, and the web panel is the
fallback that always works.
