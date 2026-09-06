# Script to create a clean ZIP package for Chrome Web Store upload
$distDir = "dist"
if (!(Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir | Out-Null
}

$zipPath = Join-Path $distDir "AutoBookmark-v1.0.0.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

$filesToInclude = @(
    "manifest.json",
    "background.js",
    "content.js",
    "content.css",
    "popup.html",
    "popup.js",
    "popup.css",
    "sinary-logo.svg",
    "icons"
)

Compress-Archive -Path $filesToInclude -DestinationPath $zipPath -Force
Write-Host "Successfully packaged extension for Chrome Web Store: $zipPath"
