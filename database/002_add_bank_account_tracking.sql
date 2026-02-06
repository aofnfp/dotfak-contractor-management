-- Migration: Add Bank Account Tracking System
-- Description: Implements persistent bank account registry with auto-matching and dual tracking
-- Date: 2026-02-06

-- ============================================================================
-- Table 1: Bank Accounts Registry
-- ============================================================================
-- Stores persistent bank account information with owner assignments
-- Each account (identified by last 4 digits) can only belong to one person

CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_last4 VARCHAR(4) NOT NULL UNIQUE,  -- Last 4 digits (globally unique)
  bank_name VARCHAR(255),
  account_name VARCHAR(255),
  owner_type VARCHAR(20) NOT NULL,  -- 'contractor' or 'admin'
  owner_id UUID NOT NULL,  -- contractor_assignment_id or admin_user_id
  first_seen_paystub_id INTEGER,  -- Track when account first appeared
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT bank_accounts_owner_type_check CHECK (owner_type IN ('contractor', 'admin')),
  CONSTRAINT bank_accounts_account_last4_check CHECK (length(account_last4) = 4 AND account_last4 ~ '^[0-9]+$')
);

-- Add foreign key after paystubs table exists
ALTER TABLE bank_accounts
  ADD CONSTRAINT bank_accounts_first_seen_paystub_fkey
  FOREIGN KEY (first_seen_paystub_id) REFERENCES paystubs(id) ON DELETE SET NULL;

-- Indexes for fast lookups
CREATE INDEX idx_bank_accounts_last4 ON bank_accounts(account_last4);
CREATE INDEX idx_bank_accounts_owner ON bank_accounts(owner_type, owner_id);
CREATE INDEX idx_bank_accounts_active ON bank_accounts(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- Table 2: Paystub Account Splits
-- ============================================================================
-- Links paystubs to bank accounts with the amount deposited to each account

CREATE TABLE IF NOT EXISTS paystub_account_splits (
  id SERIAL PRIMARY KEY,
  paystub_id INTEGER NOT NULL REFERENCES paystubs(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each account can only appear once per paystub
  UNIQUE(paystub_id, bank_account_id)
);

-- Indexes for performance
CREATE INDEX idx_paystub_splits_paystub ON paystub_account_splits(paystub_id);
CREATE INDEX idx_paystub_splits_account ON paystub_account_splits(bank_account_id);

-- ============================================================================
-- Dual Tracking Columns for Contractor Earnings
-- ============================================================================
-- Add columns to track expected earnings vs actual payments with variance

ALTER TABLE contractor_earnings
  ADD COLUMN IF NOT EXISTS expected_earnings NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS actual_payments NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS payment_variance NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS variance_status VARCHAR(20);

-- Add constraint for variance_status
ALTER TABLE contractor_earnings
  ADD CONSTRAINT contractor_earnings_variance_status_check
  CHECK (variance_status IN ('correct', 'overpaid', 'underpaid'));

-- Create index for flagged earnings (exclude 'correct' status for efficiency)
CREATE INDEX idx_contractor_earnings_variance
  ON contractor_earnings(variance_status)
  WHERE variance_status != 'correct';

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE bank_accounts IS 'Persistent registry of bank accounts with owner assignments';
COMMENT ON COLUMN bank_accounts.account_last4 IS 'Last 4 digits of account number (globally unique identifier)';
COMMENT ON COLUMN bank_accounts.owner_type IS 'Account owner: contractor or admin';
COMMENT ON COLUMN bank_accounts.owner_id IS 'UUID of contractor_assignment or admin user';
COMMENT ON COLUMN bank_accounts.first_seen_paystub_id IS 'ID of paystub where this account first appeared';

COMMENT ON TABLE paystub_account_splits IS 'Links paystubs to bank accounts with deposited amounts';
COMMENT ON COLUMN paystub_account_splits.amount IS 'Amount deposited to this account from this paystub';

COMMENT ON COLUMN contractor_earnings.expected_earnings IS 'Expected earnings calculated from hours × rate + bonuses';
COMMENT ON COLUMN contractor_earnings.actual_payments IS 'Actual payments from bank account deposits';
COMMENT ON COLUMN contractor_earnings.payment_variance IS 'Difference between actual and expected (actual - expected)';
COMMENT ON COLUMN contractor_earnings.variance_status IS 'Payment accuracy: correct, overpaid, or underpaid';

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Next steps:
-- 1. Create backend models (backend/models/bank_account.py)
-- 2. Create Pydantic schemas (backend/schemas/bank_account.py)
-- 3. Implement bank_account_service.py
-- 4. Update paystubs router with new endpoints
-- 5. Update earnings_service.py with dual tracking
