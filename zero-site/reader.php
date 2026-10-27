<?php
// Zero Reader: fetches a page and returns clean readable content for in-Zero reading.
// GET ?url=https://...
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/guard.php";
// Accept GET (legacy) and POST (preferred: POST sends an Origin header so the
// guard can verify same-origin requests; plain GET carries no Origin).
$method = $_SERVER["REQUEST_METHOD"] ?? "GET";
$url = "";
if ($method === "POST") {
    $body = json_decode(@file_get_contents("php://input"), true);
    if (is_array($body)) $url = trim($body["url"] ?? "");
} else {
    $url = isset($_GET["url"]) ? trim($_GET["url"]) : "";
}
if ($url === "" || !preg_match('#^https?://#i', $url)) { echo json_encode(["error"=>"Bad URL."]); exit; }
$host = parse_url($url, PHP_URL_HOST);
if ($host === false || $host === null || $host === "") { echo json_encode(["error"=>"Bad URL."]); exit; }

// SSRF defense: never fetch local/private/internal targets through this endpoint,
// even though guard.php rate-limits it. Blocks loopback, RFC1918, link-local,
// metadata endpoints (169.254.169.254), and 0.0.0.0 by hostname pattern and by
// resolved IP (covers DNS rebinding to private ranges).
function zero_reader_host_ok($host) {
    $hostL = strtolower($host);
    if (preg_match('/^(localhost|\[::1\]|\[fe80::|\[fc00::|\[fd00::|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i', $hostL)) return false;
    $ip = @gethostbyname($hostL);
    if ($ip !== $hostL && $ip !== "" && !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return false;
    return true;
}
if (!zero_reader_host_ok($host)) {
    echo json_encode(["error"=>"URL not allowed."]); exit;
}

// Wikipedia: use the clean REST API
if (stripos($host, "wikipedia.org") !== false) {
    if (preg_match('#/wiki/([^#?]+)#', $url, $m)) {
        $title = $m[1];
        $api = "https://en.wikipedia.org/api/rest_v1/page/summary/" . $title;
        $ch = curl_init($api);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>8,
            CURLOPT_USERAGENT=>"ZeroReader/1.0", CURLOPT_HTTPHEADER=>["Accept: application/json"]]);
        $sr = curl_exec($ch); curl_close($ch);
        $sd = json_decode($sr, true);
        if (isset($sd["extract"])) {
            echo json_encode(["title"=>$sd["title"]??"", "content"=>$sd["extract"], "source"=>"Wikipedia"]);
            exit;
        }
    }
}

// Generic: fetch HTML with manual redirect following. Each redirect hop is
// re-validated against the SSRF blocklist (CURLOPT_FOLLOWLOCATION would bypass it).
$html = "";
$fetchUrl = $url;
for ($hop = 0; $hop < 4; $hop++) {
    $ch = curl_init($fetchUrl);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>10,
        CURLOPT_USERAGENT=>"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        CURLOPT_SSL_VERIFYPEER=>true, CURLOPT_SSL_VERIFYHOST=>2, CURLOPT_HEADER=>true]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $hdrSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    curl_close($ch);
    if ($resp === false) break;
    $body = substr($resp, $hdrSize);
    if ($code >= 300 && $code < 400) {
        if (!preg_match('/^location:\s*(\S+)/im', substr($resp, 0, $hdrSize), $lm)) break;
        $loc = trim($lm[1]);
        if (!preg_match('#^https?://#i', $loc)) { // resolve relative redirect
            $p = parse_url($fetchUrl);
            $base = $p["scheme"] . "://" . $p["host"];
            $loc = (strpos($loc, "/") === 0) ? $base . $loc
                : $base . rtrim(dirname($p["path"] ?? "/"), "/") . "/" . $loc;
        }
        $rh = parse_url($loc, PHP_URL_HOST);
        if (!$rh || !preg_match('#^https?://#i', $loc) || !zero_reader_host_ok($rh)) break;
        $fetchUrl = $loc;
        continue;
    }
    $html = $body;
    break;
}
if (!$html) { echo json_encode(["error"=>"Fetch failed."]); exit; }

$title = "";
if (preg_match('/<title[^>]*>(.*?)<\/title>/is', $html, $m)) $title = trim(html_entity_decode(strip_tags($m[1])));

// Remove scripts, styles, nav, footer, ads
$html = preg_replace('#<(script|style|nav|footer|header|aside)[^>]*>.*?</\1>#is', ' ', $html);
$text = "";
if (preg_match_all('/<p[^>]*>(.*?)<\/p>/is', $html, $mm)) {
    $paras = [];
    foreach ($mm[1] as $p) {
        $t = trim(html_entity_decode(strip_tags($p)));
        $t = preg_replace('/\s+/', ' ', $t);
        if (strlen($t) > 60) $paras[] = $t;
        if (count($paras) >= 25) break;
    }
    $text = implode("\n\n", $paras);
}
if (strlen($text) < 200) {
    // Fallback: strip all tags and take a chunk
    $t = trim(html_entity_decode(strip_tags($html)));
    $t = preg_replace('/\s+/', ' ', $t);
    $text = substr($t, 0, 6000);
}
echo json_encode(["title"=>$title, "content"=>substr($text, 0, 8000)]);
