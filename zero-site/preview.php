<?php
// DEPRECATED 2026-10-19: Zero AI "Open in browser" now opens a local blob URL —
// nothing is ever uploaded, so this endpoint writes nothing and returns 410.
// (Old cached frontends fall back to their blob URL automatically.)
require __DIR__ . '/guard.php';
header('Content-Type: application/json');
http_response_code(410);
echo json_encode(['error' => 'gone', 'note' => 'previews now open as local blob URLs; no server storage']);
