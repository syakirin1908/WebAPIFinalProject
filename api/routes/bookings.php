<?php
// Member 5: Bookings Resource Endpoint (/bookings)
// Handled by handle_bookings() dispatched from api/index.php

function handle_bookings(string $method, array $seg, PDO $db): void {
    $auth = require_auth(); // All booking endpoints require JWT authentication
    
    $id = null;
    if (isset($seg[0])) {
        if (!ctype_digit($seg[0]) || (int)$seg[0] < 1) {
            error_response(400, 'Booking ID must be a positive integer.');
        }
        $id = (int)$seg[0];
    }

    switch ($method) {
        case 'GET':
            $id === null ? bookings_list($db, $auth) : bookings_get($db, $id, $auth);
            break;
        case 'POST':
            if ($id !== null) error_response(405, 'POST is not allowed on /bookings/{id}.');
            bookings_create($db, $auth);
            break;
        case 'PUT':
        case 'PATCH':
            if ($id === null) error_response(400, 'Booking ID is required.');
            bookings_update($db, $id, $auth);
            break;
        case 'DELETE':
            if ($id === null) error_response(400, 'Booking ID is required.');
            bookings_delete($db, $id, $auth);
            break;
        default:
            error_response(405, 'Method not allowed.');
    }
}

// GET /bookings
function bookings_list(PDO $db, array $auth): void {
    $page  = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(100, max(1, (int)($_GET['limit'] ?? 10)));
    $offset = ($page - 1) * $limit;

    $where = [];
    $params = [];

    // Customers can ONLY see their own bookings; Admins & Organisers can view all or filter
    if ($auth['role'] === 'customer') {
        $where[] = 'b.user_id = ?';
        $params[] = $auth['id'];
    } elseif (!empty($_GET['user_id'])) {
        $where[] = 'b.user_id = ?';
        $params[] = $_GET['user_id'];
    }

    if (!empty($_GET['event_id'])) {
        $where[] = 'b.event_id = ?';
        $params[] = $_GET['event_id'];
    }

    if (!empty($_GET['status'])) {
        $where[] = 'b.status = ?';
        $params[] = $_GET['status'];
    }

    $sqlWhere = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $stmtCount = $db->prepare("SELECT COUNT(*) FROM bookings b $sqlWhere");
    $stmtCount->execute($params);
    $total = (int)$stmtCount->fetchColumn();

    $sql = "SELECT b.id, b.booking_ref, b.user_id, u.name AS customer_name, u.email AS customer_email,
                   b.event_id, e.title AS event_title, e.event_date, e.start_time,
                   b.quantity, b.total_price, b.status, b.qr_code_url, b.created_at
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN events e ON b.event_id = e.id
            $sqlWhere
            ORDER BY b.id DESC
            LIMIT $limit OFFSET $offset";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    success_response(200, 'Bookings retrieved successfully.', $stmt->fetchAll(PDO::FETCH_ASSOC), [
        'pagination' => [
            'page' => $page, 'limit' => $limit, 'total' => $total,
            'total_pages' => (int)ceil($total / $limit)
        ]
    ]);
}

// GET /bookings/{id}
function bookings_get(PDO $db, int $id, array $auth): void {
    $stmt = $db->prepare("SELECT b.*, u.name AS customer_name, e.title AS event_title, e.event_date 
                          FROM bookings b
                          JOIN users u ON b.user_id = u.id
                          JOIN events e ON b.event_id = e.id
                          WHERE b.id = ?");
    $stmt->execute([$id]);
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$booking) error_response(404, "Booking with ID $id not found.");

    if ($auth['role'] === 'customer' && (int)$booking['user_id'] !== $auth['id']) {
        error_response(403, 'Forbidden. You cannot access another user\'s booking.');
    }

    success_response(200, 'Booking retrieved.', $booking);
}

