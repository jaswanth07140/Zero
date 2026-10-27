<?php
// StudyPlus Accounts — username + password sign-in. Private per-user progress.
// POST {action:"register"|"login"|"logout", username, password}
// GET  ?action=me  -> {logged_in, username}
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/guard.php";

$DATA_DIR  = __DIR__ . "/sp_data";
$DATA_FILE = $DATA_DIR . "/users.dat.php";
$PHP_EXIT  = "<?php http_response_code(403); exit; /* studyplus-auth data */ ?>\n";

function jout($a){ echo json_encode($a); exit; }

function sp_load_users(){
  global $DATA_FILE, $PHP_EXIT;
  if(!is_dir(dirname($DATA_FILE))) @mkdir(dirname($DATA_FILE), 0700, true);
  if(!is_file($DATA_FILE)){ @file_put_contents($DATA_FILE, $PHP_EXIT . json_encode(["users"=>[]]), LOCK_EX); }
  $raw = @file_get_contents($DATA_FILE);
  if($raw === false) return ["users"=>[]];
  $nl = strpos($raw, "\n");
  $json = ($nl !== false) ? substr($raw, $nl + 1) : $raw;
  $d = json_decode($json, true);
  if(!is_array($d) || !isset($d["users"]) || !is_array($d["users"])) return ["users"=>[]];
  return $d;
}
function sp_save_users($d){
  global $DATA_FILE, $PHP_EXIT;
  @file_put_contents($DATA_FILE, $PHP_EXIT . json_encode($d), LOCK_EX);
}
function sp_valid_username($u){
  return is_string($u) && preg_match('/^[A-Za-z0-9_]{3,20}$/', $u);
}
function sp_valid_password($p){
  return is_string($p) && strlen($p) >= 6 && strlen($p) <= 128;
}
function sp_find_user($d, $username){
  foreach($d["users"] as $i => $u){
    if(strcasecmp($u["username"], $username) === 0) return $i;
  }
  return -1;
}
function sp_session(){
  $secure = (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off");
  session_set_cookie_params([
    "lifetime" => 60*60*24*30, "path" => "/", "domain" => "",
    "secure" => $secure, "httponly" => true, "samesite" => "Lax"
  ]);
  if(session_status() !== PHP_SESSION_ACTIVE) @session_start();
}

$method = $_SERVER["REQUEST_METHOD"] ?? "GET";

if($method === "GET" && (($_GET["action"] ?? "") === "me")){
  sp_session();
  if(!empty($_SESSION["spuser"])){
    jout(["logged_in"=>true, "username"=>$_SESSION["spuser"]]);
  }
  jout(["logged_in"=>false]);
}

if($method !== "POST") jout(["error"=>"Use POST."]);
$input = json_decode(file_get_contents("php://input"), true);
if(!is_array($input)) $input = [];
$action = trim($input["action"] ?? "");

if($action === "logout"){
  sp_session();
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
  if(!sp_valid_username($username)) jout(["error"=>"Username must be 3-20 characters: letters, numbers, underscores."]);
  if(!sp_valid_password($password)) jout(["error"=>"Password must be at least 6 characters."]);

  $d = sp_load_users();
  $idx = sp_find_user($d, $username);

  if($action === "register"){
    if($idx !== -1) jout(["error"=>"That username is taken."]);
    if(count($d["users"]) >= 2000) jout(["error"=>"Account creation is paused (limit reached)."]);
    $uid = "sp_" . bin2hex(random_bytes(8));
    $d["users"][] = [
      "id"       => $uid,
      "username" => $username,
      "hash"     => password_hash($password, PASSWORD_DEFAULT),
      "created"  => time(),
      "failed"   => 0,
      "locked_until" => 0
    ];
    sp_save_users($d);
    sp_session();
    @session_regenerate_id(true);
    $_SESSION["spuser"] = $username;
    $_SESSION["spuid"] = $uid;
    jout(["ok"=>true, "username"=>$username]);
  }

  if($idx === -1){ jout(["error"=>"Wrong username or password."]); }
  $u =& $d["users"][$idx];
  $now = time();
  if(!empty($u["locked_until"]) && $u["locked_until"] > $now){
    jout(["error"=>"Too many tries. Try again in a few minutes."]);
  }
  if(!password_verify($password, $u["hash"])){
    $u["failed"] = intval($u["failed"] ?? 0) + 1;
    if($u["failed"] >= 5){ $u["locked_until"] = $now + 900; $u["failed"] = 0; }
    sp_save_users($d);
    jout(["error"=>"Wrong username or password."]);
  }
  $u["failed"] = 0; $u["locked_until"] = 0;
  // backfill id for older accounts
  if(empty($u["id"])){ $u["id"] = "sp_" . bin2hex(random_bytes(8)); }
  sp_save_users($d);
  sp_session();
  @session_regenerate_id(true);
  $_SESSION["spuser"] = $u["username"];
  $_SESSION["spuid"] = $u["id"];
  jout(["ok"=>true, "username"=>$u["username"]]);
}

jout(["error"=>"Unknown action."]);
