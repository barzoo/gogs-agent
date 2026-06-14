# Package a release ZIP for gogs-agent
# Usage: .\scripts\package-release.ps1
# Output: gogs-agent-v<version>.zip in the project root

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

# Read version from package.json
$pkg = Get-Content package.json | ConvertFrom-Json
$version = $pkg.version
$zipName = "gogs-agent-v$version.zip"
$tmpDir = ".\release-tmp"

Write-Host "Packaging gogs-agent v$version..." -ForegroundColor Cyan

# Clean up previous
if (Test-Path $zipName) {
    Remove-Item -Force $zipName -ErrorAction SilentlyContinue
}
if (Test-Path $tmpDir) {
    Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue
}

# Create directory structure
$pkgRoot = "$tmpDir\gogs-agent-v$version"
New-Item -ItemType Directory -Force "$pkgRoot\dist\commands" | Out-Null
New-Item -ItemType Directory -Force "$pkgRoot\docs" | Out-Null

# Copy dist (JS files only — no .d.ts, no .js.map)
Copy-Item dist\*.js "$pkgRoot\dist\"
Copy-Item dist\commands\*.js "$pkgRoot\dist\commands\"

# Copy docs (user-facing only — no superpowers/)
Copy-Item docs\commands.md, docs\commands.zh-CN.md, docs\configuration.md, docs\configuration.zh-CN.md "$pkgRoot\docs\" -ErrorAction SilentlyContinue

# Copy root files
Copy-Item .env.example, package.json, README.md, README.zh-CN.md, skill.md "$pkgRoot\" -ErrorAction SilentlyContinue

# Compress
Compress-Archive -Path $pkgRoot -DestinationPath $zipName -Force

# Clean up temp
Remove-Item -Recurse -Force $tmpDir -ErrorAction SilentlyContinue

# Report
$sizeKB = [math]::Round((Get-Item $zipName).Length / 1KB, 1)
Write-Host "Done: $zipName ($sizeKB KB)" -ForegroundColor Green

# List contents
Write-Host "`nContents:" -ForegroundColor Cyan
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::OpenRead((Resolve-Path $zipName)).Entries |
    ForEach-Object { "  $($_.FullName)" }
