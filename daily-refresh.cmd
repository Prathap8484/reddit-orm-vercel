@echo off
REM ============================================================
REM  Daily Reddit ORM refresh — one-click / scheduled pipeline.
REM
REM  1. Pull latest code from GitHub
REM  2. Harvest fresh leads  -> master.csv
REM  3. AI-score new leads   -> filtered_leads.csv
REM  4. Commit + push CSVs    -> Vercel auto-deploys production
REM
REM  Run manually by double-clicking, or point Windows Task
REM  Scheduler at this file to run it every morning.
REM
REM  Requires: a .env file in %PROJ% containing ANTHROPIC_API_KEY
REM ============================================================

set "PROJ=C:\Users\Prathap\OneDrive\Desktop\reddit-orm-vercel"
set "NODE=C:\Program Files\nodejs\node.exe"
set "LOG=%PROJ%\reports\harvest.log"

cd /d "%PROJ%"
if not exist "%PROJ%\reports" mkdir "%PROJ%\reports"

echo. >> "%LOG%"
echo ============================================================ >> "%LOG%"
echo =====  DAILY REFRESH  %DATE% %TIME%  ===== >> "%LOG%"

REM --- 1. Get the latest code (fast-forward only; ignore if offline) ---
echo [1/4] Pulling latest code... >> "%LOG%"
git pull --ff-only >> "%LOG%" 2>&1

REM --- 2. Harvest last 30 days into master.csv (root) ---
echo [2/4] Harvesting... >> "%LOG%"
"%NODE%" "%PROJ%\harvest.mjs" --days 30 --out "%PROJ%" >> "%LOG%" 2>&1

REM --- 3. AI-score any new leads ---
echo [3/4] AI filtering... >> "%LOG%"
"%NODE%" "%PROJ%\ai-filter.mjs" "%PROJ%\master.csv" >> "%LOG%" 2>&1

REM --- 4. Commit + push the refreshed data (only if something changed) ---
echo [4/4] Publishing to production... >> "%LOG%"
git add master.csv filtered_leads.csv >> "%LOG%" 2>&1
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "Daily lead refresh %DATE%" >> "%LOG%" 2>&1
    git push origin master >> "%LOG%" 2>&1
    echo   Pushed - Vercel will auto-deploy in ~1 min. >> "%LOG%"
) else (
    echo   No new leads today - nothing to publish. >> "%LOG%"
)

echo -----  done  ----- >> "%LOG%"
