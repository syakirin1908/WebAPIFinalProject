
<?php
// EVENTHUB - EVENT TICKETING SYSTEM
// Event Browsing Frontend

$appName = "EventHub";
$year = date("Y");
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">

    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">

    <meta name="description"
          content="Discover upcoming events, venues and tickets with EventHub.">

    <title>
        <?php echo htmlspecialchars($appName); ?> | Discover Events
    </title>

    <!-- EXTERNAL CSS -->
    <link rel="stylesheet" href="style.css">


    <!-- JAVASCRIPT / RESTful API INTEGRATION -->
    <script src="script.js?v=4" defer></script> 
</head>

<body>

<!-- ================= NAVIGATION ================= -->

<header class="site-header">

    <div class="container nav">

        <a class="logo" href="index.php">
            <span class="logo-icon">✦</span>
            <span>
                event<span class="accent">hub</span>
            </span>
        </a>

        <nav class="nav-links">
            <a href="#home">Home</a>
            <a href="#events">Explore Events</a>
            <a href="#about">About Us</a>
        </nav>

    </div>

</header>

<main>

<!-- ================= HERO SECTION ================= -->

<section class="hero" id="home">

    <div class="container hero-layout">

        <div class="hero-content">

            <span class="hero-label">
                ✦ YOUR NEXT EXPERIENCE AWAITS
            </span>

            <h1>
                Discover events.<br>
                Make <span>memories.</span>
            </h1>

            <p>
                Explore incredible experiences happening near you.
                From exciting concerts to inspiring conferences,
                find the perfect event and make every moment count.
            </p>

            <div class="hero-actions">

                <a class="btn-primary" href="#events">
                    Explore Events &nbsp; →
                </a>

                <a class="btn-outline" href="#about">
                    Learn More
                </a>

            </div>

        </div>

        <!-- DECORATIVE EVENT TICKET -->

        <div class="hero-art">

            <div class="ticket">

                <div class="ticket-top">

                    <span class="ticket-label">
                        ✦ EVENTHUB EXCLUSIVE
                    </span>

                    <div class="ticket-emoji">
                        🎵
                    </div>

                </div>

                <div class="ticket-bottom">

                    <h3>Your next big moment.</h3>

                    <p>
                        Explore events and find your experience.
                    </p>

                    <div class="ticket-line"></div>

                    <div class="ticket-info">

                        <span>DISCOVER MORE</span>

                        <strong>✦ EVENTHUB</strong>

                    </div>

                </div>

            </div>

            <div class="floating-label">
                ✨ Discover amazing events
            </div>

        </div>

    </div>

</section>

<!-- ================= STATISTICS ================= -->

<div class="container">

    <section class="stats" aria-label="Event statistics">

        <div class="stat">

            <strong id="totalEvents">0</strong>

            <span>Upcoming Events</span>

        </div>

        <div class="stat">

            <strong id="totalSeats">0</strong>

            <span>Available Tickets</span>

        </div>

        <div class="stat">

            <strong id="totalCategories">0</strong>

            <span>Event Categories</span>

        </div>

    </section>

</div>

<!-- ================= EVENT BROWSING ================= -->

<section class="container section" id="events">

    <div class="section-top">

        <div>

            <span class="overline">
                DISCOVER & EXPLORE
            </span>

            <h2>Upcoming Events</h2>

            <p class="section-subtitle">
                Find the perfect experience just for you.
            </p>

        </div>

        <span class="demo-tag">
            ● EVENT CATALOG
        </span>

    </div>

    <!-- ================= SEARCH AND FILTER ================= -->

    <div class="filter-box">

        <!-- SEARCH -->

        <input
            type="search"
            id="searchInput"
            aria-label="Search events"
            placeholder="🔍 Search events or location..."
        >

        <!-- CATEGORY FILTER -->

        <select
            id="categoryFilter"
            aria-label="Filter by category">

            <option value="all">All Categories</option>
            <option value="Music">Music</option>
            <option value="Technology">Technology</option>
            <option value="Sports">Sports</option>
            <option value="Community">Community</option>

        </select>

        <!-- AVAILABILITY FILTER -->

        <select
            id="statusFilter"
            aria-label="Filter by availability">

            <option value="all">All Availability</option>
            <option value="available">Available</option>
            <option value="limited">Limited Tickets</option>
            <option value="soldout">Sold Out</option>

        </select>

        <!-- SORTING -->

        <select
            id="sortFilter"
            aria-label="Sort events">

            <option value="date">Date: Earliest</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>

        </select>

        <!-- RESET -->

        <button
            class="reset-btn"
            id="resetBtn"
            type="button">

            Reset

        </button>

    </div>

    <!-- ================= RESULTS ================= -->

    <p
        class="result-count"
        id="resultCount"
        aria-live="polite">

        Loading events from API...

    </p>

    <!-- ================= EVENT CARDS ================= -->

    <div
        class="event-grid"
        id="eventGrid">

        <!-- Event cards generated by script.js -->
        <!-- Event data retrieved through events.php -->

    </div>

    <!-- ================= NO RESULTS ================= -->

    <div
        class="empty"
        id="emptyState"
        hidden>

        <div class="empty-icon">
            🔎
        </div>

        <h3>No Events Found</h3>

        <p>
            Try adjusting your search or filters.
        </p>

        <button
            class="btn-primary"
            id="emptyReset"
            type="button">

            Reset Filters

        </button>

    </div>

</section>

<!-- ================= ABOUT SECTION ================= -->

<div class="container">

    <section class="about" id="about">

        <div class="about-icon">
            ✦
        </div>

        <div>

            <h2>Discover more with EventHub.</h2>

            <p>
                EventHub is a modern event discovery and ticketing
                platform designed to make finding exciting experiences
                easier than ever.

                Explore upcoming events, discover unique venues,
                compare ticket availability and find the perfect
                experience for every occasion.
            </p>

        </div>

    </section>

</div>

</main>

<!-- ================= FOOTER ================= -->

<footer class="site-footer">

    <div class="container footer-inner">

        <span>
            &copy; <?php echo $year; ?> EventHub.
            All Rights Reserved.
        </span>

        <span>
            Discover Events &bull; Explore Experiences &bull; Create Memories
        </span>

    </div>

</footer>

<!-- ================= EVENT DETAILS POPUP ================= -->

<div
    class="modal"
    id="eventModal"
    hidden>

    <div
        class="modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
        tabindex="-1">

        <button
            class="close-btn"
            type="button"
            id="closeModal"
            aria-label="Close event details">

            &times;

        </button>

        <div id="modalContent">
            <!-- Event details loaded by script.js -->
        </div>

    </div>

</div>

</body>
</html>
