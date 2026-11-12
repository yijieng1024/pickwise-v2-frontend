"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { getBackground } from "@/lib/api/auth";
import {
  configureLaptop,
  getEduPrice,
  getLaptopOptions,
  type Configured,
  type EduPrice,
  type LaptopOptions,
  type Picks,
} from "@/lib/api/options";
import { useAuth } from "@/lib/auth-context";
import { cleanConfigSearch } from "@/lib/config-url";

export type ConfigView = "original" | "configured";

/** The Edu toggle's remembered choice: this browser only (decided 2026-11-10). */
const EDU_KEY = "pickwise_edu_price";

function storedEduChoice(): boolean | null {
  try {
    const value = localStorage.getItem(EDU_KEY);
    return value === "on" ? true : value === "off" ? false : null;
  } catch {
    return null; // on the server, or storage unavailable: no remembered choice
  }
}

/** One applied configuration, priced by whichever store has been asked for it so far. */
interface AppliedState {
  picks: Picks;
  official: Configured | null;
  edu: Configured | null;
  /** The education store has no price for these picks. */
  eduMissing: boolean;
  /** `official` came from the server, which has no sign-in: the caller's own score is still to fetch. */
  needsPersonal: boolean;
}

/** What the server read from the page's URL (lib/config-url.ts, `readConfigLink`). */
export interface ConfigLinkState {
  /** The configuration the link asked for, already priced by /configure on the server. */
  applied: { picks: Picks; result: Configured } | null;
  /** The address the page should have; null: leave the address as it is. */
  path: string | null;
  /** One line when an option in the link was not available; else null. */
  notice: string | null;
}

interface ConfiguratorState {
  laptopId: string;
  /** null: not an Apple standard config with options; no configurator renders. */
  options: LaptopOptions | null;
  /** The configuration the user applied with "Done", if any, at the price shown. */
  applied: { picks: Picks; result: Configured } | null;
  view: ConfigView;
  setView: (view: ConfigView) => void;
  editorOpen: boolean;
  setEditorOpen: (open: boolean) => void;
  apply: (picks: Picks, result: Configured) => void;
  /** The laptop's education price (step 10d); null: it has none, so no toggle. */
  edu: EduPrice | null;
  eduOn: boolean;
  setEduOn: (on: boolean) => void;
  /** The toggle is on and the laptop has an education price. */
  eduActive: boolean;
  /** Education prices are on but the applied configuration has none. */
  eduMissing: boolean;
  /** What the editor prices from: the education store's kits while that is on. */
  editorOptions: LaptopOptions | null;
  editorEdu: boolean;
  /** One line about the link the page was opened with, until a configuration is applied. */
  notice: string | null;
}

const Ctx = createContext<ConfiguratorState | null>(null);

/**
 * Shared by the detail page's hero (price, ring, toggles) and the Pick Score tile: they
 * all switch between the catalog laptop ("Original") and the user's build ("Configured"),
 * and between the official price and the education price. A configured machine is never
 * a catalog laptop; nothing here is persisted except the Edu toggle's choice.
 *
 * The education price exists on this page only. Everything fetched for it is client-side
 * and best-effort: a failure means no toggle, never a broken page.
 *
 * A link with a configuration (plan step 10d+) arrives as `link`: the server has already
 * read the URL and priced the picks, so the page is rendered in the "Configured" view
 * from the first byte. The browser then only tidies the address, with replace, and
 * fetches what the server could not know: the caller's own score, and the Edu price.
 * "Done" does not write the URL yet.
 */
