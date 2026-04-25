-- ============================================================================
-- Migration: Add Data Recognition Corporation as client company
-- Date: 2026-03-06
-- ============================================================================

INSERT INTO client_companies (name, code, address, is_active)
VALUES (
    'Data Recognition Corporation',
    'data_recognition',
    '13490 Bass Lake Road, Maple Grove, MN 55311',
    true
)
ON CONFLICT (code) DO NOTHING;
