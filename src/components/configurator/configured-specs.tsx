"use client";

import { Cpu, Feather, HardDrive, Monitor, RectangleEllipsis, Zap } from "lucide-react";

import { FullSpecs } from "@/components/full-specs";
import { ShareButton } from "@/components/share-button";
import { configuredLaptop } from "@/lib/api/options";
import type { BackendLaptop } from "@/lib/api/types";

import { useConfigurator } from "./configurator-context";

/** The catalog row, or the applied configuration's version of it while "Configured" is on. */
function useShownLaptop(raw: BackendLaptop): BackendLaptop {
  const { options, applied, view } = useConfigurator();
  return view === "configured" && applied && options
    ? configuredLaptop(raw, options, applied.result, applied.picks)
    : raw;
}

export function ConfiguredTitle({ raw, name }: { raw: BackendLaptop; name: string }) {
  const shown = useShownLaptop(raw);
  return <>{shown === raw ? name : shown.product_name}</>;
}

/** The share button, titled with the name the page shows for the current view: the link
 *  it sends carries the configuration, so the title must not name the standard config. */
export function ConfiguredShareButton({ raw, name }: { raw: BackendLaptop; name: string }) {
  const shown = useShownLaptop(raw);
  return <ShareButton name={shown === raw ? name : shown.product_name} />;
}

export function ConfiguredFullSpecs({ raw }: { raw: BackendLaptop }) {
  return <FullSpecs raw={useShownLaptop(raw)} />;
}

/** The hero's quick-facts grid. */
export function ConfiguredQuickFacts({ raw: catalog }: { raw: BackendLaptop }) {
  const raw = useShownLaptop(catalog);
  const storage = raw.ssd_gb >= 1024 ? `${(raw.ssd_gb / 1024).toLocaleString()}TB` : `${raw.ssd_gb}GB`;
  const facts = [
    { label: "Processor", value: raw.processor_model, icon: Cpu },
    { label: "Graphics", value: raw.gpu_model, icon: Zap },
    { label: "Memory", value: `${raw.ram_gb}GB${raw.ram_type ? ` ${raw.ram_type}` : ""}`, icon: RectangleEllipsis },
    { label: "Storage", value: `${storage} ${raw.storage_type ?? "SSD"}`, icon: HardDrive },
    {
      label: "Display",
      value: [
        `${raw.display_size_inch}"`,
        raw.display_resolution,
        raw.display_refresh_rate_hz ? `${raw.display_refresh_rate_hz}Hz` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      icon: Monitor,
    },
    {
      label: "Weight · Battery",
      value: `${raw.weight_kg != null ? `${raw.weight_kg}kg` : "Weight unknown"} · ${raw.battery_wh}Wh`,
      icon: Feather,
    },
  ].filter((f) => f.value && f.value.trim() !== "");

  return (
    <div className="grid grid-cols-1 gap-x-2.5 gap-y-3.5 min-[420px]:grid-cols-2">
      {facts.map(({ label, value, icon: Icon }) => (
        <div key={label} className="flex items-start gap-2.5">
          <span className="bg-surface-2 flex size-8 flex-none items-center justify-center rounded-[10px] text-muted-foreground">
            <Icon className="size-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              {label}
            </span>
            <span className="block text-[12.5px] leading-snug font-medium">{value}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
