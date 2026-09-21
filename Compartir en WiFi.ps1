$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$pythonPath = Join-Path $projectRoot '.tools\python\python.exe'
$serverPath = Join-Path $projectRoot 'scripts\serve.py'
$localUrl = 'http://127.0.0.1:8765'
$running = $false
try {
    $health = Invoke-RestMethod -Uri ($localUrl + '/connection.json') -TimeoutSec 2
    $running = $health.application -eq 'Nervio'
} catch {}
if (-not $running) {
    Start-Process -FilePath $pythonPath -ArgumentList @('"' + $serverPath + '"', '--port', '8765') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectRoot '.tools\server.log') -RedirectStandardError (Join-Path $projectRoot '.tools\server-error.log')
    for ($attempt=0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 250
        try {
            $health = Invoke-RestMethod -Uri ($localUrl + '/connection.json') -TimeoutSec 1
            if ($health.application -eq 'Nervio') { $running = $true; break }
        } catch {}
    }
}
if (-not $running) { throw 'No se pudo iniciar el servidor local. Revisa .tools/server-error.log.' }
$browserPath = @('C:\Program Files\Google\Chrome\Application\chrome.exe', 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe') | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if ($browserPath) { Start-Process -FilePath $browserPath -ArgumentList ($localUrl + '/index.html#compartir') } else { Start-Process ($localUrl + '/index.html#compartir') }
Write-Output ('Abre en tu celular/iPad conectado a la misma red: ' + ($health.urls -join ', '))
