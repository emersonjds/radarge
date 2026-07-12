import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "@/shared/lib/storage/db";
import { fetchEventParticipations, setParticipation } from "@/entities/event-participation/api";
import { createEvent, deleteEvent, fetchEventsByGroup, updateEvent } from "./api";

const novoEvento = {
  groupId: "turma-mat-b",
  title: "Passeio ao Museu",
  date: "2026-09-10",
  location: "Museu da Ciência",
  cost: 30,
};

describe("event CRUD (integration, over the store)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("creates an event and it shows up in the aula's listing", async () => {
    const criado = await createEvent(novoEvento);

    expect(criado.id).toBeTruthy();
    expect(criado.title).toBe(novoEvento.title);

    const eventosDaAula = await fetchEventsByGroup("turma-mat-b");
    expect(eventosDaAula.some((evento) => evento.id === criado.id)).toBe(true);
  });

  it("rejects a duplicate (same aula + title + date) with the PT-BR message", async () => {
    await createEvent(novoEvento);

    await expect(createEvent(novoEvento)).rejects.toThrow(
      "Já existe um evento com esse nome e data nesta aula.",
    );
  });

  it("updates event fields", async () => {
    const criado = await createEvent(novoEvento);

    const atualizado = await updateEvent(criado.id, {
      location: "Museu de Ciências Naturais",
      cost: 35,
    });

    expect(atualizado.location).toBe("Museu de Ciências Naturais");
    expect(atualizado.cost).toBe(35);
    expect(atualizado.title).toBe(novoEvento.title);
  });

  it("deletes an event and cascades its participations", async () => {
    const criado = await createEvent(novoEvento);
    await setParticipation({
      eventId: criado.id,
      studentId: "aluno-1",
      authorization: "authorized",
    });

    await deleteEvent(criado.id);

    const eventosDaAula = await fetchEventsByGroup("turma-mat-b");
    expect(eventosDaAula.some((evento) => evento.id === criado.id)).toBe(false);

    const participacoes = await fetchEventParticipations();
    expect(participacoes.some((participacao) => participacao.eventId === criado.id)).toBe(false);
  });
});
