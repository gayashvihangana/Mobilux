export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

type ApiError = {
  message?: string;
};

async function parseError(response: Response) {
  try {
    const data = (await response.json()) as ApiError;
    if (data?.message) {
      return data.message;
    }
  } catch {
    return "Request failed";
  }
  return `Request failed (${response.status})`;
}

const AUTH_PATHS = new Set(["/api/auth/login", "/api/auth/signup", "/api/auth/logout", "/api/auth/me"]);

async function handleUnauthorized(path: string) {
  if (AUTH_PATHS.has(path)) {
    return;
  }
  try {
    await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
  } catch {
    // Ignore logout failures and still redirect.
  }
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 401 || response.status === 403) {
    await handleUnauthorized(path);
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}
