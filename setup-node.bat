@echo off
setlocal

set "NODE_DIR=%USERPROFILE%\.local\nodejs\node-v22.16.0-win-x64"

if not exist "%NODE_DIR%\node.exe" (
  echo Node.js portable no encontrado en:
  echo %NODE_DIR%
  echo.
  echo Descargalo desde https://nodejs.org o ejecuta setup desde Cursor.
  pause
  exit /b 1
)

echo Node.js encontrado: %NODE_DIR%
"%NODE_DIR%\node.exe" -v
"%NODE_DIR%\npm.cmd" -v

echo.
echo Para usar npm en cualquier terminal, cierra y vuelve a abrir PowerShell/CMD.
echo O usa iniciar.bat en esta carpeta para levantar la pagina.
echo.
pause
