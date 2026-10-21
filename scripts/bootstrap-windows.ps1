<#
    Bootstrap NEON AI dari Windows/RDP yang benar-benar kosong.

    Yang dilakukan:
      1. Install Git bila belum ada (winget, fallback installer resmi)
      2. Install Python 3.12 bila belum ada (winget, fallback installer resmi)
      3. Clone (atau update) repo project
      4. Jalankan scripts\setup-windows.ps1 (venv + Ollama + model default)
      5. Buka server (dan tunnel Cloudflare) di jendela baru

    Contoh satu perintah (tanpa perlu git/python terpasang):
      $s="$env:TEMP\neon-bootstrap.ps1"
      irm https://raw.githubusercontent.com/Magnw27/ollama-chat/main/scripts/bootstrap-windows.ps1 -OutFile $s
      powershell -ExecutionPolicy Bypass -File $s
#>
[CmdletBinding()]
param(
    [string]$InstallDir = "",
    [string]$Repo = "https://github.com/Magnw27/ollama-chat.git",
    [string]$Model = "",
    [switch]$SkipModelPull,
    [switch]$SkipRun,
    [switch]$SkipTunnel
)

$ErrorActionPreference = "Stop"

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
} catch { }

function Write-Step($text)  { Write-Host "`n== $text" -ForegroundColor Cyan }
function Write-Ok($text)    { Write-Host "   OK: $text" -ForegroundColor Green }
function Write-Warn2($text) { Write-Host "   !  $text" -ForegroundColor Yellow }
function Test-Cmd($name)    { return [bool](Get-Command $name -ErrorAction SilentlyContinue) }
function Refresh-Path {
    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath"
}

if (-not $InstallDir) { $InstallDir = Join-Path $HOME "ai-ollama-chat" }

Write-Host "NEON AI bootstrap" -ForegroundColor White
Write-Host "   Repo   : $Repo"
Write-Host "   Folder : $InstallDir"

# --- 1. Git ----------------------------------------------------------------
Write-Step "Git"
if (Test-Cmd git) {
    Write-Ok "Git sudah ada: $((Get-Command git).Source)"
} else {
    if (Test-Cmd winget) {
        Write-Host "   Install Git via winget ..."
        try {
            winget install --id Git.Git -e --silent --accept-package-agreements --accept-source-agreements
        } catch {
            Write-Warn2 "winget gagal, lanjut ke installer resmi."
        }
        Refresh-Path
    }
    if (-not (Test-Cmd git)) {
        Write-Host "   Mengunduh installer Git resmi ..."
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/git-for-windows/git/releases/latest" -Headers @{ "User-Agent" = "neon-bootstrap" }
        $asset = $release.assets | Where-Object { $_.name -match '^Git-[\d.]+-64-bit\.exe$' } | Select-Object -First 1
        if (-not $asset) { throw "Tidak menemukan installer Git di halaman rilis." }
        $gitInstaller = Join-Path $env:TEMP $asset.name
        Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $gitInstaller
        Write-Host "   Memasang Git (silent) ..."
        Start-Process -FilePath $gitInstaller -ArgumentList "/VERYSILENT", "/NORESTART", "/NOCANCEL", "/SP-" -Wait
        Refresh-Path
    }
    if (-not (Test-Cmd git)) {
        throw "Git terpasang tetapi belum ada di PATH sesi ini. Tutup terminal, buka baru, lalu jalankan ulang script ini."
    }
    Write-Ok "Git terpasang"
}

# --- 2. Python -------------------------------------------------------------
Write-Step "Python"
$pyCmd = $null
if (Test-Cmd py) { $pyCmd = "py" } elseif (Test-Cmd python) { $pyCmd = "python" }
if ($pyCmd) {
    Write-Ok "Python sudah ada: $((Get-Command $pyCmd).Source)"
} else {
    if (Test-Cmd winget) {
        Write-Host "   Install Python 3.12 via winget ..."
        try {
            winget install --id Python.Python.3.12 -e --silent --accept-package-agreements --accept-source-agreements
        } catch {
            Write-Warn2 "winget gagal, lanjut ke installer resmi."
        }
        Refresh-Path
    }
    if (-not (Test-Cmd py) -and -not (Test-Cmd python)) {
        $pyVersion = "3.12.10"
        $pyInstaller = Join-Path $env:TEMP "python-$pyVersion-amd64.exe"
        Write-Host "   Mengunduh Python $pyVersion ..."
        Invoke-WebRequest -Uri "https://www.python.org/ftp/python/$pyVersion/python-$pyVersion-amd64.exe" -OutFile $pyInstaller
        Write-Host "   Memasang Python (silent) ..."
        Start-Process -FilePath $pyInstaller -ArgumentList "/quiet", "InstallAllUsers=0", "PrependPath=1", "Include_launcher=1", "Include_test=0" -Wait
        Refresh-Path
    }
    if (Test-Cmd py) { $pyCmd = "py" } elseif (Test-Cmd python) { $pyCmd = "python" }
    if (-not $pyCmd) {
        throw "Python terpasang tetapi belum ada di PATH sesi ini. Tutup terminal, buka baru, lalu jalankan ulang script ini."
    }
    Write-Ok "Python terpasang"
}

# --- 3. Clone / update -----------------------------------------------------
Write-Step "Project"
if (Test-Path (Join-Path $InstallDir ".git")) {
    Write-Host "   Repo sudah ada - update dengan git pull ..."
    & git -C $InstallDir pull --ff-only
    if ($LASTEXITCODE -ne 0) { throw "git pull gagal (exit $LASTEXITCODE)." }
    Write-Ok "Project diperbarui: $InstallDir"
} else {
    Write-Host "   Clone $Repo ..."
    & git clone $Repo $InstallDir
    if ($LASTEXITCODE -ne 0) { throw "git clone gagal (exit $LASTEXITCODE). Pastikan folder tujuan kosong." }
    Write-Ok "Project di-clone ke $InstallDir"
}

# --- 4. Setup aplikasi -----------------------------------------------------
Write-Step "Setup aplikasi (venv, Ollama, model)"
$setupArgs = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $InstallDir "scripts\setup-windows.ps1"))
if ($Model) { $setupArgs += @("-Model", $Model) }
if ($SkipModelPull) { $setupArgs += "-SkipModelPull" }
& powershell @setupArgs
if ($LASTEXITCODE -ne 0) { throw "setup-windows.ps1 gagal (exit $LASTEXITCODE)." }
Write-Ok "Setup selesai"

# --- 5. Jalankan -----------------------------------------------------------
Write-Step "Menjalankan"
if (-not $SkipRun) {
    Write-Host "   Membuka server di jendela baru ..."
    Start-Process powershell -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $InstallDir "scripts\run-windows.ps1"))
}
if (-not $SkipTunnel) {
    Write-Host "   Membuka tunnel Cloudflare di jendela baru (URL publik muncul di jendela itu) ..."
    Start-Process powershell -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $InstallDir "scripts\tunnel.ps1"))
}

Write-Host ""
Write-Host "Bootstrap selesai." -ForegroundColor Green
Write-Host "Aplikasi  : http://127.0.0.1:8000 (tunggu beberapa detik sampai server siap)"
Write-Host "Folder    : $InstallDir"
if (-not $SkipTunnel) { Write-Host "Tunnel    : cek URL https://*.trycloudflare.com di jendela tunnel" }
