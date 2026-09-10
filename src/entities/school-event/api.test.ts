import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { server } from "../../test/msw/server";
import { resetApiClient } from "@/shared/lib/api/instance";
import { createSchoolEvent, deleteSchoolEvent, fetchSchoolEvents, updateSchoolEvent } from "./api";

const schoolEvent = {
  id: "school-event-1",
  type: "vacation",
  title: "Recesso de julho",
  startDate: "2026-07-01",
  endDate: "2026-07-15",
};

beforeEach(() => {
  resetApiClient();
});

describe("school events against the API", () => {
  it("lists what the API returns", async () => {
    server.use(http.get("*/school-events", () => HttpResponse.json([schoolEvent])));

    await expect(fetchSchoolEvents()).resolves.toEqual([schoolEvent]);
  });

  it("sends the calendar entry as the contract describes it", async () => {
    let received: unknown = null;
    server.use(
      http.post("*/school-events", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json(schoolEvent, { status: 201 });
      }),
    );

    await createSchoolEvent({
      type: "makeup",
      title: "Reposição de aula",
      startDate: "2026-08-10",
      endDate: "2026-08-10",
    });

    expect(received).toEqual({
      type: "makeup",
      title: "Reposição de aula",
      startDate: "2026-08-10",
      endDate: "2026-08-10",
    });
  });

  it("patches only what changed", async () => {
    let received: unknown = null;
    server.use(
      http.patch("*/school-events/school-event-1", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ ...schoolEvent, title: "Recesso" });
      }),
    );

    await updateSchoolEvent("school-event-1", { title: "Recesso" });

    expect(received).toEqual({ title: "Recesso" });
  });

  it("treats the 204 on delete as success", async () => {
    server.use(
      http.delete("*/school-events/school-event-1", () => new HttpResponse(null, { status: 204 })),
    );

    await expect(deleteSchoolEvent("school-event-1")).resolves.toBeUndefined();
  });
});
