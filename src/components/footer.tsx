import Link from "next/link";
import { Globe } from "lucide-react";

const productLinks = [
  { href: "/laptops", label: "All laptops" },
  { href: "/wizard", label: "Needs Wizard" },
  { href: "/chat", label: "Ask Pico" },
  { href: "/compare", label: "Compare" },
];

const companyLinks = [
  { href: "#", label: "About" },
  { href: "#", label: "How PickScore works" },
  { href: "#", label: "Careers" },
];

const supportLinks = [
  { href: "#", label: "Help Centre" },
  { href: "#", label: "Contact us" },
  { href: "#", label: "WhatsApp" },
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
              The laptop advisor that speaks your language. Personalised
              PickScores for buyers in Malaysia — in English, Malay or
              Chinese.
            </p>
          </div>

          <nav className="flex flex-col gap-2.5">
            <span className="mb-1 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
              Product
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
              Company
            </span>
            {companyLinks.map(({ href, label }) => (
              <a
                key={label}
                href={href}
                className="hover:text-brand text-[13px] text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>

          <nav className="flex flex-col gap-2.5">
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
          </nav>
        </div>

        <div className="border-line flex flex-wrap items-center justify-between gap-4 border-t pt-5.5">
          <span className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} PickWise Sdn Bhd. All prices in
            Malaysian Ringgit.
          </span>
          <div className="flex items-center gap-4.5 text-xs">
            <a href="#" className="hover:text-brand text-muted-foreground">
              Terms
            </a>
            <a href="#" className="hover:text-brand text-muted-foreground">
              Privacy
            </a>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Globe className="h-3 w-3" />
              English (MY)
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
