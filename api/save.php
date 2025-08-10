<?php
// /api/save.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *'); // ggf. auf deine Domain einschränken
header('Access-Control-Allow-Methods: POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$token = $_GET['token'] ?? '';
$user  = preg_replace('/[^a-zA-Z0-9_-]/', '', $_GET['user'] ?? '');
if ($token === '' || $user === '') { http_response_code(400); echo json_encode(['error'=>'missing token/user']); exit; }

// Sehr primitive Auth (shared secret pro User)
$envToken = getenv('ZUFALLSTOUR_TOKEN_'.$user) ?: ''; // besser per .htaccess SetEnv
if ($envToken === '' || !hash_equals($envToken, $token)) { http_response_code(403); echo json_encode(['error'=>'forbidden']); exit; }

// Payload lesen
$raw = file_get_contents('php://input');
if (!$raw) { http_response_code(400); echo json_encode(['error'=>'empty body']); exit; }

// Minimal-Validierung (muss JSON-Array sein)
$data = json_decode($raw, true);
if (!is_array($data)) { http_response_code(400); echo json_encode(['error'=>'invalid json']); exit; }

$dir = __DIR__ . '/data';
@mkdir($dir, 0770, true);
$path = $dir . '/' . $user . '.json.tmp';
$final= $dir . '/' . $user . '.json';

// atomar schreiben
if (file_put_contents($path, json_encode(['updatedAt'=>gmdate('c'),'stations'=>$data], JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE)) === false) {
  http_response_code(500); echo json_encode(['error'=>'write failed']); exit;
}
rename($path, $final);
echo json_encode(['ok'=>true]);