// POST /bookings (Creates booking & generates external QR code)
function bookings_create(PDO $db, array $auth): void {
    $b = get_json_body();
    $errors = [];

    $eventId = $b['event_id'] ?? null;
    $quantity = $b['quantity'] ?? null;

    if (!is_int($eventId) || $eventId < 1) $errors['event_id'] = 'Valid event_id is required.';
    if (!is_int($quantity) || $quantity < 1) $errors['quantity'] = 'Quantity must be at least 1.';

    if ($errors) error_response(422, 'Validation failed.', $errors);

    // Fetch Event details and verify ticket availability
    $stmt = $db->prepare("SELECT id, title, ticket_price, available_tickets, status FROM events WHERE id = ?");
    $stmt->execute([$eventId]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$event) error_response(404, "Event with ID $eventId not found.");
    if ($event['status'] !== 'published') error_response(400, "Event is not open for booking.");
    if ($event['available_tickets'] < $quantity) {
        error_response(400, "Not enough tickets available. Remaining tickets: " . $event['available_tickets']);
    }

    $userId = $auth['id'];
    $totalPrice = $event['ticket_price'] * $quantity;
    $bookingRef = 'BK-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));

    // Third-party QR Code API Integration
    $qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' . urlencode($bookingRef);

    try {
        $db->beginTransaction();

        // 1. Insert Booking Record
        $stmtInsert = $db->prepare("INSERT INTO bookings (booking_ref, user_id, event_id, quantity, total_price, status, qr_code_url) 
                                    VALUES (?, ?, ?, ?, ?, 'confirmed', ?)");
        $stmtInsert->execute([$bookingRef, $userId, $eventId, $quantity, $totalPrice, $qrCodeUrl]);
        $bookingId = (int)$db->lastInsertId();

        // 2. Deduct Available Tickets from Event
        $stmtUpdate = $db->prepare("UPDATE events SET available_tickets = available_tickets - ? WHERE id = ?");
        $stmtUpdate->execute([$quantity, $eventId]);

        $db->commit();

        bookings_get($db, $bookingId, $auth);
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}

// PUT/PATCH /bookings/{id}
function bookings_update(PDO $db, int $id, array $auth): void {
    $stmt = $db->prepare("SELECT * FROM bookings WHERE id = ?");
    $stmt->execute([$id]);
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$booking) error_response(404, "Booking with ID $id not found.");

    if ($auth['role'] === 'customer' && (int)$booking['user_id'] !== $auth['id']) {
        error_response(403, 'Forbidden. You can only modify your own booking.');
    }

    $b = get_json_body();
    $newStatus = $b['status'] ?? null;

    if (!in_array($newStatus, ['confirmed', 'cancelled', 'pending'], true)) {
        error_response(422, 'Validation failed.', ['status' => 'Status must be confirmed, cancelled, or pending.']);
    }

    try {
        $db->beginTransaction();

        // If cancelling a previously confirmed booking, restore tickets
        if ($booking['status'] !== 'cancelled' && $newStatus === 'cancelled') {
            $stmtRestore = $db->prepare("UPDATE events SET available_tickets = available_tickets + ? WHERE id = ?");
            $stmtRestore->execute([$booking['quantity'], $booking['event_id']]);
        }

        $stmtStatus = $db->prepare("UPDATE bookings SET status = ? WHERE id = ?");
        $stmtStatus->execute([$newStatus, $id]);

        $db->commit();
        bookings_get($db, $id, $auth);
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}

// DELETE /bookings/{id}
function bookings_delete(PDO $db, int $id, array $auth): void {
    require_role(['admin']); // Only Admins can permanently delete a booking entry

    $stmt = $db->prepare("SELECT * FROM bookings WHERE id = ?");
    $stmt->execute([$id]);
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$booking) error_response(404, "Booking with ID $id not found.");

    $stmtDelete = $db->prepare("DELETE FROM bookings WHERE id = ?");
    $stmtDelete->execute([$id]);

    success_response(200, "Booking $id deleted successfully.");
}