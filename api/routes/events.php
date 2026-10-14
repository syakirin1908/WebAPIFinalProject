<?php
// Member 3: Events resource (CRUD)

function handle_events(string $method, array $seg, PDO $db): void
{
    // Event listings and published event details are public. If a token is
    // supplied, validate it so management requests can see unpublished events.
    $auth = null;
    if ($method === 'GET') {
        if (get_bearer_token() !== null) {
            $auth = require_auth();
        }
    }

    if (count($seg) > 1) {
        error_response(404, 'Endpoint not found.');
        return;
    }

    // POST /events: create an event.
    if ($method === 'POST') {
        if (isset($seg[0])) {
            error_response(405, 'POST is not allowed on /events/{id}.');
            return;
        }

        $auth = require_role(['admin', 'organiser']);
        events_create($db, $auth);
        return;
    }

    // Update event.
    if ($method === 'PUT' || $method === 'PATCH') {
        $auth = require_role(['admin', 'organiser']);

        if (!isset($seg[0]) || !ctype_digit($seg[0]) || (int)$seg[0] < 1) {
            error_response(400, 'Event ID must be a positive integer.');
            return;
        }

        events_update($db, (int)$seg[0], $auth);
        return;
    }

    // Delete event.
    if ($method === 'DELETE') {
        $auth = require_role(['admin', 'organiser']);

        if (!isset($seg[0]) || !ctype_digit($seg[0]) || (int)$seg[0] < 1) {
            error_response(400, 'Event ID must be a positive integer.');
            return;
        }

        events_delete($db, (int)$seg[0], $auth);
        return;
    }

    if ($method !== 'GET') {
        error_response(405, 'Method not allowed.');
        return;
    }

    // GET /events: list events with filtering and pagination.
    if (!isset($seg[0])) {
        events_list($db, $auth);
        return;
    }

    // Validate ID.
    if (!ctype_digit($seg[0]) || (int)$seg[0] < 1) {
        error_response(400, 'Event ID must be a positive integer.');
        return;
    }

    // GET /events/{id}: retrieve single event.
    events_get($db, (int)$seg[0], $auth);
}

function events_list(PDO $db, ?array $auth): void
{
    $page   = max(1, (int)($_GET['page'] ?? 1));
    $limit  = min(100, max(1, (int)($_GET['limit'] ?? 10)));
    $offset = ($page - 1) * $limit;

    $where  = [];
    $params = [];

    // Guests and customers may browse published events only. Organisers and
    // admins need access to drafts and other statuses in the management view.
    if (!events_can_view_unpublished($auth)) {
        $where[]  = 'e.status = ?';
        $params[] = 'published';
    }

    // Search by title or description
    if (isset($_GET['search']) && trim($_GET['search']) !== '') {
        $where[] = '(e.title LIKE ? OR e.description LIKE ?)';
        $like    = '%' . trim($_GET['search']) . '%';
        $params[] = $like;
        $params[] = $like;
    }

    // Category filter
    if (isset($_GET['category']) && trim($_GET['category']) !== '') {
        $where[]  = 'e.category = ?';
        $params[] = trim($_GET['category']);
    }

    // Venue ID filter
    if (isset($_GET['venue_id']) && trim($_GET['venue_id']) !== '') {
        $venueFilter = trim($_GET['venue_id']);
        if (!ctype_digit($venueFilter) || (int)$venueFilter < 1) {
            error_response(422, 'Validation failed.', ['venue_id' => 'Venue ID must be a positive integer.']);
            return;
        }
        $where[]  = 'e.venue_id = ?';
        $params[] = (int)$venueFilter;
    }

    // Status filter
    if (isset($_GET['status']) && trim($_GET['status']) !== '') {
        $statusFilter = trim($_GET['status']);
        if (!in_array($statusFilter, ['draft', 'published', 'cancelled', 'completed'], true)) {
            error_response(422, 'Validation failed.', ['status' => 'Status must be draft, published, cancelled or completed.']);
            return;
        }
        $where[]  = 'e.status = ?';
        $params[] = $statusFilter;
    }

    // Organiser ID filter
    if (isset($_GET['organiser_id']) && trim($_GET['organiser_id']) !== '') {
        $orgFilter = trim($_GET['organiser_id']);
        if (!ctype_digit($orgFilter) || (int)$orgFilter < 1) {
            error_response(422, 'Validation failed.', ['organiser_id' => 'Organiser ID must be a positive integer.']);
            return;
        }
        $where[]  = 'e.organiser_id = ?';
        $params[] = (int)$orgFilter;
    }

    $sqlWhere = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $countStmt = $db->prepare(
        "SELECT COUNT(*)
         FROM events e
         JOIN venues v ON e.venue_id = v.id
         JOIN users u ON e.organiser_id = u.id
         $sqlWhere"
    );
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $db->prepare(
        "SELECT e.id, e.title, e.description, e.category,
                e.venue_id, v.name AS venue_name, v.city AS venue_city,
                e.organiser_id, u.name AS organiser_name,
                e.event_date, e.start_time, e.end_time,
                e.ticket_price, e.total_tickets, e.available_tickets,
                e.status, e.created_at, e.updated_at
         FROM events e
         JOIN venues v ON e.venue_id = v.id
         JOIN users u ON e.organiser_id = u.id
         $sqlWhere
         ORDER BY e.id ASC
         LIMIT $limit OFFSET $offset"
    );
    $stmt->execute($params);
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

    success_response(200, 'Events retrieved.', $events, [
        'pagination' => [
            'page'        => $page,
            'limit'       => $limit,
            'total'       => $total,
            'total_pages' => (int)ceil($total / $limit),
        ],
    ]);
}

