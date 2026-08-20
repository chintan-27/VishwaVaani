import type { paths } from "@/lib/api/schema";

export type ApiPaths = paths;

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/v1";
const accessTokenKey = "vishwavaani_access_token";

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    request_id: string;
    retry_after_seconds?: number;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function setAccessToken(token: string): void {
  window.localStorage.setItem(accessTokenKey, token);
}

export function clearAccessToken(): void {
  window.localStorage.removeItem(accessTokenKey);
}

export function getAccessToken(): string | null {
  return typeof window === "undefined" ? null : window.localStorage.getItem(accessTokenKey);
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit & { idempotencyKey?: string },
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  // Leave FormData bodies alone: fetch sets the multipart Content-Type (with boundary) itself,
  // and overriding it here would drop the boundary and break the server's multipart parser.
  if (init?.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (init?.idempotencyKey) headers.set("Idempotency-Key", init.idempotencyKey);
  const accessToken = getAccessToken();
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorEnvelope | null;
    throw new ApiError(
      payload?.error.message ?? "VishwaVaani could not complete that request.",
      payload?.error.code ?? "request_failed",
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
