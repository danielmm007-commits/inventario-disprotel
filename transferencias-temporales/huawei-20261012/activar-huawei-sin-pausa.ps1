$ErrorActionPreference = 'Stop'
$base = Join-Path $env:USERPROFILE 'Downloads'
$actual = Join-Path $base 'huawei-olt-reader.py'
$nuevo = Join-Path $base 'huawei-olt-reader-realtime-v2-sin-pausa.py'
$launcher = Join-Path $base 'init-huawei-olt.bat'
$backup = Join-Path $base ('huawei-olt-reader-ANTES-SIN-PAUSA-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.py')
function ProcsHuawei {
    @(Get-CimInstance Win32_Process | Where-Object {
        $_.Name -match '^pythonw?\.exe$' -and $_.CommandLine -match '(?i)(^|[\\/\s])huawei-olt-reader\.py(\s|$|\")'
    })
}
try {
    foreach ($file in @($actual,$nuevo,$launcher)) {
        if (-not (Test-Path -LiteralPath $file)) { throw "Archivo requerido no encontrado: $file" }
    }
    & python -m py_compile $nuevo
    if ($LASTEXITCODE -ne 0) { throw 'Fallo de sintaxis del nuevo lector' }
    $before = @(ProcsHuawei)
    if ($before.Count -ne 1) { throw "Se esperaba exactamente un lector Huawei activo; encontrados: $($before.Count). No se realizo cambio." }
    if (-not (Select-String -LiteralPath $launcher -Pattern 'python\s+huawei-olt-reader\.py' -Quiet)) {
        throw 'El BAT no parece iniciar huawei-olt-reader.py; no se realiza cambio.'
    }
    Copy-Item -LiteralPath $actual -Destination $backup -ErrorAction Stop
    Write-Host "RESPALDO: $backup" -ForegroundColor Cyan
    Copy-Item -LiteralPath $nuevo -Destination $actual -Force
    Write-Host 'Correccion anti-pausa instalada. Reiniciando solamente Huawei mediante su BAT existente...' -ForegroundColor Cyan
    Stop-Process -Id $before[0].ProcessId -Force
    $deadline = (Get-Date).AddSeconds(45)
    $after = @()
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Seconds 3
        $after = @(ProcsHuawei | Where-Object { $_.ProcessId -ne $before[0].ProcessId })
        if ($after.Count -eq 1) { break }
    }
    if ($after.Count -ne 1) { throw 'No se detecto el reinicio automatico del lector Huawei.' }
    Write-Host "OK: Huawei sin pausa iniciado, PID $($after[0].ProcessId)" -ForegroundColor Green
    Write-Host 'IMPORTANTE: verificar mensaje QuickEdit desactivado y huawei_realtime CONECTADO.' -ForegroundColor Yellow
    Write-Host "Respaldo disponible: $backup"
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if (Test-Path -LiteralPath $backup) {
        Copy-Item -LiteralPath $backup -Destination $actual -Force
        Write-Host 'Archivo anterior restaurado. Reiniciando el lector Huawei con el BAT si es necesario.' -ForegroundColor Yellow
        foreach ($p in @(ProcsHuawei)) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }
        Start-Sleep -Seconds 12
        if (@(ProcsHuawei).Count -eq 0) {
            Start-Process -FilePath 'cmd.exe' -ArgumentList ('/c "' + $launcher + '"') -WorkingDirectory $base -WindowStyle Minimized
        }
    }
    exit 1
}