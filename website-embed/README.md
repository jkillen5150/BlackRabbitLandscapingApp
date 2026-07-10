# Website embed (blackrabbitlawn.com)

Keep **BlackRabbitApp2026** as the marketing homepage. Host the marketplace from **black-rabbit-services** and point a few HTML links (or an iframe) at it.

## Architecture

```
blackrabbitlawn.com          →  BlackRabbitApp2026 (GitHub Pages / static HTML)
app.blackrabbitlawn.com      →  Expo web frontend (this product)
api.blackrabbitlawn.com      →  FastAPI backend
```

No need to rewrite the lawn site in React. The site only **links or embeds** the app.

## Integration modes

### 1. Buttons only (safest first)

Open the app in a new tab. Works even if iframe embedding is blocked.

### 2. Inline iframe

Same-origin or properly hosted app URL. Toggle in `snippet.html`.

### 3. Subdomain takeover later

When ready, you can put the full SPA on `app.blackrabbitlawn.com` and keep the marketing form as a simple lead capture fallback.

## Configure URL

In the marketing `index.html` (before the snippet), set:

```html
<script>
  window.BR_APP_URL = 'https://YOUR-HOSTED-APP';
</script>
```

While developing in Codespaces:

```html
<script>
  window.BR_APP_URL = 'https://zany-doodle-7v495j96jw7r3wr9r-8081.app.github.dev';
</script>
```

## CORS / cookies

Backend already allows `CORSMiddleware` with `allow_origins=["*"]`.  
If you later tighten CORS, add `https://blackrabbitlawn.com` and `https://www.blackrabbitlawn.com`.

## Files

| File | Use |
|------|-----|
| `snippet.html` | Paste into marketing site |
| `../docs/WEBSITE_INTEGRATION.md` | Full checklist |
