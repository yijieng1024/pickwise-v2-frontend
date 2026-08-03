import { apiFetch } from "@/lib/api/client";

export type UserStatus = "active" | "inactive" | "suspended";
export type UserRole = "user" | "admin";

/** Mirrors the backend's `UserAdminRead` schema (GET /users, GET /users/{id}). */
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  status: UserStatus;
  is_verified: boolean;
  auth_provider: string;
  created_at: string;
}

/** Mirrors the backend's `UserListResponse` schema. */
export interface AdminUserListResponse {
  total: number;
  items: AdminUser[];
}

export interface ListUsersParams {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  skip?: number;
  limit?: number;
}

export function listUsers(
  token: string,
  params: ListUsersParams = {},
): Promise<AdminUserListResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.role) query.set("role", params.role);
  if (params.status) query.set("status", params.status);
  query.set("skip", String(params.skip ?? 0));
  query.set("limit", String(params.limit ?? 50));

  return apiFetch<AdminUserListResponse>(`/users?${query.toString()}`, {
    token,
    next: { revalidate: 0 },
  });
}

export function getUser(token: string, id: string): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/users/${id}`, {
    token,
    next: { revalidate: 0 },
  });
}

export function updateUserRole(
  token: string,
  id: string,
  role: UserRole,
): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/users/${id}/role`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ role }),
    next: { revalidate: 0 },
  });
}

export function updateUserStatus(
  token: string,
  id: string,
  status: UserStatus,
): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/users/${id}/status`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ status }),
    next: { revalidate: 0 },
  });
}
