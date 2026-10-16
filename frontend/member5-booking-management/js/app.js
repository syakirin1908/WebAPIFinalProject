/**
 * Member 5: Booking & Ticket Management Frontend Logic
 */

const API_BASE = 'http://localhost/event-ticketing/api';

let token = localStorage.getItem('m5_token') || '';
let user = JSON.parse(localStorage.getItem('m5_user') || 'null');
let eventsList = [];
let bookingsList = [];

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  loadPublishedEvents();
  loadBookings();
});

// Update Header Authentication View
function updateAuthUI() {
  const userInfo = document.getElementById('userInfo');
  const loginBar = document.getElementById('loginBar');

  if (token && user) {
    userInfo.classList.remove('hidden');
    loginBar.classList.add('hidden');
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
    document.getElementById('userRole').textContent = user.role.toUpperCase();
  } else {
    userInfo.classList.add('hidden');
    loginBar.classList.remove('hidden');
  }
}

// Show Alert Notification
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 4000);
}

// Generic API Request Helper
async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  try {
    const res = await fetch(`${API_BASE}/${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'API request failed.');
    return data;
  } catch (err) {
    showToast(`Error: ${err.message}`);
    return { success: false };
  }
}

// 1. Load Published Events for Selector Dropdown
async function loadPublishedEvents() {
  const select = document.getElementById('eventSelect');
  select.innerHTML = '<option value="" disabled selected>Loading published events...</option>';

  const res = await apiCall('events?status=published');
  if (res.success && Array.isArray(res.data)) {
    eventsList = res.data;
    select.innerHTML = '<option value="" disabled selected>Select an event...</option>';
    
    eventsList.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = `${e.title} — RM ${parseFloat(e.ticket_price).toFixed(2)} (${e.available_tickets} left)`;
      select.appendChild(opt);
    });
  } else {
    select.innerHTML = '<option value="" disabled selected>No published events available</option>';
  }
}

// 2. Live Calculation for Booking Form
function updateBookingCalculation() {
  const eventId = parseInt(document.getElementById('eventSelect').value);
  const qty = parseInt(document.getElementById('quantityInput').value) || 1;
  const event = eventsList.find(e => parseInt(e.id) === eventId);

  if (event) {
    const price = parseFloat(event.ticket_price);
    const total = price * qty;
    document.getElementById('calcPrice').textContent = `RM ${price.toFixed(2)}`;
    document.getElementById('calcTotal').textContent = `RM ${total.toFixed(2)}`;
  }
}

// 3. Create Booking (POST /bookings)
async function handleCreateBooking(event) {
  event.preventDefault();
  if (!token) {
    showToast('Please log in as a customer first.');
    openLoginModal();
    return;
  }

  const event_id = parseInt(document.getElementById('eventSelect').value);
  const quantity = parseInt(document.getElementById('quantityInput').value);

  if (!event_id || !quantity) return showToast('Please select an event and quantity.');

  const res = await apiCall('bookings', 'POST', { event_id, quantity });

  if (res.success) {
    showToast('Booking created successfully!');
    document.getElementById('bookingForm').reset();
    document.getElementById('calcPrice').textContent = 'RM 0.00';
    document.getElementById('calcTotal').textContent = 'RM 0.00';
    
    await loadPublishedEvents();
    await loadBookings();
  }
}

// 4. Fetch Bookings List (GET /bookings)
async function loadBookings() {
  if (!token) {
    renderBookingsTable([]);
    return;
  }

  const res = await apiCall('bookings');
  if (res.success && Array.isArray(res.data)) {
    bookingsList = res.data;
    updateMetrics();
    renderBookings();
  }
}

// Render Filtered Bookings Table
function renderBookings() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const status = document.getElementById('statusFilter').value;

  const filtered = bookingsList.filter(b => {
    const matchSearch = b.booking_ref.toLowerCase().includes(search) || (b.event_title || '').toLowerCase().includes(search);
    const matchStatus = !status || b.status === status;
    return matchSearch && matchStatus;
  });

  renderBookingsTable(filtered);
}

function renderBookingsTable(rows) {
  const tbody = document.getElementById('bookingsTableBody');
  tbody.innerHTML = '';

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">No bookings found.</td></tr>';
    return;
  }

  rows.forEach(b => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><b>${b.booking_ref}</b></td>
      <td>${b.event_title || 'Event #' + b.event_id}<br><small class="card-subtitle">${b.event_date || ''}</small></td>
      <td>${b.customer_name || 'User #' + b.user_id}</td>
      <td>${b.quantity}</td>
      <td><b>RM ${parseFloat(b.total_price).toFixed(2)}</b></td>
      <td><span class="badge badge-${b.status}">${b.status}</span></td>
      <td>
        ${b.qr_code_url && b.status !== 'cancelled' 
          ? `<img src="${b.qr_code_url}" class="qr-thumb" onclick="previewTicket('${b.booking_ref}', '${b.event_title}', '${b.event_date}',${b.quantity}, ${b.total_price}, '${b.qr_code_url}')" title="Click to view QR ticket">` 
          : '-'}
      </td>
      <td>
        ${b.status !== 'cancelled' 
          ? `<button class="btn btn-danger btn-sm" onclick="cancelBooking(${b.id})">Cancel</button>` 
          : '<span class="card-subtitle">Cancelled</span>'}
      </td>
    `;
    tbody.appendChild(row);
  });
}

