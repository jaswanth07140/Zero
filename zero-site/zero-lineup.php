<?php
// Public model lineup: provider/model IDs only. Never emit API keys or config secrets.
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/guard.php";
if (($_SERVER["REQUEST_METHOD"] ?? "GET") !== "GET") {
    http_response_code(405); header("Allow: GET");
    echo json_encode(["ok" => false, "error" => "Use GET."]); exit;
}
$cfgFile = __DIR__ . "/config.php";
if (!is_file($cfgFile)) { http_response_code(500); echo json_encode(["ok" => false, "error" => "No config."]); exit; }
$cfg = include $cfgFile;
$raw = isset($cfg["providers"]) && is_array($cfg["providers"]) ? $cfg["providers"] : [];
// Health gating: providers the monitor marked "down" in zero-provider-health.json
// are excluded, so every client only ever routes to models that actually answer.
// Missing file or "unknown" status = included (fail open, never fail closed).
$downProviders = [];
$healthFile = __DIR__ . "/zero-provider-health.json";
if (is_file($healthFile)) {
    $hj = json_decode(@file_get_contents($healthFile), true);
    if (is_array($hj) && isset($hj["providers"]) && is_array($hj["providers"])) {
        foreach ($hj["providers"] as $pn => $ps) {
            if (is_array($ps) && ($ps["status"] ?? "") === "down") {
                $downProviders[] = strtolower(trim((string)$pn));
            }
        }
    }
}
$lineup = [];
foreach ($raw as $key => $p) {
    if (!is_array($p)) continue;
    $name = isset($p["name"]) ? strtolower(trim((string)$p["name"])) : (is_string($key) ? strtolower(trim($key)) : "");
    if ($name === "") continue;
    if (in_array($name, $downProviders, true)) continue;
    $apiKey = isset($p["key"]) && is_string($p["key"]) ? trim($p["key"]) : "";
    // Do not advertise paid/keyed providers that have not been configured.
    if ($name !== "pollinations" && ($apiKey === "" || stripos($apiKey, "YOUR-") === 0)) continue;
    $models = [];
    if (isset($p["models"]) && is_array($p["models"])) foreach ($p["models"] as $m) {
        if (!is_string($m)) continue;
        $m = trim($m);
        if ($m !== "" && strlen($m) <= 160 && !preg_match('/[\r\n]/', $m)) $models[] = $m;
    }
    if (!$models) continue;
    $lineup[] = ["provider" => $name, "models" => array_values(array_unique($models))];
}
echo json_encode(["ok" => true, "lineup" => $lineup, "ts" => time()], JSON_UNESCAPED_SLASHES);
