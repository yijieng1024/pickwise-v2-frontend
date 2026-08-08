import { redirect } from "next/navigation";

// /admin/reviews has no content of its own — Reviews is a sidebar dropdown
// (Sources/Match Queue/Review Pipeline), not a combined page.
export default function AdminReviewsPage() {
  redirect("/admin/reviews/channels");
}
