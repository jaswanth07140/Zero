<?php
// SchoolAhead auth — username + password sign-up / log in.
// Identity only: school data stays in the browser's localStorage; the server never sees it.
header("Content-Type: application/json");

// same-origin lock (same anchored pattern as canvas-proxy.php: the host must
// be exactly zero.page.gd — a plain prefix check would also accept a lookalike
// host such as zero.page.gd.evil.com, so the match is anchored at ($|/)).
$origin = $_SERVER["HTTP_ORIGIN"] ?? "";
$referer = $_SERVER["HTTP_REFERER"] ?? "";
$ok = false;
foreach ([$origin, $referer] as $v) {
  if ($v && preg_match('#^https://zero\.page\.gd($|/)#', $v)) { $ok = true; break; }
}
if (!$ok) { http_response_code(403); echo json_encode(["error" => "Forbidden"]); exit; }

// per-IP rate limit: 60 req/min
$ip = $_SERVER["REMOTE_ADDR"] ?? "x";
$rlDir = sys_get_temp_dir() . "/sa_rl";
if (!is_dir($rlDir)) @mkdir($rlDir, 0700, true);
$rlFile = $rlDir . "/" . md5($ip) . ".json";
$now = time();
$rl = ["t" => $now, "n" => 0];
if (is_file($rlFile)) {
  $d = json_decode(@file_get_contents($rlFile), true);
  if (is_array($d) && $now - $d["t"] < 60) $rl = $d;
}
$rl["n"]++;
@file_put_contents($rlFile, json_encode($rl));
if ($rl["n"] > 60) { http_response_code(429); echo json_encode(["error" => "Too many requests — slow down."]); exit; }

// storage: PHP-exit prefix so the files can never be fetched via web
$dataDir = __DIR__ . "/sa_data";
if (!is_dir($dataDir)) @mkdir($dataDir, 0700, true);
@file_put_contents($dataDir . "/.htaccess", "Require all denied\n");
$usersFile = $dataDir . "/users.dat.php";
$locksFile = $dataDir . "/locks.dat.php";

function sa_load($f) {
  if (!is_file($f)) return [];
  $raw = @file_get_contents($f);
  $raw = preg_replace('/^<\?php exit; \?>\n?/', '', $raw);
  $u = json_decode($raw, true);
  return is_array($u) ? $u : [];
}
function sa_save($f, $u) {
  $tmp = $f . ".tmp";
  @file_put_contents($tmp, "<?php exit; ?>\n" . json_encode($u), LOCK_EX);
  @rename($tmp, $f);
}
function valid_username($u) { return is_string($u) && preg_match('/^[A-Za-z0-9_.\-]{3,20}$/', $u); }
function valid_name($n) { $n = trim((string)$n); return $n !== "" && strlen($n) <= 50 && preg_match("/^[A-Za-z][A-Za-z'\\- ]{0,48}[A-Za-z'\\-]$/", $n); }
function valid_email($e) { $e = trim((string)$e); return $e !== "" && strlen($e) <= 120 && filter_var($e, FILTER_VALIDATE_EMAIL); }

// ---- sign-ups are open: anyone can create an account (accounts are separate) ----
$SA_SIGNUP_OPEN = true;

