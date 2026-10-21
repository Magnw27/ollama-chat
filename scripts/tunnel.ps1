<#
    Buka aplikasi ke internet lewat Cloudflare Quick Tunnel
    (URL acak *.trycloudflare.com, tanpa akun).

    Contoh:
      powershell -ExecutionPolicy Bypass -File scripts\tunnel.ps1
      powershell -ExecutionPolicy Bypass -File scripts\tunnel.ps1 -Port 8080
#>
[CmdletBinding()]
param(
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

$toolsDir = Join-Path $root "tools"
$exe = Join-Path $toolsDir "cloudflared.exe"

if (-not (Test-Path $exe)) {
    New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
    Write-Host "Mengunduh cloudflared ke $exe ..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $exe
}

Write-Host "Membuka tunnel untuk http://127.0.0.1:$Port ..." -ForegroundColor Cyan
Write-Host "URL publik muncul di output di bawah (baris https://*.trycloudflare.com)." -ForegroundColor Yellow
Write-Host ""
& $exe tunnel --url "http://127.0.0.1:$Port" --no-autoupdate
