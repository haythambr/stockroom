import type { Tokens } from './types';

/**
 * Talks to the Stockroom API.
 *
 * The access token (15 minutes) lives only in memory. The refresh token is kept in
 * localStorage so a page reload keeps you signed in. When a request comes back 401, the client
 * swaps the refresh token for a new pair once and retries. If several requests fail at the same
 * moment they share that one refresh, because the API only accepts each refresh token once.
 */

const REFRESH_KEY = 'stockroom.refreshToken';
export const API_BASE = '/api';

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;
let onSignedOut: () => void = () => {};

export function setSignedOutHandler(handler: () => void): void {
  onSignedOut = handler;
}

export function storeTokens(tokens: Tokens | null): void {
  accessToken = tokens?.accessToken ?? null;
  try {
    if (tokens) {
      localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    } else {
      localStorage.removeItem(REFRESH_KEY);
    }
  } catch {
    // Private mode or blocked storage: the session simply won't survive a reload.
  }
}

export function storedRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

/** Swap the refresh token for a new pair. Shared by every caller while it runs. */
export function refreshTokens(): Promise<boolean> {
  refreshing ??= (async () => {
    const refreshToken = storedRefreshToken();
    if (!refreshToken) {
      return false;
    }
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        storeTokens(null);
        return false;
      }
      storeTokens((await res.json()) as Tokens);
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshing = null;
  });

  return refreshing;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function api<T>(
  method: Method,
  path: string,
  body?: unknown,
  retried = false,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !retried && !path.startsWith('/auth/')) {
    if (await refreshTokens()) {
      return api<T>(method, path, body, true);
    }
    onSignedOut();
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const raw = (data as { message?: string | string[] } | null)?.message;
    const message = Array.isArray(raw)
      ? raw.join(' ')
      : (raw ?? `Request failed (${res.status})`);
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

export const get = <T>(path: string) => api<T>('GET', path);
export const post = <T>(path: string, body?: unknown) =>
  api<T>('POST', path, body ?? {});
export const put = <T>(path: string, body?: unknown) =>
  api<T>('PUT', path, body ?? {});
export const patch = <T>(path: string, body?: unknown) =>
  api<T>('PATCH', path, body ?? {});
export const del = <T>(path: string) => api<T>('DELETE', path);

/** Build a query string, dropping empty values. */
export function qs(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}
