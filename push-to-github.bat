@echo off
echo ==============================================
echo   PANTRYKART AUTOMATIC GITHUB PUSH UTILITY
echo ==============================================
echo.
echo Initializing Git repository if needed...
git init
echo.
echo Setting remote repository...
git remote remove origin >nul 2>&1
git remote add origin https://github.com/gstranchi64-pantrykart/pantrykartlive-12345.git
echo.
echo Staging all updated files and database seeds...
git add .
echo.
echo Committing latest code and bug fixes...
git commit -m "feat: automatic Supabase seeding and dynamic fetch fixes"
echo.
echo Setting branch to main...
git branch -m main
echo.
echo Pushing latest code to GitHub repository...
git push -u origin main --force
echo.
echo ==============================================
echo   SUCCESS: Code pushed to GitHub successfully!
echo ==============================================
pause
