# Black Rabbit Services

**Fast local jobs board** for Yelm / Rainier / Olympia — Craigslist speed, phone-app feel.

Post work free. Pros claim free. **We take a small cut when a lead connects.** Fun to use, no dark patterns.

### Product
| Who | What |
|-----|------|
| **Neighbor** | Post a job in 30 seconds |
| **Pro** | Browse the board, claim, call the customer |
| **Black Rabbit** | Small lead cut on connect — platform stays free to use |

### The app (primary UI)

Zero-build HTML PWA in [`site/`](site/) — no React required to ship.

```bash
# Terminal 1 — API
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
python seed_demo.py   # optional sample jobs/pros

# Terminal 2 — static site
cd site && python3 -m http.server 5173
# open http://localhost:5173
```

Set API URL (production):

```html
<script>window.BR_API_URL = 'https://YOUR-API.onrender.com';</script>
```

### Go live

**1. API** — [Render](https://render.com/deploy?repo=https://github.com/jkillen5150/BlackRabbitLandscapingApp)  

**2. Site** — [Vercel](https://vercel.com/new/clone?repository-url=https://github.com/jkillen5150/BlackRabbitLandscapingApp)  
(serves `site/` via `vercel.json`)  
Then set `window.BR_API_URL` in `site/index.html` to the Render URL and redeploy.

Details: [`docs/DEPLOY.md`](docs/DEPLOY.md) · [`site/README.md`](site/README.md)

### Tech
- **Web**: plain HTML / CSS / JS PWA (`site/`)
- **API**: FastAPI + SQLite (Postgres later)
- **Legacy Expo app**: still in `frontend/` if you want native later

### Marketing site
Point CTAs at the Vercel URL — [`website-embed/snippet.html`](website-embed/snippet.html)
