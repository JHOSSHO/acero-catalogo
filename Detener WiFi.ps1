$ErrorActionPreference = 'Stop'
try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8765/connection.json' -TimeoutSec 2
    if ($health.application -ne 'Nervio') { throw 'El puerto pertenece a otro servicio.' }
    $serverProcess = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + [int]$health.pid)
    $expectedScript = Join-Path $PSScriptRoot 'scripts\serve.py'
    if ($serverProcess.CommandLine -notlike ('*' + $expectedScript + '*')) { throw 'No se pudo verificar el proceso de Nervio.' }
    Stop-Process -Id ([int]$health.pid)
    Set-Content -LiteralPath (Join-Path $PSScriptRoot 'data\connection.js') -Value 'window.NERVIO_CONNECTION = null;' -Encoding UTF8
    Write-Output 'Compartir por WiFi detenido.'
} catch { Write-Output $_.Exception.Message }
