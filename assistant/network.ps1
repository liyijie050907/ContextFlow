# Process-only network settings. Existing environment settings take precedence.
function Convert-ContextFlowProxy([string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
    $candidate = $Value.Trim()
    if ($candidate -notmatch '^[a-zA-Z][a-zA-Z0-9+.-]*://') { $candidate = 'http://' + $candidate }
    $parsed = $null
    if (-not [Uri]::TryCreate($candidate, [UriKind]::Absolute, [ref]$parsed) -or $parsed.Scheme -notin @('http','https') -or -not $parsed.Host) {
        throw 'The configured proxy is not an HTTP/HTTPS proxy. Use your network tool HTTP proxy setting.'
    }
    return $candidate
}
function Set-ContextFlowNetwork {
    $source = 'direct'
    if ($env:HTTP_PROXY -or $env:HTTPS_PROXY) { $source = 'environment' }
    else {
        $settings = Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -ErrorAction SilentlyContinue
        if ($settings.ProxyEnable -eq 1 -and $settings.ProxyServer) {
            $httpProxy = $null; $httpsProxy = $null
            if ($settings.ProxyServer -match '=') {
                foreach ($part in $settings.ProxyServer.Split(';')) {
                    $pair = $part.Trim().Split('=',2)
                    if ($pair.Count -eq 2 -and $pair[0] -eq 'http') { $httpProxy = Convert-ContextFlowProxy $pair[1] }
                    if ($pair.Count -eq 2 -and $pair[0] -eq 'https') { $httpsProxy = Convert-ContextFlowProxy $pair[1] }
                }
            } else { $httpProxy = Convert-ContextFlowProxy $settings.ProxyServer; $httpsProxy = $httpProxy }
            if ($httpProxy) { $env:HTTP_PROXY = $httpProxy }
            if ($httpsProxy) { $env:HTTPS_PROXY = $httpsProxy }
            if ($httpProxy -or $httpsProxy) { $source = 'windows' }
        } elseif ($settings.AutoConfigURL) { $source = 'pac-not-applied' }
    }
    $env:CONTEXTFLOW_PROXY_SOURCE = $source
    # Only the helper child inherits these values; no system settings are changed.
    $bypass = @($env:NO_PROXY, '127.0.0.1', 'localhost', '::1') | Where-Object { $_ }
    $env:NO_PROXY = $bypass -join ','
}
