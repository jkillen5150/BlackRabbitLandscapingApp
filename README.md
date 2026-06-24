## Black Rabbit Landscaping

**Clean native React (Vite) + FastAPI base**

A fresh, maintainable foundation for the landscaping service marketplace.

We started fresh here because the previous prototype was a polished turd (quick HTML + everything crammed in main.py).

### Run it

1. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate   # or .\venv\Scripts\activate on Windows
pip install -r requirements.txt
cd app
uvicorn main:app --reload
```

2. Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### What we have (clean)
- Modern FastAPI (no deprecated startup, clean routes)
- Pure Vite React frontend (no coupling)
- Job posting with map
- Provider dashboard with map + accept

Build whatever you want on top of this clean slate.