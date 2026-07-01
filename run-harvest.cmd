@echo off
REM Daily Reddit harvest wrapper — called by the "RedditHarvest" scheduled task.
REM Uses absolute paths so it works regardless of the scheduler's working dir.
set "PROJ=C:\Users\Prathap\OneDrive\Desktop\reddit-orm-vercel"
set "NODE=C:\Program Files\nodejs\node.exe"
cd /d "%PROJ%"
echo ===== %DATE% %TIME% ===== >> "%PROJ%\reports\harvest.log"
"%NODE%" "%PROJ%\harvest.mjs" --days 7 --out "%PROJ%\reports" >> "%PROJ%\reports\harvest.log" 2>&1
echo ----- exit %ERRORLEVEL% ----- >> "%PROJ%\reports\harvest.log"
