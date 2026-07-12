@echo off
set "NODE_DIR=%USERPROFILE%\.local\nodejs\node-v22.16.0-win-x64"
set "PATH=%NODE_DIR%;%PATH%"

cd /d "%~dp0"

if not exist "%NODE_DIR%\node.exe" (
  echo ERROR: Node.js no encontrado en %NODE_DIR%
  echo Instala Node desde https://nodejs.org o contacta al equipo.
  pause
  exit /b 1
)

echo Node:
call "%NODE_DIR%\node.exe" -v
echo npm:
call "%NODE_DIR%\npm.cmd" -v
echo.

if not exist "node_modules" (
  echo Instalando dependencias...
  call npm install --no-audit --no-fund --strict-ssl=false
  if errorlevel 1 (
    echo Error al instalar dependencias.
    pause
    exit /b 1
  )
)

echo.
echo Iniciando SyntaxError Track1...
echo Abre http://localhost:5173 en tu navegador
echo.
call npm run dev
