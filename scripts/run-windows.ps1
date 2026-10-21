<#
    Jalankan NEON AI memakai virtualenv project.

    Contoh:
      powershell -ExecutionPolicy Bypass -File scripts\run-windows.ps1
      powershell -ExecutionPolicy Bypass -File scripts\run-windows.ps1 -Port 8080
#>
[CmdletBinding()]
param(
    [int]$Port = 0
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$venvPy = Join-Path $root ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPy)) {
    throw "Virtualenv belum ada. Jalankan dulu: powershell -ExecutionPolicy Bypass -File scripts\setup-windows.ps1"
}

if ($Port -gt 0) { $env:PORT = "$Port" }
$effectivePort = if ($env:PORT) { $env:PORT } else { "8000" }
$effectiveHost = if ($env:HOST) { $env:HOST } else { "127.0.0.1" }

Write-Host "NEON AI berjalan di http://${effectiveHost}:${effectivePort} (Ctrl+C untuk stop)" -ForegroundColor Cyan
& $venvPy (Join-Path $root "main.py")
