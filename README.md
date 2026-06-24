## Black Rabbit Landscaping

**Clean native React (Vite) + FastAPI + Grok Voice API**

Fresh, clean foundation for the landscaping service marketplace.

We started fresh to have a proper, maintainable base (no more monolithic main.py or static HTML hacks).

### Quick Start

#### 1. Setup

```bash
# Clone and checkout
git clone https://github.com/jkillen5150/BlackRabbitLandscapingApp.git
cd BlackRabbitLandscapingApp
git checkout clean-start
```

#### 2. Backend (FastAPI)

```bash
cd backend
cp .env.example .env   # Add your keys
python -m venv venv
source venv/bin/activate   # Windows: .\venv\Scripts\activate
pip install -r requirements.txt

cd app
uvicorn main:app --reload
```

Runs on http://localhost:8000

#### 3. Frontend (Native React)

```bash
cd frontend
npm install
npm run dev
```

Runs on http://localhost:5173

### Grok Voice API Built In

This project is designed for Grok Voice from the start.

#### Features included:
- **Voice Job Posting** (Customer): Mic button on the job form. Speak your description → Grok STT transcribes it.
- **Voice Agent** (Provider): "Talk to Grok" in dashboard. Full realtime speech-to-speech powered by Grok Voice Agent API (with tool calling to list/accept jobs).
- Ephemeral tokens for secure browser connections (no API key exposed).

#### To use Grok Voice:
1. Get an API key at https://x.ai/
2. Add to backend/.env: `XAI_API_KEY=sk-...`
3. The backend provides `/voice/session` for ephemeral tokens and proxies for STT.
4. Use the mic buttons in the UI.

For full realtime Voice Agent, the frontend connects using the token.

### Project Structure (Clean)

- `backend/app/main.py` — Clean FastAPI with routers-style endpoints + voice support
- `frontend/src/` — Native Vite React (no heavy frameworks)
  - `components/JobPostForm.jsx` (with VoiceInput)
  - `components/ProviderDashboard.jsx` (with VoiceAgent)
  - `components/VoiceInput.jsx`
  - `components/VoiceAgent.jsx`

### Tech Stack

- **Frontend**: React 18 + Vite (native)
- **Backend**: FastAPI + SQLAlchemy (SQLite)
- **Voice**: xAI Grok Voice API (STT + Realtime Voice Agent + TTS ready)
- **Maps**: Leaflet

Build whatever you want on top of this clean slate. The voice is architected to be extensible (tools, custom instructions, etc.).

Created for Black Rabbit Landscaping.