const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface ApiFetchOptions extends RequestInit {
  /** Bearer token for authenticated requests. */
  token?: string;
}

export async function apiFetch<T>(
  path: string,
  { token, headers, ...init }: ApiFetchOptions = {},
): Promise<T> {
  if (!BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    next: init.next ?? { revalidate: 60 },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      (body && typeof body.detail === "string" && body.detail) ||
      `Request to ${path} failed with ${res.status}`;
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
