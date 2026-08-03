import { redirect } from "next/navigation";

// /admin/catalog has no content of its own — Catalog is a sidebar dropdown
// (Laptops/Brands/Customizations), not a tabbed page. Keeps old links working.
export default function AdminCatalogPage() {
  redirect("/admin/catalog/laptops");
}
