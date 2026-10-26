"use client";

import { Component } from "react";
import { TriangleAlert } from "lucide-react";

import { Card } from "@/components/ui/card";

/**
 * One per section on the summary pages. A section whose data is missing or
 * malformed (a field the backend hasn't deployed yet, a null where a list was
 * expected) throws while rendering; this catches it and shows a small error
 * card in that section's place, so the rest of the page still renders.
 *
 * `resetKey` is the data's identity (e.g. the summary's generated_at): when a
 * fresh load arrives, a section that failed gets another try on its own.
 */
export class SectionBoundary extends Component<
  { name: string; resetKey?: string | number; children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(`[admin] "${this.props.name}" section failed to render:`, error);
  }

  componentDidUpdate(prev: { resetKey?: string | number }) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Card role="alert" className="gap-0 px-5 py-4">
        <div className="flex items-start gap-3">
          <TriangleAlert aria-hidden className="text-warning mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{this.props.name} couldn&apos;t be shown</div>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Its data is missing or not in the expected shape. The rest of the page is unaffected.
            </p>
            <p className="text-muted-foreground mt-1 font-mono text-xs break-words">{this.state.error.message}</p>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="bg-surface-2 hover:bg-brand-tint hover:text-brand min-h-9 shrink-0 rounded-full px-3 text-sm font-semibold focus-visible:shadow-[0_0_0_3px_var(--brand-tint)] focus-visible:outline-none"
          >
            Try again
          </button>
        </div>
      </Card>
    );
  }
}
