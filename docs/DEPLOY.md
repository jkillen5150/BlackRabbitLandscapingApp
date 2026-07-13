# Deploy Black Rabbit (stay up without your laptop)

## Target shape

| Piece | Host | URL |
|--------|------|-----|
| API (FastAPI) | Render | `https://….onrender.com` |
| Web (static HTML PWA) | Vercel | `https://….vercel.app` |
| Marketing | existing site | `https://blackrabbitlawn.com` |

## 1. Backend

[Render Blueprint](https://render.com/deploy?repo=https://github.com/jkillen5150/BlackRabbitLandscapingApp)  
or Web Service from `backend/` → `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

## 2. Site (fast HTML)

Vercel serves the `site/` folder (`vercel.json`).

In `site/index.html` set:

```html
<script>window.BR_API_URL = 'https://YOUR-RENDER-URL';</script>
```

Redeploy Vercel after changing that line.

## 3. Marketing

```html
<script>window.BR_APP_URL = 'https://YOUR-VERCEL-APP.vercel.app';</script>
```

## Checklist

- [ ] API `/` OK  
- [ ] Board loads open jobs  
- [ ] Post free job  
- [ ] Claim as pro (You → enable pro)  
- [ ] Install PWA on phone (Add to Home Screen)
