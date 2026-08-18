$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root "dist"
$stage = Join-Path $dist "dsh-browser-launcher"
$zip = Join-Path $dist "dsh-browser-launcher.zip"

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
if (Test-Path $zip) { Remove-Item $zip -Force }
New-Item -ItemType Directory -Force -Path $stage | Out-Null

Copy-Item (Join-Path $root "README.md") (Join-Path $stage "README.md")
Copy-Item (Join-Path $root "安装.bat") (Join-Path $stage "安装.bat")
Copy-Item (Join-Path $root "安装说明.txt") (Join-Path $stage "安装说明.txt")

New-Item -ItemType Directory -Force -Path (Join-Path $stage "extension") | Out-Null
Copy-Item (Join-Path $root "extension\*") (Join-Path $stage "extension") -Recurse -Force
if (Test-Path (Join-Path $stage "extension\icons\source.jpg")) {
    Remove-Item (Join-Path $stage "extension\icons\source.jpg") -Force
}

New-Item -ItemType Directory -Force -Path (Join-Path $stage "host") | Out-Null
Copy-Item (Join-Path $root "host\native-host.js") (Join-Path $stage "host\native-host.js")
Copy-Item (Join-Path $root "host\status.js") (Join-Path $stage "host\status.js")
Copy-Item (Join-Path $root "host\extension-id.txt") (Join-Path $stage "host\extension-id.txt")

New-Item -ItemType Directory -Force -Path (Join-Path $stage "scripts") | Out-Null
Copy-Item (Join-Path $root "scripts\install.ps1") (Join-Path $stage "scripts\install.ps1")
Copy-Item (Join-Path $root "scripts\uninstall.ps1") (Join-Path $stage "scripts\uninstall.ps1")

Compress-Archive -Path $stage -DestinationPath $zip -Force
Write-Host "Packed: $zip"
Write-Host "Folder: $stage"
