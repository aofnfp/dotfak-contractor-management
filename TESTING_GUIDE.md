# Testing Guide: DotFak Contractor Management Platform

## Prerequisites

Before testing, ensure you have:

✅ **Backend Dependencies Installed:**
```bash
pip install fastapi uvicorn supabase python-multipart python-dotenv pydantic
```

✅ **Environment Variables Set:**
Check that `.env` file exists with:
```bash
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
SUPABASE_JWT_SECRET=...
```

✅ **Database Tables Created:**
All tables should be created in Supabase (contractors, contractor_assignments, contractor_earnings, contractor_payments, payment_allocations)

---

## Quick Start: Run All Tests

### 1. Start the Backend Server

```bash
cd "/Users/abrahamoladotun/Documents/Paystub Extractor"
python backend/main.py
```

Server will start at: `http://localhost:8000`

### 2. Run Automated Test Scripts (in separate terminal)

```bash
# Test Phase 2: Contractor Management
python backend/test_contractors.py

# Test Phase 3: Paystub Processing & Earnings
python backend/test_paystub_flow.py

# Test Phase 4: Payment Tracking & Allocation
python backend/test_payment_flow.py
```

---

## Manual Testing Guide

### Step 1: Test Authentication

#### Create Admin Account (if not exists)
```bash
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@dotfakgroup.com",
    "password": "Admin123!",
    "role": "admin"
  }'
```

#### Login to Get Token
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@dotfakgroup.com",
    "password": "Admin123!"
  }'
```

**Save the access_token** from the response - you'll need it for all subsequent requests!

```bash
# Example response:
{
  "user": {...},
  "session": {
    "access_token": "eyJhbGc...",  # <- Use this token
    "refresh_token": "...",
    "expires_in": 3600
  }
}
```

**For convenience, save your token:**
```bash
export TOKEN="eyJhbGc..."  # Replace with your actual token
```

---

### Step 2: Create Client Company

```bash
curl -X POST http://localhost:8000/api/v1/companies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "AP Account Services",
    "industry": "Staffing",
    "contact_email": "contact@apaccount.com"
  }'
```

**Save the company_id** from the response.

---

### Step 3: Create Contractor

```bash
curl -X POST http://localhost:8000/contractors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "Contractor123!",
    "first_name": "John",
    "last_name": "Doe",
    "contractor_code": "CONT-001",
    "phone": "+1234567890",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip_code": "10001"
  }'
```

**Expected Response:**
```json
{
  "id": "uuid-here",
  "contractor_code": "CONT-001",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "is_active": true,
  "created_at": "2025-02-04T..."
}
```

**Save the contractor_id** (the UUID).

---

### Step 4: Create Assignment (Link Contractor to Client)

```bash
curl -X POST http://localhost:8000/assignments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contractor_id": "your-contractor-uuid",
    "client_company_id": "your-company-uuid",
    "client_employee_id": "000074267",
    "rate_type": "fixed",
    "fixed_hourly_rate": 4.00,
    "bonus_split_percentage": 50.00,
    "start_date": "2025-01-01"
  }'
```

**Rate Structure Options:**

**Option A: Fixed Rate** (e.g., $4/hr)
```json
{
  "rate_type": "fixed",
  "fixed_hourly_rate": 4.00,
  "bonus_split_percentage": 50.00
}
```

**Option B: Percentage Rate** (e.g., 25% of client's payment)
```json
{
  "rate_type": "percentage",
  "percentage_rate": 25.00,
  "bonus_split_percentage": 50.00
}
```

**Expected Response:**
```json
{
  "id": "assignment-uuid",
  "contractor_id": "...",
  "client_company_id": "...",
  "client_employee_id": "000074267",
  "rate_type": "fixed",
  "fixed_hourly_rate": 4.00,
  "bonus_split_percentage": 50.00,
  "is_active": true,
  "start_date": "2025-01-01"
}
```

---

### Step 5: Upload Paystub (Auto-Calculate Earnings)

```bash
curl -X POST http://localhost:8000/paystubs/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@SampleData/Payslip_to_Print_02_04_2026.pdf" \
  -F "organization=ap_account_services"
