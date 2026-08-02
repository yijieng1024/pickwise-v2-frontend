"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Cpu,
  FolderTree,
  Laptop2,
  Loader2,
  PackageSearch,
  RefreshCw,
  Sparkles,
  Tag,
  Users,
  XCircle,
} from "lucide-react";

import { StatusBarChart } from "@/components/charts/status-bar-chart";
import { Button } from "@/components/ui/button";
import { listBrands } from "@/lib/api/admin/brands";
import { apiFetch } from "@/lib/api/client";
import { getEmbeddingStatus } from "@/lib/api/admin/embeddings";
import { listRawScrapLaptops } from "@/lib/api/admin/scraper";
import { listUsers } from "@/lib/api/admin/users";
import { useAuth } from "@/lib/auth-context";

interface Stats {
  userCount: number;
  laptopCount: number;
  brandCount: number;
  embeddingCoveragePct: number;
  rawScrapPending: number;
  rawScrapCompleted: number;
  rawScrapFailed: number;
}

const tabs = [
  {
    href: "/admin/users",
    label: "Users",
    description: "Search accounts, change roles, suspend or deactivate.",
    icon: Users,
  },
  {
    href: "/admin/catalog/laptops",
    label: "Catalog",
    description: "Laptops, brands, and customization options.",
    icon: Laptop2,
  },
  {
    href: "/admin/pipeline",
    label: "Pipeline",
    description: "Trigger the scraper and AI processor, watch queue depth.",
    icon: PackageSearch,
  },
  {
    href: "/admin/taxonomy",
    label: "Taxonomy",
    description: "Product types and frontend-facing category tags.",
    icon: FolderTree,
  },
  {
    href: "/admin/embeddings",
    label: "Embeddings",
    description: "Vector coverage for hybrid search and recommendations.",
    icon: Sparkles,
  },
  {
    href: "/admin/benchmarks",
    label: "Benchmarks",
    description: "CPU/GPU PassMark scores that feed PickScore.",
    icon: Cpu,
  },
];

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  // Clear a prior error as soon as a retry is requested — the "adjust state
  // during render" pattern, not an effect (see laptops-browse.tsx).
  const [prevReloadTick, setPrevReloadTick] = useState(reloadTick);
  if (reloadTick !== prevReloadTick) {
    setPrevReloadTick(reloadTick);
    setError(false);
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    Promise.all([
      listUsers(token, { limit: 1 }),
      apiFetch<unknown[]>("/laptops/"),
      listBrands(),
      getEmbeddingStatus(),
      listRawScrapLaptops(token, { limit: 1000 }),
    ])
      .then(([users, laptops, brands, embeddings, rawScrap]) => {
        if (cancelled) return;
        setStats({
          userCount: users.total,
          laptopCount: laptops.length,
          brandCount: brands.length,
          embeddingCoveragePct: embeddings.coverage_pct,
          rawScrapPending: rawScrap.filter((r) => r.processing_status === "pending")
            .length,
          rawScrapCompleted: rawScrap.filter((r) => r.processing_status === "completed")
            .length,
          rawScrapFailed: rawScrap.filter((r) => r.processing_status === "failed")
            .length,
        });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [token, reloadTick]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Catalog and pipeline operations for PickWise.
          </p>
        </div>
        {error && (
          <Button variant="outline" size="sm" onClick={() => setReloadTick((t) => t + 1)}>
            <RefreshCw className="size-3.5" />
            Retry
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold tracking-tight">Stats</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile icon={Users} label="Users" value={stats?.userCount} error={error} />
          <StatTile icon={Laptop2} label="Laptops" value={stats?.laptopCount} error={error} />
          <StatTile icon={Tag} label="Brands" value={stats?.brandCount} error={error} />
          <StatTile
            icon={Sparkles}
            label="Embedding coverage"
            value={stats?.embeddingCoveragePct}
            suffix="%"
            error={error}
          />
          <StatTile
            icon={PackageSearch}
            label="Pending in raw-scrape queue"
            value={stats?.rawScrapPending}
            error={error}
          />
          <StatTile
            icon={XCircle}
            label="Failed in raw-scrape queue"
            value={stats?.rawScrapFailed}
            error={error}
            tone={stats && stats.rawScrapFailed > 0 ? "negative" : undefined}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold tracking-tight">Raw-scrape queue by status</h2>
        <div className="border-line bg-surface rounded-lg border p-4">
          {error ? (
            <p className="p-6 text-center text-[13px] text-muted-foreground">
              Couldn&apos;t load queue data.
            </p>
          ) : !stats ? (
            <div className="flex items-center justify-center p-10">
              <Loader2 className="size-5 text-muted-foreground motion-safe:animate-spin" />
            </div>
          ) : (
            <StatusBarChart
              height={180}
              data={[
                { label: "Pending", value: stats.rawScrapPending, color: "var(--warning)" },
                { label: "Completed", value: stats.rawScrapCompleted, color: "var(--positive)" },
                { label: "Failed", value: stats.rawScrapFailed, color: "var(--negative)" },
              ]}
            />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold tracking-tight">Quick access</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {tabs.map(({ href, label, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group border-line bg-surface flex flex-col gap-1.5 rounded-lg border p-3 transition-colors hover:bg-surface-2"
            >
              <span className="flex items-center justify-between text-[13px] font-bold">
                <span className="flex items-center gap-1.5">
                  <Icon className="text-brand size-3.5" />
                  {label}
                </span>
                <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="text-[12.5px] text-muted-foreground">
                {description}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  suffix = "",
  error,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | undefined;
  suffix?: string;
  error: boolean;
  tone?: "negative";
}) {
  return (
    <div className="border-line bg-surface flex items-center gap-3 rounded-lg border p-3">
      <span
        className={
          tone === "negative"
            ? "bg-negative/10 text-negative flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            : "bg-brand-tint text-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        }
      >
        <Icon className="size-4" />
      </span>
      <div>
        <div className={`text-xl font-bold tabular-nums ${tone === "negative" ? "text-negative" : ""}`}>
          {error ? (
            "—"
          ) : value === undefined ? (
            <Loader2 className="size-4 text-muted-foreground motion-safe:animate-spin" />
          ) : (
            `${value.toLocaleString()}${suffix}`
          )}
        </div>
        <div className="text-[12.5px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
