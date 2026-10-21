<#
    Bootstrap NEON AI di Windows/RDP yang baru di-reset.

    Yang dilakukan:
      1. Membuat .env dari .env.example (bila belum ada)
      2. Membuat virtualenv .venv + install requirements
      3. Memasang Ollama (silent) bila belum ada
      4. Menjalankan `ollama serve` bila belum berjalan
      5. Mengunduh model default

    Contoh:
      git clone https://github.com/Magnw27/ollama-chat.git
      cd ollama-chat
      powershell -ExecutionPolicy Bypass -File scripts\setup-windows.ps1
      powershell -ExecutionPolicy Bypass -File scripts\run-windows.ps1
#>
[CmdletBinding()]
param(
    [string]$Model = "",
    [switch]$SkipModelPull,
    [switch]$SkipOllamaInstall
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Write-Step($text) { Write-Host "`n== $text" -ForegroundColor Cyan }
function Write-Ok($text)   { Write-Host "   OK: $text" -ForegroundColor Green }
function Write-Warn2($text) { Write-Host "   !  $text" -ForegroundColor Yellow }

Write-Host "NEON AI setup — $root" -ForegroundColor White

# --- 1. .env ---------------------------------------------------------------
Write-Step "Konfigurasi .env"
if (-not (Test-Path (Join-Path $root ".env"))) {
    Copy-Item (Join-Path $root ".env.example") (Join-Path $root ".env")
    Write-Ok ".env dibuat dari .env.example"
} else {
    Write-Ok ".env sudah ada (dibiarkan)"
}
if (-not $Model) {
    $envLine = Get-Content (Join-Path $root ".env") | Where-Object { $_ -match "^OLLAMA_DEFAULT_MODEL=" } | Select-Object -First 1
    if ($envLine) { $Model = ($envLine -split "=", 2)[1].Trim() }
    if (-not $Model) { $Model = "gemma4:31b-cloud" }
}
Write-Ok "Model default: $Model"

# --- 2. Python -------------------------------------------------------------
Write-Step "Virtualenv Python"
$pyCmd = $null
if (Get-Command py -ErrorAction SilentlyContinue) { $pyCmd = "py" }
elseif (Get-Command python -ErrorAction SilentlyContinue) { $pyCmd = "python" }
if (-not $pyCmd) {
    throw "Python tidak ditemukan. Install Python 3.10+ dulu: https://www.python.org/downloads/windows/ (centang 'Add python.exe to PATH')."
}

$venvDir = Join-Path $root ".venv"
$venvPy = Join-Path $venvDir "Scripts\python.exe"
if (-not (Test-Path $venvPy)) {
    Write-Host "   Membuat .venv ..."
    if ($pyCmd -eq "py") { & py -3 -m venv $venvDir } else { & python -m venv $venvDir }
}
& $venvPy -m pip install --upgrade pip --quiet
& $venvPy -m pip install -r (Join-Path $root "requirements.txt") --quiet
Write-Ok "Dependensi Python terpasang"

# --- 3. Ollama -------------------------------------------------------------
Write-Step "Ollama"
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    if ($SkipOllamaInstall) { throw "Ollama tidak terpasang dan -SkipOllamaInstall dipakai." }
    $installer = Join-Path $env:TEMP "OllamaSetup.exe"
    Write-Host "   Mengunduh OllamaSetup.exe ..."
    Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile $installer
    Write-Host "   Memasang Ollama (silent, butuh beberapa menit) ..."
    Start-Process -FilePath $installer -ArgumentList "/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART" -Wait
    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath"
    if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
        throw "Ollama terpasang tetapi belum ada di PATH sesi ini. Tutup terminal, buka baru, lalu jalankan script ini lagi."
    }
}
Write-Ok "Ollama tersedia: $((Get-Command ollama).Source)"

# --- 4. ollama serve -------------------------------------------------------
Write-Step "Server Ollama"
$online = $false
try {
    Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/version" -TimeoutSec 3 | Out-Null
    $online = $true
} catch { }
if (-not $online) {
    Write-Host "   Menjalankan 'ollama serve' ..."
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        try {
            Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/version" -TimeoutSec 3 | Out-Null
            $online = $true
            break
        } catch { }
    }
}
if (-not $online) { throw "Tidak dapat terhubung ke Ollama di http://127.0.0.1:11434" }
Write-Ok "Ollama online"

# --- 5. Model default ------------------------------------------------------
Write-Step "Model default"
if ($SkipModelPull) {
    Write-Warn2 "Dilewati (-SkipModelPull)"
} else {
    $listed = (& ollama list) 2>$null | Out-String
    $base = $Model.Split(":")[0]
    if ($listed -match [regex]::Escape($base)) {
        Write-Ok "Model '$Model' sudah terpasang"
    } else {
        Write-Host "   Mengunduh '$Model' (bisa lama untuk model besar) ..."
        & ollama pull $Model
        Write-Ok "Model '$Model' siap"
    }
}

Write-Host ""
Write-Host "Setup selesai." -ForegroundColor Green
Write-Host "Jalankan aplikasi :  powershell -ExecutionPolicy Bypass -File scripts\run-windows.ps1"
Write-Host "Tunnel publik     :  powershell -ExecutionPolicy Bypass -File scripts\tunnel.ps1"
Write-Host "Atau klik dua kali:  start.bat"
