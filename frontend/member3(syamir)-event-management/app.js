/**
 * ============================================================================
 * Member 3: Event Management - Frontend Application Logic
 * Event Ticketing & Venue Booking System
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. CONFIGURATION & STATE
// ----------------------------------------------------------------------------
const CONFIG = {
  DEFAULT_API_BASE: 'http://localhost/event-ticketing/api',
  STORAGE_KEYS: {
    API_URL: 'event_mgmt_api_url',
    TOKEN: 'event_mgmt_token',
    USER: 'event_mgmt_user'
  }
};

let state = {
  apiBaseUrl: localStorage.getItem(CONFIG.STORAGE_KEYS.API_URL) || CONFIG.DEFAULT_API_BASE,
  token: localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN) || null,
  currentUser: null,
  venues: [],
  venuesMap: {}, // lookup by id

  // Browse View State
  browse: {
    events: [],
    page: 1,
    limit: 9,
    total: 0,
    pages: 1,
    filters: {
      search: '',
      category: '',
      venue_id: '',
      status: 'published'
    }
  },

  // Management View State
  manage: {
    events: [],
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
    filters: {
      search: '',
      category: '',
      venue_id: '',
      status: ''
    }
  },

  currentDeleteTarget: null,
  activeView: 'browse' // 'browse' | 'manage'
};

// Bootstrap Modal Instances
let modals = {};

// ----------------------------------------------------------------------------
// 2. INITIALIZATION
// ----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Bootstrap Modals
  initModals();

  // Restore User Session from localStorage
  restoreUserSession();

  // Update API URL display in top header
  updateApiDisplay();

  // Load Venues and Initial Event Data
  loadVenues().then(() => {
    loadBrowseEvents();
  });
});

function initModals() {
  const modalIds = [
    'loginModal',
    'eventFormModal',
    'eventDetailsModal',
    'deleteConfirmModal',
    'apiConfigModal'
  ];

  modalIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      modals[id] = new bootstrap.Modal(el);
    }
  });
}

function updateApiDisplay() {
  const el = document.getElementById('currentApiDisplay');
  const inputEl = document.getElementById('apiUrlInput');
  if (el) el.textContent = state.apiBaseUrl;
  if (inputEl) inputEl.value = state.apiBaseUrl;
}

// ----------------------------------------------------------------------------
// 3. API CLIENT HELPER
// ----------------------------------------------------------------------------
/**
 * Generic API request wrapper that automatically handles:
 * - Base URL prefixing
 * - Bearer JWT injection
 * - JSON serialization & deserialization
 * - Consistent success & error structures
 */
async function apiCall(endpoint, method = 'GET', body = null, requiresAuth = false) {
  let url = `${state.apiBaseUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;

  const headers = {
    'Accept': 'application/json'
  };

  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  } else if (requiresAuth) {
    showToast('Authentication Required', 'Please sign in to perform this action.', 'warning');
    if (modals.loginModal) modals.loginModal.show();
    return { success: false, message: 'Authentication required' };
  }

  const options = {
    method: method.toUpperCase(),
    headers
  };

  if (body && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    let data;

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = {
        success: response.ok,
        message: text || `HTTP ${response.status} ${response.statusText}`
      };
    }

    // Handle token expiration or unauthorized response
    if (response.status === 401 && state.token) {
      showToast('Session Expired', 'Your session has expired. Please log in again.', 'warning');
      logout(false);
    }

    return {
      ok: response.ok,
      status: response.status,
      ...data
    };
  } catch (error) {
    console.error('API Error:', error);
    showToast(
      'Network Error',
      `Cannot connect to API at: ${state.apiBaseUrl}. Please ensure Apache and MySQL are running in XAMPP.`,
      'danger'
    );
    return {
      success: false,
      ok: false,
      message: error.message || 'Network request failed'
    };
  }
}

// ----------------------------------------------------------------------------
// 4. AUTHENTICATION & ROLE MANAGEMENT
// ----------------------------------------------------------------------------
function restoreUserSession() {
  const storedUser = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
  if (storedUser && state.token) {
    try {
      state.currentUser = JSON.parse(storedUser);
    } catch (e) {
      state.currentUser = null;
      state.token = null;
    }
  }
  updateAuthUI();
}

/**
 * Update UI elements according to the active role
 */
function updateAuthUI() {
  const guestSection = document.getElementById('auth-guest-section');
  const userSection = document.getElementById('auth-user-section');
  const navManageItem = document.getElementById('nav-manage-item');
  const navCreateItem = document.getElementById('nav-create-item');
  const browseCreateBtnContainer = document.getElementById('browseCreateBtnContainer');
  const roleAlertBanner = document.getElementById('roleAlertBanner');
  const roleAlertText = document.getElementById('roleAlertText');
  const userNameDisplay = document.getElementById('userNameDisplay');
  const userRoleBadge = document.getElementById('userRoleBadge');
  const userAvatar = document.getElementById('userAvatar');
  const manageRolePermissionNote = document.getElementById('manageRolePermissionNote');

  if (state.currentUser && state.token) {
    // Logged in
    if (guestSection) guestSection.classList.add('d-none');
    if (userSection) {
      userSection.classList.remove('d-none');
      userSection.classList.add('d-flex');
    }

    if (userNameDisplay) userNameDisplay.textContent = state.currentUser.name || state.currentUser.email;
    if (userAvatar) {
      userAvatar.textContent = (state.currentUser.name ? state.currentUser.name.charAt(0) : 'U').toUpperCase();
    }

    // Role-specific styling
    const role = (state.currentUser.role || 'customer').toLowerCase();
    if (userRoleBadge) {
      userRoleBadge.textContent = role.toUpperCase();
      userRoleBadge.className = `badge rounded-pill text-xs px-2 ${
        role === 'admin' ? 'bg-danger' : role === 'organiser' ? 'bg-warning text-dark' : 'bg-info text-dark'
      }`;
    }

    const canManage = role === 'admin' || role === 'organiser';

    if (navManageItem) navManageItem.classList.toggle('d-none', !canManage);
    if (navCreateItem) navCreateItem.classList.toggle('d-none', !canManage);
    if (browseCreateBtnContainer) browseCreateBtnContainer.classList.toggle('d-none', !canManage);

    if (manageRolePermissionNote) {
      if (role === 'admin') {
        manageRolePermissionNote.textContent = '(Admin Access: Full control over all system events)';
      } else if (role === 'organiser') {
        manageRolePermissionNote.textContent = `(Organiser Access: You can create events and edit/delete your own events [ID #${state.currentUser.id}])`;
      }
    }

    if (role === 'customer') {
      if (roleAlertBanner) roleAlertBanner.classList.remove('d-none');
      if (roleAlertText) {
        roleAlertText.innerHTML = `Signed in as Customer (<strong>${escapeHtml(state.currentUser.name)}</strong>). You can browse events and ticket availability. Event creation and editing requires an <strong>Organiser</strong> or <strong>Admin</strong> account.`;
      }
    } else {
      if (roleAlertBanner) roleAlertBanner.classList.add('d-none');
    }
  } else {
    // Guest
    if (guestSection) guestSection.classList.remove('d-none');
    if (userSection) {
      userSection.classList.add('d-none');
      userSection.classList.remove('d-flex');
    }
    if (navManageItem) navManageItem.classList.add('d-none');
    if (navCreateItem) navCreateItem.classList.add('d-none');
    if (browseCreateBtnContainer) browseCreateBtnContainer.classList.add('d-none');
    if (roleAlertBanner) roleAlertBanner.classList.add('d-none');
  }
}

