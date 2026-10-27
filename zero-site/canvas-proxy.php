<?php
// canvas-proxy.php — SchoolAhead Canvas LMS sync (server-side, keeps the token off CORS-restricted browser calls)
// POST JSON: {domain:"school.instructure.com", token:"...", path:"/api/v1/courses?per_page=100"}
// Only serves the Zero origin (zero.page.gd). Rate-limited per IP.
header("Content-Type: application/json");

// ---- same-origin check ----
$origin = isset($_SERVER["HTTP_ORIGIN"]) ? $_SERVER["HTTP_ORIGIN"] : "";
$referer = isset($_SERVER["HTTP_REFERER"]) ? $_SERVER["HTTP_REFERER"] : "";
$ok = false;
foreach ([$origin, $referer] as $r) {
    if ($r && preg_match('#^https://zero\.page\.gd($|/)#', $r)) { $ok = true; break; }
}
if (!$ok) { http_response_code(403); echo json_encode(["error" => "Forbidden."]); exit; }

// ---- simple per-IP rate limit (60/min) ----
$ip = isset($_SERVER["REMOTE_ADDR"]) ? $_SERVER["REMOTE_ADDR"] : "x";
$rlFile = sys_get_temp_dir() . "/sa_canvas_" . preg_replace('/[^a-zA-Z0-9.]/', '_', $ip) . ".json";
$now = time();
$hits = [];
if (file_exists($rlFile)) { $hits = json_decode(file_get_contents($rlFile), true); if (!is_array($hits)) $hits = []; }
$hits = array_values(array_filter($hits, function($t) use ($now){ return $t > $now - 60; }));
if (count($hits) >= 60) { http_response_code(429); echo json_encode(["error" => "Too many requests."]); exit; }
$hits[] = $now;
@file_put_contents($rlFile, json_encode($hits));

if ($_SERVER["REQUEST_METHOD"] !== "POST") { http_response_code(405); echo json_encode(["error" => "POST only."]); exit; }
$body = json_decode(file_get_contents("php://input"), true);
if (!is_array($body)) { http_response_code(400); echo json_encode(["error" => "Bad request."]); exit; }

// ---- Mode 2: Canvas calendar feed (.ics) — no token needed ----
if (isset($body["ics_url"])) {
    $icsUrl = trim($body["ics_url"]);
    if (!preg_match('#^https://[a-z0-9.-]+\.[a-z]{2,}/.*\.ics(\?.*)?$#i', $icsUrl) || strlen($icsUrl) > 400) {
        http_response_code(400);
        echo json_encode(["error" => "That doesn't look like a calendar (.ics) link."]);
        exit;
    }
    $ctx2 = stream_context_create(["http" => [
        "method" => "GET", "timeout" => 25, "ignore_errors" => true,
        "header" => "User-Agent: Zero-Student-School/1.0\r\nAccept: text/calendar\r\n",
    ]]);
    $ics = @file_get_contents($icsUrl, false, $ctx2, 0, 1500000);
    if ($ics === false || stripos($ics, "BEGIN:VCALENDAR") === false) {
        http_response_code(502);
        echo json_encode(["error" => "Couldn't read that calendar link."]);
        exit;
    }
    echo json_encode(["ics" => $ics]);
    exit;
}

$domain = isset($body["domain"]) ? trim($body["domain"]) : "";
$token  = isset($body["token"])  ? trim($body["token"])  : "";
$path   = isset($body["path"])  ? trim($body["path"])   : "";

// Validate: bare hostname only, Canvas API path only
$domain = preg_replace('#^https?://#i', '', $domain);
$domain = rtrim(explode("/", $domain)[0]);
if (!preg_match('/^[a-z0-9.-]+\.[a-z]{2,}$/i', $domain) || strlen($domain) > 120) {
    http_response_code(400); echo json_encode(["error" => "Bad Canvas domain."]); exit;
}
if (!preg_match('#^/api/v1/(courses|courses/\d+/assignments|users/self)(\?.*)?$#', $path)) {
    http_response_code(400); echo json_encode(["error" => "Bad API path."]); exit;
}
if (strlen($token) < 10 || strlen($token) > 200) {
    http_response_code(400); echo json_encode(["error" => "Bad token."]); exit;
}

$url = "https://" . $domain . $path;
$ctx = stream_context_create([
    "http" => [
        "method" => "GET",
        "timeout" => 25,
        "header" => "Authorization: Bearer " . $token . "\r\nAccept: application/json\r\nUser-Agent: Zero-Student-School/1.0\r\n",
        "ignore_errors" => true,
    ],
    "ssl" => ["verify_peer" => true, "verify_peer_name" => true],
]);
$res = @file_get_contents($url, false, $ctx);
if ($res === false) { http_response_code(502); echo json_encode(["error" => "Could not reach Canvas. Check the domain."]); exit; }

// Surface Canvas HTTP errors honestly
$status = 200;
if (isset($http_response_header) && is_array($http_response_header)) {
    foreach ($http_response_header as $hh) {
        if (preg_match('#^HTTP/\S+\s+(\d+)#', $hh, $m)) { $status = intval($m[1]); break; }
    }
}
if ($status === 401 || $status === 403) { http_response_code(401); echo json_encode(["error" => "Canvas rejected the token. Make a new access token and try again."]); exit; }
if ($status < 200 || $status >= 300) { http_response_code(502); echo json_encode(["error" => "Canvas error (HTTP $status)."]); exit; }

echo $res;
