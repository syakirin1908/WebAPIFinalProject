-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Oct 15, 2026 at 11:36 PM
-- Server version: 8.0.30
-- PHP Version: 8.3.16

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `event_ticketing_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `id` int UNSIGNED NOT NULL,
  `booking_ref` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `event_id` int UNSIGNED NOT NULL,
  `quantity` int UNSIGNED NOT NULL,
  `total_price` decimal(10,2) NOT NULL,
  `status` enum('pending','confirmed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `qr_code_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`id`, `booking_ref`, `user_id`, `event_id`, `quantity`, `total_price`, `status`, `qr_code_url`, `created_at`, `updated_at`) VALUES
(1, 'BK-20261001-0001', 4, 1, 2, 120.00, 'confirmed', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=BK-20261001-0001', '2026-10-09 15:08:02', '2026-10-09 15:08:02'),
(2, 'BK-20261001-0002', 5, 1, 4, 240.00, 'confirmed', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=BK-20261001-0002', '2026-10-09 15:08:02', '2026-10-09 15:08:02'),
(3, 'BK-20261002-0003', 6, 2, 1, 120.00, 'confirmed', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=BK-20261002-0003', '2026-10-09 15:08:02', '2026-10-09 15:08:02'),
(4, 'BK-20261003-0004', 4, 3, 3, 135.00, 'pending', NULL, '2026-10-09 15:08:02', '2026-10-09 15:08:02'),
(5, 'BK-20261003-0005', 5, 4, 2, 160.00, 'cancelled', NULL, '2026-10-09 15:08:02', '2026-10-09 15:08:02'),
(6, 'BK-20261004-0006', 6, 5, 2, 70.00, 'confirmed', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=BK-20261004-0006', '2026-10-09 15:08:02', '2026-10-09 15:08:02'),
(7, 'BK-20261005-0007', 4, 2, 2, 240.00, 'confirmed', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=BK-20261005-0007', '2026-10-09 15:08:02', '2026-10-09 15:08:02'),
(8, 'BK-20261006-0008', 5, 6, 5, 125.00, 'confirmed', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=BK-20261006-0008', '2026-10-09 15:08:02', '2026-10-09 15:08:02'),
(9, 'BK-20261014-4620', 4, 1, 1, 60.00, 'cancelled', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=BK-20261014-4620', '2026-10-14 13:54:02', '2026-10-14 13:54:15'),
(10, 'BK-20261014-631D', 4, 7, 1, 89.00, 'confirmed', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=BK-20261014-631D', '2026-10-14 14:13:50', '2026-10-14 14:13:50'),
(11, 'BK-20261014-EF2C', 4, 3, 4, 180.00, 'cancelled', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=BK-20261014-EF2C', '2026-10-14 14:19:43', '2026-10-15 14:13:19'),
(12, 'BK-20261015-BAE3', 4, 1, 1, 60.00, 'confirmed', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=BK-20261015-BAE3', '2026-10-15 14:12:55', '2026-10-15 14:12:55');

-- --------------------------------------------------------

--
-- Table structure for table `events`
--

CREATE TABLE `events` (
  `id` int UNSIGNED NOT NULL,
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Community',
  `venue_id` int UNSIGNED NOT NULL,
  `organiser_id` int UNSIGNED NOT NULL,
  `event_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `ticket_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total_tickets` int UNSIGNED NOT NULL,
  `available_tickets` int UNSIGNED NOT NULL,
  `status` enum('draft','published','cancelled','completed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `events`
--

INSERT INTO `events` (`id`, `title`, `description`, `category`, `venue_id`, `organiser_id`, `event_date`, `start_time`, `end_time`, `ticket_price`, `total_tickets`, `available_tickets`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Muar Music Fest 2026', 'A night of live local bands and food stalls.', 'Music', 2, 2, '2026-11-14', '18:00:00', '23:00:00', 60.00, 1000, 993, 'published', '2026-10-09 15:08:02', '2026-10-15 14:12:55'),
(2, 'Johor Tech Summit 2026', 'Talks and workshops on AI, cloud and startups.', 'Technology', 3, 3, '2026-12-05', '09:00:00', '17:00:00', 120.00, 300, 297, 'published', '2026-10-09 15:08:02', '2026-10-09 16:48:50'),
(3, 'Charity Gala Dinner', 'Fundraising dinner with live auction.', 'Community', 1, 2, '2026-11-28', '19:00:00', '22:30:00', 45.00, 500, 500, 'published', '2026-10-09 15:08:02', '2026-10-15 14:13:19'),
(4, 'Stand-Up Comedy Night', 'Top comedians perform live.', 'Community', 1, 3, '2026-12-12', '20:00:00', '22:00:00', 80.00, 200, 200, 'cancelled', '2026-10-09 15:08:02', '2026-10-09 15:08:02'),
(5, 'Startup Pitch Day', 'Student and early-stage startups pitch to investors.', 'Technology', 2, 3, '2027-01-16', '10:00:00', '16:00:00', 35.00, 150, 148, 'published', '2026-10-09 15:08:02', '2026-10-09 16:48:50'),
(6, 'Futsal Charity Cup', 'Inter-school futsal tournament.', 'Sports', 4, 2, '2027-02-07', '08:00:00', '18:00:00', 25.00, 400, 395, 'published', '2026-10-09 15:08:02', '2026-10-09 16:48:50'),
(7, 'Neon Nights Music Festival 2026', 'Experience unforgettable live music and performances.', 'Music', 6, 2, '2026-10-23', '20:00:00', '22:00:00', 90.00, 120, 119, 'published', '2026-10-09 16:48:50', '2026-10-15 14:09:55'),
(8, 'Future Tech Conference', 'Explore AI, software development and technology.', 'Technology', 7, 2, '2026-10-30', '09:00:00', '11:00:00', 149.00, 18, 18, 'published', '2026-10-09 16:48:50', '2026-10-09 16:48:50'),
(9, 'City Marathon', 'Join an exciting marathon in Kuala Lumpur.', 'Sports', 8, 2, '2026-11-06', '06:30:00', '08:30:00', 65.00, 0, 0, 'published', '2026-10-09 16:48:50', '2026-10-09 16:48:50'),
(10, 'Creative Community Market', 'Discover local art and creative businesses.', 'Community', 9, 2, '2026-11-13', '10:00:00', '12:00:00', 0.00, 80, 80, 'published', '2026-10-09 16:48:50', '2026-10-09 16:48:50'),
(11, 'Indie Sound Sessions', 'Enjoy live performances from independent artists.', 'Music', 10, 2, '2026-11-20', '19:30:00', '21:30:00', 49.00, 12, 12, 'published', '2026-10-09 16:48:50', '2026-10-09 16:48:50'),
(12, 'Digital Innovation Workshop', 'Learn modern digital technology skills.', 'Technology', 11, 2, '2026-11-27', '14:00:00', '16:00:00', 35.00, 45, 45, 'published', '2026-10-09 16:48:50', '2026-10-09 16:48:50');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int UNSIGNED NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','organiser','customer') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'customer',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `phone`, `created_at`, `updated_at`) VALUES
(1, 'Aisyah Rahman', 'admin@event.com', '$2b$10$5bSdp6a9JEKmgz9tbPLSaub5Y58PV8mnmYK.rn6Pi/.gOHH04nu7y', 'admin', '012-3456789', '2026-10-09 15:08:02', '2026-10-09 15:08:02'),
(2, 'Hafiz Ismail', 'hafiz@event.com', '$2b$10$ZztYr1.jw1FsgQCHpnA1eOWnuGU654IFoHnt.rWOG/IXiP33N33pe', 'organiser', '013-1112233', '2026-10-09 15:08:02', '2026-10-09 15:08:02'),
(3, 'Tan Mei Ling', 'meiling@event.com', '$2b$10$ZztYr1.jw1FsgQCHpnA1eOWnuGU654IFoHnt.rWOG/IXiP33N33pe', 'organiser', '014-5556677', '2026-10-09 15:08:02', '2026-10-09 15:08:02'),
(4, 'Daniel Lim', 'daniel@mail.com', '$2b$10$y33K3c8N1yN7j0uX6hQ1Ae0NV/vNdg6RiJdMzZHwm7gtzIGDkV17i', 'customer', '016-7778899', '2026-10-09 15:08:02', '2026-10-09 15:08:02'),
(5, 'Nurul Huda', 'nurul@mail.com', '$2b$10$y33K3c8N1yN7j0uX6hQ1Ae0NV/vNdg6RiJdMzZHwm7gtzIGDkV17i', 'customer', '017-2223344', '2026-10-09 15:08:02', '2026-10-09 15:08:02'),
(6, 'Arjun Kumar', 'arjun@mail.com', '$2b$10$y33K3c8N1yN7j0uX6hQ1Ae0NV/vNdg6RiJdMzZHwm7gtzIGDkV17i', 'customer', '019-8889900', '2026-10-09 15:08:02', '2026-10-09 15:08:02'),
(8, 'Demo User', 'demo@gmail.com', '$2y$10$AAzDMIwDI.b2d38HfblIQ.Tl0IMhA0GZpMHKW1OhMts/2RSBciQmC', 'customer', '012-3456789', '2026-10-15 14:06:08', '2026-10-15 14:06:08');

-- --------------------------------------------------------

--
-- Table structure for table `venues`
--

CREATE TABLE `venues` (
  `id` int UNSIGNED NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `capacity` int UNSIGNED NOT NULL,
  `price_per_day` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status` enum('available','unavailable','maintenance') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `venues`
--

INSERT INTO `venues` (`id`, `name`, `address`, `city`, `capacity`, `price_per_day`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Dewan Jubli Intan', 'Jalan Petri', 'Muar', 800, 3500.00, 'available', '2026-10-09 15:08:02', '2026-10-09 15:08:02'),
(2, 'Muar Trade Centre Hall A', 'Jalan Junid', 'Muar', 1500, 6000.00, 'available', '2026-10-09 15:08:02', '2026-10-09 15:08:02'),
(3, 'Danga City Convention Centre', 'Jalan Skudai', 'Johor Bahru', 3000, 12000.00, 'available', '2026-10-09 15:08:02', '2026-10-09 15:08:02'),
(4, 'Stadium Tertutup Larkin', 'Jalan Mutiara Emas', 'Johor Bahru', 5000, 20000.00, 'available', '2026-10-09 15:08:02', '2026-10-09 15:08:02'),
(5, 'Tanjung Emas Open Arena', 'Jalan Tanjung Emas', 'Muar', 2000, 4500.00, 'maintenance', '2026-10-09 15:08:02', '2026-10-09 15:08:02'),
(6, 'Axiata Arena', 'Address to be confirmed', 'Kuala Lumpur', 12000, 0.00, 'available', '2026-10-09 16:48:50', '2026-10-09 16:48:50'),
(7, 'KL Convention Centre', 'Address to be confirmed', 'Kuala Lumpur', 3000, 0.00, 'available', '2026-10-09 16:48:50', '2026-10-09 16:48:50'),
(8, 'Dataran Merdeka', 'Address to be confirmed', 'Kuala Lumpur', 5000, 0.00, 'available', '2026-10-09 16:48:50', '2026-10-09 16:48:50'),
(9, 'Central Market', 'Address to be confirmed', 'Kuala Lumpur', 1000, 0.00, 'available', '2026-10-09 16:48:50', '2026-10-09 16:48:50'),
(10, 'The Bee Publika', 'Address to be confirmed', 'Kuala Lumpur', 500, 0.00, 'available', '2026-10-09 16:48:50', '2026-10-09 16:48:50'),
(11, 'Innovation Hub', 'Address to be confirmed', 'Cyberjaya', 300, 0.00, 'available', '2026-10-09 16:48:50', '2026-10-09 16:48:50');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_bookings_ref` (`booking_ref`),
  ADD KEY `idx_bookings_user` (`user_id`),
  ADD KEY `idx_bookings_event` (`event_id`);

--
-- Indexes for table `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_events_venue` (`venue_id`),
  ADD KEY `fk_events_organiser` (`organiser_id`),
  ADD KEY `idx_events_date` (`event_date`),
  ADD KEY `idx_events_status` (`status`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_email` (`email`);

--
-- Indexes for table `venues`
--
ALTER TABLE `venues`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `events`
--
ALTER TABLE `events`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `venues`
--
ALTER TABLE `venues`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `fk_bookings_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_bookings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `events`
--
ALTER TABLE `events`
  ADD CONSTRAINT `fk_events_organiser` FOREIGN KEY (`organiser_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_events_venue` FOREIGN KEY (`venue_id`) REFERENCES `venues` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
