@echo off
echo ========================================
echo Preparing Information Hub for GitHub
echo ========================================
echo.

echo Creating GitHub upload folder...
if not exist "github-upload" mkdir github-upload

echo Copying essential files...
copy /Y "auth.html" "github-upload\" >nul
copy /Y "index.html" "github-upload\" >nul
copy /Y "redirect.html" "github-upload\" >nul
copy /Y "start.html" "github-upload\" >nul
copy /Y "styles.css" "github-upload\" >nul
copy /Y "auth-script.js" "github-upload\" >nul
copy /Y "hub-script.js" "github-upload\" >nul
copy /Y "section-script.js" "github-upload\" >nul
copy /Y "database.js" "github-upload\" >nul
copy /Y "excel-export.js" "github-upload\" >nul
copy /Y "logo.svg" "github-upload\" >nul
copy /Y "README.md" "github-upload\" >nul
copy /Y "GITHUB_DEPLOYMENT.md" "github-upload\" >nul

echo Copying optional files (if present)...
if exist "CNAME" copy /Y "CNAME" "github-upload\" >nul
if exist "sample-data.json" copy /Y "sample-data.json" "github-upload\" >nul

echo Copying background images...
if exist "background-pic" (
  xcopy /E /I /Y "background-pic" "github-upload\background-pic" >nul
) else (
  echo background-pic folder not found. Skipping images.
)

echo Creating .nojekyll to disable Jekyll on GitHub Pages...
break > "github-upload\.nojekyll"

echo.
echo ========================================
echo Files ready for GitHub upload!
echo ========================================
echo.
echo Upload these files to your GitHub repository:
dir /b github-upload
echo.
echo Next steps:
echo 1. Go to github.com and create new repository (public)
echo 2. Upload all files from "github-upload" folder
echo 3. Go to Settings ^> Pages ^> Deploy from main branch (root)
echo 4. Your site will be live at: https://YOUR_USERNAME.github.io/YOUR_REPO_NAME
echo.
echo Default login: admin / admin123
echo.
pause

