@echo off
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
cd /d "%~dp0.."
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 "%~dp0patch-wechat-build.py"
) else (
  python "%~dp0patch-wechat-build.py"
)
echo.
pause
