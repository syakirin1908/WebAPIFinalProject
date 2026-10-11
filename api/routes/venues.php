<?php
// Member 4: Retrieve venues.

function handle_venues(string $method, array $seg, PDO $db): void
{
    require_auth();

    // GET /venues/{id}/availability
    if (count($seg) === 2 && $seg[1] === 'availability') {
        if ($method !== 'GET') {
            error_response(405, 'Method not allowed.');
            return;
        }

        if (!ctype_digit($seg[0]) || (int)$seg[0] < 1) {
            error_response(400, 'Venue ID must be a positive integer.');
            return;
        }

        venues_availability($db, (int)$seg[0]);
        return;
    }

    if (count($seg) > 1) {
        error_response(404, 'Endpoint not found.');
        return;
    }

    // POST /venues: create a venue.
    if ($method === 'POST') {
        if (isset($seg[0])) {
            error_response(405, 'POST is not allowed on /venues/{id}.');
            return;
        }

        require_role(['admin', 'organiser']);
        venues_create($db);
        return;
    }

    // Update venue.
    if ($method === 'PUT' || $method === 'PATCH') {
    require_role(['admin', 'organiser']);

    if (!isset($seg[0]) || !ctype_digit($seg[0]) || (int)$seg[0] < 1) {
        error_response(400, 'Venue ID must be a positive integer.');
        return;
    }

    venues_update($db, (int)$seg[0]);
    return;
    }

    // Delete venue.
    if ($method === 'DELETE') {
        require_role(['admin']);

        if (!isset($seg[0]) || !ctype_digit($seg[0]) || (int)$seg[0] < 1) {
            error_response(400, 'Venue ID must be a positive integer.');
            return;
        }

        venues_delete($db, (int)$seg[0]);
        return;
    }
    
    if ($method !== 'GET') {
        error_response(405, 'Method not allowed.');
        return;
    }

    // GET /venues
    if (!isset($seg[0])) {
        $stmt = $db->prepare(
            'SELECT id, name, address, city, capacity,
                    price_per_day, status, created_at, updated_at
             FROM venues ORDER BY id ASC'
        );
        $stmt->execute();

        success_response(
            200,
            'Venues retrieved.',
            $stmt->fetchAll(PDO::FETCH_ASSOC)
        );
        return;
    }

    // Validate ID.
    if (!ctype_digit($seg[0]) || (int)$seg[0] < 1) {
        error_response(400, 'Venue ID must be a positive integer.');
        return;
    }

    // GET /venues/{id}
    $id = (int)$seg[0];

    $stmt = $db->prepare(
        'SELECT id, name, address, city, capacity,
                price_per_day, status, created_at, updated_at
         FROM venues WHERE id = ?'
    );
    $stmt->execute([$id]);

    $venue = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$venue) {
        error_response(404, "Venue with ID $id not found.");
        return;
    }

    success_response(200, 'Venue retrieved.', $venue);
}

function venues_create(PDO $db): void
{
    $b = get_json_body();
    $errors = [];

    // Required text fields and database length limits.
    $textFields = [
        'name' => 150,
        'address' => 255,
        'city' => 100,
    ];

    foreach ($textFields as $field => $maxLength) {
        $value = $b[$field] ?? null;

        if (!is_string($value) || trim($value) === '') {
            $errors[$field] = "$field is required and must be text.";
        } elseif (mb_strlen(trim($value), 'UTF-8') > $maxLength) {
            $errors[$field] = "$field must not exceed $maxLength characters.";
        }
    }

    $capacity = $b['capacity'] ?? null;

    if (!is_int($capacity) || $capacity < 1 || $capacity > 4294967295) {
        $errors['capacity'] = 'Capacity must be a positive integer within the database range.';
    }

    // Accept a number or decimal string with at most two decimal places.
    $price = $b['price_per_day'] ?? 0;

    if (
        !(is_int($price) || is_float($price) || is_string($price))
        || !preg_match('/^\d{1,8}(\.\d{1,2})?$/D', (string)$price)
    ) {
        $errors['price_per_day'] =
            'Price must be between 0 and 99999999.99, with at most two decimal places.';
    }

    $status = $b['status'] ?? 'available';

    if (!in_array($status, ['available', 'unavailable', 'maintenance'], true)) {
        $errors['status'] =
            'Status must be available, unavailable or maintenance.';
    }

    if ($errors) {
        error_response(422, 'Validation failed.', $errors);
        return;
    }

    $stmt = $db->prepare(
        'INSERT INTO venues
         (name, address, city, capacity, price_per_day, status)
         VALUES (?, ?, ?, ?, ?, ?)'
    );

    $stmt->execute([
        trim($b['name']),
        trim($b['address']),
        trim($b['city']),
        $capacity,
        $price,
        $status,
    ]);

    $id = (int)$db->lastInsertId();

    $stmt = $db->prepare('SELECT * FROM venues WHERE id = ?');
    $stmt->execute([$id]);

    success_response(
        201,
        'Venue created.',
        $stmt->fetch(PDO::FETCH_ASSOC)
    );
}

