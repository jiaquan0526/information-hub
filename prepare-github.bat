@echo off
echo ========================================
echo Preparing Information Hub for GitHub
echo ========================================
echo.

echo Creating GitHub upload folder...
if not exist "github-upload" mkdir github-upload

echo Copying essential files...
copy "auth.html" "github-upload\"
copy "index.html" "github-upload\"
copy "styles.css" "github-upload\"
copy "auth-script.js" "github-upload\"
copy "hub-script.js" "github-upload\"
copy "section-script.js" "github-upload\"
copy "database.js" "github-upload\"
copy "excel-export.js" "github-upload\"
copy "logo.svg" "github-upload\"
copy "README.md" "github-upload\"
copy "GITHUB_DEPLOYMENT.md" "github-upload\"

echo.
echo ========================================
echo Files ready for GitHub upload!
echo ========================================
echo.
echo Upload these files to your GitHub repository:
dir /b github-upload
echo.
echo Next steps:
echo 1. Go to github.com and create new repository named "information-hub"
echo 2. Upload all files from "github-upload" folder
echo 3. Go to Settings ^> Pages ^> Deploy from main branch
echo 4. Your site will be live at: https://YOUR_USERNAME.github.io/information-hub
echo.
echo Default login: admin / admin123
echo.
pause

