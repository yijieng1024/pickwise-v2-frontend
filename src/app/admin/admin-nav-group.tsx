"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronsUpDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import { NAV_GROUP_COOKIE, type NavGroup, groupFor, navGroupById, navGroups } from "./admin-nav";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Which group the sidebar shows. The page wins over the cookie: opening a page
 * from anywhere (link, URL, breadcrumb) switches to its group. Pinned pages
 * (Dashboard, Jobs) belong to no group and keep whatever was shown last.
 *
 * `initialId` is the cookie, read server-side in layout.tsx so the first
 * paint already shows the right group.
 */
export function useNavGroup(initialId: string | undefined): [NavGroup, (id: string) => void] {
  const pathname = usePathname();
  const [groupId, setGroupId] = useState(
    () => groupFor(pathname)?.id ?? navGroupById(initialId)?.id ?? navGroups[0].id,
  );

  // "Adjust state during render", not an effect (see laptops-browse.tsx).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    const pageGroup = groupFor(pathname);
    if (pageGroup && pageGroup.id !== groupId) setGroupId(pageGroup.id);
  }

  useEffect(() => {
    document.cookie = `${NAV_GROUP_COOKIE}=${groupId}; path=/; max-age=${COOKIE_MAX_AGE}`;
  }, [groupId]);

  return [navGroupById(groupId) ?? navGroups[0], setGroupId];
}

/**
 * The group switcher. One DropdownMenu for both sidebar modes: expanded it is a
 * full-width row ("Data Collect ⇅"); on the collapsed icon rail the same button
 * shrinks to the group's icon (with a tooltip) and the menu opens to the right.
 * Choosing a group only changes which pages are listed — it never navigates.
 */
export function NavGroupSwitcher({
  group,
  onChange,
}: {
  group: NavGroup;
  onChange: (id: string) => void;
}) {
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const Icon = group.icon;

  return (
    <DropdownMenu>
      <SidebarMenuButton
        render={<DropdownMenuTrigger />}
        tooltip={`${group.label} — switch group`}
        aria-label={`Section: ${group.label}. Switch section`}
        className="border-line bg-surface data-popup-open:bg-surface-2 border font-semibold"
      >
        <Icon />
        <span className="truncate">{group.label}</span>
        <ChevronsUpDown className="text-muted-foreground ml-auto" />
      </SidebarMenuButton>
      <DropdownMenuContent
        side={collapsed ? "right" : "bottom"}
        align="start"
        className={cn("duration-200", collapsed && "w-52")}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>Section</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={group.id} onValueChange={(v) => onChange(v as string)}>
            {navGroups.map((g) => {
              const GroupIcon = g.icon;
              // closeOnClick: Base UI keeps a menu open after a radio pick by
              // default; here a pick is the whole interaction.
              return (
                <DropdownMenuRadioItem key={g.id} value={g.id} closeOnClick>
                  <GroupIcon />
                  {g.label}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
