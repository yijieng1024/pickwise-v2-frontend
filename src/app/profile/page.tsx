"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, Loader2, MailWarning, Wand2 } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/user-avatar";
import {
  type AuthUser,
  type UserPreferences,
  deleteAvatar,
  getPreferences,
  hasAnyPreferences,
  updateProfile,
  uploadAvatar,
} from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

const inputClass =
  "border-line bg-canvas h-11.5 rounded-xl border px-4 text-[13.5px] outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--brand-tint)]";

/** Sentinel for "no gender set" — the Select needs a non-empty value. */
const GENDER_UNSET = "unset";

const genderOptions = [
  { value: GENDER_UNSET, label: "Prefer not to say" },
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

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
        <Loader2 className="h-6 w-6 text-muted-foreground motion-safe:animate-spin" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="motion-safe:animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight">Your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Account details and the personal info Pico uses to tailor advice.
        </p>
      </div>

      <AccountCard user={user} />
      <PersonalDetailsCard user={user} token={token} />
      <PreferencesCard token={token} />
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
        className="h-16 w-16 text-2xl"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-lg font-bold tracking-tight">
            {user.username}
          </h2>
          {user.is_verified ? (
            <span className="flex items-center gap-1 rounded-full bg-positive/10 px-2.5 py-0.5 text-[11px] font-semibold text-positive">
              <BadgeCheck className="h-3 w-3" />
              Verified
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-negative/10 px-2.5 py-0.5 text-[11px] font-semibold text-negative">
              <MailWarning className="h-3 w-3" />
              Email not verified
            </span>
          )}
          {user.role === "admin" && (
            <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-[11px] font-semibold text-brand">
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
          className="bg-surface-2 hover:bg-brand-tint hover:text-brand rounded-full px-4 py-2 text-[12.5px] font-semibold transition-colors disabled:opacity-60"
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

function PersonalDetailsCard({
  user,
  token,
}: {
  user: AuthUser;
  token: string;
}) {
  const { updateUser } = useAuth();
  const [birthday, setBirthday] = useState(user.birthday ?? "");
  const [gender, setGender] = useState(user.gender ?? GENDER_UNSET);
  const [occupation, setOccupation] = useState(user.occupation ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await updateProfile(token, {
        birthday: birthday || null,
        gender:
          gender === GENDER_UNSET
            ? null
            : (gender as "Male" | "Female" | "Other"),
        occupation: occupation.trim() || null,
      });
      updateUser(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="border-line bg-surface rounded-[24px] border p-7 motion-safe:animate-fade-in-up"
      style={{ animationDelay: "120ms" }}
    >
      <h2 className="text-base font-bold tracking-tight">Personal details</h2>
      <p className="mt-0.5 mb-5 text-[13px] text-muted-foreground">
        Optional — helps PickWise put recommendations in context.
      </p>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4.5 sm:grid-cols-2"
      >
        <label className="flex flex-col gap-1.5 text-xs font-semibold">
          Birthday
          <input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-semibold">
          Gender
          <Select
            items={genderOptions}
            value={gender}
            onValueChange={(value) => setGender(value as string)}
          >
            <SelectTrigger
              aria-label="Gender"
              className="border-line bg-canvas w-full cursor-pointer rounded-xl px-4 text-[13.5px] font-normal data-[size=default]:h-11.5"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              className="rounded-2xl p-1"
            >
              {genderOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="cursor-pointer rounded-lg px-3 py-2 text-[12.5px] font-medium"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-semibold sm:col-span-2">
          Occupation
          <input
            type="text"
            placeholder="e.g. Software engineer, student, designer…"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            className={inputClass}
          />
        </label>

        <div className="flex items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-brand rounded-full px-6 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && !error && (
            <span className="text-[12.5px] font-medium text-positive">
              Saved.
            </span>
          )}
          {error && (
            <span className="text-[12.5px] font-medium text-negative">
              {error}
            </span>
          )}
        </div>
      </form>
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
            Laptop preferences
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            What Pico uses to personalize your PickScores.
          </p>
        </div>
        <Link
          href="/wizard"
          className="flex items-center gap-1.5 rounded-full bg-brand-tint px-4 py-2 text-[12.5px] font-semibold text-brand transition-opacity hover:opacity-80"
        >
          <Wand2 className="h-3.5 w-3.5" />
          {hasPrefs ? "Update in the wizard" : "Take the Needs Wizard"}
        </Link>
      </div>

      <div className="mt-5">
        {status === "loading" && (
          <Loader2 className="h-5 w-5 text-muted-foreground motion-safe:animate-spin" />
        )}
        {status === "error" && (
          <p className="text-[13px] text-muted-foreground">
            Couldn&apos;t load your preferences right now — try again later.
          </p>
        )}
        {status === "loaded" && !hasPrefs && (
          <p className="text-[13px] text-muted-foreground">
            No preferences saved yet. Answer six quick questions and Pico will
            tune every PickScore to you.
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
