import { mutateCollection, readCollection } from "@/shared/lib/storage/db";
import {
  defaultParticipation,
  eventParticipationSchema,
  type AuthorizationStatus,
  type EventParticipation,
  type PaymentStatus,
} from "./model";

export async function fetchEventParticipations(): Promise<EventParticipation[]> {
  const rows = await readCollection("eventParticipations");
  return rows.map((row) => eventParticipationSchema.parse(row));
}

export async function fetchParticipationsByEvent(eventId: string): Promise<EventParticipation[]> {
  const rows = await fetchEventParticipations();
  return rows.filter((row) => row.eventId === eventId);
}

export interface SetParticipationInput {
  eventId: string;
  studentId: string;
  authorization?: AuthorizationStatus;
  payment?: PaymentStatus;
}

/**
 * Upsert one student's participation (unique per event+student). The row is born
 * on the first change, so a student enrolled after the event was created still
 * shows up — the roster comes from the enrollments, not from stored rows.
 */
export async function setParticipation(input: SetParticipationInput): Promise<void> {
  await mutateCollection<EventParticipation>("eventParticipations", (rows) => {
    const existing = rows.find(
      (row) => row.eventId === input.eventId && row.studentId === input.studentId,
    );
    const patch = {
      ...(input.authorization !== undefined ? { authorization: input.authorization } : {}),
      ...(input.payment !== undefined ? { payment: input.payment } : {}),
    };
    if (existing) {
      const next: EventParticipation = { ...existing, ...patch };
      eventParticipationSchema.parse(next);
      return rows.map((row) => (row.id === existing.id ? next : row));
    }
    const created: EventParticipation = {
      id: crypto.randomUUID(),
      eventId: input.eventId,
      studentId: input.studentId,
      ...defaultParticipation,
      ...patch,
    };
    eventParticipationSchema.parse(created);
    return [...rows, created];
  });
}
