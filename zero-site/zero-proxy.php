<?php
// Zero Proxy — open sites that block iframing (Amazon, eBay...) INSIDE Zero tabs.
// Fetches the page server-side and serves it from zero.page.gd, rewriting
// same-site links/forms/images to stay in the proxy. Same-origin only (guard.php).
// Honest limits: browsing/reading works; login, cart and checkout need the real browser
// (use the "Open site" button in the webview bar).
header("Content-Type: text/html; charset=utf-8");
// Security: sandbox proxied pages to an opaque origin so hostile pages
// cannot read Zero's browser storage (chats, pairing keys, sessions).
// Scripts still run, but get no access to zero.page.gd's storage/cookies.
header("Content-Security-Policy: sandbox allow-scripts allow-forms allow-popups allow-modals");
require __DIR__ . "/guard.php";

function pfail($msg, $orig){
  global $PROBE_JSON;
  if(!empty($PROBE_JSON)){
    http_response_code(400);
    header("Content-Type: application/json");
    echo json_encode(["blocked" => true, "error" => $msg]);
    exit;
  }
  http_response_code(502);
  $back = $orig ? '<p><a href="'.htmlspecialchars($orig).'" target="_blank" rel="noopener" style="color:#007AFF;font-weight:600">Open in real browser &rarr;</a></p>' : '';
  echo "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Zero Proxy</title></head>"
     . "<body style='font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:90vh;margin:0;background:#f5f5f7'>"
     . "<div style='text-align:center;padding:32px;max-width:420px'><div style='font-size:44px'>&#127760;</div>"
     . "<h2 style='margin:12px 0 8px'>Couldn't load this page inside Zero</h2>"
     . "<p style='color:#666'>".htmlspecialchars($msg)."</p>" . $back . "</div></body></html>";
  exit;
}

$self = strtolower($_SERVER["HTTP_HOST"] ?? "");
// SSRF protection: never proxy ourselves or private/reserved addresses.
// Used for the initial URL, redirect targets, and probe mode.
function host_allowed($h){
  global $self;
  $h = strtolower(trim((string)$h));
  if($h === "" || $h === "localhost" || $h === $self) return false;
  $ip = @gethostbyname($h);
  if($ip === $h) return false;
  return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
}
// Normalize + validate a user-supplied URL. Returns [fetch_url, host] or exits via pfail.
function clean_target($url){
  $url = trim((string)$url);
  if($url === "") pfail("No URL given.", "");
  if(!preg_match('#^https?://#i', $url)) $url = "https://" . $url;
  $parts = parse_url($url);
  if(!$parts || empty($parts["host"]) || !preg_match('/^https?$/i', $parts["scheme"] ?? "")) pfail("That URL isn't valid.", $url);
  $host = strtolower($parts["host"]);
  if(!host_allowed($host)) pfail("That address isn't allowed.", $url);
  $fetch = strtolower($parts["scheme"]) . "://" . $host
         . (isset($parts["port"]) ? ":".$parts["port"] : "")
         . ($parts["path"] ?? "/") . (isset($parts["query"]) ? "?".$parts["query"] : "");
  return [$fetch, $host];
}

$UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// ---- probe mode: ?probe=URL -> JSON {blocked} ----
// Lets Zero check whether a site forbids iframing (X-Frame-Options / CSP
// frame-ancestors) so the webview can auto-fall back to the proxied view.
if(isset($_GET["probe"])){
  $PROBE_JSON = true;
  header("Content-Type: application/json");
  list($fetch_url) = clean_target($_GET["probe"]);
  $ch = curl_init($fetch_url);
  curl_setopt_array($ch, [
    CURLOPT_NOBODY         => true,
    CURLOPT_HEADER         => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS      => 5,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_CONNECTTIMEOUT => 6,
    CURLOPT_USERAGENT      => $UA,
    CURLOPT_SSL_VERIFYPEER => true,
  ]);
  $head = curl_exec($ch);
  $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $final = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
  curl_close($ch);
  $fhost = strtolower((string)@parse_url($final ?: "", PHP_URL_HOST));
  if($fhost && !host_allowed($fhost)){ echo json_encode(["blocked" => true]); exit; }
  $blocked = false;
  if($head){
    foreach(preg_split("/\r\n|\n/", $head) as $line){
      if(preg_match('/^x-frame-options\s*:\s*(deny|sameorigin)/i', trim($line))){ $blocked = true; break; }
      if(preg_match('/^content-security-policy(?:-report-only)?\s*:\s*(.+)$/i', trim($line), $m)){
        if(preg_match('/frame-ancestors\s+([^;]+)/i', $m[1], $f)){
          $fa = trim($f[1]);
          if(stripos($fa, "*") === false && stripos($fa, "zero.page.gd") === false) $blocked = true;
        }
      }
    }
  }
  echo json_encode(["blocked" => $blocked, "http" => $http]);
  exit;
}

list($fetch_url, $host) = clean_target($_GET["url"] ?? "");
$scheme = strtolower(parse_url($fetch_url, PHP_URL_SCHEME));

