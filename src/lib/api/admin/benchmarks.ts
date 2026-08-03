import { apiFetch, apiFetchWithTotal } from "@/lib/api/client";

/** Mirrors the backend's `CPUBenchmarkRead` schema. */
export interface CpuBenchmark {
  id: string;
  cpu_name: string;
  cpu_mark: number;
}

export interface CpuBenchmarkInput {
  cpu_name: string;
  cpu_mark: number;
}

/** Mirrors the backend's `GPUBenchmarkRead` schema. */
export interface GpuBenchmark {
  id: string;
  gpu_name: string;
  gpu_mark: number;
}

export interface GpuBenchmarkInput {
  gpu_name: string;
  gpu_mark: number;
}

export interface ListBenchmarksParams {
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  skip?: number;
  limit?: number;
}

/** Real server-side search/sort/pagination — total comes via X-Total-Count
 * (the endpoint deliberately kept a bare-array body; see apiFetchWithTotal). */
export function listCpuBenchmarks(
  params: ListBenchmarksParams = {},
): Promise<{ items: CpuBenchmark[]; total: number }> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.sortBy) query.set("sort_by", params.sortBy);
  if (params.sortDir) query.set("sort_dir", params.sortDir);
  if (params.skip !== undefined) query.set("skip", String(params.skip));
  query.set("limit", String(params.limit ?? 25));

  return apiFetchWithTotal<CpuBenchmark[]>(`/benchmarks/cpu?${query.toString()}`, {
    next: { revalidate: 0 },
  });
}

export function createCpuBenchmark(token: string, input: CpuBenchmarkInput): Promise<CpuBenchmark> {
  return apiFetch<CpuBenchmark>("/benchmarks/cpu", {
    method: "POST",
    token,
    body: JSON.stringify(input),
    next: { revalidate: 0 },
  });
}

export function updateCpuBenchmark(
  token: string,
  id: string,
  input: CpuBenchmarkInput,
): Promise<CpuBenchmark> {
  return apiFetch<CpuBenchmark>(`/benchmarks/cpu/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(input),
    next: { revalidate: 0 },
  });
}

export function deleteCpuBenchmark(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/benchmarks/cpu/${id}`, {
    method: "DELETE",
    token,
    next: { revalidate: 0 },
  });
}

export function triggerCpuScraper(token: string): Promise<{ status: string; message: string }> {
  return apiFetch<{ status: string; message: string }>("/benchmarks/scrape/cpu", {
    method: "POST",
    token,
    next: { revalidate: 0 },
  });
}

/** Real server-side search/sort/pagination — total comes via X-Total-Count
 * (the endpoint deliberately kept a bare-array body; see apiFetchWithTotal). */
export function listGpuBenchmarks(
  params: ListBenchmarksParams = {},
): Promise<{ items: GpuBenchmark[]; total: number }> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.sortBy) query.set("sort_by", params.sortBy);
  if (params.sortDir) query.set("sort_dir", params.sortDir);
  if (params.skip !== undefined) query.set("skip", String(params.skip));
  query.set("limit", String(params.limit ?? 25));

  return apiFetchWithTotal<GpuBenchmark[]>(`/benchmarks/gpu?${query.toString()}`, {
    next: { revalidate: 0 },
  });
}

export function createGpuBenchmark(token: string, input: GpuBenchmarkInput): Promise<GpuBenchmark> {
  return apiFetch<GpuBenchmark>("/benchmarks/gpu", {
    method: "POST",
    token,
    body: JSON.stringify(input),
    next: { revalidate: 0 },
  });
}

export function updateGpuBenchmark(
  token: string,
  id: string,
  input: GpuBenchmarkInput,
): Promise<GpuBenchmark> {
  return apiFetch<GpuBenchmark>(`/benchmarks/gpu/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(input),
    next: { revalidate: 0 },
  });
}

export function deleteGpuBenchmark(token: string, id: string): Promise<void> {
  return apiFetch<void>(`/benchmarks/gpu/${id}`, {
    method: "DELETE",
    token,
    next: { revalidate: 0 },
  });
}

export function triggerGpuScraper(token: string): Promise<{ status: string; message: string }> {
  return apiFetch<{ status: string; message: string }>("/benchmarks/scrape/gpu", {
    method: "POST",
    token,
    next: { revalidate: 0 },
  });
}
