import { apiFetch } from "@/lib/api/client";

export function deleteLaptop(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/laptops/${id}`, {
    method: "DELETE",
    token,
    next: { revalidate: 0 },
  });
}
