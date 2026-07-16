import type { Metadata } from "next";

import { getBrands, getQuestionnaire } from "@/lib/api/questionnaire";
import { WizardClient } from "./wizard-client";

export const metadata: Metadata = {
  title: "Needs Wizard — PickWise",
};

export default async function WizardPage() {
  // Brands only feed the last question's options — a failure there
  // shouldn't take down the wizard, so it degrades to "No preference".
  const [questions, brands] = await Promise.all([
    getQuestionnaire("laptop").catch(() => null),
    getBrands().catch(() => []),
  ]);

  if (!questions || questions.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">
          The wizard is unavailable right now
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          We couldn&apos;t load the questionnaire. Please try again in a
          moment — or chat with Pico directly.
        </p>
      </main>
    );
  }

  const ordered = [...questions].sort((a, b) => a.step_order - b.step_order);

  return <WizardClient questions={ordered} brands={brands} />;
}
