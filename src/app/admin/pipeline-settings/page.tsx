"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CircleAlert } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { type Job, listJobs, pipelineRunSummary } from "@/lib/api/admin/jobs";
import {
  PIPELINE_WEEKDAYS,
  type PipelineSettings,
  type PipelineSettingsUpdate,
  getPipelineSettings,
  updatePipelineSettings,
} from "@/lib/api/admin/settings";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

import { AdminErrorState, AdminLoadingState } from "../admin-states";
import { AdminPageHeader } from "../admin-page-header";
import { useUnsavedChanges } from "../unsaved-changes";

type Draft = Omit<PipelineSettings, "updated_at">;

const BRANDS: { key: "asus_enabled" | "rog_enabled" | "hp_enabled"; label: string }[] = [
  { key: "asus_enabled", label: "ASUS (www.asus.com)" },
  { key: "rog_enabled", label: "ROG (rog.asus.com)" },
  { key: "hp_enabled", label: "HP" },
];

const WEEKDAY_ITEMS = PIPELINE_WEEKDAYS.map((d) => ({ value: d, label: d[0].toUpperCase() + d.slice(1) }));

function toDraft(s: PipelineSettings): Draft {
  const { updated_at: _ignored, ...draft } = s;
  void _ignored;
  return draft;
}

