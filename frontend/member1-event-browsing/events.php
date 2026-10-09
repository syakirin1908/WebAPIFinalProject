
<?php
// EventHub - RESTful Events API
// Member 1 - Event Browsing
// Database: event_ticketing_db

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store");

// Only allow GET requests for public event browsing
if ($_SERVER["REQUEST_METHOD"] !== "GET") {

    header("Allow: GET");
    http_response_code(405);

    echo json_encode([
        "success" => false,
        "message" => "Method not allowed. Use GET."
    ]);

    exit;
}

// Connect to database
require_once __DIR__ . "/db.php";

try {

    // Get optional event ID
    $eventId = null;

    if (isset($_GET["id"])) {

        $eventId = filter_var(
            $_GET["id"],
            FILTER_VALIDATE_INT,
            ["options" => ["min_range" => 1]]
        );

        if ($eventId === false) {

            http_response_code(400);

            echo json_encode([
                "success" => false,
                "message" => "Invalid event ID"
            ]);

            exit;
        }
    }

    // Retrieve events from the merged group database
    // Aliases preserve the existing frontend JSON structure
    $sql = "
        SELECT
            e.id AS id,
            e.title AS name,
            e.category,
            DATE_FORMAT(e.event_date, '%Y-%m-%d') AS date,
            DATE_FORMAT(e.start_time, '%h:%i %p') AS time,
            v.name AS venue,
            v.city AS location,
            e.ticket_price AS price,
            e.available_tickets AS seats,
            e.description,
            e.status

        FROM events e

        INNER JOIN venues v
            ON e.venue_id = v.id
    ";

    // Optional filtering by event ID
    if ($eventId !== null) {
        $sql .= " WHERE e.id = :id";
    }

    $sql .= " ORDER BY e.event_date ASC, e.start_time ASC";

    $stmt = $pdo->prepare($sql);

    if ($eventId !== null) {
        $stmt->bindValue(
            ":id",
            $eventId,
            PDO::PARAM_INT
        );
    }

    $stmt->execute();

    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format numeric values for JSON
    foreach ($events as &$event) {

        $event["id"] = (int) $event["id"];
        $event["price"] = (float) $event["price"];
        $event["seats"] = (int) $event["seats"];
    }

    unset($event);

    // GET single event
    if ($eventId !== null) {

        if (count($events) === 0) {

            http_response_code(404);

            echo json_encode([
                "success" => false,
                "message" => "Event not found"
            ]);

            exit;
        }

        http_response_code(200);

        echo json_encode([
            "success" => true,
            "data" => $events[0]
        ]);

        exit;
    }

    // GET all events
    http_response_code(200);

    echo json_encode([
        "success" => true,
        "count" => count($events),
        "data" => $events
    ]);

} catch (PDOException $e) {

    error_log($e->getMessage());

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Internal server error"
    ]);
}
