<?php
// ZeroTV Pluto proxy — fetches the Pluto TV channel list server-side.
// NO server storage: fetched live on every request; nothing is cached on disk.
// Only proxies the fixed Pluto endpoint (no user-controlled URLs).
// Hardened: guard.php locks CORS to zero.page.gd, validates Origin/Referer,
// and applies per-IP rate limiting (replaces the old open Access-Control-Allow-Origin: *).
require __DIR__ . "/guard.php";
header('Content-Type: application/json');
$ch = curl_init('https://api.pluto.tv/v2/channels');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 25,
    CURLOPT_USERAGENT => 'ZeroTV/1.0',
    CURLOPT_FOLLOWLOCATION => true,
]);
$data = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
if ($data && $code >= 200 && $code < 300) {
    echo $data;
} else {
    http_response_code(502);
    echo json_encode(['error' => 'pluto unavailable']);
}
