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

PickWise: an AI-powered, conversational laptop-recommendation and price-comparison frontend for the Malaysian market (all data is mocked, no backend yet — chat, PickScore, and XAI breakdowns are hardcoded, not live). The design reference is the prototype at `C:\Users\user\Downloads\PickWise Prototype\PickWise v2.dc.html` (design brief: `C:\Users\user\Downloads\PickWise Prototype\uploads\pickwise-v2-design-prompt.md`) — a glassmorphism visual language with a chat agent named **Pico**, **PickScore** rings + **XAI** factor breakdowns, and no live vendor pricing. Match it when building new UI:

- Brand primary is **#042e61** (deep navy). It lives in `globals.css` as `--primary`/`--brand` (`oklch(0.308 0.101 256.5)` light / lighter tint dark).
- No vendor branding, multi-vendor price tables, or buy buttons — purchase intent resolves to a single neutral "View retailer options" link. No stock/availability labels on cards or compare view.
- No fake marketing stats or testimonial carousels; no trophy/medal icons on scores.

## Architecture

Next.js **16.2.10** (App Router) with React 19, TypeScript (strict), and Tailwind CSS v4.

- All source lives under `src/`: routes in `src/app/`, shared components in `src/components/`, data/logic in `src/lib/`. Path alias `@/*` maps to `src/`.
- **Routes**: `/` (Omnibar hero + trending), `/laptops` (browse: search + brand filter + price sort), `/laptops/[id]` (bento-grid details; `params` is a Promise — `await` it; uses `generateStaticParams`), `/wizard` (6-step needs wizard), `/chat` (Pico chat interface — results/comparison happen inline here), `/compare`, `/saved`, `/login` (merged sign-in/create-account tabs). `/results` and `/signup` are thin redirects to `/chat` and `/login` respectively — kept so old links don't 404.
- **`src/lib/laptops.ts` is the single source of truth** for all laptop data (`Laptop` type, six mock laptops, radar values, `xaiFactors`, `sentiment.reviews`, `benchmarks`, tags). Add/change product data here only; pages derive everything from it.
- Most pages are client components (`"use client"`) because they hold interactive state (wizard steps, chat pro-tuning sliders/compare checkboxes, browse filters, compare tech-row toggle, auth tabs). `components/charts/*` (recharts), `theme-toggle`/`theme-provider` (next-themes) stay isolated client leaves.
- `src/app/layout.tsx` wraps all pages in ThemeProvider (next-themes, class strategy) + Header + Footer. Dark mode is toggled via the `.dark` class; `suppressHydrationWarning` on `<html>` is required.
- `components/laptop-card.tsx` is shared by home/browse (`showScore={false}`, compact) and chat results (`showScore` default true — adds `XaiPopover` + plain-English panel + optional compare checkbox via `compareChecked`/`onCompareChange`). Stretched-link overlay makes the whole card open the details page. Product photos use `mix-blend-multiply dark:mix-blend-normal` — keep both when adding images.
- Remote images (Unsplash, pravatar) are allowlisted in `next.config.ts` `images.remotePatterns`.

## Styling

- shadcn/ui (base-nova style, base-ui primitives — `render` prop instead of Radix's `asChild`) is configured via `components.json`; generated components go in `src/components/ui/`. Add components with `npx shadcn add <name>`.
- Tailwind v4 is configured in CSS, not JavaScript: there is no `tailwind.config.*` file. Theme customization goes in `src/app/globals.css` via `@theme`; the PostCSS plugin is `@tailwindcss/postcss`. Use theme tokens rather than hardcoded palette colors — both the original shadcn set (`bg-background`, `text-muted-foreground`, `bg-primary`, …) and the additive glassmorphism set (`bg-surface`, `bg-surface-2`, `bg-brand`/`bg-brand-tint`, `text-positive`/`text-negative`, `border-line`, plus the raw CSS vars `--glass`/`--glass-edge`/`--shadow` for backdrop/shadow work).
- **Glass surfaces**: use `components/glass-surface.tsx` (plain CSS glassmorphism — translucent fill + `backdrop-filter: blur(20px) saturate(180%)` + inner-edge highlight border) for the app's floating/overlay layers only — nav island, chat composer, XAI popover, account menu, sticky compare header, review modal. Never wrap body-level/flat content in it, and never nest one inside another. Don't reach for a third-party glass/liquid-glass package here — an earlier attempt with `liquid-glass-react` broke in-flow layout (it bakes in a self-centering `translate(-50%, -50%)` transform and several `position: relative` decorative sibling elements meant for a single floating button, which inflated container heights and misplaced content) and caused SSR/client hydration mismatches once wired to theme state. Plain CSS has none of those problems.
- Animations are `@theme` tokens in `globals.css` (`animate-fade-in-up`, `animate-float`, `animate-shimmer`, `animate-bounce-dot`). Always gate animations behind the `motion-safe:` variant. Card grids stagger entrances via inline `animationDelay`.
- Chart colors are dataviz-validated (CVD-safe, contrast-checked) — radar pair `#3b6db4`/`#9333ea`, price-history pair `#3b6db4`/`#c2571b` (second series dashed); single-series charts use `#3b6db4` alone. Charts read surface colors from CSS vars (`var(--border)` etc.) so they follow the theme.
- Prices, scores, and other data numbers use the `tabular-nums` utility class for column alignment.

## Auth (placeholder)

There is no real authentication. `isAuthenticated` in `components/header.tsx` is a hardcoded flag: `false` shows Log In + Sign Up, `true` shows the avatar + dropdown menu. `/login` (tabbed sign-in/create-account) is unwired UI; `/signup` redirects to it.

## Next.js 16 differs from training data

This Next.js version postdates most training data. The full docs for this exact version are bundled at `node_modules/next/dist/docs/` (App Router docs under `01-app/`) — check them before using an API you haven't verified. One example of a breaking rename: Middleware is now **Proxy** (`proxy.ts` at project root, not `middleware.ts`).