/**
 * Form submit handler for login
 */
async function handleLoginSubmit(event) {
  event.preventDefault();
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  const alertEl = document.getElementById('loginAlert');
  const submitBtn = document.getElementById('loginSubmitBtn');
  const btnText = document.getElementById('loginBtnText');
  const btnSpinner = document.getElementById('loginBtnSpinner');

  alertEl.classList.add('d-none');
  submitBtn.disabled = true;
  btnText.classList.add('d-none');
  btnSpinner.classList.remove('d-none');

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  const result = await apiCall('auth/login', 'POST', { email, password });

  submitBtn.disabled = false;
  btnText.classList.remove('d-none');
  btnSpinner.classList.add('d-none');

  if (result.success && result.data && result.data.token) {
    state.token = result.data.token;
    state.currentUser = result.data.user;

    localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, state.token);
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(state.currentUser));

    updateAuthUI();
    if (modals.loginModal) modals.loginModal.hide();
    emailInput.value = '';
    passwordInput.value = '';

    showToast(
      'Login Successful',
      `Welcome back, ${state.currentUser.name}! Logged in as ${state.currentUser.role.toUpperCase()}.`,
      'success'
    );

    // Refresh views to show authorized controls
    loadBrowseEvents();
    if (state.currentUser.role === 'admin' || state.currentUser.role === 'organiser') {
      loadManagementEvents();
    }
  } else {
    let errorMsg = result.message || 'Login failed. Please check your credentials.';
    if (result.errors) {
      errorMsg = Object.values(result.errors).join(' ');
    }
    alertEl.textContent = errorMsg;
    alertEl.classList.remove('d-none');
  }
}

/**
 * Preset account filler for video demonstrations
 */
function fillLoginForm(email, password) {
  document.getElementById('loginEmail').value = email;
  document.getElementById('loginPassword').value = password;
  document.getElementById('loginAlert').classList.add('d-none');
}

/**
 * 1-Click quick login from header demo bar
 */
async function quickLogin(role) {
  const credentials = {
    admin: { email: 'admin@event.com', password: 'Admin@123' },
    organiser: { email: 'hafiz@event.com', password: 'Organiser@123' },
    customer: { email: 'daniel@mail.com', password: 'Customer@123' }
  };

  const cred = credentials[role];
  if (!cred) return;

  showToast('Signing in...', `Authenticating as ${role.toUpperCase()}...`, 'info');

  const result = await apiCall('auth/login', 'POST', cred);
  if (result.success && result.data && result.data.token) {
    state.token = result.data.token;
    state.currentUser = result.data.user;

    localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, state.token);
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(state.currentUser));

    updateAuthUI();
    showToast(
      'Logged In',
      `Switched to account: ${state.currentUser.name} (${state.currentUser.role.toUpperCase()})`,
      'success'
    );

    loadBrowseEvents();
    if (state.currentUser.role === 'admin' || state.currentUser.role === 'organiser') {
      loadManagementEvents();
    }
  } else {
    showToast('Login Failed', result.message || 'Could not authenticate sample user.', 'danger');
  }
}

/**
 * Logout and clear session
 */
function logout(notify = true) {
  state.token = null;
  state.currentUser = null;
  localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
  localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);

  updateAuthUI();
  switchView('browse');
  loadBrowseEvents();

  if (notify) {
    showToast('Logged Out', 'You have been signed out successfully.', 'info');
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const icon = btn.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) {
      icon.classList.remove('bi-eye');
      icon.classList.add('bi-eye-slash');
    }
  } else {
    input.type = 'password';
    if (icon) {
      icon.classList.remove('bi-eye-slash');
      icon.classList.add('bi-eye-eye');
    }
  }
}

