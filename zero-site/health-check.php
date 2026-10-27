<?php
// Daily AI health check: verifies ALL configured providers, reconciles retired
// model IDs, and maintains zero-provider-health.json so the lineup + API routing
// only ever use models that actually answer. Dead providers are excluded from
// the lineup; recovered providers are readmitted automatically.
// Protected by token (?token=...). Logs to health.log. Never outputs key values.
header("Content-Type: text/plain; charset=utf-8");
if (!isset($_GET["token"]) || $_GET["token"] !== "3e69a9732ae696db606308cae4f2492b") {
    http_response_code(403); exit("Forbidden");
}
$log = __DIR__ . "/health.log";
$healthFile = __DIR__ . "/zero-provider-health.json";
// Capped logging: health.log never exceeds 200 lines (5GB protection).
function hc_log($log, $msg) {
    @file_put_contents($log, $msg, FILE_APPEND);
    $lines = @file($log, FILE_IGNORE_NEW_LINES);
    if (is_array($lines) && count($lines) > 200) {
        @file_put_contents($log, implode("\n", array_slice($lines, -200)) . "\n", LOCK_EX);
    }
}
function hc_fetch_models($url, $key) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ["Authorization: Bearer " . $key],
        CURLOPT_TIMEOUT => 15, CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2]);
    $resp = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    return [$resp, $http, $err];
}
function hc_backup_config($cfgFile) {
    $ts = time();
    @copy($cfgFile, __DIR__ . "/config.backup." . $ts . ".php");
    $all = [];
    foreach (glob(__DIR__ . "/config.backup.*.php") ?: [] as $bf) $all[] = $bf;
    if (!empty($all)) {
        rsort($all);
        foreach (array_slice($all, 3) as $old) @unlink($old);
    }
    return $ts;
}
$stamp = gmdate("Y-m-d H:i:s");
$out = "[$stamp] ";
require_once __DIR__ . "/zero-upgrades-lib.php";

$cfgFile = __DIR__ . "/config.php";
if (!file_exists($cfgFile)) { $out .= "ERROR config.php missing\n"; hc_log($log, $out); echo $out; exit; }
$cfg = include $cfgFile;

// Provider check specs: models endpoint, preferred replacement IDs, aliases
// that are kept even though they never appear in the provider's model list.
$specs = [
    "groq"       => ["url" => "https://api.groq.com/openai/v1/models",
                     "prefs" => ["openai/gpt-oss-120b", "openai/gpt-oss-20b"], "keep" => []],
    "cerebras"   => ["url" => "https://api.cerebras.ai/v1/models",
                     "prefs" => ["gpt-oss-120b", "qwen-3.8-27b"], "keep" => []],
    "openrouter" => ["url" => "https://openrouter.ai/api/v1/models",
                     "prefs" => ["openrouter/free"], "keep" => ["openrouter/free"]],
    "mistral"    => ["url" => "https://api.mistral.ai/v1/models",
                     "prefs" => ["mistral-small-latest"], "keep" => []],
];
// Index configured providers by name.
$entries = [];
foreach (($cfg["providers"] ?? []) as $key => $p) {
    if (!is_array($p)) continue;
    $nm = isset($p["name"]) ? strtolower(trim((string)$p["name"]))
        : (is_string($key) ? strtolower(trim($key)) : "");
    if ($nm !== "") $entries[$nm] = $p;
}
// Load previous health to detect transitions.
$prevHealth = [];
if (is_file($healthFile)) {
    $pj = json_decode(@file_get_contents($healthFile), true);
    if (is_array($pj) && isset($pj["providers"]) && is_array($pj["providers"])) {
        foreach ($pj["providers"] as $pn => $ps) {
            if (is_array($ps)) $prevHealth[strtolower(trim((string)$pn))] = $ps["status"] ?? "unknown";
        }
    }
}
$newHealth = ["updated" => gmdate("Y-m-d\TH:i:s\Z"), "providers" => []];
$configChanged = false;

