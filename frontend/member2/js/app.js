'use strict';
/* EventHub - one frontend for Administrator, Organiser and Customer (role-based pages). */
const $ = (s, e = document) => e.querySelector(s);
const $$ = (s, e = document) => [...e.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => 'RM ' + Number(n || 0).toFixed(2);
const fdate = d => d ? new Date(String(d).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const ftime = t => String(t || '').slice(0, 5);
const toast = (m, t = 'ok') => { const e = document.createElement('div'); e.className = 'toast ' + t; e.textContent = m; $('#toasts').append(e); setTimeout(() => e.remove(), 4500); };

/* ---------- API layer (JWT sent on every request) ---------- */
const session = {
  token: () => localStorage.getItem('token'),
  user: () => JSON.parse(localStorage.getItem('user') || 'null'),
  save(t, u) { localStorage.setItem('token', t); localStorage.setItem('user', JSON.stringify(u)); },
  clear() { localStorage.removeItem('token'); localStorage.removeItem('user'); }
};
async function api(method, path, body) {
  const h = { 'Content-Type': 'application/json' };
  if (session.token()) h.Authorization = 'Bearer ' + session.token();
  let res, json = null;
  try { res = await fetch(API_BASE + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }); }
  catch { throw { message: 'Cannot reach the server. Start Apache and MySQL, and check API_BASE in js/config.js.', errors: {} }; }
  try { json = await res.json(); } catch { }
  if (!res.ok || (json && json.success === false)) {
    if (res.status === 401 && session.token() && !path.startsWith('/auth/login')) {
      session.clear(); toast('Session expired. Please log in again.', 'err'); go('/login');
    }
    throw { status: res.status, message: (json && json.message) || `Request failed (${res.status}).`, errors: (json && json.errors) || {} };
  }
  return json || {};
}
const get = p => api('GET', p), post = (p, b) => api('POST', p, b), put = (p, b) => api('PUT', p, b), del = p => api('DELETE', p);
const list = async p => (await get(p + (p.includes('?') ? '&' : '?') + 'limit=100')).data || [];

/* ---------- forms, validation, modal ---------- */
const fail = errors => { throw { message: 'Please correct the highlighted fields.', errors }; };
const field = (label, name, input) => `<label class="f"><span>${label}</span>${input}<small class="err" data-for="${name}"></small></label>`;
const inp = (name, val = '', type = 'text', extra = '') => `<input name="${name}" type="${type}" value="${esc(val)}" ${extra}>`;
const sel = (name, opts, val) => `<select name="${name}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
function bind(f, onSubmit) {
  f.onsubmit = async e => {
    e.preventDefault(); $$('.err', f).forEach(x => x.textContent = ''); $('.ferr', f).textContent = '';
    const b = $('button:not([type=button])', f); b.disabled = true;
    try { await onSubmit(Object.fromEntries(new FormData(f)), f); }
    catch (er) {
      $('.ferr', f).textContent = er.message || 'Something went wrong.';
      Object.entries(er.errors || {}).forEach(([k, v]) => { const s = $(`.err[data-for="${k}"]`, f); if (s) s.textContent = v; });
    } finally { b.disabled = false; }
  };
}
function modal(title, body, onSubmit, label = 'Save') {
  const m = $('#modal');
  m.innerHTML = `<div class="box"><div class="head"><h3>${esc(title)}</h3><button class="x" data-close>&times;</button></div><form novalidate>${body}<p class="ferr"></p><div class="actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn">${esc(label)}</button></div></form></div>`;
  m.classList.add('open');
  m.onclick = e => { if (e.target === m || e.target.dataset.close !== undefined) closeModal(); };
  const f = $('form', m); bind(f, onSubmit); return f;
}
const closeModal = () => { $('#modal').classList.remove('open'); $('#modal').innerHTML = ''; };
const acts = (v, map) => {
  v.onclick = async e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    try { await map[b.dataset.a](b.dataset.id, b); } catch (er) { toast(er.message, 'err'); }
  };
};
const EMAIL = /^\S+@\S+\.\S+$/, PHONE = /^[0-9+\-\s]{7,20}$/;
const strong = p => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

/* ---------- login / register ---------- */
function authPage(mode) {
  const reg = mode === 'register';
  $('#app').innerHTML = `<div class="auth"><div class="card"><h1>🎫 EventHub</h1><p class="muted">Event ticketing &amp; venue booking</p>
  <div class="tabs"><a href="#/login" class="${reg ? '' : 'on'}">Log in</a><a href="#/register" class="${reg ? 'on' : ''}">Register</a></div>
  <form id="af" novalidate>${reg ? field('Full name', 'name', inp('name')) : ''}${field('Email', 'email', inp('email', '', 'email'))}${reg ? field('Phone (optional)', 'phone', inp('phone')) : ''}${field('Password', 'password', inp('password', '', 'password'))}${reg ? field('Confirm password', 'password2', inp('password2', '', 'password')) : ''}<p class="ferr"></p><button class="btn block">${reg ? 'Create account' : 'Log in'}</button></form>
  ${reg ? '' : `<div class="demo"><span>Demo:</span>${[['Admin', 'admin@event.com', 'Admin@123'], ['Organiser', 'hafiz@event.com', 'Organiser@123'], ['Customer', 'daniel@mail.com', 'Customer@123']].map(a => `<button type="button" data-e="${a[1]}" data-p="${a[2]}">${a[0]}</button>`).join('')}</div>`}</div></div>`;
  $$('.demo button').forEach(b => b.onclick = () => { $('[name=email]').value = b.dataset.e; $('[name=password]').value = b.dataset.p; });
  bind($('#af'), async d => {
    const e = {};
    if (!EMAIL.test(d.email.trim())) e.email = 'Enter a valid email address.';
    if (!d.password) e.password = 'Password is required.';
    if (reg) {
      if (d.name.trim().length < 2) e.name = 'Name must be at least 2 characters.';
      if (d.password && !strong(d.password)) e.password = 'At least 8 characters with letters and numbers.';
      if (d.password !== d.password2) e.password2 = 'Passwords do not match.';
      if (d.phone && !PHONE.test(d.phone)) e.phone = 'Phone must be 7-20 digits.';
    }
    if (Object.keys(e).length) fail(e);
    if (reg) { await post('/auth/register', { name: d.name.trim(), email: d.email.trim(), password: d.password, phone: d.phone || null }); toast('Account created. Logging you in...'); }
    const r = (await post('/auth/login', { email: d.email.trim(), password: d.password })).data;
    session.save(r.token, r.user); go(home(r.user.role));
  });
}

/* ---------- shell + router ---------- */
const NAV = {
  customer: [['/events', 'Browse Events'], ['/my-bookings', 'My Bookings']],
  organiser: [['/manage-events', 'My Events'], ['/bookings', 'Bookings'], ['/events', 'Browse']],
  admin: [['/users', 'Users'], ['/venues', 'Venues'], ['/manage-events', 'Events'], ['/bookings', 'Bookings']]
};
const home = r => NAV[r][0][0];
const go = h => { if (location.hash === '#' + h) route(); else location.hash = h; };
const ROUTES = { '/events': eventsPage, '/my-bookings': myBookings, '/manage-events': manageEvents, '/bookings': allBookings, '/users': usersPage, '/venues': venuesPage };
async function route() {
  const path = location.hash.slice(1), u = session.user();
  if (!u || !session.token()) return authPage(path === '/register' ? 'register' : 'login');
  if (!NAV[u.role] || !NAV[u.role].some(n => n[0] === path)) return go(NAV[u.role] ? home(u.role) : '/login');
  if (!$('#view')) {
    $('#app').innerHTML = `<header class="top"><b class="brand">🎫 EventHub</b><nav id="nav"></nav><span class="who">${esc(u.name)} <em class="badge r-${u.role}">${u.role}</em></span><button class="btn ghost sm" id="out">Log out</button></header><main id="view"></main>`;
    $('#out').onclick = () => { session.clear(); go('/login'); };
  }
  $('#nav').innerHTML = NAV[u.role].map(([p, l]) => `<a href="#${p}" class="${p === path ? 'on' : ''}">${l}</a>`).join('');
  closeModal(); const v = $('#view'); v.onclick = null; v.innerHTML = '<p class="muted">Loading...</p>';
  try { await ROUTES[path](v, u); } catch (e) { v.innerHTML = `<div class="alert">${esc(e.message)}</div>`; }
}

/* ---------- Customer + all: browse events, book ---------- */
async function eventsPage(v, u) {
  const [evs, vens] = await Promise.all([list('/events'), list('/venues').catch(() => [])]);
  const vn = Object.fromEntries(vens.map(x => [x.id, x.name]));
  const pub = evs.filter(e => e.status === 'published'), today = new Date().toISOString().slice(0, 10);
  const cats = [...new Set(pub.map(e => e.category).filter(Boolean))].sort();
  v.innerHTML = `<div class="bar"><h2>Browse Events</h2><div class="filters"><input id="q" placeholder="Search events..."><select id="cat"><option value="">All categories</option>${cats.map(c => `<option>${esc(c)}</option>`).join('')}</select><label class="chk"><input type="checkbox" id="av"> Available only</label></div></div><div id="grid" class="grid"></div>`;
  const draw = () => {
    const q = $('#q').value.toLowerCase(), c = $('#cat').value, av = $('#av').checked;
    const rows = pub.filter(e => (!c || e.category === c) && (!av || e.available_tickets > 0) &&
      (e.title + ' ' + (e.description || '') + ' ' + (vn[e.venue_id] || '')).toLowerCase().includes(q));
    $('#grid').innerHTML = rows.length ? rows.map(e => {
      const left = Number(e.available_tickets), past = String(e.event_date).slice(0, 10) < today;
      return `<article class="ev"><div class="band c-${esc(String(e.category || '').toLowerCase())}">${esc(e.category || 'Event')}</div><div class="in"><h3>${esc(e.title)}</h3><p class="muted">${esc(e.description)}</p><p>📅 ${fdate(e.event_date)} · ${ftime(e.start_time)}-${ftime(e.end_time)}<br>📍 ${esc(vn[e.venue_id] || e.venue_name || 'Venue #' + e.venue_id)}</p><div class="row"><b>${e.ticket_price > 0 ? money(e.ticket_price) : 'Free'}</b><span class="avail ${left <= 0 ? 'out' : left <= 20 ? 'low' : ''}">${left <= 0 ? 'Sold out' : left <= 20 ? `Only ${left} left` : `${left} available`}</span></div>${u.role === 'customer' ? `<button class="btn block" data-a="book" data-id="${e.id}" ${left <= 0 || past ? 'disabled' : ''}>${past ? 'Event ended' : left <= 0 ? 'Sold out' : 'Book now'}</button>` : ''}</div></article>`;
    }).join('') : '<p class="empty">No events match your search.</p>';
  };
  ['q', 'cat', 'av'].forEach(i => $('#' + i).oninput = draw); draw();
  acts(v, {
    book: async id => {
      const ev = evs.find(e => e.id == id), max = Math.min(10, Number(ev.available_tickets));
      const f = modal('Book: ' + ev.title, `<p class="muted">${fdate(ev.event_date)} · ${ftime(ev.start_time)}-${ftime(ev.end_time)}<br>${money(ev.ticket_price)} per ticket · ${ev.available_tickets} left</p>${field('Number of tickets (max ' + max + ')', 'quantity', inp('quantity', 1, 'number', `min="1" max="${max}"`))}<p>Total: <b id="tot">${money(ev.ticket_price)}</b></p>`, async d => {
        const q = Number(d.quantity);
        if (!Number.isInteger(q) || q < 1) fail({ quantity: 'Enter a whole number of at least 1.' });
        if (q > max) fail({ quantity: `You can book at most ${max} tickets for this event.` });
        const r = await post('/bookings', { event_id: ev.id, quantity: q });
        closeModal(); toast('Booking created! Ref: ' + ((r.data && r.data.booking_ref) || '')); route();
      }, 'Confirm booking');
      f.elements.quantity.oninput = () => { $('#tot').textContent = money((Number(f.elements.quantity.value) || 0) * ev.ticket_price); };
    }
  });
}

/* ---------- bookings (customer: own / organiser: own events / admin: all) ---------- */
const evMapOf = evs => Object.fromEntries(evs.map(e => [e.id, e]));
function bkTable(rows, em, o = {}) {
  if (!rows.length) return '<p class="empty">No bookings found.</p>';
  return `<div class="tw"><table><thead><tr><th>Ref</th><th>Event</th>${o.who ? '<th>Customer</th>' : ''}<th>Qty</th><th>Total</th><th>Status</th><th>Ticket</th><th></th></tr></thead><tbody>${rows.map(b => { const e = em[b.event_id] || {}; return `<tr><td>${esc(b.booking_ref)}</td><td>${esc(b.event_title || e.title || '#' + b.event_id)}<br><small>${fdate(e.event_date)}</small></td>${o.who ? `<td>${esc(b.user_name || '#' + b.user_id)}</td>` : ''}<td>${b.quantity}</td><td>${money(b.total_price)}</td><td><span class="badge ${b.status}">${b.status}</span></td><td>${b.qr_code_url && b.status !== 'cancelled' ? `<a target="_blank" rel="noopener" href="${esc(b.qr_code_url)}">QR code</a>` : '-'}</td><td class="acts">${o.actions ? o.actions(b) : ''}</td></tr>`; }).join('')}</tbody></table></div>`;
}
async function myBookings(v, u) {
  const [bks, evs] = await Promise.all([list('/bookings'), list('/events').catch(() => [])]);
  v.innerHTML = '<h2 style="margin-bottom:16px">My Bookings</h2>' + bkTable(bks.filter(b => b.user_id == u.id), evMapOf(evs), {
    actions: b => b.status !== 'cancelled' ? `<button class="btn sm danger" data-a="cancel" data-id="${b.id}">Cancel</button>` : ''
  });
  acts(v, { cancel: async id => { if (!confirm('Cancel this booking?')) return; await put('/bookings/' + id, { status: 'cancelled' }); toast('Booking cancelled.'); route(); } });
}
async function allBookings(v, u) {
  const [bks, evs] = await Promise.all([list('/bookings'), list('/events')]);
  const em = evMapOf(evs), adm = u.role === 'admin';
  const rows = adm ? bks : bks.filter(b => em[b.event_id] && em[b.event_id].organiser_id == u.id);
  v.innerHTML = `<h2 style="margin-bottom:16px">${adm ? 'All Bookings' : 'Bookings for My Events'}</h2>` + bkTable(rows, em, {
    who: true,
    actions: !adm ? null : b => `${b.status !== 'confirmed' ? `<button class="btn sm" data-a="st" data-id="${b.id}" data-s="confirmed">Confirm</button>` : ''}${b.status !== 'cancelled' ? `<button class="btn sm ghost" data-a="st" data-id="${b.id}" data-s="cancelled">Cancel</button>` : ''}<button class="btn sm danger" data-a="del" data-id="${b.id}">Delete</button>`
  });
  acts(v, {
    st: async (id, b) => { await put('/bookings/' + id, { status: b.dataset.s }); toast('Booking updated.'); route(); },
    del: async id => { if (!confirm('Delete this booking permanently?')) return; await del('/bookings/' + id); toast('Booking deleted.'); route(); }
  });
}

/* ---------- Organiser / Admin: manage events + ticket availability ---------- */
async function manageEvents(v, u) {
  const adm = u.role === 'admin';
  const [all, vens, orgs] = await Promise.all([list('/events'), list('/venues'), adm ? list('/users?role=organiser') : []]);
  const evs = adm ? all : all.filter(e => e.organiser_id == u.id);
  const vn = Object.fromEntries(vens.map(x => [x.id, x.name]));
  v.innerHTML = `<div class="bar"><h2>${adm ? 'All Events' : 'My Events'}</h2><button class="btn" data-a="new">+ New event</button></div>` + (evs.length ? `<div class="tw"><table><thead><tr><th>Event</th><th>Date</th><th>Venue</th><th>Price</th><th>Tickets left</th><th>Status</th><th></th></tr></thead><tbody>${evs.map(e => `<tr><td><b>${esc(e.title)}</b><br><small>${esc(e.category)}</small></td><td>${fdate(e.event_date)}<br><small>${ftime(e.start_time)}-${ftime(e.end_time)}</small></td><td>${esc(vn[e.venue_id] || '#' + e.venue_id)}</td><td>${money(e.ticket_price)}</td><td>${e.available_tickets} / ${e.total_tickets}</td><td><span class="badge ${e.status}">${e.status}</span></td><td class="acts"><button class="btn sm ghost" data-a="edit" data-id="${e.id}">Edit</button><button class="btn sm danger" data-a="del" data-id="${e.id}">Delete</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="empty">No events yet. Click "New event" to create one.</p>');
  const form = ev => {
    const e = ev || {};
    modal(ev ? 'Edit event' : 'New event', `
      ${field('Title', 'title', inp('title', e.title))}
      ${field('Description', 'description', `<textarea name="description" rows="2">${esc(e.description)}</textarea>`)}
      <div class="two">${field('Category', 'category', inp('category', e.category || 'Community', 'text', 'list="cats"') + '<datalist id="cats"><option>Music<option>Technology<option>Sports<option>Community</datalist>')}${field('Venue', 'venue_id', sel('venue_id', vens.map(x => [x.id, `${x.name} (cap. ${x.capacity})`]), e.venue_id))}</div>
      ${adm ? field('Organiser', 'organiser_id', sel('organiser_id', orgs.map(o => [o.id, o.name]), e.organiser_id)) : ''}
      <div class="two">${field('Date', 'event_date', inp('event_date', String(e.event_date || '').slice(0, 10), 'date'))}${field('Status', 'status', sel('status', ['draft', 'published', 'cancelled', 'completed'].map(s => [s, s]), e.status || 'draft'))}</div>
      <div class="two">${field('Start time', 'start_time', inp('start_time', ftime(e.start_time), 'time'))}${field('End time', 'end_time', inp('end_time', ftime(e.end_time), 'time'))}</div>
      <div class="two">${field('Ticket price (RM)', 'ticket_price', inp('ticket_price', e.ticket_price, 'number', 'min="0" step="0.01"'))}${field('Total tickets', 'total_tickets', inp('total_tickets', e.total_tickets, 'number', 'min="0"'))}</div>
      ${ev ? field('Tickets still available', 'available_tickets', inp('available_tickets', e.available_tickets, 'number', 'min="0"')) : ''}`,
      async d => {
        const err = {}, tt = Number(d.total_tickets), pr = Number(d.ticket_price), at = ev ? Number(d.available_tickets) : tt;
        if (d.title.trim().length < 2) err.title = 'Title must be at least 2 characters.';
        if (!d.venue_id) err.venue_id = 'Choose a venue.';
        if (adm && !d.organiser_id) err.organiser_id = 'Choose an organiser.';
        if (!d.event_date) err.event_date = 'Pick a date.';
        if (!d.start_time) err.start_time = 'Enter a start time.';
        if (!d.end_time) err.end_time = 'Enter an end time.'; else if (d.start_time && d.end_time <= d.start_time) err.end_time = 'End time must be after start time.';
        if (d.ticket_price === '' || isNaN(pr) || pr < 0) err.ticket_price = 'Enter a price of 0 or more.';
        if (d.total_tickets === '' || !Number.isInteger(tt) || tt < 0) err.total_tickets = 'Enter a whole number of 0 or more.';
        else {
          const ven = vens.find(x => x.id == d.venue_id);
          if (ven && tt > ven.capacity) err.total_tickets = `Venue capacity is only ${ven.capacity}.`;
          else if (ev && (!Number.isInteger(at) || at < 0 || at > tt)) err.available_tickets = 'Must be a whole number from 0 to total tickets.';
        }
        if (Object.keys(err).length) fail(err);
        const t = s => s.length === 5 ? s + ':00' : s;
        const body = { title: d.title.trim(), description: d.description.trim(), category: d.category.trim() || 'Community', venue_id: +d.venue_id, event_date: d.event_date, start_time: t(d.start_time), end_time: t(d.end_time), ticket_price: pr, total_tickets: tt, available_tickets: at, status: d.status };
        /* FIX: only admins may send organiser_id. An organiser editing an event sends none
           (the API refuses any organiser_id from a non-admin). A new event uses the organiser's own id. */
        if (adm) body.organiser_id = +d.organiser_id; else if (!ev) body.organiser_id = u.id;
        await (ev ? put('/events/' + ev.id, body) : post('/events', body));
        closeModal(); toast(ev ? 'Event updated.' : 'Event created.'); route();
      }, ev ? 'Save changes' : 'Create event');
  };
  acts(v, {
    new: async () => form(),
    edit: async id => form(evs.find(e => e.id == id)),
    del: async id => { if (!confirm('Delete this event?')) return; await del('/events/' + id); toast('Event deleted.'); route(); }
  });
}

/* ---------- Admin: users (pagination + search + role filter) ---------- */
async function usersPage(v) {
  const q = { page: 1, search: '', role: '' }; let rows = [];
  v.innerHTML = `<div class="bar"><h2>Users</h2><div class="filters"><input id="q" placeholder="Search name or email..."><select id="r"><option value="">All roles</option><option>admin</option><option>organiser</option><option>customer</option></select><button class="btn" data-a="new">+ New user</button></div></div><div id="tbl"></div>`;
  const load = async () => {
    const p = new URLSearchParams({ page: q.page, limit: 8 }); if (q.search) p.set('search', q.search); if (q.role) p.set('role', q.role);
    const r = await get('/users?' + p); rows = r.data || [];
    const pg = r.pagination || { page: 1, total_pages: 1, total: rows.length };
    $('#tbl').innerHTML = rows.length ? `<div class="tw"><table><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th></th></tr></thead><tbody>${rows.map(x => `<tr><td>${x.id}</td><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td><span class="badge r-${x.role}">${x.role}</span></td><td>${esc(x.phone || '-')}</td><td class="acts"><button class="btn sm ghost" data-a="edit" data-id="${x.id}">Edit</button><button class="btn sm danger" data-a="del" data-id="${x.id}">Delete</button></td></tr>`).join('')}</tbody></table></div><div class="pager"><button class="btn sm ghost" data-a="prev" ${pg.page <= 1 ? 'disabled' : ''}>‹ Prev</button><span>Page ${pg.page} of ${pg.total_pages || 1} · ${pg.total} users</span><button class="btn sm ghost" data-a="next" ${pg.page >= pg.total_pages ? 'disabled' : ''}>Next ›</button></div>` : '<p class="empty">No users found.</p>';
  };
  const safe = () => load().catch(e => toast(e.message, 'err'));
  let tm; $('#q').oninput = e => { clearTimeout(tm); tm = setTimeout(() => { q.search = e.target.value.trim(); q.page = 1; safe(); }, 300); };
  $('#r').onchange = e => { q.role = e.target.value; q.page = 1; safe(); };
  const form = x => {
    x = x || {};
    modal(x.id ? 'Edit user' : 'New user', `${field('Full name', 'name', inp('name', x.name))}${field('Email', 'email', inp('email', x.email, 'email'))}${field(x.id ? 'New password (leave blank to keep)' : 'Password', 'password', inp('password', '', 'password'))}<div class="two">${field('Role', 'role', sel('role', ['customer', 'organiser', 'admin'].map(r => [r, r]), x.role || 'customer'))}${field('Phone', 'phone', inp('phone', x.phone))}</div>`, async d => {
      const e = {}, n = d.name.trim().length;
      if (n < 2 || n > 100) e.name = 'Name must be 2-100 characters.';
      if (!EMAIL.test(d.email.trim())) e.email = 'Enter a valid email address.';
      if ((d.password || !x.id) && !strong(d.password)) e.password = 'At least 8 characters with letters and numbers.';
      if (d.phone && !PHONE.test(d.phone)) e.phone = 'Phone must be 7-20 digits, +, - or spaces.';
      if (Object.keys(e).length) fail(e);
      const body = { name: d.name.trim(), email: d.email.trim(), role: d.role, phone: d.phone };
      if (d.password) body.password = d.password;
      await (x.id ? put('/users/' + x.id, body) : post('/users', body));
      closeModal(); toast(x.id ? 'User updated.' : 'User created.'); await load();
    }, x.id ? 'Save changes' : 'Create user');
  };
  acts(v, {
    new: async () => form(), edit: async id => form(rows.find(x => x.id == id)),
    prev: async () => { q.page--; await load(); }, next: async () => { q.page++; await load(); },
    del: async id => { if (!confirm('Delete this user?')) return; await del('/users/' + id); toast('User deleted.'); await load(); }
  });
  await load();
}

/* ---------- Admin: venues ---------- */
async function venuesPage(v) {
  const vens = await list('/venues');
  v.innerHTML = `<div class="bar"><h2>Venues</h2><button class="btn" data-a="new">+ New venue</button></div>` + (vens.length ? `<div class="tw"><table><thead><tr><th>Venue</th><th>City</th><th>Capacity</th><th>Price / day</th><th>Status</th><th></th></tr></thead><tbody>${vens.map(x => `<tr><td><b>${esc(x.name)}</b><br><small>${esc(x.address)}</small></td><td>${esc(x.city)}</td><td>${x.capacity}</td><td>${money(x.price_per_day)}</td><td><span class="badge ${x.status}">${x.status}</span></td><td class="acts"><button class="btn sm ghost" data-a="edit" data-id="${x.id}">Edit</button><button class="btn sm danger" data-a="del" data-id="${x.id}">Delete</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="empty">No venues yet.</p>');
  const form = x => {
    x = x || {};
    modal(x.id ? 'Edit venue' : 'New venue', `${field('Venue name', 'name', inp('name', x.name))}${field('Address', 'address', inp('address', x.address))}<div class="two">${field('City', 'city', inp('city', x.city))}${field('Status', 'status', sel('status', ['available', 'unavailable', 'maintenance'].map(s => [s, s]), x.status || 'available'))}</div><div class="two">${field('Capacity', 'capacity', inp('capacity', x.capacity, 'number', 'min="1"'))}${field('Price per day (RM)', 'price_per_day', inp('price_per_day', x.price_per_day, 'number', 'min="0" step="0.01"'))}</div>`, async d => {
      const e = {}, cap = Number(d.capacity), pr = Number(d.price_per_day);
      if (d.name.trim().length < 2) e.name = 'Venue name is required.';
      if (!d.address.trim()) e.address = 'Address is required.';
      if (!d.city.trim()) e.city = 'City is required.';
      if (d.capacity === '' || !Number.isInteger(cap) || cap < 1) e.capacity = 'Capacity must be a whole number of at least 1.';
      if (d.price_per_day === '' || isNaN(pr) || pr < 0) e.price_per_day = 'Enter a price of 0 or more.';
      if (Object.keys(e).length) fail(e);
      const body = { name: d.name.trim(), address: d.address.trim(), city: d.city.trim(), capacity: cap, price_per_day: pr, status: d.status };
      await (x.id ? put('/venues/' + x.id, body) : post('/venues', body));
      closeModal(); toast(x.id ? 'Venue updated.' : 'Venue created.'); route();
    }, x.id ? 'Save changes' : 'Create venue');
  };
  acts(v, {
    new: async () => form(), edit: async id => form(vens.find(x => x.id == id)),
    del: async id => { if (!confirm('Delete this venue?')) return; await del('/venues/' + id); toast('Venue deleted.'); route(); }
  });
}

/* ---------- start ---------- */
window.addEventListener('hashchange', route);
route();