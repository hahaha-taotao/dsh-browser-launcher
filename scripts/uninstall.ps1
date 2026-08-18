$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$hostName = "com.dsh.launcher"
$installDir = Join-Path $env:LOCALAPPDATA "dsh-browser-launcher"
$regKeys = @(
    "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName",
    "HKCU:\Software\Chromium\NativeMessagingHosts\$hostName",
    "HKCU:\Software\Tabbit Browser\NativeMessagingHosts\$hostName",
    "HKCU:\Software\TabbitBrowser\NativeMessagingHosts\$hostName"
)

foreach ($key in $regKeys) {
    if (Test-Path $key) {
        Remove-Item -Path $key -Recurse -Force
        Write-Host "Removed $key"
    }
}

if (Test-Path $installDir) {
    Remove-Item -Path $installDir -Recurse -Force
    Write-Host "Removed $installDir"
}

Write-Host "Native host unregistered. Remove the extension in Tabbit yourself."
Write-Host "~/.dsh session data was not deleted."