foreach ($specs as $name => $spec) {
    $key = isset($entries[$name]["key"]) && is_string($entries[$name]["key"])
        ? trim($entries[$name]["key"]) : "";
    if ($key === "" || stripos($key, "YOUR-") === 0) {
        $newHealth["providers"][$name] = ["status" => "unknown",
            "checked" => gmdate("Y-m-d\TH:i:s\Z"), "note" => "No key configured."];
        $out .= "$name: no key, skipped. ";
        continue;
    }
    list($resp, $http, $err) = hc_fetch_models($spec["url"], $key);
    if ($http === 401 || $http === 403) {
        // Dead key: exclude from lineup, do NOT touch model IDs (can't verify).
        $newHealth["providers"][$name] = ["status" => "down",
            "checked" => gmdate("Y-m-d\TH:i:s\Z"), "note" => "API key returns HTTP $http."];
        $out .= "$name: DOWN (key HTTP $http). ";
        continue;
    }
    if ($http !== 200) {
        // Transient (timeout/5xx): keep in lineup, mark unknown.
        $newHealth["providers"][$name] = ["status" => "unknown",
            "checked" => gmdate("Y-m-d\TH:i:s\Z"),
            "note" => "Models endpoint HTTP $http" . ($err !== "" ? " ($err)" : "") . "; left in lineup."];
        $out .= "$name: unknown (HTTP $http), kept. ";
        continue;
    }
    $d = json_decode((string)$resp, true);
    $live = [];
    if (isset($d["data"]) && is_array($d["data"])) {
        foreach ($d["data"] as $m) {
            if (is_array($m) && isset($m["id"])) $live[] = (string)$m["id"];
        }
    }
    // Filter audio-only models the way the old groq check did.
    $liveChat = array_values(array_filter($live, function ($id) {
        return stripos($id, "whisper") === false && stripos($id, "tts") === false
            && stripos($id, "audio") === false;
    }));
    $configured = isset($entries[$name]["models"]) && is_array($entries[$name]["models"])
        ? array_values(array_filter(array_map("strval", $entries[$name]["models"]))) : [];
    $dead = [];
    foreach ($configured as $m) {
        if (!in_array($m, $liveChat, true) && !in_array($m, $spec["keep"], true)) $dead[] = $m;
    }
    if (!empty($dead)) {
        $new = [];
        foreach ($spec["prefs"] as $pm) {
            if (in_array($pm, $liveChat, true) || in_array($pm, $spec["keep"], true)) $new[] = $pm;
        }
        foreach (array_diff($configured, $dead) as $survivor) {
            if (!in_array($survivor, $new, true)) $new[] = $survivor;
        }
        foreach ($liveChat as $lm) { if (count($new) >= 2) break; if (!in_array($lm, $new, true)) $new[] = $lm; }
        if (!empty($new)) {
            // Find the provider's index in $cfg["providers"] to rewrite in place.
            foreach ($cfg["providers"] as $i => $p) {
                $nm = is_array($p) && isset($p["name"]) ? strtolower(trim((string)$p["name"]))
                    : (is_string($i) ? strtolower(trim($i)) : "");
                if ($nm === $name) { $cfg["providers"][$i]["models"] = array_values($new); break; }
            }
            $configChanged = true;
            $out .= "$name: retired model(s) " . implode(",", $dead) . " swapped for " . implode(",", $new) . ". ";
            zu_log("models", "Swapped retired $name model(s) " . implode(",", $dead) . " for " . implode(",", $new) . ". Zero healed itself.");
        } else {
            $out .= "$name: retired model(s) " . implode(",", $dead) . " but no replacements found. ";
        }
    } else {
        $out .= "$name: OK (" . count($configured) . " models alive). ";
    }
    $newHealth["providers"][$name] = ["status" => "up",
        "checked" => gmdate("Y-m-d\TH:i:s\Z"),
        "note" => count($configured) . " model(s) verified against live list."];
}

// Pollinations is keyless: a light reachability probe. Never marked down,
// because it is the ultimate fallback; worst case it is "unknown".
$pc = curl_init("https://text.pollinations.ai/");
curl_setopt_array($pc, [CURLOPT_RETURNTRANSFER => true, CURLOPT_NOBODY => true,
    CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 6,
    CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2]);
curl_exec($pc);
$phttp = curl_getinfo($pc, CURLINFO_HTTP_CODE);
curl_close($pc);
if ($phttp >= 200 && $phttp < 500) {
    $newHealth["providers"]["pollinations"] = ["status" => "up",
        "checked" => gmdate("Y-m-d\TH:i:s\Z"), "note" => "Keyless; reachable."];
    $out .= "pollinations: OK. ";
} else {
    $newHealth["providers"]["pollinations"] = ["status" => "unknown",
        "checked" => gmdate("Y-m-d\TH:i:s\Z"), "note" => "Probe failed; kept as fallback."];
    $out .= "pollinations: unknown, kept. ";
}

// Persist config changes (with backup) before writing health.
if ($configChanged) {
    $ts = hc_backup_config($cfgFile);
    $written = file_put_contents($cfgFile, "<?php\nreturn " . var_export($cfg, true) . ";\n");
    $out .= ($written !== false ? "config rewritten (backup ts $ts). " : "ERROR config write failed. ");
}
@file_put_contents($healthFile, json_encode($newHealth, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);

// Log provider up/down transitions so the upgrades ledger tells the story.
foreach ($newHealth["providers"] as $pn => $ps) {
    $old = $prevHealth[$pn] ?? "unknown";
    $cur = $ps["status"];
    if ($old !== $cur) {
        if ($cur === "down") {
            zu_log("models", "Provider $pn went DOWN (" . ($ps["note"] ?? "") . "). Removed from the AI lineup until its key works again.");
        } elseif ($cur === "up" && $old === "down") {
            zu_log("models", "Provider $pn is back UP. Zero healed itself — readmitted to the AI lineup.");
        }
    }
}
hc_log($log, $out . "\n");
echo $out . "Done.\n";
