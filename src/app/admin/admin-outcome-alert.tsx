import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type Outcome = "success" | "warning" | "error" | "info";

const outcomeIcon: Record<Outcome, typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

/** All good → success, nothing succeeded → error, a mix → warning. */
export function outcomeOf(succeeded: number, failed: number): Outcome {
  if (failed === 0) return "success";
  return succeeded === 0 ? "error" : "warning";
}

/**
 * Result banner for admin job runs (scrape, process, ingest, …). Colors come
 * from the alert variants, so a run's status reads before the text does.
 */
export function OutcomeAlert({
  status,
  title,
  children,
}: {
  status: Outcome;
  title: string;
  children?: React.ReactNode;
}) {
  const Icon = outcomeIcon[status];
  return (
    <Alert variant={status}>
      <Icon />
      <AlertTitle>{title}</AlertTitle>
      {children && <AlertDescription>{children}</AlertDescription>}
    </Alert>
  );
}
