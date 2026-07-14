"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useTheme } from "next-themes";
import { Check } from "lucide-react";

import { register } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

const perks = [
  "Saved conversations and comparisons",
  "Price-drop alerts on your shortlist",
  "PickScores that remember your preferences",
];

const inputClass =
  "border-line bg-canvas h-11.5 rounded-xl border px-4 text-[13.5px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--brand-tint)]";

export default function LoginPage() {
  const router = useRouter();
  const { user, login, loginWithGoogle } = useAuth();
  const { resolvedTheme } = useTheme();
  const [tab, setTab] = useState<"login" | "register">("login");
  const isLogin = tab === "login";

  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [gsiReady, setGsiReady] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Already signed in — nothing to do here.
  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  // Render the official "Sign in with Google" button once the GIS script is
  // ready. The credential callback hands us a Google ID token, which the
  // backend verifies (POST /auth/google) and swaps for our own JWT.
  // Re-renders on theme change so the button matches light/dark mode.
  useEffect(() => {
    const google = window.google;
    const container = googleButtonRef.current;
    if (!gsiReady || !GOOGLE_CLIENT_ID || !google || !container) return;

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async ({ credential }) => {
        setError(null);
        setNotice(null);
        try {
          await loginWithGoogle(credential);
          router.replace("/");
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Google sign-in failed.",
          );
        }
      },
    });
    container.replaceChildren();
    google.accounts.id.renderButton(container, {
      type: "standard",
      theme: resolvedTheme === "dark" ? "filled_black" : "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      width: Math.min(400, Math.max(200, container.offsetWidth || 400)),
    });
  }, [gsiReady, resolvedTheme, loginWithGoogle, router]);

  function switchTab(next: "login" | "register") {
    setTab(next);
    setError(null);
    setNotice(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      if (isLogin) {
        await login(identifier, password);
        router.replace("/");
      } else {
        await register(username, email, password);
        // Login is blocked until the emailed verification link is clicked,
        // so send the user to the sign-in tab with instructions instead.
        setTab("login");
        setIdentifier(email);
        setPassword("");
        setNotice(
          "Account created — check your inbox and verify your email, then sign in.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

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
              onClick={() => switchTab("login")}
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
              onClick={() => switchTab("register")}
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

          {notice && (
            <p className="rounded-xl bg-brand-tint px-4 py-3 text-[12.5px] font-medium text-brand">
              {notice}
            </p>
          )}
          {error && (
            <p className="rounded-xl bg-negative/10 px-4 py-3 text-[12.5px] font-medium text-negative">
              {error}
            </p>
          )}

          <form className="flex flex-col gap-4.5" onSubmit={handleSubmit}>
            {isLogin ? (
              <label className="flex flex-col gap-1.5 text-xs font-semibold">
                Email or username
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="you@example.com"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className={inputClass}
                />
              </label>
            ) : (
              <>
                <label className="flex flex-col gap-1.5 text-xs font-semibold">
                  Username
                  <input
                    type="text"
                    autoComplete="username"
                    placeholder="aiman_rahim"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-semibold">
                  Email
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </label>
              </>
            )}
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
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
              {!isLogin && (
                <span className="font-normal text-[11.5px] text-muted-foreground">
                  At least 8 characters, with an uppercase, a lowercase and a
                  number.
                </span>
              )}
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="bg-brand rounded-full py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {submitting
                ? isLogin
                  ? "Signing in…"
                  : "Creating account…"
                : isLogin
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          {GOOGLE_CLIENT_ID && (
            <>
              <Script
                src="https://accounts.google.com/gsi/client"
                strategy="afterInteractive"
                onReady={() => setGsiReady(true)}
              />
              <div className="flex items-center gap-3 text-[11.5px] text-muted-foreground">
                <span className="bg-line h-px flex-1" />
                or continue with
                <span className="bg-line h-px flex-1" />
              </div>
              <div
                ref={googleButtonRef}
                className="flex min-h-11 justify-center"
              />
            </>
          )}

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            By continuing you agree to PickWise&apos;s{" "}
            <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </main>
  );
}
