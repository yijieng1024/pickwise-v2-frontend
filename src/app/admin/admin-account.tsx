"use client";

import Link from "next/link";
import { ChevronsUpDown, LogOut, Moon, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/lib/auth-context";

/**
 * The two controls that used to sit in the admin topbar, now in the sidebar
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

/** Avatar + username; opens Profile / Log out. Collapsed, it is just the avatar. */
export function AccountItem() {
  const { user, logout } = useAuth();
  const { state, isMobile } = useSidebar();
  if (!user) return null;
  const collapsed = state === "collapsed" && !isMobile;

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <SidebarMenuButton
          size="lg"
          render={<DropdownMenuTrigger />}
          tooltip={user.username}
          aria-label="Account"
          className="data-popup-open:bg-sidebar-accent"
        >
          <UserAvatar userId={user.id} username={user.username} className="size-8 shrink-0 text-xs" />
          <span className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold">
            {user.username}
          </span>
          <ChevronsUpDown className="text-muted-foreground ml-auto size-4" />
        </SidebarMenuButton>
        <DropdownMenuContent
          side={collapsed ? "right" : "top"}
          align={collapsed ? "end" : "start"}
          sideOffset={8}
          className="w-52"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="truncate">{user.username}</DropdownMenuLabel>
            <DropdownMenuItem render={<Link href="/profile" />}>
              <User />
              Profile
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={logout}>
            <LogOut />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
