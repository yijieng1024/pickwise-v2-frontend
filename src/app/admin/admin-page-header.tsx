"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { adminCrumbsFor } from "./admin-nav";

export function AdminPageHeader({
  trail,
  title,
  description,
  action,
}: {
  /**
   * Levels below this page's sidebar entry, e.g. `["New Laptop"]` under
   * Catalog › Laptops. Everything above that is derived from the nav, so a
   * page that *is* a sidebar entry passes nothing.
   */
  trail?: string[];
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  const pathname = usePathname();
  const crumbs = adminCrumbsFor(pathname, trail);

  return (
    <div className="flex flex-col gap-2">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            {/* Only the dashboard itself renders its own name as plain text —
                anywhere else the root stays a link, including on a route the
                nav doesn't know about. */}
            {pathname === "/admin" ? (
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            ) : (
              <BreadcrumbLink render={<Link href="/admin" />}>Dashboard</BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {crumbs.map((crumb, i) => (
            <Crumb
              // Labels can repeat across levels (a laptop named "Laptops"), so
              // position is the only stable identity here.
              key={`${i}-${crumb.label}`}
              crumb={crumb}
              isLast={i === crumbs.length - 1}
            />
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

function Crumb({
  crumb,
  isLast,
}: {
  crumb: { label: string; href?: string };
  isLast: boolean;
}) {
  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        {isLast ? (
          <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
        ) : crumb.href ? (
          <BreadcrumbLink render={<Link href={crumb.href} />}>{crumb.label}</BreadcrumbLink>
        ) : (
          crumb.label
        )}
      </BreadcrumbItem>
    </>
  );
}