export function ConfiguratorProvider({
  laptopId,
  options,
  link,
  children,
}: {
  laptopId: string;
  options: LaptopOptions | null;
  link?: ConfigLinkState;
  children: ReactNode;
}) {
  const { user, token, isLoading, hasPreferences } = useAuth();
  const [state, setState] = useState<AppliedState | null>(() =>
    link?.applied
      ? { picks: link.applied.picks, official: link.applied.result, edu: null, eduMissing: false, needsPersonal: true }
      : null,
  );
  const [view, setView] = useState<ConfigView>(link?.applied ? "configured" : "original");
  const [notice, setNotice] = useState<string | null>(link?.notice ?? null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [edu, setEdu] = useState<EduPrice | null>(null);
  const [eduOptions, setEduOptions] = useState<LaptopOptions | null>(null);
  // Read once on the client. Safe at hydration: nothing renders from it until the
  // education price has been fetched.
  const [choice, setChoice] = useState<boolean | null>(storedEduChoice);
  const [student, setStudent] = useState(false);

  // Default: on for a student, off otherwise and when signed out; the user's own choice wins.
  const eduOn = choice ?? (student && Boolean(user));
  const eduActive = eduOn && edu !== null;
  const hasEdu = edu !== null;

  // With the token when there is one: the personalized score is then at the Edu price too.
  useEffect(() => {
    if (isLoading) return;
    let cancelled = false;
    getEduPrice(laptopId, token)
      .then((e) => !cancelled && setEdu(e))
      .catch(() => !cancelled && setEdu(null));
    return () => {
      cancelled = true;
    };
  }, [laptopId, token, isLoading]);

  useEffect(() => {
    if (!token || choice !== null) return;
    let cancelled = false;
    getBackground(token)
      .then((b) => !cancelled && setStudent(b.user_type === "student"))
      .catch(() => {
        // No default then: the toggle stays off until the user switches it.
      });
    return () => {
      cancelled = true;
    };
  }, [token, choice]);

  useEffect(() => {
    if (!options || !hasEdu) return;
    let cancelled = false;
    getLaptopOptions(laptopId, true)
      .then((o) => !cancelled && setEduOptions(o))
      .catch(() => {
        // The configurator then stays on official prices.
      });
    return () => {
      cancelled = true;
    };
  }, [laptopId, options, hasEdu]);

  // The address says exactly what the page shows: a param that was dropped, or picks that
  // are the standard config's own, leave it. Replace, not a redirect, so the notice stays.
  const linkPath = link?.path ?? null;
  useEffect(() => {
    if (linkPath === null) return;
    const search = cleanConfigSearch(window.location.search, linkPath);
    if (search !== window.location.search) {
      window.history.replaceState(null, "", window.location.pathname + search + window.location.hash);
    }
  }, [linkPath]);

  // A configuration priced by the server has no personalized score: fetch it once for a
  // signed-in user with wizard answers, as the original view's ring does.
  useEffect(() => {
    if (!state?.needsPersonal || !token || hasPreferences !== true) return;
    let cancelled = false;
    const picks = state.picks;
    configureLaptop(laptopId, picks, token)
      .then((r) => {
        if (!cancelled) setState((s) => (s && s.picks === picks ? { ...s, official: r, needsPersonal: false } : s));
      })
      .catch(() => {
        // Best-effort: the general scores stay.
      });
    return () => {
      cancelled = true;
    };
  }, [state, token, hasPreferences, laptopId]);

  // The applied configuration at the other store's price, the first time it is shown.
  useEffect(() => {
    if (!state || isLoading) return;
    const want = eduActive ? "edu" : "official";
    if (state[want] || (want === "edu" && state.eduMissing)) return;
    let cancelled = false;
    const picks = state.picks;
    const same = (s: AppliedState | null) => s !== null && s.picks === picks;
    configureLaptop(laptopId, picks, token, want === "edu")
      .then((r) => !cancelled && setState((s) => (same(s) ? { ...s!, [want]: r } : s)))
      .catch(() => {
        if (!cancelled && want === "edu") setState((s) => (same(s) ? { ...s!, eduMissing: true } : s));
      });
    return () => {
      cancelled = true;
    };
  }, [state, eduActive, laptopId, token, isLoading]);

  const apply = (picks: Picks, result: Configured) => {
    setState({
      picks,
      official: result.edu ? null : result,
      edu: result.edu ? result : null,
      eduMissing: false,
      needsPersonal: false,
    });
    setNotice(null);
    setView("configured");
    setEditorOpen(false);
  };

  const setEduOn = (on: boolean) => {
    setChoice(on);
    try {
      localStorage.setItem(EDU_KEY, on ? "on" : "off");
    } catch {
      // Storage unavailable: the choice lasts for this page only.
    }
  };

  // Until the wanted store answers, the other store's result is shown; it says which it is.
  const result = state && (eduActive ? (state.edu ?? state.official) : (state.official ?? state.edu));
  const applied = state && result ? { picks: state.picks, result } : null;
  const editorEdu = eduActive && eduOptions !== null;

  return (
    <Ctx.Provider
      value={{
        laptopId,
        options,
        applied,
        view,
        setView,
        editorOpen,
        setEditorOpen,
        apply,
        edu,
        eduOn,
        setEduOn,
        eduActive,
        eduMissing: eduActive && Boolean(state?.eduMissing),
        editorOptions: editorEdu ? eduOptions : options,
        editorEdu,
        notice,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useConfigurator(): ConfiguratorState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConfigurator outside ConfiguratorProvider");
  return ctx;
}

/** The applied configuration, only while the "Configured" view is on. */
export function useConfiguredView(): Configured | null {
  const { applied, view } = useConfigurator();
  return view === "configured" && applied ? applied.result : null;
}

/** The catalog laptop at its education price: the toggle is on and no configuration is shown. */
export function useEduView(): EduPrice | null {
  const { edu, eduActive, applied, view } = useConfigurator();
  return eduActive && !(view === "configured" && applied) ? edu : null;
}
