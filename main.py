"""NEON AI - a fast, local-first chat UI for Ollama."""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import os
import platform
import socket
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, AsyncIterator, Literal, Optional

import httpx
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"


def load_dotenv(path: Path) -> None:
    """Minimal .env loader so a fresh clone only needs a few files."""
    if not path.is_file():
        return
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return
    for raw in lines:
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key:
            os.environ.setdefault(key, value.strip().strip("'\""))


def env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


load_dotenv(BASE_DIR / ".env")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
DEFAULT_MODEL = os.getenv("OLLAMA_DEFAULT_MODEL", "gemma4:31b-cloud").strip()
REQUEST_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "600"))
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))
DEFAULT_KEEP_ALIVE = os.getenv("OLLAMA_KEEP_ALIVE", "30m").strip() or "30m"
AUTO_PULL = env_flag("OLLAMA_AUTO_PULL", False)
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",")
    if origin.strip()
]

# Persona inti aplikasi. Dikelola penuh oleh server — tidak bisa diubah dari UI.
DEFAULT_SYSTEM_PROMPT = os.getenv(
    "OLLAMA_SYSTEM_PROMPT",
    "Anda adalah model AI bernama mdripz-31b-win, assistant AI serbaguna, cepat, dan cerdas.",
).strip()

SSE_DONE = "data: [DONE]\n\n"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("neon")

http_client: Optional[httpx.AsyncClient] = None
models_cache: dict[str, Any] = {"fetched_at": 0.0, "models": []}
STARTED_AT = time.time()


@asynccontextmanager
async def lifespan(_: FastAPI):
    global http_client
    http_client = httpx.AsyncClient(
        base_url=OLLAMA_BASE_URL,
        timeout=httpx.Timeout(REQUEST_TIMEOUT, connect=10.0),
        limits=httpx.Limits(max_connections=32, max_keepalive_connections=8),
    )
    log.info("Ollama endpoint: %s", OLLAMA_BASE_URL)
    log.info("Persona: %s", DEFAULT_SYSTEM_PROMPT)
    auto_pull_task: Optional[asyncio.Task[None]] = None
    if AUTO_PULL and DEFAULT_MODEL:
        auto_pull_task = asyncio.create_task(ensure_default_model())
    try:
        yield
    finally:
        if auto_pull_task is not None:
            auto_pull_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await auto_pull_task
        await http_client.aclose()
        http_client = None


app = FastAPI(
    title="NEON AI",
    description="Local Ollama chat interface.",
    version="7.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - started) * 1000
    response.headers["X-Process-Time-ms"] = f"{elapsed_ms:.0f}"
    if request.url.path.startswith("/api/"):
        log.info(
            "%s %s -> %s (%.0f ms)",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )
    return response


def get_client() -> httpx.AsyncClient:
    if http_client is None:
        raise HTTPException(status_code=503, detail="HTTP client belum siap.")
    return http_client


def human_size(value: Optional[float]) -> str:
    size = float(value or 0)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if size < 1024 or unit == "TB":
            if unit == "B":
                return f"{size:.0f} {unit}"
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} PB"


def normalize_model(raw: dict[str, Any]) -> dict[str, Any]:
    details = raw.get("details") or {}
    name = raw.get("name") or raw.get("model") or "unknown"
    return {
        "name": name,
        "size": raw.get("size") or 0,
        "size_human": human_size(raw.get("size")),
        "modified_at": raw.get("modified_at"),
        "family": details.get("family"),
        "families": details.get("families") or [],
        "parameter_size": details.get("parameter_size"),
        "quantization": details.get("quantization_level"),
    }


async def fetch_models(force: bool = False) -> list[dict[str, Any]]:
    now = time.time()
    if not force and now - models_cache["fetched_at"] < 5:
        return models_cache["models"]

    response = await get_client().get("/api/tags", timeout=10.0)
    response.raise_for_status()
    models = [normalize_model(item) for item in response.json().get("models", [])]
    models.sort(key=lambda item: item["name"].lower())
    models_cache.update(fetched_at=now, models=models)
    return models