function events_get(PDO $db, int $id, ?array $auth): void
{
    $event = event_by_id($db, $id);

    if (!$event || (!events_can_view_unpublished($auth) && $event['status'] !== 'published')) {
        error_response(404, "Event with ID $id not found.");
        return;
    }

    success_response(200, 'Event retrieved.', $event);
}

function events_can_view_unpublished(?array $auth): bool
{
    return $auth !== null && in_array($auth['role'], ['admin', 'organiser'], true);
}

function events_create(PDO $db, array $auth): void
{
    $b = get_json_body();
    $errors = [];

    // Title: required text up to 150 chars
    $title = $b['title'] ?? null;
    if (!is_string($title) || trim($title) === '') {
        $errors['title'] = 'Title is required and must be text.';
    } elseif (mb_strlen(trim($title), 'UTF-8') > 150) {
        $errors['title'] = 'Title must not exceed 150 characters.';
    }

    // Description: optional text
    $description = $b['description'] ?? null;
    if ($description !== null && !is_string($description)) {
        $errors['description'] = 'Description must be text.';
    }

    // Category: optional text up to 50 chars, default 'Community'
    $category = $b['category'] ?? 'Community';
    if (!is_string($category) || trim($category) === '') {
        $errors['category'] = 'Category must be text.';
    } elseif (mb_strlen(trim($category), 'UTF-8') > 50) {
        $errors['category'] = 'Category must not exceed 50 characters.';
    }

    // Venue ID: required positive integer
    $venueId = $b['venue_id'] ?? null;
    if (is_numeric($venueId) && (int)$venueId == $venueId) {
        $venueId = (int)$venueId;
    }
    if (!is_int($venueId) || $venueId < 1 || $venueId > 4294967295) {
        $errors['venue_id'] = 'Venue ID is required and must be a positive integer.';
    }

    // Event Date: required YYYY-MM-DD
    $eventDate = $b['event_date'] ?? null;
    if (!is_string($eventDate) || !preg_match('/^\d{4}-\d{2}-\d{2}$/D', $eventDate)) {
        $errors['event_date'] = 'Event date must use YYYY-MM-DD.';
    } else {
        $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $eventDate);
        if (!$parsed || $parsed->format('Y-m-d') !== $eventDate || substr($eventDate, 0, 4) < '1000') {
            $errors['event_date'] = 'Event date must be a valid calendar date.';
        }
    }

    // Start Time and End Time: required HH:MM or HH:MM:SS
    $startTime = $b['start_time'] ?? null;
    $endTime   = $b['end_time'] ?? null;

    if (!is_string($startTime) || !preg_match('/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/D', $startTime)) {
        $errors['start_time'] = 'Start time must use HH:MM or HH:MM:SS, for example 09:00.';
    }
    if (!is_string($endTime) || !preg_match('/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/D', $endTime)) {
        $errors['end_time'] = 'End time must use HH:MM or HH:MM:SS, for example 17:00.';
    }

    $normStartTime = null;
    $normEndTime   = null;
    if (!isset($errors['start_time']) && !isset($errors['end_time'])) {
        $normStartTime = strlen($startTime) === 5 ? $startTime . ':00' : $startTime;
        $normEndTime   = strlen($endTime) === 5 ? $endTime . ':00' : $endTime;

        if ($normEndTime <= $normStartTime) {
            $errors['end_time'] = 'End time must be later than start time.';
        }
    }

    // Ticket price: optional decimal up to 2 decimal places, default 0.00
    $ticketPrice = $b['ticket_price'] ?? 0;
    if (
        !(is_int($ticketPrice) || is_float($ticketPrice) || is_string($ticketPrice))
        || !preg_match('/^\d{1,8}(\.\d{1,2})?$/D', (string)$ticketPrice)
    ) {
        $errors['ticket_price'] = 'Ticket price must be between 0 and 99999999.99, with at most two decimal places.';
    }

    // Total tickets: required positive integer
    $totalTickets = $b['total_tickets'] ?? null;
    if (is_numeric($totalTickets) && !is_float($totalTickets + 0) && (int)$totalTickets == $totalTickets) {
        $totalTickets = (int)$totalTickets;
    }
    if (!is_int($totalTickets) || $totalTickets < 1 || $totalTickets > 4294967295) {
        $errors['total_tickets'] = 'Total tickets must be a positive integer within the database range.';
    }

    // Available tickets: optional integer >= 0 and <= total_tickets, defaults to total_tickets
    $availableTickets = $b['available_tickets'] ?? ($totalTickets ?? null);
    if (is_numeric($availableTickets) && !is_float($availableTickets + 0) && (int)$availableTickets == $availableTickets) {
        $availableTickets = (int)$availableTickets;
    }
    if (!is_int($availableTickets) || $availableTickets < 0 || $availableTickets > 4294967295) {
        $errors['available_tickets'] = 'Available tickets must be a non-negative integer within the database range.';
    } elseif ($totalTickets !== null && is_int($totalTickets) && $availableTickets > $totalTickets) {
        $errors['available_tickets'] = 'Available tickets cannot exceed total tickets.';
    }

    // Status: optional, default 'draft'
    $status = $b['status'] ?? 'draft';
    if (!in_array($status, ['draft', 'published', 'cancelled', 'completed'], true)) {
        $errors['status'] = 'Status must be draft, published, cancelled or completed.';
    }

    // Organiser ID: set from JWT claims (sub).
    // Admin may optionally specify organiser_id to assign the event to another organiser/admin.
    $organiserId = $auth['id'];
    if ($auth['role'] === 'admin' && array_key_exists('organiser_id', $b)) {
        $oid = $b['organiser_id'];
        if (is_numeric($oid) && (int)$oid == $oid) {
            $oid = (int)$oid;
        }
        if (!is_int($oid) || $oid < 1) {
            $errors['organiser_id'] = 'Organiser ID must be a positive integer.';
        } else {
            $uStmt = $db->prepare('SELECT id, role FROM users WHERE id = ?');
            $uStmt->execute([$oid]);
            $targetUser = $uStmt->fetch(PDO::FETCH_ASSOC);
            if (!$targetUser) {
                $errors['organiser_id'] = 'Organiser user not found.';
            } elseif (!in_array($targetUser['role'], ['admin', 'organiser'], true)) {
                $errors['organiser_id'] = 'Assigned user must have admin or organiser role.';
            } else {
                $organiserId = $oid;
            }
        }
    }

    if ($errors) {
        error_response(422, 'Validation failed.', $errors);
        return;
    }

    // Check venue exists
    $vStmt = $db->prepare('SELECT id, name, status, capacity FROM venues WHERE id = ?');
    $vStmt->execute([$venueId]);
    $venue = $vStmt->fetch(PDO::FETCH_ASSOC);

    if (!$venue) {
        error_response(404, "Venue with ID $venueId not found.");
        return;
    }

    // Check venue availability
    if ($venue['status'] !== 'available') {
        error_response(409, 'Venue is not available for booking (status: ' . $venue['status'] . ').');
        return;
    }

    // Check venue overlapping event conflicts
    $confStmt = $db->prepare(
        "SELECT id, title, start_time, end_time
         FROM events
         WHERE venue_id = ?
           AND event_date = ?
           AND status IN ('draft', 'published')
           AND start_time < ?
           AND end_time > ?
         ORDER BY start_time ASC"
    );
    $confStmt->execute([$venueId, $eventDate, $normEndTime, $normStartTime]);
    $conflicts = $confStmt->fetchAll(PDO::FETCH_ASSOC);

    if ($conflicts) {
        error_response(409, 'Venue is already booked for another event during the specified date and time.', [
            'conflicting_events' => $conflicts,
        ]);
        return;
    }

    $insertStmt = $db->prepare(
        'INSERT INTO events
         (title, description, category, venue_id, organiser_id,
          event_date, start_time, end_time, ticket_price,
          total_tickets, available_tickets, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    $insertStmt->execute([
        trim($title),
        $description !== null ? trim($description) : null,
        trim($category),
        $venueId,
        $organiserId,
        $eventDate,
        $normStartTime,
        $normEndTime,
        $ticketPrice,
        $totalTickets,
        $availableTickets,
        $status,
    ]);

    $id = (int)$db->lastInsertId();
    $created = event_by_id($db, $id);

    success_response(201, 'Event created.', $created);
}

function events_update(PDO $db, int $id, array $auth): void
{
    $stmt = $db->prepare('SELECT * FROM events WHERE id = ?');
    $stmt->execute([$id]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$event) {
        error_response(404, "Event with ID $id not found.");
        return;
    }

    // RBAC: Admin can update any event; organiser can only update their own events.
    if ($auth['role'] !== 'admin' && (int)$event['organiser_id'] !== $auth['id']) {
        error_response(403, 'Forbidden. You can only update your own events.');
        return;
    }

    $b = get_json_body();
    if (!$b) {
        error_response(400, 'Request body is empty. Send at least one valid field to update.');
        return;
    }

    $errors = [];
    $sets   = [];
    $params = [];

    // Title
    if (array_key_exists('title', $b)) {
        if (!is_string($b['title']) || trim($b['title']) === '') {
            $errors['title'] = 'Title is required and must be text.';
        } elseif (mb_strlen(trim($b['title']), 'UTF-8') > 150) {
            $errors['title'] = 'Title must not exceed 150 characters.';
        } else {
            $sets[]   = 'title = ?';
            $params[] = trim($b['title']);
        }
    }

    // Description
    if (array_key_exists('description', $b)) {
        if ($b['description'] !== null && !is_string($b['description'])) {
            $errors['description'] = 'Description must be text.';
        } else {
            $sets[]   = 'description = ?';
            $params[] = $b['description'] !== null ? trim($b['description']) : null;
        }
    }

    // Category
    if (array_key_exists('category', $b)) {
        if (!is_string($b['category']) || trim($b['category']) === '') {
            $errors['category'] = 'Category is required and must be text.';
        } elseif (mb_strlen(trim($b['category']), 'UTF-8') > 50) {
            $errors['category'] = 'Category must not exceed 50 characters.';
        } else {
            $sets[]   = 'category = ?';
            $params[] = trim($b['category']);
        }
    }

    // Venue ID
    $newVenueId = (int)$event['venue_id'];
    if (array_key_exists('venue_id', $b)) {
        $vid = $b['venue_id'];
        if (is_numeric($vid) && (int)$vid == $vid) {
            $vid = (int)$vid;
        }
        if (!is_int($vid) || $vid < 1 || $vid > 4294967295) {
            $errors['venue_id'] = 'Venue ID must be a positive integer.';
        } else {
            $newVenueId = $vid;
            $sets[]     = 'venue_id = ?';
            $params[]   = $newVenueId;
        }
    }

    // Organiser ID (admin only)
    if (array_key_exists('organiser_id', $b)) {
        if ($auth['role'] !== 'admin') {
            error_response(403, 'Forbidden. Only an administrator can reassign the event organiser.');
            return;
        }
        $oid = $b['organiser_id'];
        if (is_numeric($oid) && (int)$oid == $oid) {
            $oid = (int)$oid;
        }
        if (!is_int($oid) || $oid < 1) {
            $errors['organiser_id'] = 'Organiser ID must be a positive integer.';
        } else {
            $uStmt = $db->prepare('SELECT id, role FROM users WHERE id = ?');
            $uStmt->execute([$oid]);
            $targetUser = $uStmt->fetch(PDO::FETCH_ASSOC);
            if (!$targetUser) {
                $errors['organiser_id'] = 'Organiser user not found.';
            } elseif (!in_array($targetUser['role'], ['admin', 'organiser'], true)) {
                $errors['organiser_id'] = 'Assigned user must have admin or organiser role.';
            } else {
                $sets[]   = 'organiser_id = ?';
                $params[] = $oid;
            }
        }
    }

    // Event Date
    $newEventDate = $event['event_date'];
    if (array_key_exists('event_date', $b)) {
        $date = $b['event_date'];
        if (!is_string($date) || !preg_match('/^\d{4}-\d{2}-\d{2}$/D', $date)) {
            $errors['event_date'] = 'Event date must use YYYY-MM-DD.';
        } else {
            $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
            if (!$parsed || $parsed->format('Y-m-d') !== $date || substr($date, 0, 4) < '1000') {
                $errors['event_date'] = 'Event date must be a valid calendar date.';
            } else {
                $newEventDate = $date;
                $sets[]       = 'event_date = ?';
                $params[]     = $date;
            }
        }
    }

    // Start Time and End Time
    $newStartTime = $event['start_time'];
    $newEndTime   = $event['end_time'];
    $timeUpdated  = false;

    if (array_key_exists('start_time', $b)) {
        $st = $b['start_time'];
        if (!is_string($st) || !preg_match('/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/D', $st)) {
            $errors['start_time'] = 'Start time must use HH:MM or HH:MM:SS, for example 09:00.';
        } else {
            $newStartTime = strlen($st) === 5 ? $st . ':00' : $st;
            $sets[]       = 'start_time = ?';
            $params[]     = $newStartTime;
            $timeUpdated  = true;
        }
    }

    if (array_key_exists('end_time', $b)) {
        $et = $b['end_time'];
        if (!is_string($et) || !preg_match('/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/D', $et)) {
            $errors['end_time'] = 'End time must use HH:MM or HH:MM:SS, for example 17:00.';
        } else {
            $newEndTime  = strlen($et) === 5 ? $et . ':00' : $et;
            $sets[]      = 'end_time = ?';
            $params[]    = $newEndTime;
            $timeUpdated = true;
        }
    }

    if (!isset($errors['start_time']) && !isset($errors['end_time']) && $timeUpdated) {
        if ($newEndTime <= $newStartTime) {
            $errors['end_time'] = 'End time must be later than start time.';
        }
    }

    // Ticket price
    if (array_key_exists('ticket_price', $b)) {
        $price = $b['ticket_price'];
        if (
            !(is_int($price) || is_float($price) || is_string($price))
            || !preg_match('/^\d{1,8}(\.\d{1,2})?$/D', (string)$price)
        ) {
            $errors['ticket_price'] = 'Ticket price must be between 0 and 99999999.99, with at most two decimal places.';
        } else {
            $sets[]   = 'ticket_price = ?';
            $params[] = $price;
        }
    }

    // Total tickets and Available tickets
    $newTotalTickets     = (int)$event['total_tickets'];
    $newAvailableTickets = (int)$event['available_tickets'];
    $ticketsUpdated      = false;

    if (array_key_exists('total_tickets', $b)) {
        $tot = $b['total_tickets'];
        if (is_numeric($tot) && !is_float($tot + 0) && (int)$tot == $tot) {
            $tot = (int)$tot;
        }
        if (!is_int($tot) || $tot < 1 || $tot > 4294967295) {
            $errors['total_tickets'] = 'Total tickets must be a positive integer within the database range.';
        } else {
            $newTotalTickets = $tot;
            $sets[]          = 'total_tickets = ?';
            $params[]        = $newTotalTickets;
            $ticketsUpdated  = true;
        }
    }

    if (array_key_exists('available_tickets', $b)) {
        $avail = $b['available_tickets'];
        if (is_numeric($avail) && !is_float($avail + 0) && (int)$avail == $avail) {
            $avail = (int)$avail;
        }
        if (!is_int($avail) || $avail < 0 || $avail > 4294967295) {
            $errors['available_tickets'] = 'Available tickets must be a non-negative integer within the database range.';
        } else {
            $newAvailableTickets = $avail;
            $sets[]              = 'available_tickets = ?';
            $params[]            = $newAvailableTickets;
            $ticketsUpdated      = true;
        }
    }

    if (!isset($errors['total_tickets']) && !isset($errors['available_tickets']) && $ticketsUpdated) {
        if ($newAvailableTickets > $newTotalTickets) {
            $errors['available_tickets'] = 'Available tickets cannot exceed total tickets.';
        }
    }

    // Status
    $newStatus = $event['status'];
    if (array_key_exists('status', $b)) {
        if (!in_array($b['status'], ['draft', 'published', 'cancelled', 'completed'], true)) {
            $errors['status'] = 'Status must be draft, published, cancelled or completed.';
        } else {
            $newStatus = $b['status'];
            $sets[]    = 'status = ?';
            $params[]  = $newStatus;
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

    // If venue, date, time or status changed, check venue existence and schedule availability
    $scheduleChanged = array_key_exists('venue_id', $b) ||
                       array_key_exists('event_date', $b) ||
                       array_key_exists('start_time', $b) ||
                       array_key_exists('end_time', $b) ||
                       array_key_exists('status', $b);

    if ($scheduleChanged) {
        $vStmt = $db->prepare('SELECT id, name, status FROM venues WHERE id = ?');
        $vStmt->execute([$newVenueId]);
        $venue = $vStmt->fetch(PDO::FETCH_ASSOC);

        if (!$venue) {
            error_response(404, "Venue with ID $newVenueId not found.");
            return;
        }

        if (in_array($newStatus, ['draft', 'published'], true)) {
            if ($venue['status'] !== 'available') {
                error_response(409, 'Venue is not available for booking (status: ' . $venue['status'] . ').');
                return;
            }

            $confStmt = $db->prepare(
                "SELECT id, title, start_time, end_time
                 FROM events
                 WHERE venue_id = ?
                   AND event_date = ?
                   AND status IN ('draft', 'published')
                   AND id <> ?
                   AND start_time < ?
                   AND end_time > ?
                 ORDER BY start_time ASC"
            );
            $confStmt->execute([$newVenueId, $newEventDate, $id, $newEndTime, $newStartTime]);
            $conflicts = $confStmt->fetchAll(PDO::FETCH_ASSOC);

            if ($conflicts) {
                error_response(409, 'Venue is already booked for another event during the specified date and time.', [
                    'conflicting_events' => $conflicts,
                ]);
                return;
            }
        }
    }

    $params[] = $id;
    $db->prepare('UPDATE events SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);

    $updated = event_by_id($db, $id);
    success_response(200, 'Event updated.', $updated);
}

function events_delete(PDO $db, int $id, array $auth): void
{
    $stmt = $db->prepare('SELECT id, organiser_id FROM events WHERE id = ?');
    $stmt->execute([$id]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$event) {
        error_response(404, "Event with ID $id not found.");
        return;
    }

    // RBAC: Admin can delete any event; organiser can only delete their own events.
    if ($auth['role'] !== 'admin' && (int)$event['organiser_id'] !== $auth['id']) {
        error_response(403, 'Forbidden. You can only delete your own events.');
        return;
    }

    // Prevent deletion if confirmed bookings exist
    $bkStmt = $db->prepare("SELECT COUNT(*) FROM bookings WHERE event_id = ? AND status = 'confirmed'");
    $bkStmt->execute([$id]);
    $confirmedCount = (int)$bkStmt->fetchColumn();

    if ($confirmedCount > 0) {
        error_response(409, 'Cannot delete event because confirmed bookings exist.');
        return;
    }

    try {
        $delStmt = $db->prepare('DELETE FROM events WHERE id = ?');
        $delStmt->execute([$id]);
    } catch (PDOException $e) {
        // Prevent deletion if any remaining bookings reference this event (FK RESTRICT)
        if (($e->errorInfo[1] ?? null) === 1451 || $e->getCode() === '23000') {
            error_response(409, 'Cannot delete this event because bookings are linked to it.');
            return;
        }
        throw $e;
    }

    success_response(200, "Event $id deleted.");
}

function event_by_id(PDO $db, int $id): ?array
{
    $stmt = $db->prepare(
        'SELECT e.id, e.title, e.description, e.category,
                e.venue_id, v.name AS venue_name, v.address AS venue_address, v.city AS venue_city, v.capacity AS venue_capacity,
                e.organiser_id, u.name AS organiser_name,
                e.event_date, e.start_time, e.end_time,
                e.ticket_price, e.total_tickets, e.available_tickets,
                e.status, e.created_at, e.updated_at
         FROM events e
         JOIN venues v ON e.venue_id = v.id
         JOIN users u ON e.organiser_id = u.id
         WHERE e.id = ?'
    );
    $stmt->execute([$id]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);
    return $event ?: null;
}