```

**What Happens:**
1. ✅ PDF is uploaded and parsed
2. ✅ SHA-256 hash calculated (duplicate detection)
3. ✅ Employee ID extracted: "000074267"
4. ✅ Auto-matched to contractor assignment
5. ✅ Earnings calculated automatically
6. ✅ Paystub and earnings saved to database

**Expected Response:**
```json
{
  "paystub": {
    "id": "paystub-uuid",
    "employee_name": "Abraham Oladotun",
    "pay_period_begin": "2025-01-26",
    "pay_period_end": "2025-02-08",
    "gross_pay": 711.03,
    "net_pay": 656.64
  },
  "assignment": {
    "contractor_id": "...",
    "rate_type": "fixed",
    "fixed_hourly_rate": 4.00
  },
  "earnings": {
    "id": "earning-uuid",
    "pay_period_begin": "2025-01-26",
    "pay_period_end": "2025-02-08",
    "client_gross_pay": 711.03,
    "client_total_hours": 40.42,
    "contractor_regular_earnings": 161.68,
    "contractor_bonus_share": 0.00,
    "contractor_total_earnings": 161.68,
    "company_margin": 549.35,
    "payment_status": "unpaid",
    "amount_paid": 0.00,
    "amount_pending": 161.68
  }
}
```

**Test Duplicate Detection:**
```bash
# Upload the same file again - should get 409 error
curl -X POST http://localhost:8000/paystubs/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@SampleData/Payslip_to_Print_02_04_2026.pdf" \
  -F "organization=ap_account_services"
```

Expected: `409 Conflict - "Duplicate paystub detected"`

---

### Step 6: View Earnings

#### View All Earnings (Admin)
```bash
curl http://localhost:8000/earnings \
  -H "Authorization: Bearer $TOKEN"
```

#### View Specific Contractor's Earnings
```bash
curl "http://localhost:8000/earnings?contractor_id=your-contractor-uuid" \
  -H "Authorization: Bearer $TOKEN"
```

#### View Earnings Summary
```bash
curl http://localhost:8000/payments/contractor/your-contractor-uuid/summary \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Summary:**
```json
{
  "total_earned": 161.68,
  "total_paid": 0.00,
  "total_pending": 161.68,
  "earnings_count": 1,
  "oldest_unpaid_date": "2025-01-26"
}
```

---

### Step 7: Record Payment (FIFO Allocation)

#### Automatic FIFO Allocation
```bash
curl -X POST http://localhost:8000/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contractor_id": "your-contractor-uuid",
    "amount": 100.00,
    "payment_method": "direct_deposit",
    "payment_date": "2025-02-15",
    "transaction_reference": "TXN-001",
    "notes": "Partial payment"
  }'
```

**What Happens:**
1. ✅ Payment record created
2. ✅ Oldest unpaid earnings found (FIFO)
3. ✅ Payment allocated to earnings
4. ✅ Earning status updated: unpaid → partially_paid
5. ✅ Amount paid/pending updated

**Expected Response:**
```json
{
  "id": "payment-uuid",
  "contractor_id": "...",
  "amount": 100.00,
  "payment_method": "direct_deposit",
  "payment_date": "2025-02-15",
  "transaction_reference": "TXN-001",
  "allocations": [
    {
      "earning_id": "earning-uuid",
      "amount_allocated": 100.00
    }
  ]
}
```

#### Manual Allocation (Optional)
```bash
curl -X POST http://localhost:8000/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contractor_id": "your-contractor-uuid",
    "amount": 50.00,
    "payment_method": "check",
    "payment_date": "2025-02-16",
    "allocate_to_earnings": [
      {
        "earning_id": "specific-earning-uuid",
        "amount": 50.00
      }
    ]
  }'
```

---

### Step 8: Verify Payment Status

#### Check Updated Earnings
```bash
curl http://localhost:8000/earnings/your-earning-uuid \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:**
```json
{
  "id": "earning-uuid",
  "payment_status": "partially_paid",  # Changed from "unpaid"
  "amount_paid": 100.00,               # Was 0.00
  "amount_pending": 61.68,             # Was 161.68
  "contractor_total_earnings": 161.68
}
```

#### Check Updated Summary
```bash
curl http://localhost:8000/payments/contractor/your-contractor-uuid/summary \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:**
```json
{
  "total_earned": 161.68,
  "total_paid": 100.00,      # Updated
  "total_pending": 61.68,    # Updated
  "earnings_count": 1
}
```

