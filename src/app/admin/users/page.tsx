"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import {
  type AdminUser,
  type UserRole,
  type UserStatus,
  listUsers,
  updateUserRole,
  updateUserStatus,
} from "@/lib/api/admin/users";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";

import { AdminEmptyState, AdminErrorState, AdminLoadingState } from "../admin-states";
import { AdminPageHeader } from "../admin-page-header";
import { AdminStatusPill } from "../admin-status-pill";
import { AdminPagination } from "../admin-pagination";

const PAGE_SIZE = 20;

const roleOptions = [
  { value: "all", label: "All roles" },
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
];

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
];

// Suspended (admin-blocked) reads as the more severe state than a merely
// dormant inactive account, so it gets red while inactive gets amber.
type PendingAction =
  | { kind: "role"; user: AdminUser; value: UserRole }
  | { kind: "status"; user: AdminUser; value: UserStatus };

export default function AdminUsersPage() {
  const { token, user: currentAdmin } = useAuth();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [skip, setSkip] = useState(0);

  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset pagination when filters change, then reset the loading state once
  // the effective query (filters + skip) changes — the "adjust state during
  // render" pattern, not an effect (see laptops-browse.tsx).
  const filterSig = `${debouncedSearch}|${role}|${status}`;
  const [prevFilterSig, setPrevFilterSig] = useState(filterSig);
  if (filterSig !== prevFilterSig) {
    setPrevFilterSig(filterSig);
    setSkip(0);
  }

  const paramsSig = `${filterSig}|${skip}`;
  const [prevParamsSig, setPrevParamsSig] = useState(paramsSig);
  if (paramsSig !== prevParamsSig) {
    setPrevParamsSig(paramsSig);
    setUsers(null);
    setLoadError(null);
  }

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    listUsers(token, {
      search: debouncedSearch || undefined,
      role: role === "all" ? undefined : (role as UserRole),
      status: status === "all" ? undefined : (status as UserStatus),
      skip,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return;
        setUsers(res.items);
        setTotal(res.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Failed to load users.");
      });

    return () => {
      cancelled = true;
    };
  }, [token, debouncedSearch, role, status, skip, reloadTick]);

  async function confirmPending() {
    if (!pending || !token) return;
    setSaving(true);
    try {
      if (pending.kind === "role") {
        await updateUserRole(token, pending.user.id, pending.value);
        toast.success(`${pending.user.username} is now ${pending.value}.`);
      } else {
        await updateUserStatus(token, pending.user.id, pending.value);
        toast.success(`${pending.user.username} is now ${pending.value}.`);
      }
      setPending(null);
      setReloadTick((t) => t + 1);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Try again.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title="Users"
        description="Search accounts, change roles, and suspend or deactivate access."
      />

      <div className="border-line bg-surface flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search username or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select items={roleOptions} value={role} onValueChange={(v) => setRole(v as string)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {roleOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select items={statusOptions} value={status} onValueChange={(v) => setStatus(v as string)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {statusOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSearch("");
            setRole("all");
            setStatus("all");
          }}
        >
          Reset
        </Button>
      </div>

      <Card className="py-0">
        {loadError ? (
          <AdminErrorState message={loadError} onRetry={() => setReloadTick((t) => t + 1)} />
        ) : users === null ? (
          <AdminLoadingState />
        ) : users.length === 0 ? (
          <AdminEmptyState title="No users match these filters" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const isSelf = u.id === currentAdmin?.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <UserAvatar
                          userId={u.id}
                          username={u.username}
                          className="size-7 shrink-0 text-[13px]"
                        />
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {u.username}
                            {isSelf && (
                              <span className="ml-1.5 text-[12.5px] text-muted-foreground">
                                (you)
                              </span>
                            )}
                          </div>
                          <div className="truncate text-[12.5px] text-muted-foreground">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        title={
                          isSelf
                            ? "You can't change your own role. Ask another admin."
                            : undefined
                        }
                      >
                      <Select
                        items={[
                          { value: "user", label: "User" },
                          { value: "admin", label: "Admin" },
                        ]}
                        value={u.role}
                        disabled={isSelf}
                        onValueChange={(v) =>
                          setPending({ kind: "role", user: u, value: v as UserRole })
                        }
                      >
                        <SelectTrigger size="sm" className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        title={
                          isSelf
                            ? "You can't deactivate your own account. Ask another admin."
                            : undefined
                        }
                      >
                      <Select
                        items={[
                          { value: "active", label: "Active" },
                          { value: "inactive", label: "Inactive" },
                          { value: "suspended", label: "Suspended" },
                        ]}
                        value={u.status}
                        disabled={isSelf}
                        onValueChange={(v) =>
                          setPending({ kind: "status", user: u, value: v as UserStatus })
                        }
                      >
                        <SelectTrigger size="sm" className="w-32">
                          <AdminStatusPill kind="userStatus" value={u.status} className="mr-1" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      </span>
                    </TableCell>
                    <TableCell>{u.is_verified ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("en-MY", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <AdminPagination
        page={Math.floor(skip / PAGE_SIZE) + 1}
        pageSize={PAGE_SIZE}
        total={total}
        onPageChange={(p) => setSkip((p - 1) * PAGE_SIZE)}
      />

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.kind === "role" ? "Change role?" : "Change account status?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending &&
                (pending.kind === "role"
                  ? `Make ${pending.user.username} ${pending.value === "admin" ? "an admin" : "a regular user"}?`
                  : `Set ${pending.user.username}'s account to ${pending.value}? ${
                      pending.value === "active"
                        ? "They'll be able to log in again."
                        : "They won't be able to log in until this is reverted."
                    }`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPending} disabled={saving}>
              {saving ? "Saving…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
