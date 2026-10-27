<?php
// DISABLED: This endpoint was a critical security risk (public file read/write).
// It has been permanently disabled. Owner-only editing requires proper authentication
// which is not implemented. Do not re-enable without adding session-based auth.
http_response_code(403);
header('Content-Type: application/json');
echo json_encode(['error' => 'This endpoint is disabled for security.']);
