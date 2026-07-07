import type { Vendor } from "@/lib/laptops";

/** Solid background classes for vendor-branded buttons and avatars. */
export const vendorBgClass: Record<Vendor, string> = {
  official: "bg-primary hover:bg-primary/90",
  retail: "bg-blue-800 hover:bg-blue-800/90",
  used: "bg-green-600 hover:bg-green-600/90",
};
