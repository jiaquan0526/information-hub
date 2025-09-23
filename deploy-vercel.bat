@echo off
echo ========================================
echo   Information Hub - Vercel Deployment
echo ========================================
echo.

echo [1/4] Checking if Vercel CLI is installed...
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Vercel CLI not found. Installing...
    npm install -g vercel
    if %errorlevel% neq 0 (
        echo Failed to install Vercel CLI. Please install manually:
        echo npm install -g vercel
        pause
        exit /b 1
    )
)

echo [2/4] Checking if logged in to Vercel...
vercel whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo Please log in to Vercel:
    vercel login
    if %errorlevel% neq 0 (
        echo Login failed. Please try again.
        pause
        exit /b 1
    )
)

echo [3/4] Deploying to Vercel...
vercel --prod

echo [4/4] Deployment complete!
echo.
echo Next steps:
echo 1. Set up your Supabase database with complete-schema-fixed.sql
echo 2. Add environment variables in Vercel dashboard:
echo    - SUPABASE_URL
echo    - SUPABASE_ANON_KEY
echo 3. Test your deployment
echo.
pause
