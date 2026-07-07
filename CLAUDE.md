# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — start the dev server at http://localhost:3000
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint 9 flat config (`eslint.config.mjs`); lint one file with `npx eslint app/page.tsx`
- `npx tsc --noEmit` — type check

No test framework is configured.

## Architecture

Next.js **16.2.10** (App Router) with React 19, TypeScript (strict), and Tailwind CSS v4.

- All source lives under `src/`: routes in `src/app/` (`src/app/layout.tsx` is the root layout, loading Geist fonts and `globals.css`), shared components in `src/components/`, utilities in `src/lib/`.
- shadcn/ui (base-nova style, base-ui primitives — `render` prop instead of Radix's `asChild`) is configured via `components.json`; generated components go in `src/components/ui/`. Add components with `npx shadcn add <name>`.
- Tailwind v4 is configured in CSS, not JavaScript: there is no `tailwind.config.*` file. Theme customization goes in `src/app/globals.css` via `@theme`; the PostCSS plugin is `@tailwindcss/postcss`. Use theme tokens (`bg-background`, `text-muted-foreground`, …) rather than hardcoded palette colors.
- Path alias `@/*` maps to `src/` (see `tsconfig.json`).

## Next.js 16 differs from training data

This Next.js version postdates most training data. The full docs for this exact version are bundled at `node_modules/next/dist/docs/` (App Router docs under `01-app/`) — check them before using an API you haven't verified. One example of a breaking rename: Middleware is now **Proxy** (`proxy.ts` at project root, not `middleware.ts`).
