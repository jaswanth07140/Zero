<?php
// Zero site monitor: checks for errors across the site.
// Token-protected. Returns JSON. Logs issues. Never outputs key values.
header("Content-Type: application/json; charset=utf-8");
if (!isset($_GET["token"]) || $_GET["token"] !== "3e69a9732ae696db606308cae4f2492b") {
    http_response_code(403); echo json_encode(["status"=>"error","issues"=>["forbidden"]]); exit;
}
$issues = [];
$base = "https://zero.page.gd";

// curl helper: retries once on connection-level failure (HTTP 0), because
// InfinityFree's free tier intermittently drops loopback requests (seen
// 2026-10-09, and again 2026-10-20 as a "homepage failed (HTTP 0)" false
// alarm while the site was fully reachable externally). A genuinely down
// site still fails both attempts, so the monitor keeps its teeth.
function zero_curl($url, $opts = []) {
    $defaults = [CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>15, CURLOPT_CONNECTTIMEOUT=>10,
        CURLOPT_USERAGENT=>"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"];
    $r = false; $h = 0;
    for ($try = 0; $try < 2; $try++) {
        $ch = curl_init($url);
        curl_setopt_array($ch, $opts + $defaults);
        $r = curl_exec($ch); $h = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
        if ($h !== 0 && $r !== false) break;
    }
    return [$r, $h];
}

// 1. Config loads
$cfg = @include __DIR__ . "/config.php";
if (!is_array($cfg) || empty($cfg["providers"])) $issues[] = "config.php invalid";
else {
    $hasGroq = false;
    foreach ($cfg["providers"] as $p) if (strtolower($p["name"])==="groq" && !empty($p["key"])) $hasGroq = true;
    if (!$hasGroq) $issues[] = "groq key missing";
}

// 2. api.php responds to POST
list($r, $h) = zero_curl("$base/api.php?i=1", [CURLOPT_POST=>true,
    CURLOPT_POSTFIELDS=>json_encode(["messages"=>[["role"=>"user","content"=>"Say OK"]],"short"=>true]),
    CURLOPT_HTTPHEADER=>["Content-Type: application/json"], CURLOPT_TIMEOUT=>25]);
$d = @json_decode($r, true);
if ($h !== 200 || !isset($d["answer"])) $issues[] = "api.php POST failed (HTTP $h)";

// 3. Homepage loads
list($r, $h) = zero_curl("$base/?v=999");
if ($h !== 200 || stripos((string)$r,"<html")===false) $issues[] = "homepage failed (HTTP $h)";

// 4. cse.html loads (Google results page)
list($r, $h) = zero_curl("$base/cse.html");
if ($h !== 200) $issues[] = "cse.html failed (HTTP $h)";

$status = empty($issues) ? "ok" : "error";
if ($status === "error") {
    // Capped logging: monitor.log never exceeds 200 lines (5GB protection).
    $mlog = __DIR__."/monitor.log";
    @file_put_contents($mlog, gmdate("Y-m-d H:i:s")." ".implode("; ",$issues)."\n", FILE_APPEND);
    $mlines = @file($mlog, FILE_IGNORE_NEW_LINES);
    if (is_array($mlines) && count($mlines) > 200) {
        @file_put_contents($mlog, implode("\n", array_slice($mlines, -200))."\n", LOCK_EX);
    }
}
echo json_encode(["status"=>$status,"issues"=>$issues,"time"=>gmdate("Y-m-d H:i:s")]);