// 5. Update Top Metrics
function updateMetrics() {
  document.getElementById('metricTotal').textContent = bookingsList.length;
  document.getElementById('metricConfirmed').textContent = bookingsList.filter(b => b.status === 'confirmed').length;
  document.getElementById('metricCancelled').textContent = bookingsList.filter(b => b.status === 'cancelled').length;
}

// 6. Cancel Booking (PUT /bookings/{id})
async function cancelBooking(id) {
  if (!confirm('Are you sure you want to cancel this booking? Tickets will be returned to inventory.')) return;

  const res = await apiCall(`bookings/${id}`, 'PUT', { status: 'cancelled' });
  if (res.success) {
    showToast('Booking cancelled.');
    await loadPublishedEvents();
    await loadBookings();
  }
}

// Modal & Quick Demo Actions
function openLoginModal() { document.getElementById('loginModal').classList.remove('hidden'); }
function closeLoginModal() { document.getElementById('loginModal').classList.add('hidden'); }

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  const res = await apiCall('auth/login', 'POST', { email, password });
  if (res.success && res.data) {
    token = res.data.token;
    user = res.data.user;
    localStorage.setItem('m5_token', token);
    localStorage.setItem('m5_user', JSON.stringify(user));

    updateAuthUI();
    closeLoginModal();
    showToast(`Welcome back, ${user.name}!`);
    await loadBookings();
  }
}

async function quickLogin(role) {
  const creds = {
    customer: { email: 'daniel@mail.com', password: 'Customer@123' },
    admin: { email: 'admin@event.com', password: 'Admin@123' }
  };
  const res = await apiCall('auth/login', 'POST', creds[role]);
  if (res.success && res.data) {
    token = res.data.token;
    user = res.data.user;
    localStorage.setItem('m5_token', token);
    localStorage.setItem('m5_user', JSON.stringify(user));

    updateAuthUI();
    showToast(`Logged in as ${user.name} (${user.role.toUpperCase()})`);
    await loadBookings();
  }
}

function logout() {
  token = '';
  user = null;
  localStorage.removeItem('m5_token');
  localStorage.removeItem('m5_user');
  updateAuthUI();
  showToast('Logged out.');
  loadBookings();
}

// Ticket QR Code Preview Modal
function previewTicket(ref, title, date, qty, total, qrUrl) {
  document.getElementById('ticketRef').textContent = ref;
  document.getElementById('ticketEventTitle').textContent = title;
  document.getElementById('ticketDate').textContent = date;
  document.getElementById('ticketQty').textContent = qty;
  document.getElementById('ticketTotal').textContent = `RM ${parseFloat(total).toFixed(2)}`;
  document.getElementById('ticketQrImage').src = qrUrl;
  document.getElementById('ticketModal').classList.remove('hidden');
}

function closeTicketModal() {
  document.getElementById('ticketModal').classList.add('hidden');
}