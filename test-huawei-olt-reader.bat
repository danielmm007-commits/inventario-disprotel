@echo off
cd /d "%~dp0"
echo ==========================================
echo DISPROTEL - AUTOPRUEBA LECTOR HUAWEI OLT
echo SOLO PRUEBA LOCAL - NO CONECTA A LA OLT
echo ==========================================
echo.
python huawei-olt-reader.py --self-test
echo.
if errorlevel 1 (
  echo RESULTADO: ERROR EN AUTOPRUEBA
) else (
  echo RESULTADO: AUTOPRUEBA CORRECTA
)
echo.
pause
