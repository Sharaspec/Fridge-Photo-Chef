# Fridge Photo Chef

Snap a photo of your fridge or pantry → Gemini spots the ingredients → YouTube finds recipe videos that use them → play them right in the app.

See [`Docs/`](Docs) for the product requirements and API guide.

**Stack:** React + Vite (front end) · Netlify Functions (API proxy) · Gemini API · YouTube Data API v3 · all free tiers.

## How it works

| Piece | Path | What it does |
| --- | --- | --- |
| `netlify/functions/analyze-photo.mts` | `POST /api/analyze-photo` | Sends the photo to Gemini with a JSON schema; returns `{ ingredients: [{ name, confidence }] }`. Falls back to other Gemini models if the first is overloaded. The photo is never stored. |
| `netlify/functions/find-videos.mts` | `GET /api/find-videos?ingredients=a,b,c` | YouTube `search.list` (12 embeddable videos) + `videos.list` (length, views). Cached on Netlify's CDN for 24 h to save quota. |
| `src/` | — | The React app: photo picker, editable ingredient chips, video grid, in-app YouTube player. |

API keys are read only inside the functions (`process.env`), so they never reach the browser.

## Deploy to Netlify

1. In Netlify: **Add new project → Import an existing project → GitHub → `sharaspec/fridge-photo-chef`**. Build settings are picked up from `netlify.toml` (`npm run build`, publish `dist`).
2. **Project configuration → Environment variables → Add a variable**, add both:
   - `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/apikey)
   - `YOUTUBE_API_KEY` — from Google Cloud Console (YouTube Data API v3 enabled)

   Scope them to **Functions** (and Builds is fine). Mark them as secret if offered.
3. Trigger a deploy (**Deploys → Trigger deploy**) so the functions pick up the keys.

Optional: `GEMINI_MODELS` — comma-separated list of Gemini models to try in order. Default: `gemini-3.8-flash,gemini-3.6-flash,gemini-3.5-flash`.

## Run locally

```bash
npm install
cp .env.example .env   # then paste your two keys into .env
npm run dev            # http://localhost:5173 — /api/* runs the Netlify Functions locally
```

`.env` is git-ignored. Never commit keys.

## Quota notes

- YouTube: 10,000 units/day; each uncached search costs 101 units (~99 searches/day). Repeat ingredient sets are served from the CDN cache (24 h) and the browser cache, costing nothing.
- Gemini free tier: rate limits change; check the [rate limits page](https://ai.google.dev/gemini-api/docs/rate-limits) before demos.

## Roadmap (from the PRD)

- [x] M1 Setup · M2 Photo → ingredients (F1–F3) · M3 Ingredients → videos (F4–F7)
- [ ] M4 Filters (F8), Gemini dish suggestions (F9), mobile testing
- [ ] M5 Ask about this video (F10), recipe card + shopping list (F11), favorites (F12)
