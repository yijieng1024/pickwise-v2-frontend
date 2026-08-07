import { listBrands } from "@/lib/api/admin/brands";

import { AdminPageHeader } from "../../../admin-page-header";
import { LaptopForm } from "../laptop-form";

export default async function AdminNewLaptopPage() {
  const brands = await listBrands();

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        crumbs={["Catalog", "Laptops", "New"]}
        title="New Laptop"
        description="Add a laptop directly to the catalog."
      />
      <LaptopForm mode="create" brands={brands} />
    </div>
  );
}
