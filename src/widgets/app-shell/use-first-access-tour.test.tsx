import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../test/msw/server";
import { useSession } from "@/features/session/use-session";
import { resetApiClient } from "@/shared/lib/api/instance";
import { SidebarProvider, useSidebar } from "@tailadmin/context/SidebarContext";
import { useFirstAccessTour } from "./use-first-access-tour";

const runProductTour = vi.fn();
vi.mock("@/features/product-tour", () => ({
  runProductTour: (options: unknown) => runProductTour(options),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const profile = {
  id: "profile-1",
  name: "Ana Professora",
  username: "ana",
  role: "teacher",
  email: null,
  jobTitle: null,
  mustChangePassword: false,
  tourCompleted: false,
};

let completeCalls = 0;

const serve = (overrides: Partial<typeof profile>, completeStatus = 204) => {
  server.use(
    http.get("*/auth/me", () => HttpResponse.json({ ...profile, ...overrides })),
    http.post("*/auth/me/tour-completed", () => {
      completeCalls += 1;
      return completeStatus === 204
        ? new HttpResponse(null, { status: 204 })
        : HttpResponse.json({ code: "internal", message: "boom" }, { status: completeStatus });
    }),
  );
};

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>{children}</SidebarProvider>
    </QueryClientProvider>
  );
};

const renderTour = () =>
  renderHook(() => ({ tour: useFirstAccessTour(), session: useSession(), sidebar: useSidebar() }), {
    wrapper,
  });

const lastOnDone = (): (() => void) => runProductTour.mock.lastCall?.[0].onDone;

const stubMobile = (matches: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({ matches, media: query }));

beforeEach(() => {
  resetApiClient();
  runProductTour.mockReset();
  completeCalls = 0;
  stubMobile(false);
});

describe("useFirstAccessTour", () => {
  it("starts once for a profile that has not seen the tour", async () => {
    serve({});
    const { result, rerender } = renderTour();

    await waitFor(() => expect(runProductTour).toHaveBeenCalledTimes(1));
    rerender();

    expect(runProductTour).toHaveBeenCalledTimes(1);
    expect(runProductTour.mock.lastCall?.[0].role).toBe("teacher");
    expect(result.current.session.status).toBe("authenticated");
  });

  it("never starts for a profile that has seen it", async () => {
    serve({ tourCompleted: true });
    const { result } = renderTour();

    await waitFor(() => expect(result.current.session.status).toBe("authenticated"));
    expect(runProductTour).not.toHaveBeenCalled();
  });

  it("never starts while the password is still provisional", async () => {
    serve({ mustChangePassword: true });
    const { result } = renderTour();

    await waitFor(() => expect(result.current.session.status).toBe("authenticated"));
    expect(runProductTour).not.toHaveBeenCalled();
  });

  it("marks the tour complete when it closes", async () => {
    serve({});
    const { result } = renderTour();
    await waitFor(() => expect(runProductTour).toHaveBeenCalled());

    act(() => lastOnDone()());

    await waitFor(() => expect(completeCalls).toBe(1));
    expect(result.current.session.profile?.tourCompleted).toBe(true);
  });

  it("swallows a failing complete call", async () => {
    serve({}, 500);
    renderTour();
    await waitFor(() => expect(runProductTour).toHaveBeenCalled());

    act(() => lastOnDone()());

    await waitFor(() => expect(completeCalls).toBe(1));
  });

  it("replays without marking anything", async () => {
    serve({ tourCompleted: true });
    const { result } = renderTour();
    await waitFor(() => expect(result.current.session.status).toBe("authenticated"));

    act(() => result.current.tour.replay());
    act(() => lastOnDone()());

    expect(runProductTour).toHaveBeenCalledTimes(1);
    expect(completeCalls).toBe(0);
  });

  it("opens the mobile sidebar for the tour and closes it after", async () => {
    stubMobile(true);
    serve({ tourCompleted: true });
    const { result } = renderTour();
    await waitFor(() => expect(result.current.session.status).toBe("authenticated"));

    act(() => result.current.tour.replay());
    expect(result.current.sidebar.isMobileOpen).toBe(true);

    act(() => lastOnDone()());
    expect(result.current.sidebar.isMobileOpen).toBe(false);
  });
});