async def ensure_default_model() -> None:
    """Pull the default model on startup when OLLAMA_AUTO_PULL=1."""
    try:
        models = await fetch_models(force=True)
        names = {item["name"] for item in models}
        if DEFAULT_MODEL in names or f"{DEFAULT_MODEL}:latest" in names:
            return
        log.info("Model default %s belum ada — mengunduh otomatis...", DEFAULT_MODEL)
        last_status = None
        async with get_client().stream(
            "POST",
            "/api/pull",
            json={"model": DEFAULT_MODEL, "stream": True},
            timeout=httpx.Timeout(None, connect=15.0),
        ) as response:
            async for line in response.aiter_lines():
                if not line.strip():
                    continue
                try:
                    chunk = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if chunk.get("error"):
                    log.error("Auto-pull gagal: %s", chunk["error"])
                    return
                status = chunk.get("status")
                if status and status != last_status:
                    last_status = status
                    log.info("Auto-pull: %s", status)
        models_cache["fetched_at"] = 0.0
        log.info("Model default %s siap dipakai.", DEFAULT_MODEL)
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        log.warning("Auto-pull model default gagal: %s", exc)


async def resolve_model(requested: Optional[str]) -> str:
    if requested and requested.strip():
        return requested.strip()
    if DEFAULT_MODEL:
        return DEFAULT_MODEL
    try:
        models = await fetch_models(force=True)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Ollama tidak dapat diakses di {OLLAMA_BASE_URL}: {exc}",
        ) from exc
    if not models:
        raise HTTPException(
            status_code=503,
            detail="Belum ada model terpasang. Jalankan `ollama pull <model>`.",
        )
    return models[0]["name"]


class Message(BaseModel):
    role: Literal["system", "user", "assistant", "tool"]
    content: str = ""


class ChatRequest(BaseModel):
    messages: list[Message] = Field(default_factory=list)
    model: Optional[str] = None
    options: Optional[dict[str, Any]] = None
    think: Optional[bool] = None
    keep_alive: Optional[str | int] = None


class PullRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class WarmupRequest(BaseModel):
    model: Optional[str] = None


def build_payload(payload: ChatRequest, model: str, stream: bool) -> dict[str, Any]:
    # Persona server selalu menjadi system message pertama; system message dari
    # klien diabaikan agar prompt tidak bisa diubah lewat UI/API.
    messages: list[dict[str, Any]] = []
    if DEFAULT_SYSTEM_PROMPT:
        messages.append({"role": "system", "content": DEFAULT_SYSTEM_PROMPT})
    messages.extend(
        message.model_dump() for message in payload.messages if message.role != "system"
    )

    body: dict[str, Any] = {"model": model, "messages": messages, "stream": stream}
    if payload.options:
        body["options"] = payload.options
    if payload.think is not None:
        body["think"] = payload.think
    body["keep_alive"] = (
        payload.keep_alive if payload.keep_alive is not None else DEFAULT_KEEP_ALIVE
    )
    return body


def sse(payload: dict[str, Any]) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


class ClientDisconnected(Exception):
    """Raised when the browser goes away mid-stream."""


async def iter_lines(
    response: httpx.Response, request: Request, poll: float = 1.0
) -> AsyncIterator[str]:
    """Yield lines while noticing client disconnects during idle periods."""
    iterator = response.aiter_lines().__aiter__()
    pending: asyncio.Task[str] = asyncio.create_task(iterator.__anext__())
    try:
        while True:
            done, _ = await asyncio.wait({pending}, timeout=poll)
            if pending in done:
                try:
                    line = pending.result()
                except StopAsyncIteration:
                    return
                yield line
                pending = asyncio.create_task(iterator.__anext__())
            elif await request.is_disconnected():
                log.info("Klien terputus, generasi dihentikan.")
                raise ClientDisconnected()
    finally:
        if not pending.done():
            pending.cancel()
        with contextlib.suppress(asyncio.CancelledError, StopAsyncIteration, RuntimeError):
            await pending


def build_stats(chunk: dict[str, Any], wall_ms: float) -> dict[str, Any]:
    eval_count = int(chunk.get("eval_count") or 0)
    eval_duration = int(chunk.get("eval_duration") or 0)
    tokens_per_second = (
        round(eval_count / (eval_duration / 1_000_000_000), 1)
        if eval_duration
        else None
    )
    return {
        "wall_ms": round(wall_ms),
        "total_duration_ms": round(int(chunk.get("total_duration") or 0) / 1_000_000),
        "load_duration_ms": round(int(chunk.get("load_duration") or 0) / 1_000_000),
        "prompt_tokens": chunk.get("prompt_eval_count"),
        "completion_tokens": eval_count or None,
        "tokens_per_second": tokens_per_second,
    }


