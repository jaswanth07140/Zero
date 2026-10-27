<?php
// Zero Search v2: multi-source web search. One source per request.
ob_start();
// GET ?source=...&q=...
// "auto" mode tries KEYLESS sources first (ddgapi, wikiapi, wikipedia, bing,
// mojeek) since they work from shared hosting; keyed APIs (searchapi, tavily)
// are last-resort fallbacks. Marginalia removed 2026-10-20 (dead endpoint).
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/guard.php";
// Accept GET (legacy) and POST (preferred: POST sends an Origin header so the
// guard can verify same-origin requests; plain GET carries no Origin).
$method = $_SERVER["REQUEST_METHOD"] ?? "GET";
$source = ""; $q = "";
if ($method === "POST") {
    $body = json_decode(@file_get_contents("php://input"), true);
    if (is_array($body)) {
        $source = trim($body["source"] ?? "");
        $q = trim($body["q"] ?? "");
    }
} else {
    $source = isset($_GET["source"]) ? trim($_GET["source"]) : "";
    $q = isset($_GET["q"]) ? trim($_GET["q"]) : "";
}
if ($q === "" || $source === "") { echo json_encode(["results"=>[]]); exit; }

$cfg = include __DIR__ . "/config.php";
$tavilyKey = isset($cfg["tavily_key"]) ? trim($cfg["tavily_key"]) : "";
$results = [];

function fetch_url($url, $timeout=10) {
    // Rotate user-agents so a single blocked UA doesn't kill every request.
    static $uas = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
        "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
    ];
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_FOLLOWLOCATION=>true,
        CURLOPT_TIMEOUT=>$timeout, CURLOPT_CONNECTTIMEOUT=>5,
        CURLOPT_USERAGENT=>$uas[array_rand($uas)],
        CURLOPT_HTTPHEADER=>["Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language: en-US,en;q=0.9"],
        CURLOPT_SSL_VERIFYPEER=>true, CURLOPT_SSL_VERIFYHOST=>2, CURLOPT_ENCODING=>""]);
    $r = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $ok = ($code >= 200 && $code < 400);
    return $ok ? $r : false;
}
function clean($t){ return trim(preg_replace('/\s+/', ' ', strip_tags(html_entity_decode($t ?? "")))); }
// UTF-8-safe truncation: substr() cuts bytes and can split a multibyte
// character, producing invalid UTF-8 that makes json_encode() return false
// (empty response). Falls back to substr() where mbstring is unavailable.
function ztrunc($t,$n){ return function_exists("mb_substr") ? mb_substr($t,0,$n,"UTF-8") : substr($t,0,$n); }

