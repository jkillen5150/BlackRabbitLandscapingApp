import os
from pathlib import Path
from typing import List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# Always load backend/.env regardless of process cwd (uvicorn, Vercel, IDE).
# override=True so rotated keys take effect without a full process restart.
_BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(_BACKEND_DIR / ".env", override=True)
load_dotenv(_BACKEND_DIR.parent / ".env", override=True)

router = APIRouter(prefix="/chat", tags=["chat"])

DEFAULT_CONTEXT = (
    "You are a helpful local landscaping assistant for Black Rabbit Services "
    "in the Yelm/Rainier, WA area. Keep responses practical, friendly, and "
    "focused on lawn care, jobs, and local services."
)

# Override with XAI_CHAT_MODEL in backend/.env if needed.
GROK_MODEL = os.getenv("XAI_CHAT_MODEL", "grok-4.5")
XAI_CHAT_URL = os.getenv("XAI_CHAT_URL", "https://api.x.ai/v1/chat/completions")


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context: Optional[str] = DEFAULT_CONTEXT


class ChatResponse(BaseModel):
    message: ChatMessage
    model: str


def _api_key() -> str:
    return os.getenv("XAI_API_KEY", "").strip()


def _key_configured(key: str | None = None) -> bool:
    k = (key if key is not None else _api_key()).strip()
    if not k:
        return False
    if k.startswith("your_") or k in ("sk_test_...", "xai-..."):
        return False
    # Real xAI keys look like xai-...
    return len(k) >= 20


def _require_api_key() -> str:
    key = _api_key()
    if not _key_configured(key):
        raise HTTPException(
            status_code=503,
            detail=(
                "XAI_API_KEY is not configured. Add a real key from "
                "https://console.x.ai to backend/.env (local) or your host env "
                "(Vercel/Railway), then restart."
            ),
        )
    return key


def _friendly_xai_error(status: int, body: str) -> str:
    lower = (body or "").lower()
    if status in (401, 403) or "incorrect api key" in lower or "invalid api key" in lower:
        return (
            "Invalid XAI_API_KEY. Create a new key at https://console.x.ai "
            "and set it in backend/.env (or Vercel env vars), then restart the API."
        )
    if status == 429:
        return "xAI rate limit hit. Wait a moment and try again."
    if status >= 500:
        return f"xAI service error ({status}). Try again shortly."
    # Keep short — avoid dumping raw gRPC blobs into the UI
    snippet = (body or "").strip().replace("\n", " ")
    if len(snippet) > 240:
        snippet = snippet[:240] + "…"
    return snippet or f"Chat request failed ({status})"


@router.post("/", response_model=ChatResponse)
async def chat_with_grok(request: ChatRequest):
    api_key = _require_api_key()
    model = os.getenv("XAI_CHAT_MODEL", GROK_MODEL)

    messages: list[dict[str, str]] = [
        {"role": "system", "content": request.context or DEFAULT_CONTEXT}
    ]
    for msg in request.messages:
        role = (msg.role or "user").lower()
        if role not in ("user", "assistant", "system"):
            role = "user"
        content = (msg.content or "").strip()
        if content:
            messages.append({"role": role, "content": content})

    if len(messages) < 2:
        raise HTTPException(status_code=400, detail="Send at least one user message.")

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            response = await client.post(
                XAI_CHAT_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": 0.7,
                },
            )
    except httpx.TimeoutException as e:
        raise HTTPException(
            status_code=504,
            detail="Chat timed out talking to xAI. Try again.",
        ) from e
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not reach xAI API: {e}",
        ) from e

    if response.status_code != 200:
        raise HTTPException(
            status_code=502 if response.status_code < 500 else 503,
            detail=_friendly_xai_error(response.status_code, response.text),
        )

    try:
        data = response.json()
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError, ValueError) as e:
        raise HTTPException(
            status_code=502,
            detail=f"Unexpected xAI response shape: {response.text[:200]}",
        ) from e

    return ChatResponse(
        message=ChatMessage(role="assistant", content=content),
        model=data.get("model") or model,
    )


@router.get("/health")
def chat_health():
    """Return whether chat can run. Optionally probes xAI when ?verify=1."""
    key = _api_key()
    configured = _key_configured(key)
    model = os.getenv("XAI_CHAT_MODEL", GROK_MODEL)
    hint = (
        None
        if configured
        else "Set XAI_API_KEY from https://console.x.ai in backend/.env or host env."
    )
    key_valid: bool | None = None

    # Light probe so a revoked/wrong key shows up in the chat banner, not only on send.
    if configured:
        try:
            with httpx.Client(timeout=8.0) as client:
                r = client.get(
                    "https://api.x.ai/v1/models",
                    headers={"Authorization": f"Bearer {key}"},
                )
            if r.status_code == 200:
                key_valid = True
            elif r.status_code in (401, 403) or "incorrect api key" in r.text.lower():
                key_valid = False
                configured = False
                hint = (
                    "XAI_API_KEY is present but rejected by xAI. Create a new key at "
                    "https://console.x.ai and update backend/.env (or Vercel env), then restart."
                )
            else:
                key_valid = None  # network/upstream glitch — don't fail health
        except httpx.HTTPError:
            key_valid = None

    return {
        "ok": configured,
        "model": model,
        "xai_api_key_configured": configured,
        "xai_api_key_valid": key_valid,
        "hint": hint,
    }
