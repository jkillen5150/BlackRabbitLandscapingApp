from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
import httpx

XAI_API_KEY = os.getenv("XAI_API_KEY")
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
XAI_BASE = "https://api.x.ai"

# ... (keep all previous code from the clean version)

# Weather integration for landscaping (show rain, temp etc when picking location)
@app.get("/weather")
async def get_weather(lat: float = Query(...), lon: float = Query(...)):
    if not OPENWEATHER_API_KEY:
        return {"error": "OPENWEATHER_API_KEY not set"}
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=imperial"
    async with httpx.AsyncClient() as client:
        r = await client.get(url)
    data = r.json()
    if r.status_code != 200:
        return {"error": data.get("message", "Weather fetch failed")}
    return {
        "temp": data["main"]["temp"],
        "description": data["weather"][0]["description"],
        "humidity": data["main"]["humidity"],
        "wind_speed": data.get("wind", {}).get("speed"),
        "icon": data["weather"][0]["icon"],
    }

# Keep all previous /jobs/ and /voice/ endpoints here
# (the full clean version from before)

# For brevity in this update, assume previous voice + job endpoints remain