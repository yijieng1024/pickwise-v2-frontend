"use client";

import { useState } from "react";

import { avatarUrl } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  userId: string;
  username: string;
  /** Size + font-size come from the caller (e.g. "h-9 w-9 text-[13px]"). */
  className?: string;
}

/**
 * Circular user avatar. Renders the photo from the backend avatar gateway
 * (GET /auth/avatar/{id} — populated by upload or Google sign-in import),
 * layered over the username-initial fallback. The gateway 404s when no
 * avatar is set, which fires the image's onError and leaves the initial.
 */
export function UserAvatar({ userId, username, className }: UserAvatarProps) {
  const { avatarVersion } = useAuth();
  const src = `${avatarUrl(userId)}?v=${avatarVersion}`;
  // Tracks the exact URL that failed so a version bump retries automatically.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  return (
    <span
      className={cn(
        "relative flex flex-none items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand to-primary font-bold text-white",
        className,
      )}
    >
      {username.charAt(0).toUpperCase()}
      {failedSrc !== src && (
        // Plain <img>: the bytes come from our own API (no optimizer value),
        // and next/image would need the backend host allowlisted.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      )}
    </span>
  );
}
