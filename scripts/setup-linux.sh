#!/usr/bin/env bash
# Bootstrap NEON AI di Linux/macOS: venv + Ollama + model default.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "OK: .env dibuat dari .env.example"
fi

command -v python3 >/dev/null || { echo "Python 3.10+ dibutuhkan."; exit 1; }
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
. .venv/bin/activate
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
echo "OK: dependensi Python terpasang"

if ! command -v ollama >/dev/null; then
  echo "Memasang Ollama ..."
  curl -fsSL https://ollama.com/install.sh | sh
fi

if ! curl -fsS http://127.0.0.1:11434/api/version >/dev/null 2>&1; then
  echo "Menjalankan 'ollama serve' di background ..."
  nohup ollama serve >/tmp/ollama-neon.log 2>&1 &
  for _ in $(seq 1 30); do
    sleep 1
    curl -fsS http://127.0.0.1:11434/api/version >/dev/null 2>&1 && break
  done
fi
curl -fsS http://127.0.0.1:11434/api/version >/dev/null 2>&1 || { echo "Ollama tidak merespons."; exit 1; }
echo "OK: Ollama online"

MODEL="$(grep -E '^OLLAMA_DEFAULT_MODEL=' .env 2>/dev/null | head -n1 | cut -d= -f2- || true)"
MODEL="${MODEL:-gemma4:31b-cloud}"
if ollama list | grep -q "${MODEL%%:*}"; then
  echo "OK: model '$MODEL' sudah ada"
else
  echo "Mengunduh model '$MODEL' ..."
  ollama pull "$MODEL"
fi

echo ""
echo "Selesai. Jalankan: source .venv/bin/activate && python main.py"
