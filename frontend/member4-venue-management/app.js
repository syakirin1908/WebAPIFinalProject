const API_BASE = new URL("../../api/", window.location.href);

const el = (id) => document.getElementById(id);

let token = "";
let currentUser = null;
let venues = [];

function showMessage(message, type = "info") {
  el("message").textContent = message;
  el("message").className = type;
}

function canManage() {
  return ["admin", "organiser"].includes(currentUser?.role);
}

function resetVenueForm() {
  el("venue-form").reset();
  el("venue-id").value = "";
  el("form-title").textContent = "Add Venue";
}

function logout() {
  token = "";
  currentUser = null;
  venues = [];

  el("management-section").hidden = true;
  el("login-section").hidden = false;
  el("venue-editor").hidden = true;
  el("venue-details").hidden = true;
  el("venue-list").replaceChildren();
  el("availability-venue").replaceChildren();
  el("availability-result").textContent = "";

  resetVenueForm();
  el("login-form").reset();
}

// Shared helper for all API requests.
async function apiRequest(path, method = "GET", body = null) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== null) {
    headers["Content-Type"] = "application/json";
  }

  let response;

  try {
    response = await fetch(new URL(path, API_BASE), {
      method,
      headers,
      body: body === null ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new Error(
      "Cannot connect to API. Check that Apache and MySQL are running."
    );
  }

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      "API returned an invalid response. Check the PHP error log."
    );
  }

  if (!response.ok || !result.success) {
    if (response.status === 401 && token) {
      logout();
    }

    const details = result.errors
      ? Object.entries(result.errors)
          .map(([field, message]) => `${field}: ${message}`)
          .join("\n")
      : "";

    throw new Error(
      [result.message || "Request failed.", details]
        .filter(Boolean)
        .join("\n")
    );
  }

  return result.data;
}

// Disable submit buttons while a request is running.
async function runForm(form, action) {
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;

  try {
    await action();
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    button.disabled = false;
  }
}

// Login.
el("login-form").addEventListener("submit", (event) => {
  event.preventDefault();

  runForm(event.currentTarget, async () => {
    const data = await apiRequest("auth/login", "POST", {
      email: el("email").value.trim(),
      password: el("password").value
    });

    token = data.token;
    currentUser = data.user;

    el("password").value = "";
    el("login-section").hidden = true;
    el("management-section").hidden = false;
    el("venue-editor").hidden = !canManage();
    el("user-info").textContent =
      `${currentUser.name} (${currentUser.role})`;

    await loadVenues();
    showMessage("Login successful.", "success");
  });
});

el("logout-button").addEventListener("click", () => {
  logout();
  showMessage("You have logged out.", "info");
});

// Retrieve the venue list.
async function loadVenues() {
  venues = await apiRequest("venues");

  renderVenues();
  populateAvailabilityVenues();

  el("venue-details").hidden = true;
  el("availability-result").textContent = "";
}

function addCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = String(value);
  row.appendChild(cell);
  return cell;
}

function addAction(cell, label, action, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className = className;

  button.addEventListener("click", async () => {
    button.disabled = true;

    try {
      await action();
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      button.disabled = false;
    }
  });

  cell.appendChild(button);
}

// Display database text safely using textContent.
function renderVenues() {
  const list = el("venue-list");
  list.replaceChildren();

  const search = el("search").value.trim().toLowerCase();

  const filtered = venues.filter((venue) =>
    `${venue.name} ${venue.city}`.toLowerCase().includes(search)
  );

  if (!filtered.length) {
    const row = document.createElement("tr");
    const cell = addCell(row, "No venues found.");
    cell.colSpan = 7;
    list.appendChild(row);
    return;
  }

  for (const venue of filtered) {
    const row = document.createElement("tr");

    addCell(row, venue.id);
    addCell(row, venue.name);
    addCell(row, venue.city);
    addCell(row, venue.capacity);
    addCell(row, `RM ${Number(venue.price_per_day).toFixed(2)}`);
    addCell(row, venue.status);

    const actions = document.createElement("td");

    addAction(actions, "View", () => viewVenue(venue.id));

    if (canManage()) {
      addAction(actions, "Edit", () => editVenue(venue.id));
    }

    if (currentUser?.role === "admin") {
      addAction(
        actions,
        "Delete",
        () => deleteVenue(venue.id, venue.name),
        "delete-button"
      );
    }

    row.appendChild(actions);
    list.appendChild(row);
  }
}

