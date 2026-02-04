-- DotFak Group LLC - Contractor Management Platform
-- Initial Database Schema
-- PostgreSQL + Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Client Companies (e.g., AP Account Services)
CREATE TABLE client_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "ap_account_services"
    address TEXT,
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contractors (linked to Supabase auth.users)
CREATE TABLE contractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    contractor_code VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "CONT-001"
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    ssn_last_4 VARCHAR(4),  -- For verification only
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contractor Assignments (links contractors to clients with rate structures)
CREATE TABLE contractor_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    client_company_id UUID NOT NULL REFERENCES client_companies(id),
    client_employee_id VARCHAR(50),  -- Employee ID on client's paystub (for auto-matching)

    -- Rate structure (flexible: fixed OR percentage)
    rate_type VARCHAR(20) NOT NULL CHECK (rate_type IN ('fixed', 'percentage')),
    fixed_hourly_rate NUMERIC(10,2),  -- If fixed: $4.00/hr
    percentage_rate NUMERIC(5,2),     -- If percentage: 25.00%
    bonus_split_percentage NUMERIC(5,2) DEFAULT 50.00,  -- Configurable per contractor!

    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure rate type is consistent
    CONSTRAINT rate_type_check CHECK (
        (rate_type = 'fixed' AND fixed_hourly_rate IS NOT NULL AND percentage_rate IS NULL) OR
        (rate_type = 'percentage' AND percentage_rate IS NOT NULL AND fixed_hourly_rate IS NULL)
    ),

    -- Ensure only one active assignment per contractor-client pair
    UNIQUE(contractor_id, client_company_id, is_active)
);

-- Enhanced Paystubs table
CREATE TABLE IF NOT EXISTS paystubs (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50),
    employee_name VARCHAR(255) NOT NULL,
    organization VARCHAR(100) NOT NULL,
    pay_period_begin DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    check_date DATE,
    net_pay NUMERIC(10,2),
    gross_pay NUMERIC(10,2),

    -- NEW FIELDS for contractor management
    contractor_assignment_id UUID REFERENCES contractor_assignments(id),
    client_company_id UUID REFERENCES client_companies(id),
    file_hash VARCHAR(64) UNIQUE,  -- SHA-256 to prevent duplicates
    uploaded_by UUID REFERENCES auth.users(id),

    paystub_data JSONB NOT NULL,  -- Complete paystub with YTD, earnings, deductions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Prevent duplicate paystubs for same contractor/period
    UNIQUE(contractor_assignment_id, pay_period_begin, pay_period_end)
);

-- Contractor Earnings (calculated from paystubs)
CREATE TABLE contractor_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_assignment_id UUID NOT NULL REFERENCES contractor_assignments(id),
    paystub_id INTEGER NOT NULL REFERENCES paystubs(id) ON DELETE CASCADE,

    -- Pay period info
    pay_period_begin DATE NOT NULL,
    pay_period_end DATE NOT NULL,

    -- Client's payment (what they paid)
    client_gross_pay NUMERIC(10,2) NOT NULL,
    client_total_hours NUMERIC(8,2),

    -- Contractor earnings breakdown
    contractor_regular_earnings NUMERIC(10,2) NOT NULL,
    contractor_bonus_share NUMERIC(10,2) DEFAULT 0.00,
    contractor_total_earnings NUMERIC(10,2) NOT NULL,

    -- Company's cut
    company_margin NUMERIC(10,2) NOT NULL,

    -- Payment tracking
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid')),
    amount_paid NUMERIC(10,2) DEFAULT 0.00,
    amount_pending NUMERIC(10,2) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(paystub_id)  -- One earning record per paystub
);

-- Contractor Payments (when you actually pay contractors)
CREATE TABLE contractor_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID NOT NULL REFERENCES contractors(id),
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50),  -- 'direct_deposit', 'check', 'cash', 'zelle', etc.
    payment_date DATE NOT NULL,
    transaction_reference VARCHAR(255),
    notes TEXT,
    recorded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Allocations (links payments to specific earnings)
CREATE TABLE payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES contractor_payments(id) ON DELETE CASCADE,
    earning_id UUID NOT NULL REFERENCES contractor_earnings(id),
    amount_allocated NUMERIC(10,2) NOT NULL CHECK (amount_allocated > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(payment_id, earning_id)  -- Prevent double allocation
);

-- Audit Log (track all admin actions)
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,  -- 'upload_paystub', 'create_contractor', 'record_payment'
    entity_type VARCHAR(50),       -- 'paystub', 'contractor', 'payment'
    entity_id TEXT,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

-- Paystubs indexes
CREATE INDEX idx_paystubs_employee ON paystubs(employee_id);
CREATE INDEX idx_paystubs_employee_name ON paystubs(employee_name);
CREATE INDEX idx_paystubs_check_date ON paystubs(check_date);
CREATE INDEX idx_paystubs_pay_period ON paystubs(pay_period_begin, pay_period_end);
CREATE INDEX idx_paystubs_organization ON paystubs(organization);
CREATE INDEX idx_paystubs_contractor_assignment ON paystubs(contractor_assignment_id);
CREATE INDEX idx_paystubs_created_at ON paystubs(created_at);
CREATE INDEX idx_paystubs_data ON paystubs USING GIN (paystub_data);  -- JSONB index

