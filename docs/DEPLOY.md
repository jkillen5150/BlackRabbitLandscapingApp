# Deploy Black Rabbit (stay up without your laptop)

## Target shape

| Piece | Host | URL |
|--------|------|-----|
| API (FastAPI) | Render / Railway / Fly | `https://api.blackrabbitlawn.com` |
| Web app (Expo export) | Vercel | `https://app.blackrabbitlawn.com` |
| Marketing | existing site | `https://blackrabbitlawn.com` |

Codespaces are for building. Production hosts keep the process running.

## 1. Backend (always-on)

### Render (easiest free tier with disk)

1. Push this repo to GitHub.
2. [Render](https://render.com) → **New** → **Blueprint** → select repo (uses `render.yaml`).
3. Set secrets in the dashboard:
   - `XAI_API_KEY` — from https://console.x.ai
   - `FRONTEND_URL` — your Vercel app URL
4. Wait for deploy. Copy the public URL (e.g. `https://black-rabbit-api.onrender.com`).
5. Hit `/chat/health` — should show `xai_api_key_configured: true`.

### Railway alternative

```bash
# from repo root, with Railway CLI logged in
cd backend
railway init
railway variables set XAI_API_KEY=xai-... XAI_CHAT_MODEL=grok-4.5
railway up
```

Or use the included `Dockerfile` / `Procfile`.

### Important about data

Free hosts **wipe ephemeral disks** unless you attach persistent storage.
`render.yaml` mounts `/var/data` for SQLite. For real traffic, move to **Postgres** later.

## 2. Frontend (Vercel)

1. Import the GitHub repo in [Vercel](https://vercel.com).
2. Root directory: repo root (uses `vercel.json`).
3. Environment variable (Production + Preview):

```
EXPO_PUBLIC_API_URL=https://YOUR-API-HOST
```

4. Deploy. Open the Vercel URL and post a test job + ask Grok.

### Local production-like build

```bash
cd frontend
EXPO_PUBLIC_API_URL=https://YOUR-API-HOST npx expo export -p web
npx serve dist
```

## 3. Point the lawn site

In marketing `index.html`:

```html
<script>
  window.BR_APP_URL = 'https://YOUR-VERCEL-APP.vercel.app';
</script>
```

## 4. Custom domains (when ready)

- `api.blackrabbitlawn.com` → Render/Railway
- `app.blackrabbitlawn.com` → Vercel
- Keep `blackrabbitlawn.com` on marketing

## 5. Checklist before telling neighbors

- [ ] API health OK with real `XAI_API_KEY`
- [ ] Frontend `EXPO_PUBLIC_API_URL` is HTTPS API (not localhost)
- [ ] Post a job end-to-end
- [ ] Claim flow as a test provider
- [ ] Grok answers from Home + Grok tab
- [ ] Phone/text still works as fallback
- [ ] Persistent storage or Postgres for jobs

## Grok Build limits

We can redesign the app, write Docker/Render/Vercel config, and prepare env wiring.
We **cannot** finish cloud login for your Render/Vercel accounts without your tokens —
you click Deploy once; then it stays up.
