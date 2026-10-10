-- =====================================================================
-- Sample data (DML)  |  Run AFTER schema.sql
-- Login accounts (password in brackets):
--   admin@event.com      (Admin@123)      -> admin
--   hafiz@event.com      (Organiser@123)  -> organiser
--   meiling@event.com    (Organiser@123)  -> organiser
--   daniel@mail.com / nurul@mail.com / arjun@mail.com (Customer@123) -> customer
-- Passwords are stored as bcrypt hashes (never plain text).
-- =====================================================================
USE event_ticketing_db;

INSERT INTO users (id, name, email, password_hash, role, phone) VALUES
(1, 'Aisyah Rahman', 'admin@event.com',   '$2b$10$5bSdp6a9JEKmgz9tbPLSaub5Y58PV8mnmYK.rn6Pi/.gOHH04nu7y', 'admin',     '012-3456789'),
(2, 'Hafiz Ismail',  'hafiz@event.com',   '$2b$10$ZztYr1.jw1FsgQCHpnA1eOWnuGU654IFoHnt.rWOG/IXiP33N33pe', 'organiser', '013-1112233'),
(3, 'Tan Mei Ling',  'meiling@event.com', '$2b$10$ZztYr1.jw1FsgQCHpnA1eOWnuGU654IFoHnt.rWOG/IXiP33N33pe', 'organiser', '014-5556677'),
(4, 'Daniel Lim',    'daniel@mail.com',   '$2b$10$y33K3c8N1yN7j0uX6hQ1Ae0NV/vNdg6RiJdMzZHwm7gtzIGDkV17i', 'customer',  '016-7778899'),
(5, 'Nurul Huda',    'nurul@mail.com',    '$2b$10$y33K3c8N1yN7j0uX6hQ1Ae0NV/vNdg6RiJdMzZHwm7gtzIGDkV17i', 'customer',  '017-2223344'),
(6, 'Arjun Kumar',   'arjun@mail.com',    '$2b$10$y33K3c8N1yN7j0uX6hQ1Ae0NV/vNdg6RiJdMzZHwm7gtzIGDkV17i', 'customer',  '019-8889900');

INSERT INTO venues (id, name, address, city, capacity, price_per_day, status) VALUES
(1, 'Dewan Jubli Intan',            'Jalan Petri',        'Muar',        800,  3500.00,  'available'),
(2, 'Muar Trade Centre Hall A',     'Jalan Junid',        'Muar',        1500, 6000.00,  'available'),
(3, 'Danga City Convention Centre', 'Jalan Skudai',       'Johor Bahru', 3000, 12000.00, 'available'),
(4, 'Stadium Tertutup Larkin',      'Jalan Mutiara Emas', 'Johor Bahru', 5000, 20000.00, 'available'),
(5, 'Tanjung Emas Open Arena',      'Jalan Tanjung Emas', 'Muar',        2000, 4500.00,  'maintenance');

INSERT INTO events (id, title, description, category, venue_id, organiser_id, event_date, start_time, end_time, ticket_price, total_tickets, available_tickets, status) VALUES
(1, 'Muar Music Fest 2026',   'A night of live local bands and food stalls.', 'Music',          2, 2, '2026-11-14', '18:00:00', '23:00:00', 60.00,  1000, 994, 'published'),
(2, 'Johor Tech Summit 2026', 'Talks and workshops on AI, cloud and startups.', 'Technology',        3, 3, '2026-12-05', '09:00:00', '17:00:00', 120.00, 300,  297, 'published'),
(3, 'Charity Gala Dinner',    'Fundraising dinner with live auction.', 'Charity',                 1, 2, '2026-11-28', '19:00:00', '22:30:00', 45.00,  500,  500, 'published'),
(4, 'Stand-Up Comedy Night',  'Top comedians perform live.', 'Entertainment',                           1, 3, '2026-12-12', '20:00:00', '22:00:00', 80.00,  200,  200, 'cancelled'),
(5, 'Startup Pitch Day',      'Student and early-stage startups pitch to investors.', 'Business',  2, 3, '2027-01-16', '10:00:00', '16:00:00', 35.00,  150,  148, 'published'),
(6, 'Futsal Charity Cup',     'Inter-school futsal tournament.', 'Sports',                       4, 2, '2027-02-07', '08:00:00', '18:00:00', 25.00,  400,  395, 'published');

INSERT INTO bookings (id, booking_ref, user_id, event_id, quantity, total_price, status, qr_code_url) VALUES
(1, 'BK-20261001-0001', 4, 1, 2, 120.00, 'confirmed', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=BK-20261001-0001'),
(2, 'BK-20261001-0002', 5, 1, 4, 240.00, 'confirmed', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=BK-20261001-0002'),
(3, 'BK-20261002-0003', 6, 2, 1, 120.00, 'confirmed', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=BK-20261002-0003'),
(4, 'BK-20261003-0004', 4, 3, 3, 135.00, 'pending',   NULL),
(5, 'BK-20261003-0005', 5, 4, 2, 160.00, 'cancelled', NULL),
(6, 'BK-20261004-0006', 6, 5, 2, 70.00,  'confirmed', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=BK-20261004-0006'),
(7, 'BK-20261005-0007', 4, 2, 2, 240.00, 'confirmed', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=BK-20261005-0007'),
(8, 'BK-20261006-0008', 5, 6, 5, 125.00, 'confirmed', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=BK-20261006-0008');
