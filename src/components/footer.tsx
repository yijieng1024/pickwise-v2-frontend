import Link from "next/link";
import { Globe } from "lucide-react";

const productLinks = [
  { href: "/laptops", label: "All laptops" },
  { href: "/wizard", label: "Needs Wizard" },
  { href: "/chat", label: "Ask Pico" },
  { href: "/compare", label: "Compare" },
];

const aboutLinks = [
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
];

const supportLinks = [
  { href: "#", label: "Contact us" },
];

export function Footer() {
  return (
    <footer className="border-line bg-surface mt-auto border-t">
      <div className="mx-auto w-full max-w-6xl px-6 pt-14 pb-7">
        <div className="mb-11 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-2">
              <span className="bg-brand flex h-6.5 w-6.5 items-center justify-center rounded-lg text-[13px] font-bold text-white">
                P
              </span>
              <span className="text-[16px] font-bold tracking-tight">
                PickWise
              </span>
            </div>
            <p className="max-w-[280px] text-[13px] leading-relaxed text-muted-foreground">
              The agent that recommends the best laptop for your needs, budget, and preferences.
            </p>
          </div>

          <nav className="flex flex-col gap-2.5">
            <span className="mb-1 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
              Pages
            </span>
            {productLinks.map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                className="hover:text-brand text-[13px] text-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>

          <nav className="flex flex-col gap-2.5">
            <span className="mb-1 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
              About
            </span>
            {aboutLinks.map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                className="hover:text-brand text-[13px] text-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* <nav className="flex flex-col gap-2.5">
            <span className="mb-1 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
              Support
            </span>
            {supportLinks.map(({ href, label }) => (
              <a
                key={label}
                href={href}
                className="hover:text-brand text-[13px] text-foreground"
              >
                {label}
              </a>
            ))}
          </nav> */}
        </div>

        <div className="border-line flex flex-wrap items-center justify-between gap-4 border-t pt-5.5">
          <span className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} PickWise. All prices in Malaysian Ringgit.
          </span>
          <div className="flex items-center gap-4.5 text-xs">
            <Link href="/terms" className="hover:text-brand text-muted-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-brand text-muted-foreground">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
