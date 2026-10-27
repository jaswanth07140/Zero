<?php
/* Zero Message relay — free Zero-to-Zero messaging. No signup, no keys.
   POST action=send {from,to,text} | GET action=fetch&user=ZM-..&since=.. */
header('Content-Type: application/json; charset=utf-8');
// Hardened: guard.php locks CORS to zero.page.gd, validates Origin/Referer,
// adds per-IP rate limiting on top of the built-in send/fetch limits.
require __DIR__ . "/guard.php";

$DATA_DIR = __DIR__ . '/zm_data';
$DATA_FILE = $DATA_DIR . '/messages.dat.php';
$RL_DIR = sys_get_temp_dir() . '/zm_rl';

// ---------- helpers ----------
function jout($a){ echo json_encode($a); exit; }
function valid_id($s){ return is_string($s) && preg_match('/^[A-Za-z0-9-]{3,24}$/', $s); }
function rate($key, $max, $window){
  global $RL_DIR;
  if(!is_dir($RL_DIR)) @mkdir($RL_DIR, 0700, true);
  $f = $RL_DIR . '/' . preg_replace('/[^a-z0-9_-]/i','_', $key) . '.json';
  $now = time(); $hits = array();
  if(is_file($f)){ $hits = json_decode(@file_get_contents($f), true); if(!is_array($hits)) $hits = array(); }
  $hits = array_values(array_filter($hits, function($t) use($now,$window){ return ($now - $t) < $window; }));
  if(count($hits) >= $max) return false;
  $hits[] = $now;
  @file_put_contents($f, json_encode($hits));
  return true;
}
function data_lines(){
  global $DATA_FILE;
  if(!is_file($DATA_FILE)) return array();
  $lines = @file($DATA_FILE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
  if(!$lines) return array();
  if(isset($lines[0]) && strpos($lines[0], '<?php') === 0) array_shift($lines);
  return $lines;
}

$ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'x';
$action = isset($_REQUEST['action']) ? $_REQUEST['action'] : '';

if($action === 'send' && $_SERVER['REQUEST_METHOD'] === 'POST'){
  if(!rate('send_'.$ip, 30, 60)) jout(array('ok'=>false,'error'=>'slow down'));
  $from = isset($_POST['from']) ? trim($_POST['from']) : '';
  $to   = isset($_POST['to']) ? trim($_POST['to']) : '';
  $text = isset($_POST['text']) ? $_POST['text'] : '';
  if(!valid_id($from) || !valid_id($to)) jout(array('ok'=>false,'error'=>'bad id'));
  if($from === $to) jout(array('ok'=>false,'error'=>'bad id'));
  $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', (string)$text);
  $text = mb_substr($text, 0, 1000, 'UTF-8');
  if(mb_strlen($text,'UTF-8') < 1) jout(array('ok'=>false,'error'=>'empty'));
  if(!is_dir($DATA_DIR)) @mkdir($DATA_DIR, 0755, true);
  $msg = array('id'=>bin2hex(random_bytes(8)), 'from'=>$from, 'to'=>$to, 'text'=>$text, 't'=>time());
  $line = json_encode($msg, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  $fp = @fopen($DATA_FILE, 'a');
  if(!$fp) jout(array('ok'=>false,'error'=>'store'));
  if(flock($fp, LOCK_EX)){
    if(filesize($DATA_FILE) == 0) fwrite($fp, "<?php http_response_code(403); exit; ?>\n");
    fwrite($fp, $line . "\n");
    flock($fp, LOCK_UN);
  }
  fclose($fp);
  // prune: keep last 3000 messages, drop anything older than 7 days
  $cut = time() - 7*24*3600;
  $lines = array_values(array_filter(data_lines(), function($ln) use($cut){
    $m = json_decode($ln, true);
    return $m && isset($m['t']) && $m['t'] >= $cut;
  }));
  if(count($lines) > 3000) $lines = array_slice($lines, -3000);
  @file_put_contents($DATA_FILE, "<?php http_response_code(403); exit; ?>\n" . implode("\n", $lines) . ($lines ? "\n" : ""));
  jout(array('ok'=>true,'t'=>$msg['t'],'id'=>$msg['id']));
}

if($action === 'fetch'){
  if(!rate('fetch_'.$ip, 90, 60)) jout(array('ok'=>false,'error'=>'slow down'));
  $user = isset($_GET['user']) ? trim($_GET['user']) : '';
  $since = isset($_GET['since']) ? intval($_GET['since']) : 0;
  if(!valid_id($user)) jout(array('ok'=>false,'error'=>'bad id'));
  $out = array();
  foreach(data_lines() as $ln){
    $m = json_decode($ln, true);
    if(!$m || !isset($m['to'],$m['t'])) continue;
    if($m['to'] === $user && $m['t'] > $since){ $out[] = $m; if(count($out) >= 100) break; }
  }
  jout(array('ok'=>true,'messages'=>$out));
}

jout(array('ok'=>false,'error'=>'bad action'));
