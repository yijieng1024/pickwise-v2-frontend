import { cookies } from "next/headers";

import { AdminShell } from "./admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-read so the sidebar's collapsed/expanded state survives a reload
  // (the client-side SidebarProvider writes this cookie on every toggle).
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return <AdminShell defaultOpen={defaultOpen}>{children}</AdminShell>;
}
