import { API_BASE_URL } from "@/lib/api/client";

/**
 * Footer for the admin chrome. Deliberately not the storefront `Footer`: the
 * link columns there (Pages, About, Terms) are customer navigation, and "Back
 * to site" already has one home in the sidebar footer, so repeating it here
 * would just be a second control with the same job.
 *
 * What it does carry is the one fact worth having permanently on screen in a
 * portal that edits the live catalog: which backend this portal is pointed at.
 * A run of the scraper or the AI processor is expensive and hard to undo, so
 * "am I about to do this to production?" should be answerable without opening
 * devtools. Full URL on hover, host on screen.
 */
export function AdminFooter() {
  const apiHost = readHost(API_BASE_URL);

  return (
    <footer className="border-line text-muted-foreground flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3.5 text-xs">
      <span>&copy; {new Date().getFullYear()} PickWise · Admin Portal</span>
      {apiHost && (
        <span className="flex items-center gap-1.5">
          API
          <code className="bg-surface-2 rounded px-1.5 py-0.5 font-mono" title={API_BASE_URL}>
            {apiHost}
          </code>
        </span>
      )}
    </footer>
  );
}

/** Host only: the full base URL is long enough to wrap the row on a laptop. */
function readHost(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
