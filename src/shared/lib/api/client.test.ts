import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../test/msw/server";
import { createApiClient } from "./client";
import { ApiError, NetworkError, SessionEndedError } from "./errors";
import { getAccessToken, setAccessToken } from "./token-store";

const API_URL = "http://api.test";

const profile = {
  id: "profile-1",
  name: "Ana Professora",
  username: "ana",
  role: "teacher",
  email: null,
  jobTitle: null,
  mustChangePassword: false,
};

const session = { accessToken: "renewed-token", expiresInSeconds: 900, profile };

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", API_URL);
  setAccessToken(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createApiClient", () => {
  it("fails at construction when NEXT_PUBLIC_API_URL is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");

    expect(() => createApiClient()).toThrow(/NEXT_PUBLIC_API_URL/);
  });

  it("sends the Authorization header only once a token is set", async () => {
    let receivedAuthorization: string | null = null;
    server.use(
      http.get("*/auth/me", ({ request }) => {
        receivedAuthorization = request.headers.get("authorization");
        return HttpResponse.json(profile);
      }),
    );

    const client = createApiClient();
    await client.request("/auth/me");
    expect(receivedAuthorization).toBeNull();

    setAccessToken("caller-token");
    await client.request("/auth/me");
    expect(receivedAuthorization).toBe("Bearer caller-token");
  });

  it("returns typed data on the happy path", async () => {
    server.use(http.get("*/auth/me", () => HttpResponse.json(profile)));

    const client = createApiClient();
    const result = await client.request<typeof profile>("/auth/me");

    expect(result).toEqual(profile);
  });

  it("throws ApiError with the server's code on a typed error response", async () => {
    server.use(
      http.post("*/students", () =>
        HttpResponse.json({ code: "validation_error", message: "birthDate is invalid" }, { status: 422 }),
      ),
    );

    const client = createApiClient();
    const failure = client.request("/students", { method: "POST", body: {} });

    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({ code: "validation_error" });
  });

  it("throws NetworkError when the response carries no usable body", async () => {
    server.use(http.get("*/students", () => new HttpResponse(null, { status: 500 })));

    const client = createApiClient();
    await expect(client.request("/students")).rejects.toBeInstanceOf(NetworkError);
  });

  it("dedupes three concurrent 401s into a single refresh call", async () => {
    let refreshCount = 0;
    let sessionRenewed = false;

    server.use(
      http.get("*/students", () =>
        sessionRenewed
          ? HttpResponse.json([{ id: "s1" }])
          : HttpResponse.json({ code: "unauthorized", message: "expired" }, { status: 401 }),
      ),
      http.post("*/auth/refresh", () => {
        refreshCount += 1;
        sessionRenewed = true;
        return HttpResponse.json(session);
      }),
    );

    const client = createApiClient();
    const results = await Promise.all([
      client.request("/students"),
      client.request("/students"),
      client.request("/students"),
    ]);

    expect(refreshCount).toBe(1);
    expect(results).toHaveLength(3);
    expect(getAccessToken()).toBe("renewed-token");
  });

  it("ends the session when the refresh itself fails", async () => {
    server.use(
      http.get("*/students", () =>
        HttpResponse.json({ code: "unauthorized", message: "expired" }, { status: 401 }),
      ),
      http.post("*/auth/refresh", () =>
        HttpResponse.json({ code: "unauthorized", message: "no valid refresh cookie" }, { status: 401 }),
      ),
    );

    const client = createApiClient();
    await expect(client.request("/students")).rejects.toBeInstanceOf(SessionEndedError);
    expect(getAccessToken()).toBeNull();
  });
});