---

## Testing Scenarios

### Scenario 1: Complete Payment Flow

**Goal:** Test entire workflow from contractor creation to full payment.

```bash
# 1. Create contractor with assignment ($4/hr fixed)
# 2. Upload paystub (earnings: $161.68)
# 3. Record partial payment ($100)
# 4. Verify status: partially_paid, $61.68 pending
# 5. Record final payment ($61.68)
# 6. Verify status: paid, $0 pending
```

### Scenario 2: Multiple Earnings Payment (FIFO)

**Goal:** Test FIFO allocation across multiple earnings.

```bash
# 1. Upload paystub for Jan 26 - Feb 8 (earnings: $161.68)
# 2. Upload paystub for Feb 9 - Feb 22 (earnings: $200.00)
# 3. Record payment of $250
# 4. Verify: First earning fully paid ($161.68), second partially paid ($88.32)
```

### Scenario 3: Percentage-Based Rate

**Goal:** Test percentage rate calculation.

```bash
# 1. Create assignment with rate_type="percentage", percentage_rate=25.00
# 2. Upload paystub with $711.03 gross
# 3. Verify contractor earns 25% = $177.76
```

### Scenario 4: Bonus Split

**Goal:** Test bonus identification and split.

```bash
# 1. Upload paystub with "Retention Bonus: $700"
# 2. Verify contractor gets 50% = $350
# 3. Verify company keeps 50% = $350
```

### Scenario 5: Contractor Login (Data Filtering)

**Goal:** Test contractor sees only their data (no company_margin).

```bash
# 1. Login as contractor: john.doe@example.com
# 2. View earnings
# 3. Verify response excludes company_margin and client_gross_pay
```

---

## Testing with Postman

### Import Collection

Create a Postman collection with these requests:

**1. Environment Variables:**
```
base_url: http://localhost:8000
token: (set after login)
contractor_id: (set after creating contractor)
company_id: (set after creating company)
earning_id: (set after uploading paystub)
```

**2. Collection Structure:**
```
DotFak API Testing
├── Auth
│   ├── Signup Admin
│   ├── Login Admin
│   ├── Signup Contractor
│   └── Login Contractor
├── Contractors
│   ├── Create Contractor
│   ├── List Contractors
│   ├── Get Contractor
│   └── Update Contractor
├── Assignments
│   ├── Create Assignment (Fixed Rate)
│   ├── Create Assignment (Percentage)
│   └── List Assignments
├── Paystubs
│   ├── Upload Paystub
│   ├── Upload Duplicate (Test 409)
│   └── List Paystubs
├── Earnings
│   ├── List Earnings
│   ├── Get Earning Details
│   ├── Get Earnings Summary
│   └── List Unpaid Earnings
└── Payments
    ├── Record Payment (Auto FIFO)
    ├── Record Payment (Manual)
    ├── List Payments
    └── Get Payment Details
```

---

## Automated Test Scripts

### Test 1: Contractor Management
```bash
python backend/test_contractors.py
```

**Tests:**
- ✅ Create contractor with auth account
- ✅ Create assignment with rate structure
- ✅ List contractors
- ✅ Update contractor
- ✅ Role-based authorization

### Test 2: Paystub Flow
```bash
python backend/test_paystub_flow.py
```

**Tests:**
- ✅ Upload PDF and parse
- ✅ Extract employee ID
- ✅ Auto-match to contractor
- ✅ Calculate earnings
- ✅ Detect duplicates

### Test 3: Payment Flow
```bash
python backend/test_payment_flow.py
```

**Tests:**
- ✅ Record payment
- ✅ FIFO allocation
- ✅ Status updates (unpaid → partially_paid → paid)
- ✅ Earnings summary calculation
- ✅ Payment history

---

## Common Issues & Solutions

