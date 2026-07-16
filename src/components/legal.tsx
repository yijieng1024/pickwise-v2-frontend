import type { ReactNode } from "react";

/**
 * Shared shell for the static legal pages (/terms, /privacy): flat body
 * content per the design rules (no glass), typographic scale matched to the
 * rest of the app.
 */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 sm:px-6">
      <div className="motion-safe:animate-fade-in-up">
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Last updated: {updated}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
          {intro}
        </p>
      </div>

      <div
        className="mt-10 flex flex-col gap-9 motion-safe:animate-fade-in-up"
        style={{ animationDelay: "80ms" }}
      >
        {children}
      </div>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      <div className="flex flex-col gap-3 text-[13.5px] leading-relaxed text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-brand">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
