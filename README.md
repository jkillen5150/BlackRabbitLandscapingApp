## Black Rabbit Landscaping

Clean native React (Vite) + FastAPI with Grok Voice API and Weather built in.

### Prerequisites
- Python 3.11+
- Node 20+

### Get API Keys

**Grok Voice API (xAI)**
1. Go to https://console.x.ai/
2. Sign up / log in
3. Go to API Keys and create one
4. Add payment method (you need to purchase credits for Voice)
5. Copy the key

**Weather API (OpenWeatherMap recommended)**
1. Sign up at https://home.openweathermap.org/users/sign_up
2. Get free API key
3. (Optional) Upgrade for more calls later

### Setup

```bash
# Backend
git checkout clean-start
cd backend
cp .env.example .env
# Edit .env with your keys
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
cd app
uvicorn main:app --reload
```

```bash
# Frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### Features
- Native React frontend (Vite)
- Job posting with map + voice input (Grok STT)
- Provider dashboard with map + realtime Grok Voice Agent
- Weather info shown when picking location

All voice and weather logic is built in cleanly. See code comments for extending the Voice Agent with tools.