"use client";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
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
 * avatar is set; base-ui's Avatar.Image only mounts once the image loads,
 * so the initial simply stays visible (and an avatarVersion bump retries).
 * The initial is a direct child rather than AvatarFallback so it inherits
 * the caller's font-size.
 */
export function UserAvatar({ userId, username, className }: UserAvatarProps) {
  const { avatarVersion } = useAuth();
  const src = `${avatarUrl(userId)}?v=${avatarVersion}`;

  return (
    <Avatar
      className={cn(
        "items-center justify-center overflow-hidden bg-gradient-to-br from-brand to-primary font-bold text-white after:hidden",
        className,
      )}
    >
      {username.charAt(0).toUpperCase()}
      <AvatarImage src={src} alt="" className="absolute inset-0" />
    </Avatar>
  );
}
