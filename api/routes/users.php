<?php
// Users resource (CRUD)
//   GET    /users            admin only      list (pagination + search + role filter)
//   GET    /users/{id}       admin or self   view one
//   POST   /users            admin only      create (any role)
//   PUT    /users/{id}       admin or self   update (only admin may change role)
//   DELETE /users/{id}       admin only      delete (not yourself)

require_once __DIR__ . '/auth.php'; // for user_by_id()

function handle_users(string $method, array $seg, PDO $db): void {
    $id = null;
    if (isset($seg[0])) {
        if (!ctype_digit($seg[0]) || (int)$seg[0] < 1) error_response(400, 'User ID must be a positive integer.');
        $id = (int)$seg[0];
    }

    switch ($method) {
        case 'GET':    $id === null ? users_list($db) : users_get($db, $id);   break;
        case 'POST':   $id === null ? users_create($db) : error_response(405, 'POST is not allowed on /users/{id}.'); break;
        case 'PUT':
        case 'PATCH':  $id === null ? error_response(400, 'User ID is required.') : users_update($db, $id); break;
        case 'DELETE': $id === null ? error_response(400, 'User ID is required.') : users_delete($db, $id); break;
        default:       error_response(405, 'Method not allowed.');
    }
}

function users_list(PDO $db): void {
    require_role(['admin']);

    $page  = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(100, max(1, (int)($_GET['limit'] ?? 10)));
    $offset = ($page - 1) * $limit;

    $where = []; $params = [];
    if (!empty($_GET['search'])) {
        $where[] = '(name LIKE ? OR email LIKE ?)';
        $like = '%' . $_GET['search'] . '%';
        array_push($params, $like, $like);
    }
    if (!empty($_GET['role'])) {
        if (v_role($_GET['role'])) error_response(422, 'Validation failed.', ['role' => v_role($_GET['role'])]);
        $where[] = 'role = ?';
        $params[] = $_GET['role'];
    }
    $sqlWhere = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $stmt = $db->prepare("SELECT COUNT(*) FROM users $sqlWhere");
    $stmt->execute($params);
    $total = (int)$stmt->fetchColumn();

    $stmt = $db->prepare("SELECT id, name, email, role, phone, created_at, updated_at
                          FROM users $sqlWhere ORDER BY id ASC LIMIT $limit OFFSET $offset");
    $stmt->execute($params);

    success_response(200, 'Users retrieved.', $stmt->fetchAll(), [
        'pagination' => [
            'page' => $page, 'limit' => $limit, 'total' => $total,
            'total_pages' => (int)ceil($total / $limit),
        ],
    ]);
}

function users_get(PDO $db, int $id): void {
    $auth = require_auth();
    if ($auth['role'] !== 'admin' && $auth['id'] !== $id) {
        error_response(403, 'Forbidden. You can only view your own profile.');
    }
    $user = user_by_id($db, $id);
    if (!$user) error_response(404, "User with ID $id not found.");
    success_response(200, 'User retrieved.', $user);
}

function users_create(PDO $db): void {
    require_role(['admin']);
    $b = get_json_body();

    $errors = array_filter([
        'name'     => v_name($b['name'] ?? null),
        'email'    => v_email($b['email'] ?? null),
        'password' => v_password($b['password'] ?? null),
        'role'     => v_role($b['role'] ?? 'customer'),
        'phone'    => v_phone($b['phone'] ?? null),
    ]);
    if ($errors) error_response(422, 'Validation failed.', $errors);

    $email = strtolower(trim($b['email']));
    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) error_response(409, 'Email is already registered.', ['email' => 'Email is already registered.']);

    $stmt = $db->prepare('INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([
        trim($b['name']), $email, password_hash($b['password'], PASSWORD_BCRYPT),
        $b['role'] ?? 'customer', $b['phone'] ?? null,
    ]);
    success_response(201, 'User created.', user_by_id($db, (int)$db->lastInsertId()));
}

function users_update(PDO $db, int $id): void {
    $auth    = require_auth();
    $isAdmin = $auth['role'] === 'admin';
    if (!$isAdmin && $auth['id'] !== $id) {
        error_response(403, 'Forbidden. You can only update your own profile.');
    }
    if (!user_by_id($db, $id)) error_response(404, "User with ID $id not found.");

    $b = get_json_body();
    if (!$b) error_response(400, 'Request body is empty. Send at least one field to update.');

    // Only admins may change role. Non-admins sending "role" get a clear 403.
    if (array_key_exists('role', $b) && !$isAdmin) {
        error_response(403, 'Forbidden. Only an administrator can change a role.');
    }
    // Stop an admin from locking themselves out.
    if (array_key_exists('role', $b) && $auth['id'] === $id && $b['role'] !== 'admin') {
        error_response(400, 'You cannot remove your own admin role.');
    }

    $errors = []; $sets = []; $params = [];
    if (array_key_exists('name', $b))     { if ($e = v_name($b['name']))         $errors['name'] = $e;     else { $sets[] = 'name = ?';          $params[] = trim($b['name']); } }
    if (array_key_exists('email', $b))    { if ($e = v_email($b['email']))       $errors['email'] = $e;    else { $sets[] = 'email = ?';         $params[] = strtolower(trim($b['email'])); } }
    if (array_key_exists('password', $b)) { if ($e = v_password($b['password'])) $errors['password'] = $e; else { $sets[] = 'password_hash = ?'; $params[] = password_hash($b['password'], PASSWORD_BCRYPT); } }
    if (array_key_exists('phone', $b))    { if ($e = v_phone($b['phone']))       $errors['phone'] = $e;    else { $sets[] = 'phone = ?';         $params[] = ($b['phone'] === '' ? null : $b['phone']); } }
    if (array_key_exists('role', $b))     { if ($e = v_role($b['role']))         $errors['role'] = $e;     else { $sets[] = 'role = ?';          $params[] = $b['role']; } }

    if ($errors) error_response(422, 'Validation failed.', $errors);
    if (!$sets)  error_response(400, 'No valid fields to update. Allowed: name, email, password, phone, role (admin only).');

    if (isset($b['email'])) {
        $stmt = $db->prepare('SELECT id FROM users WHERE email = ? AND id <> ?');
        $stmt->execute([strtolower(trim($b['email'])), $id]);
        if ($stmt->fetch()) error_response(409, 'Email is already used by another account.', ['email' => 'Email is already used by another account.']);
    }

    $params[] = $id;
    $db->prepare('UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
    success_response(200, 'User updated.', user_by_id($db, $id));
}

function users_delete(PDO $db, int $id): void {
    $auth = require_role(['admin']);
    if ($auth['id'] === $id) error_response(400, 'You cannot delete your own account.');
    if (!user_by_id($db, $id)) error_response(404, "User with ID $id not found.");

    try {
        $db->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
    } catch (PDOException $e) {
        // FK RESTRICT: user still owns events or bookings
        if ($e->getCode() === '23000') {
            error_response(409, 'Cannot delete this user because they still have events or bookings.');
        }
        throw $e;
    }
    success_response(200, "User $id deleted.");
}