// Run a single source and append to $results. Used directly and by "auto" mode.
function run_one_source($src, $q, &$results, $cfg, $tavilyKey) {
switch ($src) {
    case "tavily":
        if ($tavilyKey !== "") {
            $ch = curl_init("https://api.tavily.com/search");
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_POST=>true,
                CURLOPT_POSTFIELDS=>json_encode(["api_key"=>$tavilyKey,"query"=>$q,"max_results"=>8,"include_answer"=>false,"search_depth"=>"basic"]),
                CURLOPT_HTTPHEADER=>["Content-Type: application/json"], CURLOPT_TIMEOUT=>8]);
            $sr = curl_exec($ch); curl_close($ch);
            $sd = json_decode($sr, true);
            if (isset($sd["results"]) && is_array($sd["results"])) {
                foreach (array_slice($sd["results"],0,10) as $r) {
                    if (empty($r["url"])) continue;
                    $results[] = ["title"=>clean($r["title"]??$r["url"]), "url"=>$r["url"],
                        "snippet"=>ztrunc(clean($r["content"]??""),220), "source"=>"Tavily"];
                }
            }
        }
        break;

    case "wikipedia":
        $api = "https://en.wikipedia.org/w/api.php?action=opensearch&search=".urlencode($q)."&limit=6&format=json";
        $r = fetch_url($api);
        $d = json_decode($r, true);
        if (is_array($d) && isset($d[1], $d[3])) {
            foreach ($d[1] as $i => $title) {
                if (empty($d[3][$i] ?? "")) continue;
                $results[] = ["title"=>clean($title), "url"=>$d[3][$i],
                    "snippet"=>ztrunc(clean($d[2][$i]??""),220), "source"=>"Wikipedia"];
            }
        }
        break;

    case "bing":
        $html = fetch_url("https://www.bing.com/search?q=".urlencode($q)."&format=rss");
        if ($html) {
            preg_match_all('/<item>.*?<title>(.*?)<\/title>.*?<link>(.*?)<\/link>.*?<description>(.*?)<\/description>.*?<\/item>/s', $html, $m, PREG_SET_ORDER);
            foreach (array_slice($m,0,8) as $x) {
                $results[] = ["title"=>clean($x[1]), "url"=>trim($x[2]),
                    "snippet"=>ztrunc(clean($x[3]),220), "source"=>"Bing"];
            }
        }
        // Fallback: HTML scrape if RSS empty
        if (count($results) < 3) {
            $html2 = fetch_url("https://www.bing.com/search?q=".urlencode($q));
            if ($html2) {
                preg_match_all('/<h2[^>]*><a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a><\/h2>/s', $html2, $m2, PREG_SET_ORDER);
                foreach (array_slice($m2,0,8) as $x) {
                    $u = $x[1];
                    if (strpos($u,"http")!==0 || strpos($u,"bing.com")!==false) continue;
                    $dup=false; foreach($results as $r) if($r["url"]===$u) $dup=true;
                    if(!$dup) $results[] = ["title"=>clean($x[2]), "url"=>$u, "snippet"=>"", "source"=>"Bing"];
                }
            }
        }
        break;

    case "brave":
        $bkey = isset($cfg["brave_key"]) ? trim($cfg["brave_key"]) : "";
        if ($bkey !== "") {
            $ch = curl_init("https://api.search.brave.com/res/v1/web/search?q=".urlencode($q)."&count=8");
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>8,
                CURLOPT_HTTPHEADER=>["X-Subscription-Token: ".$bkey, "Accept: application/json"]]);
            $sr = curl_exec($ch); curl_close($ch);
            $sd = json_decode($sr, true);
            if (isset($sd["web"]["results"])) {
                foreach (array_slice($sd["web"]["results"],0,8) as $r) {
                    if (empty($r["url"])) continue;
                    $results[] = ["title"=>clean($r["title"]??$r["url"]), "url"=>$r["url"],
                        "snippet"=>ztrunc(clean($r["description"]??""),220), "source"=>"Brave"];
                }
            }
        }
        break;

    case "serper":
        $skey = isset($cfg["serper_key"]) ? trim($cfg["serper_key"]) : "";
        if ($skey !== "") {
            $ch = curl_init("https://google.serper.dev/search");
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_POST=>true,
                CURLOPT_POSTFIELDS=>json_encode(["q"=>$q,"num"=>8]),
                CURLOPT_HTTPHEADER=>["X-API-KEY: ".$skey, "Content-Type: application/json"], CURLOPT_TIMEOUT=>8]);
            $sr = curl_exec($ch); curl_close($ch);
            $sd = json_decode($sr, true);
            if (isset($sd["organic"]) && is_array($sd["organic"])) {
                foreach (array_slice($sd["organic"],0,8) as $r) {
                    if (empty($r["link"])) continue;
                    $results[] = ["title"=>clean($r["title"]??$r["link"]), "url"=>$r["link"],
                        "snippet"=>ztrunc(clean($r["snippet"]??""),220), "source"=>"Serper"];
                }
            }
        }
        break;

    case "searchapi":
        $sakey = isset($cfg["searchapi_key"]) ? trim($cfg["searchapi_key"]) : "";
        if ($sakey !== "") {
            $sr = fetch_url("https://www.searchapi.io/api/v1/search?engine=google&q=".urlencode($q)."&api_key=".urlencode($sakey)."&num=8", 8);
            $sd = json_decode($sr, true);
            if (isset($sd["organic_results"]) && is_array($sd["organic_results"])) {
                foreach (array_slice($sd["organic_results"],0,8) as $r) {
                    if (empty($r["link"])) continue;
                    $results[] = ["title"=>clean($r["title"]??$r["link"]), "url"=>$r["link"],
                        "snippet"=>ztrunc(clean($r["snippet"]??""),220), "source"=>"SearchAPI"];
                }
            }
        }
        break;

    case "bingapi":
        $bakey = isset($cfg["bingapi_key"]) ? trim($cfg["bingapi_key"]) : "";
        if ($bakey !== "") {
            $ch = curl_init("https://api.bing.microsoft.com/v7.0/search?q=".urlencode($q)."&count=8&mkt=en-US");
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>8,
                CURLOPT_HTTPHEADER=>["Ocp-Apim-Subscription-Key: ".$bakey, "Accept: application/json"]]);
            $sr = curl_exec($ch); curl_close($ch);
            $sd = json_decode($sr, true);
            if (isset($sd["webPages"]["value"]) && is_array($sd["webPages"]["value"])) {
                foreach (array_slice($sd["webPages"]["value"],0,8) as $r) {
                    if (empty($r["url"])) continue;
                    $results[] = ["title"=>clean($r["name"]??$r["url"]), "url"=>$r["url"],
                        "snippet"=>ztrunc(clean($r["snippet"]??""),220), "source"=>"BingAPI"];
                }
            }
        }
        break;
    case "mojeek":
        // Mojeek independent search engine — free, no key, bot-tolerant.
        // Generic anchor parser (works across markup variants): keep absolute
        // http(s) links only, drop mojeek-internal links and nav chrome.
        $mjHtml = fetch_url("https://www.mojeek.com/search?q=".urlencode($q));
        if ($mjHtml) {
            preg_match_all('/<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>(.*?)<\/a>/si', $mjHtml, $mjM, PREG_SET_ORDER);
            foreach ($mjM as $x) {
                $u = html_entity_decode(trim($x[1]));
                if (strpos($u,"http")!==0 || stripos($u,"mojeek.com")!==false) continue;
                $t = clean($x[2]); if (strlen($t)<8) continue;
                $tl = strtolower($t);
                if (preg_match('/^(home|search|images|news|blogs|settings|preferences|privacy|terms|about|help|login|sign in|contact)$/', $tl)) continue;
                $dup=false; foreach($results as $r) if($r["url"]===$u) $dup=true;
                if(!$dup) $results[] = ["title"=>$t, "url"=>$u, "snippet"=>"", "source"=>"Mojeek"];
                if (count($results) >= 8) break;
            }
        }
        break;

    case "ddgapi":
        // DuckDuckGo Instant Answer API — free, no key
        $ddgUrl = "https://api.duckduckgo.com/?q=" . urlencode($q) . "&format=json&no_html=1&skip_disambig=1";
        $ddgResp = fetch_url($ddgUrl, 10);
        if ($ddgResp) {
            $ddgData = json_decode($ddgResp, true);
            if (!empty($ddgData["AbstractURL"])) {
                $results[] = ["title"=>clean($ddgData["Heading"]??$q), "url"=>$ddgData["AbstractURL"],
                    "snippet"=>ztrunc(clean($ddgData["AbstractText"]??""),220), "source"=>"DuckDuckGo"];
            }
            if (isset($ddgData["RelatedTopics"]) && is_array($ddgData["RelatedTopics"])) {
                foreach (array_slice($ddgData["RelatedTopics"], 0, 6) as $rt) {
                    if (!empty($rt["FirstURL"]) && !empty($rt["Text"])) {
                        $results[] = ["title"=>clean(ztrunc($rt["Text"],80)), "url"=>$rt["FirstURL"],
                            "snippet"=>ztrunc(clean($rt["Text"]),220), "source"=>"DuckDuckGo"];
                    }
                }
            }
        }
        break;
    case "wikiapi":
        // Wikipedia Action API — free, no key, better than scraping
        $wikiUrl = "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" . urlencode($q) .
            "&format=json&srlimit=8&srprop=snippet";
        $wikiResp = fetch_url($wikiUrl, 10);
        if ($wikiResp) {
            $wikiData = json_decode($wikiResp, true);
            if (isset($wikiData["query"]["search"]) && is_array($wikiData["query"]["search"])) {
                foreach ($wikiData["query"]["search"] as $r) {
                    $pageUrl = "https://en.wikipedia.org/wiki/" . rawurlencode(str_replace(" ", "_", $r["title"]));
                    $results[] = ["title"=>clean($r["title"]), "url"=>$pageUrl,
                        "snippet"=>ztrunc(clean($r["snippet"]??""),220), "source"=>"Wikipedia"];
                }
            }
        }
        break;
}

} // end run_one_source

