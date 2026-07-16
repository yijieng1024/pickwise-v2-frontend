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
  birthday: string | null;
  gender: string | null;
  occupation: string | null;
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

/**
 * Payload for PUT /auth/me/profile. The backend applies partial updates
 * (`exclude_unset`), so send every field: an explicit null clears it.
 */
export interface ProfileUpdate {
  birthday: string | null;
  gender: "Male" | "Female" | "Other" | null;
  occupation: string | null;
}

export function updateProfile(
  token: string,
  update: ProfileUpdate,
): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/me/profile", {
    method: "PUT",
    token,
    body: JSON.stringify(update),
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
