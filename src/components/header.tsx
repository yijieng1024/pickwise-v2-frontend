import Image from "next/image";
import Link from "next/link";
import { Bot, MenuIcon, MonitorSmartphone, Search } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navLinks = [
  { href: "/laptops", label: "Laptops" },
  { href: "/chat", label: "Chat with Pico", icon: Bot },
  { href: "/compare", label: "Compare" },
  { href: "/saved", label: "Saved" },
];

// Placeholder until real authentication is wired up; the avatar only
// shows for logged-in users, everyone else gets the sign-up button.
const isAuthenticated: boolean = false;

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <MonitorSmartphone className="h-6 w-6 text-primary" />
          <span className="text-xl font-semibold tracking-tight">PickWise</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 transition-colors hover:text-primary"
            >
              {Icon && <Icon className="h-4 w-4" />}
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search laptops..."
              className="w-40 rounded-full border border-transparent bg-muted py-2 pr-4 pl-9 text-sm transition-all focus:w-64 focus:border-input focus:bg-background focus:ring-2 focus:ring-primary/40 focus:outline-none"
            />
          </div>
          <ThemeToggle />
          {isAuthenticated ? (
            <div className="hidden h-8 w-8 items-center justify-center overflow-hidden rounded-full border bg-muted sm:flex">
              <Image
                src="https://i.pravatar.cc/100?img=33"
                alt="User avatar"
                width={32}
                height={32}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                Log In
              </Link>
              <Button render={<Link href="/signup" />} className="rounded-full">
                Sign Up
              </Button>
            </div>
          )}

          <Sheet>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="md:hidden" />
              }
            >
              <MenuIcon />
              <span className="sr-only">Open menu</span>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>PickWise</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {navLinks.map(({ href, label }) => (
                  <SheetClose
                    key={href}
                    render={
                      <Link
                        href={href}
                        className="rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      />
                    }
                  >
                    {label}
                  </SheetClose>
                ))}
              </nav>
              <SheetFooter>
                <Button render={<Link href="/signup" />}>
                  Register to Get Recommendations
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