export default function AdminPipelineSettingsPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<PipelineSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [lastRun, setLastRun] = useState<Job | null | undefined>(undefined);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getPipelineSettings(token)
      .then((res) => {
        if (!cancelled) setSettings(res);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Failed to load the pipeline settings.");
      });
    listJobs(token, { jobType: "pipeline.weekly", limit: 1 })
      .then((res) => {
        if (!cancelled) setLastRun(res.items[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setLastRun(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token, reloadTick]);

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Weekly Pipeline"
        description="The weekly run that crawls, scrapes and processes the sites switched on below, applies the latest price guides, refreshes PassMark, and emails a summary. Changes apply to the next run, with no redeploy."
      />

      {loadError ? (
        <Card className="gap-0 p-4">
          <AdminErrorState
            message={loadError}
            onRetry={() => {
              setLoadError(null);
              setReloadTick((t) => t + 1);
            }}
          />
        </Card>
      ) : settings === null ? (
        <Card className="gap-0 p-4">
          <AdminLoadingState />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SettingsCard settings={settings} token={token} onSaved={setSettings} />
          <LastRunCard job={lastRun} />
        </div>
      )}
    </div>
  );
}

function SettingsCard({
  settings,
  token,
  onSaved,
}: {
  settings: PipelineSettings;
  token: string | null;
  onSaved: (s: PipelineSettings) => void;
}) {
  const current = useMemo(() => toDraft(settings), [settings]);
  const [draft, setDraft] = useState<Draft>(current);
  const [threshold, setThreshold] = useState(String(current.price_jump_percent));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // A save replaces `settings`: start the draft over from what the backend stored.
  const [prevSettings, setPrevSettings] = useState(settings);
  if (settings !== prevSettings) {
    setPrevSettings(settings);
    setDraft(current);
    setThreshold(String(current.price_jump_percent));
  }

  const changes: PipelineSettingsUpdate = {};
  for (const key of Object.keys(current) as (keyof Draft)[]) {
    if (key !== "price_jump_percent" && draft[key] !== current[key]) {
      (changes as Record<string, unknown>)[key] = draft[key];
    }
  }
  // Sent as typed: the backend rejects anything outside 1 to 100, and says so.
  if (threshold !== String(current.price_jump_percent)) changes.price_jump_percent = Number(threshold);
  const dirty = Object.keys(changes).length > 0;
  useUnsavedChanges(dirty);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaveError(null);
  }

  async function save() {
    if (!token) return;
    setSaving(true);
    setSaveError(null);
    try {
      onSaved(await updatePipelineSettings(token, changes));
      toast.success("Pipeline settings saved.");
    } catch (err) {
      // The backend's 422 names what is wrong; show it verbatim.
      setSaveError(err instanceof ApiError ? err.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground mt-0.5 text-[12.5px]">
            Secrets (database URL, API keys) are kept in GitHub, not here.
          </p>
        </div>
        <Badge className={settings.enabled ? "bg-positive/10 text-positive" : "bg-warning/10 text-warning"}>
          {settings.enabled ? "On" : "Off"}
        </Badge>
      </div>

      <section className="flex flex-col gap-1.5">
        <label className="flex items-center gap-2 text-[12.5px] font-medium">
          <Checkbox checked={draft.enabled} disabled={saving} onCheckedChange={(c) => set("enabled", c === true)} />
          Run the pipeline every week
        </label>
        <p className="text-muted-foreground text-[12px]">Runs at 03:00 Malaysia time on the chosen day.</p>
      </section>

      <section className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-medium">Day</span>
        <Select
          items={WEEKDAY_ITEMS}
          value={draft.weekday}
          onValueChange={(v) => v && set("weekday", v as string)}
          disabled={saving}
        >
          <SelectTrigger className="w-full" aria-label="Day of the week">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {WEEKDAY_ITEMS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </section>

      <section className="flex flex-col gap-1.5">
        <label htmlFor="report-email" className="text-[12.5px] font-medium">
          Report email
        </label>
        <Input
          id="report-email"
          type="email"
          value={draft.report_email}
          disabled={saving}
          placeholder="Empty: no summary email"
          onChange={(e) => set("report_email", e.target.value)}
        />
        <p className="text-muted-foreground text-[12px]">The summary of every run is sent here. Leave empty to send none.</p>
      </section>

      <section className="flex flex-col gap-1.5">
        <label htmlFor="price-jump" className="text-[12.5px] font-medium">
          Price jump threshold (%)
        </label>
        <Input
          id="price-jump"
          type="number"
          min={1}
          max={100}
          value={threshold}
          disabled={saving}
          className="w-32"
          onChange={(e) => {
            setThreshold(e.target.value);
            setSaveError(null);
          }}
        />
        <p className="text-muted-foreground text-[12px]">
          Price changes this large or larger are flagged at the top of the email. 1 to 100.
        </p>
      </section>

      <section className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-medium">Sites</span>
        {BRANDS.map((b) => (
          <label key={b.key} className="flex items-center gap-2 text-[12.5px]">
            <Checkbox checked={draft[b.key]} disabled={saving} onCheckedChange={(c) => set(b.key, c === true)} />
            {b.label}
          </label>
        ))}
        <p className="text-muted-foreground text-[12px]">Apple and Acer are updated by hand.</p>
      </section>

      {saveError && (
        <Alert variant="error">
          <CircleAlert />
          <AlertTitle>Not saved</AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {dirty && (
        <div className="border-line flex items-center justify-end gap-2 border-t pt-3">
          <span className="text-muted-foreground mr-auto text-[12px]">Unsaved changes</span>
          <Button
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => {
              setDraft(current);
              setThreshold(String(current.price_jump_percent));
              setSaveError(null);
            }}
          >
            Discard
          </Button>
          <Button size="sm" disabled={saving} onClick={() => void save()}>
            {saving && <Spinner data-icon="inline-start" />}
            Save
          </Button>
        </div>
      )}
    </Card>
  );
}

function LastRunCard({ job }: { job: Job | null | undefined }) {
  const run = job ? pipelineRunSummary(job) : null;
  return (
    <Card className="gap-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-sm font-bold tracking-tight">Last run</h2>
        <Link href="/admin/jobs" className="text-[12.5px] underline-offset-2 hover:underline">
          All jobs
        </Link>
      </div>
      {job === undefined ? (
        <AdminLoadingState />
      ) : job === null || run === null ? (
        <p className="text-muted-foreground text-[12.5px]">No run yet.</p>
      ) : (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[12.5px]">
          <dt className="text-muted-foreground">When</dt>
          <dd>
            <Link href={`/admin/jobs/${job.id}`} className="underline-offset-2 hover:underline">
              {run.when}
            </Link>
          </dd>
          <dt className="text-muted-foreground">Started</dt>
          <dd>{run.startedBy}</dd>
          <dt className="text-muted-foreground">Status</dt>
          <dd>{run.status}</dd>
        </dl>
      )}
    </Card>
  );
}
