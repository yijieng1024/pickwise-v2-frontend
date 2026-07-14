# PickWise Design System

The visual language for PickWise: Apple-inspired glassmorphism over a calm,
mostly-neutral canvas, with a deep navy brand color and a single accent per
surface. The reference is the design prototype (`PickWise v2.dc.html`); this
document describes how that language is implemented in this codebase so new
UI stays consistent with it.

Everything below is enforced through **theme tokens** in
`src/app/globals.css` — Tailwind v4 is configured entirely in CSS (`@theme` /
`@theme inline`), there is no `tailwind.config.*`. Always style with tokens
(`bg-surface`, `text-brand`, `border-line`, …), never hardcoded palette
values.

---

## 1. Brand

- **Primary / brand color:** `#042e61` (deep navy) — `--primary` and
  `--brand` (`oklch(0.308 0.101 256.5)`); dark mode uses a lighter tint
  (`oklch(0.55 0.13 256.5)`) for contrast.
- **Logo mark:** a rounded square with a white bold "P" on the brand
  gradient (`bg-brand` or `from-brand to-primary`).
- **Voice:** advisor, not salesperson. Pico (the chat agent) explains
  scores in plain language.

### Hard rules (from the design brief)

- No vendor branding, multi-vendor price tables, or buy buttons. Purchase
  intent resolves to a single neutral "View retailer options" link.
- No stock/availability labels on cards or compare view.
- No fake marketing stats or testimonial carousels.
- No trophy/medal icons on scores — PickScore is a measurement, not a prize.

---

## 2. Color tokens

Two token families coexist. The **shadcn set** (`background`, `foreground`,
`primary`, `muted-foreground`, `border`, `destructive`, …) drives generated
`src/components/ui/*` components. The **additive glassmorphism set** drives
everything custom:

| Token (utility)               | Light                      | Dark                      | Use |
| ----------------------------- | -------------------------- | ------------------------- | --- |
| `bg-canvas` (`--bg`)          | `#fbfbfd`                  | `#0b0f14`                 | Page background, form fields |
| `bg-surface` (`--surface`)    | `#ffffff`                  | `#151a21`                 | Cards, panels |
| `bg-surface-2` (`--surface-2`)| `#f5f5f7`                  | `#1c232c`                 | Nested fills: chips, tab rails, hover states |
| `bg-brand` (`--brand`)        | `#042e61`                  | lighter navy              | Primary buttons, logo, active states |
| `bg-brand-tint` (`--brand-tint`)| `#eaf1fa`                | `#0d2038`                 | Selected/active pill fills, soft badges |
| `text-positive` (`--positive`)| `#1a7f4f`                  | `#4ade80`                 | Success, gains, "Verified" |
| `text-negative` (`--negative`)| `#b42318`                  | `#f97066`                 | Errors, destructive actions |
| `border-line` (`--line`)      | `rgba(29,29,31,0.07)`      | `rgba(242,244,247,0.08)`  | Hairline borders and dividers |
| `--glass`                     | `rgba(255,255,255,0.62)`   | `rgba(21,26,33,0.58)`     | Glass surface fill (raw var) |
| `--glass-edge`                | `rgba(255,255,255,0.55)`   | `rgba(255,255,255,0.12)`  | Glass border + inner highlight (raw var) |
| `--shadow`                    | `rgba(4,46,97,0.08)`       | `rgba(0,0,0,0.4)`         | All drop shadows (raw var) |

Status colors are used at low-alpha for fills: `bg-positive/10`,
`bg-negative/10` behind their text color.

### Dark mode

- Toggled via the `.dark` class (`next-themes`, class strategy);
  `suppressHydrationWarning` on `<html>` is required.
- Never invent per-theme values inline — if both themes need a color, it
  belongs in `globals.css` as a token pair.

---

## 3. Typography

- **Font:** system stack (`--font-sans`) — SF Pro on Apple hardware,
  Segoe UI on Windows. Geist Mono (`--font-mono`) is loaded for code/mono.
- **Headings:** bold, `tracking-tight`, sizes step 30/24/18/16px
  (`text-3xl` page titles → `text-base` card titles). Hero copy uses
  `text-balance`.
- **Body/UI text:** small and precise — 13–13.5px for controls and labels
  (`text-[13px]`, `text-[13.5px]`), 11–12.5px for captions and chips,
  `text-muted-foreground` for secondary copy.
- **Numbers:** prices, scores, and any column of digits get `tabular-nums`.

---

## 4. Surfaces & elevation

Three elevation levels, lowest to highest:

1. **Canvas** (`bg-canvas`): the page itself; also form inputs.
2. **Flat cards** (`bg-surface` + `border border-line` + generous radius,
   e.g. `rounded-[24px]`): all body-level content — profile cards, login
   panel, laptop cards. Big soft shadows only for hero-level panels
   (`shadow-[0_24px_72px_var(--shadow)]`).
3. **Glass** (`components/glass-surface.tsx`): floating/overlay layers
   ONLY — nav island, chat composer, XAI popover, account menu, sticky
   compare header, review modal. Recipe: `var(--glass)` fill +
   `backdrop-filter: blur(20px) saturate(180%)` + `--glass-edge` border and
   inset highlight + `0 12px 40px var(--shadow)`.

