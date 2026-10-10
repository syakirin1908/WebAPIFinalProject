<?php
// Authentication + role-based access control (RBAC) middleware.
// Other members: call require_auth() / require_role() at the top of your routes.
require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/response.php';

function get_bearer_token(): ?string {
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($h === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) {
            if (strtolower($k) === 'authorization') { $h = $v; break; }
        }
    }
    if (preg_match('/^Bearer\s+(\S+)$/i', $h, $m)) return $m[1];
    return null;
}

// Returns ['id'=>int,'role'=>string,'name'=>string,'email'=>string] or stops with 401.
function require_auth(): array {
    $token = get_bearer_token();
    if (!$token) error_response(401, 'Authentication required. Send header: Authorization: Bearer <token>');
    $claims = jwt_decode($token);
    if (!$claims) error_response(401, 'Invalid or expired token. Please log in again.');
    return [
        'id'    => (int)$claims['sub'],
        'role'  => $claims['role'],
        'name'  => $claims['name'] ?? '',
        'email' => $claims['email'] ?? '',
    ];
}

// Usage: $user = require_role(['admin', 'organiser']);
function require_role(array $roles): array {
    $user = require_auth();
    if (!in_array($user['role'], $roles, true)) {
        error_response(403, 'Forbidden. Your role (' . $user['role'] . ') is not allowed to perform this action.');
    }
    return $user;
}
