"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * next-themes renders an inline <script> that sets the theme class before
 * first paint. React 19 logs "Encountered a script tag while rendering React
 * component" whenever it CREATES a <script> on the client — a client-created
 * script never executes, so the warning is about exactly that copy. The
 * server-rendered one (the one that does the job) is hydrated, not created.
 *
 * So: on the server the script stays plain JavaScript; in the browser its type
 * becomes a data block, which React exempts from the warning. The attribute
 * difference doesn't trip hydration because next-themes renders the script
 * with suppressHydrationWarning.
 */
const scriptProps =
  typeof window === "undefined" ? undefined : ({ type: "application/json" } as const);

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider scriptProps={scriptProps} {...props}>
      {children}
    </NextThemesProvider>
  );
}
