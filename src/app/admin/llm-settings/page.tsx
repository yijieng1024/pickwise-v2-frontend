"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  Info,
  RefreshCw,
  RotateCcw,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  type AvailableModel,
  type AvailableModels,
  type LLMSettings,
  type LLMSettingSource,
  type LLMUse,
  type LLMUseName,
  type LLMUseUpdate,
  getLLMModels,
  getLLMSettings,
  updateLLMUse,
} from "@/lib/api/admin/settings";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

import { AdminErrorState, AdminLoadingState } from "../admin-states";
import { AdminPageHeader } from "../admin-page-header";
import { useUnsavedChanges } from "../unsaved-changes";

const USE_INFO: Record<LLMUseName, { label: string; description: string }> = {
  agent: {
    label: "Chatbot (Pico)",
    description: "Every chat turn. A user is waiting on the reply.",
  },
  review_processor: {
    label: "Review processing",
    description: "Summarises YouTube review chunks. Background admin job.",
  },
  processor: {
    label: "AI Clean-up",
    description:
      "Extracts and tags catalog records. Background job; only models with a rate-limit budget are accepted.",
  },
};

export default function AdminLLMSettingsPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<LLMSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [models, setModels] = useState<AvailableModels | null>(null);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [refreshingModels, setRefreshingModels] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getLLMSettings(token)
      .then((res) => {
        if (!cancelled) setSettings(res);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiError ? err.message : "Failed to load LLM settings.");
      });
    getLLMModels(token)
      .then((res) => {
        if (!cancelled) setModels(res);
      })
      .catch((err) => {
        if (!cancelled) setModelsError(err instanceof ApiError ? err.message : "Failed to load the model list.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, reloadTick]);

  async function refreshModels() {
    if (!token) return;
    setRefreshingModels(true);
    try {
      setModels(await getLLMModels(token, true));
      setModelsError(null);
    } catch (err) {
      setModelsError(err instanceof ApiError ? err.message : "Failed to refresh the model list.");
    } finally {
      setRefreshingModels(false);
    }
  }

  /**
   * After a save: swap in the returned use straight away, then re-read the
   * whole page in the background, since the warnings and the model list's
   * "configured for" tags depend on every use, not just the one saved.
   */
  const onSaved = useCallback(
    (updated: LLMUse) => {
      setSettings((s) => s && { ...s, uses: s.uses.map((u) => (u.use === updated.use ? updated : u)) });
      if (!token) return;
      getLLMSettings(token).then(setSettings).catch(() => {});
      getLLMModels(token).then(setModels).catch(() => {});
    },
    [token],
  );

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="LLM Settings"
        description="Which model answers each feature, and the backups tried in order when it is rate-limited, times out or errors. Changes apply to the next call, with no redeploy."
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
        <>
          {settings.warnings.length > 0 && (
            <Alert variant="warning">
              <TriangleAlert />
              <AlertTitle>
                {settings.warnings.length} problem{settings.warnings.length === 1 ? "" : "s"} with the current
                settings
              </AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {settings.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {settings.model_list_error && (
            <Alert variant="warning">
              <CircleAlert />
              <AlertTitle>Couldn&apos;t check models against Gemini&apos;s list</AlertTitle>
              <AlertDescription>
                {settings.model_list_error}. Retired or misspelled models can&apos;t be flagged until the list loads
                again; saving still works.
              </AlertDescription>
            </Alert>
          )}

          <ModelListCard
            models={models}
            error={modelsError}
            refreshing={refreshingModels}
            onRefresh={() => void refreshModels()}
          />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {settings.uses.map((u) => (
              <UseCard key={u.use} use={u} models={models?.models ?? []} token={token} onSaved={onSaved} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Model list
// ---------------------------------------------------------------------------

function ModelListCard({
  models,
  error,
  refreshing,
  onRefresh,
}: {
  models: AvailableModels | null;
  error: string | null;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <Card className="gap-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight">Available models</h2>
          <p className="text-muted-foreground mt-0.5 text-[12.5px]">
            {models
              ? `${models.models.length} models from Gemini · fetched ${formatDateTime(models.fetched_at)}`
              : error
                ? "The model list could not be loaded."
                : "Loading the model list…"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? <Spinner data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}
          Refresh model list
        </Button>
      </div>

      {error && (
        <Alert variant="error">
          <CircleAlert />
          <AlertTitle>Model list unavailable</AlertTitle>
          <AlertDescription>
            {error} The dropdowns only offer the models already configured until it loads.
          </AlertDescription>
        </Alert>
      )}

      {models && (
        <>
          <p className="text-muted-foreground flex gap-1.5 text-[12.5px] leading-relaxed">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            {models.note}
          </p>
          {models.configured_missing.length > 0 && (
            <p className="text-warning text-[12.5px] leading-relaxed">
              Configured but not in the list (retired, or a typo): {models.configured_missing.join("; ")}
            </p>
          )}
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// One use
// ---------------------------------------------------------------------------

interface ModelItem {
  value: string;
  label: string;
}

function UseCard({
  use,
  models,
  token,
  onSaved,
}: {
  use: LLMUse;
  models: AvailableModel[];
  token: string | null;
  onSaved: (u: LLMUse) => void;
}) {
  const info = USE_INFO[use.use] ?? { label: use.use, description: "" };
  const current = useMemo(
    () => ({ primary: use.primary.value, backups: use.backups.map((b) => b.value) }),
    [use],
  );

  const [primary, setPrimary] = useState(current.primary);
  const [backups, setBackups] = useState(current.backups);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);

  // A save (or the background re-read after one) replaces `use`: start the
  // draft over from what the backend now says is in effect.
  const [prevUse, setPrevUse] = useState(use);
  if (use !== prevUse) {
    setPrevUse(use);
    setPrimary(current.primary);
    setBackups(current.backups);
  }

  const primaryDirty = primary !== current.primary;
  const backupsDirty = backups.join("\n") !== current.backups.join("\n");
  const dirty = primaryDirty || backupsDirty;
  useUnsavedChanges(dirty);

  const bySpec = useMemo(() => new Map(models.map((m) => [m.spec, m])), [models]);
  const label = (spec: string) => bySpec.get(spec)?.display_name ?? modelId(spec);

  // Everything in the list, plus anything configured that the list lacks, so
  // a retired model still renders instead of an empty trigger.
  const items: ModelItem[] = useMemo(() => {
    const out = models.map((m) => ({ value: m.spec, label: m.display_name }));
    for (const spec of [current.primary, ...current.backups, primary, ...backups]) {
      if (!out.some((o) => o.value === spec)) out.push({ value: spec, label: modelId(spec) });
    }
    return out;
  }, [models, current, primary, backups]);

  const addable = items.filter((i) => i.value !== primary && !backups.includes(i.value));
  const atCap = use.max_backups !== null && backups.length >= use.max_backups;

  function choosePrimary(spec: string) {
    setPrimary(spec);
    // A model cannot back itself up: promoting a backup takes it off the list.
    setBackups((b) => b.filter((x) => x !== spec));
    setSaveError(null);
  }

  function move(i: number, delta: -1 | 1) {
    setBackups((b) => {
      const next = [...b];
      [next[i], next[i + delta]] = [next[i + delta], next[i]];
      return next;
    });
    setSaveError(null);
  }

  async function send(body: LLMUseUpdate, success: string) {
    if (!token) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateLLMUse(token, use.use, body);
      onSaved(updated);
      toast.success(success);
    } catch (err) {
      // The backend's 400 names the broken rule; show it verbatim.
      setSaveError(err instanceof ApiError ? err.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  function save() {
    const body: LLMUseUpdate = {};
    if (primaryDirty) body.primary = primary;
    if (backupsDirty) body.backups = backups;
    void send(body, `${info.label} models saved.`);
  }

  return (
    <Card className="gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold tracking-tight">{info.label}</h2>
          <p className="text-muted-foreground mt-0.5 text-[12.5px]">{info.description}</p>
        </div>
        <Badge
          className={cn(
            use.fallback_enabled ? "bg-positive/10 text-positive" : "bg-warning/10 text-warning",
          )}
        >
          {use.fallback_enabled
            ? `Fallback on · ${use.backups.length} backup${use.backups.length === 1 ? "" : "s"}`
            : "Fallback off"}
        </Badge>
      </div>

      {use.primary.error && (
        <Alert variant="error">
          <CircleAlert />
          <AlertTitle>Saved primary was rejected, so the default is in use</AlertTitle>
          <AlertDescription>
            Saved: <code>{use.primary.stored}</code> — {use.primary.error}
          </AlertDescription>
        </Alert>
      )}
      {use.backups_error && (
        <Alert variant="error">
          <CircleAlert />
          <AlertTitle>Saved backup list was rejected, so the default list is in use</AlertTitle>
          <AlertDescription>
            Saved: <code>{use.backups_stored}</code> — {use.backups_error}
          </AlertDescription>
        </Alert>
      )}

      {/* Primary */}
      <section className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-[12.5px] font-medium">
            Primary <SourceBadge source={use.primary.source} />
          </span>
          <Button
            variant="ghost"
            size="xs"
            disabled={saving || use.primary.source === "env"}
            onClick={() => void send({ primary: null }, `${info.label} primary reset to the default.`)}
          >
            <RotateCcw data-icon="inline-start" />
            Reset to default
          </Button>
        </div>
        <Select items={items} value={primary} onValueChange={(v) => v && choosePrimary(v as string)} disabled={saving}>
          <SelectTrigger className="w-full" aria-label={`${info.label} primary model`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {items.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  <ModelOption spec={i.value} label={i.label} model={bySpec.get(i.value)} />
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <ModelMeta model={bySpec.get(primary)} spec={primary} />
        {!primaryDirty && use.primary.in_model_list === false && <NotInListNote />}
        {use.primary.source === "app_settings" && (
          <span className="text-muted-foreground text-[12px]">Default: {modelId(use.primary.env_default)}</span>
        )}
      </section>

      {/* Backups */}
      <section className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-[12.5px] font-medium">
            Backups, tried in order <SourceBadge source={use.backups_source} />
            {use.max_backups !== null && (
              <span className="text-muted-foreground font-normal tabular-nums">
                {backups.length} / {use.max_backups}
              </span>
            )}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="xs"
              disabled={saving || use.backups_source === "env"}
              onClick={() => void send({ backups: null }, `${info.label} backups reset to the default.`)}
            >
              <RotateCcw data-icon="inline-start" />
              Reset to default
            </Button>
            <Button
              variant="ghost"
              size="xs"
              className="text-negative"
              disabled={saving || (use.backups_source === "app_settings" && use.backups.length === 0)}
              onClick={() => setConfirmOff(true)}
            >
              Turn off fallback
            </Button>
          </div>
        </div>

        {backups.length === 0 ? (
          <p className="border-line text-muted-foreground rounded-lg border border-dashed p-3 text-[12.5px]">
            No backups: if the primary fails, the request fails.
          </p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {backups.map((spec, i) => {
              const saved = use.backups.find((b) => b.value === spec);
              return (
                <li key={spec} className="border-line flex items-center gap-2 rounded-lg border p-2">
                  <span className="text-muted-foreground w-5 text-center text-[12px] tabular-nums">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{label(spec)}</div>
                    <ModelMeta model={bySpec.get(spec)} spec={spec} />
                    {saved?.in_model_list === false && <NotInListNote />}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Move up"
                    disabled={saving || i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Move down"
                    disabled={saving || i === backups.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Remove ${label(spec)}`}
                    disabled={saving}
                    onClick={() => {
                      setBackups((b) => b.filter((x) => x !== spec));
                      setSaveError(null);
                    }}
                  >
                    <X />
                  </Button>
                </li>
              );
            })}
          </ol>
        )}

        <Select
          items={addable}
          value={null}
          onValueChange={(v) => {
            if (!v) return;
            setBackups((b) => [...b, v as string]);
            setSaveError(null);
          }}
          disabled={saving || atCap || addable.length === 0}
        >
          <SelectTrigger className="w-full" aria-label={`Add a ${info.label} backup`}>
            <SelectValue placeholder="Add a backup…" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {addable.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  <ModelOption spec={i.value} label={i.label} model={bySpec.get(i.value)} />
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {atCap && (
          <span className="text-muted-foreground text-[12px] leading-relaxed">
            At most {use.max_backups} backups here: each model can take up to 60 s before the next is tried, and a
            user is waiting. Remove one to add another.
          </span>
        )}
        {use.backups_source === "app_settings" && (
          <span className="text-muted-foreground text-[12px]">
            Default:{" "}
            {use.backups_env_default.length > 0 ? use.backups_env_default.map(modelId).join(" → ") : "no backups"}
          </span>
        )}
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
              setPrimary(current.primary);
              setBackups(current.backups);
              setSaveError(null);
            }}
          >
            Discard
          </Button>
          <Button size="sm" disabled={saving} onClick={save}>
            {saving && <Spinner data-icon="inline-start" />}
            Save
          </Button>
        </div>
      )}

      <AlertDialog open={confirmOff} onOpenChange={setConfirmOff}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn off fallback for {info.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              Only {modelId(current.primary)} will be used. When it is rate-limited, times out or errors, the request
              fails instead of trying another model. &ldquo;Reset to default&rdquo; turns the default backups back on.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setConfirmOff(false);
                void send({ backups: [] }, `Fallback turned off for ${info.label}.`);
              }}
            >
              Turn off fallback
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function SourceBadge({ source }: { source: LLMSettingSource }) {
  return source === "app_settings" ? (
    <Badge className="bg-brand-tint text-brand">Saved</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      Default (env)
    </Badge>
  );
}

function ModelOption({ spec, label, model }: { spec: string; label: string; model?: AvailableModel }) {
  return (
    <span className="flex flex-col">
      <span>{label}</span>
      <span className="text-muted-foreground text-[11.5px]">
        {model ? limits(model) : `${modelId(spec)} · not in the model list`}
      </span>
    </span>
  );
}

function ModelMeta({ model, spec }: { model?: AvailableModel; spec: string }) {
  return (
    <span className="text-muted-foreground text-[12px] tabular-nums">
      {modelId(spec)}
      {model && ` · ${limits(model)}`}
    </span>
  );
}

function NotInListNote() {
  return (
    <span className="text-warning flex items-center gap-1 text-[12px]">
      <TriangleAlert className="size-3.5" />
      Not in Gemini&apos;s model list — retired, or a typo.
    </span>
  );
}

function limits(m: AvailableModel): string {
  const parts = [`${formatTokens(m.input_token_limit)} in`, `${formatTokens(m.output_token_limit)} out`];
  if (m.thinking) parts.push("thinking");
  return parts.join(" · ");
}

/** 131072 → "128k", 1048576 → "1M". Gemini's limits are powers of two. */
function formatTokens(n: number | null): string {
  if (n === null) return "?";
  const k = n / 1024;
  return k >= 1024 ? `${+(k / 1024).toFixed(1)}M` : `${Math.round(k)}k`;
}

function modelId(spec: string): string {
  return spec.includes(":") ? spec.slice(spec.indexOf(":") + 1) : spec;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-MY", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
