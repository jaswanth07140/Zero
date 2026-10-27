<?php
// ZeroTube backend (fallback when the browser can't reach Piped/Invidious directly).
// Tries Piped API server-side first, then YouTube scrape. NO server storage:
// every request is fetched live; nothing is cached on disk.
// GET ?q=... -> {"videos":[{id,title,thumbnail,duration,author,views,isShort}],"cached":false}
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/guard.php";
if ($_SERVER["REQUEST_METHOD"] !== "GET") { echo json_encode(["error"=>"Use GET."]); exit; }

$q = isset($_GET["q"]) ? trim($_GET["q"]) : "";
if ($q === "") { echo json_encode(["videos"=>[]]); exit; }
$q = mb_substr($q, 0, 100);

function zt_fetch($url, $timeout=10) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER=>true, CURLOPT_FOLLOWLOCATION=>true,
        CURLOPT_TIMEOUT=>$timeout, CURLOPT_CONNECTTIMEOUT=>5,
        CURLOPT_USERAGENT=>"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        CURLOPT_HTTPHEADER=>["Accept: application/json,text/html;q=0.9", "Accept-Language: en-US,en;q=0.9"],
        CURLOPT_SSL_VERIFYPEER=>false, CURLOPT_ENCODING=>"",
    ]);
    $r = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ($code >= 200 && $code < 400 && $r) ? $r : false;
}
function zt_text($runs) {
    if (!is_array($runs)) return "";
    $t = "";
    foreach ($runs as $r) { $t .= $r["text"] ?? ""; }
    return trim(preg_replace('/\s+/', ' ', $t));
}
function zt_vid($id, $title, $thumb, $dur, $author, $views, $isShort=false) {
    return ["id"=>$id,"title"=>$title,"thumbnail"=>$thumb,"duration"=>$dur,
            "author"=>$author,"views"=>$views,"isShort"=>$isShort];
}

$videos = [];

// --- 1) Piped API (free, no key) ---
$pj = zt_fetch("https://api.piped.private.coffee/search?q=" . urlencode($q) . "&filter=videos");
if ($pj && ($pd = json_decode($pj, true)) && isset($pd["items"])) {
    foreach ($pd["items"] as $it) {
        if (($it["type"] ?? "") !== "stream") continue;
        $id = "";
        if (preg_match('/v=([A-Za-z0-9_-]{11})/', $it["url"] ?? "", $m)) $id = $m[1];
        if (!$id) continue;
        $dur = intval($it["duration"] ?? 0);
        $vws = $it["views"] ?? 0;
        $videos[] = zt_vid($id, $it["title"] ?? "Untitled",
            "https://i.ytimg.com/vi/$id/hqdefault.jpg",
            $dur ? floor($dur/60) . ":" . str_pad($dur%60, 2, "0", STR_PAD_LEFT) : "",
            $it["uploaderName"] ?? "",
            $vws ? ($vws >= 1e6 ? round($vws/1e6,1)."M views" : ($vws >= 1e3 ? round($vws/1e3,1)."K views" : $vws." views")) : "",
            $dur > 0 && $dur <= 62);
        if (count($videos) >= 30) break;
    }
}

// --- 2) YouTube scrape fallback ---
if (!$videos) {
    $html = zt_fetch("https://www.youtube.com/results?search_query=" . urlencode($q) . "&sp=EgIQAQ%253D%253D", 12);
    if ($html && preg_match('/var ytInitialData = (\{.*?\});\s*<\/script>/s', $html, $m)) {
        $data = json_decode($m[1], true);
        if (is_array($data)) {
            $sections = $data["contents"]["twoColumnSearchResultsRenderer"]["primaryContents"]["sectionListRenderer"]["contents"] ?? [];
            foreach ($sections as $s) {
                $items = $s["itemSectionRenderer"]["contents"] ?? [];
                foreach ($items as $it) {
                    $vr = $it["videoRenderer"] ?? null;
                    if (!$vr || empty($vr["videoId"])) continue;
                    $vid = $vr["videoId"];
                    $dur = $vr["lengthText"]["simpleText"] ?? "";
                    $isShort = false;
                    if (preg_match('/^(\d+):(\d+)$/', $dur, $dm)) {
                        $secs = intval($dm[1]) * 60 + intval($dm[2]);
                        if ($secs <= 61) $isShort = true;
                    } elseif (preg_match('/^0:(\d+)$/', $dur)) { $isShort = true; }
                    $videos[] = zt_vid($vid, zt_text($vr["title"]["runs"] ?? []),
                        "https://i.ytimg.com/vi/$vid/hqdefault.jpg", $dur,
                        zt_text($vr["ownerText"]["runs"] ?? []),
                        $vr["viewCountText"]["simpleText"] ?? "", $isShort);
                    if (count($videos) >= 30) break 2;
                }
            }
        }
    }
}

$out = ["videos"=>$videos, "cached"=>false];
// no disk writes — zero server storage
echo json_encode($out);
