<?php
const VALID_ROLES = ['admin', 'organiser', 'customer'];

// Each validator returns an error string or null.
function v_name($v): ?string {
    if (!is_string($v) || trim($v) === '') return 'Name is required.';
    $len = mb_strlen(trim($v));
    if ($len < 2 || $len > 100) return 'Name must be 2-100 characters.';
    return null;
}
function v_email($v): ?string {
    if (!is_string($v) || trim($v) === '') return 'Email is required.';
    if (!filter_var(trim($v), FILTER_VALIDATE_EMAIL) || strlen($v) > 150) return 'Email format is invalid.';
    return null;
}
function v_password($v): ?string {
    if (!is_string($v) || $v === '') return 'Password is required.';
    if (strlen($v) < 8)                      return 'Password must be at least 8 characters.';
    if (!preg_match('/[A-Za-z]/', $v) || !preg_match('/\d/', $v)) return 'Password must contain letters and numbers.';
    if (strlen($v) > 72)                     return 'Password must be 72 characters or fewer.';
    return null;
}
function v_role($v): ?string {
    if (!is_string($v) || !in_array($v, VALID_ROLES, true)) return 'Role must be one of: ' . implode(', ', VALID_ROLES) . '.';
    return null;
}
function v_phone($v): ?string {
    if ($v === null || $v === '') return null; // optional
    if (!is_string($v) || !preg_match('/^[0-9+\-\s]{7,20}$/', $v)) return 'Phone must be 7-20 characters (digits, +, -, spaces).';
    return null;
}
