@echo off
title DISPROTEL - Detector ONU Huawei SALCEDO
cd /d "%~dp0"
set OLT_SERVICE_MODE=1
set OLT_CODIGO=SALCEDO
set OLT_POLL_SECONDS=10
echo.
echo DISPROTEL detector ONU Huawei iniciado - modo solo lectura
echo OLT: SALCEDO - consulta solo cuando exista una solicitud ONU pendiente
echo.
python huawei-olt-reader.py
echo.
echo El lector se detuvo. Revisa el mensaje anterior.
pause
