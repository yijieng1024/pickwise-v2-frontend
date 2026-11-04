import { cn } from "@/lib/utils";

/** "Discontinued" beside a laptop no longer sold (ADR-0009 Amendment II):
 * details page, Saved cards and Compare columns. */
export function DiscontinuedLabel({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "bg-foreground/10 text-foreground block w-fit rounded-md px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase",
        className,
      )}
    >
      Discontinued
    </span>
  );
}
