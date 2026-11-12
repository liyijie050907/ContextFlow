$ErrorActionPreference = 'Stop'
$runtimePath = Join-Path $PSScriptRoot 'node.exe'
$helpers = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.ExecutablePath -eq $runtimePath -and $_.CommandLine -match 'server\.mjs' }
foreach ($helperProcess in $helpers) { Stop-Process -Id $helperProcess.ProcessId }
Write-Output 'ContextFlow assistant stopped.'
