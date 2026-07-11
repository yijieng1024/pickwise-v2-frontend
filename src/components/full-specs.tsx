import {
  BatteryCharging,
  Cpu,
  Keyboard,
  MemoryStick,
  Monitor,
  Package,
  Plug,
  ShieldCheck,
  Zap,
} from "lucide-react";

import type { BackendLaptop } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface SpecRow {
  label: string;
  /** A single-value row. Mutually exclusive with `list` — provide exactly one. */
  value?: string;
  sub?: string;
  /** A multi-item row (e.g. ports) — rendered as separate pills instead of one joined string. */
  list?: string[];
}

interface SpecGroup {
  title: string;
  icon: typeof Cpu;
  /** Bento width within the page's md:grid-cols-6 grid. */
  span: "md:col-span-2" | "md:col-span-3";
  /** Promote the first row to a large headline value (short specs only). */
  highlightFirst: boolean;
  rows: SpecRow[];
}

function formatProcessor(raw: BackendLaptop): SpecRow | null {
  if (!raw.processor_model) return null;
  const hasCoreInfo = /core/i.test(raw.processor_model);
  const sub = [
    !hasCoreInfo && raw.cpu_cores ? `${raw.cpu_cores}-core` : null,
    !hasCoreInfo && raw.cpu_threads ? `${raw.cpu_threads}-thread` : null,
    raw.processor_ghz,
  ]
    .filter(Boolean)
    .join(" · ");
  return { label: "Processor", value: raw.processor_model, sub: sub || undefined };
}

function formatNpu(raw: BackendLaptop): SpecRow | null {
  const valueParts = [raw.npu_model, raw.npu_tops ? `${raw.npu_tops} TOPS` : null].filter(Boolean);
  const value = valueParts.length > 0 ? valueParts.join(" — ") : raw.ai_ready ? "AI-ready" : "";
  if (!value) return null;
  return {
    label: "Neural engine / AI",
    value,
    sub: raw.ai_features.length > 0 ? raw.ai_features.join(", ") : undefined,
  };
}

