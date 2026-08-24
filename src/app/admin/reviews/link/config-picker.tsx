"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ApiError } from "@/lib/api/client";
import {
  type FamilyConfigs,
  getFamilyConfigs,
} from "@/lib/api/admin/review-links";
import { cn } from "@/lib/utils";

/**
 * Step 2 (optional): which configuration was tested?
 *
 * Only the columns that actually differ within THIS family are rendered — the
 * backend computes them. For a TUF F16 that is CPU/GPU/RAM; screen size,
 * weight and battery are identical across all fourteen rows and would be
 * fourteen identical columns of noise. Do not add columns back "for
 * completeness": comparing three fields instead of fifteen is the point.
 *
 * "Not stated / can't tell" is the DEFAULT STATE, not a button. Doing nothing
 * and moving to the next review already means "configuration unknown", because
 * the link was created without a laptop_id the moment the family was picked.
 * The row below is a reminder of where the human already stands, not an action
 * to take — making the honest and most common answer the path of least
 * resistance is deliberate.
 */

function renderValue(value: string | number | boolean | null): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export function ConfigPicker({
  token,
  familyId,
  selectedLaptopId,
  onPick,
  error,
  busy,
}: {
  token: string;
  familyId: string;
  /** The laptop on the current link, or null for the family-only default. */
  selectedLaptopId: string | null;
  onPick: (laptopId: string | null) => void;
  error?: string | null;
  busy?: boolean;
}) {
  // `null` is the loading state — the same shape the other admin screens use.
  // A separate `loading` boolean would have to be set synchronously inside the
  // effect, which cascades a render before the fetch even starts.
  const [data, setData] = useState<FamilyConfigs | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getFamilyConfigs(token, familyId)
      .then((res) => {
        if (!alive) return;
        setData(res);
        setFailure(null);
      })
      .catch((e) => {
        if (alive) setFailure(e instanceof ApiError ? e.message : "Could not load configurations.");
      });
    return () => {
      alive = false;
    };
  }, [token, familyId]);

  if (failure) return <p className="text-negative py-2 text-sm">{failure}</p>;
  if (!data) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
        <Loader2 className="size-4 motion-safe:animate-spin" />
        Loading configurations…
      </div>
    );
  }
  // One member, or members that differ in nothing we track: there is no choice
  // to present, and showing an empty table would imply the human missed one.
  if (data.member_count <= 1 || data.columns.length === 0) {
    return (
      <p className="text-muted-foreground py-2 text-sm">
        {data.member_count <= 1
          ? "This family has a single configuration — nothing to choose."
          : "These configurations are identical in every tracked spec — nothing to choose."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p role="alert" className="text-negative text-xs">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Configuration</th>
              {data.columns.map((column) => (
                <th key={column.key} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr
              className={cn(
                "border-t",
                selectedLaptopId === null && "bg-brand-tint/40",
              )}
            >
              <td colSpan={data.columns.length + 1} className="px-3 py-2">
                <button
                  type="button"
                  disabled={busy || selectedLaptopId === null}
                  onClick={() => onPick(null)}
                  className="text-left disabled:pointer-events-none"
                >
                  <span className="font-medium">Not stated / can’t tell</span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {selectedLaptopId === null
                      ? "current — leave it and move on"
                      : "click to clear the configuration"}
                  </span>
                </button>
              </td>
            </tr>
            {data.configs.map((config) => {
              const selected = config.laptop_id === selectedLaptopId;
              return (
                <tr
                  key={config.laptop_id}
                  className={cn("border-t", selected && "bg-brand-tint/40")}
                >
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onPick(config.laptop_id)}
                      className="flex flex-col text-left disabled:pointer-events-none disabled:opacity-50"
                    >
                      <span className="font-medium">{config.model_code || config.product_name}</span>
                      {config.status !== "active" && (
                        <Badge
                          variant="outline"
                          className="mt-0.5 h-4 w-fit px-1 py-0 text-[10px] font-normal"
                        >
                          {config.status}
                        </Badge>
                      )}
                    </button>
                  </td>
                  {data.columns.map((column) => (
                    <td
                      key={column.key}
                      className="text-muted-foreground px-3 py-2 whitespace-nowrap"
                    >
                      {renderValue(config.specs[column.key])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
