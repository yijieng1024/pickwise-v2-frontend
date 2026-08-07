"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function LaptopsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center sm:px-6 lg:px-8">
      <div className="border-line bg-surface flex flex-col items-center gap-3 rounded-3xl border p-10">
        <h1 className="text-xl font-semibold">Couldn&apos;t load laptops</h1>
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t reach the catalog right now. Please try again.
        </p>
        <Button type="button" size="xl" shape="pill" onClick={reset} className="mt-2">
          Try again
        </Button>
      </div>
    </main>
  );
}
