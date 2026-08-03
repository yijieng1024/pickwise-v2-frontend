import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function AdminPageHeader({
  crumbs,
  title,
  description,
  action,
}: {
  /** Trail after "Dashboard", e.g. ["Catalog", "Laptops"] — last entry is the current page. */
  crumbs: string[];
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/admin" />}>Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          {crumbs.map((crumb, i) => (
            <BreadcrumbCrumb key={crumb} label={crumb} isLast={i === crumbs.length - 1} />
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
    </div>
  );
}

function BreadcrumbCrumb({ label, isLast }: { label: string; isLast: boolean }) {
  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        {isLast ? <BreadcrumbPage>{label}</BreadcrumbPage> : label}
      </BreadcrumbItem>
    </>
  );
}
