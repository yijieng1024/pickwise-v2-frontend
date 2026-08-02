import { apiFetch } from "@/lib/api/client";

export interface EmbeddingStatus {
  total_laptops: number;
  embedded: number;
  missing: number;
  coverage_pct: number;
}

export interface GenerateAllResult {
  message: string;
  total_laptops: number;
  tip: string;
}

export function getEmbeddingStatus(): Promise<EmbeddingStatus> {
  return apiFetch<EmbeddingStatus>("/embeddings/laptops/status", { next: { revalidate: 0 } });
}

/** Kicks off a background job on the server — returns immediately, doesn't wait for completion. */
export function generateAllEmbeddings(token: string): Promise<GenerateAllResult> {
  return apiFetch<GenerateAllResult>("/embeddings/laptops/generate-all", {
    method: "POST",
    token,
    next: { revalidate: 0 },
  });
}
