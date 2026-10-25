import { notFound } from "next/navigation";

import { listBrands } from "@/lib/api/admin/brands";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { BackendLaptop } from "@/lib/api/types";

import { AdminPageHeader } from "../../../../admin-page-header";
import { LaptopForm } from "../../laptop-form";

export default async function AdminEditLaptopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let laptop: BackendLaptop;
  try {
    // Never cached: apiFetch's default (revalidate 60) applies on the server,
    // so a reopened edit page showed the values from before the last save,
    // and saving again wrote them back.
    laptop = await apiFetch<BackendLaptop>(`/laptops/${id}`, { next: { revalidate: 0 } });
  } catch (err) {
    // 404 = well-formed id, no such laptop. 422 = backend's UUID path-param
    // validation rejecting a malformed id. Both mean "no laptop here".
    if (err instanceof ApiError && (err.status === 404 || err.status === 422)) {
      notFound();
    }
    throw err;
  }

  const brands = await listBrands();

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
