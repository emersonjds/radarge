import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../test/msw/server";
import { resetApiClient } from "@/shared/lib/api/instance";
import { getAccessToken, setAccessToken } from "@/shared/lib/api/token-store";
import { useSession } from "./use-session";

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

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", API_URL);
  resetApiClient();
  setAccessToken(null);
  replace.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("useSession", () => {
  it("reports loading while /auth/me is in flight, never anonymous", async () => {
    server.use(http.get("*/auth/me", () => HttpResponse.json(profile)));

    const { result } = renderHook(() => useSession(), { wrapper });

    expect(result.current.status).toBe("loading");
    expect(result.current.status).not.toBe("anonymous");

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.role).toBe("teacher");
  });

  it("survives a reload: with no token in memory it recovers through the refresh cookie", async () => {
    let sawAuthorization: string | null = "unset";
    let attempt = 0;

    server.use(
      http.get("*/auth/me", ({ request }) => {
        attempt += 1;
        sawAuthorization = request.headers.get("authorization");
        if (attempt === 1) {
          return HttpResponse.json({ code: "unauthorized", message: "no token" }, { status: 401 });
        }
        return HttpResponse.json(profile);
      }),
      http.post("*/auth/refresh", () =>
        HttpResponse.json({ accessToken: "renewed", expiresInSeconds: 900, profile }),
      ),
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(attempt).toBe(2);
    expect(sawAuthorization).toBe("Bearer renewed");
    expect(getAccessToken()).toBe("renewed");
  });

  it("is anonymous only once the refresh cookie has also failed", async () => {
    server.use(
      http.get("*/auth/me", () =>
        HttpResponse.json({ code: "unauthorized", message: "no token" }, { status: 401 }),
      ),
      http.post("*/auth/refresh", () =>
        HttpResponse.json({ code: "unauthorized", message: "no cookie" }, { status: 401 }),
      ),
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("anonymous"));
    expect(result.current.profile).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it("surfaces a provisional password without pretending the user is signed out", async () => {
    server.use(
      http.get("*/auth/me", () => HttpResponse.json({ ...profile, mustChangePassword: true })),
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.mustChangePassword).toBe(true);
  });

  it("drops the in-memory token on logout and sends the user to the login screen", async () => {
    server.use(
      http.get("*/auth/me", () => HttpResponse.json(profile)),
      http.post("*/auth/logout", () => new HttpResponse(null, { status: 204 })),
    );

    const { result } = renderHook(() => useSession(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    setAccessToken("live-token");
    result.current.logout();

    await waitFor(() => expect(getAccessToken()).toBeNull());
    expect(replace).toHaveBeenCalledWith("/login");
  });
});
