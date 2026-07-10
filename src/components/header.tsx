"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, MenuIcon, Settings, User } from "lucide-react";

import { GlassSurface } from "@/components/glass-surface";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/laptops", label: "Browse" },
  { href: "/wizard", label: "Needs Wizard" },
  { href: "/chat", label: "Chat" },
  { href: "/compare", label: "Compare" },
];

// Placeholder until real authentication is wired up; the avatar only
// shows for logged-in users, everyone else gets the sign-up button.
const isAuthenticated: boolean = false;

export function Header() {
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [entered, setEntered] = useState(false);
  const [popping, setPopping] = useState(false);
  const isFirstRender = useRef(true);

  // Smart navbar: shrinks on scroll, springs in on first paint, pops on navigation.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const enterTimer = setTimeout(() => setEntered(true), 700);
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(enterTimer);
    };
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setPopping(true);
    const popTimer = setTimeout(() => setPopping(false), 450);
    return () => clearTimeout(popTimer);
  }, [pathname]);

  return (
    <header className="sticky top-4 z-50 flex w-full justify-center px-4">
      <div
        className={cn(
          "w-full max-w-6xl transition-all duration-500",
          !entered && "motion-safe:animate-island-in",
          popping && "motion-safe:animate-island-pop",
        )}
      >
      <GlassSurface
        cornerRadius={999}
        className="flex items-center"
        style={{
          gap: scrolled ? 20 : 32,
          height: scrolled ? 52 : 64,
          padding: scrolled ? "0 12px 0 24px" : "0 16px 0 32px",
          transition: `gap 0.5s ${SPRING}, height 0.5s ${SPRING}, padding 0.5s ${SPRING}`,
        }}
      >
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-6.5 w-6.5 items-center justify-center rounded-lg bg-brand text-[13px] font-bold text-white">
            P
          </span>
          <span className="text-[15px] font-bold tracking-tight">
            PickWise
          </span>
        </Link>

        <nav className="hidden items-center gap-1 overflow-x-auto md:flex">
          {navLinks.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={
                  "rounded-full px-3.5 py-1.5 text-[13.5px] font-medium whitespace-nowrap transition-colors " +
                  (active
                    ? "bg-brand-tint font-semibold text-brand"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          {isAuthenticated ? (
            <div className="relative">
              <button
                type="button"
                aria-label="Account"
                aria-expanded={userMenuOpen}
                onClick={() => setUserMenuOpen((o) => !o)}
                className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-0 bg-gradient-to-br from-brand to-primary text-[13px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition-transform hover:scale-105"
              >
                <Image
                  src="https://i.pravatar.cc/100?img=33"
                  alt="User avatar"
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                />
                <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-surface bg-positive" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="motion-safe:animate-fade-in-up absolute top-11 right-0 z-50 w-56">
                    <GlassSurface cornerRadius={18} className="p-2">
                      <div className="mb-1.5 flex items-center gap-2.5 border-b border-line px-2 pt-1 pb-3">
                        <span className="flex h-8.5 w-8.5 flex-none items-center justify-center rounded-full bg-gradient-to-br from-brand to-primary text-xs font-bold text-white">
                          J
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-semibold">
                            Jack Ng
                          </span>
                          <span className="block truncate text-[11.5px] text-muted-foreground">
                            jack.ng@gmail.com
                          </span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-[10px] border-none bg-transparent px-3 py-2 text-left text-[13px] font-medium hover:bg-surface-2"
                      >
                        <User className="h-3.5 w-3.5" />
                        Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-[10px] border-none bg-transparent px-3 py-2 text-left text-[13px] font-medium hover:bg-surface-2"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        Settings
                      </button>
                      <div className="my-1.5 h-px bg-line" />
                      <button
                        type="button"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex w-full items-center gap-2.5 rounded-[10px] border-none bg-transparent px-3 py-2 text-left text-[13px] font-medium text-negative hover:bg-negative/10"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Log out
                      </button>
                    </GlassSurface>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-brand"
              >
                Log In
              </Link>
              <Button render={<Link href="/login" />} className="rounded-full">
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
              <SheetTitle className="sr-only">PickWise navigation</SheetTitle>
              <nav className="flex flex-col gap-1 px-4 pt-4">
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
                <Button render={<Link href="/login" />}>
                  Register to Get Recommendations
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </GlassSurface>
      </div>
    </header>
  );
}