@app.get("/api/health")
async def health() -> dict[str, Any]:
    online = False
    version = None
    try:
        response = await get_client().get("/api/version", timeout=3.0)
        response.raise_for_status()
        version = response.json().get("version")
        online = True
    except Exception:
        version = None
    return {
        "status": "ok" if online else "offline",
        "ollama_online": online,
        "version": version,
        "base_url": OLLAMA_BASE_URL,
        "default_model": DEFAULT_MODEL or None,
        "time": int(time.time()),
    }


@app.get("/api/system")
async def system_info() -> dict[str, Any]:
    online = False
    version = None
    try:
        response = await get_client().get("/api/version", timeout=3.0)
        response.raise_for_status()
        version = response.json().get("version")
        online = True
    except Exception:
        version = None
    return {
        "app": "NEON AI",
        "version": app.version,
        "python": platform.python_version(),
        "platform": platform.platform(),
        "hostname": socket.gethostname(),
        "uptime_seconds": round(time.time() - STARTED_AT),
        "ollama_online": online,
        "ollama_version": version,
        "ollama_base_url": OLLAMA_BASE_URL,
        "default_model": DEFAULT_MODEL or None,
        "default_keep_alive": DEFAULT_KEEP_ALIVE,
        "auto_pull": AUTO_PULL,
        "persona": DEFAULT_SYSTEM_PROMPT,
        "time": int(time.time()),
    }


