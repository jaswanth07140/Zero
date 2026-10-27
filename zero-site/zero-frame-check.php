<?php
// Zero frame check: does a URL allow itself to be embedded in an iframe?
// POST {"url":"https://..."} -> {"embeddable":true/false,"reason":"..."}
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/guard.php";

$body = json_decode(@file_get_contents("php://input"), true);
$url = is_array($body) ? trim($body["url"] ?? "") : "";
if (!preg_match('#^https?://#i', $url)) {
    echo json_encode(["embeddable" => true, "reason" => "bad-url"]);
    exit;
}
$host = parse_url($url, PHP_URL_HOST);
if (!$host) {
    echo json_encode(["embeddable" => true, "reason" => "no-host"]);
    exit;
}
// SSRF guard: never fetch private/internal hosts
$ip = @gethostbyname($host);
if ($ip === $host || filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
    echo json_encode(["embeddable" => false, "reason" => "private-host"]);
    exit;
}

@ini_set("default_socket_timeout", 8);
$headers = @get_headers($url, 1);
$embeddable = true;
$reason = "";
if (is_array($headers)) {
    foreach ($headers as $k => $v) {
        if (!is_string($k)) continue;
        $lk = strtolower($k);
        $vals = is_array($v) ? $v : [$v];
        foreach ($vals as $val) {
            $val = (string)$val;
            if ($lk === "x-frame-options" && preg_match('/deny|sameorigin/i', $val)) {
                $embeddable = false;
                $reason = "x-frame-options: " . substr($val, 0, 60);
            }
            if ($lk === "content-security-policy" && stripos($val, "frame-ancestors") !== false) {
                // frame-ancestors without a wildcard blocks embedding here
                if (!preg_match('/frame-ancestors[^;]*\*/', $val)) {
                    $embeddable = false;
                    $reason = "csp frame-ancestors";
                }
            }
        }
    }
}
echo json_encode(["embeddable" => $embeddable, "reason" => $reason]);
