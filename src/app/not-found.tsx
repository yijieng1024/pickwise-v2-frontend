import Link from "next/link";
import { SearchX, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Root 404. Besides catching `notFound()` (the laptop details page throws it on
 * an API 404/422), this handles every unmatched URL for the whole app.
 *
 * It stays self-sufficient — its own links home — because unmatched URLs under
 * `/admin` render here with no chrome around them: `AppShell` strips the header
 * and footer for that prefix, and the admin layout doesn't apply to a path that
 * matched no route segment.
 */
const shortcuts = [
  { href: "/", label: "Home" },
  { href: "/wizard", label: "Needs Wizard" },
  { href: "/compare", label: "Compare" },
  { href: "/saved", label: "Saved" },
  { href: "/faq", label: "FAQ" },
] as const;

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
      <div className="motion-safe:animate-fade-in-up">
        <div className="bg-brand-tint text-brand mx-auto flex size-14 items-center justify-center rounded-2xl">
          <SearchX className="size-6.5" />
        </div>
        <p className="text-brand mt-6 text-[11px] font-semibold tracking-wide uppercase">
          Error 404
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tighter text-balance sm:text-5xl">
          Page Not Found
        </h1>
        <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
          The page you were after doesn&apos;t exist — it may have moved, or the
          link may be mistyped. Pico can still help you find the right laptop.
        </p>
      </div>

      <div
        className="mt-8 flex flex-wrap items-center justify-center gap-3 motion-safe:animate-fade-in-up"
        style={{ animationDelay: "80ms" }}
      >
        {/* Rendering as anchors, so Base UI must not assume a native <button>. */}
        <Button
          size="xl"
          shape="pill"
          render={<Link href="/chat" />}
          nativeButton={false}
        >
          <Sparkles data-icon="inline-start" /> Ask Pico
        </Button>
        <Button
          size="xl"
          shape="pill"
          variant="outline"
          render={<Link href="/laptops" />}
          nativeButton={false}
        >
          Browse laptops
        </Button>
      </div>

      <div
        className="mt-12 motion-safe:animate-fade-in-up"
        style={{ animationDelay: "160ms" }}
      >
        <p className="text-[12.5px] text-muted-foreground">
          Or head somewhere else:
        </p>
        <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {shortcuts.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="hover:text-brand text-[13px] text-muted-foreground underline underline-offset-2"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
