<?php
// StudyPlus Progress — per-user private progress storage. Requires sign-in.
// GET  ?action=load -> {history:[], topics:[]}
// POST {action:"save", history:[], topics:[]} -> {ok:true}
// Progress is tied to the account; nobody else can see it.
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/guard.php";

$DATA_DIR = __DIR__ . "/sp_data/progress";
$PHP_EXIT = "<?php http_response_code(403); exit; /* studyplus-progress */ ?>\n";

function jout($a){ echo json_encode($a); exit; }

$secure = (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off");
session_set_cookie_params([
  "lifetime" => 60*60*24*30, "path" => "/", "domain" => "",
  "secure" => $secure, "httponly" => true, "samesite" => "Lax"
]);
if(session_status() !== PHP_SESSION_ACTIVE) @session_start();

$uid = $_SESSION["spuid"] ?? "";
$username = $_SESSION["spuser"] ?? "";
if(!$uid || !$username) jout(["error"=>"Sign in required."]);

// sanitize uid to a safe filename
$uidSafe = preg_replace('/[^A-Za-z0-9_]/', '', $uid);
if($uidSafe === "" || $uidSafe !== $uid) jout(["error"=>"Bad session."]);

if(!is_dir($DATA_DIR)) @mkdir($DATA_DIR, 0700, true);
$file = $DATA_DIR . "/" . $uidSafe . ".dat.php";

function load_progress($file, $PHP_EXIT){
  if(!is_file($file)) return ["history"=>[], "topics"=>[]];
  $raw = @file_get_contents($file);
  if($raw === false) return ["history"=>[], "topics"=>[]];
  $nl = strpos($raw, "\n");
  $json = ($nl !== false) ? substr($raw, $nl + 1) : $raw;
  $d = json_decode($json, true);
  if(!is_array($d)) return ["history"=>[], "topics"=>[]];
  return [
    "history" => array_slice(is_array($d["history"]??null) ? $d["history"] : [], 0, 60),
    "topics"  => array_slice(is_array($d["topics"]??null) ? $d["topics"] : [], 0, 30),
  ];
}

$method = $_SERVER["REQUEST_METHOD"] ?? "GET";
if($method === "GET" && (($_GET["action"] ?? "") === "load")){
  jout(load_progress($file, $PHP_EXIT) + ["ok"=>true]);
}

if($method === "POST"){
  $in = json_decode(file_get_contents("php://input"), true);
  if(!is_array($in)) $in = [];
  if(($in["action"] ?? "") !== "save") jout(["error"=>"Unknown action."]);
  $history = is_array($in["history"] ?? null) ? array_slice($in["history"], 0, 60) : [];
  $topics  = is_array($in["topics"] ?? null) ? array_slice($in["topics"], 0, 30) : [];
  // light sanitization: keep only expected fields, cap string lengths
  $cleanH = [];
  foreach($history as $h){
    if(!is_array($h)) continue;
    $cleanH[] = [
      "kind"  => in_array($h["kind"]??"", ["quiz","test"], true) ? $h["kind"] : "quiz",
      "topic" => substr(strval($h["topic"]??""), 0, 120),
      "score" => intval($h["score"]??0),
      "n"     => intval($h["n"]??0),
      "pct"   => max(0, min(100, intval($h["pct"]??0))),
      "at"    => intval($h["at"]??0),
    ];
  }
  $cleanT = [];
  foreach($topics as $t){ if(is_string($t) && $t!=="") $cleanT[] = substr($t, 0, 120); }
  @file_put_contents($file, $PHP_EXIT . json_encode(["history"=>$cleanH, "topics"=>array_values(array_unique($cleanT))]), LOCK_EX);
  jout(["ok"=>true]);
}

jout(["error"=>"Use GET?action=load or POST action=save."]);
