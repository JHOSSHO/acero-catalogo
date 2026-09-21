$ErrorActionPreference = 'Stop'
$ruleName = 'Nervio - pagina local TCP 8765'
$nervioPython = Join-Path $PSScriptRoot '.tools\python\python.exe'
if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $ruleName -Description 'Solo aplicacion Nervio en TCP 8765 desde la subred local.' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8765 -Program $nervioPython -RemoteAddress LocalSubnet -Profile Any | Out-Null
}
Set-Content -LiteralPath (Join-Path $PSScriptRoot '.tools\wifi-firewall-ready.txt') -Value 'Regla limitada a TCP 8765, programa Nervio y subred local.'
