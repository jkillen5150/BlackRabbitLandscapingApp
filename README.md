# Black Rabbit Services

**Open marketplace** connecting customers with local service providers — starting with lawn care, expanding to window washing, handyman, and more.

Built for adults: simple job posting, free exchange, mutual reviews, and a reconciliation process instead of instant bans.

### Key features
- **Customer flow**: voice or form job posting — no account required
- **Provider flow**: browse open jobs and claim them for free
- **Pros directory**: providers list their services — customers contact them directly
- **Mutual reviews** after job completion
- **Appeals process** for disputes — reviewed by humans, not auto-banned
- **Minimal profiles** with optional provider mode
- Weather for Yelm, WA on the home screen
- Expo web + iOS/Android ready

### Run it

**Terminal 1 — Backend API**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm install
npm run web
```

Open **http://localhost:8081** (Expo web). The app talks to the API at `http://localhost:8000`.

### Free exchange (for now)

Everything is free — post jobs, claim jobs, browse pros, call providers. No lead fees, no paywalls.

Monetization later might include things like an **ad-free premium** tier. Payment/Stripe code exists in the backend but is not wired into the UI.

### Tech
- **Frontend**: Expo SDK 56 + React Native (web, iOS, Android)
- **Backend**: FastAPI + SQLAlchemy (SQLite by default)
- **Differentiator**: better customer service, less patronizing than LawnStarter/GreenPal