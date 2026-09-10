import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { server } from "../../test/msw/server";
import { resetApiClient } from "@/shared/lib/api/instance";
import { createEvent, deleteEvent, fetchEventsByGroup, updateEvent } from "./api";
import { setParticipation } from "@/entities/event-participation/api";

const GROUP_ID = "11111111-1111-4111-8111-111111111111";
const EVENT_ID = "22222222-2222-4222-8222-222222222222";
const STUDENT_ID = "33333333-3333-4333-8333-333333333333";

const event = {
  id: EVENT_ID,
  groupId: GROUP_ID,
  title: "Feira de Ciências",
  date: "2026-09-20",
  location: "Centro de Convenções",
  cost: 15.5,
};

beforeEach(() => {
  resetApiClient();
});

describe("events against the API", () => {
  it("asks the server to filter by group instead of pulling every event", async () => {
    let query = "";
    server.use(
      http.get("*/events", ({ request }) => {
        query = new URL(request.url).search;
        return HttpResponse.json([event]);
      }),
    );

    await expect(fetchEventsByGroup(GROUP_ID)).resolves.toEqual([event]);
    expect(query).toBe(`?groupId=${GROUP_ID}`);
  });

  it("sends the outing as the contract describes it", async () => {
    let received: unknown = null;
    server.use(
      http.post("*/events", async ({ request }) => {
        received = await request.json();
        return HttpResponse.json(event, { status: 201 });
      }),
    );

    await createEvent({
      groupId: GROUP_ID,
      title: "Feira de Ciências",
      date: "2026-09-20",
      location: "Centro de Convenções",
      cost: 15.5,
    });

    expect(received).toEqual({
      groupId: GROUP_ID,
      title: "Feira de Ciências",
      date: "2026-09-20",
      location: "Centro de Convenções",
      cost: 15.5,
    });
  });

  it("surfaces a same-title-same-day clash as the API's conflict", async () => {
    server.use(
      http.post("*/events", () =>
        HttpResponse.json({ code: "conflict", message: "duplicate" }, { status: 409 }),
      ),
    );

    const failure = createEvent({
      groupId: GROUP_ID,
      title: "Feira de Ciências",
      date: "2026-09-20",
      location: "Centro de Convenções",
      cost: 0,
    });

    await expect(failure).rejects.toMatchObject({ code: "conflict" });
  });

  it("patches only what changed", async () => {
    let received: unknown = null;
    server.use(
      http.patch(`*/events/${EVENT_ID}`, async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ ...event, cost: 0 });
      }),
    );

    await updateEvent(EVENT_ID, { cost: 0 });

    expect(received).toEqual({ cost: 0 });
  });

  it("lets the API cascade the marks instead of deleting them here", async () => {
    const touched: string[] = [];
    server.use(
      http.delete("*/events/*", ({ request }) => {
        touched.push(new URL(request.url).pathname);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await deleteEvent(EVENT_ID);

    expect(touched).toEqual([`/events/${EVENT_ID}`]);
  });
});

describe("participation marks", () => {
  it("sends one mark without claiming anything about the other", async () => {
    let received: unknown = null;
    let path = "";
    server.use(
      http.put(`*/events/${EVENT_ID}/participations/${STUDENT_ID}`, async ({ request }) => {
        path = new URL(request.url).pathname;
        received = await request.json();
        return HttpResponse.json({
          id: "participation-1",
          eventId: EVENT_ID,
          studentId: STUDENT_ID,
          authorization: "authorized",
          payment: "pending",
        });
      }),
    );

    await setParticipation({
      eventId: EVENT_ID,
      studentId: STUDENT_ID,
      authorization: "authorized",
    });

    expect(path).toBe(`/events/${EVENT_ID}/participations/${STUDENT_ID}`);
    expect(received).toEqual({ authorization: "authorized" });
    expect(received).not.toHaveProperty("payment");
  });
});