function formatGraphics(raw: BackendLaptop): SpecRow | null {
  if (!raw.gpu_model) return null;
  const hasBrand = raw.gpu_brand && raw.gpu_model.toLowerCase().includes(raw.gpu_brand.toLowerCase());
  const hasCoreInfo = /core/i.test(raw.gpu_model);
  const sub = [
    !hasBrand ? raw.gpu_brand : null,
    !hasCoreInfo && raw.gpu_cores ? `${raw.gpu_cores}-core` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return { label: "Graphics", value: raw.gpu_model, sub: sub || undefined };
}

function formatMediaEngine(raw: BackendLaptop): SpecRow | null {
  if (!raw.media_engine_details) return null;
  return { label: "Media engine", value: raw.media_engine_details };
}

function formatMemory(raw: BackendLaptop): SpecRow | null {
  if (!raw.ram_gb) return null;
  const value = `${raw.ram_gb}GB${raw.ram_type ? ` ${raw.ram_type}` : ""}`;
  const sub = [raw.ram_upgradable ? "Upgradable" : "Not upgradable", raw.max_ram_gb ? `up to ${raw.max_ram_gb}GB` : null]
    .filter(Boolean)
    .join(" · ");
  return { label: "Memory", value, sub: sub || undefined };
}

function formatStorage(raw: BackendLaptop): SpecRow | null {
  if (!raw.ssd_gb) return null;
  const value = `${raw.ssd_gb}GB ${raw.storage_type ?? "SSD"}`;
  const sub = [raw.storage_upgradable ? "Upgradable" : "Not upgradable", raw.expansion_slots_summary]
    .filter(Boolean)
    .join(" · ");
  return { label: "Storage", value, sub: sub || undefined };
}

function formatDisplayPanel(raw: BackendLaptop): SpecRow | null {
  if (!raw.display_size_inch) return null;
  const value = `${raw.display_size_inch}"${raw.display_type ? ` ${raw.display_type}` : ""}`;
  const sub = [
    raw.display_resolution,
    raw.display_refresh_rate_hz ? `${raw.display_refresh_rate_hz}Hz` : null,
    raw.display_brightness_nits ? `${raw.display_brightness_nits} nits` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return { label: "Display", value, sub: sub || undefined };
}

function formatTouchExternal(raw: BackendLaptop): SpecRow | null {
  if (!raw.touchscreen && !raw.external_display_support) return null;
  return {
    label: "Touch & external display",
    value: raw.touchscreen ? "Touchscreen" : "No touchscreen",
    sub: raw.external_display_support ?? undefined,
  };
}

function formatWeightDimensions(raw: BackendLaptop): SpecRow | null {
  if (!raw.weight_kg) return null;
  return { label: "Weight & dimensions", value: `${raw.weight_kg}kg`, sub: raw.dimensions_cm ?? undefined };
}

function formatBattery(raw: BackendLaptop): SpecRow | null {
  if (!raw.battery_wh) return null;
  return { label: "Battery & power", value: `${raw.battery_wh}Wh`, sub: raw.power_supply_details ?? undefined };
}

function formatOs(raw: BackendLaptop): SpecRow | null {
  if (!raw.os) return null;
  return { label: "Operating system", value: raw.os, sub: raw.colors.length > 0 ? raw.colors.join(", ") : undefined };
}

function formatConnectivity(raw: BackendLaptop): SpecRow | null {
  const value = [raw.wifi_standard, raw.bluetooth_version ? `Bluetooth ${raw.bluetooth_version}` : null]
    .filter(Boolean)
    .join(" · ");
  if (!value) return null;
  return { label: "Wireless", value };
}

function formatPorts(raw: BackendLaptop): SpecRow | null {
  if (raw.ports_summary.length === 0) return null;
  return { label: "Ports", list: raw.ports_summary };
}

function formatKeyboard(raw: BackendLaptop): SpecRow | null {
  if (!raw.keyboard_touchpad_details) return null;
  return { label: "Keyboard & touchpad", value: raw.keyboard_touchpad_details };
}

function formatAudio(raw: BackendLaptop): SpecRow | null {
  if (!raw.audio_details) return null;
  return { label: "Audio", value: raw.audio_details };
}

function formatCamera(raw: BackendLaptop): SpecRow | null {
  if (!raw.camera_details) return null;
  return { label: "Camera", value: raw.camera_details };
}

function formatBiometrics(raw: BackendLaptop): SpecRow | null {
  const value = [raw.fingerprint_reader ? "Fingerprint reader" : null, raw.facial_recognition ? "Facial recognition" : null]
    .filter(Boolean)
    .join(", ");
  if (!value) return null;
  return { label: "Biometrics", value };
}

function formatSecurity(raw: BackendLaptop): SpecRow | null {
  if (!raw.security_features) return null;
  return { label: "Security features", value: raw.security_features };
}

function formatMaterials(raw: BackendLaptop): SpecRow | null {
  if (!raw.materials_and_certifications) return null;
  return { label: "Build & certifications", value: raw.materials_and_certifications };
}

function formatSoftware(raw: BackendLaptop): SpecRow | null {
  if (!raw.microsoft_office_included) return null;
  return { label: "Software", value: "Microsoft Office included" };
}

function formatBundled(raw: BackendLaptop): SpecRow | null {
  if (!raw.bundled_accessories) return null;
  return { label: "In the box", value: raw.bundled_accessories };
}

function formatWarranty(raw: BackendLaptop): SpecRow | null {
  if (!raw.warranty_details) return null;
  return { label: "Warranty", value: raw.warranty_details };
}

function buildGroups(raw: BackendLaptop): SpecGroup[] {
  const groups: (Omit<SpecGroup, "rows"> & { rows: (SpecRow | null)[] })[] = [
    {
      title: "Processor & AI",
      icon: Cpu,
      span: "md:col-span-3",
      highlightFirst: true,
      rows: [formatProcessor(raw), formatNpu(raw)],
    },
    {
      title: "Graphics",
      icon: Zap,
      span: "md:col-span-3",
      highlightFirst: true,
      rows: [formatGraphics(raw), formatMediaEngine(raw)],
    },
    {
      title: "Display",
      icon: Monitor,
      span: "md:col-span-2",
      highlightFirst: true,
      rows: [formatDisplayPanel(raw), formatTouchExternal(raw)],
    },
    {
      title: "Memory & Storage",
      icon: MemoryStick,
      span: "md:col-span-2",
      highlightFirst: true,
      rows: [formatMemory(raw), formatStorage(raw)],
    },
    {
      title: "Battery & Portability",
      icon: BatteryCharging,
      span: "md:col-span-2",
      highlightFirst: true,
      rows: [formatBattery(raw), formatWeightDimensions(raw)],
    },
    {
      title: "Connectivity & Ports",
      icon: Plug,
      span: "md:col-span-3",
      highlightFirst: true,
      rows: [formatConnectivity(raw), formatPorts(raw)],
    },
    {
      title: "Keyboard, Audio & Camera",
      icon: Keyboard,
      span: "md:col-span-3",
      highlightFirst: false,
      rows: [formatKeyboard(raw), formatAudio(raw), formatCamera(raw)],
    },
    {
      title: "Security & Build",
      icon: ShieldCheck,
      span: "md:col-span-3",
      highlightFirst: false,
      rows: [formatBiometrics(raw), formatSecurity(raw), formatMaterials(raw)],
    },
    {
      title: "Software & Warranty",
      icon: Package,
      span: "md:col-span-3",
      highlightFirst: false,
      rows: [formatOs(raw), formatSoftware(raw), formatBundled(raw), formatWarranty(raw)],
    },
  ];

  return groups
    .map((g) => ({ ...g, rows: g.rows.filter((r): r is SpecRow => r !== null) }))
    .filter((g) => g.rows.length > 0);
}

export function FullSpecs({ raw }: { raw: BackendLaptop }) {
  const groups = buildGroups(raw);
  if (groups.length === 0) return null;

  return (
    <>
      <h2 className="text-lg font-bold tracking-tight md:col-span-6">
        Full specifications
      </h2>
      {groups.map((group, i) => {
        const Icon = group.icon;
        // Only promote a plain short value — a list row (e.g. ports) stays in the row layout.
        const headline = group.highlightFirst && group.rows[0].value ? group.rows[0] : null;
        const rows = headline ? group.rows.slice(1) : group.rows;

        return (
          <section
            key={group.title}
            className={cn(
              "border-line bg-surface rounded-3xl border p-6 motion-safe:animate-fade-in-up",
              group.span,
            )}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="mb-4 flex items-center gap-2.5">
              <div className="bg-brand-tint text-brand flex h-8 w-8 flex-none items-center justify-center rounded-[10px]">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="text-[11.5px] font-bold tracking-wide text-muted-foreground uppercase">
                {group.title}
              </h3>
            </div>

            {headline && (
              <div className={rows.length > 0 ? "border-line border-b pb-4" : undefined}>
                <p className="text-lg leading-snug font-bold tracking-tight">
                  {headline.value}
                </p>
                {headline.sub && (
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                    {headline.sub}
                  </p>
                )}
              </div>
            )}

            <div className="divide-line flex flex-col divide-y">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className={cn("py-3.5 last:pb-0", !headline && "first:pt-0")}
                >
                  <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {row.label}
                  </div>
                  {row.value && (
                    <div className="mt-1 text-[13.5px] leading-snug font-medium">
                      {row.value}
                    </div>
                  )}
                  {row.sub && (
                    <div className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                      {row.sub}
                    </div>
                  )}
                  {row.list && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {row.list.map((item) => (
                        <span
                          key={item}
                          className="bg-surface-2 rounded-full px-2.5 py-1 text-[12px] font-medium"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
