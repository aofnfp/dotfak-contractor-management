#!/usr/bin/env python3
"""
Set up PostgreSQL database for paystub storage.

Creates tables and indexes needed for the paystub extractor system.
"""

import argparse
import sys
import os
from dotenv import load_dotenv

try:
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
except ImportError:
    print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)


DATABASE_SCHEMA = """
-- Drop existing tables if recreating
DROP TABLE IF EXISTS paystubs CASCADE;

-- Main paystubs table
CREATE TABLE paystubs (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(255) NOT NULL,
    organization VARCHAR(100) NOT NULL,
    pay_period_begin DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    check_date DATE,
    net_pay NUMERIC(10, 2),
    gross_pay NUMERIC(10, 2),
    paystub_data JSONB NOT NULL,  -- Complete paystub as JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure no duplicate paystubs
    UNIQUE(employee_id, pay_period_begin, pay_period_end, organization)
);

-- Indexes for efficient querying
CREATE INDEX idx_paystubs_employee ON paystubs(employee_id);
CREATE INDEX idx_paystubs_employee_name ON paystubs(employee_name);
CREATE INDEX idx_paystubs_check_date ON paystubs(check_date);
CREATE INDEX idx_paystubs_pay_period ON paystubs(pay_period_begin, pay_period_end);
CREATE INDEX idx_paystubs_organization ON paystubs(organization);
CREATE INDEX idx_paystubs_created_at ON paystubs(created_at);

-- GIN index for JSONB queries (allows fast JSON queries)
CREATE INDEX idx_paystubs_data ON paystubs USING GIN (paystub_data);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_paystubs_updated_at
    BEFORE UPDATE ON paystubs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE paystubs IS 'Stores employee paystub data with complete JSON in paystub_data field';
COMMENT ON COLUMN paystubs.paystub_data IS 'Complete paystub as JSON including all earnings, taxes, deductions, etc.';
COMMENT ON COLUMN paystubs.employee_id IS 'Employee ID from the paystub';
COMMENT ON COLUMN paystubs.pay_period_begin IS 'Start date of pay period';
COMMENT ON COLUMN paystubs.pay_period_end IS 'End date of pay period';
"""


def setup_database(connection_string: str = None, drop_existing: bool = False):
    """
    Set up database schema.

    Args:
        connection_string: PostgreSQL connection string
        drop_existing: If True, drop existing tables first

    Raises:
        Exception: If database setup fails
    """
    if not connection_string:
        connection_string = os.getenv('DATABASE_URL')

    if not connection_string:
        raise ValueError(
            "No database connection string provided. "
            "Set DATABASE_URL in .env or pass via --connection-string"
        )

    print("Setting up database...")
    print(f"Connection: {connection_string.split('@')[1] if '@' in connection_string else 'localhost'}")

    try:
        # Connect to database
        conn = psycopg2.connect(connection_string)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        print("\nExecuting schema...")

        # Execute schema
        cursor.execute(DATABASE_SCHEMA)

        print("✓ Tables created")
        print("✓ Indexes created")
        print("✓ Triggers created")

        # Verify tables
        cursor.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'paystubs'
        """)

        if cursor.fetchone():
            print("\n✓ Database setup complete!")
            print("\nCreated tables:")
            print("  - paystubs")
        else:
            raise Exception("Table creation verification failed")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"\n✗ Database setup failed: {e}", file=sys.stderr)
        raise


def main():
    """Main execution function."""
    load_dotenv()

    parser = argparse.ArgumentParser(
        description="Set up PostgreSQL database for paystub storage"
    )
    parser.add_argument(
        "--connection-string",
        help="PostgreSQL connection string (or set DATABASE_URL in .env)",
        default=None
    )
    parser.add_argument(
        "--drop-existing",
        action="store_true",
        help="Drop existing tables (WARNING: deletes all data)"
    )

    args = parser.parse_args()

    if args.drop_existing:
        response = input("WARNING: This will delete all existing data. Continue? (yes/no): ")
        if response.lower() != 'yes':
            print("Aborted.")
            sys.exit(0)

    try:
        setup_database(args.connection_string, args.drop_existing)
        sys.exit(0)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
