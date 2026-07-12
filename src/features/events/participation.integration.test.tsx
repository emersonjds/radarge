import { beforeEach, describe, expect, it } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { resetDb } from "@/shared/lib/storage/db";
import { renderHookWithQuery } from "@/test/react-query";
import { fetchEnrollmentsByGroup } from "@/entities/enrollment/api";
import { createEvent } from "@/entities/event/api";
import {
  useParticipationsByEvent,
  useSetParticipation,
} from "@/entities/event-participation/queries";
import { summarizeParticipation } from "./summary";

const novoEvento = {
  groupId: "turma-mat-b",
  title: "Feira de Ciências",
  date: "2026-09-20",
  location: "Centro de Convenções",
  cost: 15,
};

describe("participação em evento (integration, over the store)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("marks authorization and payment for a student, upserting instead of duplicating", async () => {
    const evento = await createEvent(novoEvento);
    const [matricula] = (await fetchEnrollmentsByGroup("turma-mat-b")).filter(
      (row) => row.active,
    );

    const { result: marcar } = renderHookWithQuery(() => useSetParticipation());
    await act(async () => {
      await marcar.current.mutateAsync({
        eventId: evento.id,
        studentId: matricula.studentId,
        authorization: "authorized",
      });
      await marcar.current.mutateAsync({
        eventId: evento.id,
        studentId: matricula.studentId,
        payment: "paid",
      });
    });

    const { result: participacoes } = renderHookWithQuery(() =>
      useParticipationsByEvent(evento.id),
    );
    await waitFor(() => expect(participacoes.current.isSuccess).toBe(true));

    const doAluno = (participacoes.current.data ?? []).filter(
      (participacao) => participacao.studentId === matricula.studentId,
    );
    expect(doAluno).toHaveLength(1);
    expect(doAluno[0].authorization).toBe("authorized");
    expect(doAluno[0].payment).toBe("paid");
  });

  it("summarizeParticipation reflects the change; an untouched enrolled student counts as pendente/pendente", async () => {
    const evento = await createEvent(novoEvento);
    const studentIds = (await fetchEnrollmentsByGroup("turma-mat-b"))
      .filter((row) => row.active)
      .map((row) => row.studentId);
    expect(studentIds.length).toBeGreaterThan(1);
    const [primeiroAluno] = studentIds;

    const { result: marcar } = renderHookWithQuery(() => useSetParticipation());
    await act(async () => {
      await marcar.current.mutateAsync({
        eventId: evento.id,
        studentId: primeiroAluno,
        authorization: "authorized",
        payment: "paid",
      });
    });

    const { result: participacoes } = renderHookWithQuery(() =>
      useParticipationsByEvent(evento.id),
    );
    await waitFor(() => expect(participacoes.current.isSuccess).toBe(true));

    const resumo = summarizeParticipation(evento, participacoes.current.data ?? [], studentIds);

    expect(resumo.total).toBe(studentIds.length);
    expect(resumo.authorized).toBe(1);
    expect(resumo.paid).toBe(1);
    expect(resumo.pendingAuthorization).toBe(studentIds.length - 1);
    expect(resumo.pendingPayment).toBe(studentIds.length - 1);
  });
});
