# Member 3 – Event Management Frontend

## Overview
This frontend provides a complete **Event Management** interface for the Event Ticketing and Venue Booking System. It allows users to browse, create, edit, and delete events depending on their role.

## Features
- **Login** – Authenticate with email/password via the shared JWT API
- **Browse Events** – View all published events with search and filter (category, status)
- **Event Management** – Full CRUD table for admin and organiser roles
- **Create Event** – Form with venue dropdown, date/time pickers, pricing, and ticket allocation
- **Edit Event** – Pre-populated form for updating event details
- **Delete Event** – Confirmation dialog with booking-conflict protection
- **Role-Based Access Control** – Management features hidden from customers

## How to Run

### Option A – XAMPP (recommended)
1. Make sure the entire project is inside `C:\xampp\htdocs\event-ticketing\`
2. Start **Apache** and **MySQL** from the XAMPP Control Panel
3. Import `database/schema.sql` and `database/seed.sql` via phpMyAdmin
4. Open `http://localhost/event-ticketing/frontend/member3-event-management/` in your browser

### Option B – Run the frontend with PHP's built-in server
The repository does not contain a `public/` directory. From the project root, run:

```powershell
php -S 127.0.0.1:8000 -t frontend/member3-event-management
```

Then open `http://127.0.0.1:8000`. Keep Apache and MySQL running in XAMPP for the API, which uses `http://localhost/event-ticketing/api` by default. If your XAMPP project folder has a different name, use **Edit** in the frontend's API bar to set its API URL.

## Sample Accounts
| Role      | Email              | Password      |
|-----------|--------------------|---------------|
| Admin     | admin@event.com    | Admin@123     |
| Organiser | hafiz@event.com    | Organiser@123 |
| Customer  | daniel@mail.com    | Customer@123  |

## API Endpoints Used
| Method | Endpoint           | Purpose              |
|--------|--------------------|----------------------|
| POST   | `/auth/login`      | User authentication  |
| GET    | `/events`          | List/search events   |
| GET    | `/events/{id}`     | Get event details    |
| POST   | `/events`          | Create new event     |
| PUT    | `/events/{id}`     | Update event         |
| DELETE | `/events/{id}`     | Delete event         |
| GET    | `/venues`          | Load venue dropdown  |

## Author
**Member 3** – Events API & Event Management Frontend
