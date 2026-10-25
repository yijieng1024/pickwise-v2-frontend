import { redirect } from "next/navigation";

// /admin/reviews has no content of its own — Reviews is a sidebar group
// (Review pipeline/Sources/Link reviews); this lands on its first page.
export default function AdminReviewsPage() {
  redirect("/admin/reviews/pipeline");
}
