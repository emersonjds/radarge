import type { components } from "@/shared/api/schema";
import { apiClient } from "@/shared/lib/api/instance";

export type Event = components["schemas"]["Event"];
export type NewEventInput = components["schemas"]["NewEvent"];
export type EventUpdate = components["schemas"]["EventChanges"];

export const fetchEvents = (): Promise<Event[]> => apiClient().request<Event[]>("/events");

export const fetchEventsByGroup = (groupId: string): Promise<Event[]> =>
  apiClient().request<Event[]>(`/events?${new URLSearchParams({ groupId }).toString()}`);

export const createEvent = (input: NewEventInput): Promise<Event> =>
  apiClient().request<Event>("/events", { method: "POST", body: input });

export const updateEvent = (id: string, patch: EventUpdate): Promise<Event> =>
  apiClient().request<Event>(`/events/${id}`, { method: "PATCH", body: patch });

/** The API cascades the participations; nothing is deleted here by hand. */
export const deleteEvent = async (id: string): Promise<void> => {
  await apiClient().request(`/events/${id}`, { method: "DELETE" });
};
