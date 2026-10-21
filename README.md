# NEON AI · Ollama Chat

Antarmuka chat lokal untuk [Ollama](https://ollama.com) — cepat, rapi, dan dioptimalkan untuk desktop maupun mobile. Tanpa build step, tanpa database: riwayat chat disimpan di browser Anda.

![status](https://img.shields.io/badge/stack-FastAPI%20%2B%20React%2018-4f8cff)
![python](https://img.shields.io/badge/python-3.10%2B-3776ab)

## Fitur

- **Streaming token** dengan tombol stop, regenerate, dan edit pesan.
- **Markdown aman**: sanitasi DOMPurify, syntax highlighting, tombol salin per blok kode.
- **Manajer model**: lihat model terpasang, unduh model baru dengan progress, hapus model.
- **Mode berpikir** untuk model reasoning (qwen3, deepseek-r1, dll).
- **Statistik** token/detik, jumlah token, dan durasi per balasan.
- **Riwayat lokal**: cari, ganti nama, hapus, ekspor Markdown/JSON, impor JSON.
- **Ramah mobile**: sidebar drawer, panel bottom-sheet, target sentuh besar, safe-area iOS, anti-zoom input.
- **PWA-ready**: manifest + ikon, bisa dipasang ke home screen.
- **Tema aksen** (biru, ungu, emerald, amber, rose).
- **Persona tetap**: prompt sistem `mdripz-31b-win` dikelola backend — tidak bisa diubah dari UI.
- **Backend tahan banting**: health & system info, warmup model, auto-pull model default, pembatalan generation saat klien putus, timeout & error yang jelas.

## Prasyarat

- Python 3.10+
- [Ollama](https://ollama.com/download) berjalan di `http://127.0.0.1:11434`
- Minimal satu model, misalnya:

```bash
ollama pull llama3.2
```

## Menjalankan

```powershell
# Windows PowerShell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py
```

```bash
# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

Buka **http://127.0.0.1:8000**.

## Setup setelah reset RDP (Windows)

### Cara 1 — otomatis penuh (RDP benar-benar kosong)

Satu perintah; script memasang **Git + Python + Ollama**, clone repo, setup venv, pull model, lalu membuka server dan tunnel:

```powershell
$s = "$env:TEMP\neon-bootstrap.ps1"
irm https://raw.githubusercontent.com/Magnw27/ollama-chat/main/scripts/bootstrap-windows.ps1 -OutFile $s
powershell -ExecutionPolicy Bypass -File $s
```

Opsi: `-InstallDir C:\ai-ollama-chat`, `-Model qwen3.8:27b`, `-SkipTunnel`, `-SkipRun`, `-SkipModelPull`.

### Cara 2 — manual (Git & Python sudah terpasang)

1. Install [Git](https://git-scm.com/download/win) dan [Python 3.10+](https://www.python.org/downloads/windows/) (centang *Add python.exe to PATH*). Ollama tidak perlu manual — script yang memasangnya.
2. Clone dan setup:

```powershell
git clone https://github.com/Magnw27/ollama-chat.git
cd ollama-chat
powershell -ExecutionPolicy Bypass -File scripts\setup-windows.ps1
powershell -ExecutionPolicy Bypass -File scripts\run-windows.ps1
```

3. Atau klik dua kali `start.bat`. Untuk membuka ke internet: `tunnel.bat` (Cloudflare Quick Tunnel; cloudflared diunduh otomatis ke `tools/`).

Linux/macOS: `bash scripts/setup-linux.sh`, lalu `source .venv/bin/activate && python main.py`.

## Konfigurasi

Semua lewat environment variable (opsional):

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Alamat server Ollama |
| `OLLAMA_DEFAULT_MODEL` | `gemma4:31b-cloud` | Model default; jika kosong dipakai model pertama |
| `OLLAMA_TIMEOUT` | `600` | Timeout request ke Ollama (detik) |
| `OLLAMA_KEEP_ALIVE` | `30m` | Lama model tetap dimuat di memori |
| `OLLAMA_AUTO_PULL` | `0` | `1` = unduh model default otomatis saat start |
| `OLLAMA_SYSTEM_PROMPT` | persona `mdripz-31b-win` | Prompt sistem; dikelola server, bukan UI |
| `HOST` | `127.0.0.1` | Host server. Pakai `0.0.0.0` untuk akses dari HP di jaringan yang sama |
| `PORT` | `8000` | Port server |
| `ALLOWED_ORIGINS` | `*` | Daftar origin CORS dipisah koma |

Semua variabel bisa juga ditaruh di file `.env` (lihat `.env.example`); environment yang sudah ada selalu menang.

Contoh mengakses dari HP:

```powershell
$env:HOST = "0.0.0.0"
python main.py
```

Lalu buka `http://<IP-komputer>:8000` dari HP (pastikan firewall mengizinkan port 8000).

## Struktur

```
main.py                  # FastAPI: static, health/system, models, chat SSE, warmup
static/index.html        # shell aplikasi
static/app.js            # React (Babel standalone)
static/styles.css        # desain & responsif
static/manifest.webmanifest
static/icon.svg
scripts/bootstrap-windows.ps1  # install Git+Python+Ollama+clone+setup
scripts/setup-windows.ps1      # venv + Ollama + model default
scripts/run-windows.ps1    # jalankan server
scripts/tunnel.ps1         # Cloudflare Quick Tunnel
scripts/setup-linux.sh     # bootstrap Linux/macOS
start.bat / tunnel.bat     # shortcut klik-dua-kali
.env.example               # template konfigurasi
requirements.txt
```

## API

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/api/health` | Status Ollama & versi |
| `GET` | `/api/system` | Info runtime (OS, Python, uptime, persona, config) |
| `POST` | `/api/warmup` | Muat model ke memori lebih awal |
| `GET` | `/api/models` | Daftar model terpasang |
| `GET` | `/api/models/running` | Model yang sedang dimuat (`/api/ps`) |
| `POST` | `/api/models/pull` | Unduh model (SSE progress) |
| `DELETE` | `/api/models/{name}` | Hapus model |
| `POST` | `/api/chat/stream` | Chat streaming (SSE) |
| `POST` | `/api/chat` | Chat non-streaming |

Dokumentasi interaktif tersedia di `/docs`.

## Catatan mobile

- Sidebar dan pengaturan otomatis berubah menjadi drawer/bottom-sheet di layar kecil.
- Tinggi aplikasi mengikuti `visualViewport`, jadi kolom input tetap terlihat saat keyboard muncul.
- Untuk pengalaman seperti aplikasi, buka di Chrome/Safari lalu pilih **Tambahkan ke layar utama**.

## Troubleshooting

- **"Ollama offline"** — pastikan `ollama serve` berjalan dan `OLLAMA_BASE_URL` benar.
- **Model tidak muncul** — tekan ikon model di header lalu **Muat ulang**, atau jalankan `ollama list`.
- **Error CORS saat mengakses dari perangkat lain** — set `ALLOWED_ORIGINS` (mis. `http://192.168.1.10:8000`) atau biarkan `*` untuk jaringan lokal tepercaya.
- **Font/ikon tidak termuat** — aplikasi memakai CDN (Google Fonts, jsDelivr). Tanpa internet, tampilan tetap berfungsi tetapi markdown/highlight bisa terbatas.

## Roadmap

- Upload gambar/vision dan attachment dokumen.
- Pencarian semantik riwayat chat.
- Multi-bahasa antarmuka.
- Tes otomatis untuk API dan UI.
