# Database Setup for DotFak Group LLC Platform

## Apply Schema to Supabase

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard/project/pcatbotfxeqrinydewen
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the contents of `001_initial_schema.sql`
5. Click "Run" to execute

### Option 2: Via Supabase CLI

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref pcatbotfxeqrinydewen

# Run migration
supabase db push
```

### Option 3: Via psql

```bash
# Get your database connection string from Supabase dashboard
# Settings → Database → Connection string → URI

psql "postgresql://postgres:[PASSWORD]@db.pcatbotfxeqrinydewen.supabase.co:5432/postgres" -f 001_initial_schema.sql
```

## Verify Setup

After running the migration, verify tables were created:

```sql
-- Run in SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see:
- audit_log
- client_companies
- contractor_assignments
- contractor_earnings
- contractor_payments
- contractors
- payment_allocations
- paystubs

## Next Steps

1. Create your first admin user in Supabase Auth:
   - Go to Authentication → Users
   - Click "Add user"
   - Email: admin@dotfakgroup.com
   - Password: (choose a strong password)
   - User metadata: `{"role": "admin"}`

2. Get your Supabase credentials:
   - Project URL: https://pcatbotfxeqrinydewen.supabase.co
   - Go to Settings → API
   - Copy: `anon` key, `service_role` key, `JWT secret`

3. Create `.env` file with credentials (see next section)

## Environment Variables

Create `.env` file in project root with:

```bash
# Supabase Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.pcatbotfxeqrinydewen.supabase.co:5432/postgres

# Supabase Auth & API
SUPABASE_URL=https://pcatbotfxeqrinydewen.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here
SUPABASE_JWT_SECRET=your-jwt-secret-here

# API Config
API_HOST=0.0.0.0
API_PORT=8000

# Frontend (for CORS)
FRONTEND_URL=http://localhost:3000
```

Replace the placeholders with actual values from your Supabase dashboard.

## Test Data

The migration automatically creates:
- ✅ AP Account Services LLC as first client company

You'll need to manually create your first contractor through the API once it's built.