-- Contractors indexes
CREATE INDEX idx_contractors_auth_user ON contractors(auth_user_id);
CREATE INDEX idx_contractors_code ON contractors(contractor_code);
CREATE INDEX idx_contractors_active ON contractors(is_active);

-- Assignments indexes
CREATE INDEX idx_assignments_contractor ON contractor_assignments(contractor_id);
CREATE INDEX idx_assignments_client ON contractor_assignments(client_company_id);
CREATE INDEX idx_assignments_employee_id ON contractor_assignments(client_employee_id);
CREATE INDEX idx_assignments_active ON contractor_assignments(is_active);

-- Earnings indexes
CREATE INDEX idx_earnings_contractor_assignment ON contractor_earnings(contractor_assignment_id);
CREATE INDEX idx_earnings_paystub ON contractor_earnings(paystub_id);
CREATE INDEX idx_earnings_pay_period ON contractor_earnings(pay_period_begin, pay_period_end);
CREATE INDEX idx_earnings_payment_status ON contractor_earnings(payment_status);

-- Payments indexes
CREATE INDEX idx_payments_contractor ON contractor_payments(contractor_id);
CREATE INDEX idx_payments_date ON contractor_payments(payment_date);

-- Allocations indexes
CREATE INDEX idx_allocations_payment ON payment_allocations(payment_id);
CREATE INDEX idx_allocations_earning ON payment_allocations(earning_id);

-- Audit log indexes
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_client_companies_updated_at
    BEFORE UPDATE ON client_companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractors_updated_at
    BEFORE UPDATE ON contractors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractor_assignments_updated_at
    BEFORE UPDATE ON contractor_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_paystubs_updated_at
    BEFORE UPDATE ON paystubs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractor_earnings_updated_at
    BEFORE UPDATE ON contractor_earnings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE paystubs ENABLE ROW LEVEL SECURITY;

-- Contractors: can only see their own data
CREATE POLICY "contractors_own_profile" ON contractors
    FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "contractors_update_own_profile" ON contractors
    FOR UPDATE USING (auth_user_id = auth.uid());

-- Assignments: contractors see only their own
CREATE POLICY "contractors_own_assignments" ON contractor_assignments
    FOR SELECT USING (
        contractor_id IN (
            SELECT id FROM contractors WHERE auth_user_id = auth.uid()
        )
    );

-- Earnings: contractors see only their own
CREATE POLICY "contractors_own_earnings" ON contractor_earnings
    FOR SELECT USING (
        contractor_assignment_id IN (
            SELECT id FROM contractor_assignments
            WHERE contractor_id IN (
                SELECT id FROM contractors
                WHERE auth_user_id = auth.uid()
            )
        )
    );

-- Payments: contractors see only their own
CREATE POLICY "contractors_own_payments" ON contractor_payments
    FOR SELECT USING (
        contractor_id IN (
            SELECT id FROM contractors WHERE auth_user_id = auth.uid()
        )
    );

-- Admins: see everything (bypass RLS)
CREATE POLICY "admins_all_contractors" ON contractors
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "admins_all_assignments" ON contractor_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "admins_all_earnings" ON contractor_earnings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "admins_all_payments" ON contractor_payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "admins_all_paystubs" ON paystubs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert AP Account Services as first client company
INSERT INTO client_companies (name, code, address, is_active)
VALUES (
    'AP Account Services LLC',
    'ap_account_services',
    '9311 San Pedro Ave Suite 600, San Antonio, TX 78216',
    true
)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- COMMENTS for Documentation
-- ============================================================================

COMMENT ON TABLE client_companies IS 'Client organizations that provide work';
COMMENT ON TABLE contractors IS 'Contractor profiles linked to Supabase auth.users';
COMMENT ON TABLE contractor_assignments IS 'Links contractors to clients with rate structures (fixed or percentage)';
COMMENT ON TABLE contractor_earnings IS 'Calculated earnings from paystubs';
COMMENT ON TABLE contractor_payments IS 'Actual payments made to contractors';
COMMENT ON TABLE payment_allocations IS 'Links payments to specific earnings (for tracking which earnings have been paid)';
COMMENT ON TABLE paystubs IS 'Complete paystub data with JSON storage';
COMMENT ON TABLE audit_log IS 'Audit trail of all admin actions';

COMMENT ON COLUMN contractor_assignments.rate_type IS 'fixed (hourly rate) or percentage (% of client payment)';
COMMENT ON COLUMN contractor_assignments.bonus_split_percentage IS 'Contractor share of bonuses (default 50%, configurable per contractor)';
COMMENT ON COLUMN contractor_earnings.company_margin IS 'SENSITIVE: What company makes (hidden from contractors)';
COMMENT ON COLUMN paystubs.paystub_data IS 'Complete paystub JSON including YTD values, earnings, deductions, payment_info';
COMMENT ON COLUMN paystubs.file_hash IS 'SHA-256 hash of PDF file to prevent duplicate uploads';
