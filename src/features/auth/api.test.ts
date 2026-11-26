import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../test/msw/server";
import { ApiError } from "@/shared/lib/api/errors";
import { resetApiClient } from "@/shared/lib/api/instance";
import { getAccessToken, setAccessToken } from "@/shared/lib/api/token-store";
import { changePassword, completeTour, signIn, signOut } from "./api";

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

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", API_URL);
  resetApiClient();
  setAccessToken(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("signIn", () => {
  it("keeps the access token in memory and returns the profile", async () => {
    server.use(
      http.post("*/auth/login", () =>
        HttpResponse.json({ accessToken: "fresh-token", expiresInSeconds: 900, profile }),
      ),
    );

    const result = await signIn({ username: "ana", password: "a-long-password" });

    expect(result).toEqual(profile);
    expect(getAccessToken()).toBe("fresh-token");
  });

  it("reports a rejected credential as a typed error and stores nothing", async () => {
    server.use(
      http.post("*/auth/login", () =>
        HttpResponse.json({ code: "unauthorized", message: "bad credentials" }, { status: 401 }),
      ),
    );

    await expect(signIn({ username: "ana", password: "wrong" })).rejects.toBeInstanceOf(ApiError);
    expect(getAccessToken()).toBeNull();
  });
});

describe("signOut", () => {
  it("drops the token even when the request itself fails", async () => {
    setAccessToken("live-token");
    server.use(http.post("*/auth/logout", () => HttpResponse.error()));

    await expect(signOut()).rejects.toThrow();
    expect(getAccessToken()).toBeNull();
  });
});

describe("completeTour", () => {
  it("posts to the tour route with no body and no Content-Type", async () => {
    let sent: { method: string; contentType: string | null; body: string } | null = null;
    server.use(
      http.post("*/auth/me/tour-completed", async ({ request }) => {
        sent = {
          method: request.method,
          contentType: request.headers.get("content-type"),
          body: await request.text(),
        };
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await completeTour();

    expect(sent).toEqual({ method: "POST", contentType: null, body: "" });
  });
});

describe("changePassword", () => {
  it("drops the token, because the API revokes this session along with the others", async () => {
    setAccessToken("live-token");
    server.use(http.post("*/auth/change-password", () => new HttpResponse(null, { status: 204 })));

    await changePassword({ currentPassword: "old-password", newPassword: "new-password" });

    expect(getAccessToken()).toBeNull();
  });

  it("leaves the session alone when the API rejects the change", async () => {
    setAccessToken("live-token");
    server.use(
      http.post("*/auth/change-password", () =>
        HttpResponse.json({ code: "validation_failed", message: "too short" }, { status: 422 }),
      ),
    );

    await expect(
      changePassword({ currentPassword: "old-password", newPassword: "short" }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(getAccessToken()).toBe("live-token");
  });
});
