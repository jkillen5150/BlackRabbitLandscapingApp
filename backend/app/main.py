import os
from datetime import datetime, timezone
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func
from sqlalchemy.orm import Session

from .constants import SERVICE_TIERS, SERVICE_TYPES
from .database import Base, SessionLocal, engine, get_db
from .models import appeal, job, listing_unlock, payment, provider_listing, review, user
from . import fulfillment, payments as payment_service
from .schemas import appeal as appeal_schema
from .schemas import job as job_schema
from .schemas import payment as payment_schema
from .schemas import provider_listing as listing_schema
from .schemas import review as review_schema
from .schemas import user as user_schema
from .routers.chat import router as chat_router

load_dotenv()

XAI_API_KEY = os.getenv("XAI_API_KEY", "")

frontend_dir = Path(__file__).resolve().parents[2] / "frontend"

app = FastAPI(
    title="Black Rabbit Services",
    description="Marketplace connecting customers with local service providers",
    version="0.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(frontend_dir), html=True), name="static")

Base.metadata.create_all(bind=engine)

app.include_router(chat_router)

# ... (rest of the file remains the same)