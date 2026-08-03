"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleCheck, Eye, EyeOff } from "lucide-react";

import { AuthError, AuthNotice, AuthPanel, authInputClass } from "@/components/auth-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { resetPassword } from "@/lib/api/auth";

const MIN_LENGTH = 8;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPassword />
    </Suspense>
  );
}

function ResetPasswordFallback() {
  return (
    <AuthPanel title="Choose a new password" description="Loading your reset link…">
      <Spinner className="size-5 text-muted-foreground" />
    </AuthPanel>
  );
}

function ResetPassword() {
  const router = useRouter();
  const token = useSearchParams().get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await resetPassword(token, password);
      setDone(true);
      // The old session (if any) is now stale — send them through sign-in.
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't reset your password. Request a new link and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthPanel
        title="This link is incomplete"
        description="It's missing the reset token, so we can't tell which account to update."
      >
        <AuthError>Open the link straight from the email, or request a new one.</AuthError>
        <Button
          render={<Link href="/forgot-password" />}
          nativeButton={false}
          className="h-11.5 rounded-xl"
        >
          Request a new link
        </Button>
      </AuthPanel>
    );
  }

  if (done) {
    return (
      <AuthPanel title="Password updated" description="You can sign in with your new password now.">
        <span className="bg-positive/10 text-positive flex size-11 items-center justify-center rounded-full">
          <CircleCheck className="size-5.5" />
        </span>
        <Button render={<Link href="/login" />} nativeButton={false} className="h-11.5 rounded-xl">
          Continue to sign in
        </Button>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel
      title="Choose a new password"
      description="Pick something you haven't used on PickWise before."
    >
      {error && <AuthError>{error}</AuthError>}

      <form className="flex flex-col gap-4.5" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5 text-xs font-semibold">
          New password
          <span className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              required
              minLength={MIN_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${authInputClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </span>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-semibold">
          Confirm new password
          <Input
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            required
            minLength={MIN_LENGTH}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={authInputClass}
          />
        </label>

        <Button type="submit" disabled={submitting} className="h-11.5 rounded-xl">
          {submitting && <Spinner data-icon="inline-start" />}
          {submitting ? "Updating…" : "Update password"}
        </Button>
      </form>

      <AuthNotice>Reset links expire 15 minutes after they&apos;re sent.</AuthNotice>
    </AuthPanel>
  );
}