// ----------------------------------------------------------------------------
// 5. VIEW NAVIGATION
// ----------------------------------------------------------------------------
function switchView(viewName) {
  state.activeView = viewName;

  const browseView = document.getElementById('browse-view');
  const manageView = document.getElementById('manage-view');
  const navBrowse = document.getElementById('nav-browse');
  const navManage = document.getElementById('nav-manage');

  if (viewName === 'manage') {
    const role = state.currentUser ? state.currentUser.role : '';
    if (role !== 'admin' && role !== 'organiser') {
      showToast('Restricted Access', 'Event Management is only accessible to Admin and Organiser accounts.', 'warning');
      if (modals.loginModal) modals.loginModal.show();
      return;
    }

    if (browseView) browseView.classList.add('d-none');
    if (manageView) manageView.classList.remove('d-none');
    if (navBrowse) navBrowse.classList.remove('active');
    if (navManage) navManage.classList.add('active');

    loadManagementEvents();
  } else {
    // Browse View
    if (browseView) browseView.classList.remove('d-none');
    if (manageView) manageView.classList.add('d-none');
    if (navBrowse) navBrowse.classList.add('active');
    if (navManage) navManage.classList.remove('active');

    loadBrowseEvents();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ----------------------------------------------------------------------------
// 6. VENUES RETRIEVAL & CACHING
// ----------------------------------------------------------------------------
async function loadVenues() {
  const result = await apiCall('venues', 'GET');
  if (result.success && Array.isArray(result.data)) {
    state.venues = result.data;
    state.venuesMap = {};
    result.data.forEach(v => {
      state.venuesMap[v.id] = v;
    });

    populateVenueDropdowns();
  }
}

function populateVenueDropdowns() {
  const filterVenue = document.getElementById('filterVenue');
  const formVenue = document.getElementById('formVenue');

  if (filterVenue) {
    const currentVal = filterVenue.value;
    filterVenue.innerHTML = '<option value="">All Venues</option>';
    state.venues.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = `${v.name} (${v.city})`;
      filterVenue.appendChild(opt);
    });
    filterVenue.value = currentVal;
  }

  if (formVenue) {
    formVenue.innerHTML = '<option value="" disabled selected>Select venue...</option>';
    state.venues.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = `${v.name} - ${v.city} (Cap: ${v.capacity || '-'})`;
      formVenue.appendChild(opt);
    });
  }
}

// ----------------------------------------------------------------------------
// 7. BROWSE EVENTS (PUBLIC CATALOG)
// ----------------------------------------------------------------------------
async function loadBrowseEvents(page = 1) {
  state.browse.page = page;
  const grid = document.getElementById('eventsGrid');
  const countEl = document.getElementById('browseEventsCount');

  grid.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="text-muted mt-2">Loading upcoming events...</p>
    </div>
  `;

  // Build query string
  const query = new URLSearchParams();
  query.append('page', state.browse.page);
  query.append('limit', state.browse.limit);

  if (state.browse.filters.search) query.append('search', state.browse.filters.search);
  if (state.browse.filters.category) query.append('category', state.browse.filters.category);
  if (state.browse.filters.venue_id) query.append('venue_id', state.browse.filters.venue_id);
  if (state.browse.filters.status) query.append('status', state.browse.filters.status);

  const result = await apiCall(`events?${query.toString()}`, 'GET');

  if (result.success && Array.isArray(result.data)) {
    state.browse.events = result.data;

    // Handle pagination payload
    if (result.pagination) {
      state.browse.total = result.pagination.total ?? result.data.length;
      state.browse.pages = result.pagination.pages ?? result.pagination.total_pages ?? Math.ceil(state.browse.total / state.browse.limit) ?? 1;
    } else {
      state.browse.total = result.data.length;
      state.browse.pages = Math.ceil(state.browse.total / state.browse.limit) || 1;
    }

    if (countEl) countEl.textContent = state.browse.total;
    renderBrowseGrid(state.browse.events);
    renderPagination(
      'browsePaginationList',
      state.browse.page,
      state.browse.pages,
      loadBrowseEvents
    );
  } else {
    grid.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-exclamation-circle text-muted display-4"></i>
        <h5 class="mt-3 text-secondary">Unable to Load Events</h5>
        <p class="text-muted small">${escapeHtml(result.message || 'Check database connection and API status.')}</p>
        <button class="btn btn-outline-primary btn-sm rounded-pill mt-2" onclick="loadBrowseEvents()">
          <i class="bi bi-arrow-clockwise me-1"></i> Try Again
        </button>
      </div>
    `;
    if (countEl) countEl.textContent = '0';
  }
}