if ($source === "auto") {
    // Keyless sources first (reliable from shared hosting); keyed APIs last.
    // (Tavily key is dead; searchapi_key may be too — both are fallbacks only.)
    $tried = [];
    foreach (["ddgapi","wikiapi","wikipedia","bing","mojeek","searchapi","tavily"] as $s) {
        $before = count($results);
        run_one_source($s, $q, $results, $cfg, $tavilyKey);
        $tried[] = $s . ":" . (count($results) - $before);
        if (count($results) >= 8) break;
    }
} else {
    run_one_source($source, $q, $results, $cfg, $tavilyKey);
}

ob_end_clean();
// Premium pass: drop near-duplicate titles across sources (sources run in
// priority order, so the first occurrence wins). Conservative: only exact
// normalized-title matches are removed.
$seen = [];
$deduped = [];
foreach ($results as $r) {
    $nt = strtolower(preg_replace('/[^a-z0-9]/', '', $r["title"] ?? ""));
    if ($nt !== "" && isset($seen[$nt])) continue;
    if ($nt !== "") $seen[$nt] = true;
    $deduped[] = $r;
}
$results = $deduped;
$out = ["results"=>$results, "source"=>$source, "count"=>count($results)];
// Never silently return empty: if "auto" tried everything and got nothing,
// say exactly what each source yielded so the next diagnosis isn't a guess.
if ($source === "auto" && count($results) === 0 && !empty($tried)) {
    $out["debug"] = ["tried"=>$tried];
}
echo json_encode($out);
