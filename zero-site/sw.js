// Zero service worker — minimal, no caching (site always stays fresh).
// Exists so browsers offer the "Install app" option.
self.addEventListener("install", function(e){ self.skipWaiting(); });
self.addEventListener("activate", function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", function(e){ /* pass-through to network */ });
