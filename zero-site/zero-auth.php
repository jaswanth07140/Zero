<?php
// Zero Accounts — username + password sign-in for Zero apps (no Google needed).
// POST {action:"register"|"login"|"logout", username, password}
// GET  ?action=me  -> {logged_in, username}
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/guard.php";

$DATA_DIR  = __DIR__ . "/za_data";
$DATA_FILE = $DATA_DIR . "/users.dat.php";
$PHP_EXIT  = "<?php http_response_code(403); exit; /* zero-auth data */ ?>\n";

function jout($a){ echo json_encode($a); exit; }

function load_users(){
  global $DATA_FILE, $PHP_EXIT;
  if(!is_dir(dirname($DATA_FILE))) @mkdir(dirname($DATA_FILE), 0700, true);
  if(!is_file($DATA_FILE)){ @file_put_contents($DATA_FILE, $PHP_EXIT . json_encode(["users"=>[]]), LOCK_EX); }
  $raw = @file_get_contents($DATA_FILE);
  if($raw === false) return ["users"=>[]];
  // strip the PHP-exit prefix line
  $nl = strpos($raw, "\n");
  $json = ($nl !== false) ? substr($raw, $nl + 1) : $raw;
  $d = json_decode($json, true);
  if(!is_array($d) || !isset($d["users"]) || !is_array($d["users"])) return ["users"=>[]];
  return $d;
}
function save_users($d){
  global $DATA_FILE, $PHP_EXIT;
  @file_put_contents($DATA_FILE, $PHP_EXIT . json_encode($d), LOCK_EX);
}
function valid_username($u){
  return is_string($u) && preg_match('/^[A-Za-z0-9_]{3,20}$/', $u);
}
function valid_password($p){
  return is_string($p) && strlen($p) >= 6 && strlen($p) <= 128;
}
function find_user($d, $username){
  foreach($d["users"] as $i => $u){
    if(strcasecmp($u["username"], $username) === 0) return $i;
  }
  return -1;
}
function start_zero_session(){
  // Harden session cookie
  $secure = (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off");
  session_set_cookie_params([
    "lifetime" => 60*60*24*30, "path" => "/", "domain" => "",
    "secure" => $secure, "httponly" => true, "samesite" => "Lax"
  ]);
  if(session_status() !== PHP_SESSION_ACTIVE) @session_start();
}

$method = $_SERVER["REQUEST_METHOD"] ?? "GET";

if($method === "GET" && (($_GET["action"] ?? "") === "me")){
  start_zero_session();
  if(!empty($_SESSION["zuser"])){
    jout(["logged_in"=>true, "username"=>$_SESSION["zuser"]]);
  }
  jout(["logged_in"=>false]);
}

if($method !== "POST") jout(["error"=>"Use POST."]);
$input = json_decode(file_get_contents("php://input"), true);
if(!is_array($input)) $input = [];
$action = trim($input["action"] ?? "");

if($action === "logout"){
  start_zero_session();
  $_SESSION = [];
  if(ini_get("session.use_cookies")){
    $p = session_get_cookie_params();
    setcookie(session_name(), "", time()-42000, $p["path"], $p["domain"], $p["secure"], $p["httponly"]);
  }
  @session_destroy();
  jout(["ok"=>true]);
}

if($action === "register" || $action === "login"){
  $username = trim($input["username"] ?? "");
  $password = $input["password"] ?? "";
  if(!valid_username($username)) jout(["error"=>"Username must be 3-20 characters: letters, numbers, underscores."]);
  if(!valid_password($password)) jout(["error"=>"Password must be at least 6 characters."]);

  $d = load_users();
  $idx = find_user($d, $username);

  if($action === "register"){
    if($idx !== -1) jout(["error"=>"That username is taken."]);
    // simple anti-spam: max 2000 accounts on free hosting
    if(count($d["users"]) >= 2000) jout(["error"=>"Account creation is paused (limit reached)."]);
    $d["users"][] = [
      "id"       => "zu_" . bin2hex(random_bytes(8)),
      "username" => $username,
      "hash"     => password_hash($password, PASSWORD_DEFAULT),
      "created"  => time(),
      "failed"   => 0,
      "locked_until" => 0
    ];
    save_users($d);
    start_zero_session();
    @session_regenerate_id(true);
    $_SESSION["zuser"] = $username;
    jout(["ok"=>true, "username"=>$username]);
  }

  // login
  if($idx === -1){ jout(["error"=>"Wrong username or password."]); }
  $u =& $d["users"][$idx];
  $now = time();
  if(!empty($u["locked_until"]) && $u["locked_until"] > $now){
    jout(["error"=>"Too many tries. Try again in a few minutes."]);
  }
  if(!password_verify($password, $u["hash"])){
    $u["failed"] = intval($u["failed"] ?? 0) + 1;
    if($u["failed"] >= 5){ $u["locked_until"] = $now + 900; $u["failed"] = 0; }
    save_users($d);
    jout(["error"=>"Wrong username or password."]);
  }
  $u["failed"] = 0; $u["locked_until"] = 0;
  save_users($d);
  start_zero_session();
  @session_regenerate_id(true);
  $_SESSION["zuser"] = $u["username"];
  jout(["ok"=>true, "username"=>$u["username"]]);
}

jout(["error"=>"Unknown action."]);
