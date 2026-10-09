
/* =========================================
   EVENTHUB - EVENT BROWSING FRONTEND
   Member 1
   PHP + MySQL RESTful API Integration
   ========================================= */

// Data comes from MySQL via events.php
let events = [];
let lastFocused = null;

// =========================================
// HTML ELEMENTS
// =========================================

const grid = document.getElementById("eventGrid");
const modal = document.getElementById("eventModal");
const modalContent = document.getElementById("modalContent");

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const statusFilter = document.getElementById("statusFilter");
const sortFilter = document.getElementById("sortFilter");

// =========================================
// VISUAL STYLE FOR EVENT CATEGORIES
// =========================================

const categoryVisuals = {
    Music: { icon: "🎵", theme: "music" },
    Technology: { icon: "💻", theme: "tech" },
    Sports: { icon: "🏃", theme: "sports" },
    Community: { icon: "🎨", theme: "community" }
};

// =========================================
// SECURITY: ESCAPE HTML
// =========================================

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// =========================================
// FORMAT DATE
// =========================================

function formatDate(value) {
    const date = new Date(value + "T00:00:00");

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-MY", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

// =========================================
// FORMAT TICKET PRICE
// =========================================

function priceText(price) {
    return Number(price) === 0
        ? "FREE"
        : "RM " + Number(price).toFixed(2);
}

// =========================================
// CHECK EVENT AND TICKET STATUS
// =========================================

function getStatus(event) {

    const eventStatus = String(
        event.status || "published"
    ).toLowerCase();

    // Event cancelled by organiser
    if (eventStatus === "cancelled") {
        return {
            key: "cancelled",
            text: "Cancelled"
        };
    }

    // Event not yet published
    if (eventStatus === "draft") {
        return {
            key: "draft",
            text: "Not Published"
        };
    }

    // Event already completed
    if (eventStatus === "completed") {
        return {
            key: "completed",
            text: "Completed"
        };
    }

    // No available tickets
    if (event.seats <= 0) {
        return {
            key: "soldout",
            text: "Sold Out"
        };
    }

    // Very few tickets left
    if (event.seats <= 20) {
        return {
            key: "limited",
            text: "Limited Tickets"
        };
    }

    // Event published with available tickets
    return {
        key: "available",
        text: "Available"
    };
}

// =========================================
// CHECK WHETHER EVENT IS BOOKABLE
// =========================================

function isBookable(event) {
    return event.status === "published" &&
           event.seats > 0;
}

// =========================================
// ADD CANCELLED OPTION TO FILTER
// =========================================

function setupStatusFilter() {

    const existingOptions = Array.from(
        statusFilter.options
    ).map(option => option.value);

    if (!existingOptions.includes("cancelled")) {

        const option = document.createElement("option");

        option.value = "cancelled";
        option.textContent = "Cancelled";

        statusFilter.appendChild(option);
    }
}

// =========================================
// LOAD EVENTS FROM PHP RESTful API
// =========================================

async function loadEvents() {

    const resultCount = document.getElementById(
        "resultCount"
    );

    resultCount.textContent = "Loading events...";

    try {

        const response = await fetch("events.php", {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        const result = await response.json();

        if (
            !result.success ||
            !Array.isArray(result.data)
        ) {
            throw new Error("Invalid API response");
        }

        // Convert API data into frontend format
        events = result.data.map(row => {

            const category = String(
                row.category ?? "Other"
            );

            const visual = categoryVisuals[category] || {
                icon: "🎟️",
                theme: "community"
            };

            return {
                id: Number(row.id),
                name: String(row.name ?? ""),
                category: category,
                date: String(row.date ?? ""),
                time: String(row.time ?? ""),
                venue: String(row.venue ?? ""),
                location: String(row.location ?? ""),
                price: Number(row.price ?? 0),
                seats: Number(row.seats ?? 0),
                description: String(
                    row.description ?? ""
                ),

                // IMPORTANT: Status from group database
                status: String(
                    row.status ?? "published"
                ).toLowerCase(),

                icon: visual.icon,
                theme: visual.theme
            };
        });

        // =====================================
        // UPDATE WEBSITE STATISTICS
        // =====================================

        // Total number of events
        document.getElementById(
            "totalEvents"
        ).textContent = events.length;

        // Count tickets from published events only
        const availableTickets = events.reduce(
            (sum, event) => {

                if (isBookable(event)) {
                    return sum + event.seats;
                }

                return sum;

            }, 0
        );

        document.getElementById(
            "totalSeats"
        ).textContent = availableTickets;

        // Total number of categories
        document.getElementById(
            "totalCategories"
        ).textContent = new Set(
            events.map(event => event.category)
        ).size;

        // Display event cards
        renderEvents();

        console.log(
            "Events loaded successfully:",
            events
        );

    } catch (error) {

        console.error("API Error:", error);

        resultCount.textContent =
            "Failed to load events.";

        grid.innerHTML = `
            <div class="empty">
                <h3>Unable to load events</h3>
                <p>
                    Please check the API connection
                    and refresh.
                </p>
            </div>
        `;

        document.getElementById(
            "emptyState"
        ).hidden = true;
    }
}

// =========================================
// CREATE EVENT CARD
// =========================================

function makeCard(event) {

    const status = getStatus(event);

    return `
        <article class="event-card">

            <div class="event-image ${event.theme}">

                <span class="category-label">
                    ${escapeHTML(event.category)}
                </span>

                <span class="emoji-art">
                    ${event.icon}
                </span>

            </div>

            <div class="card-content">

                <span class="card-date">
                    📅 ${escapeHTML(formatDate(event.date))}
                    · ${escapeHTML(event.time)}
                </span>

                <h3>
                    ${escapeHTML(event.name)}
                </h3>

                <p class="card-location">
                    📍 ${escapeHTML(event.venue)},
                    ${escapeHTML(event.location)}
                </p>

                <div class="card-info">

                    <div class="card-price">

                        ${priceText(event.price)}

                        <small>per ticket</small>

                    </div>

                    <span class="status ${status.key}">
                        ${status.text}
                    </span>

                </div>

                <button
                    class="view-btn"
                    type="button"
                    data-id="${event.id}"
                >
                    View Event Details →
                </button>

            </div>

        </article>
    `;
}

// =========================================
// SEARCH, FILTER AND SORT
// =========================================

function renderEvents() {

    const search = searchInput.value
        .trim()
        .toLowerCase();

    const category = categoryFilter.value;
    const availability = statusFilter.value;
    const sort = sortFilter.value;

    // =====================================
    // FILTER EVENTS
    // =====================================

    const filtered = events.filter(event => {

        // Search name, venue and location
        const matchSearch =
            event.name.toLowerCase().includes(search) ||
            event.venue.toLowerCase().includes(search) ||
            event.location.toLowerCase().includes(search);

        // Category filter
        const matchCategory =
            category === "all" ||
            event.category === category;

        // Availability/status filter
        const matchStatus =
            availability === "all" ||
            getStatus(event).key === availability;

        return (
            matchSearch &&
            matchCategory &&
            matchStatus
        );
    });

    // =====================================
    // SORT EVENTS
    // =====================================

    filtered.sort((a, b) => {

        // Lowest price first
        if (sort === "price-low") {
            return a.price - b.price;
        }

        // Highest price first
        if (sort === "price-high") {
            return b.price - a.price;
        }

        // Earliest event date first
        return a.date.localeCompare(b.date);
    });

    // =====================================
    // DISPLAY RESULTS
    // =====================================

    grid.innerHTML = filtered
        .map(makeCard)
        .join("");

    document.getElementById(
        "resultCount"
    ).textContent =
        `Showing ${filtered.length} of ${events.length} events`;

    document.getElementById(
        "emptyState"
    ).hidden = filtered.length !== 0;
}

// =========================================
// RESET FILTER
// =========================================

function resetFilters() {

    searchInput.value = "";
    categoryFilter.value = "all";
    statusFilter.value = "all";
    sortFilter.value = "date";

    renderEvents();
}

// =========================================
// EVENT DETAILS POPUP
// =========================================

function openDetails(id, trigger) {

    const event = events.find(
        item => item.id === id
    );

    if (!event) {
        return;
    }

    lastFocused = trigger;

    const status = getStatus(event);

    // Do not show cancelled events as bookable
    const ticketsAvailableText = isBookable(event)
        ? String(event.seats)
        : "Not available";

    modalContent.innerHTML = `

        <div class="modal-header ${event.theme}">

            <div class="emoji">
                ${event.icon}
            </div>

        </div>

        <div class="modal-body">

            <span class="status ${status.key}">
                ${status.text}
            </span>

            <h2 id="modalTitle">
                ${escapeHTML(event.name)}
            </h2>

            <p>
                ${escapeHTML(event.description)}
            </p>

            <div class="detail-row">

                <span>Date</span>

                <strong>
                    ${escapeHTML(formatDate(event.date))}
                </strong>

            </div>

            <div class="detail-row">

                <span>Time</span>

                <strong>
                    ${escapeHTML(event.time)}
                </strong>

            </div>

            <div class="detail-row">

                <span>Venue</span>

                <strong>
                    ${escapeHTML(event.venue)}
                </strong>

            </div>

            <div class="detail-row">

                <span>Location</span>

                <strong>
                    ${escapeHTML(event.location)}
                </strong>

            </div>

            <div class="detail-row">

                <span>Category</span>

                <strong>
                    ${escapeHTML(event.category)}
                </strong>

            </div>

            <div class="detail-row">

                <span>Tickets Available</span>

                <strong>
                    ${escapeHTML(ticketsAvailableText)}
                </strong>

            </div>

            <div class="modal-footer">

                <strong>
                    ${priceText(event.price)}
                </strong>

                <button
                    class="btn-primary"
                    type="button"
                    id="backToEvents"
                >
                    Back to Events
                </button>

            </div>

        </div>
    `;

    modal.hidden = false;

    document.body.classList.add("no-scroll");

    document.getElementById(
        "closeModal"
    ).focus();
}

// =========================================
// CLOSE DETAILS POPUP
// =========================================

function closeDetails() {

    modal.hidden = true;

    document.body.classList.remove("no-scroll");

    if (
        lastFocused &&
        lastFocused.isConnected
    ) {
        lastFocused.focus();
    }
}

// =========================================
// BUTTON AND FILTER EVENTS
// =========================================

searchInput.addEventListener(
    "input",
    renderEvents
);

categoryFilter.addEventListener(
    "change",
    renderEvents
);

statusFilter.addEventListener(
    "change",
    renderEvents
);

sortFilter.addEventListener(
    "change",
    renderEvents
);

// =========================================
// RESET BUTTON
// =========================================

document.getElementById("resetBtn")
    .addEventListener(
        "click",
        resetFilters
    );

document.getElementById("emptyReset")
    .addEventListener(
        "click",
        resetFilters
    );

// =========================================
// VIEW EVENT DETAILS
// =========================================

grid.addEventListener("click", function(e) {

    const button = e.target.closest("[data-id]");

    if (button) {

        openDetails(
            Number(button.dataset.id),
            button
        );
    }
});

// =========================================
// CLOSE MODAL BUTTON
// =========================================

document.getElementById("closeModal")
    .addEventListener(
        "click",
        closeDetails
    );

// =========================================
// BACK BUTTON AND BACKGROUND CLICK
// =========================================

modal.addEventListener("click", function(e) {

    if (
        e.target === modal ||
        e.target.id === "backToEvents"
    ) {
        closeDetails();
    }
});

// =========================================
// ESCAPE KEY
// =========================================

document.addEventListener(
    "keydown",
    function(e) {

        if (
            e.key === "Escape" &&
            !modal.hidden
        ) {
            closeDetails();
        }
    }
);

// =========================================
// START APPLICATION
// =========================================

// Add cancelled filter option
setupStatusFilter();

// Load all events from merged database
loadEvents();
