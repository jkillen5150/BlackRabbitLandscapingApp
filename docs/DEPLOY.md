# Deploy Black Rabbit (stay up without your laptop)

## Target shape

| Piece | Host | URL |
|--------|------|-----|
| API (FastAPI) | Render / Railway / Fly | `https://api.blackrabbitlawn.com` |
| Web app (Expo export) | Vercel | `https://app.blackrabbitlawn.com` |
| Marketing | existing site | `https://blackrabbitlawn.com` |

## 1. Backend (always-on)

### Render

1. Push this repo to GitHub.
2. [Render Blueprint](https://render.com/deploy?repo=https://github.com/jkillen5150/BlackRabbitLandscapingApp) or New Web Service → `backend/`.
3. Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Optional: set `FRONTEND_URL` to your Vercel URL.

### Important about data

Free hosts may wipe ephemeral disks. For real traffic, move to **Postgres**.

## 2. Frontend (Vercel)

1. Import the GitHub repo in [Vercel](https://vercel.com).
2. Root = repo root (`vercel.json`).
3. Env:

```
EXPO_PUBLIC_API_URL=https://YOUR-API-HOST
```

## 3. Point the lawn site

```html
<script>
  window.BR_APP_URL = 'https://YOUR-VERCEL-APP.vercel.app';
</script>
```

## Checklist

- [ ] API `/` returns OK
- [ ] Frontend loads Home
- [ ] Post a job / Request Black Rabbit works
- [ ] Pros / Jobs reachable from You
