<?php
// Service worker served via PHP to force the correct MIME type.
// InfinityFree/page.gd serves .js as text/html (ignores .htaccess AddType),
// which makes Chrome reject the service worker. This wrapper fixes it.
header("Content-Type: application/javascript");
header("Cache-Control: no-cache");
readfile(__DIR__ . "/sw.js");
