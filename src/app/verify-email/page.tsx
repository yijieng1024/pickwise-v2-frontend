"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleCheck, CircleX } from "lucide-react";

import { AuthError, AuthPanel } from "@/components/auth-panel";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { verifyEmail } from "@/lib/api/auth";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmail />
    </Suspense>
  );
}

function VerifyEmailFallback() {
  return (
    <AuthPanel title="Verifying your email" description="One moment while we confirm your address.">
      <Spinner className="size-5 text-muted-foreground" />
    </AuthPanel>
  );
}

type Status = "verifying" | "verified" | "failed";

function VerifyEmail() {
  const token = useSearchParams().get("token");
  const [status, setStatus] = useState<Status>(token ? "verifying" : "failed");
  const [message, setMessage] = useState<string | null>(
    token ? null : "This link is missing its verification token.",
  );
  // React 19 StrictMode double-invokes effects in dev; the call is idempotent
  // server-side but the second response would overwrite the first's state.
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    let cancelled = false;
    verifyEmail(token)
      .then((res) => {
        if (cancelled) return;
        setMessage(res.message);
        setStatus("verified");
      })
      .catch((err) => {
        if (cancelled) return;
        setMessage(
          err instanceof Error
            ? err.message
            : "We couldn't verify this link. It may have expired.",
        );
        setStatus("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === "verifying") return <VerifyEmailFallback />;

  if (status === "verified") {
    return (
      <AuthPanel
        title="Email verified"
        description={message ?? "Your address is confirmed."}
      >
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
      title="We couldn't verify that link"
      // Verification tokens last an hour; a stale or reused link is the
      // common case, and registering again re-sends a fresh one.
      description="The link may have expired or already been used."
    >
      <span className="bg-negative/10 text-negative flex size-11 items-center justify-center rounded-full">
        <CircleX className="size-5.5" />
      </span>
      {message && <AuthError>{message}</AuthError>}
      <Button render={<Link href="/login" />} nativeButton={false} className="h-11.5 rounded-xl">
        Back to sign in
      </Button>
      <p className="text-[12.5px] text-muted-foreground">
        Already verified? Just sign in. Otherwise create the account again to get a fresh link.
      </p>
    </AuthPanel>
  );
}
