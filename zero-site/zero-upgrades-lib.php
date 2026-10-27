<?php
// Zero self-upgrade ledger — shared append/read helpers.
// Every self-upgrade Zero performs (model swaps, lineup refreshes, system notes)
// is recorded here so viewers can see Zero upgrading itself over time.
// Append-only, capped at 50 entries, file-locked writes.
function zu_log($kind, $detail) {
    $f = __DIR__ . "/zero-upgrades.json";
    $list = [];
    if (is_file($f)) {
        $d = json_decode(@file_get_contents($f), true);
        if (is_array($d)) $list = $d;
    }
    $list[] = [
        "ts" => time(),
        "kind" => substr(strval($kind), 0, 24),
        "detail" => mb_substr(strval($detail), 0, 280),
    ];
    if (count($list) > 50) $list = array_slice($list, -50);
    @file_put_contents($f, json_encode($list, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
}
function zu_read($n = 50) {
    $f = __DIR__ . "/zero-upgrades.json";
    if (!is_file($f)) return [];
    $d = json_decode(@file_get_contents($f), true);
    if (!is_array($d)) return [];
    return array_values(array_slice($d, max(0, count($d) - intval($n))));
}
