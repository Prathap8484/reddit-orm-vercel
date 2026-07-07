@echo off
REM Build a Google-Sheet-ready Reddit buying-intent CSV without Reddit API keys.
REM Requires .env or .env.local with ANTHROPIC_API_KEY.

set "PROJ=%~dp0"
set "NODE=node"

cd /d "%PROJ%"

echo.
echo [1/2] Finding broad Reddit buying-intent posts...
%NODE% "%PROJ%broad-harvest.mjs" --days 90 --out "%PROJ%"
if errorlevel 1 goto fail

echo.
echo [2/2] Filtering and writing comments with Anthropic...
%NODE% "%PROJ%sheet-pipeline.mjs" "%PROJ%master.csv" "%PROJ%reddit_sheet_output.csv"
if errorlevel 1 goto fail

echo.
echo Done. Output file:
echo %PROJ%reddit_sheet_output.csv
exit /b 0

:fail
echo.
echo Pipeline failed. Check the error above.
exit /b 1
