# PickWise v2 — Frontend

Frontend for **PickWise v2**, an AI-powered, conversational laptop-recommendation and price-comparison platform for the Malaysian market. Users chat with **Pico** — a tool-using ReAct agent — to get explainable, PickScore-ranked laptop shortlists grounded in real catalog, review, and market-price data.

Built with **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui**, against the FastAPI backend ([pickwise-v2-backend](https://github.com/yijieng1024/pickwise-v2-backend), deployed at `https://pickwise-v2-backend.onrender.com/api/v2`).

## Features

- **Pico chat** (`/chat`) — SSE streaming with a live, collapsible **thinking-flow** panel (the model's reasoning deltas), per-tool activity chips, word-by-word streamed replies, and an auto-following message scroller that stops when you scroll up to read. Conversations persist server-side with rename/delete and shortlist restore on reopen; the composer auto-grows (Enter sends, Shift+Enter breaks, IME-safe).
- **PickScore everywhere** — deterministic 0–100 score with an 8-factor breakdown. General-mode scores are precomputed per use case (5 profiles); signed-in users who completed the **Needs Wizard** additionally get **personalized scores** (their own factor weights, budget, brand/screen preferences) overlaid on the details page ("For you" tab + hero ring) and the chat shortlist, always visibly marked.
- **Browse & details** (`/laptops`, `/laptops/[id]`) — search/filter/sort with grid/list views and lazy batched rendering; bento-grid details page with photo gallery, price-history chart, review sentiment from real YouTube reviewer transcripts, and the PickScore breakdown card.
- **Saved laptops** (`/saved`) — server-persisted wishlist with a heart toggle on the details page, search-within-saved, and grid/list views.
- **Needs Wizard** (`/wizard`) — dynamic 6-step preference questionnaire driving personalized scoring.
- **Auth** — JWT bearer against the backend, username-or-email login, Google Sign-In (GIS), email verification, avatar upload, profile with birthday date-picker.
- **Design system** — glassmorphism visual language (brand `#042e61`), light/dark themes, official shadcn/ui components (base-nova style) restyled via className overrides, CVD-safe chart palette, `motion-safe`-gated animations.

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
#    .env.local:
#    NEXT_PUBLIC_API_BASE_URL=https://pickwise-v2-backend.onrender.com/api/v2
#      (or http://localhost:8000/api/v2 against a local backend)
#    NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com   # optional — Google Sign-In button

# 3. Run the dev server
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run build        # production build
npm run start        # serve the production build
npm run lint         # ESLint 9 flat config
npx tsc --noEmit     # type check
```

## Project structure

```
src/
  app/            # App Router routes: / (trending), /laptops, /laptops/[id],
                  # /chat, /wizard, /saved, /compare, /login, /profile, legal
  components/     # shared components (glass-surface, pick-score-*, laptop-card, …)
    ui/           # shadcn/ui generated components (add with `npx shadcn add <name>`)
  lib/
    api/          # fetch wrapper, backend types, adapters, per-domain clients
    auth-context.tsx  # JWT session, Google Sign-In, hasPreferences tracking
```

- Live pages fetch through `src/lib/api/` (Server Components for public data, client-side for user-specific data). `/compare` is the one remaining mocked view.
- Path alias `@/*` → `src/`. No test framework is configured; verification is `tsc` + ESLint.

## Notes

- **Next.js 16**: this version postdates most AI training data — the exact docs are bundled at `node_modules/next/dist/docs/`. Notable rename: Middleware is now **Proxy** (`proxy.ts`).
- Remote image hosts must be allowlisted in `next.config.ts` (`images.remotePatterns`).
- For deeper architecture and design-language rules, see [CLAUDE.md](CLAUDE.md).
