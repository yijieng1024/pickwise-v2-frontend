import { apiFetch } from "@/lib/api/client";

export interface ProcessPendingDetail {
  raw_id: string;
  product_name: string;
  status: string;
  variants_extracted: number;
  variants_saved: number;
  variants_updated: number;
  error: string | null;
}

export interface ProcessPendingResult {
  message: string;
  requests_made?: number;
  total_new_variants_saved?: number;
  total_variants_updated?: number;
  pending_remaining?: number;
  details?: ProcessPendingDetail[];
}

export interface CategorizeUntaggedResult {
  status: string;
  message: string;
  attempted: number;
  tagged: number;
  links_added: number;
  untagged_remaining: number;
  errors: string[];
}

export function processPending(token: string, limit = 100): Promise<ProcessPendingResult> {
  return apiFetch<ProcessPendingResult>(`/processor/process-pending?limit=${limit}`, {
    method: "POST",
    token,
    next: { revalidate: 0 },
  });
}

export function categorizeUntagged(
  token: string,
  limit = 100,
): Promise<CategorizeUntaggedResult> {
  return apiFetch<CategorizeUntaggedResult>(`/processor/categorize-untagged?limit=${limit}`, {
    method: "POST",
    token,
    next: { revalidate: 0 },
  });
}
