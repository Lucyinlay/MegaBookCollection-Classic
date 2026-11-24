@echo off
setlocal
cd /d "%~dp0"
set "MBC_PY="
where py >nul 2>nul && set "MBC_PY=py -3"
if not defined MBC_PY (
  where python >nul 2>nul && set "MBC_PY=python"
)
if not defined MBC_PY (
  echo No encuentro Python 3. El buscador local necesita Python o un servidor HTTP.
  pause
  exit /b 1
)
echo Abriendo esta version de la web en un puerto local libre.
echo La ventana debe permanecer abierta mientras navegas y buscas.
%MBC_PY% "%~dp0PROBAR_BUSCADOR_EN_LOCAL.py"
if errorlevel 1 (
  echo No se pudo iniciar el servidor local.
  pause
)
