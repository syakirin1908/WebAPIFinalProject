-- =====================================================================
-- Event Ticketing and Venue Booking System  |  DDL (schema)
-- Database: event_ticketing_db   |  Engine: MySQL / MariaDB (XAMPP)
-- Import order: 1) schema.sql  2) seed.sql
-- =====================================================================
CREATE DATABASE IF NOT EXISTS event_ticketing_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE event_ticketing_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS venues;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- USERS  (roles: admin | organiser | customer)
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('admin','organiser','customer') NOT NULL DEFAULT 'customer',
  phone         VARCHAR(20)   NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_users_email UNIQUE (email)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- VENUES
-- ---------------------------------------------------------------------
CREATE TABLE venues (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150)  NOT NULL,
  address       VARCHAR(255)  NOT NULL,
  city          VARCHAR(100)  NOT NULL,
  capacity      INT UNSIGNED  NOT NULL,
  price_per_day DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status        ENUM('available','unavailable','maintenance') NOT NULL DEFAULT 'available',
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_venues_capacity CHECK (capacity > 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- EVENTS  (each event is held at one venue and owned by one organiser)
-- ---------------------------------------------------------------------
CREATE TABLE events (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title             VARCHAR(150)  NOT NULL,
  description       TEXT          NULL,
  category          VARCHAR(50)   NOT NULL DEFAULT 'Community',
  venue_id          INT UNSIGNED  NOT NULL,
  organiser_id      INT UNSIGNED  NOT NULL,
  event_date        DATE          NOT NULL,
  start_time        TIME          NOT NULL,
  end_time          TIME          NOT NULL,
  ticket_price      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_tickets     INT UNSIGNED  NOT NULL,
  available_tickets INT UNSIGNED  NOT NULL,
  status            ENUM('draft','published','cancelled','completed') NOT NULL DEFAULT 'draft',
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_events_venue     FOREIGN KEY (venue_id)     REFERENCES venues(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_events_organiser FOREIGN KEY (organiser_id) REFERENCES users(id)  ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_events_tickets  CHECK (available_tickets <= total_tickets),
  INDEX idx_events_date   (event_date),
  INDEX idx_events_status (status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- BOOKINGS  (a customer books tickets for one event)
-- ---------------------------------------------------------------------
CREATE TABLE bookings (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_ref  VARCHAR(30)   NOT NULL,
  user_id      INT UNSIGNED  NOT NULL,
  event_id     INT UNSIGNED  NOT NULL,
  quantity     INT UNSIGNED  NOT NULL,
  total_price  DECIMAL(10,2) NOT NULL,
  status       ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
  qr_code_url  VARCHAR(500)  NULL,          -- filled from the external QR Code API
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_bookings_ref UNIQUE (booking_ref),
  CONSTRAINT fk_bookings_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_bookings_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_bookings_qty  CHECK (quantity > 0),
  INDEX idx_bookings_user  (user_id),
  INDEX idx_bookings_event (event_id)
) ENGINE=InnoDB;
