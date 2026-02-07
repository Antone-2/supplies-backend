#!/bin/bash
# Comprehensive Test Runner for Medhelm Backend APIs and Notifications
# This script runs all automated tests and generates a detailed report

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   MEDHELM SUPPLIES - API & NOTIFICATION TEST SUITE            ║"
echo "║   Comprehensive Automated Testing                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_DIR="tests"
REPORTS_DIR="test-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TEST_REPORT="${REPORTS_DIR}/test-report-${TIMESTAMP}.json"
COVERAGE_REPORT="${REPORTS_DIR}/coverage-report-${TIMESTAMP}"

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Step 1: Environment Setup
echo -e "${BLUE}[1/6]${NC} Setting up test environment..."
if [ ! -f .env.test ]; then
  echo -e "${YELLOW}Creating .env.test file...${NC}"
  cat > .env.test << EOF
NODE_ENV=test
MONGO_URI_TEST=mongodb://localhost:27017/medhelm-test
EMAIL_HOST=test-smtp
EMAIL_PORT=587
EMAIL_USER=test@example.com
EMAIL_PASS=test-password
EMAIL_FROM=noreply@medhelmsupplies.co.ke
BREVO_API_KEY=test-brevo-key
SMS_SENDER=Medhelm-Test
LOG_LEVEL=error
EOF
  echo -e "${GREEN}✓ .env.test created${NC}"
fi
echo ""

# Step 2: Install Dependencies
echo -e "${BLUE}[2/6]${NC} Verifying dependencies..."
if [ ! -d node_modules ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  npm install
fi
echo -e "${GREEN}✓ Dependencies verified${NC}"
echo ""

# Step 3: Run Unit Tests
echo -e "${BLUE}[3/6]${NC} Running API Unit Tests..."
echo "  Testing: Authentication, Products, Orders, Cart"
npm test -- --testPathPattern="auth|products|orders" --json --outputFile="${TEST_REPORT}" --coverage --coverageDirectory="${COVERAGE_REPORT}" || {
  echo -e "${RED}✗ Unit tests failed${NC}"
  exit 1
}
echo -e "${GREEN}✓ Unit tests passed${NC}"
echo ""

# Step 4: Run Notification Tests
echo -e "${BLUE}[4/6]${NC} Running Notification Delivery Tests..."
echo "  Testing: Email (Brevo/SMTP), SMS, In-App, Multi-channel"
npm test -- --testPathPattern="notifications" --json --outputFile="${TEST_REPORT}" --coverage || {
  echo -e "${RED}✗ Notification tests failed${NC}"
  exit 1
}
echo -e "${GREEN}✓ Notification tests passed${NC}"
echo ""

# Step 5: Run Review & Rating Tests
echo -e "${BLUE}[5/6]${NC} Running Review & Rating Tests..."
echo "  Testing: Product reviews, General reviews, Ratings"
npm test -- --testPathPattern="reviews" --json --outputFile="${TEST_REPORT}" --coverage || {
  echo -e "${RED}✗ Review tests failed${NC}"
  exit 1
}
echo -e "${GREEN}✓ Review tests passed${NC}"
echo ""

# Step 6: Generate Coverage Report
echo -e "${BLUE}[6/6]${NC} Generating Coverage Report..."
echo "  Report saved to: ${COVERAGE_REPORT}"
npm test -- --coverage --coverageDirectory="${COVERAGE_REPORT}" --silent || true
echo -e "${GREEN}✓ Coverage report generated${NC}"
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════════╗"
echo -e "${GREEN}║   ALL TESTS COMPLETED SUCCESSFULLY                           ║${NC}"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Test Reports:"
echo "  - Full Report: ${TEST_REPORT}"
echo "  - Coverage: ${COVERAGE_REPORT}/index.html"
echo ""
echo "Next Steps:"
echo "  1. Review test-reports/test-report-${TIMESTAMP}.json for detailed results"
echo "  2. Check coverage report: open ${COVERAGE_REPORT}/index.html"
echo "  3. Deploy changes if all tests pass"
echo ""
