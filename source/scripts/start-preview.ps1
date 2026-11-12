param([switch]$NoBrowser)
$ErrorActionPreference='Stop'
$sourceRoot=Split-Path $PSScriptRoot -Parent
$runtimePath=[IO.Path]::GetFullPath((Join-Path $sourceRoot '..\assistant\node.exe'))
$previewUrl='http://127.0.0.1:5173'
$logDir=[IO.Path]::GetFullPath((Join-Path $sourceRoot '..\preview'))
try {
    $health=$null
    try {$health=Invoke-RestMethod -Uri ($previewUrl+'/__dev/status') -TimeoutSec 1} catch {}
    if($health -and ($health.app -ne 'ContextFlow-preview' -or $health.root -ne $sourceRoot)){throw 'Port 5173 belongs to another project.'}
    if(-not $health){
        if(-not (Test-Path -LiteralPath (Join-Path $sourceRoot 'node_modules\esbuild'))){throw 'Development dependencies are missing. Run npm ci in source first.'}
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
        $child=Start-Process -FilePath $runtimePath -ArgumentList 'scripts/dev.mjs' -WorkingDirectory $sourceRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'dev-server.log') -RedirectStandardError (Join-Path $logDir 'dev-server-error.log') -PassThru
        @{processId=$child.Id;sourceRoot=$sourceRoot}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $logDir 'server-process.json') -Encoding UTF8
        for($attempt=0;$attempt -lt 60;$attempt++){
            Start-Sleep -Milliseconds 200
            try {$health=Invoke-RestMethod -Uri ($previewUrl+'/__dev/status') -TimeoutSec 1} catch {}
            if($health){break}
            if($child.HasExited){throw 'Preview did not start. Check preview/dev-server-error.log.'}
        }
    }
    if(-not $health){throw 'Preview did not become ready.'}
    Write-Output ('ContextFlow live preview: '+$previewUrl)
    if(-not $NoBrowser){Start-Process -FilePath $previewUrl}
} catch {Write-Error $_.Exception.Message;exit 1}
