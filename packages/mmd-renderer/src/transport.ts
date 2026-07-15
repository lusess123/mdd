import type { MmdAuthConfig, MmdApiConfig } from "./config";
import type { MmdRequest } from "./client";

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export class MmdRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "MmdRequestError";
  }
}

export function localizeMmdRequestError(
  error: MmdRequestError,
  translate: (key: string) => string,
): MmdRequestError {
  if (!error.code) return error;

  const key = `errors.code.${error.code}`;
  const message = translate(key);
  if (message !== key) error.message = message;
  return error;
}

export function joinMmdUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => undefined)) as
    | (T & ApiErrorBody)
    | undefined;
  if (!response.ok) {
    throw new MmdRequestError(
      body?.error?.message ?? `HTTP ${response.status}`,
      response.status,
      body?.error?.code,
      body?.error?.details,
    );
  }
  return body as T;
}

export interface FetchMmdRequestOptions {
  api: MmdApiConfig;
  auth: MmdAuthConfig;
  fetch?: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>;
}

export function createFetchMmdRequest({
  api,
  auth,
  fetch: fetchImplementation = globalThis.fetch,
}: FetchMmdRequestOptions): MmdRequest {
  return async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), api.timeoutMs);
    const signal = init.signal
      ? AbortSignal.any([init.signal, controller.signal])
      : controller.signal;
    try {
      const headers = new Headers(api.headers);
      new Headers(await auth.getHeaders?.()).forEach((value, key) =>
        headers.set(key, value),
      );
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
      if (init.body && !headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }
      const token =
        auth.mode === "custom" ? await auth.getToken?.() : undefined;
      if (token && !headers.has("authorization")) {
        headers.set("authorization", `Bearer ${token}`);
      }

      const response = await fetchImplementation(joinMmdUrl(api.baseUrl, path), {
        ...init,
        credentials: api.credentials,
        headers,
        signal,
      });
      return await parseResponse<T>(response);
    } finally {
      clearTimeout(timeout);
    }
  };
}
