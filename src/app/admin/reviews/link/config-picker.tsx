"use client";

import { useEffect, useState } from "react";
import { Info, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { type FamilyConfigs, getFamilyConfigs } from "@/lib/api/admin/review-links";
import { cn } from "@/lib/utils";

import { ConfigEvidencePanel } from "./config-evidence";

/**
 * Step 2 (optional): which configuration was tested?
 *
 * This step used to hand the human four rows and ask which one the reviewer
 * had, with nothing on the screen able to answer it. Three rules now govern it,
 * in the order they fire.
 *
 * 1. SOMETIMES THE QUESTION HAS NO ANSWER, and then it must not be asked.
 *    `separable: false` with code `ram_storage_only` means the members differ
 *    only in RAM and storage — no review states whether the unit had 32GB or
 *    64GB, and no conclusion in the video would change if it did. Presenting
 *    four options there does not merely inconvenience the human, it invites a
 *    guess, and a guessed laptop_id is strictly worse than a null one: null is
 *    honest and reads downstream as "configuration unknown", while a guess
 *    silently attaches this video's performance claims to a machine nobody
 *    tested.
 *
 * 2. WHERE IT IS ANSWERABLE, THE EVIDENCE COMES FIRST. The backend scans the
 *    description and transcript for spec strings belonging to this family's
 *    members. Reading that and then finding the row takes seconds; scanning
 *    rows and trying to recall a video takes minutes.
 *
 * 3. THE TABLE SHOWS ONLY WHAT DISTINGUISHES THE ROWS SHOWN. The columns are
 *    computed by the backend after suspended rows are dropped, so a column that
 *    only looked discriminating because of a placeholder row is already gone.
 *    Do not add columns back "for completeness".
 *
 * "Not stated / can't tell" is the DEFAULT and is a real radio option, not a
 * button: the link already exists without a laptop_id the moment the family was
 * picked, so doing nothing here already means "configuration unknown".
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
  reviewId,
  videoUrl,
  selectedLaptopId,
  onPick,
  error,
  busy,
}: {
  token: string;
  familyId: string;
  /** Scopes the evidence scan to this video. */
  reviewId: string;
  videoUrl: string;
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
  // Only reachable when the family is NOT separable and the evidence found
  // something decisive anyway. See the override block below.
  const [overrideUnseparable, setOverrideUnseparable] = useState(false);

  // Drop stale data when the family or review changes — the "adjust state
  // during render" pattern the other admin screens use, not an effect. Doing it
  // inside the effect would cascade a render before the fetch even starts, and
  // leaving it out would show the previous family's table under the new
  // family's heading for the length of a round trip.
  const key = `${familyId}:${reviewId}`;
  const [prevKey, setPrevKey] = useState(key);
  if (key !== prevKey) {
    setPrevKey(key);
    setData(null);
    setFailure(null);
    setOverrideUnseparable(false);
  }

  useEffect(() => {
    let alive = true;
    getFamilyConfigs(token, familyId, reviewId)
      .then((res) => {
        if (!alive) return;
        setData(res);
        setFailure(null);
      })
      .catch((e) => {
        if (alive) {
          setFailure(
            e instanceof ApiError ? e.message : "Could not load configurations.",
          );
        }
      });
    return () => {
      alive = false;
    };
  }, [token, familyId, reviewId]);

  if (failure) return <p className="text-negative py-2 text-sm">{failure}</p>;
  if (!data) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
        <Loader2 className="size-4 motion-safe:animate-spin" />
        Reading the description and transcript…
      </div>
    );
  }

  const evidence = data.evidence;
  // A hit that narrows to a single row is the only kind that could answer a
  // RAM/storage-only family, and it is exactly what a pasted spec table
  // produces. Common on the Chinese-language channels.
  const decisiveHits = evidence?.hits.filter((h) => h.laptop_ids.length === 1) ?? [];
  const showTable = data.separable || overrideUnseparable;

  const selectedConfig = data.configs.find((c) => c.laptop_id === selectedLaptopId);
  const radioName = `config-${familyId}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-medium">
          If the video names a specific configuration, pick it — usually it doesn’t.
        </h3>
        {/* The current answer, in words, near the control. A highlighted row is
            indistinguishable from a hover or a zebra stripe; this is the only
            place the screen states outright what was just chosen. */}
        <p className="text-muted-foreground text-xs">
          Selected:{" "}
          <span className="text-foreground font-medium">
            {selectedConfig ? selectedConfig.label : "not specified"}
          </span>
        </p>
      </div>

      {error && (
        <p role="alert" className="text-negative text-xs">
          {error}
        </p>
      )}

      {evidence && <ConfigEvidencePanel evidence={evidence} videoUrl={videoUrl} />}

      {/* Rule 1: the question has no answer for this family. */}
      {!data.separable && (
        <div className="border-line flex flex-col gap-2 rounded-md border border-dashed px-3 py-2">
          <p className="text-muted-foreground flex items-start gap-2 text-xs">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <span>{data.separability_reason}</span>
          </p>
          {/* The one case where the rule bends, and only on evidence: if the
              description literally lists the RAM and storage, the discriminating
              information DOES exist for this video, and refusing to record it
              would be throwing away a real answer. Still a deliberate second
              action, never the default — the point of the rule is that the
              chooser must not appear unprompted. */}
          {!overrideUnseparable && decisiveHits.length > 0 && (
            <div className="flex flex-col items-start gap-1">
              <p className="text-muted-foreground text-xs">
                The video does name one, though.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOverrideUnseparable(true)}
              >
                Show configurations anyway
              </Button>
            </div>
          )}
        </div>
      )}

      {showTable && data.configs.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-muted-foreground">
              <tr>
                <th scope="col" className="w-8 px-3 py-2">
                  <span className="sr-only">Select</span>
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Configuration
                </th>
                {data.columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className="px-3 py-2 text-left font-medium whitespace-nowrap"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Default, and first, because it is the correct answer most of
                  the time. A real radio in the same group as the rest, so the
                  keyboard treats the whole thing as one control. */}
              <tr
                className={cn("border-t", selectedLaptopId === null && "bg-brand-tint/40")}
              >
                <td className="px-3 py-2">
                  <input
                    type="radio"
                    name={radioName}
                    id={`${radioName}-none`}
                    className="accent-brand size-4 align-middle"
                    checked={selectedLaptopId === null}
                    disabled={busy}
                    onChange={() => onPick(null)}
                  />
                </td>
                <td colSpan={data.columns.length + 1} className="px-3 py-2">
                  <label htmlFor={`${radioName}-none`} className="cursor-pointer">
                    <span className="font-medium">Not stated / can’t tell</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      leave it here and move on
                    </span>
                  </label>
                </td>
              </tr>
              {data.configs.map((config) => {
                const selected = config.laptop_id === selectedLaptopId;
                const id = `${radioName}-${config.laptop_id}`;
                const decisive = decisiveHits.some((h) =>
                  h.laptop_ids.includes(config.laptop_id),
                );
                return (
                  <tr
                    key={config.laptop_id}
                    className={cn("border-t", selected && "bg-brand-tint/40")}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="radio"
                        name={radioName}
                        id={id}
                        className="accent-brand size-4 align-middle"
                        checked={selected}
                        disabled={busy}
                        onChange={() => onPick(config.laptop_id)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <label htmlFor={id} className="flex cursor-pointer flex-col">
                        <span className="font-medium">{config.label}</span>
                        {/* The catalog name, under the label rather than
                            instead of it. The label is what tells the rows
                            apart at a glance; the name is what the link row
                            shows once this is picked, so having both here means
                            the human recognises their own choice afterwards
                            instead of matching a short label to a long name. */}
                        <span className="text-muted-foreground text-xs">
                          {config.product_name}
                        </span>
                        <span className="flex items-center gap-1.5">
                          {decisive && (
                            <Badge
                              variant="outline"
                              className="border-brand/40 text-brand mt-0.5 h-4 w-fit px-1 py-0 text-[10px] font-normal"
                            >
                              matches the video
                            </Badge>
                          )}
                          {config.indistinguishable && (
                            <Badge
                              variant="outline"
                              className="text-warning border-warning/40 mt-0.5 h-4 w-fit px-1 py-0 text-[10px] font-normal"
                            >
                              duplicate row
                            </Badge>
                          )}
                          {config.status !== "active" && (
                            <Badge
                              variant="outline"
                              className="mt-0.5 h-4 w-fit px-1 py-0 text-[10px] font-normal"
                            >
                              {config.status}
                            </Badge>
                          )}
                        </span>
                      </label>
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
      )}

      {/* Two identical radio options are a coin flip. Say so, rather than
          leaving the human to discover it by staring at two identical rows —
          and so the duplicate is visible as a catalog row to fix. */}
      {showTable && data.indistinguishable_count > 0 && (
        <p className="text-warning text-xs">
          {data.indistinguishable_count} rows are identical in every column shown
          — duplicate catalog entries. Picking between them is arbitrary; leave
          the configuration unset unless one of them is clearly the tested unit.
        </p>
      )}

      {/* Never silently: a row that was in yesterday's list needs its absence
          explained on the page, not in a commit message. */}
      {showTable && data.excluded_suspended > 0 && (
        <p className="text-muted-foreground text-xs">
          {data.excluded_suspended} suspended{" "}
          {data.excluded_suspended === 1 ? "configuration is" : "configurations are"}{" "}
          hidden — a suspended row is a listing on hold and usually carries
          placeholder specs.
        </p>
      )}
    </div>
  );
}
