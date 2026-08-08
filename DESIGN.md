# PickWise Design System

The visual language for PickWise: Apple-inspired glassmorphism over a calm, mostly-neutral canvas, with a deep navy brand color and a single accent per surface. The reference is the design prototype (`PickWise v2.dc.html`); this document describes how that language is implemented in this codebase so new UI stays consistent with it.

Everything below is enforced through **theme tokens** in `src/app/globals.css` — Tailwind v4 is configured entirely in CSS (`@theme` / `@theme inline`), there is no `tailwind.config.*`. Always style with tokens (`bg-surface`, `text-brand`, `border-line`, …), never hardcoded palette values.

---

## Overview

PickWise uses a clean, focused visual language prioritizing clarity, trust, and precision.

- **Primary / Brand Identity:** Deep navy (`#042e61` / `oklch(0.308 0.101 256.5)`) serves as `--primary` and `--brand`. Dark mode utilizes a lighter navy tint (`oklch(0.55 0.13 256.5)`) for optimal contrast.
- **Logo Mark:** A rounded square displaying a bold white "P" on the brand gradient (`bg-brand` or `from-brand to-primary`).
- **Brand Voice:** Advisor, not salesperson. Pico (the AI chat agent) explains scores and technical criteria in plain, transparent language.

---

## Colors

Two token families coexist. The **shadcn set** (`background`, `foreground`, `primary`, `muted-foreground`, `border`, `destructive`, …) drives generated `src/components/ui/*` components. The **additive glassmorphism set** drives custom UI surfaces:

| Token (utility) | Light | Dark | Purpose / Application |
| --- | --- | --- | --- |
| `bg-canvas` (`--bg`) | `#fbfbfd` | `#0b0f14` | Page canvas background, input fields |
| `bg-surface` (`--surface`) | `#ffffff` | `#151a21` | Main content cards, floating panels |
| `bg-surface-2` (`--surface-2`) | `#f5f5f7` | `#1c232c` | Nested fills: chips, tab rails, hover fills |
| `bg-brand` (`--brand`) | `#042e61` | `#3b6db4` | Primary actions, logo background, active highlights |
| `bg-brand-tint` (`--brand-tint`) | `#eaf1fa` | `#0d2038` | Selected pills, soft badges, focus rings |
| `text-positive` (`--positive`) | `#1a7f4f` | `#4ade80` | Positive deltas, success state, "Verified" badges |
| `text-negative` (`--negative`) | `#b42318` | `#f97066` | Errors, warnings, destructive triggers |
| `border-line` (`--line`) | `rgba(29,29,31,0.07)` | `rgba(242,244,247,0.08)` | Hairline borders, table dividers |
| `--glass` | `rgba(255,255,255,0.62)` | `rgba(21,26,33,0.58)` | Glass surface fill variable |
| `--glass-edge` | `rgba(255,255,255,0.55)` | `rgba(255,255,255,0.12)` | Glass edge highlight & inner border |
| `--shadow` | `rgba(4,46,97,0.08)` | `rgba(0,0,0,0.4)` | Soft ambient drop shadows |

> **Note:** Status colors are used at low alpha for backgrounds (e.g., `bg-positive/10`, `bg-negative/10`).

### Dark Mode

- Toggled via the `.dark` class using `next-themes` (class strategy).
- Requires `suppressHydrationWarning` on `<html>`.
- Never hardcode per-theme values inline — declare token pairs in `globals.css`.

---

## Typography

- **Font Stack:** System native stack (`--font-sans`) — SF Pro on Apple hardware, Segoe UI on Windows. Geist Mono (`--font-mono`) for code or numeric monospaced context.
- **Headings:** Bold, tight tracking (`tracking-tight`). Sizes step 30px / 24px / 18px / 16px (`text-3xl` page titles down to `text-base` card headers). Hero text uses `text-balance`.
- **Body & Controls:** Compact and explicit — 13–13.5px for UI controls (`text-[13px]`, `text-[13.5px]`), 11–12.5px for captions/chips. Secondary copy uses `text-muted-foreground`.
- **Numeric Data:** All prices, PickScores, specs, and tabular numerical columns MUST use `tabular-nums`.

---

## Layout

