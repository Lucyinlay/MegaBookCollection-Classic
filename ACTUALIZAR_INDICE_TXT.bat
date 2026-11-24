@echo off
chcp 65001 >nul
cd /d "%~dp0"
py -3 ACTUALIZAR_INDICE_TXT.py
if errorlevel 1 (
  echo.
  echo Python 3 is required. Try: python ACTUALIZAR_INDICE_TXT.py
)
echo.
pause
