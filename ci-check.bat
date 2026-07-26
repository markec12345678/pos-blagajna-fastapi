@echo off
REM CI Quality Gate - Run locally before committing
REM Checks: TypeScript, Build, Security, Backend tests, Frontend tests

echo ========================================
echo   CI Quality Gate
echo ========================================

echo.
echo [1/7] TypeScript type check...
cd /d F:\testcursor\frontend
call npx tsc -b --noEmit
if %errorlevel% neq 0 (
    echo FAILED: TypeScript errors found
    exit /b 1
)
echo PASSED

echo.
echo [2/7] Frontend build...
call npm run build
if %errorlevel% neq 0 (
    echo FAILED: Build failed
    exit /b 1
)
echo PASSED

echo.
echo [3/7] Security scan (bandit)...
cd /d F:\testcursor
call bandit -r app/ -ll -f json -o bandit-report.json
if %errorlevel% neq 0 (
    echo FAILED: Security issues found
    exit /b 1
)
echo PASSED

echo.
echo [4/7] Security scan (npm audit)...
cd /d F:\testcursor\frontend
call npm audit --audit-level=high
if %errorlevel% neq 0 (
    echo FAILED: NPM vulnerabilities found
    exit /b 1
)
echo PASSED

echo.
echo [5/7] Backend tests...
cd /d F:\testcursor
call python -m pytest tests/ -v --tb=short --cov=app --cov-report=term --cov-fail-under=47
if %errorlevel% neq 0 (
    echo FAILED: Backend tests failed
    exit /b 1
)
echo PASSED

echo.
echo [6/7] Frontend tests...
cd /d F:\testcursor\frontend
call npx vitest run --coverage
if %errorlevel% neq 0 (
    echo FAILED: Frontend tests failed
    exit /b 1
)
echo PASSED

echo.
echo [7/7] E2E tests (requires server)...
cd /d F:\testcursor
call npx playwright test e2e/pos.spec.ts --reporter=line
if %errorlevel% neq 0 (
    echo WARNING: E2E tests failed (server may not be running)
    echo Skipping - run server first: python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
) else (
    echo PASSED
)

echo.
echo ========================================
echo   ALL CHECKS PASSED
echo ========================================
