"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";

import { listBrands } from "@/lib/api/admin/brands";
import { getAdminLaptop } from "@/lib/api/admin/laptops";
import { ApiError } from "@/lib/api/client";
import type { BackendLaptop } from "@/lib/api/types";
import { useAuth } from "@/lib/auth-context";

import { AdminPageHeader } from "../../../../admin-page-header";
import { LaptopForm } from "../../laptop-form";

type Brands = Awaited<ReturnType<typeof listBrands>>;

/**
 * Loaded on the client, with the admin's token, from GET /admin/laptops/{id}:
 * the public GET /laptops/{id} is a 404 for suspended rows, which an admin must
 * still be able to edit (ADR-0009 Amendment II). Never cached, so a reopened
 * edit page shows the last save rather than writing old values back.
 */
export default function AdminEditLaptopPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [data, setData] = useState<{ laptop: BackendLaptop; brands: Brands } | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    Promise.all([getAdminLaptop(token, id), listBrands()])
      .then(([laptop, brands]) => !cancelled && setData({ laptop, brands }))
      .catch((err) => {
        if (cancelled) return;
        // 404 = no such laptop; 422 = malformed id. Both mean "no laptop here".
        if (err instanceof ApiError && (err.status === 404 || err.status === 422)) setMissing(true);
        else setError(err instanceof Error ? err.message : "Could not load the laptop.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, id]);

  if (missing) notFound();
  if (error) return <p className="text-sm text-negative">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const { laptop, brands } = data;
  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        trail={[laptop.product_name]}
        title={`Edit ${laptop.product_name}`}
        description={laptop.model_code}
      />
      <LaptopForm mode="edit" laptop={laptop} brands={brands} />
    </div>
  );
}
