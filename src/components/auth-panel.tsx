import Link from "next/link";

/**
 * Centered card for the single-purpose auth screens (verify email, forgot
 * password, reset password). Deliberately the one-column sibling of the
 * two-panel `/login` card — same radius, border and shadow, no brand panel,
 * since these pages carry one short task rather than a marketing pitch.
 */
export function AuthPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 items-center justify-center px-4 py-12 sm:px-6">
      <div className="border-line bg-surface flex w-full max-w-[440px] flex-col gap-5 overflow-hidden rounded-[28px] border px-8 py-9 shadow-[0_24px_72px_var(--shadow)]">
        <Link href="/" className="flex items-center gap-2">
          <span className="bg-brand flex size-7 items-center justify-center rounded-[9px] text-[13px] font-bold text-white">
            P
          </span>
          <span className="text-[16px] font-bold tracking-tight">PickWise</span>
        </Link>

        <div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-balance">{title}</h1>
          <p className="text-[13px] text-muted-foreground">{description}</p>
        </div>

        {children}
      </div>
    </main>
  );
}

/** Brand-tinted informational note, matching the login page's notice style. */
export function AuthNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="bg-brand-tint text-brand rounded-xl px-4 py-3 text-[12.5px] font-medium">
      {children}
    </p>
  );
}

/** Error note, matching the login page's error style. */
export function AuthError({ children }: { children: React.ReactNode }) {
  return (
    <p className="bg-negative/10 text-negative rounded-xl px-4 py-3 text-[12.5px] font-medium">
      {children}
    </p>
  );
}

/** Shared input styling with `/login` — brand-tint focus glow, no default ring. */
export const authInputClass =
  "border-line bg-canvas dark:bg-canvas h-11.5 rounded-xl border px-4 text-[13.5px] md:text-[13.5px] transition-shadow focus:shadow-[0_0_0_3px_var(--brand-tint)] focus-visible:border-line focus-visible:ring-0";
