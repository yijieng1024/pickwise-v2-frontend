import { redirect } from "next/navigation";

// /admin/benchmarks has no content of its own. It lands on the Pick Score
// page, the Scoring group's first page. Keeps old links working.
export default function AdminBenchmarksPage() {
  redirect("/admin/pickscore");
}
