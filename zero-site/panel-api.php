<?php
// Zero Sidekick panel API relay (v1.1.0) — token-gated.
// The extension runs at a chrome-extension:// origin, which guard.php's
// same-origin check would reject with 403. This relay authenticates the
// extension with a shared token instead, then hands the request to one of
// Zero's own endpoints with a spoofed first-party context.
//
// Client contract:
//   POST/GET https://zero.page.gd/panel-api.php
//   Headers: X-Zero-Panel: <token>   (required)
//            X-Zero-Target: single|synth|lineup|upgrades
//   Body: the target endpoint's own payload, untouched (raw JSON for POST).
//
// NOTE: guard.php is deliberately NOT included here — its 403 origin path
// would reject the extension, and including it twice (once here, once inside
// the target) would fatal on function redeclaration. Rate limiting below
// mirrors guard.php's bucket exactly; the target's own guard.php include
// then re-checks the spoofed first-party origin.
header("Content-Type: application/json; charset=utf-8");
if (($_SERVER["REQUEST_METHOD"] ?? "") === "OPTIONS") {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, X-Zero-Panel, X-Zero-Target");
    http_response_code(204);
    exit;
}

// --- rate limiting: 120 requests/min per IP (same bucket as guard.php) ---
$zp_ip = $_SERVER["REMOTE_ADDR"] ?? "unknown";
$zp_dir = sys_get_temp_dir() . "/zero_rl";
if (!is_dir($zp_dir)) { @mkdir($zp_dir, 0700, true); }
$zp_file = $zp_dir . "/" . preg_replace("/[^a-f0-9.:]/i", "", $zp_ip) . ".json";
$zp_now = time();
$zp_data = ["t" => $zp_now, "n" => 0];
if (is_file($zp_file)) {
    $zp_d = json_decode(@file_get_contents($zp_file), true);
    if (is_array($zp_d) && isset($zp_d["t"]) && ($zp_now - $zp_d["t"]) < 60) { $zp_data = $zp_d; }
}
$zp_data["n"]++;
@file_put_contents($zp_file, json_encode(["t" => $zp_data["t"], "n" => $zp_data["n"]]));
if ($zp_data["n"] > 120) {
    http_response_code(429);
    header("Retry-After: 60");
    echo json_encode(["error" => "Too many requests."]);
    exit;
}

// --- token gate (replaces guard.php's origin check for this file only) ---
$zp_secret = @include __DIR__ . "/panel-token.php";
$zp_got = $_SERVER["HTTP_X_ZERO_PANEL"] ?? "";
if (!is_string($zp_secret) || $zp_secret === "" || !is_string($zp_got) || !hash_equals($zp_secret, $zp_got)) {
    http_response_code(403);
    echo json_encode(["error" => "Forbidden."]);
    exit;
}

// --- target whitelist: exact match only, never an arbitrary file ---
$zp_map = [
    "single"   => "api-single.php",
    "synth"    => "api-synth.php",
    "lineup"   => "zero-lineup.php",
    "upgrades" => "zero-upgrades.php",
    "relay"    => "zero-relay.php",
];
$zp_target = $_SERVER["HTTP_X_ZERO_TARGET"] ?? "";
if (!is_string($zp_target) || !isset($zp_map[$zp_target])) {
    http_response_code(400);
    echo json_encode(["error" => "Unknown target."]);
    exit;
}

// Spoof first-party context so the target's own guard.php include passes,
// then hand off. The target reads php://input (the raw client body) untouched;
// for GET targets the query string passes through automatically.
$_SERVER["HTTP_ORIGIN"] = "https://zero.page.gd";
$_SERVER["HTTP_REFERER"] = "https://zero.page.gd/panel.html";
require __DIR__ . "/" . $zp_map[$zp_target];
