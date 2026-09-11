import type { components } from "../../api/schema.d.ts";
import { ApiError, NetworkError, SessionEndedError } from "./errors";
import { getAccessToken, setAccessToken } from "./token-store";

type Session = components["schemas"]["Session"];
type ErrorBody = components["schemas"]["ErrorInput"];

const AUTH_ENDPOINTS_WITHOUT_REFRESH = new Set(["/auth/login", "/auth/refresh"]);

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

export interface ApiClient {
  request: <TResponse>(path: string, options?: RequestOptions) => Promise<TResponse>;
}

export interface CreateApiClientOptions {
  /** Injectable so a Node script (no browser cookie jar) can wrap it with one. */
  fetch?: typeof fetch;
}

const readBaseUrl = (): string => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not set");
  }

  return baseUrl;
};

const readJson = async <TValue>(response: Response): Promise<TValue> => {
  try {
    return (await response.json()) as TValue;
  } catch (cause) {
    throw new NetworkError(cause);
  }
};

const isErrorBody = (value: unknown): value is ErrorBody =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { code?: unknown }).code === "string" &&
  typeof (value as { message?: unknown }).message === "string";

export const createApiClient = (options: CreateApiClientOptions = {}): ApiClient => {
  const baseUrl = readBaseUrl();
  const runFetch = options.fetch ?? fetch;
  let refreshInFlight: Promise<boolean> | null = null;

  const performRefresh = async (): Promise<boolean> => {
    let response: Response;

    try {
      response = await runFetch(`${baseUrl}/auth/refresh`, { method: "POST", credentials: "include" });
    } catch {
      setAccessToken(null);
      return false;
    }

    if (!response.ok) {
      setAccessToken(null);
      return false;
    }

    const session = await readJson<Session>(response);
    setAccessToken(session.accessToken);
    return true;
  };

  // Every call that hits a 401 while a refresh is already running awaits this
  // same promise instead of starting its own — the single-flight refresh.
  const refreshOnce = async (): Promise<boolean> => {
    refreshInFlight ??= performRefresh();

    try {
      return await refreshInFlight;
    } finally {
      refreshInFlight = null;
    }
  };

  const send = async <TResponse>(
    path: string,
    requestOptions: RequestOptions,
    hasRetriedAfterRefresh: boolean,
  ): Promise<TResponse> => {
    const headers = new Headers();
    const token = getAccessToken();

    // Only when something is actually sent: Fastify rejects a request that
    // announces JSON and carries no body, which is every bodyless POST here.
    if (requestOptions.body !== undefined) headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);

    let response: Response;

    try {
      response = await runFetch(`${baseUrl}${path}`, {
        method: requestOptions.method ?? "GET",
        headers,
        credentials: "include",
        body: requestOptions.body === undefined ? undefined : JSON.stringify(requestOptions.body),
        signal: requestOptions.signal,
      });
    } catch (cause) {
      throw new NetworkError(cause);
    }

    if (response.status === 401 && !AUTH_ENDPOINTS_WITHOUT_REFRESH.has(path)) {
      if (hasRetriedAfterRefresh || !(await refreshOnce())) {
        throw new SessionEndedError();
      }

      return send<TResponse>(path, requestOptions, true);
    }

    if (response.status === 204) return undefined as TResponse;

    if (response.ok) return readJson<TResponse>(response);

    const body = await readJson<unknown>(response);

    if (!isErrorBody(body)) {
      throw new NetworkError(new Error("response carried no usable error body"));
    }

    throw new ApiError(body.code, body.message);
  };

  return { request: (path, requestOptions = {}) => send(path, requestOptions, false) };
};
