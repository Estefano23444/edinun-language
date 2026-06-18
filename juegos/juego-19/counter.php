<?php
// counter.php — Contador de visitas global por juego (Apache + PHP).
//
//   GET            -> {"count": N}
//   GET ?inc=1     -> incrementa atomicamente y devuelve {"count": N+1}
//
// Endurecido para hosting compartido (edinun.com), tras un incidente en
// produccion (ver MEMORY.md, 2026-06-16):
//
//  * Escribe el archivo de conteo EN LA MISMA CARPETA que counter.php
//    (visits.txt), igual que el contador.php que ya funciona en este
//    servidor. NO crea subcarpetas: muchos hosts permiten escribir
//    archivos pero bloquean mkdir, y un mkdir fallido tumbaba el endpoint.
//  * Suprime TODO warning/notice/deprecation. El body SIEMPRE es JSON puro:
//    un warning impreso antes del JSON rompe JSON.parse en el cliente y el
//    contador "deja de funcionar" aunque el numero sea correcto.
//  * 'c+' crea el archivo si no existe (requiere carpeta escribible). Si la
//    carpeta no deja crear archivos, basta crear a mano visits.txt con 0 y
//    permisos 666 al lado de counter.php.
//  * Si no se puede abrir para escritura, cae a modo SOLO LECTURA y
//    devuelve el conteo actual sin incrementar: el juego nunca se rompe.
//
// En servidores estaticos (GitHub Pages, `python -m http.server`, file://)
// este .php se sirve como texto plano y el cliente cae a localStorage.

error_reporting(0);
ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Access-Control-Allow-Origin: *');

$file = __DIR__ . '/visits.txt';
$increment = isset($_GET['inc']) && $_GET['inc'] === '1';

// Abrir/crear para lectura+escritura sin truncar.
$fp = @fopen($file, 'c+');

if ($fp === false) {
    // No se pudo crear/abrir para escritura -> modo solo lectura.
    $raw = @file_get_contents($file);
    $count = ($raw === false) ? 0 : (int) trim($raw);
    echo json_encode(array('count' => $count));
    exit;
}

@flock($fp, LOCK_EX);
rewind($fp);
$raw = stream_get_contents($fp);
$count = (int) trim((string) $raw);

if ($increment) {
    $count += 1;
    rewind($fp);
    ftruncate($fp, 0);
    fwrite($fp, (string) $count);
    fflush($fp);
}

@flock($fp, LOCK_UN);
fclose($fp);

echo json_encode(array('count' => $count));
