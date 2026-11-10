"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, MailWarning, Wand2 } from "lucide-react";

import { AboutYouFields } from "@/components/about-you-fields";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { UserAvatar } from "@/components/user-avatar";
import {
  type AuthUser,
  type UserPreferences,
  deleteAccount,
  deleteAvatar,
  getPreferences,
  hasAnyPreferences,
  uploadAvatar,
} from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();

  // Auth-gated page: bounce anonymous visitors to /login.
  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  if (isLoading || !user || !token) {
    return (
      <main className="flex w-full flex-1 items-center justify-center py-24">
        <Spinner className="size-6 text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-10 pb-10 sm:px-6">
      <div className="motion-safe:animate-fade-in-up">
        <h1 className="text-4xl font-bold tracking-tight">Your Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your account, what you told Pico about yourself, and your laptop preferences.
        </p>
      </div>

      <AccountCard user={user} />
      <AboutYouCard token={token} />
      <PreferencesCard token={token} />
      <DeleteAccountCard user={user} token={token} />
    </main>
  );
}

function AccountCard({ user }: { user: AuthUser }) {
  const { token, bumpAvatarVersion } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const memberSince = new Date(user.created_at).toLocaleDateString("en-MY", {
    month: "long",
    year: "numeric",
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file later
    if (!file || !token) return;
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      await uploadAvatar(token, file);
      bumpAvatarVersion();
    } catch (err) {
      setAvatarError(
        err instanceof Error ? err.message : "Failed to upload photo.",
      );
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleRemove() {
    if (!token) return;
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      await deleteAvatar(token);
      bumpAvatarVersion();
    } catch (err) {
      // 404 just means there was no photo — same end state as a removal.
      if (err instanceof ApiError && err.status === 404) {
        bumpAvatarVersion();
      } else {
        setAvatarError(
          err instanceof Error ? err.message : "Failed to remove photo.",
        );
      }
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <section
      className="border-line bg-surface flex flex-wrap items-center gap-5 rounded-[24px] border p-7 motion-safe:animate-fade-in-up"
      style={{ animationDelay: "60ms" }}
    >
      <UserAvatar
        userId={user.id}
        username={user.username}
        className="size-16 text-2xl"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-lg font-bold tracking-tight">
            {user.username}
          </h2>
          {user.is_verified ? (
            <span className="flex items-center gap-1 rounded-full bg-positive/10 px-2.5 py-0.5 text-[11px] font-semibold text-positive">
              <BadgeCheck className="size-3" />
              Verified
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-negative/10 px-2.5 py-0.5 text-[11px] font-semibold text-negative">
              <MailWarning className="size-3" />
              Email not verified
            </span>
          )}
          {user.role === "admin" && (
            <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-[11px] font-semibold text-brand-text">
              Admin
            </span>
          )}
        </div>
        <p className="truncate text-[13px] text-muted-foreground">
          {user.email}
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Member since {memberSince}
        </p>
      </div>

      <div className="flex flex-col items-start gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          disabled={avatarBusy}
          onClick={() => fileInputRef.current?.click()}
          className="bg-surface-2 hover:bg-brand-tint hover:text-brand-text rounded-full px-4 py-2 text-[12.5px] font-semibold transition-colors disabled:opacity-60"
        >
          {avatarBusy ? "Working…" : "Change photo"}
        </button>
        <button
          type="button"
          disabled={avatarBusy}
          onClick={handleRemove}
          className="px-4 text-[12px] font-medium text-muted-foreground transition-colors hover:text-negative disabled:opacity-60"
        >
          Remove photo
        </button>
        {avatarError && (
          <p className="max-w-52 text-[12px] font-medium text-negative">
            {avatarError}
          </p>
        )}
      </div>
    </section>
  );
}

function AboutYouCard({ token }: { token: string }) {
  const { hasPreferences } = useAuth();
  return (
    <section
      className="border-line bg-surface rounded-[24px] border p-7 motion-safe:animate-fade-in-up"
      style={{ animationDelay: "120ms" }}
    >
      <h2 className="text-base font-bold tracking-tight">About You</h2>
      <p className="mt-0.5 mb-5 text-[13px] text-muted-foreground">
        Optional. Helps Pico explain things your way. Each answer saves as you go.
      </p>
      <AboutYouFields token={token} withKnowledge={hasPreferences === true} />
    </section>
  );
}

function PreferencesCard({ token }: { token: string }) {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    getPreferences(token)
      .then((p) => {
        if (cancelled) return;
        setPrefs(p);
        setStatus("loaded");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const hasPrefs = prefs !== null && hasAnyPreferences(prefs);

  return (
    <section
      id="preferences"
      // scroll-mt clears the floating nav island when the account menu's
      // "Preferences" link deep-links to this card.
      className="border-line bg-surface scroll-mt-28 rounded-[24px] border p-7 motion-safe:animate-fade-in-up"
      style={{ animationDelay: "180ms" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold tracking-tight">
            Laptop Preferences
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            What Pico uses to personalize your Pick Scores.
          </p>
        </div>
        <Button
          variant="tint"
          shape="pill"
          // Rendering as an anchor, so Base UI must not assume a native <button>.
          render={<Link href="/wizard" />}
          nativeButton={false}
        >
          <Wand2 data-icon="inline-start" />
          {hasPrefs ? "Update in the wizard" : "Take the Needs Wizard"}
        </Button>
      </div>

      <div className="mt-5">
        {status === "loading" && (
          <Spinner className="size-5 text-muted-foreground" />
        )}
        {status === "error" && (
          <p className="text-[13px] text-muted-foreground">
            Couldn&apos;t load your preferences right now — try again later.
          </p>
        )}
        {status === "loaded" && !hasPrefs && (
          <p className="text-[13px] text-muted-foreground">
            No preferences saved yet. Answer six quick questions and Pico will
            tune every Pick Score to you.
          </p>
        )}
        {status === "loaded" && prefs && hasPrefs && (
          <dl className="flex flex-col gap-3">
            {prefs.budget && (
              <PrefRow label="Budget">
                <Chip>
                  <span className="tabular-nums">
                    {formatBudget(prefs.budget)}
                  </span>
                </Chip>
              </PrefRow>
            )}
            {(prefs.purpose?.length ?? 0) > 0 && (
              <PrefRow label="Purpose">
                {prefs.purpose!.map((p) => (
                  <Chip key={p}>{p}</Chip>
                ))}
              </PrefRow>
            )}
            {Object.keys(prefs.priorities ?? {}).length > 0 && (
              <PrefRow label="Priorities">
                {Object.entries(prefs.priorities!)
                  .sort(([, a], [, b]) => b - a)
                  .map(([factor, weight]) => (
                    <Chip key={factor}>
                      {formatFactor(factor)}{" "}
                      <span className="text-muted-foreground tabular-nums">
                        {weight}/10
                      </span>
                    </Chip>
                  ))}
              </PrefRow>
            )}
            {(prefs.screen_size?.length ?? 0) > 0 && (
              <PrefRow label="Screen size">
                {prefs.screen_size!.map((s) => (
                  <Chip key={s}>{s}&Prime;</Chip>
                ))}
              </PrefRow>
            )}
            {prefs.portability && (
              <PrefRow label="Portability">
                <Chip>{prefs.portability}</Chip>
              </PrefRow>
            )}
            {(prefs.brand_preferences?.length ?? 0) > 0 && (
              <PrefRow label="Brands">
                {prefs.brand_preferences!.map((b) => (
                  <Chip key={b}>{b}</Chip>
                ))}
              </PrefRow>
            )}
            {prefs.tech_savviness && (
              <PrefRow label="Tech savviness">
                <Chip>{prefs.tech_savviness}</Chip>
              </PrefRow>
            )}
          </dl>
        )}
      </div>
    </section>
  );
}

function DeleteAccountCard({ user, token }: { user: AuthUser; token: string }) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Same rule as the backend: the username exactly, surrounding spaces ignored.
  const matches = typed.trim() === user.username;

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(token, typed);
      logout();
      // A full navigation: this page's own effect sends a signed-out visitor
      // to /login, and would win a race against router.replace("/").
      window.location.assign("/");
    } catch (err) {
      // Includes the last-active-admin 400, whose message says why.
      setError(
        err instanceof Error ? err.message : "Could not delete your account.",
      );
      setBusy(false);
    }
  }

  return (
    <section
      className="border-line bg-surface flex flex-wrap items-center justify-between gap-4 rounded-[24px] border p-7 motion-safe:animate-fade-in-up"
      style={{ animationDelay: "240ms" }}
    >
      <div>
        <h2 className="text-base font-bold tracking-tight">Delete Account</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Removes your account and your data. This cannot be undone.
        </p>
      </div>
      <Button variant="destructive" shape="pill" onClick={() => setOpen(true)}>
        Delete account
      </Button>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (busy) return;
          setOpen(next);
          if (!next) {
            setTyped("");
            setError(null);
          }
        }}
      >
        <AlertDialogContent className="data-[size=default]:sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. See the{" "}
              <Link href="/privacy">Privacy Policy</Link>, section 6.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-3 text-[13px]">
            <div>
              <p className="font-semibold">Deleted</p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                <li>Your account: username, email and password</li>
                <li>
                  Your conversations with Pico: messages, replies and shortlists
                </li>
                <li>The monitoring and search logs linked to you</li>
                <li>Your laptop preferences and background answers</li>
                <li>Your saved laptops and your photo</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">
                Kept, with nothing that points to you
              </p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                <li>AI usage counts, with your account removed from them</li>
                <li>
                  Search text logged before 10 November 2026, which was stored
                  without a link to any account
                </li>
              </ul>
            </div>
            <label className="flex flex-col gap-1.5">
              <span>
                Type your username, <strong>{user.username}</strong>, to
                confirm.
              </span>
              <Input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                disabled={busy}
              />
            </label>
            {error && (
              <p role="alert" className="font-medium text-negative">
                {error}
              </p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={!matches || busy}
            >
              {busy ? "Deleting…" : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function PrefRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <dt className="w-28 flex-none text-[12px] font-semibold text-muted-foreground">
        {label}
      </dt>
      <dd className="flex flex-1 flex-wrap gap-1.5">{children}</dd>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-surface-2 rounded-full px-3 py-1 text-[12px] font-medium">
      {children}
    </span>
  );
}

function formatBudget(budget: {
  min?: number | null;
  max?: number | null;
}): string {
  const rm = (n: number) => `RM ${n.toLocaleString("en-MY")}`;
  if (budget.max == null) return `${rm(budget.min ?? 0)}+`;
  if (!budget.min) return `Up to ${rm(budget.max)}`;
  return `${rm(budget.min)} – ${rm(budget.max)}`;
}

/** Priority keys are PickScore factor ids (cpu, gpu, ram_storage, …). */
function formatFactor(key: string): string {
  const names: Record<string, string> = {
    cpu: "CPU",
    gpu: "GPU",
    ram_storage: "RAM & storage",
    price: "Price",
    portability: "Portability",
    battery: "Battery",
    screen_size: "Screen size",
    brand: "Brand",
  };
  return names[key] ?? key.replaceAll("_", " ");
}
