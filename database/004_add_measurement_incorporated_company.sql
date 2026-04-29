-- ============================================================================
-- Migration: Add Measurement Incorporated as client company (Paycor paystubs)
-- Date: 2026-04-29
-- ============================================================================

INSERT INTO client_companies (name, code, address, contact_phone, is_active)
VALUES (
    'Measurement Incorporated',
    'measurement_incorporated',
    '215 Morris St, Durham NC 27701',
    '(919)683-2413',
    true
)
ON CONFLICT (code) DO NOTHING;
