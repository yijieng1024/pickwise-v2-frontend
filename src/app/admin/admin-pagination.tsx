import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AdminPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  return (
    // A landmark, so the pager is reachable directly instead of only by
    // tabbing past a whole table. The label distinguishes it from the
    // portal's other navs (sidebar, breadcrumbs) in a landmark list.
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between text-[13px] text-muted-foreground"
    >
      {/* Paging swaps the rows above with no other cue that anything moved, so
          this range doubles as the announcement of where you landed. Live
          regions don't announce their initial content, only changes — which is
          exactly the wanted behaviour here. */}
      <span aria-live="polite" className="tabular-nums">
        {start}–{end} of {total}
      </span>
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft data-icon="inline-start" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight data-icon="inline-end" />
        </Button>
      </div>
    </nav>
  );
}
