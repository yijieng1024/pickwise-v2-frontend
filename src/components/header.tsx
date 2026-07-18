"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, MenuIcon, Settings, User } from "lucide-react";

import { GlassSurface } from "@/components/glass-surface";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/laptops", label: "Laptops" },
  { href: "/wizard", label: "Needs Wizard" },
  { href: "/chat", label: "Chat" },
  { href: "/saved", label: "Saved" },
  // { href: "/compare", label: "Compare" },
];

export function Header() {
  const pathname = usePathname();
  const { user, isLoading, logout, hasPreferences } = useAuth();

  // Once the account has saved wizard preferences, the nav entry goes away —
  // preference changes happen from the profile's "Laptop preferences" card.
  // Guests and unconfirmed states (null) keep the entry.
  const visibleLinks = navLinks.filter(
    ({ href }) => href !== "/wizard" || hasPreferences !== true,
  );
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
          // Layered island shadow: contact line + ambient + wide diffuse
          // falloff — deepens a touch once the page scrolls under it.
          boxShadow: scrolled
            ? "0 1px 3px var(--shadow), 0 10px 24px -6px var(--shadow), 0 32px 64px -18px var(--shadow), inset 0 1px 0 var(--glass-edge)"
            : "0 1px 2px var(--shadow), 0 6px 16px -6px var(--shadow), 0 20px 48px -20px var(--shadow), inset 0 1px 0 var(--glass-edge)",
          transition: `gap 0.5s ${SPRING}, height 0.5s ${SPRING}, padding 0.5s ${SPRING}, box-shadow 0.5s ease`,
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
          {visibleLinks.map(({ href, label }) => {
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

          {isLoading ? null : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Account"
                className="relative flex h-9 w-9 items-center justify-center rounded-full border-0 bg-transparent transition-transform hover:scale-105"
              >
                <UserAvatar
                  userId={user.id}
                  username={user.username}
                  className="h-9 w-9 text-[13px]"
                />
                <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-surface bg-positive" />
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-56 bg-transparent p-0 shadow-none ring-0"
              >
                <GlassSurface
                  cornerRadius={18}
                  className="p-2"
                  // More opaque than the default glass fill so menu text
                  // stays readable over any page content behind it.
                  style={{
                    background:
                      "color-mix(in oklab, var(--surface) 92%, transparent)",
                  }}
                >
                  <div className="mb-1.5 flex items-center gap-2.5 border-b border-line px-2 pt-1 pb-3">
                    <UserAvatar
                      userId={user.id}
                      username={user.username}
                      className="h-8.5 w-8.5 text-xs"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold">
                        {user.username}
                      </span>
                      <span className="block truncate text-[11.5px] text-muted-foreground">
                        {user.email}
                      </span>
                    </span>
                  </div>
                  <DropdownMenuItem
                    render={<Link href="/profile" />}
                    className="cursor-pointer gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium focus:bg-surface-2"
                  >
                    <User className="size-3.5" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    render={<Link href="/profile#preferences" />}
                    className="cursor-pointer gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium focus:bg-surface-2"
                  >
                    <Settings className="size-3.5" />
                    Preferences
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="mx-0 my-1.5 bg-line" />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={logout}
                    className="cursor-pointer gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-medium data-[variant=destructive]:text-negative data-[variant=destructive]:focus:bg-negative/10 data-[variant=destructive]:focus:text-negative"
                  >
                    <LogOut className="size-3.5" />
                    Log out
                  </DropdownMenuItem>
                </GlassSurface>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-brand"
              >
                Log In
              </Link>
              <Button
                render={<Link href="/login" />}
                nativeButton={false}
                className="rounded-full"
              >
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
                {visibleLinks.map(({ href, label }) => (
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
              {!user && (
                <SheetFooter>
                  <Button render={<Link href="/login" />} nativeButton={false}>
                    Register to Get Recommendations
                  </Button>
                </SheetFooter>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </GlassSurface>
      </div>
    </header>
  );
}
