@echo off
cd /d "%~dp0"
py -3 PREPARAR_DESCARGA_FREEWHA.py
if errorlevel 1 python PREPARAR_DESCARGA_FREEWHA.py
pause
