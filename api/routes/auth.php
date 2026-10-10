<?php
// POST /auth/register   (public)  -> creates a CUSTOMER account
// POST /auth/login      (public)  -> returns JWT
// GET  /auth/me         (token)   -> current user profile

function handle_auth(string $method, array $seg, PDO $db): void {
    $action = $seg[0] ?? '';

    if ($action === 'register' && $method === 'POST') { auth_register($db); return; }
    if ($action === 'login'    && $method === 'POST') { auth_login($db);    return; }
    if ($action === 'me'       && $method === 'GET')  { auth_me($db);       return; }

    error_response(404, 'Auth endpoint not found. Use /auth/register, /auth/login or /auth/me.');
}

function auth_register(PDO $db): void {
    $b = get_json_body();
    $errors = array_filter([
        'name'     => v_name($b['name'] ?? null),
        'email'    => v_email($b['email'] ?? null),
        'password' => v_password($b['password'] ?? null),
        'phone'    => v_phone($b['phone'] ?? null),
    ]);
    if ($errors) error_response(422, 'Validation failed.', $errors);

    $email = strtolower(trim($b['email']));
    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) error_response(409, 'Email is already registered.', ['email' => 'Email is already registered.']);

    // Public registration can only create customers (prevents privilege escalation).
    $stmt = $db->prepare('INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, "customer", ?)');
    $stmt->execute([trim($b['name']), $email, password_hash($b['password'], PASSWORD_BCRYPT), $b['phone'] ?? null]);

    success_response(201, 'Registration successful.', user_by_id($db, (int)$db->lastInsertId()));
}

function auth_login(PDO $db): void {
    $b = get_json_body();
    $errors = array_filter([
        'email'    => v_email($b['email'] ?? null),
        'password' => (!isset($b['password']) || $b['password'] === '') ? 'Password is required.' : null,
    ]);
    if ($errors) error_response(422, 'Validation failed.', $errors);

    $stmt = $db->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([strtolower(trim($b['email']))]);
    $user = $stmt->fetch();

    // Same message for unknown email and wrong password (does not reveal which one failed).
    if (!$user || !password_verify($b['password'], $user['password_hash'])) {
        error_response(401, 'Invalid email or password.');
    }

    $token = jwt_encode([
        'sub'   => (int)$user['id'],
        'role'  => $user['role'],
        'name'  => $user['name'],
        'email' => $user['email'],
    ]);

    unset($user['password_hash']);
    success_response(200, 'Login successful.', [
        'token'      => $token,
        'token_type' => 'Bearer',
        'expires_in' => JWT_TTL,
        'user'       => $user,
    ]);
}

function auth_me(PDO $db): void {
    $auth = require_auth();
    $user = user_by_id($db, $auth['id']);
    if (!$user) error_response(404, 'User no longer exists.');
    success_response(200, 'Current user.', $user);
}

// Shared helper: fetch a user WITHOUT the password hash.
function user_by_id(PDO $db, int $id): ?array {
    $stmt = $db->prepare('SELECT id, name, email, role, phone, created_at, updated_at FROM users WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}
