"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const perks = [
  "Saved conversations and comparisons",
  "Price-drop alerts on your shortlist",
  "PickScores that remember your preferences",
];

export default function LoginPage() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const isLogin = tab === "login";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-12 sm:px-6">
      <div className="border-line bg-surface grid w-full max-w-[860px] grid-cols-1 overflow-hidden rounded-[28px] border shadow-[0_24px_72px_var(--shadow)] md:grid-cols-2">
        {/* Brand panel */}
        <div className="from-brand flex flex-col gap-4 bg-gradient-to-br to-primary px-10 py-11 text-white">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-white/20 text-[13px] font-bold">
              P
            </span>
            <span className="text-[16px] font-bold tracking-tight">
              PickWise
            </span>
          </div>
          <h2 className="mt-6 text-[30px] leading-tight font-bold tracking-tight text-balance">
            The laptop advisor that speaks your language.
          </h2>
          <p className="text-sm leading-relaxed opacity-85">
            Chat with Pico in English, Malay or Chinese. Get PickScores tuned
            to your needs — not the retailer&apos;s margin.
          </p>
          <div className="mt-auto flex flex-col gap-3 text-[13px]">
            {perks.map((perk) => (
              <span key={perk} className="flex items-center gap-2.5 opacity-90">
                <Check className="h-3.5 w-3.5 flex-none" strokeWidth={2.2} />
                {perk}
              </span>
            ))}
          </div>
        </div>

        {/* Form panel */}
        <div className="flex flex-col gap-4.5 px-10 py-10">
          <div className="bg-surface-2 flex rounded-full p-1">
            <button
              type="button"
              onClick={() => setTab("login")}
              className={cn(
                "flex-1 rounded-full py-2.5 text-[13px] font-semibold transition-all",
                isLogin
                  ? "bg-surface shadow-[0_2px_8px_var(--shadow)]"
                  : "text-muted-foreground",
              )}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setTab("register")}
              className={cn(
                "flex-1 rounded-full py-2.5 text-[13px] font-semibold transition-all",
                !isLogin
                  ? "bg-surface shadow-[0_2px_8px_var(--shadow)]"
                  : "text-muted-foreground",
              )}
            >
              Create account
            </button>
          </div>

          <div>
            <h1 className="mt-1 mb-1 text-2xl font-bold tracking-tight">
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-[13px] text-muted-foreground">
              {isLogin
                ? "Sign in to pick up where you left off with Pico."
                : "Save conversations, comparisons and price alerts."}
            </p>
          </div>

          <form className="flex flex-col gap-4.5">
            {!isLogin && (
              <label className="flex flex-col gap-1.5 text-xs font-semibold">
                Full name
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Aiman Rahim"
                  className="border-line bg-canvas h-11.5 rounded-xl border px-4 text-[13.5px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--brand-tint)]"
                />
              </label>
            )}
            <label className="flex flex-col gap-1.5 text-xs font-semibold">
              Email
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="border-line bg-canvas h-11.5 rounded-xl border px-4 text-[13.5px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--brand-tint)]"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold">
              <span className="flex justify-between">
                <span>Password</span>
                {isLogin && (
                  <Link href="#" className="font-medium">
                    Forgot password?
                  </Link>
                )}
              </span>
              <input
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                placeholder="••••••••"
                className="border-line bg-canvas h-11.5 rounded-xl border px-4 text-[13.5px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--brand-tint)]"
              />
            </label>
            <button
              type="submit"
              className="bg-brand rounded-full py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              {isLogin ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="flex items-center gap-3 text-[11.5px] text-muted-foreground">
            <span className="bg-line h-px flex-1" />
            or continue with
            <span className="bg-line h-px flex-1" />
          </div>

          <div className="flex gap-2.5">
            <button
              type="button"
              className="border-line hover:border-brand flex flex-1 items-center justify-center gap-2 rounded-full border py-2.5 text-[13px] font-semibold"
            >
              Google
            </button>
            <button
              type="button"
              className="border-line hover:border-brand flex flex-1 items-center justify-center gap-2 rounded-full border py-2.5 text-[13px] font-semibold"
            >
              Apple
            </button>
          </div>

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            By continuing you agree to PickWise&apos;s{" "}
            <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </main>
  );
}
