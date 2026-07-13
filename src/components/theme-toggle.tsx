"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className="border-line bg-glass hover:border-brand hover:text-brand flex items-center gap-1.5 rounded-full px-2.5 py-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors"
    >
      {/* Both icons render; CSS shows the one matching the active theme,
          so no mounted-state check is needed to avoid hydration mismatch. */}
      <Sun className="h-3.5 w-3.5 dark:hidden" />
      <Moon className="hidden h-3.5 w-3.5 dark:block" />
    </button>
  );
}