function venues_update(PDO $db, int $id): void
{
    $stmt = $db->prepare('SELECT id FROM venues WHERE id = ?');
    $stmt->execute([$id]);

    if (!$stmt->fetch()) {
        error_response(404, "Venue with ID $id not found.");
        return;
    }

    $b = get_json_body();
    $errors = [];
    $sets = [];
    $params = [];

    // Validate text fields.
    foreach (['name' => 150, 'address' => 255, 'city' => 100] as $field => $max) {
        if (!array_key_exists($field, $b)) {
            continue;
        }

        if (!is_string($b[$field]) || trim($b[$field]) === '') {
            $errors[$field] = "$field is required and must be text.";
        } elseif (mb_strlen(trim($b[$field]), 'UTF-8') > $max) {
            $errors[$field] = "$field must not exceed $max characters.";
        } else {
            $sets[] = "$field = ?";
            $params[] = trim($b[$field]);
        }
    }

    if (array_key_exists('capacity', $b)) {
        if (!is_int($b['capacity']) ||
            $b['capacity'] < 1 ||
            $b['capacity'] > 4294967295) {
            $errors['capacity'] = 'Capacity must be a positive integer within the database range.';
        } else {
            $sets[] = 'capacity = ?';
            $params[] = $b['capacity'];
        }
    }

    if (array_key_exists('price_per_day', $b)) {
        $price = $b['price_per_day'];

        if (!(is_int($price) || is_float($price) || is_string($price)) ||
            !preg_match('/^\d{1,8}(\.\d{1,2})?$/D', (string)$price)) {
            $errors['price_per_day'] = 'Price must be between 0 and 99999999.99, with at most two decimal places.';
        } else {
            $sets[] = 'price_per_day = ?';
            $params[] = $price;
        }
    }

    if (array_key_exists('status', $b)) {
        if (!in_array($b['status'], ['available', 'unavailable', 'maintenance'], true)) {
            $errors['status'] = 'Status must be available, unavailable or maintenance.';
        } else {
            $sets[] = 'status = ?';
            $params[] = $b['status'];
        }
    }

    if ($errors) {
        error_response(422, 'Validation failed.', $errors);
        return;
    }

    if (!$sets) {
        error_response(400, 'Send at least one valid field to update.');
        return;
    }

    $params[] = $id;
    $stmt = $db->prepare(
        'UPDATE venues SET ' . implode(', ', $sets) . ' WHERE id = ?'
    );
    $stmt->execute($params);

    $stmt = $db->prepare('SELECT * FROM venues WHERE id = ?');
    $stmt->execute([$id]);

    success_response(200, 'Venue updated.', $stmt->fetch(PDO::FETCH_ASSOC));
}

function venues_delete(PDO $db, int $id): void
{
    $stmt = $db->prepare('SELECT id FROM venues WHERE id = ?');
    $stmt->execute([$id]);

    if (!$stmt->fetch()) {
        error_response(404, "Venue with ID $id not found.");
        return;
    }

    try {
        $stmt = $db->prepare('DELETE FROM venues WHERE id = ?');
        $stmt->execute([$id]);
    } catch (PDOException $e) {
        // Prevent deletion when events still reference this venue.
        if (($e->errorInfo[1] ?? null) === 1451) {
            error_response(
                409,
                'Cannot delete this venue because it is linked to events.'
            );
            return;
        }

        throw $e;
    }

    success_response(200, "Venue $id deleted.");
}

function venues_availability(PDO $db, int $id): void
{
    $stmt = $db->prepare(
        'SELECT id, name, status FROM venues WHERE id = ?'
    );
    $stmt->execute([$id]);
    $venue = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$venue) {
        error_response(404, "Venue with ID $id not found.");
        return;
    }

    $date = $_GET['date'] ?? '';
    $start = $_GET['start_time'] ?? '';
    $end = $_GET['end_time'] ?? '';
    $errors = [];

    // Validate the actual calendar date.
    if (!is_string($date) ||
        !preg_match('/^\d{4}-\d{2}-\d{2}$/D', $date)) {
        $errors['date'] = 'Date must use YYYY-MM-DD.';
    } else {
        $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date);

        if (!$parsed || $parsed->format('Y-m-d') !== $date ||
            substr($date, 0, 4) < '1000') {
            $errors['date'] = 'Date must be a valid calendar date.';
        }
    }

    // This endpoint supports time slots within one day.
    foreach (['start_time' => $start, 'end_time' => $end] as $field => $value) {
        if (!is_string($value) ||
            !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/D', $value)) {
            $errors[$field] = 'Time must use HH:MM, for example 09:00.';
        }
    }

    if (!isset($errors['start_time']) &&
        !isset($errors['end_time']) &&
        $end <= $start) {
        $errors['end_time'] = 'End time must be later than start time.';
    }

    if ($errors) {
        error_response(422, 'Validation failed.', $errors);
        return;
    }

    // Draft and published events reserve the venue.
    // Adjacent slots, such as 09:00–10:00 and 10:00–11:00, do not overlap.
    $stmt = $db->prepare(
        "SELECT id, title, start_time, end_time
         FROM events
         WHERE venue_id = ?
           AND event_date = ?
           AND status IN ('draft', 'published')
           AND start_time < ?
           AND end_time > ?
         ORDER BY start_time ASC"
    );
    $stmt->execute([$id, $date, $end . ':00', $start . ':00']);
    $conflicts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $available = $venue['status'] === 'available' && !$conflicts;

    if ($venue['status'] !== 'available') {
        $reason = 'Venue status is ' . $venue['status'] . '.';
    } elseif ($conflicts) {
        $reason = 'Venue has an overlapping event.';
    } else {
        $reason = 'Venue is available for the selected time.';
    }

    success_response(200, 'Venue availability checked.', [
        'venue_id' => $id,
        'venue_name' => $venue['name'],
        'venue_status' => $venue['status'],
        'date' => $date,
        'start_time' => $start,
        'end_time' => $end,
        'available' => $available,
        'reason' => $reason,
        'conflicting_events' => $conflicts,
    ]);
}