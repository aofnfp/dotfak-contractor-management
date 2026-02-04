#!/bin/bash
# Run all tests for DotFak Contractor Management Platform

echo "============================================================"
echo "DotFak Platform - Test Suite"
echo "============================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo "${YELLOW}Checking if backend server is running...${NC}"
if curl -s http://localhost:8000/ > /dev/null 2>&1; then
    echo "${GREEN}✅ Backend server is running${NC}"
else
    echo "${RED}❌ Backend server is not running${NC}"
    echo ""
    echo "Please start the server first:"
    echo "  python backend/main.py"
    echo ""
    exit 1
fi

echo ""
echo "============================================================"
echo "Phase 2: Contractor Management Tests"
echo "============================================================"
python backend/test_contractors.py
PHASE2_EXIT=$?

echo ""
echo "============================================================"
echo "Phase 3: Paystub Processing & Earnings Tests"
echo "============================================================"
python backend/test_paystub_flow.py
PHASE3_EXIT=$?

echo ""
echo "============================================================"
echo "Phase 4: Payment Tracking & Allocation Tests"
echo "============================================================"
python backend/test_payment_flow.py
PHASE4_EXIT=$?

echo ""
echo "============================================================"
echo "Test Results Summary"
echo "============================================================"

if [ $PHASE2_EXIT -eq 0 ]; then
    echo "${GREEN}✅ Phase 2 Tests: PASSED${NC}"
else
    echo "${RED}❌ Phase 2 Tests: FAILED${NC}"
fi

if [ $PHASE3_EXIT -eq 0 ]; then
    echo "${GREEN}✅ Phase 3 Tests: PASSED${NC}"
else
    echo "${RED}❌ Phase 3 Tests: FAILED${NC}"
fi

if [ $PHASE4_EXIT -eq 0 ]; then
    echo "${GREEN}✅ Phase 4 Tests: PASSED${NC}"
else
    echo "${RED}❌ Phase 4 Tests: FAILED${NC}"
fi

echo ""

# Overall result
if [ $PHASE2_EXIT -eq 0 ] && [ $PHASE3_EXIT -eq 0 ] && [ $PHASE4_EXIT -eq 0 ]; then
    echo "${GREEN}🎉 ALL TESTS PASSED! 🎉${NC}"
    echo ""
    echo "Platform is working perfectly!"
    exit 0
else
    echo "${RED}⚠️  SOME TESTS FAILED${NC}"
    echo ""
    echo "Please check the output above for details."
    exit 1
fi
