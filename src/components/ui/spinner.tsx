import { cn } from "@/lib/utils"
import { Loader2Icon } from "lucide-react"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    // Local addition: motion-safe: gate, per the project's animation rule.
    <Loader2Icon data-slot="spinner" role="status" aria-label="Loading" className={cn("size-4 motion-safe:animate-spin", className)} {...props} />
  )
}

export { Spinner }
