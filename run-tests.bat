@echo off
REM Comprehensive Test Runner for Medhelm Backend APIs and Notifications
REM Windows batch version

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║   MEDHELM SUPPLIES - API ^& NOTIFICATION TEST SUITE            ║
echo ║   Comprehensive Automated Testing                              ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Configuration
set TEST_DIR=tests
set REPORTS_DIR=test-reports
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set TIMESTAMP=%mydate%_%mytime%
set TEST_REPORT=%REPORTS_DIR%\test-report-%TIMESTAMP%.json
set COVERAGE_REPORT=%REPORTS_DIR%\coverage-report-%TIMESTAMP%

REM Create reports directory
if not exist "%REPORTS_DIR%" mkdir "%REPORTS_DIR%"

REM Step 1: Environment Setup
echo [1/6] Setting up test environment...
if not exist ".env.test" (
  echo Creating .env.test file...
  (
    echo NODE_ENV=test
    echo MONGO_URI_TEST=mongodb://localhost:27017/medhelm-test
    echo EMAIL_HOST=test-smtp
    echo EMAIL_PORT=587
    echo EMAIL_USER=test@example.com
    echo EMAIL_PASS=test-password
    echo EMAIL_FROM=noreply@medhelmsupplies.co.ke
    echo BREVO_API_KEY=test-brevo-key
    echo SMS_SENDER=Medhelm-Test
    echo LOG_LEVEL=error
  ) > .env.test
  echo ✓ .env.test created
)
echo.

REM Step 2: Verify Dependencies
echo [2/6] Verifying dependencies...
if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
)
echo ✓ Dependencies verified
echo.

REM Step 3: Run Unit Tests
echo [3/6] Running API Unit Tests...
echo   Testing: Authentication, Products, Orders, Cart
call npm test -- --testPathPattern="auth|products|orders" --json --outputFile="%TEST_REPORT%" --coverage --coverageDirectory="%COVERAGE_REPORT%"
if !errorlevel! neq 0 (
  echo ✗ Unit tests failed
  exit /b 1
)
echo ✓ Unit tests passed
echo.

REM Step 4: Run Notification Tests
echo [4/6] Running Notification Delivery Tests...
echo   Testing: Email ^(Brevo/SMTP^), SMS, In-App, Multi-channel
call npm test -- --testPathPattern="notifications" --json --outputFile="%TEST_REPORT%" --coverage
if !errorlevel! neq 0 (
  echo ✗ Notification tests failed
  exit /b 1
)
echo ✓ Notification tests passed
echo.

REM Step 5: Run Review Tests
echo [5/6] Running Review ^& Rating Tests...
echo   Testing: Product reviews, General reviews, Ratings
call npm test -- --testPathPattern="reviews" --json --outputFile="%TEST_REPORT%" --coverage
if !errorlevel! neq 0 (
  echo ✗ Review tests failed
  exit /b 1
)
echo ✓ Review tests passed
echo.

REM Step 6: Generate Coverage Report
echo [6/6] Generating Coverage Report...
echo   Report saved to: %COVERAGE_REPORT%
call npm test -- --coverage --coverageDirectory="%COVERAGE_REPORT%" --silent
echo ✓ Coverage report generated
echo.

REM Summary
echo ╔════════════════════════════════════════════════════════════════╗
echo ║   ALL TESTS COMPLETED SUCCESSFULLY                           ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo Test Reports:
echo   - Full Report: %TEST_REPORT%
echo   - Coverage: %COVERAGE_REPORT%\index.html
echo.
echo Next Steps:
echo   1. Review test-reports\test-report-%TIMESTAMP%.json for results
echo   2. Check coverage report: open %COVERAGE_REPORT%\index.html
echo   3. Deploy changes if all tests pass
echo.
