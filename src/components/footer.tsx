import Link from "next/link";
import { MonitorSmartphone } from "lucide-react";

const footerLinks = [
  { href: "/about", label: "About PickWise" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/support", label: "Contact Support" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-muted/50">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5 text-muted-foreground" />
            <span className="text-lg font-semibold tracking-tight">
              PickWise
            </span>
          </div>

          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm font-medium text-muted-foreground">
            {footerLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="transition-colors hover:text-primary"
              >
                {label}
              </Link>
            ))}
          </nav>

          <p className="text-sm font-medium text-muted-foreground/70">
            &copy; {new Date().getFullYear()} PickWise. All rights reserved.
          </p>
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-[11px] leading-relaxed text-muted-foreground/70">
          PickWise is an AI-powered smart laptop recommendation and price
          comparison platform. Prices, specifications, and availability are
          subject to change based on real-time vendor data. Our AI Pick Score is
          dynamically calculated based on hardware benchmarks and user
          preferences, but you should always verify specific requirements before
          making a purchase.
        </p>
      </div>
    </footer>
  );
}