@app.post("/api/warmup")
async def warmup(payload: WarmupRequest) -> dict[str, Any]:
    """Muat model ke memori lebih awal supaya balasan pertama tidak lambat."""
    model = await resolve_model(payload.model)
    started = time.perf_counter()
    try:
        response = await get_client().post(
            "/api/generate",
            json={"model": model, "prompt": "", "keep_alive": DEFAULT_KEEP_ALIVE},
            timeout=httpx.Timeout(REQUEST_TIMEOUT, connect=10.0),
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text[:400]
        raise HTTPException(status_code=502, detail=f"Ollama error: {detail}") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {
        "ok": True,
        "model": model,
        "keep_alive": DEFAULT_KEEP_ALIVE,
        "load_ms": round((time.perf_counter() - started) * 1000),
    }


@app.get("/api/models")
async def list_models() -> dict[str, Any]:
    try:
        models = await fetch_models(force=True)
    except Exception as exc:
        log.warning("Gagal mengambil daftar model: %s", exc)
        return {
            "online": False,
            "models": [],
            "error": f"Tidak dapat terhubung ke Ollama: {exc}",
        }
    return {"online": True, "models": models}


@app.get("/api/models/running")
async def running_models() -> dict[str, Any]:
    try:
        response = await get_client().get("/api/ps", timeout=10.0)
        response.raise_for_status()
        models = [normalize_model(item) for item in response.json().get("models", [])]
    except Exception as exc:
        return {"online": False, "models": [], "error": str(exc)}
    return {"online": True, "models": models}


@app.delete("/api/models/{name:path}")
async def delete_model(name: str) -> dict[str, Any]:
    try:
        response = await get_client().request(
            "DELETE", "/api/delete", json={"model": name}, timeout=60.0
        )
        if response.status_code >= 400:
            detail = response.text[:400]
            raise HTTPException(status_code=response.status_code, detail=detail)
    except HTTPException:
        raise
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    finally:
        models_cache["fetched_at"] = 0.0
    return {"ok": True, "deleted": name}


async def pull_generator(http_request: Request, name: str) -> AsyncIterator[str]:
    try:
        async with get_client().stream(
            "POST",
            "/api/pull",
            json={"model": name, "stream": True},
            timeout=httpx.Timeout(None, connect=15.0),
        ) as response:
            if response.status_code >= 400:
                detail = (await response.aread()).decode("utf-8", "replace")
                yield sse({"type": "error", "message": detail[:400]})
                yield SSE_DONE
                return
            async for line in iter_lines(response, http_request):
                if not line.strip():
                    continue
                try:
                    chunk = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if chunk.get("error"):
                    yield sse({"type": "error", "message": str(chunk["error"])})
                    yield SSE_DONE
                    return
                yield sse(
                    {
                        "type": "progress",
                        "status": chunk.get("status"),
                        "completed": chunk.get("completed"),
                        "total": chunk.get("total"),
                    }
                )
    except ClientDisconnected:
        return
    except asyncio.CancelledError:
        raise
    except httpx.TimeoutException:
        yield sse({"type": "error", "message": "Waktu unduhan habis."})
        yield SSE_DONE
        return
    except Exception as exc:
        yield sse({"type": "error", "message": str(exc)})
        yield SSE_DONE
        return

    models_cache["fetched_at"] = 0.0
    yield sse({"type": "done", "name": name})
    yield SSE_DONE


@app.post("/api/models/pull")
async def pull_model(payload: PullRequest, request: Request) -> StreamingResponse:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nama model wajib diisi.")
    return StreamingResponse(
        pull_generator(request, name),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


async def chat_generator(
    http_request: Request, payload: dict[str, Any]
) -> AsyncIterator[str]:
    started = time.perf_counter()
    try:
        async with get_client().stream("POST", "/api/chat", json=payload) as response:
            if response.status_code >= 400:
                detail = (await response.aread()).decode("utf-8", "replace")
                yield sse(
                    {
                        "type": "error",
                        "message": f"Ollama menolak permintaan ({response.status_code}): {detail[:400]}",
                    }
                )
                yield SSE_DONE
                return

            async for line in iter_lines(response, http_request):
                if not line.strip():
                    continue
                try:
                    chunk = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if chunk.get("error"):
                    yield sse({"type": "error", "message": str(chunk["error"])})
                    yield SSE_DONE
                    return

                message = chunk.get("message") or {}
                if message.get("thinking"):
                    yield sse({"type": "thinking", "content": message["thinking"]})
                if message.get("content"):
                    yield sse({"type": "token", "content": message["content"]})
                if chunk.get("done"):
                    yield sse(
                        {
                            "type": "done",
                            "stats": build_stats(
                                chunk, (time.perf_counter() - started) * 1000
                            ),
                            "model": payload["model"],
                        }
                    )
                    yield SSE_DONE
                    return
    except ClientDisconnected:
        return
    except asyncio.CancelledError:
        raise
    except httpx.ConnectError:
        yield sse(
            {
                "type": "error",
                "message": f"Tidak dapat terhubung ke Ollama di {OLLAMA_BASE_URL}. Pastikan `ollama serve` berjalan.",
            }
        )
    except httpx.TimeoutException:
        yield sse({"type": "error", "message": "Ollama tidak merespons (timeout)."})
    except Exception as exc:
        log.exception("Kesalahan streaming")
        yield sse({"type": "error", "message": str(exc)})

    yield SSE_DONE


@app.post("/api/chat/stream")
async def chat_stream(payload: ChatRequest, request: Request) -> StreamingResponse:
    model = await resolve_model(payload.model)
    body = build_payload(payload, model, stream=True)
    return StreamingResponse(
        chat_generator(request, body),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.post("/api/chat")
async def chat(payload: ChatRequest) -> dict[str, Any]:
    model = await resolve_model(payload.model)
    body = build_payload(payload, model, stream=False)
    started = time.perf_counter()
    try:
        response = await get_client().post("/api/chat", json=body)
        response.raise_for_status()
        result = response.json()
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text[:400]
        raise HTTPException(status_code=502, detail=f"Ollama error: {detail}") from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    latency_ms = round((time.perf_counter() - started) * 1000)
    return {
        "response": (result.get("message") or {}).get("content", ""),
        "model": model,
        "latency_ms": latency_ms,
        "stats": build_stats(result, latency_ms),
    }


if STATIC_DIR.is_dir():
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
async def index():
    index_file = STATIC_DIR / "index.html"
    if not index_file.is_file():
        return JSONResponse(
            {"error": "static/index.html tidak ditemukan."}, status_code=500
        )
    return FileResponse(index_file, media_type="text/html")


if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")
