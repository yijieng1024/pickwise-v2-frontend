import { API_BASE_URL, apiFetch } from "./client";

/** Mirrors the backend's `Token` schema (POST /auth/login). */
export interface AuthToken {
  access_token: string;
  token_type: string;
}

/** Mirrors the backend's `UserRead` schema (GET /auth/me/profile). */
export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  is_verified: boolean;
  created_at: string;
}

/**
 * OAuth2 password login. The backend's single `username` form field accepts
 * a username or an email, so callers pass whatever identifier the user typed.
 */
export function login(
  identifier: string,
  password: string,
): Promise<AuthToken> {
  return apiFetch<AuthToken>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: identifier, password }),
    next: { revalidate: 0 },
  });
}

/**
 * Registers a new account. The backend sends a verification email and blocks
 * login until the address is verified, so this does NOT log the user in.
 * Username must not contain `@`; password needs 8+ chars with an uppercase,
 * a lowercase and a number (server-validated).
 */
export function register(
  username: string,
  email: string,
  password: string,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
    next: { revalidate: 0 },
  });
}

/**
 * Confirms the address behind a registration. The token comes from the link
 * in the verification email and is valid for an hour; an expired or reused
 * one comes back as a 400.
 */
export function verifyEmail(token: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(
    `/auth/verify-email?token=${encodeURIComponent(token)}`,
    { next: { revalidate: 0 } },
  );
}

/**
 * Re-sends the verification link. Like forgotPassword, this always resolves
 * for a well-formed address: the backend answers identically whether the
 * account is unknown, already verified, a Google account or genuinely
 * re-sent, so the UI must not claim to know which happened.
 */
export function resendVerification(email: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
    next: { revalidate: 0 },
  });
}

/**
 * Starts a password reset. Always resolves for a well-formed address, whether
 * or not an account exists — the backend deliberately doesn't reveal which,
 * so the UI must not either.
 */
export function forgotPassword(email: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
    next: { revalidate: 0 },
  });
}

/** Completes the reset with the emailed token. Passwords need 8+ characters. */
export function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
    next: { revalidate: 0 },
  });
}

/**
 * Exchanges a Google ID token (obtained via Google Identity Services) for
 * our own JWT. The backend verifies it against the same OAuth client ID and
 * finds-or-creates the account, so no separate registration step is needed.
 */
export function googleLogin(idToken: string): Promise<AuthToken> {
  return apiFetch<AuthToken>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ id_token: idToken }),
    next: { revalidate: 0 },
  });
}

export function getProfile(token: string): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/me/profile", {
    token,
    next: { revalidate: 0 },
  });
}

/** Mirrors the backend's `UserPreferences` schema (GET /auth/me/preferences). */
export interface UserPreferences {
  /** RM range; a null max means no upper limit. */
  budget: { min?: number | null; max?: number | null } | null;
  purpose: string[] | null;
  /** PickScore factor weightings, 1-10 (e.g. { cpu: 9, price: 7 }). */
  priorities: Record<string, number> | null;
  screen_size: string[] | null;
  portability: string | null;
  brand_preferences: string[] | null;
  tech_savviness: string | null;
  /** When the answers were last saved; null with no saved answers. Response only. */
  updated_at?: string | null;
}

/**
 * True when any preference field is set — i.e. the needs wizard (or a chat
 * flow) has saved a record for this account.
 */
export function hasAnyPreferences(prefs: UserPreferences): boolean {
  return Boolean(
    prefs.budget ||
      prefs.purpose?.length ||
      Object.keys(prefs.priorities ?? {}).length ||
      prefs.screen_size?.length ||
      prefs.portability ||
      prefs.brand_preferences?.length ||
      prefs.tech_savviness,
  );
}

export function getPreferences(token: string): Promise<UserPreferences> {
  return apiFetch<UserPreferences>("/auth/me/preferences", {
    token,
    next: { revalidate: 0 },
  });
}

/**
 * Writes preference fields (partial — backend applies `exclude_unset`, so
 * omit fields you don't want to touch, e.g. tech_savviness from the wizard).
 */
export function updatePreferences(
  token: string,
  prefs: Partial<UserPreferences>,
): Promise<UserPreferences> {
  return apiFetch<UserPreferences>("/auth/me/preferences", {
    method: "PUT",
    token,
    body: JSON.stringify(prefs),
    next: { revalidate: 0 },
  });
}

/**
 * Public URL serving a user's avatar bytes from the backend gateway.
 * Responds 404 when the user has no avatar — callers need an error fallback.
 */
export function avatarUrl(userId: string): string {
  return `${API_BASE_URL}/auth/avatar/${userId}`;
}

/** Uploads/replaces the avatar (JPEG/PNG/WebP, max 2 MB, server-sniffed). */
export function uploadAvatar(
  token: string,
  file: File,
): Promise<{ message: string; avatar_url: string }> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<{ message: string; avatar_url: string }>("/auth/me/avatar", {
    method: "PUT",
    token,
    body: form,
    next: { revalidate: 0 },
  });
}

export function deleteAvatar(token: string): Promise<void> {
  return apiFetch<void>("/auth/me/avatar", {
    method: "DELETE",
    token,
    next: { revalidate: 0 },
  });
}

/**
 * Deletes the account and its data (DELETE /auth/me). The backend checks the
 * username too: wrong or missing is a 400, as is the last active admin.
 */
export function deleteAccount(token: string, username: string): Promise<void> {
  return apiFetch<void>("/auth/me", {
    method: "DELETE",
    token,
    body: JSON.stringify({ username }),
    next: { revalidate: 0 },
  });
}

/** Onboarding background answers (GET/PUT /auth/me/background). All optional. */
export type UserType = "student" | "working" | "buying_for_business" | "other";

export interface UserBackground {
  user_type: UserType | null;
  /** Only kept while user_type is "student"; the backend clears it otherwise. */
  field_of_study: string | null;
  current_laptop: string | null;
  change_reason: string | null;
}

export function getBackground(token: string): Promise<UserBackground> {
  return apiFetch<UserBackground>("/auth/me/background", {
    token,
    next: { revalidate: 0 },
  });
}

/** Partial: only the fields sent change; an explicit null clears one. */
export function updateBackground(
  token: string,
  update: Partial<UserBackground>,
): Promise<UserBackground> {
  return apiFetch<UserBackground>("/auth/me/background", {
    method: "PUT",
    token,
    body: JSON.stringify(update),
    next: { revalidate: 0 },
  });
}
