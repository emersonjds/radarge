import { describe, expect, it } from "vitest";
import type { EventParticipation } from "@/entities/event-participation/model";
import type { Event } from "@/entities/event/model";
import { summarizeParticipation } from "./summary";

const event: Event = { id: "ev1", groupId: "g1", title: "Zoológico", date: "2026-08-01", location: "Zoo", cost: 20 };
const freeEvent: Event = { ...event, id: "ev2", cost: 0 };

function participation(overrides: Partial<EventParticipation>): EventParticipation {
  return {
    id: `p-${overrides.studentId}`,
    eventId: "ev1",
    studentId: "s1",
    authorization: "pending",
    payment: "pending",
    ...overrides,
  };
}

describe("summarizeParticipation", () => {
  it("aluno matriculado sem linha salva conta como pendente/pendente", () => {
    const summary = summarizeParticipation(event, [], ["s1", "s2"]);

    expect(summary.total).toBe(2);
    expect(summary.pendingAuthorization).toBe(2);
    expect(summary.pendingPayment).toBe(2);
    expect(summary.authorized).toBe(0);
    expect(summary.paid).toBe(0);
  });

  it("conta autorização e pagamento por status", () => {
    const participations = [
      participation({ studentId: "s1", authorization: "authorized", payment: "paid" }),
      participation({ studentId: "s2", authorization: "denied", payment: "pending" }),
      participation({ studentId: "s3", authorization: "authorized", payment: "waived" }),
    ];

    const summary = summarizeParticipation(event, participations, ["s1", "s2", "s3"]);

    expect(summary.authorized).toBe(2);
    expect(summary.denied).toBe(1);
    expect(summary.pendingAuthorization).toBe(0);
    expect(summary.paid).toBe(1);
    expect(summary.pendingPayment).toBe(1);
    expect(summary.waived).toBe(1);
  });

  it("isento não entra no valor esperado", () => {
    const participations = [
      participation({ studentId: "s1", payment: "paid" }),
      participation({ studentId: "s2", payment: "waived" }),
      participation({ studentId: "s3", payment: "pending" }),
    ];

    const summary = summarizeParticipation(event, participations, ["s1", "s2", "s3"]);

    expect(summary.collected).toBe(20); // 1 pago × 20
    expect(summary.expected).toBe(40); // (3 - 1 isento) × 20
  });

  it("evento gratuito zera arrecadado e esperado", () => {
    const participations = [participation({ studentId: "s1", payment: "paid" })];

    const summary = summarizeParticipation(freeEvent, participations, ["s1"]);

    expect(summary.collected).toBe(0);
    expect(summary.expected).toBe(0);
  });
});
