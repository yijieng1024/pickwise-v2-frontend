"use client";

import { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * The capture script an admin pastes into DevTools on an Acer product page.
 *
 * Why this exists rather than "just press Ctrl+S": Save Page writes the
 * *rendered* DOM, and Magento's gallery script deletes its own
 * `x-magento-init` block as soon as it runs — the block that holds the image
 * list. A Ctrl+S page therefore parses perfectly and arrives with 1–2 photos
 * instead of 9–13, with nothing on screen to say so. Re-fetching the page's
 * own URL returns the original response instead, and carries the WAF's
 * validated `_abck` cookie, which is what makes it work at all — the same
 * request from outside the browser is refused.
 *
 * It takes no URL list on purpose: an earlier version baked the outstanding
 * queue into the script, which meant re-copying it whenever the queue moved.
 * Acting on whatever page is open needs no editing and never goes stale. It
 * downloads rather than posting here because the API's CORS allowlist doesn't
 * include store.acer.com, so a direct POST would be blocked.
 */
const SNIPPET = `/* PickWise — save this Acer product page, photo gallery included.
   Open a product page, press F12 -> Console, paste this, press Enter. */
(async () => {
  const res = await fetch(location.href, { credentials: 'include' });
  const html = await res.text();

  if (!res.ok) {
    console.error('PickWise: the page returned HTTP ' + res.status + '.');
    return;
  }
  // The gallery block is the whole point — if it is missing this is not an
  // Acer product page, or it has not finished loading.
  if (!html.includes('mage/gallery/gallery')) {
    console.error('PickWise: no gallery data here. Open an Acer product page and let it load.');
    return;
  }

  const href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const a = document.createElement('a');
  a.href = href;
  a.download = (location.pathname.split('/').pop() || 'product') + '.html';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);

  console.log('PickWise: saved ' + a.download);
})();`;

export function ConsoleSnippetCard() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(SNIPPET);
      setCopied(true);
      toast.success("Script copied. Paste it into the browser console.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the script and copy it manually.");
    }
  }

  return (
    <Card className="gap-0 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight">
            <Terminal className="text-brand size-4" />
            Capture Script
          </h2>
          <p className="text-muted-foreground mt-1 text-[12.5px] leading-relaxed">
            Saves whichever product page you run it on, with its photo gallery intact. Copy it
            once — there is nothing to edit, so the same script keeps working for every page and
            for later refreshes.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
          {copied ? "Copied" : "Copy script"}
        </Button>
      </div>

      <ol className="text-muted-foreground mt-3 flex list-decimal flex-col gap-1 pl-4 text-[12.5px] leading-relaxed">
        <li>Open a product page from the list below and let it finish loading.</li>
        <li>
          Press <Kbd>F12</Kbd>, open the <strong className="font-semibold">Console</strong> tab.
        </li>
        <li>
          Paste and press <Kbd>Enter</Kbd> — the page downloads itself.
        </li>
        <li>Repeat on the next page, then drop the files on the left together.</li>
      </ol>

      <pre className="border-line bg-surface-2 mt-3 max-h-56 overflow-auto rounded-lg border p-3 text-[11.5px] leading-relaxed">
        <code>{SNIPPET}</code>
      </pre>

      <p className="text-muted-foreground mt-2.5 text-[12px] leading-snug">
        The console stays open as you browse, so it is paste-and-Enter per page. Saving with{" "}
        <strong className="font-semibold">Ctrl+S</strong> instead looks like it works — the specs
        come through — but the browser saves the page as displayed, by which point the photo list
        has already been cleared. Those uploads land with one or two images.
      </p>
    </Card>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="border-line bg-surface text-foreground rounded border px-1 py-0.5 font-mono text-[11px]">
      {children}
    </kbd>
  );
}
