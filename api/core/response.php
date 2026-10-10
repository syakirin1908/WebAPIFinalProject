<?php
// Consistent JSON format for the whole group:
//   success: { "success": true,  "message": "...", "data": ... }
//   error:   { "success": false, "message": "...", "errors": { field: msg } }

function json_response(int $status, array $body): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function success_response(int $status, string $message, $data = null, array $extra = []): void {
    $body = ['success' => true, 'message' => $message];
    if ($data !== null) $body['data'] = $data;
    json_response($status, array_merge($body, $extra));
}

function error_response(int $status, string $message, array $errors = []): void {
    $body = ['success' => false, 'message' => $message];
    if ($errors) $body['errors'] = $errors;
    json_response($status, $body);
}

function get_json_body(): array {
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        error_response(400, 'Invalid JSON in request body.');
    }
    return $data;
}
