<?php
// Zero security guard — include at the top of every public PHP endpoint.
// 1. Locks CORS to zero.page.gd only (was: allow *)
// 2. Rejects requests without a valid Origin/Referer from zero.page.gd
// 3. Basic per-IP rate limiting (file-based)

$ALLOWED_ORIGINS = ["https://zero.page.gd", "https://studyplus.page.gd"];

// --- CORS: own sites only ---
$reqOrigin = isset($_SERVER["HTTP_ORIGIN"]) ? $_SERVER["HTTP_ORIGIN"] : "";
if (in_array($reqOrigin, $ALLOWED_ORIGINS, true)) {
    header("Access-Control-Allow-Origin: " . $reqOrigin);
    header("Access-Control-Allow-Credentials: true");
} else {
    // No CORS headers for anyone else — browsers will block cross-site use.
}
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
if (($_SERVER["REQUEST_METHOD"] ?? "") === "OPTIONS") { http_response_code(204); exit; }

// --- Origin / Referer check ---
// The site's own frontend always sends Origin (fetch) or Referer (navigation).
// Direct curl/bot calls with no referer are rejected.
$ref = isset($_SERVER["HTTP_REFERER"]) ? $_SERVER["HTTP_REFERER"] : "";
$originOk = in_array($reqOrigin, $ALLOWED_ORIGINS, true);
$refererOk = false;
foreach ($ALLOWED_ORIGINS as $ao) {
    if (strpos($ref, $ao . "/") === 0) { $refererOk = true; break; }
}
if (!$originOk && !$refererOk) {
    http_response_code(403);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode(["error" => "Forbidden."]);
    exit;
}

// --- Per-IP rate limiting ---
// 120 requests per minute per IP. File-based, self-cleaning.
function zero_rate_limit($maxPerMin = 120) {
    $ip = $_SERVER["REMOTE_ADDR"] ?? "unknown";
    $dir = sys_get_temp_dir() . "/zero_rl";
    if (!is_dir($dir)) { @mkdir($dir, 0700, true); }
    $file = $dir . "/" . preg_replace("/[^a-f0-9.:]/i", "", $ip) . ".json";
    $now = time();
    $window = 60;
    $data = ["t" => $now, "n" => 0];
    if (is_file($file)) {
        $d = json_decode(@file_get_contents($file), true);
        if (is_array($d) && isset($d["t"]) && ($now - $d["t"]) < $window) {
            $data = $d;
        }
    }
    $data["n"]++;
    @file_put_contents($file, json_encode(["t" => $data["t"], "n" => $data["n"]]));
    // Opportunistic cleanup of old files (1% chance per request)
    if (mt_rand(1, 100) === 1) {
        foreach (glob($dir . "/*.json") ?: [] as $f) {
            if ($now - @filemtime($f) > 300) @unlink($f);
        }
    }
    if ($data["n"] > $maxPerMin) {
        http_response_code(429);
        header("Content-Type: application/json; charset=utf-8");
        header("Retry-After: 60");
        echo json_encode(["error" => "Too many requests."]);
        exit;
    }
}
zero_rate_limit();
