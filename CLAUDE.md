# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — start the dev server at http://localhost:3000
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint 9 flat config (`eslint.config.mjs`); lint one file with `npx eslint src/app/page.tsx`
- `npx tsc --noEmit` — type check

No test framework is configured.

## What this app is

PickWise: an AI-powered laptop recommendation and price-comparison frontend (all data is mocked, no backend yet). The design reference is a static prototype at `C:\Users\user\Downloads\PickWise Web Prototype.html` — match it when building new UI, but with these deliberate departures:

- Brand primary is **#042e61** (deep navy), not the prototype's Apple blue. It lives in `globals.css` as `--primary` (`oklch(0.308 0.101 256.5)` light / lighter tint dark).
- **No Shopee/Lazada branding** — vendors are generic `official | retail | used` types. Do not reintroduce marketplace branding.
- No stock/availability labels on cards or compare view.

## Architecture

Next.js **16.2.10** (App Router) with React 19, TypeScript (strict), and Tailwind CSS v4.

- All source lives under `src/`: routes in `src/app/`, shared components in `src/components/`, data/logic in `src/lib/`. Path alias `@/*` maps to `src/`.
- **Routes**: `/` (hero + trending), `/laptops` (catalog with brand filter + price sort), `/laptops/[id]` (details; `params` is a Promise — `await` it; uses `generateStaticParams`), `/wizard`, `/chat`, `/results`, `/compare`, plus `/saved`, `/login`, `/signup` placeholders.
- **`src/lib/laptops.ts` is the single source of truth** for all laptop data (`Laptop` type, six mock laptops, radar values, vendor offers, tags). Add/change product data here only; pages derive everything from it. `lib/vendors.ts` maps vendor types to button classes.
- Most pages are server components. Client components are isolated to leaves: `wizard` and `laptops` pages (interactivity), `components/charts/*` (recharts), `theme-toggle`/`theme-provider` (next-themes).
- `src/app/layout.tsx` wraps all pages in ThemeProvider (next-themes, class strategy) + Header + Footer. Dark mode is toggled via the `.dark` class; `suppressHydrationWarning` on `<html>` is required.
- `components/laptop-card.tsx` is shared by home, results, and listing. It uses a stretched-link overlay (whole card links to details) with buttons on a higher z-layer. Product photos use `mix-blend-multiply dark:mix-blend-normal` — keep both when adding images.
- Remote images (Unsplash, pravatar) are allowlisted in `next.config.ts` `images.remotePatterns`.

## Styling

- shadcn/ui (base-nova style, base-ui primitives — `render` prop instead of Radix's `asChild`) is configured via `components.json`; generated components go in `src/components/ui/`. Add components with `npx shadcn add <name>`.
- Tailwind v4 is configured in CSS, not JavaScript: there is no `tailwind.config.*` file. Theme customization goes in `src/app/globals.css` via `@theme`; the PostCSS plugin is `@tailwindcss/postcss`. Use theme tokens (`bg-background`, `text-muted-foreground`, `bg-primary`, …) rather than hardcoded palette colors.
- Animations are `@theme` tokens in `globals.css` (`animate-fade-in-up`, `animate-float`). Always gate animations behind the `motion-safe:` variant. Card grids stagger entrances via inline `animationDelay`.
- Chart colors are dataviz-validated (CVD-safe, contrast-checked) — radar pair `#3b6db4`/`#9333ea`, price-history pair `#3b6db4`/`#c2571b` (second series dashed). Charts read surface colors from CSS vars (`var(--border)` etc.) so they follow the theme.

## Auth (placeholder)

There is no real authentication. `isAuthenticated` in `components/header.tsx` is a hardcoded flag: `false` shows Log In + Sign Up, `true` shows the avatar. `/login` and `/signup` are unwired UI.

## Next.js 16 differs from training data

This Next.js version postdates most training data. The full docs for this exact version are bundled at `node_modules/next/dist/docs/` (App Router docs under `01-app/`) — check them before using an API you haven't verified. One example of a breaking rename: Middleware is now **Proxy** (`proxy.ts` at project root, not `middleware.ts`).
