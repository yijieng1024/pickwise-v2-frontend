"use client";

import Link from "next/link";
import { ArrowLeft, LogOut, Moon, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserAvatar } from "@/components/user-avatar";
import { jobTypeLabel } from "@/lib/api/admin/jobs";
import { useActiveJobs } from "@/lib/admin/use-job";
import { useAuth } from "@/lib/auth-context";

/**
 * Background jobs outlive the screen that started them, so the fact that one
 * is running has to live in the chrome rather than on a single page.
 */
function ActiveJobIndicator() {
  const { token } = useAuth();
  const { count, firstJob } = useActiveJobs(token);

  if (count === 0) return null;

  const label =
    count === 1 && firstJob
      ? `${jobTypeLabel(firstJob.job_type)} · ${firstJob.progress_percentage}%`
      : `${count} jobs running`;

  return (
    <Button
      variant="ghost"
      size="sm"
      // Rendering as an anchor, so Base UI must not assume a native <button>.
      render={<Link href="/admin/jobs" />}
      nativeButton={false}
      className="text-brand hover:text-brand bg-brand-tint hover:bg-brand-tint/70 gap-2 rounded-full"
    >
      <span
        className="bg-brand size-1.5 shrink-0 rounded-full motion-safe:animate-pulse"
        aria-hidden
      />
      <span className="max-w-56 truncate tabular-nums">{label}</span>
    </Button>
  );
}

export function AdminTopbar() {
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  if (!user) return null;

  return (
    <header className="border-line bg-surface flex h-14 shrink-0 items-center gap-1 border-b px-4">
      {/* The sidebar collapses to a Sheet on mobile, so its own header trigger
          is unreachable there — this is the one that always stays visible. */}
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-1 ml-1 h-5" />

      <ActiveJobIndicator />

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Toggle theme"
        className="ml-auto"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      >
        <Sun className="dark:hidden" />
        <Moon className="hidden dark:block" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account"
          className="ml-1 flex size-8 items-center justify-center rounded-full border-0 bg-transparent"
        >
          <UserAvatar userId={user.id} username={user.username} className="size-8 text-xs" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-48">
          <DropdownMenuGroup>
            <DropdownMenuItem render={<Link href="/profile" />}>
              <User />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/" />}>
              <ArrowLeft />
              Back to site
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={logout}>
            <LogOut />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
