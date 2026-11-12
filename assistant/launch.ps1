param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$runtimePath = Join-Path $PSScriptRoot 'node.exe'
$helperUrl = 'http://127.0.0.1:17863'
function Get-ContextFlowHealth {
    try { return Invoke-RestMethod -Uri ($helperUrl + '/health') -TimeoutSec 1 } catch { return $null }
}
try {
    . (Join-Path $PSScriptRoot 'network.ps1')
    Set-ContextFlowNetwork
    if (-not (Test-Path -LiteralPath $runtimePath)) { throw 'node.exe is missing. Extract the complete ContextFlow package before starting.' }
    $health = Get-ContextFlowHealth
    if ($health -and $health.app -eq 'ContextFlow' -and $health.version -ne '0.16.0') {
        if ($health.active) { throw 'The assistant is generating. Wait for completion or cancel it before updating.' }
        $oldHelpers = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.ExecutablePath -eq $runtimePath -and $_.CommandLine -match 'server\.mjs' }
        if (-not $oldHelpers) { throw 'An older ContextFlow assistant is running from another folder. Run its Stop-ContextFlow.cmd before starting this version.' }
        foreach ($oldHelper in $oldHelpers) { Stop-Process -Id $oldHelper.ProcessId }
        Start-Sleep -Milliseconds 300
        $health = $null
    }
    if (-not $health -or $health.app -ne 'ContextFlow') {
        $child = Start-Process -FilePath $runtimePath -ArgumentList '--use-system-ca','--use-env-proxy','server.mjs' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            Start-Sleep -Milliseconds 200
            $health = Get-ContextFlowHealth
            if ($health -and $health.app -eq 'ContextFlow') { break }
            if ($child.HasExited) { throw 'The assistant could not start. Port 17863 may be in use by another application.' }
        }
    }
    if (-not $health -or $health.app -ne 'ContextFlow') { throw 'The assistant did not become ready. Check the extracted package and port 17863.' }
    Write-Output 'ContextFlow assistant is ready: http://127.0.0.1:17863'
    if (-not $NoBrowser) {
        Start-Process -FilePath 'http://127.0.0.1:5173/'
    }
    exit 0
} catch {
    Write-Host ('ContextFlow startup failed: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
