<?php
require_once __DIR__ . '/../config/config.php';

function b64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
function b64url_decode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/'));
}

// Create a signed HS256 token
function jwt_encode(array $claims): string {
    $header  = b64url_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $now     = time();
    $payload = b64url_encode(json_encode($claims + ['iat' => $now, 'exp' => $now + JWT_TTL]));
    $sig     = b64url_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    return "$header.$payload.$sig";
}

// Verify signature + expiry. Returns claims or null.
function jwt_decode(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$header, $payload, $sig] = $parts;

    $expected = b64url_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    if (!hash_equals($expected, $sig)) return null;

    $claims = json_decode(b64url_decode($payload), true);
    if (!is_array($claims) || !isset($claims['exp']) || $claims['exp'] < time()) return null;
    return $claims;
}
