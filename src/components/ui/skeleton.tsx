import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      // motion-safe: gate is a local addition (same as ui/spinner.tsx) — a
      // page full of pulsing blocks is exactly what reduced-motion is for.
      className={cn("rounded-md bg-muted motion-safe:animate-pulse", className)}
      {...props}
    />
  )
}

export { Skeleton }
