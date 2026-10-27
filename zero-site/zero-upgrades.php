<?php
// Zero self-upgrade history + OWNER actions (revert / kill / revive).
// GET (public): the upgrade ledger, newest first. No keys, no secrets.
// POST (owner only): requires the owner key. Actions:
//   status -> {offline:bool, backups:[ts,...]}
//   revert -> restore config.php from a backup (param ts; default latest)
//   kill   -> take the whole site offline (creates offline.flag)
//   revive -> bring the site back (removes offline.flag)
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/guard.php";
require __DIR__ . "/zero-upgrades-lib.php";

function zu_owner_key() {
    $f = __DIR__ . "/owner-secret.php";
    if (!is_file($f)) return null;
    $k = @include $f;
    return is_string($k) ? $k : null;
}
function zu_backups() {
    $out = [];
    foreach (glob(__DIR__ . "/config.backup.*.php") ?: [] as $bf) {
        if (preg_match('/config\.backup\.(\d+)\.php$/', $bf, $m)) $out[] = intval($m[1]);
    }
    rsort($out);
    return $out;
}

$method = $_SERVER["REQUEST_METHOD"] ?? "GET";
if ($method === "GET") {
    echo json_encode(["ok" => true, "upgrades" => array_reverse(zu_read(50))]);
    exit;
}
if ($method !== "POST") {
    echo json_encode(["error" => "Use GET or POST."]);
    exit;
}

// ---- owner actions ----
$key = $_POST["key"] ?? "";
$secret = zu_owner_key();
if (!$secret || !is_string($key) || !hash_equals($secret, $key)) {
    http_response_code(403);
    echo json_encode(["error" => "Wrong owner key."]);
    exit;
}
$action = $_POST["action"] ?? "";
if ($action === "status") {
    echo json_encode(["ok" => true, "offline" => is_file(__DIR__ . "/offline.flag"),
        "backups" => zu_backups(), "upgrades" => array_reverse(zu_read(50))]);
    exit;
}
if ($action === "revert") {
    $backs = zu_backups();
    $ts = intval($_POST["ts"] ?? 0);
    if ($ts <= 0) $ts = $backs[0] ?? 0;
    $bf = __DIR__ . "/config.backup." . $ts . ".php";
    if ($ts <= 0 || !is_file($bf)) {
        echo json_encode(["error" => "No backup found."]);
        exit;
    }
    $ok = @copy($bf, __DIR__ . "/config.php");
    if ($ok) zu_log("revert", "Owner reverted the AI lineup to the backup from " . gmdate("Y-m-d H:i", $ts) . " UTC.");
    echo json_encode($ok ? ["ok" => true, "restored" => $ts] : ["error" => "Restore failed."]);
    exit;
}
if ($action === "kill") {
    @file_put_contents(__DIR__ . "/offline.flag", gmdate("c") . "\n");
    zu_log("kill", "Owner stopped the entire website with one click.");
    echo json_encode(["ok" => true, "offline" => true]);
    exit;
}
if ($action === "revive") {
    @unlink(__DIR__ . "/offline.flag");
    zu_log("revive", "Owner brought the website back online.");
    echo json_encode(["ok" => true, "offline" => false]);
    exit;
}
echo json_encode(["error" => "Unknown action."]);
