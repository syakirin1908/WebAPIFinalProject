<?php
// ---- Database (XAMPP defaults) ----
const DB_HOST = 'localhost';
const DB_NAME = 'event_ticketing_db';
const DB_USER = 'root';
const DB_PASS = '';          // XAMPP default is empty

// ---- JWT ----
// IMPORTANT: change this secret, and keep the same value for the whole group.
const JWT_SECRET = 'change-this-to-a-long-random-string-2026';
const JWT_TTL    = 7200;     // token lifetime in seconds (2 hours)

// ---- CORS: frontend origins allowed to call the API ----
// '*' is fine for local development with XAMPP.
const CORS_ORIGIN = '*';
