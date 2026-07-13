# Black Rabbit — fast HTML marketplace

Zero build. Zero framework. App-like PWA.

## Run local

```bash
# API
cd backend && uvicorn app.main:app --reload --port 8000

# Site (any static server)
cd site && python3 -m http.server 5173
# open http://localhost:5173
```

API defaults to `http://localhost:8000`. Override:

```js
window.BR_API_URL = 'https://your-api.onrender.com';
```

Or `?api=https://your-api.onrender.com`

## Product model

- **Free**: post jobs, browse board, call pros, claim work  
- **Cut**: `lead_price` on claim (already on API) — platform fee when a lead connects  
- **Feel**: Craigslist speed + phone-app dock  

## Deploy

Vercel `outputDirectory: site` (see root `vercel.json`).  
Set `BR_API_URL` in `site/index.html` to your Render API URL before or after deploy.