- **Navigation:** Floating glass island, sticky `top-4`, max width `max-w-6xl`. Shrinks on scroll (64px → 52px) using spring easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`).
- **Page Container:** Page layout wraps content in a top padding container (`pt-6`) to clear the floating navigation island. Pages define internal padding (`px-4 sm:px-6`) with widths scaled by density (`max-w-3xl` to `max-w-7xl`). Full viewport pages (e.g., Chat, Wizard) must budget height dynamically with `calc(100vh - …)`.
- **Motion & Transitions:**
  - Entrance animations use `animate-fade-in-up` (12px rise, 0.5s duration, ease-out).
  - Card grids stagger entrances using inline `animationDelay` (~60ms increments).
  - Ambient float (`animate-float`), shimmer sheen (`animate-shimmer`), and typing dots (`animate-bounce-dot`) handle state transitions.

---

## Elevation & Depth

Three strict elevation levels:

1. **Canvas Layer** (`bg-canvas`): Base page context and form field backgrounds.
2. **Flat Card Layer** (`bg-surface` + `border border-line`): Body content panels, product cards, login containers. Large soft shadows are reserved exclusively for hero panels (`shadow-[0_24px_72px_var(--shadow)]`).
3. **Glass Overlay Layer** (`components/glass-surface.tsx`): Strictly floating/overlay controls — navigation island, chat input composer, XAI popovers, account dropdowns, sticky compare headers, and review modals.

**Recipe:** `var(--glass)` background + `backdrop-filter: blur(20px) saturate(180%)` + `--glass-edge` border + `0 12px 40px var(--shadow)`.

---

## Shapes

- **Radius Variable** (`--radius: 0.625rem`): Anchors the standard radius scale.
- **Pills & Buttons:** Fully rounded (`rounded-full`, `cornerRadius={999}`).
- **Cards & Hero Panels:** `rounded-[24px]` to `rounded-[28px]`.
- **Inputs & Controls:** `rounded-xl` (12px).
- **Popovers & Menus:** `cornerRadius={16–20}`.

---

## Components

### Action Controls

- **Primary Action:** `bg-brand text-white rounded-full`, `hover:opacity-90`, `disabled:opacity-60`. Limit to one primary action per view.
- **Secondary Action:** `bg-brand-tint text-brand rounded-full` or `bg-surface-2` hovering to brand tint.
- **Chips & Badges:** `bg-surface-2 rounded-full px-3 py-1 text-[12px]`. Status variants use `bg-positive/10 text-positive`, etc.
- **Inputs:** `bg-canvas border-line rounded-xl h-11.5`. Focus indicator applies `focus:shadow-[0_0_0_3px_var(--brand-tint)]` (no default browser outlines).
- **Tab Rails:** `bg-surface-2 rounded-full p-1` containing an active segment with `bg-surface` and soft elevation shadow.
- **Avatars** (`components/user-avatar.tsx`): Profile picture overlaid over fallback initials set on a `from-brand to-primary` background gradient.
- **UI Framework** (`src/components/ui/*`): shadcn/ui (base-nova design on base-ui primitives). Components consume a `render` prop.

### Product Media & Visualizations

- **Product Photos:** Image containers utilize `bg-white` in BOTH light and dark themes for clear transparent PNG display. CSS classes `mix-blend-multiply dark:mix-blend-normal` must be preserved. Images must use `object-contain` (never `object-cover`).
- **Data Visualization** (`components/charts/*`): CVD-safe, high-contrast chart pairings:
  - Radar comparison: `#3b6db4` vs `#9333ea`
  - Price history: `#3b6db4` vs `#c2571b` (second series dashed)
  - Single series: `#3b6db4`
- **PickScore Visuals:** Score rings and plain-English factor breakdowns. PickScores represent diagnostic measurement, not awards.

---

## Do's and Don'ts

### Do's

- **DO** gate all animations behind `motion-safe:` utility classes (e.g., `motion-safe:animate-spin`).
- **DO** provide explicit `aria-label` attributes on icon-only buttons and set `aria-expanded` on interactive disclosure controls.
- **DO** verify WCAG contrast ratios (minimum 4.5:1 for body copy against surfaces) in both light and dark modes.
- **DO** ensure remote image domains are explicitly allowlisted in `next.config.ts` under `images.remotePatterns`.

### Don'ts

- **DON'T** display multi-vendor price tables, vendor logos, or "Buy Now" buttons. Resolve purchase actions to a single neutral "View retailer options" link.
- **DON'T** include stock, inventory, or availability status badges on product cards.
- **DON'T** present fake marketing statistics, artificial scarcity indicators, or testimonial carousels.
- **DON'T** use trophy, crown, or medal icons on PickScore representations.
- **DON'T** nest one glass surface inside another glass surface or wrap body-level card content inside a `GlassSurface`.
- **DON'T** import third-party liquid-glass packages (e.g., `liquid-glass-react`).
- **DON'T** use `outline: none` without providing a replacement focus ring (`var(--brand-tint)`).