// session cookie: 30 days, http-only, same-site
session_set_cookie_params(["lifetime" => 86400 * 30, "path" => "/", "httponly" => true, "samesite" => "Lax", "secure" => !empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off"]);
session_start();

$action = $_GET["action"] ?? "";
$body = json_decode(@file_get_contents("php://input"), true);
if (!is_array($body)) $body = [];

if ($action === "me") {
  $u = !empty($_SESSION["sa_user"]) ? $_SESSION["sa_user"] : null;
  echo json_encode(["user" => $u, "first" => $u ? ($_SESSION["sa_first"] ?? null) : null, "signup_open" => $SA_SIGNUP_OPEN]);
  exit;
}
if ($action === "logout") {
  unset($_SESSION["sa_user"], $_SESSION["sa_first"]);
  session_destroy();
  echo json_encode(["ok" => true]);
  exit;
}
if ($action === "delete") {
  if ($_SERVER["REQUEST_METHOD"] !== "POST") { http_response_code(405); echo json_encode(["error" => "POST only"]); exit; }
  $u = $_SESSION["sa_user"] ?? null;
  if (!$u) { echo json_encode(["error" => "Not signed in."]); exit; }
  $p = $body["password"] ?? "";
  $users = sa_load($usersFile);
  $foundKey = null;
  foreach ($users as $k => $v) { if (strtolower($k) === strtolower($u)) { $foundKey = $k; break; } }
  if ($foundKey === null || empty($users[$foundKey]["hash"]) || !password_verify($p, $users[$foundKey]["hash"])) {
    echo json_encode(["error" => "Wrong password — account not deleted."]); exit;
  }
  unset($users[$foundKey]);
  sa_save($usersFile, $users);
  unset($_SESSION["sa_user"], $_SESSION["sa_first"]);
  session_destroy();
  echo json_encode(["ok" => true]);
  exit;
}
if ($action === "signup" || $action === "login") {
  if ($_SERVER["REQUEST_METHOD"] !== "POST") { http_response_code(405); echo json_encode(["error" => "POST only"]); exit; }
  $u = trim($body["username"] ?? "");
  $p = $body["password"] ?? "";
  if (!valid_username($u)) { echo json_encode(["error" => "Username must be 3–20 characters: letters, numbers, _ . -"]); exit; }
  if (!is_string($p) || strlen($p) < 6 || strlen($p) > 200) { echo json_encode(["error" => "Password must be 6–200 characters."]); exit; }

  $users = sa_load($usersFile);
  $locks = sa_load($locksFile);
  $lk = strtolower($u);
  if (!empty($locks[$lk]["until"]) && $locks[$lk]["until"] > $now) {
    echo json_encode(["error" => "Too many wrong tries — try again in a few minutes."]);
    exit;
  }

  if ($action === "signup") {
    if (!$SA_SIGNUP_OPEN) { echo json_encode(["error" => "Sign-ups are closed — this site is private."]); exit; }
    $first = trim($body["first_name"] ?? "");
    $last = trim($body["last_name"] ?? "");
    $email = trim($body["email"] ?? "");
    if (!valid_name($first)) { echo json_encode(["error" => "Please enter your first name."]); exit; }
    if (!valid_name($last)) { echo json_encode(["error" => "Please enter your last name."]); exit; }
    if (!valid_email($email)) { echo json_encode(["error" => "Please enter a valid email address."]); exit; }
    foreach ($users as $k => $v) {
      if (strtolower($k) === $lk) { echo json_encode(["error" => "That username is taken — try another."]); exit; }
    }
    if (count($users) >= 2000) { echo json_encode(["error" => "User limit reached — try again later."]); exit; }
    $users[$u] = ["hash" => password_hash($p, PASSWORD_DEFAULT), "created" => $now, "first" => $first, "last" => $last, "email" => $email];
    sa_save($usersFile, $users);
    session_regenerate_id(true);
    $_SESSION["sa_user"] = $u;
    $_SESSION["sa_first"] = $first;
    echo json_encode(["ok" => true, "user" => $u, "first" => $first]);
    exit;
  }

  // login
  $foundKey = null; $found = null;
  foreach ($users as $k => $v) {
    if (strtolower($k) === $lk) { $foundKey = $k; $found = $v; break; }
  }
  if (!$found || empty($found["hash"]) || !password_verify($p, $found["hash"])) {
    $n = (isset($locks[$lk]["n"]) ? $locks[$lk]["n"] : 0) + 1;
    $locks[$lk] = ["n" => $n, "until" => $n >= 5 ? $now + 900 : 0];
    sa_save($locksFile, $locks);
    echo json_encode(["error" => "Wrong username or password."]);
    exit;
  }
  unset($locks[$lk]); sa_save($locksFile, $locks);
  if (password_needs_rehash($found["hash"], PASSWORD_DEFAULT)) {
    $users[$foundKey]["hash"] = password_hash($p, PASSWORD_DEFAULT);
    sa_save($usersFile, $users);
  }
  session_regenerate_id(true);
  $_SESSION["sa_user"] = $foundKey;
  $_SESSION["sa_first"] = $found["first"] ?? null;
  echo json_encode(["ok" => true, "user" => $foundKey, "first" => $found["first"] ?? null]);
  exit;
}

http_response_code(400);
echo json_encode(["error" => "Unknown action"]);
