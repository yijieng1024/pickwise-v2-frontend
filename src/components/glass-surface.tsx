import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface GlassSurfaceProps {
  children: ReactNode;
  /** px. Use 999 for pills (nav, composer), 16–24 for panels (popovers, modals, sticky headers). */
  cornerRadius?: number;
  className?: string;
  style?: CSSProperties;
  /** Stretch to the containing block's width instead of shrink-wrapping content. */
  fullWidth?: boolean;
  onClick?: () => void;
}

/**
 * The app's floating/overlay glassmorphism surfaces — nav island, chat
 * composer, XAI popover, account menu, sticky compare header, review modal.
 * Plain CSS glassmorphism (translucent fill + backdrop blur + inner-edge
 * highlight, per the design brief's recipe). Reserve this component for
 * overlay layers only — never body-level content — and never nest one
 * inside another.
 */
export function GlassSurface({
  children,
  cornerRadius = 24,
  className,
  style,
  fullWidth = false,
  onClick,
}: GlassSurfaceProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "border text-foreground",
        fullWidth ? "block w-full" : "inline-block",
        onClick && "cursor-pointer",
        className,
      )}
      style={{
        borderRadius: cornerRadius,
        background: "var(--glass)",
        borderColor: "var(--glass-edge)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        boxShadow: "0 12px 40px var(--shadow), inset 0 1px 0 var(--glass-edge)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
