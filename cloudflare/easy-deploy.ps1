$ErrorActionPreference = 'Stop'
try {
    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    $nodeExe = if ($nodeCommand) { $nodeCommand.Source } else { $null }
    if ($nodeExe) {
        $major = & $nodeExe -p 'parseInt(process.versions.node)'
        $npmCli = Join-Path (Split-Path -Parent $nodeExe) 'node_modules\npm\bin\npm-cli.js'
        if ([int]$major -lt 24 -or -not (Test-Path -LiteralPath $npmCli)) { $nodeExe = $null }
    }
    if (-not $nodeExe) {
        Write-Host 'Preparing Node.js from the official nodejs.org website...'
        $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
        $version = '24.14.0'
        $folder = "node-v$version-win-$arch"
        $cacheDir = Join-Path $env:LOCALAPPDATA 'ContextFlow-deploy-tools'
        $nodeExe = Join-Path $cacheDir "$folder\node.exe"
        if (-not (Test-Path -LiteralPath $nodeExe)) {
            New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
            $zipName = "$folder.zip"
            $zipPath = Join-Path $cacheDir $zipName
            $baseURL = "https://nodejs.org/dist/v$version"
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            $hashes = (Invoke-WebRequest -UseBasicParsing -Uri "$baseURL/SHASUMS256.txt").Content
            $hashLine = ($hashes -split "`n" | Where-Object { $_.Trim().EndsWith("  $zipName") })
            if (-not $hashLine) { throw 'Official Node.js checksum was not found.' }
            $expected = ($hashLine.Trim() -split '\s+')[0]
            function Read-ZipHash([string]$file) {
                if (-not [IO.File]::Exists($file)) { return '' }
                $stream = [IO.File]::OpenRead($file)
                $sha = [Security.Cryptography.SHA256]::Create()
                try { return [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '') }
                finally { $stream.Dispose(); $sha.Dispose() }
            }
            $actual = Read-ZipHash $zipPath
            if ($actual -ne $expected) {
                Invoke-WebRequest -UseBasicParsing -Uri "$baseURL/$zipName" -OutFile $zipPath
                $actual = Read-ZipHash $zipPath
            }
            if ($actual -ne $expected) { throw 'Node.js checksum mismatch. Download was not executed.' }
            Add-Type -AssemblyName System.IO.Compression.FileSystem
            $extractRoot = [IO.Path]::GetFullPath($cacheDir).TrimEnd('\') + '\'
            $archive = [IO.Compression.ZipFile]::OpenRead($zipPath)
            try {
                foreach ($entry in $archive.Entries) {
                    $target = [IO.Path]::GetFullPath((Join-Path $cacheDir $entry.FullName))
                    if (-not $target.StartsWith($extractRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe archive path.' }
                    if (-not $entry.Name) { [IO.Directory]::CreateDirectory($target) | Out-Null }
                    else {
                        [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target)) | Out-Null
                        [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target, $true)
                    }
                }
            } finally { $archive.Dispose() }
        }
    }
    $env:PATH = (Split-Path -Parent $nodeExe) + ';' + $env:PATH
    & $nodeExe (Join-Path $PSScriptRoot 'easy-deploy.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Deployment did not finish. Read the message above and run again.' }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