Glass rules:

- Never wrap body-level/flat content in `GlassSurface`, and never nest one
  glass surface inside another.
- Overlay menus that must stay readable over busy content may raise opacity
  via a scoped `background: color-mix(in oklab, var(--surface) 92%, transparent)`
  override (see the header account menu) rather than changing `--glass`.
- Don't use third-party glass/liquid-glass packages — an earlier
  `liquid-glass-react` attempt broke layout and hydration (see CLAUDE.md).

### Radius

`--radius: 0.625rem` scales the shadcn `rounded-sm…4xl` steps. Conventions:
pills and buttons are fully round (`rounded-full`, GlassSurface
`cornerRadius={999}`), cards are `rounded-[24px]`–`rounded-[28px]`, inputs
`rounded-xl`, popover panels `cornerRadius={16–20}`.

---

## 5. Component patterns

- **Primary action:** `bg-brand text-white rounded-full` +
  `hover:opacity-90`, `disabled:opacity-60`. One per view.
- **Secondary/soft action:** `bg-brand-tint text-brand rounded-full`
  (active nav pill, wizard link) or `bg-surface-2` with hover to brand-tint.
- **Chips/badges:** `bg-surface-2 rounded-full px-3 py-1 text-[12px]`;
  status variants use `bg-positive/10 text-positive` etc.
- **Inputs:** `bg-canvas border-line rounded-xl h-11.5`, focus ring via
  `focus:shadow-[0_0_0_3px_var(--brand-tint)]` (no default outline).
- **Tab rails:** `bg-surface-2 rounded-full p-1` with the active segment as
  `bg-surface` + small shadow (see /login).
- **Avatars:** `components/user-avatar.tsx` — photo from the backend avatar
  gateway layered over a username-initial fallback on the
  `from-brand to-primary` gradient.
- **shadcn/ui:** base-nova style on base-ui primitives — components take a
  `render` prop instead of Radix's `asChild`. Add with `npx shadcn add <name>`;
  generated files live in `src/components/ui/`.

### Product photos

- Photo panels (card image area, details gallery) use `bg-white` in BOTH
  themes so transparent PNGs read cleanly.
- Photos keep `mix-blend-multiply dark:mix-blend-normal` — keep both
  classes whenever adding images.
- `object-contain`, never `object-cover` (no cropping laptops).
- Remote hosts must be allowlisted in `next.config.ts`
  `images.remotePatterns`.

---

## 6. Layout

- **Nav:** floating glass island, `sticky top-4`, max-w-6xl, shrinks on
  scroll (64 → 52px) with a spring easing
  (`cubic-bezier(0.34, 1.56, 0.64, 1)`), pops on route change.
- **Page gap:** the layout wraps all pages in a `pt-6` container to clear
  the island — pages then own their internal padding (`px-4 sm:px-6`,
  `max-w-3xl`–`max-w-7xl` depending on density). Viewport-sized pages
  (chat, wizard) must budget for it in their `calc(100vh - …)`.
- **Grids:** card grids stagger entrances via inline `animationDelay`
  (~60ms steps).

---

## 7. Motion

Animation tokens live in `@theme` (`globals.css`):

| Utility                 | Purpose |
| ----------------------- | ------- |
| `animate-fade-in-up`    | Default entrance for cards/sections (12px rise, 0.5s) |
| `animate-float`         | Ambient hero decoration |
| `animate-shimmer`       | Skeleton/loading sheen |
| `animate-bounce-dot`    | Pico "typing" indicator dots |
| `animate-island-in/pop` | Nav island entrance / route-change pop |

Rules:

- **Always gate animations behind `motion-safe:`** — no exceptions
  (spinners included: `motion-safe:animate-spin`).
- Springy easing is reserved for the nav island; content uses `ease-out`.
- Keep durations ≤ 0.6s for entrances; nothing blocks interaction.

---

## 8. Data visualization

Chart colors are dataviz-validated (CVD-safe, contrast-checked in both
themes) and hardcoded per pairing — do not improvise:

- Radar compare pair: `#3b6db4` vs `#9333ea`
- Price-history pair: `#3b6db4` vs `#c2571b` (second series dashed)
- Single-series charts: `#3b6db4` alone

Charts read structural colors from CSS vars (`var(--border)` etc.) so they
follow the theme. Recharts components stay isolated in
`components/charts/*` as client leaves.

PickScore visuals: score rings + XAI factor breakdowns (popover + plain-
English panel). Scores are numbers to explain, not awards — no medals,
no confetti.

---

## 9. Accessibility checklist

- Both themes must be checked for any new color pairing; body text on
  surface must stay ≥ 4.5:1.
- `motion-safe:` on all animation (see §7).
- Icon-only buttons need `aria-label`; menus set `aria-expanded`.
- Focus states use the brand-tint ring, never `outline: none` without a
  replacement.
- Decorative images use empty `alt`; meaningful ones describe the product.