### Issue 1: "Invalid or expired token" (401)
**Cause:** Token expired or not set correctly
**Solution:** Login again and get fresh token
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dotfakgroup.com","password":"Admin123!"}'
```

### Issue 2: "Contractor assignment not found"
**Cause:** No active assignment for the employee ID in paystub
**Solution:** Create assignment with correct `client_employee_id`
```bash
# Must match employee ID in paystub (e.g., "000074267")
```

### Issue 3: "Duplicate paystub detected" (409)
**Cause:** File already uploaded (same SHA-256 hash)
**Solution:** This is expected behavior! Use a different paystub or delete the existing one first.

### Issue 4: "Rate structure invalid"
**Cause:** Both fixed_hourly_rate and percentage_rate set, or neither set
**Solution:** Use EITHER fixed OR percentage, not both:
```json
// Correct (Fixed):
{"rate_type": "fixed", "fixed_hourly_rate": 4.00}

// Correct (Percentage):
{"rate_type": "percentage", "percentage_rate": 25.00}

// Wrong:
{"rate_type": "fixed", "fixed_hourly_rate": 4.00, "percentage_rate": 25.00}
```

### Issue 5: Server won't start
**Cause:** Port 8000 already in use
**Solution:** Kill existing process or use different port
```bash
# Find process
lsof -ti:8000

# Kill process
kill -9 $(lsof -ti:8000)

# Or use different port
uvicorn backend.main:app --port 8001
```

---

## Expected Test Results

### ✅ All Tests Passing
```
============================================================
Contractor Management Tests
============================================================
✅ Admin login successful
✅ Created contractor: John Doe (CONT-001)
✅ Created assignment: $4.00/hr, 50% bonus split
✅ Retrieved contractor details
✅ Listed contractors (1 found)
✅ Updated contractor phone

============================================================
Paystub Processing Tests
============================================================
✅ Uploaded paystub: Payslip_to_Print_02_04_2026.pdf
✅ Extracted employee ID: 000074267
✅ Auto-matched to contractor: John Doe
✅ Calculated earnings: $161.68
✅ Duplicate detection working (409 error)

============================================================
Payment Tracking Tests
============================================================
✅ Initial state: $161.68 pending, $0 paid
✅ Recorded payment: $100.00
✅ FIFO allocation successful
✅ Status updated: unpaid → partially_paid
✅ New state: $61.68 pending, $100 paid
✅ Recorded final payment: $61.68
✅ Status updated: partially_paid → paid
✅ Final state: $0 pending, $161.68 paid

============================================================
All Tests Complete! 🎉
============================================================
```

---

## Performance Benchmarks

**Expected Response Times:**
- Login: < 500ms
- Create contractor: < 300ms
- Upload paystub: < 2s (includes PDF parsing)
- Calculate earnings: < 100ms
- Record payment: < 500ms
- List earnings: < 200ms

**Scalability:**
- Handles 100+ contractors
- Processes 1000+ paystubs
- Supports concurrent uploads
- Database queries optimized with indexes

---

## Next Steps After Testing

Once all tests pass:

1. **Deploy Backend** → Render.com (free tier)
2. **Deploy Database** → Supabase (already deployed)
3. **Build Frontend** → Phase 5 (Admin dashboard)
4. **Add Monitoring** → Sentry, UptimeRobot
5. **Go Live!** → Production ready

---

## Support

**Test Data:**
- Sample paystub: `SampleData/Payslip_to_Print_02_04_2026.pdf`
- Employee ID: 000074267
- Pay period: 2025-01-26 to 2025-02-08
- Gross pay: $711.03

**Documentation:**
- [PHASE2_COMPLETE.md](PHASE2_COMPLETE.md) - Contractor management
- [PHASE3_COMPLETE.md](PHASE3_COMPLETE.md) - Paystub processing
- [PHASE4_COMPLETE.md](PHASE4_COMPLETE.md) - Payment tracking
- [PHASES_2_3_4_COMPLETE.md](PHASES_2_3_4_COMPLETE.md) - Complete summary

**Need Help?**
- Check error logs in terminal
- Verify .env file has all credentials
- Ensure database tables exist in Supabase
- Confirm sample PDF is in SampleData/ directory

---

**Happy Testing! 🚀**
