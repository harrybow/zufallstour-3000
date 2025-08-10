<?php
// /api/load.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$user = preg_replace('/[^a-zA-Z0-9_-]/', '', $_GET['user'] ?? '');
if ($user === '') { http_response_code(400); echo json_encode(['error'=>'missing user']); exit; }

$path = __DIR__ . '/data/' . $user . '.json';
if (!file_exists($path)) { echo json_encode(['updatedAt'=>null,'stations'=>[]]); exit; }

readfile($path);
