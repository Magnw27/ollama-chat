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
- **Tema aksen** (biru, ungu, emerald, amber, rose) dan system prompt yang bisa diubah.
- **Backend tahan banting**: health check, auto-pilih model, pembatalan generation saat klien putus, timeout & error yang jelas.

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

## Konfigurasi

Semua lewat environment variable (opsional):

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Alamat server Ollama |
| `OLLAMA_DEFAULT_MODEL` | `gemma4:31b-cloud` | Model default; jika kosong dipakai model pertama |
| `OLLAMA_TIMEOUT` | `600` | Timeout request ke Ollama (detik) |
| `HOST` | `127.0.0.1` | Host server. Pakai `0.0.0.0` untuk akses dari HP di jaringan yang sama |
| `PORT` | `8000` | Port server |
| `ALLOWED_ORIGINS` | `*` | Daftar origin CORS dipisah koma |

Contoh mengakses dari HP:

```powershell
$env:HOST = "0.0.0.0"
python main.py
```

Lalu buka `http://<IP-komputer>:8000` dari HP (pastikan firewall mengizinkan port 8000).

## Struktur

```
main.py                  # FastAPI: static, health, models, chat SSE
static/index.html        # shell aplikasi
static/app.js            # React (Babel standalone)
static/styles.css        # desain & responsif
static/manifest.webmanifest
static/icon.svg
requirements.txt
```

## API

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| `GET` | `/api/health` | Status Ollama & versi |
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
