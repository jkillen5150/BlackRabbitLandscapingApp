from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
from xai_sdk import Client
from xai_sdk.chat import user, assistant

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context: Optional[str] = "You are a helpful local landscaping assistant for Black Rabbit Services in the Yelm/Rainier, WA area. Keep responses practical, friendly, and focused on lawn care, jobs, and local services."

class ChatResponse(BaseModel):
    message: ChatMessage

client = Client(api_key=os.getenv("XAI_API_KEY"))

@router.post("/", response_model=ChatResponse)
async def chat_with_grok(request: ChatRequest):
    try:
        chat = client.chat.create(model="grok-4.5")
        chat.append({"role": "system", "content": request.context})
        for msg in request.messages:
            if msg.role == "user":
                chat.append(user(msg.content))
            else:
                chat.append(assistant(msg.content))
        response = chat.sample()
        return ChatResponse(
            message=ChatMessage(role="assistant", content=response.content)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))