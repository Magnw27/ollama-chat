from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import httpx
import uvicorn
import json
from pydantic import BaseModel
from typing import List, Dict, Optional, AsyncGenerator
import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_API_BASE = "http://localhost:11434"
OLLAMA_CHAT_URL = f"{OLLAMA_API_BASE}/api/chat"
OLLAMA_TAGS_URL = f"{OLLAMA_API_BASE}/api/tags"
DEFAULT_MODEL_NAME = "gemma4:31b-cloud"

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    model: Optional[str] = DEFAULT_MODEL_NAME
    system_prompt: Optional[str] = "You are NEON AI v5.0, a hyper-intelligent, concise, and helpful local assistant. Use markdown for formatting. Be professional, technical when needed, and extremely efficient. Always prioritize clarity."
    options: Optional[Dict] = {
        "temperature": 0.6,
        "num_predict": 2048,
        "top_k": 40,
        "top_p": 0.9
    }

@app.get("/", response_class=HTMLResponse)
async def read_root():
    try:
        with open("index.html", "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return "index.html not found. Please ensure it exists in the root directory."

@app.get("/models")
async def list_models():
    """List available Ollama models."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(OLLAMA_TAGS_URL, timeout=10.0)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": str(e)}

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """Stream AI response using Server-Sent Events (SSE)."""

    # Construct messages with system prompt
    messages = [{"role": "system", "content": request.system_prompt}] + [msg.dict() for msg in request.messages]

    payload = {
        "model": request.model,
        "messages": messages,
        "stream": True,
        "options": request.options or {}
    }

    async def event_generator() -> AsyncGenerator[str, None]:
        async with httpx.AsyncClient() as client:
            try:
                async with client.stream("POST", OLLAMA_CHAT_URL, json=payload, timeout=300.0) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line:
                            continue

                        try:
                            chunk = json.loads(line)
                            content = chunk.get("message", {}).get("content", "")
                            if content:
                                yield f"data: {json.dumps({'content': content})}\n\n"

                            if chunk.get("done"):
                                yield "data: [DONE]\n\n"
                                break
                        except json.JSONDecodeError:
                            continue
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/chat")
async def chat(request: ChatRequest):
    """Non-streaming chat endpoint for backward compatibility."""
    messages = [{"role": "system", "content": request.system_prompt}] + [msg.dict() for msg in request.messages]

    payload = {
        "model": request.model,
        "messages": messages,
        "stream": False,
        "options": request.options or {}
    }

    async with httpx.AsyncClient() as client:
        try:
            start_time = time.time()
            response = await client.post(OLLAMA_CHAT_URL, json=payload, timeout=300.0)
            response.raise_for_status()
            result = response.json()
            latency = (time.time() - start_time) * 1000

            return {
                "response": result.get("message", {}).get("content", "No response from AI"),
                "latency": f"{int(latency)}ms"
            }
        except Exception as e:
            return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
