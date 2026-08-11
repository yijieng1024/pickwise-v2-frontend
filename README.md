# PickWise v2 — Frontend

Frontend for **PickWise v2**, an AI-powered, conversational laptop-recommendation and price-comparison platform for the Malaysian market. Users chat with **Pico** — a tool-using ReAct agent — to get explainable, PickScore-ranked laptop shortlists grounded in real catalog, review, and market-price data.

Built with **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui**, against the FastAPI backend ([pickwise-v2-backend](https://github.com/yijieng1024/pickwise-v2-backend), deployed at `https://pickwise-v2-backend.onrender.com/api/v2`).

## Features

### Storefront

- **Pico chat** (`/chat`) — SSE streaming with a live, collapsible **thinking-flow** panel (the model's reasoning deltas), per-tool activity chips, word-by-word streamed replies, and an auto-following message scroller that stops when you scroll up to read. Conversations persist server-side with rename/delete and shortlist restore on reopen; the composer auto-grows (Enter sends, Shift+Enter breaks, IME-safe).
- **PickScore everywhere** — deterministic 0–100 score with an 8-factor breakdown. General-mode scores are precomputed per use case (5 profiles); signed-in users who completed the **Needs Wizard** additionally get **personalized scores** (their own factor weights, budget, brand/screen preferences) overlaid on the details page ("For you" tab + hero ring) and the chat shortlist, always visibly marked.
- **Browse** (`/laptops`) — search, brand chips, price range, sort and pagination, all held in the URL and server-rendered per query, so filtered views are shareable and the back button works. Grid/list view toggle; brand chips come from `GET /brands` (active brands), not from the rows on screen.
- **Details** (`/laptops/[id]`) — bento-grid page with a photo gallery, the PickScore breakdown card (5 use-case tabs + "For you"), a price-history chart, full spec sheet, save/share, and "Ask Pico" as the only purchase CTA.
- **Compare** (`/compare`) — up to four laptops side by side, driven entirely by the `?ids=` query string. Spec matrix with a disclosure for the deeper technical rows, plus a radar of the eight real PickScore factors (personalized for signed-in users with preferences); selection starts from the browse page's compare bar.
- **Saved laptops** (`/saved`) — server-persisted wishlist with a heart toggle on the details page, search-within-saved, and grid/list views.
- **Needs Wizard** (`/wizard`) — dynamic 6-step preference questionnaire driving personalized scoring.
- **Auth** — JWT bearer against the backend, username-or-email login, Google Sign-In (GIS), email verification, password reset, avatar upload, profile with birthday date-picker.
- **Static pages** — `/about`, `/faq` (accordion), `/privacy`, `/terms`. `/results` and `/signup` are thin redirects to `/chat` and `/login` so old links don't 404.

### Admin portal (`/admin`)

Client-gated on `user.role === "admin"`, in a collapsible shadcn `Sidebar` shell whose nav is ordered by the backend pipeline (**Collect → Catalog → Rank & search → Reviews**, then the non-pipeline groups) across ~21 screens:

- **Collect** — brands, scrape queue, raw records, and an upload screen for Acer pages that must be captured by console script rather than Ctrl+S.
- **Catalog** — laptops CRUD, upgrade options (with a server-side pattern preview before bulk writes), tags & taxonomy.
- **Rank & search** — processing/tagging runs, CPU/GPU benchmarks, embeddings with a cumulative coverage-history chart.
- **Reviews** — YouTube sources, raw review match queue, and the ingest → process → aggregate pipeline.
- **Ops** — dashboard, background jobs, chatbot monitoring (turns/day, error rate, latency percentiles), questionnaire editor, users.

Cross-cutting: listing filters/sort/page live in the URL via `useAdminQuery`; long runs return 202 with a job token followed by `useJob` + `AdminJobPanel`; trend charts share a 7/14/30/90-day range control that re-buckets the fetched window instead of refetching.

### Design system

Glassmorphism visual language (brand `#042e61`), light/dark themes, official shadcn/ui components (base-nova style, base-ui primitives) restyled via className overrides, a CVD-safe validated chart palette, and `motion-safe`-gated animations.

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
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
                  # /chat, /wizard, /saved, /compare, /login, /profile,
                  # /about, /faq, legal, and the /admin portal
  components/     # shared components (glass-surface, pick-score-*, laptop-card, …)
    charts/       # recharts leaves (radar, price history, admin trend lines)
    ui/           # shadcn/ui generated components (add with `npx shadcn add <name>`)
  lib/
    api/          # fetch wrapper, backend types, adapters, per-domain clients
      admin/      # admin-only API clients (scraper, processor, jobs, reviews, …)
    admin/        # useJob / useEmbeddingStatus polling hooks
    auth-context.tsx  # JWT session, Google Sign-In, hasPreferences tracking
    compare.ts    # compare matrix model, shared by the server page and browse
```

- Public data is fetched in Server Components through `src/lib/api/`; user-specific and admin data is fetched client-side with the bearer token.
- `src/lib/laptops.ts` still holds the `Laptop` type plus six mock laptops used by home/trending fallback and chat. The remaining mocked UI is the per-card XAI popover's factor list; everything else on screen comes from the backend.
- Path alias `@/*` → `src/`. No test framework is configured; verification is `tsc` + ESLint.

## Notes

- **Next.js 16**: this version postdates most AI training data — the exact docs are bundled at `node_modules/next/dist/docs/`. Notable rename: Middleware is now **Proxy** (`proxy.ts`).
- Remote image hosts must be allowlisted in `next.config.ts` (`images.remotePatterns`); the file is read at boot, so adding one needs a dev-server restart.
- Never import a plain (non-component) value from a `"use client"` module into a Server Component — it arrives as a client-reference stub. Shared constants go in a neutral module.
- For deeper architecture and design-language rules, see [CLAUDE.md](CLAUDE.md).
```
