import { redirect } from "next/navigation";

// /admin/benchmarks has no content of its own — Benchmarks is a sidebar
// dropdown (CPU/GPU), not a combined page. Keeps old links working.
export default function AdminBenchmarksPage() {
  redirect("/admin/benchmarks/cpu");
}
