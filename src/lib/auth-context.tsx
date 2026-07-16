"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  type AuthUser,
  getPreferences,
  getProfile,
  googleLogin,
  hasAnyPreferences,
  login as apiLogin,
} from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

const TOKEN_KEY = "pickwise_token";

interface AuthContextValue {
  /** Profile of the signed-in user, or null when signed out. */
  user: AuthUser | null;
  /** Bearer token for authenticated API calls (e.g. POST /agent/chat). */
  token: string | null;
  /** True while the stored token is being validated on first load. */
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  /** Completes Sign in with Google given the GIS credential (ID token). */
  loginWithGoogle: (idToken: string) => Promise<void>;
  /** Replaces the cached profile after a server-confirmed update. */
  updateUser: (user: AuthUser) => void;
  /**
   * Whether the account has saved needs-wizard preferences. `null` while
   * signed out or until the check resolves; drives the "Needs Wizard" nav
   * entry, which hides once preferences exist.
   */
  hasPreferences: boolean | null;
  /** Flips `hasPreferences` on after the wizard saves successfully. */
  markPreferencesSaved: () => void;
  /**
   * Bumped after an avatar upload/removal; appended to the avatar URL as a
   * query param so the browser re-fetches past the gateway's 5-min cache.
   */
  avatarVersion: number;
  bumpAvatarVersion: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore the session from localStorage: the token is only trusted once
  // the profile fetch confirms it. A 401 means expired/revoked — drop it;
  // other failures (network, cold backend) keep it for the next visit.
  useEffect(() => {
    let cancelled = false;
    const stored = localStorage.getItem(TOKEN_KEY);
    const restore = stored
      ? getProfile(stored)
          .then((profile) => {
            if (cancelled) return;
            setToken(stored);
            setUser(profile);
          })
          .catch((err) => {
            if (err instanceof ApiError && err.status === 401) {
              localStorage.removeItem(TOKEN_KEY);
            }
          })
      : Promise.resolve();
    restore.finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Shared tail of every login flow: trust the token only once the profile
  // fetch succeeds, then persist it.
  const completeLogin = useCallback(async (accessToken: string) => {
    const profile = await getProfile(accessToken);
    localStorage.setItem(TOKEN_KEY, accessToken);
    setToken(accessToken);
    setUser(profile);
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const { access_token } = await apiLogin(identifier, password);
      await completeLogin(access_token);
    },
    [completeLogin],
  );

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      const { access_token } = await googleLogin(idToken);
      await completeLogin(access_token);
    },
    [completeLogin],
  );

  const updateUser = useCallback((next: AuthUser) => setUser(next), []);

  // Checked once per session whenever a token lands (restore or login);
  // logout resets it below. A failed check stays null — treated as "not
  // confirmed saved", so the wizard nav entry keeps showing.
  const [hasPreferences, setHasPreferences] = useState<boolean | null>(null);
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getPreferences(token)
      .then((prefs) => {
        if (!cancelled) setHasPreferences(hasAnyPreferences(prefs));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);
  const markPreferencesSaved = useCallback(() => setHasPreferences(true), []);

  const [avatarVersion, setAvatarVersion] = useState(0);
  const bumpAvatarVersion = useCallback(
    () => setAvatarVersion((v) => v + 1),
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setHasPreferences(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        loginWithGoogle,
        updateUser,
        hasPreferences,
        markPreferencesSaved,
        avatarVersion,
        bumpAvatarVersion,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
