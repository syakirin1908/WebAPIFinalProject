<?php
// Front controller for the shared REST API.
// Base URL (XAMPP):  http://localhost/event-ticketing/api
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/core/response.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/core/auth.php';
require_once __DIR__ . '/core/validator.php';

// ---- CORS (so each member's frontend can call the API) ----
header('Access-Control-Allow-Origin: ' . CORS_ORIGIN);
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ---- Consistent handling of unexpected errors ----
set_exception_handler(function (Throwable $e) {
    error_log($e->getMessage());
    error_response(500, 'Internal server error.');
});

// ---- Work out the path, e.g. /users/5 ----
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = '/' . trim(substr($path, strlen($base)), '/');
$seg  = $path === '/' ? [] : explode('/', trim($path, '/'));

$method   = $_SERVER['REQUEST_METHOD'];
$resource = $seg[0] ?? '';

if ($resource === '') {
    success_response(200, 'Event Ticketing & Venue Booking API is running.', [
        'resources' => ['/auth', '/users', '/events', '/venues', '/bookings'],
    ]);
}

// Each resource lives in routes/<name>.php and defines handle_<name>().
// Member 3 adds routes/events.php, Member 4 routes/venues.php, Member 5 routes/bookings.php.
$allowed = ['auth', 'users', 'events', 'venues', 'bookings'];
$file    = __DIR__ . '/routes/' . $resource . '.php';

if (!in_array($resource, $allowed, true) || !file_exists($file)) {
    error_response(404, "Resource '/$resource' not found.");
}

require_once $file;
$fn = 'handle_' . $resource;
$fn($method, array_slice($seg, 1), db());
