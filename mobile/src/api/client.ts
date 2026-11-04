/**
 * HTTP client with automatic JWT refresh.
 *
 * Design notes:
 * - A single axios instance owns the Authorization header so callers never
 *   touch tokens directly.
 * - On 401 we attempt exactly one refresh, "single-flight" so that N concurrent
 *   401s trigger one refresh, not N (a classic thundering-herd bug).
 * - If refresh fails, we hard-log-out and let the auth layer redirect to login.
 */
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';

import { tokenStorage, StoredTokens } from '@/auth/tokenStorage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = payload.code;
    this.details = payload.details;
  }
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler = () => {};

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorized = handler;
}

export const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the current access token to every outgoing request.
http.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const tokens = await tokenStorage.load();
  if (tokens?.access) {
    config.headers.set?.('Authorization', `Bearer ${tokens.access}`);
  }
  return config;
});

let refreshInFlight: Promise<StoredTokens> | null = null;

async function refreshTokens(): Promise<StoredTokens> {
  const stored = await tokenStorage.load();
  if (!stored?.refresh) throw new Error('no refresh token');
  // Dedicated bare client: avoid interceptor recursion on the refresh call.
  const resp = await axios.post<{ access: string; refresh?: string }>(
    `${BASE_URL}/api/v1/auth/refresh/`,
    { refresh: stored.refresh },
    { timeout: 15_000 },
  );
  const next: StoredTokens = {
    access: resp.data.access,
    refresh: resp.data.refresh ?? stored.refresh,
  };
  await tokenStorage.save(next);
  return next;
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retried) {
      original._retried = true;
      try {
        // Single-flight: reuse an in-progress refresh if one exists.
        refreshInFlight = refreshInFlight ?? refreshTokens().finally(() => {
          refreshInFlight = null;
        });
        const tokens = await refreshInFlight;
        original.headers = { ...original.headers, Authorization: `Bearer ${tokens.access}` };
        return http(original);
      } catch {
        await tokenStorage.clear();
        onUnauthorized();
        return Promise.reject(toApiError(error));
      }
    }
    return Promise.reject(toApiError(error));
  },
);

function toApiError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0;
  const data = error.response?.data as
    | { error?: ApiErrorPayload }
    | ApiErrorPayload
    | undefined;

  const envelope =
    data && typeof data === 'object' && 'error' in data
      ? (data as { error: ApiErrorPayload }).error
      : (data as ApiErrorPayload | undefined);

  return new ApiError(status, {
    code: envelope?.code ?? (status === 0 ? 'network_error' : 'unknown_error'),
    message:
      envelope?.message ??
      (status === 0 ? 'Could not reach the server. Check your connection.' : 'Request failed.'),
    details: envelope?.details,
  });
}
