<?php
// ZeroDrive backend: simple file storage (no login yet - single user)
// GET ?action=list -> {"files":[{name,size,mtime}]}
// POST action=upload (multipart) -> {"ok":true,"file":{...}}
// GET ?action=download&name=... -> file download
// POST action=delete&name=... -> {"ok":true}
header("Content-Type: application/json; charset=utf-8");
require __DIR__ . "/guard.php";

$driveDir = __DIR__ . "/zerodrive_files";
if (!is_dir($driveDir)) {
    @mkdir($driveDir, 0755, true);
}
// Hardened .htaccess for the storage dir, self-healing: rewritten whenever
// it differs, so the protections can't silently go missing.
//  - No directory listing, no PHP/script execution, direct access to
//    executable types denied outright.
//  - Anti-XSS: HTML/SVG/XML are NEVER rendered inline from storage - they
//    are forced to download, so a malicious upload can't run scripts in a
//    victim's browser via a direct link.
$zdHtaccess =
    "Options -Indexes\n" .
    "php_flag engine off\n" .
    "RemoveHandler .php .phtml .php3 .php4 .php5 .php7 .phar .cgi .pl .py .rb .jsp\n" .
    "RemoveType .php .phtml .php3 .php4 .php5 .php7 .phar .cgi .pl .py .rb .jsp\n" .
    "Header set X-Content-Type-Options \"nosniff\"\n" .
    "<FilesMatch \"\\.(php\\d*|phtml|phar|htaccess|cgi|pl|py|rb|jsp|jspx|asp|aspx|cfm|sh|exe|bat|cmd|com|scr|msi|ps1|vbs)$\">\n" .
    "    Require all denied\n" .
    "</FilesMatch>\n" .
    "<FilesMatch \"\\.(html?|xhtml|svg|xml)$\">\n" .
    "    ForceType application/octet-stream\n" .
    "    Header set Content-Disposition \"attachment\"\n" .
    "</FilesMatch>\n";
if (!is_file($driveDir . "/.htaccess") || @file_get_contents($driveDir . "/.htaccess") !== $zdHtaccess) {
    @file_put_contents($driveDir . "/.htaccess", $zdHtaccess);
}

$action = $_REQUEST["action"] ?? "list";

if ($action === "list" && $_SERVER["REQUEST_METHOD"] === "GET") {
    $files = [];
    foreach (glob($driveDir . "/*") as $f) {
        if (is_file($f)) {
            $files[] = [
                "name" => basename($f),
                "size" => filesize($f),
                "mtime" => filemtime($f),
            ];
        }
    }
    usort($files, function($a,$b){ return $b["mtime"] - $a["mtime"]; });
    echo json_encode(["files" => $files]);
    exit;
}

if ($action === "upload" && $_SERVER["REQUEST_METHOD"] === "POST") {
    if (empty($_FILES["file"]) || $_FILES["file"]["error"] !== UPLOAD_ERR_OK) {
        echo json_encode(["ok" => false, "error" => "No file uploaded"]);
        exit;
    }
    $name = basename($_FILES["file"]["name"]);
    // Sanitize filename
    $name = preg_replace("/[^a-zA-Z0-9._-]/", "_", $name);
    if ($name === "" || $name === "." || $name === "..") {
        echo json_encode(["ok" => false, "error" => "Invalid filename"]);
        exit;
    }
    // Block executable file types for security (extension + embedded-extension checks
    // to stop double-extension bypasses like shell.php.txt)
    $blocked_ext = ["php", "php3", "php4", "php5", "php7", "php8", "pht", "phps", "phtml",
        "phar", "htaccess", "shtml", "shtm", "cgi", "pl", "py", "rb", "jsp", "jspx",
        "asp", "aspx", "cfm", "sh", "exe", "bat", "cmd", "com", "scr", "msi",
        "ps1", "vbs", "vbe", "jnlp", "jar", "war", "dll"];
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    if (in_array($ext, $blocked_ext)) {
        echo json_encode(["ok" => false, "error" => "File type not allowed"]);
        exit;
    }
    if (preg_match("/\\.(php\\d*|pht|phps|phtml|phar|shtml?|cgi|p[ly]|rb|jspx?|as[px]|cfm|htaccess)/i", $name)) {
        echo json_encode(["ok" => false, "error" => "File type not allowed"]);
        exit;
    }
    // Content scan: reject files hiding PHP code behind an innocent extension
    // (e.g. shell.txt containing <?php). The storage .htaccess already kills
    // the PHP engine, this is a second lock on the door.
    $peek = @file_get_contents($_FILES["file"]["tmp_name"], false, null, 0, 200000);
    if ($peek !== false && preg_match("/<\\?(php|=)/i", $peek)) {
        echo json_encode(["ok" => false, "error" => "File type not allowed"]);
        exit;
    }
    // 50MB max per file
    if ($_FILES["file"]["size"] > 50 * 1024 * 1024) {
        echo json_encode(["ok" => false, "error" => "File too large (max 50MB)"]);
        exit;
    }
    $dest = $driveDir . "/" . $name;
    // Avoid overwrite: append number if exists
    $i = 1;
    $base = pathinfo($name, PATHINFO_FILENAME);
    $ext = pathinfo($name, PATHINFO_EXTENSION);
    while (file_exists($dest)) {
        $name = $base . "_" . $i . ($ext ? "." . $ext : "");
        $dest = $driveDir . "/" . $name;
        $i++;
    }
    if (move_uploaded_file($_FILES["file"]["tmp_name"], $dest)) {
        echo json_encode(["ok" => true, "file" => [
            "name" => $name, "size" => filesize($dest), "mtime" => filemtime($dest)
        ]]);
    } else {
        echo json_encode(["ok" => false, "error" => "Upload failed"]);
    }
    exit;
}

if ($action === "delete" && $_SERVER["REQUEST_METHOD"] === "POST") {
    $name = basename($_POST["name"] ?? "");
    $name = preg_replace("/[^a-zA-Z0-9._-]/", "_", $name);
    $f = $driveDir . "/" . $name;
    if ($name && is_file($f)) {
        unlink($f);
        echo json_encode(["ok" => true]);
    } else {
        echo json_encode(["ok" => false, "error" => "File not found"]);
    }
    exit;
}

if ($action === "download" && $_SERVER["REQUEST_METHOD"] === "GET") {
    $name = basename($_GET["name"] ?? "");
    $name = preg_replace("/[^a-zA-Z0-9._-]/", "_", $name);
    $f = $driveDir . "/" . $name;
    if ($name && is_file($f)) {
        header("Content-Type: application/octet-stream");
        header("Content-Disposition: attachment; filename=\"" . $name . "\"");
        header("Content-Length: " . filesize($f));
        // Override JSON content type
        header_remove("Content-Type");
        header("Content-Type: application/octet-stream");
        readfile($f);
        exit;
    }
    http_response_code(404);
    echo json_encode(["error" => "File not found"]);
    exit;
}

echo json_encode(["error" => "Invalid action"]);