$ch = curl_init($fetch_url);
// Cap downloads at 3MB (bandwidth abuse protection)
$maxBytes = 3 * 1024 * 1024;
$gotBytes = 0;
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_MAXREDIRS      => 5,
  CURLOPT_TIMEOUT        => 20,
  CURLOPT_CONNECTTIMEOUT => 8,
  CURLOPT_ENCODING       => "",
  CURLOPT_USERAGENT      => "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  CURLOPT_HTTPHEADER     => ["Accept: text/html,application/xhtml+xml", "Accept-Language: en-US,en;q=0.9"],
  CURLOPT_SSL_VERIFYPEER => true,
  CURLOPT_WRITEFUNCTION  => function($ch, $chunk) use (&$body, &$gotBytes, $maxBytes) {
    $gotBytes += strlen($chunk);
    if($gotBytes > $maxBytes) return 0; // abort transfer
    $body .= $chunk;
    return strlen($chunk);
  },
]);
$body = "";
$ok = curl_exec($ch);
$ct   = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$final = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
curl_close($ch);
// SSRF re-check: the redirect chain may have landed somewhere the original
// host check never saw. Validate the final host too.
$fparts = @parse_url($final ?: "");
$fhost = strtolower($fparts["host"] ?? "");
if($fhost && $fhost !== $host){
  if($fhost === $self || $fhost === "localhost") pfail("Can't proxy this site.", $url);
  $fip = @gethostbyname($fhost);
  if($fip === $fhost || filter_var($fip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false){
    pfail("That address isn't allowed.", $url);
  }
}
if($ok === false || $gotBytes >= $maxBytes) pfail("That page is too large to preview inside Zero.", $url);
if($body === "" || $http >= 400 || strlen($body) < 500) pfail("The site didn't return a page (HTTP $http).", $url);
if(stripos((string)$ct, "html") === false && stripos($body, "<html") === false && stripos($body, "<!DOCTYPE") === false){
  pfail("Only web pages can be opened this way.", $url);
}
if(!class_exists("DOMDocument")) pfail("Page processor unavailable.", $url);

// ---- rewrite URLs so the page keeps working inside Zero ----
$fp = parse_url($final ?: $fetch_url);
$page_host = strtolower($fp["host"] ?? $host);
$page_scheme = strtolower($fp["scheme"] ?? $scheme);

$doc = new DOMDocument();
libxml_use_internal_errors(true);
$doc->loadHTML('<?xml encoding="utf-8"?>' . $body, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
libxml_clear_errors();
$xpath = new DOMXPath($doc);

$resolve = function($u) use ($final, $fetch_url) {
  $u = trim((string)$u);
  if($u === "" || $u[0] === "#") return null;
  if(preg_match('#^(javascript|data|mailto|tel|blob):#i', $u)) return null;
  $base = $final ?: $fetch_url;
  if(strpos($u, "//") === 0) $u = parse_url($base, PHP_URL_SCHEME) . ":" . $u;
  $p = parse_url($u);
  if(empty($p["host"])){
    $bp = parse_url($base);
    $bhost = $bp["scheme"] . "://" . $bp["host"] . (isset($bp["port"]) ? ":".$bp["port"] : "");
    if(strpos($u, "/") === 0){
      $u = $bhost . $u;
    } else {
      $dir = substr($base, 0, strrpos($base, "/") + 1);
      $u = $dir . $u;
      $u = preg_replace('#/\./#', '/', $u);
      while(preg_match('#/[^/]+/\.\./#', $u)) $u = preg_replace('#/[^/]+/\.\./#', '/', $u);
    }
  }
  if(!preg_match('#^https?://#i', $u)) return null;
  return $u;
};
$proxify = function($u) use ($page_host) {
  $p = parse_url($u);
  if(strtolower($p["host"] ?? "") === $page_host){
    return "/zero-proxy.php?url=" . urlencode($u);
  }
  return $u; // CDN / third-party assets load directly
};

foreach([["a","href"],["img","src"],["link","href"],["script","src"],["iframe","src"],
         ["form","action"],["video","src"],["audio","src"],["source","src"],["track","src"],["embed","src"]] as $ta){
  foreach($xpath->query("//".$ta[0]."[@".$ta[1]."]") as $el){
    $abs = $resolve($el->getAttribute($ta[1]));
    if($abs !== null) $el->setAttribute($ta[1], $proxify($abs));
  }
}
foreach($xpath->query("//*[@srcset]") as $el){
  $out = [];
  foreach(explode(",", $el->getAttribute("srcset")) as $pt){
    $pt = trim($pt);
    if(preg_match('/^(\S+)(\s+.*)?$/', $pt, $m)){
      $abs = $resolve($m[1]);
      $out[] = ($abs !== null ? $proxify($abs) : $m[1]) . ($m[2] ?? "");
    }
  }
  if($out) $el->setAttribute("srcset", implode(", ", $out));
}
// GET forms keep navigation inside the proxy (logins/checkouts need the real browser anyway)
foreach($xpath->query("//form") as $f){ $f->setAttribute("method", "get"); }
// Safety: remove <base> tags (would corrupt our rewriting), meta-refresh
// redirects (frame-breakout), and password fields (login can't work through
// the stateless proxy, so never let credentials travel through this server).
foreach($xpath->query("//base") as $b){ $b->parentNode->removeChild($b); }
foreach($xpath->query("//meta[translate(@http-equiv,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')='refresh']") as $m){ $m->parentNode->removeChild($m); }
foreach($xpath->query("//input[translate(@type,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')='password']") as $p){ $p->parentNode->removeChild($p); }

echo "<!-- Served inside Zero via zero-proxy.php. Browsing works here; for login/cart/checkout use 'Open site'. -->\n";
echo $doc->saveHTML();
