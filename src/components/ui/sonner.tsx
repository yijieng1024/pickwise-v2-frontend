"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // Without this every type rendered in the same neutral popover colors,
      // so a failed delete and a saved edit looked identical — the icon was
      // the only difference. richColors switches Sonner to its per-type
      // variables, which are overridden below with our own tone tokens.
      richColors
      // The icon carries the hue, not the message text. Sonner's rich colors
      // normally recolor the whole toast, but these messages are long (a full
      // laptop name and spec string), and every tone token sits at 3.1–4.4:1
      // against its own tint — under the 4.5:1 body-text bar. An icon is a
      // graphical object at a 3:1 bar, so the color lands where it is both
      // legible and sufficient.
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-positive" />
        ),
        info: (
          <InfoIcon className="size-4 text-brand" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 text-warning" />
        ),
        error: (
          <OctagonXIcon className="size-4 text-negative" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
        ),
      }}
      // Same four tones as AdminStatusPill, from the same tokens, so a success
      // toast and a "good" pill read as the same green in both themes: a 14%
      // tint of the token over the popover for the fill and 40% for the
      // border, with the text left at the popover foreground (see icons
      // above for why). color-mix, not a `/10` opacity like the pill uses —
      // a translucent toast would show the page scrolling through it.
      // `--positive`/`--negative`/`--warning` are already redefined per theme
      // in globals.css, so none of this needs a dark-mode branch.
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",

          "--success-bg": "color-mix(in oklab, var(--positive) 14%, var(--popover))",
          "--success-text": "var(--popover-foreground)",
          "--success-border": "color-mix(in oklab, var(--positive) 40%, var(--popover))",

          "--error-bg": "color-mix(in oklab, var(--negative) 14%, var(--popover))",
          "--error-text": "var(--popover-foreground)",
          "--error-border": "color-mix(in oklab, var(--negative) 40%, var(--popover))",

          "--warning-bg": "color-mix(in oklab, var(--warning) 14%, var(--popover))",
          "--warning-text": "var(--popover-foreground)",
          "--warning-border": "color-mix(in oklab, var(--warning) 40%, var(--popover))",

          "--info-bg": "color-mix(in oklab, var(--brand) 14%, var(--popover))",
          "--info-text": "var(--popover-foreground)",
          "--info-border": "color-mix(in oklab, var(--brand) 40%, var(--popover))",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
