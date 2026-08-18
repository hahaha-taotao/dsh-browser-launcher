$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$root = Split-Path -Parent $PSScriptRoot
$hostName = "com.dsh.launcher"
$srcJs = Join-Path $root "host\native-host.js"
$extIdFile = Join-Path $root "host\extension-id.txt"
$installDir = Join-Path $env:LOCALAPPDATA "dsh-browser-launcher"
$jsPath = Join-Path $installDir "native-host.js"
$cmdPath = Join-Path $installDir "native-host.cmd"
$manifestPath = Join-Path $installDir "com.dsh.launcher.json"

if (-not (Test-Path $srcJs)) {
    throw "native-host.js not found: $srcJs"
}

$extId = "eciaifinggijajfglfepedcemfpbjmpm"
if (Test-Path $extIdFile) {
    $extId = (Get-Content -Path $extIdFile -TotalCount 1).Trim()
}

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
$node = if ($nodeCmd) { $nodeCmd.Source } else { "D:\software\Node\node.exe" }
if (-not (Test-Path $node)) {
    throw "node.exe not found. Install Node.js and add it to PATH."
}

$nodeDir = Split-Path -Parent $node
$npmRoaming = Join-Path $env:APPDATA "npm"

New-Item -ItemType Directory -Force -Path $installDir | Out-Null
Copy-Item -Path $srcJs -Destination $jsPath -Force
$srcStatus = Join-Path $root "host\status.js"
if (Test-Path $srcStatus) {
    Copy-Item -Path $srcStatus -Destination (Join-Path $installDir "status.js") -Force
}

$cmdText = @"
@echo off
setlocal
set "PATH=$nodeDir;$npmRoaming;%PATH%"
"$node" "$jsPath"
"@
[System.IO.File]::WriteAllText($cmdPath, $cmdText, [System.Text.UTF8Encoding]::new($false))

$cmdJson = $cmdPath.Replace("\", "\\")
$manifestText = @"
{"name":"$hostName","description":"DeepSeek Harness launcher","path":"$cmdJson","type":"stdio","allowed_origins":["chrome-extension://$extId/"]}
"@
[System.IO.File]::WriteAllText($manifestPath, $manifestText, [System.Text.UTF8Encoding]::new($false))

$regKeys = @(
    "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName",
    "HKCU:\Software\Chromium\NativeMessagingHosts\$hostName",
    "HKCU:\Software\Tabbit Browser\NativeMessagingHosts\$hostName",
    "HKCU:\Software\TabbitBrowser\NativeMessagingHosts\$hostName"
)
foreach ($key in $regKeys) {
    New-Item -Path $key -Force | Out-Null
    Set-Item -Path $key -Value $manifestPath
}

Write-Host "Native host installed."
Write-Host "Extension ID: $extId"
Write-Host "Host dir: $installDir"
Write-Host ""
Write-Host "In Tabbit:"
Write-Host "1. Open the extensions page (chrome://extensions)"
Write-Host "2. Enable Developer mode"
Write-Host "3. Load unpacked, select:"
Write-Host "   $root\extension"
Write-Host "4. Pin DeepSeek Harness"
Write-Host ""
Write-Host "Restart Tabbit if it was already running."
