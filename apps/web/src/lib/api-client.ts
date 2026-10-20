import type { ApiErrorBody } from '@loan-portal/shared';
import { API_URL } from '@/config/env';

/** Thrown for every failed request: HTTP errors (status > 0) and network failures (status 0). */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    status: number,
    message: string,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFieldErrors(value: unknown): value is Record<string, string[]> {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (v) => Array.isArray(v) && v.every((m) => typeof m === 'string'),
    )
  );
}

/** Narrows an unknown JSON value to the server's error envelope. */
export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    isRecord(value) &&
    typeof value['statusCode'] === 'number' &&
    typeof value['message'] === 'string' &&
    (value['errors'] === undefined || isFieldErrors(value['errors']))
  );
}

/** Turns a failed `Response` into an `ApiError`, tolerating non-JSON bodies. */
export async function toApiError(res: Response): Promise<ApiError> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = undefined;
  }
  if (isApiErrorBody(body)) {
    return new ApiError(res.status, body.message, body.errors);
  }
  return new ApiError(res.status, res.statusText || 'Request failed');
}

let onUnauthorized: (() => void) | undefined;

/** Registered once by the app: called when any (non-opted-out) request gets a 401. */
export function setUnauthorizedHandler(handler: (() => void) | undefined) {
  onUnauthorized = handler;
}

export type RequestOptions = {
  headers?: Record<string, string>;
  params?: Record<string, string | number | undefined>;
  /** For requests where 401 is an expected answer (login, session probe). */
  skipUnauthorizedHandler?: boolean;
  signal?: AbortSignal;
};

function buildUrl(path: string, params?: RequestOptions['params']): string {
  // Resolved against the page origin so it also works outside a browser (tests).
  const url = new URL(`${API_URL}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function send(
  method: 'GET' | 'POST',
  path: string,
  body: unknown,
  options: RequestOptions,
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(buildUrl(path, options.params), {
      method,
      credentials: 'include',
      signal: options.signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      throw error;
    throw new ApiError(
      0,
      'Network error. Check your connection and try again.',
    );
  }

  if (!res.ok) {
    if (res.status === 401 && !options.skipUnauthorizedHandler)
      onUnauthorized?.();
    throw await toApiError(res);
  }
  return res;
}

/**
 * The only place that talks to `fetch`. Sends the httpOnly auth cookie. The
 * JSON body is returned typed as `T` straight from `Response.json()` (the
 * single typed parse point; the contract is the shared DTO package).
 */
export const apiClient = {
  async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const res = await send('GET', path, undefined, options);
    return res.json();
  },
  async post<T>(
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    const res = await send('POST', path, body, options);
    return res.json();
  },
  /** For endpoints that answer 204 No Content. */
  async postVoid(
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<void> {
    await send('POST', path, body, options);
  },
};
