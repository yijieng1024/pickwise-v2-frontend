import { RefreshCw, SearchX, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";

/** Load failure inside a list card, with a retry affordance. */
export function AdminErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlert />
        </EmptyMedia>
        <EmptyTitle>Couldn&apos;t load this</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw data-icon="inline-start" />
        Retry
      </Button>
    </Empty>
  );
}

/** In-flight fetch for a list card. */
export function AdminLoadingState() {
  return (
    <div className="flex items-center justify-center p-10">
      <Spinner className="size-5 text-muted-foreground" />
    </div>
  );
}

/** No rows — either the collection is empty or the filters exclude everything. */
export function AdminEmptyState({
  title,
  description,
  icon: Icon = SearchX,
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType;
  action?: React.ReactNode;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action}
    </Empty>
  );
}
