$ErrorActionPreference = 'Stop'
$runtimePath = Join-Path $PSScriptRoot 'node.exe'
if (-not (Test-Path -LiteralPath $runtimePath)) { $runtimePath = (Get-Command node.exe -ErrorAction Stop).Source }
$helpers = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.ExecutablePath -eq $runtimePath -and ($_.CommandLine -match [regex]::Escape((Join-Path $PSScriptRoot 'server.mjs')) -or $_.ExecutablePath -eq (Join-Path $PSScriptRoot 'node.exe')) }
foreach ($helperProcess in $helpers) { Stop-Process -Id $helperProcess.ProcessId }
Write-Output 'ContextFlow assistant stopped.'
