import { http, HttpResponse } from "msw";
import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { server } from "@/test/msw/server";
import { renderHookWithQuery } from "@/test/react-query";
import { resetApiClient } from "@/shared/lib/api/instance";
import {
  useParticipationsByEvent,
  useSetParticipation,
} from "@/entities/event-participation/queries";
import { summarizeParticipation } from "./summary";

const EVENT_ID = "22222222-2222-4222-8222-222222222222";
const STUDENT_IDS = ["aluno-1", "aluno-2", "aluno-3"];

const event = {
  id: EVENT_ID,
  groupId: "turma-mat-b",
  title: "Feira de Ciências",
  date: "2026-09-20",
  location: "Centro de Convenções",
  cost: 15,
};

/** Stands in for the server: the marks already saved for this outing. */
let marks: Record<string, { authorization: string; payment: string }>;

beforeEach(() => {
  resetApiClient();
  marks = {};

  server.use(
    http.get(`*/events/${EVENT_ID}/participations`, () =>
      HttpResponse.json(
        Object.entries(marks).map(([studentId, mark]) => ({
          id: `participation-${studentId}`,
          eventId: EVENT_ID,
          studentId,
          ...mark,
        })),
      ),
    ),
    http.put(`*/events/${EVENT_ID}/participations/:studentId`, async ({ params, request }) => {
      const studentId = String(params.studentId);
      const body = (await request.json()) as Partial<{ authorization: string; payment: string }>;
      const current = marks[studentId] ?? { authorization: "pending", payment: "pending" };
      marks[studentId] = { ...current, ...body };

      return HttpResponse.json({
        id: `participation-${studentId}`,
        eventId: EVENT_ID,
        studentId,
        ...marks[studentId],
      });
    }),
  );
});

describe("participação em evento", () => {
  it("keeps one row per student, and one mark does not clear the other", async () => {
    const { result: mark } = renderHookWithQuery(() => useSetParticipation());

    await act(async () => {
      await mark.current.mutateAsync({
        eventId: EVENT_ID,
        studentId: STUDENT_IDS[0],
        authorization: "authorized",
      });
      await mark.current.mutateAsync({
        eventId: EVENT_ID,
        studentId: STUDENT_IDS[0],
        payment: "paid",
      });
    });

    const { result: participations } = renderHookWithQuery(() =>
      useParticipationsByEvent(EVENT_ID),
    );
    await waitFor(() => expect(participations.current.isSuccess).toBe(true));

    const forStudent = (participations.current.data ?? []).filter(
      (participation) => participation.studentId === STUDENT_IDS[0],
    );

    expect(forStudent).toHaveLength(1);
    expect(forStudent[0]).toMatchObject({ authorization: "authorized", payment: "paid" });
  });

  it("counts an unmarked enrolled student as pending on both", async () => {
    const { result: mark } = renderHookWithQuery(() => useSetParticipation());

    await act(async () => {
      await mark.current.mutateAsync({
        eventId: EVENT_ID,
        studentId: STUDENT_IDS[0],
        authorization: "authorized",
        payment: "paid",
      });
    });

    const { result: participations } = renderHookWithQuery(() =>
      useParticipationsByEvent(EVENT_ID),
    );
    await waitFor(() => expect(participations.current.isSuccess).toBe(true));

    const summary = summarizeParticipation(event, participations.current.data ?? [], [
      ...STUDENT_IDS,
    ]);

    expect(summary.total).toBe(STUDENT_IDS.length);
    expect(summary.authorized).toBe(1);
    expect(summary.paid).toBe(1);
    expect(summary.pendingAuthorization).toBe(STUDENT_IDS.length - 1);
    expect(summary.pendingPayment).toBe(STUDENT_IDS.length - 1);
  });
});
