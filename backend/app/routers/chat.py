import os
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from xai_sdk import Client
from xai_sdk.chat import assistant, system, user

router = APIRouter(prefix="/chat", tags=["chat"])

DEFAULT_CONTEXT = (
    "You are a helpful local landscaping assistant for Black Rabbit Services "
    "in the Yelm/Rainier, WA area. Keep responses practical, friendly, and "
    "focused on lawn care, jobs, and local services."
)

# Override with XAI_CHAT_MODEL in backend/.env if needed.
GROK_MODEL = os.getenv("XAI_CHAT_MODEL", "grok-4.5")


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context: Optional[str] = DEFAULT_CONTEXT


class ChatResponse(BaseModel):
    message: ChatMessage
    model: str


def _get_client() -> Client:
    api_key = os.getenv("XAI_API_KEY", "").strip()
    if not api_key or api_key.startswith("your_"):
        raise HTTPException(
            status_code=503,
            detail="XAI_API_KEY is not configured. Set it in backend/.env to use chat.",
        )
    return Client(api_key=api_key)


@router.post("/", response_model=ChatResponse)
async def chat_with_grok(request: ChatRequest):
    client = _get_client()
    model = GROK_MODEL
    try:
        chat = client.chat.create(model=model)
        chat.append(system(request.context or DEFAULT_CONTEXT))
        for msg in request.messages:
            role = (msg.role or "").lower()
            if role == "user":
                chat.append(user(msg.content))
            elif role in ("assistant", "model"):
                chat.append(assistant(msg.content))
            elif role == "system":
                chat.append(system(msg.content))
            else:
                chat.append(user(msg.content))
        response = chat.sample()
        return ChatResponse(
            message=ChatMessage(role="assistant", content=response.content),
            model=model,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/health")
def chat_health():
    api_key = os.getenv("XAI_API_KEY", "").strip()
    configured = bool(api_key) and not api_key.startswith("your_")
    return {
        "ok": True,
        "model": GROK_MODEL,
        "xai_api_key_configured": configured,
    }
