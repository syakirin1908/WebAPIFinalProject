# Member 2 Frontend - EventHub

One website for all three roles (Administrator, Organiser, Customer). Plain HTML, CSS and JavaScript (no install needed). It uses the group's shared REST API with JWT login.

## Run
1. Copy this folder to `C:\xampp\htdocs\event-ticketing\frontend\member2\` (Laragon: `C:\laragon\www\event-ticketing\frontend\member2\`).
2. Start Apache and MySQL, and make sure the shared database and API work.
3. Open http://localhost/event-ticketing/frontend/member2/
4. If your API address is different, change `API_BASE` in `js/config.js`.

## Demo accounts
| Role | Email | Password |
|---|---|---|
| Admin | admin@event.com | Admin@123 |
| Organiser | hafiz@event.com | Organiser@123 |
| Customer | daniel@mail.com | Customer@123 |

## What each role can do
- **Customer:** register and log in, browse and search events, filter by category, check availability, book tickets, view own bookings and QR ticket, cancel bookings.
- **Organiser:** create, edit and delete own events, set ticket price and availability, view bookings for own events.
- **Administrator:** manage users (search, filter, pagination), venues and all events, view and update all bookings.

## API endpoints used
`/auth/register`, `/auth/login`, `/users`, `/events`, `/venues`, `/bookings` (GET list, POST, PUT `/{id}`, DELETE `/{id}`). Bookings are cancelled with `PUT /bookings/{id}` and `{"status":"cancelled"}`.

## Invalid input and errors
Forms are checked in the browser (required fields, email, password strength, times, ticket numbers, venue capacity) and server messages (401, 403, 409, 422) are shown next to the fields or as a notice. An expired token returns the user to the login page.
