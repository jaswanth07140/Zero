<?php
// StudyPlus Notes — per-user private notes storage. Requires sign-in.
// POST {action:"list"}                          -> {ok:true, notes:[{id,title,preview,created,updated}]}
// POST {action:"get", id}                       -> {ok:true, note:{id,title,body,summary,created,updated}}
// POST {action:"save", id?, title, body, summary?} -> {ok:true, note:{id,title,preview,created,updated}}
// POST {action:"delete", id}                     -> {ok:true}
// Notes are tied to the account; nobody else can see them. No count cap.
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/guard.php";

$DATA_DIR = __DIR__ . "/sp_data/notes";
$PHP_EXIT = "<?php http_response_code(403); exit; /* studyplus-notes */ ?>\n";
$TITLE_MAX = 200;
$BODY_MAX = 200000;

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

function spn_len($s){ return function_exists("mb_strlen") ? mb_strlen($s) : strlen($s); }
function spn_cut($s, $n){
  if(function_exists("mb_substr")) return mb_substr($s, 0, $n);
  return substr($s, 0, $n);
}
function spn_load($file){
  if(!is_file($file)) return ["notes"=>[]];
  $raw = @file_get_contents($file);
  if($raw === false) return ["notes"=>[]];
  $nl = strpos($raw, "\n");
  $json = ($nl !== false) ? substr($raw, $nl + 1) : $raw;
  $d = json_decode($json, true);
  if(!is_array($d) || !isset($d["notes"]) || !is_array($d["notes"])) return ["notes"=>[]];
  $out = [];
  foreach($d["notes"] as $n){
    if(!is_array($n) || empty($n["id"]) || !is_string($n["id"])) continue;
    $out[] = [
      "id"      => $n["id"],
      "title"   => is_string($n["title"] ?? null) ? $n["title"] : "Untitled note",
      "body"    => is_string($n["body"] ?? null) ? $n["body"] : "",
      "summary" => is_string($n["summary"] ?? null) ? $n["summary"] : "",
      "created" => intval($n["created"] ?? 0),
      "updated" => intval($n["updated"] ?? 0),
    ];
  }
  return ["notes"=>$out];
}
function spn_write($file, $PHP_EXIT, $d){
  @file_put_contents($file, $PHP_EXIT . json_encode($d), LOCK_EX);
}
// Serialize read-modify-write cycles (save/delete) with an explicit lock,
// on top of the LOCK_EX used for the write itself.
function spn_lock($file){
  $h = @fopen($file . ".lock", "c");
  if($h) @flock($h, LOCK_EX);
  return $h;
}
function spn_unlock($h){
  if($h){ @flock($h, LOCK_UN); @fclose($h); }
}
function spn_preview($body){
  $p = trim(preg_replace('/\s+/u', ' ', (string)$body));
  return spn_cut($p, 140);
}
function spn_meta($n){
  return [
    "id"      => $n["id"],
    "title"   => $n["title"],
    "preview" => spn_preview($n["body"]),
    "created" => intval($n["created"]),
    "updated" => intval($n["updated"]),
  ];
}

$method = $_SERVER["REQUEST_METHOD"] ?? "GET";
if($method !== "POST") jout(["error"=>"Use POST."]);
$in = json_decode(file_get_contents("php://input"), true);
if(!is_array($in)) $in = [];
$action = trim($in["action"] ?? "");

if($action === "list"){
  $d = spn_load($file);
  $notes = $d["notes"];
  usort($notes, function($a, $b){ return intval($b["updated"]) <=> intval($a["updated"]); });
  jout(["ok"=>true, "notes"=>array_map("spn_meta", $notes)]);
}

if($action === "get"){
  $id = trim(strval($in["id"] ?? ""));
  if(!preg_match('/^[A-Za-z0-9_-]{1,64}$/', $id)) jout(["error"=>"Bad note id."]);
  $d = spn_load($file);
  foreach($d["notes"] as $n){
    if($n["id"] === $id){
      jout(["ok"=>true, "note"=>[
        "id"      => $n["id"],
        "title"   => $n["title"],
        "body"    => $n["body"],
        "summary" => $n["summary"],
        "created" => intval($n["created"]),
        "updated" => intval($n["updated"]),
      ]]);
    }
  }
  jout(["error"=>"Note not found."]);
}

if($action === "save"){
  $title = trim(strval($in["title"] ?? ""));
  if($title === "") $title = "Untitled note";
  $title = spn_cut($title, $TITLE_MAX);
  $body = strval($in["body"] ?? "");
  if(spn_len($body) > $BODY_MAX) jout(["error"=>"That note is too long — a single note can hold up to 200,000 characters."]);
  $summary = strval($in["summary"] ?? "");
  if(spn_len($summary) > $BODY_MAX) jout(["error"=>"That summary is too long — a single note can hold up to 200,000 characters."]);
  $id = trim(strval($in["id"] ?? ""));
  if($id !== "" && !preg_match('/^[A-Za-z0-9_-]{1,64}$/', $id)) jout(["error"=>"Bad note id."]);

  $lock = spn_lock($file);
  $d = spn_load($file);
  $now = time();
  $saved = null;
  if($id !== ""){
    foreach($d["notes"] as $i => $n){
      if($n["id"] === $id){
        $d["notes"][$i]["title"] = $title;
        $d["notes"][$i]["body"] = $body;
        $d["notes"][$i]["summary"] = $summary;
        $d["notes"][$i]["updated"] = $now;
        $saved = $d["notes"][$i];
        break;
      }
    }
    if($saved === null){ spn_unlock($lock); jout(["error"=>"Note not found."]); }
  } else {
    $saved = [
      "id"      => "n_" . bin2hex(random_bytes(8)),
      "title"   => $title,
      "body"    => $body,
      "summary" => $summary,
      "created" => $now,
      "updated" => $now,
    ];
    array_unshift($d["notes"], $saved);
  }
  spn_write($file, $PHP_EXIT, $d);
  spn_unlock($lock);
  jout(["ok"=>true, "note"=>spn_meta($saved)]);
}

if($action === "delete"){
  $id = trim(strval($in["id"] ?? ""));
  if(!preg_match('/^[A-Za-z0-9_-]{1,64}$/', $id)) jout(["error"=>"Bad note id."]);
  $lock = spn_lock($file);
  $d = spn_load($file);
  $before = count($d["notes"]);
  $d["notes"] = array_values(array_filter($d["notes"], function($n) use ($id){ return $n["id"] !== $id; }));
  if(count($d["notes"]) === $before){ spn_unlock($lock); jout(["error"=>"Note not found."]); }
  spn_write($file, $PHP_EXIT, $d);
  spn_unlock($lock);
  jout(["ok"=>true]);
}

jout(["error"=>"Unknown action."]);
