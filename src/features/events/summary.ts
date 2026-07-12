import { defaultParticipation, type EventParticipation } from "@/entities/event-participation/model";
import type { Event } from "@/entities/event/model";

export interface EventSummary {
  total: number;
  authorized: number;
  pendingAuthorization: number;
  denied: number;
  paid: number;
  pendingPayment: number;
  waived: number;
  collected: number;
  expected: number;
}

/** studentIds comes from active enrollments, not saved rows: no row means pending/pending. */
export function summarizeParticipation(
  event: Event,
  participations: EventParticipation[],
  studentIds: string[],
): EventSummary {
  const byStudentId = new Map(participations.map((participation) => [participation.studentId, participation]));

  let authorized = 0;
  let pendingAuthorization = 0;
  let denied = 0;
  let paid = 0;
  let pendingPayment = 0;
  let waived = 0;

  for (const studentId of studentIds) {
    const participation = byStudentId.get(studentId) ?? defaultParticipation;

    if (participation.authorization === "authorized") authorized += 1;
    else if (participation.authorization === "denied") denied += 1;
    else pendingAuthorization += 1;

    if (participation.payment === "paid") paid += 1;
    else if (participation.payment === "waived") waived += 1;
    else pendingPayment += 1;
  }

  const total = studentIds.length;

  return {
    total,
    authorized,
    pendingAuthorization,
    denied,
    paid,
    pendingPayment,
    waived,
    collected: paid * event.cost,
    expected: (total - waived) * event.cost,
  };
}
