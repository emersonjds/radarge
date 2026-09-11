import type { components } from "@/shared/api/schema";
import { apiClient } from "@/shared/lib/api/instance";
import type { AuthorizationStatus, PaymentStatus } from "./model";

export type EventParticipation = components["schemas"]["EventParticipation"];

export const fetchParticipationsByEvent = (eventId: string): Promise<EventParticipation[]> =>
  apiClient().request<EventParticipation[]>(`/events/${eventId}/participations`);

export interface SetParticipationInput {
  eventId: string;
  studentId: string;
  authorization?: AuthorizationStatus;
  payment?: PaymentStatus;
}

/**
 * A student with no row counts as pending on both marks, so the roster comes from
 * the enrolments and not from what is stored here. Sending only one mark leaves the
 * other as it was.
 */
export const setParticipation = async ({
  eventId,
  studentId,
  ...marks
}: SetParticipationInput): Promise<void> => {
  await apiClient().request(`/events/${eventId}/participations/${studentId}`, {
    method: "PUT",
    body: marks,
  });
};
