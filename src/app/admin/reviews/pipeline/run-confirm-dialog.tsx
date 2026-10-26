"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export interface CostRow {
  label: string;
  value: string;
  /** Marks a row the admin should read twice (e.g. over the daily cap). */
  warn?: boolean;
}

/**
 * The confirmation every run button shows before it starts a job: what it
 * does, and what it costs, computed from the live pipeline status. Modelled
 * on docs/admin-redesign/ConfirmIngest.dc.html.
 */
export function RunConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  rows,
  batch,
  extra,
  confirmLabel,
  onConfirm,
  starting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  rows: CostRow[];
  /** A batch-size input, when the run takes one. */
  batch?: { label: string; value: number; min: number; max: number; onChange: (value: number) => void };
  /** Further controls (e.g. a checkbox) under the batch input. */
  extra?: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  starting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {batch && (
          <div className="flex items-center gap-3">
            <Label htmlFor="run-batch" className="text-sm">
              {batch.label}
            </Label>
            <Input
              id="run-batch"
              type="number"
              inputMode="numeric"
              min={batch.min}
              max={batch.max}
              value={batch.value}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n)) batch.onChange(Math.min(batch.max, Math.max(batch.min, Math.round(n))));
              }}
              className="w-24 tabular-nums"
            />
            <span className="text-muted-foreground text-xs">
              {batch.min}–{batch.max}
            </span>
          </div>
        )}
        {extra}

        <table className="w-full border-collapse text-sm">
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="border-line border-b py-2.5 pr-3">{r.label}</td>
                <td
                  className={`border-line border-b py-2.5 text-right font-semibold tabular-nums ${r.warn ? "text-negative" : ""}`}
                >
                  {r.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={starting}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={starting}>
            {starting && <Spinner data-icon="inline-start" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
