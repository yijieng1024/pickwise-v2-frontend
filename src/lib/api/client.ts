const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/** Exposed for building direct asset URLs (e.g. the avatar gateway). */
export const API_BASE_URL = BASE_URL;

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

  // FormData bodies must NOT get a manual Content-Type — the browser sets
  // multipart/form-data with the boundary itself.
  const isFormData = init.body instanceof FormData;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    next: init.next ?? { revalidate: 60 },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    let message = `Request to ${path} failed with ${res.status}`;
    if (body && typeof body.detail === "string") {
      message = body.detail;
    } else if (body && Array.isArray(body.detail)) {
      // FastAPI/Pydantic validation errors: detail is a list of {msg, ...}.
      const msgs = (body.detail as Array<{ msg?: string }>)
        .map((d) => d.msg)
        .filter(Boolean);
      if (msgs.length > 0) message = msgs.join(" ");
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
