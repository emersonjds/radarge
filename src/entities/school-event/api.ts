import type { components } from "@/shared/api/schema";
import { apiClient } from "@/shared/lib/api/instance";

export type SchoolEvent = components["schemas"]["SchoolEvent"];
export type NewSchoolEventInput = components["schemas"]["NewSchoolEvent"];
export type SchoolEventUpdate = components["schemas"]["SchoolEventChanges"];

export const fetchSchoolEvents = (): Promise<SchoolEvent[]> =>
  apiClient().request<SchoolEvent[]>("/school-events");

export const createSchoolEvent = (input: NewSchoolEventInput): Promise<SchoolEvent> =>
  apiClient().request<SchoolEvent>("/school-events", { method: "POST", body: input });

export const updateSchoolEvent = (id: string, patch: SchoolEventUpdate): Promise<SchoolEvent> =>
  apiClient().request<SchoolEvent>(`/school-events/${id}`, { method: "PATCH", body: patch });

export const deleteSchoolEvent = async (id: string): Promise<void> => {
  await apiClient().request(`/school-events/${id}`, { method: "DELETE" });
};
