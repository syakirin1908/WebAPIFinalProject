# Event Ticketing and Venue Booking System – Shared Backend

Shared RESTful API (PHP + MySQL) for XAMPP. Every member builds their own frontend against this backend.

## Folder structure
```
event-ticketing/
├── database/
│   ├── schema.sql        # DDL: creates database + 4 tables
│   └── seed.sql          # DML: sample data (5+ rows per table)
├── api/
│   ├── .htaccess         # URL rewriting + Authorization header
│   ├── index.php         # Router / front controller
│   ├── config/           # config.php (DB + JWT), database.php (PDO)
│   ├── core/             # jwt.php, auth.php (RBAC), response.php, validator.php
│   └── routes/           # auth.php, users.php  (+ events/venues/bookings from other members)
├── docs/
│   └── REPORT_Member2.md # Report sections 2.0 and 7.0
└── README.md
```

## Setup (XAMPP)
1. Start **Apache** and **MySQL** in the XAMPP Control Panel.
2. Copy the whole `event-ticketing` folder to `C:\xampp\htdocs\`.
3. Open http://localhost/phpmyadmin → **Import** → choose `database/schema.sql` → Go. Then import `database/seed.sql`.
   (Or in terminal: `mysql -u root < database/schema.sql` then `mysql -u root < database/seed.sql`.)
4. Check `api/config/config.php` (DB user/password; XAMPP default is `root` with empty password).
   **Everyone in the group must use the same `JWT_SECRET`.**
5. Make sure Apache `mod_rewrite` is on (default in XAMPP) and `AllowOverride All` is set for htdocs
   (default is already `All` in XAMPP's `httpd.conf`).
6. Test: open http://localhost/event-ticketing/api/ → you should see `"API is running"`.

**API base URL for your frontend:** `http://localhost/event-ticketing/api`

## Sample accounts
| Role      | Email               | Password       |
|-----------|---------------------|----------------|
| Admin     | admin@event.com     | Admin@123      |
| Organiser | hafiz@event.com     | Organiser@123  |
| Organiser | meiling@event.com   | Organiser@123  |
| Customer  | daniel@mail.com     | Customer@123   |

## Response format (everyone must follow this)
```json
// success
{ "success": true,  "message": "Users retrieved.", "data": [ ... ], "pagination": { ... } }
// error
{ "success": false, "message": "Validation failed.", "errors": { "email": "Email format is invalid." } }
```
Status codes used: 200, 201, 400, 401, 403, 404, 405, 409, 422, 500.

## Endpoints (Member 2)
| Method | URL | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register a customer |
| POST | `/auth/login` | Public | Login, returns JWT |
| GET | `/auth/me` | Any logged-in user | Current profile |
| GET | `/users?page=1&limit=10&search=&role=` | Admin | List users |
| GET | `/users/{id}` | Admin or self | View user |
| POST | `/users` | Admin | Create user (any role) |
| PUT | `/users/{id}` | Admin or self (role: admin only) | Update user |
| DELETE | `/users/{id}` | Admin | Delete user |

Send the token on protected routes: `Authorization: Bearer <token>`

## How other members plug in their API
1. Create `api/routes/<resource>.php` (`events`, `venues`, `bookings`) with a function
   `handle_<resource>(string $method, array $seg, PDO $db): void`.
2. Protect routes with `require_auth()` or `require_role(['admin','organiser'])`.
3. Reply using `success_response(...)` / `error_response(...)` and validators in `core/validator.php`.
   The router already dispatches to your file automatically.

## Quick test (curl)
```bash
# Login
curl -X POST http://localhost/event-ticketing/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@event.com","password":"Admin@123"}'

# List users (replace TOKEN)
curl http://localhost/event-ticketing/api/users -H "Authorization: Bearer TOKEN"
```
