@echo off
title DISPROTEL - Huawei Multi OLT
cd /d "%~dp0"

rem Este proceso recibe DETECTOR_TOKEN del lanzador principal.
rem No guardar claves OLT aqui: se administran desde Configuracion de OLT.
set OLT_MULTI_MODE=1
set OLT_SERVICE_MODE=0
set SUPABASE_URL=https://ajnbswrwnjpjypjiorye.supabase.co
set OLT_MULTI_TICK_SECONDS=5

if "%DETECTOR_TOKEN%"=="" (
  echo.
  echo ERROR: Falta DETECTOR_TOKEN.
  echo Inicia este agente desde init-multirouter.bat.bat para heredar el token.
  echo.
  pause
  exit /b 1
)

:restart
echo.
echo ============================================================
echo DISPROTEL Huawei Multi OLT - SOLO LECTURA
echo Configuracion y credenciales: sistema central
echo Reintento automatico si el lector se detiene
echo ============================================================
echo.
python huawei-olt-reader.py

echo.
echo [%date% %time%] El lector Huawei se detuvo. Reiniciando en 10 segundos...
timeout /t 10 /nobreak >nul
goto restart
