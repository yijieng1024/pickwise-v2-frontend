"use client";

import Link from "next/link";
import { LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/lib/auth-context";

/**
 * The controls that used to sit in the admin topbar, now in the sidebar
 * island's footer (there is no topbar on desktop any more).
 */

export function ThemeToggleItem() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const label = dark ? "Light mode" : "Dark mode";
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => setTheme(dark ? "light" : "dark")}
        tooltip={label}
        aria-label={label}
      >
        {/* CSS-driven, like the old topbar button: right icon on first paint
            even before next-themes has resolved the theme on the client. */}
        <Moon className="dark:hidden" />
        <Sun className="hidden dark:block" />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/** Avatar + username, straight to Profile. Collapsed, it is just the avatar. */
export function AccountItem() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton size="lg" render={<Link href="/profile" />} tooltip="Profile">
        <UserAvatar userId={user.id} username={user.username} className="size-8 shrink-0 text-xs" />
        <span className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold">
          {user.username}
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function LogoutItem() {
  const { logout } = useAuth();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={logout}
        tooltip="Log out"
        className="text-destructive hover:text-destructive"
      >
        <LogOut />
        <span>Log out</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