el("search").addEventListener("input", renderVenues);

el("refresh-button").addEventListener("click", async () => {
  const button = el("refresh-button");
  button.disabled = true;

  try {
    await loadVenues();
    showMessage("Venue list refreshed.", "success");
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    button.disabled = false;
  }
});

// View one venue.
async function viewVenue(id) {
  const venue = await apiRequest(`venues/${id}`);
  const content = el("details-content");
  content.replaceChildren();

  const details = [
    ["ID", venue.id],
    ["Name", venue.name],
    ["Address", venue.address],
    ["City", venue.city],
    ["Capacity", venue.capacity],
    ["Price per Day", `RM ${Number(venue.price_per_day).toFixed(2)}`],
    ["Status", venue.status],
    ["Created", venue.created_at],
    ["Updated", venue.updated_at]
  ];

  for (const [label, value] of details) {
    const term = document.createElement("dt");
    const description = document.createElement("dd");

    term.textContent = label;
    description.textContent = String(value);

    content.append(term, description);
  }

  el("venue-details").hidden = false;
  el("venue-details").scrollIntoView({ behavior: "smooth" });
}

el("close-details").addEventListener("click", () => {
  el("venue-details").hidden = true;
});

// Load a venue into the edit form.
async function editVenue(id) {
  const venue = await apiRequest(`venues/${id}`);

  el("venue-id").value = venue.id;
  el("venue-name").value = venue.name;
  el("address").value = venue.address;
  el("city").value = venue.city;
  el("capacity").value = venue.capacity;
  el("price").value = venue.price_per_day;
  el("status").value = venue.status;

  el("form-title").textContent = `Edit Venue #${venue.id}`;
  el("venue-editor").scrollIntoView({ behavior: "smooth" });
}

// Create or update a venue.
el("venue-form").addEventListener("submit", (event) => {
  event.preventDefault();

  runForm(event.currentTarget, async () => {
    const id = el("venue-id").value;

    const body = {
      name: el("venue-name").value.trim(),
      address: el("address").value.trim(),
      city: el("city").value.trim(),
      capacity: Number(el("capacity").value),
      price_per_day: el("price").value,
      status: el("status").value
    };

    await apiRequest(
      id ? `venues/${id}` : "venues",
      id ? "PATCH" : "POST",
      body
    );

    resetVenueForm();

    showMessage(
      id ? "Venue updated successfully." : "Venue created successfully.",
      "success"
    );

    await loadVenues();
  });
});

el("reset-button").addEventListener("click", resetVenueForm);

// Delete requires confirmation and an admin account.
async function deleteVenue(id, name) {
  if (!confirm(`Delete "${name}"? This action cannot be undone.`)) {
    return;
  }

  await apiRequest(`venues/${id}`, "DELETE");

  if (el("venue-id").value === String(id)) {
    resetVenueForm();
  }

  showMessage("Venue deleted successfully.", "success");
  await loadVenues();
}

// Populate the availability dropdown.
function populateAvailabilityVenues() {
  const select = el("availability-venue");
  const previousValue = select.value;

  select.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a venue";
  select.appendChild(placeholder);

  for (const venue of venues) {
    const option = document.createElement("option");
    option.value = venue.id;
    option.textContent = `${venue.name} (${venue.city})`;
    select.appendChild(option);
  }

  if (venues.some((venue) => String(venue.id) === previousValue)) {
    select.value = previousValue;
  }
}

// Check availability for the selected date and time.
el("availability-form").addEventListener("submit", (event) => {
  event.preventDefault();
  el("availability-result").textContent = "";

  runForm(event.currentTarget, async () => {
    const id = el("availability-venue").value;
    const start = el("start-time").value;
    const end = el("end-time").value;

    if (end <= start) {
      throw new Error("End time must be later than start time.");
    }

    const query = new URLSearchParams({
      date: el("availability-date").value,
      start_time: start,
      end_time: end
    });

    const data = await apiRequest(
      `venues/${id}/availability?${query}`
    );

    const result = el("availability-result");

    const conflicts = data.conflicting_events
      .map((event) =>
        `${event.title}: ${event.start_time}–${event.end_time}`
      )
      .join("\n");

    result.className = data.available ? "success" : "info";
    result.textContent = [
      data.available ? "Available" : "Not available",
      data.reason,
      conflicts,
      "Availability is a check only; it does not reserve the venue."
    ].filter(Boolean).join("\n");
  });
});