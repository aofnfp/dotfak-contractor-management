# Quick Start Guide

## Test the Platform in 2 Minutes

### Step 1: Start the Backend Server

```bash
cd "/Users/abrahamoladotun/Documents/Paystub Extractor"
python backend/main.py
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Application startup complete.
```

### Step 2: Run All Tests (in a new terminal)

```bash
cd "/Users/abrahamoladotun/Documents/Paystub Extractor"
./run_all_tests.sh
```

**Expected Output:**
```
============================================================
DotFak Platform - Test Suite
============================================================

✅ Backend server is running

============================================================
Phase 2: Contractor Management Tests
============================================================
✅ Logged in as admin
✅ Created contractor: John Doe (CONT-001)
✅ Created assignment: $4.00/hr, 50% bonus split
...

============================================================
Phase 3: Paystub Processing & Earnings Tests
============================================================
✅ Uploaded paystub
✅ Auto-matched to contractor
✅ Earnings calculated: $325.04
...

============================================================
Phase 4: Payment Tracking & Allocation Tests
============================================================
✅ Recorded payment: $200.00
✅ FIFO allocation successful
✅ Status updated: unpaid → partially_paid
...

============================================================
Test Results Summary
============================================================
✅ Phase 2 Tests: PASSED
✅ Phase 3 Tests: PASSED
✅ Phase 4 Tests: PASSED

🎉 ALL TESTS PASSED! 🎉

Platform is working perfectly!
```

---

## What Just Happened?

The tests just verified:

### ✅ Phase 2: Contractor Management
- Created contractor "John Doe" with auth account
- Linked him to "AP Account Services" at $4/hr
- Set 50/50 bonus split

### ✅ Phase 3: Paystub Processing
- Uploaded real paystub PDF
- Auto-matched to John Doe by employee ID
- Calculated his earnings: $325.04
- Company margin: $385.99

### ✅ Phase 4: Payment Tracking
- Recorded $200 payment
- Auto-allocated to oldest earnings (FIFO)
- Updated status: unpaid → partially_paid
- Recorded $50 payment
- Final state: $250 paid, $75.04 pending

---

## Test Individual Phases

### Test Only Phase 2 (Contractor Management)
```bash
python backend/test_contractors.py
```

### Test Only Phase 3 (Paystub Processing)
```bash
python backend/test_paystub_flow.py
```

### Test Only Phase 4 (Payment Tracking)
```bash
python backend/test_payment_flow.py
```

---

## Manual API Testing

### 1. Get Your Login Token

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@gmail.com","password":"TestPass123!"}'
```

Save the `access_token` from the response.

### 2. Test Any Endpoint

```bash
# List all contractors
curl http://localhost:8000/contractors \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# View earnings
curl http://localhost:8000/earnings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Upload a paystub
curl -X POST http://localhost:8000/paystubs/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@SampleData/Payslip_to_Print_02_04_2026.pdf" \
  -F "organization=ap_account_services"
```

---

## Next Steps

📖 **Detailed Testing:** See [TESTING_GUIDE.md](TESTING_GUIDE.md) for comprehensive testing scenarios

📊 **System Overview:** See [PHASES_2_3_4_COMPLETE.md](PHASES_2_3_4_COMPLETE.md) for complete documentation

🚀 **Ready for Phase 5:** Build the admin frontend dashboard

---

## Troubleshooting

### Server won't start?
```bash
# Check if port 8000 is already in use
lsof -ti:8000

# Kill the process
kill -9 $(lsof -ti:8000)

# Try again
python backend/main.py
```

### Tests failing?
1. Make sure the server is running in another terminal
2. Check your `.env` file has all Supabase credentials
3. Verify database tables exist in Supabase
4. Check that `SampleData/Payslip_to_Print_02_04_2026.pdf` exists

### "Invalid token" errors?
The test scripts handle authentication automatically. If testing manually:
1. Login to get a fresh token
2. Token expires after 1 hour - get a new one

---

**That's it! You're ready to test the complete platform. 🚀**
