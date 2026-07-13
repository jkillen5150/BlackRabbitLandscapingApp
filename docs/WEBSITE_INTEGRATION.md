# Point blackrabbitlawn.com at the marketplace (no full rebuild)

## Goal

Keep the existing lawn care marketing site HTML. Host the marketplace as its own product and **link or embed** it.

## Repos

| Repo | Role |
|------|------|
| [BlackRabbitApp2026](https://github.com/jkillen5150/BlackRabbitApp2026) | Marketing site → `blackrabbitlawn.com` |
| [black-rabbit-services](https://github.com/jkillen5150/black-rabbit-services) | Marketplace venture (Expo + FastAPI) |
| [BlackRabbitLandscapingApp](https://github.com/jkillen5150/BlackRabbitLandscapingApp) | Active development / staging of the app |

## What was added to the marketing site

In `BlackRabbitApp2026/index.html`:

1. `window.BR_APP_URL` — single config for where the app lives  
2. Hero buttons → Post a job / Find pros
3. Marketplace card with CTAs + optional iframe embed  

Change one line when you deploy:

```html
<script>
  window.BR_APP_URL = 'https://app.blackrabbitlawn.com';
</script>
```

Codespace (current play URL):

```html
window.BR_APP_URL = 'https://zany-doodle-7v495j96jw7r3wr9r-8081.app.github.dev';
```

## Deploy checklist

1. **Backend** on Railway / Render / Fly → `https://api.blackrabbitlawn.com`  
2. **Frontend** Expo web export or always-on host → `https://app.blackrabbitlawn.com`  
3. Set `EXPO_PUBLIC_API_URL=https://api.blackrabbitlawn.com`  
4. DNS:  
   - `blackrabbitlawn.com` stays on GitHub Pages (marketing)  
   - `app` + `api` CNAME/A records to app hosts  
5. Flip `BR_APP_URL` on the marketing site  
6. (Optional) Tighten backend CORS to your two domains  

## Mirror code into black-rabbit-services

If the new repo only has docs, push the full app from this clone:

```bash
cd BlackRabbitLandscapingApp
git remote add services https://github.com/jkillen5150/black-rabbit-services.git
git push services main
```

## Embed snippet only

See [`website-embed/snippet.html`](../website-embed/snippet.html).
