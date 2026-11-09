/**
 * Onboarding state kept in this browser only (decided 2026-11-09): the
 * one-time "send to the wizard" prompt, the banner dismissal, and the wizard
 * draft. All keyed by user id, so two accounts on one browser don't share
 * them. Storage can be unavailable (private mode, blocked site data); every
 * access is wrapped so that only means the prompt or draft is forgotten.
 */

const PROMPTED = "pickwise_wizard_prompted";
const BANNER = "pickwise_wizard_banner_dismissed";
const DRAFT = "pickwise_wizard_draft";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: nothing to remember it in.
  }
}

/**
 * True exactly once per user per browser: the first login that finds no saved
 * preferences. Records the prompt as it answers, so the caller just redirects.
 */
export function takeWizardPrompt(userId: string, hasPreferences: boolean | null): boolean {
  if (hasPreferences !== false) return false;
  const key = `${PROMPTED}:${userId}`;
  if (read(key)) return false;
  write(key, "1");
  return true;
}

export function isBannerDismissed(userId: string): boolean {
  return read(`${BANNER}:${userId}`) !== null;
}

export function dismissBanner(userId: string): void {
  write(`${BANNER}:${userId}`, "1");
}

/** Wizard answers in progress: option indexes per question id, and the step. */
export interface WizardDraft {
  step: number;
  selections: Record<string, number | number[]>;
}

export function loadDraft(userId: string): WizardDraft | null {
  const raw = read(`${DRAFT}:${userId}`);
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as WizardDraft;
    return typeof draft.step === "number" && draft.selections ? draft : null;
  } catch {
    return null;
  }
}

export function saveDraft(userId: string, draft: WizardDraft): void {
  write(`${DRAFT}:${userId}`, JSON.stringify(draft));
}

export function clearDraft(userId: string): void {
  write(`${DRAFT}:${userId}`, null);
}
