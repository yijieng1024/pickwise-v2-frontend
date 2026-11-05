"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import type { Configured, LaptopOptions, Picks } from "@/lib/api/options";

export type ConfigView = "original" | "configured";

interface ConfiguratorState {
  laptopId: string;
  /** null: not an Apple standard config with options; nothing renders. */
  options: LaptopOptions | null;
  /** The configuration the user applied with "Done", if any. */
  applied: { picks: Picks; result: Configured } | null;
  view: ConfigView;
  setView: (view: ConfigView) => void;
  editorOpen: boolean;
  setEditorOpen: (open: boolean) => void;
  apply: (picks: Picks, result: Configured) => void;
}

const Ctx = createContext<ConfiguratorState | null>(null);

/**
 * Shared by the detail page's hero (price, ring, toggle) and the Pick Score tile: they
 * all switch between the catalog laptop ("Original") and the user's build ("Configured").
 * A configured machine is never a catalog laptop; nothing here is persisted.
 */
export function ConfiguratorProvider({
  laptopId,
  options,
  children,
}: {
  laptopId: string;
  options: LaptopOptions | null;
  children: ReactNode;
}) {
  const [applied, setApplied] = useState<ConfiguratorState["applied"]>(null);
  const [view, setView] = useState<ConfigView>("original");
  const [editorOpen, setEditorOpen] = useState(false);

  const apply = (picks: Picks, result: Configured) => {
    setApplied({ picks, result });
    setView("configured");
    setEditorOpen(false);
  };

  return (
    <Ctx.Provider value={{ laptopId, options, applied, view, setView, editorOpen, setEditorOpen, apply }}>
      {children}
    </Ctx.Provider>
  );
}

export function useConfigurator(): ConfiguratorState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConfigurator outside ConfiguratorProvider");
  return ctx;
}

/** The applied configuration, only while the "Configured" view is on. */
export function useConfiguredView(): Configured | null {
  const { applied, view } = useConfigurator();
  return view === "configured" && applied ? applied.result : null;
}
