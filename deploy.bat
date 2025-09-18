@echo off
echo ========================================
echo Information Hub - Deployment Helper
echo ========================================
echo.

echo Creating deployment package...
if not exist "deployment" mkdir deployment

copy "*.html" "deployment\"
copy "*.css" "deployment\"
copy "*.js" "deployment\"
copy "*.svg" "deployment\"
copy "*.md" "deployment\"
copy "*.json" "deployment\"

echo.
echo ========================================
echo Deployment package created in 'deployment' folder
echo ========================================
echo.
echo Files ready for upload:
dir /b deployment
echo.
echo Next steps:
echo 1. Upload all files in 'deployment' folder to your web server
echo 2. Or drag the 'deployment' folder to Netlify/Vercel
echo 3. Or push to GitHub for GitHub Pages
echo.
echo Your Information Hub will be live with:
echo - Custom logo integration
echo - Database functionality
echo - Excel export capabilities
echo - Role-based access control
echo.
pause

