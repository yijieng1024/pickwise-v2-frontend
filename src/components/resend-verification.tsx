"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authInputClass } from "@/components/auth-panel";
import { resendVerification } from "@/lib/api/auth";

/**
 * "Send it again" for the verification email.
 *
 * Shared by `/login` (after an `email_unverified` 403, and under the
 * post-registration notice) and `/verify-email` (when the link has expired),
 * which are the three places a user can discover they are stuck outside their
 * own account.
 *
 * `email` is the address already known from context; when it is absent — the
 * expired-link case, where the token is opaque and carries nothing the page
 * can read — an input is shown instead of guessing.
 *
 * The confirmation is deliberately as vague as the endpoint: the backend
 * answers identically for unknown, already-verified and Google accounts, so
 * claiming "sent!" would assert something this component cannot know.
 */
export function ResendVerification({ email }: { email?: string }) {
  const [address, setAddress] = useState(email ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setSubmitting(true);
    try {
      await resendVerification(address.trim());
    } catch {
      // Swallowed for the same reason /forgot-password swallows its errors:
      // a visible failure here is a way to probe which addresses exist. A
      // genuine outage shows up as "nothing arrived", which is the same thing
      // the user would do about it either way — try again.
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  }

  if (sent) {
    return (
      <p className="text-[12.5px] text-muted-foreground">
        If that address needs verifying, a new link is on its way. It expires in
        an hour — check your spam folder if it hasn&apos;t arrived.
      </p>
    );
  }

  return (
    <form className="flex flex-col gap-2.5" onSubmit={handleSubmit}>
      {!email && (
        <Input
          type="email"
          autoComplete="email"
          placeholder="johndoe@example.com"
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className={authInputClass}
        />
      )}
      <Button
        type="submit"
        variant="outline"
        disabled={submitting}
        className="h-11.5 rounded-xl"
      >
        {submitting && <Spinner data-icon="inline-start" />}
        {submitting ? "Sending…" : "Resend verification email"}
      </Button>
    </form>
  );
}
