<?php
/* Mega Book Collection. Emite el ZIP completo desde partes inferiores a 12 MB.
   Compatible con PHP 7.1+; conserva la URL original del boton Download ZIP. */
$directory = __DIR__ . '/site-download-parts';
$files = glob($directory . '/MegaBookCollection-Website.zip.part[0-9][0-9][0-9]');
if (!$files) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Copia ZIP no disponible. Genera y sube site-download-parts/.';
    exit;
}
sort($files, SORT_STRING);
$total = 0;
foreach ($files as $file) {
    if (!is_file($file) || !is_readable($file)) {
        http_response_code(503);
        exit('Una parte de la copia no esta disponible.');
    }
    $total += filesize($file);
}
if ($total <= 0) {
    http_response_code(503);
    exit('El archivo esta vacio.');
}
$start = 0;
$end = $total - 1;
$partial = false;
if (!empty($_SERVER['HTTP_RANGE'])) {
    if (!preg_match('/^bytes=(\d*)-(\d*)$/', trim($_SERVER['HTTP_RANGE']), $m)) {
        header('Content-Range: bytes */' . $total, true, 416);
        exit;
    }
    if ($m[1] === '' && $m[2] === '') {
        header('Content-Range: bytes */' . $total, true, 416);
        exit;
    }
    if ($m[1] === '') {
        $length = intval($m[2]);
        $start = max(0, $total - $length);
    } else {
        $start = intval($m[1]);
        if ($m[2] !== '') $end = intval($m[2]);
    }
    if ($start >= $total || $end < $start) {
        header('Content-Range: bytes */' . $total, true, 416);
        exit;
    }
    $end = min($total - 1, $end);
    $partial = true;
}
if ($partial) {
    http_response_code(206);
    header('Content-Range: bytes ' . $start . '-' . $end . '/' . $total);
}
header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="MegaBookCollection-Website.zip"');
header('Accept-Ranges: bytes');
header('Content-Length: ' . ($end - $start + 1));
header('X-Content-Type-Options: nosniff');
header('Cache-Control: public, max-age=3600');
if ($_SERVER['REQUEST_METHOD'] === 'HEAD') exit;
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    exit;
}
while (ob_get_level() > 0) @ob_end_clean();
$offset = 0;
foreach ($files as $file) {
    $length = filesize($file);
    $fileStart = $offset;
    $fileEnd = $offset + $length - 1;
    $offset += $length;
    if ($fileEnd < $start || $fileStart > $end) continue;
    $seek = max(0, $start - $fileStart);
    $read = min($length - $seek, $end - max($start, $fileStart) + 1);
    $handle = fopen($file, 'rb');
    if (!$handle) exit;
    fseek($handle, $seek);
    while ($read > 0 && !feof($handle)) {
        $piece = fread($handle, min(65536, $read));
        if ($piece === false || $piece === '') break;
        echo $piece;
        $read -= strlen($piece);
        flush();
    }
    fclose($handle);
}
