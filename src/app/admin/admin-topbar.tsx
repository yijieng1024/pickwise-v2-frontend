"use client";

import Link from "next/link";
import { ArrowLeft, LogOut, Moon, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/lib/auth-context";

export function AdminTopbar() {
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  if (!user) return null;

  return (
    <header className="border-line bg-surface flex h-14 shrink-0 items-center justify-end gap-1 border-b px-4">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Toggle theme"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      >
        <Sun className="size-4 dark:hidden" />
        <Moon className="hidden size-4 dark:block" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account"
          className="ml-1 flex h-8 w-8 items-center justify-center rounded-full border-0 bg-transparent"
        >
          <UserAvatar userId={user.id} username={user.username} className="h-8 w-8 text-xs" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-48">
          <DropdownMenuItem render={<Link href="/profile" />}>
            <User className="size-3.5" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/" />}>
            <ArrowLeft className="size-3.5" />
            Back to site
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={logout}>
            <LogOut className="size-3.5" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
