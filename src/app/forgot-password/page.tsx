"use client";

import { useState } from "react";
import Link from "next/link";

import { AuthNotice, AuthPanel, authInputClass } from "@/components/auth-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { forgotPassword } from "@/lib/api/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
    } catch {
      // Deliberately ignored: the backend answers 202 whether or not the
      // address exists, and surfacing a network error here would be the one
      // way to probe which addresses are registered.
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  }

  if (sent) {
    return (
      <AuthPanel
        title="Check your inbox"
        description="If that address has a PickWise account, a reset link is on its way."
      >
        <AuthNotice>The link expires in 15 minutes. Check spam if it hasn&apos;t arrived.</AuthNotice>
        <Button render={<Link href="/login" />} nativeButton={false} className="h-11.5 rounded-xl">
          Back to sign in
        </Button>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel
      title="Reset your password"
      description="Enter the email you signed up with and we'll send you a reset link."
    >
      <form className="flex flex-col gap-4.5" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5 text-xs font-semibold">
          Email
          <Input
            type="email"
            autoComplete="email"
            placeholder="johndoe@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
          />
        </label>
        <Button type="submit" disabled={submitting} className="h-11.5 rounded-xl">
          {submitting && <Spinner data-icon="inline-start" />}
          {submitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="text-center text-[12.5px] text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="text-brand font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </AuthPanel>
  );
}
