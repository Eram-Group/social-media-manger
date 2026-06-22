# EPCC — Social Media Management (Demo)

Standalone client-side demo of a unified social media management platform for the
Eastern Province Chamber of Commerce (X, Instagram, LinkedIn, Facebook, Snapchat, TikTok).

All data is mock/in-memory — no backend. AI features use OpenAI when
`VITE_OPENAI_API_KEY` is set in `.env`, otherwise they fall back to sample content.

## Run

```bash
npm install
npm run dev
```

Open the printed URL (`/` redirects to the dashboard).

## Scripts
- `npm run dev` — start the dev server
- `npm run build` — typecheck + production build
- `npm run preview` — preview the production build
