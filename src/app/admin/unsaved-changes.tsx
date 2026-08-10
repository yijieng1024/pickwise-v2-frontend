"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Reports whether a mounted form currently holds work a navigation would lose. */
type DirtyCheck = () => boolean;

type UnsavedChangesApi = {
  register: (isDirty: DirtyCheck) => () => void;
  /** For `<Link onNavigate>` — cancels the navigation when work is unsaved. */
  guardNavigate: (event: { preventDefault: () => void }, href: string) => void;
  /** For controls that navigate imperatively rather than through a link. */
  requestNavigate: (href: string) => void;
};

const UnsavedChangesContext = createContext<UnsavedChangesApi | null>(null);

/**
 * One confirmation shared by every way out of a half-finished form.
 *
 * `beforeunload` covers reloads and tab closes, but it is invisible to
 * client-side navigation — which is how an admin actually leaves a page, via
 * the sidebar or the breadcrumbs. Those route through `<Link onNavigate>`,
 * which fires only for same-origin SPA navigations and already excludes
 * modifier-clicks, new tabs, downloads and external URLs; intercepting raw
 * click events instead would mean re-deriving all of that by hand.
 *
 * Not covered: the browser's own Back button. `popstate` only arrives after
 * the entry is already popped, so blocking it means pushing a decoy history
 * entry — more damage than the problem is worth.
 */
export function UnsavedChangesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const checks = useRef(new Set<DirtyCheck>());
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const register = useCallback((isDirty: DirtyCheck) => {
    checks.current.add(isDirty);
    return () => {
      checks.current.delete(isDirty);
    };
  }, []);

  const hasUnsaved = useCallback(() => {
    for (const isDirty of checks.current) {
      if (isDirty()) return true;
    }
    return false;
  }, []);

  const guardNavigate = useCallback(
    (event: { preventDefault: () => void }, href: string) => {
      if (!hasUnsaved()) return;
      event.preventDefault();
      setPendingHref(href);
    },
    [hasUnsaved],
  );

  const requestNavigate = useCallback(
    (href: string) => {
      if (hasUnsaved()) setPendingHref(href);
      else router.push(href);
    },
    [hasUnsaved, router],
  );

  function discard() {
    const href = pendingHref;
    setPendingHref(null);
    // Pushing directly rather than re-entering the guard: this is the
    // confirmed answer to the question the guard just asked.
    if (href) router.push(href);
  }

  return (
    <UnsavedChangesContext.Provider
      value={{ register, guardNavigate, requestNavigate }}
    >
      {children}
      <AlertDialog
        open={pendingHref !== null}
        onOpenChange={(open) => !open && setPendingHref(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard your changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This form has edits that haven&apos;t been saved. Leaving now
              throws them away.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={discard}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </UnsavedChangesContext.Provider>
  );
}

/**
 * Registers a form's unsaved state for the duration it stays dirty, and warns
 * on reload/tab-close while it does. Unregisters on unmount, so a form that
 * navigates away after saving never blocks the navigation it just triggered.
 */
export function useUnsavedChanges(isDirty: boolean) {
  const ctx = useContext(UnsavedChangesContext);

  useEffect(() => {
    if (!ctx) return;
    // Re-registers whenever the flag flips, which keeps the check exact
    // without mutating a ref during render.
    return ctx.register(() => isDirty);
  }, [ctx, isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Older browsers only show the prompt when returnValue is set. The
      // wording is the browser's own — custom text is ignored.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);
}

/** Navigation that respects any unsaved work registered above it. */
export function useAdminNavigation(): Pick<
  UnsavedChangesApi,
  "guardNavigate" | "requestNavigate"
> {
  const ctx = useContext(UnsavedChangesContext);
  const router = useRouter();

  const fallbackNavigate = useCallback(
    (href: string) => router.push(href),
    [router],
  );
  const noop = useCallback(() => {}, []);

  // Rendered outside the provider there is nothing to guard, so navigate plainly
  // rather than throwing — these helpers are used by shared chrome.
  return ctx ?? { guardNavigate: noop, requestNavigate: fallbackNavigate };
}
