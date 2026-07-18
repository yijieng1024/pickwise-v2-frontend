import { apiFetch } from "./client";
import type { BackendLaptop } from "./types";

/** The user's saved laptops as full backend records, newest saved first. */
export function listSavedLaptops(token: string) {
  return apiFetch<BackendLaptop[]>("/saved/", { token, cache: "no-store" });
}

/** Just the saved laptop ids — lightweight heart-state lookup. */
export function listSavedIds(token: string) {
  return apiFetch<string[]>("/saved/ids", { token, cache: "no-store" });
}

/** Idempotent: saving an already-saved laptop is a no-op (204 either way). */
export function saveLaptop(laptopId: string, token: string) {
  return apiFetch<void>(`/saved/${laptopId}`, { method: "PUT", token });
}

export function unsaveLaptop(laptopId: string, token: string) {
  return apiFetch<void>(`/saved/${laptopId}`, { method: "DELETE", token });
}
