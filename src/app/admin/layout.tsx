import { cookies } from "next/headers";

import { AdminShell } from "./admin-shell";
import { NAV_GROUP_COOKIE } from "./admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-read so the sidebar's collapsed/expanded state survives a reload
  // (the client-side SidebarProvider writes this cookie on every toggle), and
  // so the first paint shows the last group chosen (useNavGroup writes that).
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const initialGroup = cookieStore.get(NAV_GROUP_COOKIE)?.value;

  return (
    <AdminShell defaultOpen={defaultOpen} initialGroup={initialGroup}>
      {children}
    </AdminShell>
  );
}