function renderBrowseGrid(events) {
  const grid = document.getElementById('eventsGrid');

  if (!events || events.length === 0) {
    grid.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="text-muted mb-3">
          <i class="bi bi-calendar-x display-3 text-secondary"></i>
        </div>
        <h5 class="fw-bold text-dark">No Events Found</h5>
        <p class="text-muted small">No events match your current filter criteria.</p>
        <button class="btn btn-primary rounded-pill btn-sm px-3" onclick="resetBrowseFilters()">
          Clear Filters
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = events.map(event => {
    const venue = state.venuesMap[event.venue_id] || { name: event.venue_name || 'Venue #' + event.venue_id, city: '' };
    const venueDisplay = event.venue_name || venue.name;
    const cityDisplay = venue.city ? `(${venue.city})` : '';

    const totalTickets = parseInt(event.total_tickets, 10) || 0;
    const availTickets = parseInt(event.available_tickets, 10) || 0;
    const ticketPct = totalTickets > 0 ? Math.round((availTickets / totalTickets) * 100) : 0;

    let progressColor = 'bg-success';
    if (ticketPct <= 10) progressColor = 'bg-danger';
    else if (ticketPct <= 40) progressColor = 'bg-warning';

    const priceDisplay = parseFloat(event.ticket_price) === 0 ? 'FREE' : `RM ${parseFloat(event.ticket_price).toFixed(2)}`;

    // Ownership check for quick actions
    const canManageEvent = canUserManageEvent(event);

    return `
      <div class="col-12 col-md-6 col-lg-4">
        <div class="event-card shadow-sm">
          <div class="event-card-header d-flex justify-content-between align-items-center">
            <span class="badge-category ${getCategoryBadgeClass(event.category)}">
              ${escapeHtml(event.category || 'General')}
            </span>
            <span class="badge-status ${getStatusBadgeClass(event.status)}">
              <span class="status-dot"></span>
              ${capitalize(event.status || 'draft')}
            </span>
          </div>

          <div class="event-card-body">
            <h3 class="event-title" onclick="viewEventDetails(${event.id})" title="Click to view details">
              ${escapeHtml(event.title)}
            </h3>
            <p class="event-desc-clamp">
              ${escapeHtml(event.description || 'No description provided for this event.')}
            </p>

            <div class="event-meta-item">
              <i class="bi bi-calendar-check text-primary"></i>
              <span>${formatDate(event.event_date)} &bull; ${formatTime(event.start_time)} - ${formatTime(event.end_time)}</span>
            </div>

            <div class="event-meta-item">
              <i class="bi bi-geo-alt-fill text-danger"></i>
              <span class="text-truncate">${escapeHtml(venueDisplay)} ${escapeHtml(cityDisplay)}</span>
            </div>

            <div class="d-flex justify-content-between align-items-baseline mt-3 pt-2 border-top">
              <div>
                <span class="text-muted small">Price</span>
                <div class="fw-bold fs-5 text-dark">${priceDisplay}</div>
              </div>
              <div class="text-end" style="min-width: 110px;">
                <div class="d-flex justify-content-between text-muted small mb-1">
                  <span>Tickets:</span>
                  <span class="fw-semibold text-dark">${availTickets} / ${totalTickets}</span>
                </div>
                <div class="ticket-progress">
                  <div class="progress-bar ${progressColor}" role="progressbar" style="width: ${ticketPct}%" aria-valuenow="${ticketPct}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="event-card-footer d-flex justify-content-between align-items-center">
            <button class="btn btn-outline-primary btn-sm rounded-pill px-3" onclick="viewEventDetails(${event.id})">
              <i class="bi bi-info-circle me-1"></i> Details
            </button>

            ${canManageEvent ? `
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-secondary" onclick="openEditModal(${event.id})" title="Edit event">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-outline-danger" onclick="promptDeleteEvent(${event.id}, '${escapeHtml(event.title)}')" title="Delete event">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function handleBrowseFilter(event) {
  event.preventDefault();
  state.browse.filters.search = document.getElementById('filterSearch').value.trim();
  state.browse.filters.category = document.getElementById('filterCategory').value;
  state.browse.filters.venue_id = document.getElementById('filterVenue').value;
  state.browse.filters.status = document.getElementById('filterStatus').value;

  updateActiveFilterSummary();
  loadBrowseEvents(1);
}

function resetBrowseFilters() {
  document.getElementById('filterSearch').value = '';
  document.getElementById('filterCategory').value = '';
  document.getElementById('filterVenue').value = '';
  document.getElementById('filterStatus').value = 'published';

  state.browse.filters = {
    search: '',
    category: '',
    venue_id: '',
    status: 'published'
  };

  updateActiveFilterSummary();
  loadBrowseEvents(1);
}

function updateActiveFilterSummary() {
  const summaryEl = document.getElementById('activeFiltersSummary');
  if (!summaryEl) return;

  const parts = [];
  if (state.browse.filters.search) parts.push(`"${state.browse.filters.search}"`);
  if (state.browse.filters.category) parts.push(state.browse.filters.category);
  if (state.browse.filters.status) parts.push(capitalize(state.browse.filters.status));

  if (parts.length > 0) {
    summaryEl.innerHTML = `<span class="badge bg-light text-dark border">Filters: ${parts.join(', ')}</span>`;
  } else {
    summaryEl.innerHTML = '';
  }
}

function changeBrowseLimit() {
  const select = document.getElementById('browseLimitSelect');
  state.browse.limit = parseInt(select.value, 10) || 9;
  loadBrowseEvents(1);
}

// ----------------------------------------------------------------------------
// 8. EVENT MANAGEMENT DASHBOARD (ADMIN & ORGANISER CRUD)
// ----------------------------------------------------------------------------
async function loadManagementEvents(page = 1) {
  state.manage.page = page;
  const tbody = document.getElementById('eventsTableBody');
  const infoEl = document.getElementById('managePaginationInfo');

  tbody.innerHTML = `
    <tr>
      <td colspan="9" class="text-center py-4 text-muted">
        <div class="spinner-border spinner-border-sm text-primary me-2"></div>
        Loading event management table...
      </td>
    </tr>
  `;

  const query = new URLSearchParams();
  query.append('page', state.manage.page);
  query.append('limit', state.manage.limit);

  const searchVal = document.getElementById('manageSearchInput').value.trim();
  const catVal = document.getElementById('manageCategorySelect').value;
  const statusVal = document.getElementById('manageStatusSelect').value;

  if (searchVal) query.append('search', searchVal);
  if (catVal) query.append('category', catVal);
  if (statusVal) query.append('status', statusVal);

  const result = await apiCall(`events?${query.toString()}`, 'GET');

  if (result.success && Array.isArray(result.data)) {
    state.manage.events = result.data;

    if (result.pagination) {
      state.manage.total = result.pagination.total ?? result.data.length;
      state.manage.pages = result.pagination.pages ?? result.pagination.total_pages ?? Math.ceil(state.manage.total / state.manage.limit) ?? 1;
    } else {
      state.manage.total = result.data.length;
      state.manage.pages = Math.ceil(state.manage.total / state.manage.limit) || 1;
    }

    const start = (state.manage.page - 1) * state.manage.limit + (state.manage.events.length > 0 ? 1 : 0);
    const end = Math.min(start + state.manage.events.length - 1, state.manage.total);
    if (infoEl) infoEl.textContent = `Showing ${start} to ${end} of ${state.manage.total} events`;

    renderManagementTable(state.manage.events);
    renderPagination(
      'managePaginationList',
      state.manage.page,
      state.manage.pages,
      loadManagementEvents
    );

    updateManagementMetrics(state.manage.events, state.manage.total);
  } else {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-4 text-danger">
          <i class="bi bi-exclamation-triangle me-1"></i>
          ${escapeHtml(result.message || 'Failed to load events for management.')}
        </td>
      </tr>
    `;
    if (infoEl) infoEl.textContent = 'Showing 0 to 0 of 0 events';
  }
}

function renderManagementTable(events) {
  const tbody = document.getElementById('eventsTableBody');

  if (!events || events.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-5 text-muted">
          <i class="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
          No events found matching your filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = events.map(event => {
    const venue = state.venuesMap[event.venue_id] || { name: event.venue_name || 'Venue #' + event.venue_id, city: '' };
    const venueName = event.venue_name || venue.name;
    const canManage = canUserManageEvent(event);
    const isOwner = state.currentUser && parseInt(event.organiser_id, 10) === parseInt(state.currentUser.id, 10);

    const priceText = parseFloat(event.ticket_price) === 0 ? 'FREE' : `RM ${parseFloat(event.ticket_price).toFixed(2)}`;
    const availTickets = parseInt(event.available_tickets, 10) || 0;
    const totalTickets = parseInt(event.total_tickets, 10) || 0;

    return `
      <tr>
        <td class="font-monospace fw-semibold text-muted">#${event.id}</td>
        <td>
          <div class="fw-bold text-dark">${escapeHtml(event.title)}</div>
          <div class="d-flex align-items-center gap-1 mt-1">
            <span class="badge-category ${getCategoryBadgeClass(event.category)}">
              ${escapeHtml(event.category || 'General')}
            </span>
            ${isOwner ? '<span class="badge bg-primary-subtle text-primary border border-primary-subtle ownership-pill">My Event</span>' : ''}
          </div>
        </td>
        <td>
          <div class="text-dark small fw-medium">${escapeHtml(venueName)}</div>
          <div class="text-muted small">${escapeHtml(venue.city || '')}</div>
        </td>
        <td>
          <div class="small fw-medium">${formatDate(event.event_date)}</div>
          <div class="text-muted small">${formatTime(event.start_time)} - ${formatTime(event.end_time)}</div>
        </td>
        <td class="fw-semibold text-dark">${priceText}</td>
        <td>
          <span class="badge bg-light text-dark border fw-medium px-2 py-1">
            ${availTickets} / ${totalTickets}
          </span>
        </td>
        <td>
          <div class="small">${escapeHtml(event.organiser_name || 'Organiser #' + event.organiser_id)}</div>
          <div class="text-muted text-xs font-monospace">UID: ${event.organiser_id}</div>
        </td>
        <td>
          <span class="badge-status ${getStatusBadgeClass(event.status)}">
            <span class="status-dot"></span>
            ${capitalize(event.status || 'draft')}
          </span>
        </td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-light border" onclick="viewEventDetails(${event.id})" title="View Details">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-outline-primary" 
                    onclick="openEditModal(${event.id})" 
                    ${!canManage ? 'disabled title="You can only edit events you created"' : 'title="Edit Event"'}>
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger" 
                    onclick="promptDeleteEvent(${event.id}, '${escapeHtml(event.title)}')" 
                    ${!canManage ? 'disabled title="You can only delete events you created"' : 'title="Delete Event"'}>
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function updateManagementMetrics(events, totalCount) {
  const totalEl = document.getElementById('metricTotalEvents');
  const pubEl = document.getElementById('metricPublishedEvents');
  const draftEl = document.getElementById('metricDraftEvents');
  const otherEl = document.getElementById('metricOtherEvents');

  if (totalEl) totalEl.textContent = totalCount || events.length;

  // Compute breakdown from currently fetched events
  let published = 0;
  let draft = 0;
  let other = 0;

  events.forEach(e => {
    const s = (e.status || '').toLowerCase();
    if (s === 'published') published++;
    else if (s === 'draft') draft++;
    else other++;
  });

  if (pubEl) pubEl.textContent = published;
  if (draftEl) draftEl.textContent = draft;
  if (otherEl) otherEl.textContent = other;
}

let manageSearchTimeout = null;
function debounceManageSearch() {
  clearTimeout(manageSearchTimeout);
  manageSearchTimeout = setTimeout(() => {
    loadManagementEvents(1);
  }, 350);
}

function resetManageFilters() {
  document.getElementById('manageSearchInput').value = '';
  document.getElementById('manageCategorySelect').value = '';
  document.getElementById('manageStatusSelect').value = '';
  loadManagementEvents(1);
}

// ----------------------------------------------------------------------------
// 9. CREATE & EDIT EVENT MODAL & CRUD SUBMISSION
// ----------------------------------------------------------------------------
function openCreateModal() {
  const role = state.currentUser ? state.currentUser.role : '';
  if (role !== 'admin' && role !== 'organiser') {
    showToast('Permission Denied', 'Please log in as an Admin or Organiser to create an event.', 'warning');
    if (modals.loginModal) modals.loginModal.show();
    return;
  }

  // Reset Form
  const form = document.getElementById('eventForm');
  form.reset();
  clearFormValidation();

  document.getElementById('eventFormId').value = '';
  document.getElementById('eventFormModalLabel').textContent = 'Create New Event';
  document.getElementById('eventFormModalSub').textContent = 'Fill in event details, timings, and ticket capacity.';
  document.getElementById('eventFormSubmitText').innerHTML = '<i class="bi bi-plus-circle me-1"></i> Create Event';
  document.getElementById('eventFormIcon').className = 'bi bi-calendar-plus-fill fs-4 text-warning';

  // Organiser Ownership info
  const orgDisplay = document.getElementById('formOrganiserDisplay');
  if (orgDisplay && state.currentUser) {
    orgDisplay.value = `${state.currentUser.name} (${state.currentUser.role.toUpperCase()} #${state.currentUser.id})`;
  }

  // Default values
  document.getElementById('formStatus').value = 'published';
  document.getElementById('formCategory').value = 'Music';
  document.getElementById('formTicketPrice').value = '50.00';
  document.getElementById('formTotalTickets').value = '200';
  document.getElementById('formAvailableTickets').value = '200';

  // Suggest date tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);
  document.getElementById('formDate').value = tomorrow.toISOString().split('T')[0];
  document.getElementById('formStartTime').value = '19:00';
  document.getElementById('formEndTime').value = '22:00';

  if (modals.eventFormModal) modals.eventFormModal.show();
}

async function openEditModal(eventId) {
  const role = state.currentUser ? state.currentUser.role : '';
  if (role !== 'admin' && role !== 'organiser') {
    showToast('Permission Denied', 'You must be signed in as an Admin or Organiser.', 'warning');
    return;
  }

  clearFormValidation();

  // Fetch full single event details
  const result = await apiCall(`events/${eventId}`, 'GET');
  if (!result.success || !result.data) {
    showToast('Error', result.message || 'Could not fetch event details for editing.', 'danger');
    return;
  }

  const event = result.data;

  // Permission check: Organiser can only edit their own events
  if (!canUserManageEvent(event)) {
    showToast('Unauthorized', 'You do not have permission to edit events created by other organisers.', 'warning');
    return;
  }

  // Populate Modal Fields
  document.getElementById('eventFormId').value = event.id;
  document.getElementById('eventFormModalLabel').textContent = `Edit Event #${event.id}`;
  document.getElementById('eventFormModalSub').textContent = `Update event parameters for "${event.title}"`;
  document.getElementById('eventFormSubmitText').innerHTML = '<i class="bi bi-check-circle me-1"></i> Update Event';
  document.getElementById('eventFormIcon').className = 'bi bi-pencil-square fs-4 text-warning';

  document.getElementById('formTitle').value = event.title || '';
  document.getElementById('formCategory').value = event.category || 'Community';
  document.getElementById('formVenue').value = event.venue_id || '';
  document.getElementById('formDate').value = event.event_date || '';
  document.getElementById('formStartTime').value = (event.start_time || '').substring(0, 5);
  document.getElementById('formEndTime').value = (event.end_time || '').substring(0, 5);
  document.getElementById('formTicketPrice').value = parseFloat(event.ticket_price || 0).toFixed(2);
  document.getElementById('formTotalTickets').value = event.total_tickets || 0;
  document.getElementById('formAvailableTickets').value = event.available_tickets || 0;
  document.getElementById('formStatus').value = event.status || 'draft';
  document.getElementById('formDescription').value = event.description || '';

  const orgDisplay = document.getElementById('formOrganiserDisplay');
  if (orgDisplay) {
    orgDisplay.value = `${event.organiser_name || 'Organiser'} (ID #${event.organiser_id})`;
  }

  if (modals.eventFormModal) modals.eventFormModal.show();
}

function handleTotalTicketsChange() {
  const id = document.getElementById('eventFormId').value;
  // If creating new event, sync available tickets with total tickets automatically
  if (!id) {
    const total = document.getElementById('formTotalTickets').value;
    document.getElementById('formAvailableTickets').value = total;
  }
}

async function handleEventFormSubmit(event) {
  event.preventDefault();
  clearFormValidation();

  const id = document.getElementById('eventFormId').value;
  const isEdit = Boolean(id);

  const title = document.getElementById('formTitle').value.trim();
  const category = document.getElementById('formCategory').value;
  const venueId = parseInt(document.getElementById('formVenue').value, 10);
  const eventDate = document.getElementById('formDate').value;
  const startTime = document.getElementById('formStartTime').value;
  const endTime = document.getElementById('formEndTime').value;
  const ticketPrice = parseFloat(document.getElementById('formTicketPrice').value);
  const totalTickets = parseInt(document.getElementById('formTotalTickets').value, 10);
  const availableTickets = parseInt(document.getElementById('formAvailableTickets').value, 10);
  const status = document.getElementById('formStatus').value;
  const description = document.getElementById('formDescription').value.trim();

  // Client-side Validation Checks
  const errors = {};
  if (!title) errors.title = 'Event title is required.';
  if (!category) errors.category = 'Please select a category.';
  if (!venueId || isNaN(venueId)) errors.venue_id = 'Please select a valid venue.';
  if (!eventDate) errors.event_date = 'Event date is required.';
  if (!startTime) errors.start_time = 'Start time is required.';
  if (!endTime) errors.end_time = 'End time is required.';
  if (startTime && endTime && endTime <= startTime) {
    errors.end_time = 'End time must be after start time.';
  }
  if (isNaN(ticketPrice) || ticketPrice < 0) errors.ticket_price = 'Price must be 0 or greater.';
  if (isNaN(totalTickets) || totalTickets < 1) errors.total_tickets = 'Total tickets must be at least 1.';
  if (isNaN(availableTickets) || availableTickets < 0) errors.available_tickets = 'Available tickets cannot be negative.';
  if (availableTickets > totalTickets) errors.available_tickets = 'Available tickets cannot exceed total tickets.';

  if (Object.keys(errors).length > 0) {
    applyFormValidationErrors(errors);
    return;
  }

  // Build Payload
  const payload = {
    title,
    category,
    venue_id: venueId,
    event_date: eventDate,
    start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
    end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
    ticket_price: ticketPrice,
    total_tickets: totalTickets,
    available_tickets: availableTickets,
    status,
    description
  };

  const submitBtn = document.getElementById('eventFormSubmitBtn');
  const btnText = document.getElementById('eventFormSubmitText');
  const btnSpinner = document.getElementById('eventFormSubmitSpinner');

  submitBtn.disabled = true;
  btnText.classList.add('d-none');
  btnSpinner.classList.remove('d-none');

  const endpoint = isEdit ? `events/${id}` : 'events';
  const method = isEdit ? 'PUT' : 'POST';

  const result = await apiCall(endpoint, method, payload, true);

  submitBtn.disabled = false;
  btnText.classList.remove('d-none');
  btnSpinner.classList.add('d-none');

  if (result.success) {
    showToast(
      isEdit ? 'Event Updated' : 'Event Created',
      result.message || `Successfully saved "${title}".`,
      'success'
    );

    if (modals.eventFormModal) modals.eventFormModal.hide();

    // Reload views to display changes
    loadBrowseEvents(state.browse.page);
    loadManagementEvents(state.manage.page);
  } else {
    if (result.errors) {
      applyFormValidationErrors(result.errors);
    }
    const alertEl = document.getElementById('eventFormAlert');
    alertEl.textContent = result.message || 'Failed to save event. Please verify all inputs.';
    alertEl.classList.remove('d-none');
  }
}

function clearFormValidation() {
  const alertEl = document.getElementById('eventFormAlert');
  alertEl.classList.add('d-none');
  alertEl.textContent = '';

  const fields = [
    'title', 'category', 'venue_id', 'event_date',
    'start_time', 'end_time', 'ticket_price',
    'total_tickets', 'available_tickets', 'status', 'description'
  ];

  fields.forEach(field => {
    const input = document.getElementById(`form${capitalize(field).replace(/_([a-z])/g, (_, l) => l.toUpperCase())}`) || document.getElementById(`form${field}`);
    const errEl = document.getElementById(`err-${field}`);
    if (input) input.classList.remove('is-invalid');
    if (errEl) errEl.textContent = '';
  });
}

function applyFormValidationErrors(errors) {
  const alertEl = document.getElementById('eventFormAlert');
  alertEl.classList.remove('d-none');
  alertEl.textContent = 'Please fix the highlighted form errors.';

  for (const [key, msg] of Object.entries(errors)) {
    const errEl = document.getElementById(`err-${key}`);
    if (errEl) errEl.textContent = msg;

    // Map keys to inputs
    let inputId = `form${capitalize(key).replace(/_([a-z])/g, (_, l) => l.toUpperCase())}`;
    let input = document.getElementById(inputId);
    if (!input) input = document.getElementById(`form${key}`);
    if (input) input.classList.add('is-invalid');
  }
}

// ----------------------------------------------------------------------------
// 10. DELETE EVENT
// ----------------------------------------------------------------------------
function promptDeleteEvent(eventId, eventTitle) {
  state.currentDeleteTarget = { id: eventId, title: eventTitle };
  document.getElementById('deleteTargetTitle').textContent = `"${eventTitle}" (#${eventId})`;
  if (modals.deleteConfirmModal) modals.deleteConfirmModal.show();
}

async function executeDeleteEvent() {
  if (!state.currentDeleteTarget) return;

  const btn = document.getElementById('confirmDeleteBtn');
  const btnText = document.getElementById('deleteBtnText');
  const btnSpinner = document.getElementById('deleteBtnSpinner');

  btn.disabled = true;
  btnText.classList.add('d-none');
  btnSpinner.classList.remove('d-none');

  const { id, title } = state.currentDeleteTarget;
  const result = await apiCall(`events/${id}`, 'DELETE', null, true);

  btn.disabled = false;
  btnText.classList.remove('d-none');
  btnSpinner.classList.add('d-none');

  if (modals.deleteConfirmModal) modals.deleteConfirmModal.hide();
  state.currentDeleteTarget = null;

  if (result.success) {
    showToast('Event Deleted', result.message || `Event "${title}" has been deleted.`, 'success');
    loadBrowseEvents(state.browse.page);
    loadManagementEvents(state.manage.page);
  } else {
    showToast('Delete Failed', result.message || 'Could not delete event. It may have existing customer bookings.', 'danger');
  }
}

// ----------------------------------------------------------------------------
// 11. EVENT DETAILS MODAL
// ----------------------------------------------------------------------------
async function viewEventDetails(eventId) {
  const result = await apiCall(`events/${eventId}`, 'GET');
  if (!result.success || !result.data) {
    showToast('Error', result.message || 'Failed to load event details.', 'danger');
    return;
  }

  const ev = result.data;
  const venue = state.venuesMap[ev.venue_id] || {
    name: ev.venue_name || 'Venue #' + ev.venue_id,
    address: ev.venue_address || 'Address on file',
    city: ev.venue_city || '',
    capacity: ev.venue_capacity || '-'
  };

  document.getElementById('detailIdBadge').textContent = `#${ev.id}`;
  document.getElementById('detailTitle').textContent = ev.title;

  const catBadge = document.getElementById('detailCategoryBadge');
  catBadge.textContent = ev.category || 'General';
  catBadge.className = `badge rounded-pill ${getCategoryBadgeClass(ev.category)}`;

  const statusBadge = document.getElementById('detailStatusBadge');
  statusBadge.textContent = capitalize(ev.status || 'draft');
  statusBadge.className = `badge rounded-pill ${getStatusBadgeClass(ev.status)}`;

  document.getElementById('detailDescription').textContent = ev.description || 'No detailed description provided.';
  document.getElementById('detailVenueName').textContent = ev.venue_name || venue.name;
  document.getElementById('detailVenueAddress').textContent = `${venue.address || ''}${venue.city ? ', ' + venue.city : ''}`;
  document.getElementById('detailVenueCapacity').textContent = venue.capacity || '-';

  document.getElementById('detailDate').textContent = formatDate(ev.event_date);
  document.getElementById('detailTime').textContent = `${formatTime(ev.start_time)} - ${formatTime(ev.end_time)}`;

  const priceVal = parseFloat(ev.ticket_price);
  document.getElementById('detailPrice').textContent = priceVal === 0 ? 'FREE' : `RM ${priceVal.toFixed(2)}`;

  const total = parseInt(ev.total_tickets, 10) || 0;
  const avail = parseInt(ev.available_tickets, 10) || 0;
  document.getElementById('detailTicketsFraction').textContent = `${avail} / ${total}`;

  const pct = total > 0 ? Math.round((avail / total) * 100) : 0;
  const bar = document.getElementById('detailProgressBar');
  bar.style.width = `${pct}%`;
  bar.className = `progress-bar ${pct <= 10 ? 'bg-danger' : pct <= 40 ? 'bg-warning' : 'bg-success'}`;

  document.getElementById('detailOrganiserName').textContent = ev.organiser_name || 'Event Organiser';
  document.getElementById('detailOrganiserId').textContent = `ID #${ev.organiser_id}`;

  // Action Buttons in Details Modal
  const actionsContainer = document.getElementById('detailActionButtons');
  if (canUserManageEvent(ev)) {
    actionsContainer.innerHTML = `
      <button class="btn btn-outline-primary btn-sm rounded-pill px-3" onclick="modals.eventDetailsModal.hide(); openEditModal(${ev.id})">
        <i class="bi bi-pencil me-1"></i> Edit Event
      </button>
      <button class="btn btn-outline-danger btn-sm rounded-pill px-3" onclick="modals.eventDetailsModal.hide(); promptDeleteEvent(${ev.id}, '${escapeHtml(ev.title)}')">
        <i class="bi bi-trash me-1"></i> Delete
      </button>
    `;
  } else {
    actionsContainer.innerHTML = '';
  }

  if (modals.eventDetailsModal) modals.eventDetailsModal.show();
}

// ----------------------------------------------------------------------------
// 12. PERMISSION CHECKS & RBAC
// ----------------------------------------------------------------------------
function canUserManageEvent(event) {
  if (!state.currentUser || !state.token) return false;
  const role = state.currentUser.role;
  if (role === 'admin') return true;
  if (role === 'organiser') {
    return parseInt(event.organiser_id, 10) === parseInt(state.currentUser.id, 10);
  }
  return false;
}

// ----------------------------------------------------------------------------
// 13. API CONFIGURATION MODAL HANDLERS
// ----------------------------------------------------------------------------
function saveApiUrl() {
  const input = document.getElementById('apiUrlInput');
  const newUrl = input.value.trim().replace(/\/+$/, '');
  if (newUrl) {
    state.apiBaseUrl = newUrl;
    localStorage.setItem(CONFIG.STORAGE_KEYS.API_URL, newUrl);
    updateApiDisplay();
    if (modals.apiConfigModal) modals.apiConfigModal.hide();
    showToast('API Updated', `API Base URL set to: ${newUrl}`, 'info');
    loadVenues().then(() => {
      loadBrowseEvents(1);
      if (state.activeView === 'manage') loadManagementEvents(1);
    });
  }
}

function resetApiUrl() {
  state.apiBaseUrl = CONFIG.DEFAULT_API_BASE;
  localStorage.removeItem(CONFIG.STORAGE_KEYS.API_URL);
  updateApiDisplay();
  if (modals.apiConfigModal) modals.apiConfigModal.hide();
  showToast('API Reset', `API Base URL reset to default: ${CONFIG.DEFAULT_API_BASE}`, 'info');
  loadVenues().then(() => {
    loadBrowseEvents(1);
    if (state.activeView === 'manage') loadManagementEvents(1);
  });
}

// ----------------------------------------------------------------------------
// 14. PAGINATION HELPER
// ----------------------------------------------------------------------------
function renderPagination(containerId, currentPage, totalPages, onPageClick) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';

  // Prev Button
  html += `
    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="event.preventDefault(); if(${currentPage > 1}) ${onPageClick.name}(${currentPage - 1});">
        <i class="bi bi-chevron-left"></i>
      </a>
    </li>
  `;

  // Numbered pages
  for (let i = 1; i <= totalPages; i++) {
    // Show first, last, current, and neighbours
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      html += `
        <li class="page-item ${i === currentPage ? 'active' : ''}">
          <a class="page-link" href="#" onclick="event.preventDefault(); ${onPageClick.name}(${i});">${i}</a>
        </li>
      `;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
  }

  // Next Button
  html += `
    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="event.preventDefault(); if(${currentPage < totalPages}) ${onPageClick.name}(${currentPage + 1});">
        <i class="bi bi-chevron-right"></i>
      </a>
    </li>
  `;

  container.innerHTML = html;
}

// ----------------------------------------------------------------------------
// 15. TOAST NOTIFICATION UTILITY
// ----------------------------------------------------------------------------
function showToast(title, message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toastId = 'toast-' + Math.random().toString(36).substr(2, 9);

  const iconMap = {
    success: 'bi-check-circle-fill text-success',
    danger: 'bi-exclamation-triangle-fill text-danger',
    warning: 'bi-exclamation-circle-fill text-warning',
    info: 'bi-info-circle-fill text-primary'
  };

  const icon = iconMap[type] || iconMap.info;

  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center border-0 shadow" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header">
        <i class="bi ${icon} me-2 fs-5"></i>
        <strong class="me-auto text-dark">${escapeHtml(title)}</strong>
        <small class="text-muted">just now</small>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body bg-white text-secondary">
        ${escapeHtml(message)}
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', toastHtml);
  const toastElement = document.getElementById(toastId);
  const bsToast = new bootstrap.Toast(toastElement, { delay: 4500 });
  bsToast.show();

  toastElement.addEventListener('hidden.bs.toast', () => {
    toastElement.remove();
  });
}

// ----------------------------------------------------------------------------
// 16. FORMATTING & STRING HELPERS
// ----------------------------------------------------------------------------
function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-MY', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
}

function formatTime(timeStr) {
  if (!timeStr) return '-';
  try {
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  } catch (e) {
    return timeStr;
  }
}

function getCategoryBadgeClass(category) {
  const c = (category || '').toLowerCase();
  switch (c) {
    case 'music': return 'cat-music';
    case 'technology': return 'cat-technology';
    case 'charity': return 'cat-charity';
    case 'entertainment': return 'cat-entertainment';
    case 'business': return 'cat-business';
    case 'sports': return 'cat-sports';
    default: return 'cat-community';
  }
}

function getStatusBadgeClass(status) {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'published': return 'status-published';
    case 'draft': return 'status-draft';
    case 'cancelled': return 'status-cancelled';
    case 'completed': return 'status-completed';
    default: return 'status-draft';
  }
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
