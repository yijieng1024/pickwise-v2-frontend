"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

import { GlassSurface } from "@/components/glass-surface";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth-context";
import {
  GROUP_LABELS,
  OPTION_GROUPS,
  chipAllows,
  chipsOffering,
  configureLaptop,
  formatDelta,
  picksOn,
  sizeOf,
  standardPicks,
  totalOf,
  type ChipKit,
  type Configured,
  type LaptopOptions,
  type OptionGroup,
  type Picks,
} from "@/lib/api/options";
import { labelForUseCase } from "@/lib/api/pickscore";
import { cn } from "@/lib/utils";

import { useConfigurator } from "./configurator-context";

const chipName = (kit: ChipKit | undefined) => kit?.label ?? kit?.chip ?? "";

/** The design recipe (DESIGN.md: glass for floating controls only), for the floating close. */
const GLASS = {
  background: "var(--glass)",
  borderColor: "var(--glass-edge)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  boxShadow: "0 12px 40px var(--shadow), inset 0 1px 0 var(--glass-edge)",
} as const;

/** One choice card: Apple's configurator pattern, label on top, price change below. */
function ChoiceCard({
  title,
  subtitle,
  selected,
  delta,
  disabled,
  onSelect,
  needs,
}: {
  title: string;
  subtitle?: string | null;
  selected: boolean;
  delta: string;
  disabled?: boolean;
  onSelect: () => void;
  needs?: { label: string; delta: string; onSwitch: () => void };
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-2xl border p-3.5 text-left transition",
        selected ? "border-brand ring-brand ring-1" : "border-line",
        disabled ? "bg-surface-2/60" : "bg-surface hover:border-brand/50",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        aria-pressed={selected}
        className="flex flex-col gap-1 text-left disabled:cursor-not-allowed"
      >
        <span className="flex items-start justify-between gap-2">
          <span className={cn("text-[13.5px] font-semibold", disabled && "text-muted-foreground")}>{title}</span>
          {selected && <Check className="text-brand-text size-4 flex-none" />}
        </span>
        {subtitle && <span className="text-[11.5px] text-muted-foreground">{subtitle}</span>}
        {!disabled && (
          <span className="text-[12px] font-medium tabular-nums text-muted-foreground">
            {selected ? "Selected" : delta}
          </span>
        )}
      </button>
      {needs && (
        <span className="mt-1 flex flex-col gap-1.5">
          <span className="text-[11.5px] text-muted-foreground">
            Needs {needs.label} ({needs.delta})
          </span>
          <Button variant="tint" size="xs" shape="pill" className="self-start" onClick={needs.onSwitch}>
            Switch chip
          </Button>
        </span>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="text-[13px] font-semibold tracking-tight">{title}</h3>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{children}</div>
    </section>
  );
}

function Editor({ options, initial, onDone }: { options: LaptopOptions; initial: Picks; onDone: (p: Picks, r: Configured) => void }) {
  const { laptopId } = useConfigurator();
  const { token } = useAuth();
  const [picks, setPicks] = useState<Picks>(initial);
  const [result, setResult] = useState<Configured | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live price + Pick Score: one /configure per settled change. The picks are always a
  // combination the chosen chip allows (the cards never offer anything else), so a 422
  // here is a stale options list, shown as an error rather than handled.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      configureLaptop(laptopId, picks, token)
        .then((r) => {
          if (!cancelled) {
            setResult(r);
            setError(null);
          }
        })
        .catch((e: Error) => !cancelled && setError(e.message));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [laptopId, picks, token]);

  const current = totalOf(options, picks);
  const loading = !result || result.chip !== picks.chip || OPTION_GROUPS.some(
    (g) => picks[g] && !result.add_ons.some((a) => a.group === g && a.value === picks[g]));
  const live = loading ? null : result;
  const personal = live?.personalized_score?.score ?? null;
  const general = live?.scores?.find((s) => s.use_case === "general_use")?.score ?? null;

  const choose = (group: OptionGroup, value: string) => setPicks((p) => ({ ...p, [group]: value }));
  const switchTo = (chip: string, group: OptionGroup, value: string) =>
    setPicks((p) => picksOn(options, chip, { ...p, chip, [group]: value }));

  return (
    <>
      <div className="flex flex-col gap-6 pb-24">
        <Group title={GROUP_LABELS.chip}>
          {options.kits.map((kit) => {
            const next = picksOn(options, kit.chip, picks);
            return (
              <ChoiceCard
                key={kit.chip}
                title={chipName(kit)}
                subtitle={kit.cpu_model}
                selected={picks.chip === kit.chip}
                delta={formatDelta(totalOf(options, next) - current)}
                onSelect={() => setPicks(next)}
              />
            );
          })}
        </Group>
        {OPTION_GROUPS.map((group) => {
          // Every value any chip offers: one the current chip lacks says which chip has it.
          const values = new Map<string, string>();
          for (const kit of options.kits)
            for (const o of kit.options[group] ?? []) if (!values.has(o.value)) values.set(o.value, o.label ?? o.value);
          if (values.size < 2) return null;
          // What the chosen chip allows comes first, by size; values that need another
          // chip follow, also by size. Recomputed on every render, so it re-sorts when
          // the chip changes.
          // Values with no size (display finishes) fall back to their cheapest add-on.
          const allowedHere = (v: string) => (chipAllows(options, picks.chip, group, v) ? 0 : 1);
          const addOnOf = (v: string) =>
            Math.min(...options.kits.flatMap((k) => (k.options[group] ?? []).filter((o) => o.value === v).map((o) => o.add_on_rm ?? 0)));
          const sorted = [...values].sort(
            ([a], [b]) => allowedHere(a) - allowedHere(b) || sizeOf(a) - sizeOf(b) || addOnOf(a) - addOnOf(b),
          );
          return (
            <Group key={group} title={GROUP_LABELS[group]}>
              {sorted.map(([value, label]) => {
                const here = chipAllows(options, picks.chip, group, value);
                const offer = here ? null : chipsOffering(options, group, value)[0];
                const offerTotal = offer
                  ? totalOf(options, picksOn(options, offer.chip, { ...picks, chip: offer.chip, [group]: value }))
                  : 0;
                return (
                  <ChoiceCard
                    key={value}
                    title={label}
                    selected={picks[group] === value}
                    disabled={!here}
                    delta={here ? formatDelta(totalOf(options, { ...picks, [group]: value }) - current) : ""}
                    onSelect={() => choose(group, value)}
                    needs={offer ? {
                      label: chipName(offer),
                      delta: formatDelta(offerTotal - current),
                      onSwitch: () => switchTo(offer.chip, group, value),
                    } : undefined}
                  />
                );
              })}
            </Group>
          );
        })}
      </div>

      {/* Floating total bar: the cards scroll under it, so the blur has something to show. */}
      <div className="pointer-events-none sticky bottom-3 z-10 sm:bottom-4">
        <GlassSurface
          cornerRadius={24}
          fullWidth
          className="pointer-events-auto px-4 py-3 sm:px-5"
          style={{
            background: "color-mix(in oklch, var(--glass) 25%, transparent)",
            backdropFilter: "blur(8px) saturate(170%)",
            WebkitBackdropFilter: "blur(8px) saturate(170%)",
            boxShadow: "0 16px 48px var(--shadow), inset 0 1px 0 var(--glass-edge), inset 0 -1px 0 rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                Your configuration
              </div>
              <div className="text-xl font-bold tracking-tight tabular-nums">
                {live ? `RM ${live.total_rm.toLocaleString()}` : <Spinner className="size-4" />}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {error
                  ? error
                  : live?.scores == null && live
                    ? "No Pick Score for this chip"
                    : personal != null
                      ? `Your Pick Score ${personal} · ${labelForUseCase("general_use")} ${general ?? "–"}`
                      : general != null
                        ? `Pick Score ${general} (${labelForUseCase("general_use")})`
                        : " "}
              </div>
            </div>
            <Button shape="pill" size="lg" className="bg-brand px-6 shadow-md" disabled={!live} onClick={() => live && onDone(picks, live)}>
              Done
            </Button>
          </div>
        </GlassSurface>
      </div>
    </>
  );
}

/** The "Configure" modal. Opens with the applied picks, or the standard config's. */
export function ConfiguratorDialog({ productName }: { productName: string }) {
  const { options, applied, editorOpen, setEditorOpen, apply } = useConfigurator();
  if (!options) return null;
  return (
    <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
      <DialogContent
        showCloseButton={false}
        className="block w-[calc(100vw-1rem)] overflow-visible rounded-3xl p-0 sm:max-w-3xl"
      >
        {/* Floating close, outside the panel: never scrolls away with the cards. */}
        <DialogClose
          aria-label="Close"
          className="text-foreground absolute -top-12 right-0 flex size-10 items-center justify-center rounded-full border transition hover:scale-105 sm:-top-1 sm:-right-14"
          style={GLASS}
        >
          <X className="size-4.5" />
        </DialogClose>
        <div className="flex max-h-[min(85vh,52rem)] flex-col gap-4 overflow-y-auto rounded-3xl p-5 sm:p-7">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">Configure</DialogTitle>
          <DialogDescription className="text-[12.5px]">
            {productName}. Apple&apos;s build-to-order prices; a configuration is not a catalog laptop.
          </DialogDescription>
        </DialogHeader>
        {editorOpen && (
          <Editor options={options} initial={applied?.picks ?? standardPicks(options)} onDone={apply} />
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
