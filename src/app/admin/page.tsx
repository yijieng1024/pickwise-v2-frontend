"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Laptop2,
  Loader2,
  PackageSearch,
  Users,
} from "lucide-react";

import { apiFetch } from "@/lib/api/client";
import { listRawScrapLaptops } from "@/lib/api/admin/scraper";
import { listUsers } from "@/lib/api/admin/users";
import { useAuth } from "@/lib/auth-context";

interface Stats {
  userCount: number;
  laptopCount: number;
  rawScrapPending: number;
}

const tabs = [
  {
    href: "/admin/users",
    label: "Users",
    description: "Search accounts, change roles, suspend or deactivate.",
  },
  {
    href: "/admin/catalog/laptops",
    label: "Catalog",
    description: "Laptops, brands, and customization options.",
  },
  {
    href: "/admin/pipeline",
    label: "Pipeline",
    description: "Trigger the scraper and AI processor, watch queue depth.",
  },
];

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    Promise.all([
      listUsers(token, { limit: 1 }),
      apiFetch<unknown[]>("/laptops/"),
      listRawScrapLaptops(token, { limit: 1000 }),
    ])
      .then(([users, laptops, rawScrap]) => {
        if (cancelled) return;
        setStats({
          userCount: users.total,
          laptopCount: laptops.length,
          rawScrapPending: rawScrap.filter((r) => r.processing_status === "pending")
            .length,
        });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Overview</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Catalog and pipeline operations for PickWise.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          icon={Users}
          label="Users"
          value={stats?.userCount}
          error={error}
        />
        <StatTile
          icon={Laptop2}
          label="Laptops"
          value={stats?.laptopCount}
          error={error}
        />
        <StatTile
          icon={PackageSearch}
          label="Pending in raw-scrape queue"
          value={stats?.rawScrapPending}
          error={error}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tabs.map(({ href, label, description }) => (
          <Link
            key={href}
            href={href}
            className="group border-line bg-surface flex flex-col gap-1.5 rounded-lg border p-3 transition-colors hover:bg-surface-2"
          >
            <span className="flex items-center justify-between text-[13px] font-bold">
              {label}
              <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="text-[12.5px] text-muted-foreground">
              {description}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  error,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | undefined;
  error: boolean;
}) {
  return (
    <div className="border-line bg-surface flex items-center gap-3 rounded-lg border p-3">
      <span className="bg-brand-tint text-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
        <Icon className="size-4" />
      </span>
      <div>
        <div className="text-xl font-bold tabular-nums">
          {error ? (
            "—"
          ) : value === undefined ? (
            <Loader2 className="size-4 text-muted-foreground motion-safe:animate-spin" />
          ) : (
            value.toLocaleString()
          )}
        </div>
        <div className="text-[12px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
