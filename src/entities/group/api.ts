import type { components } from "@/shared/api/schema";
import { apiClient } from "@/shared/lib/api/instance";
import { ApiError } from "@/shared/lib/api/errors";

export type Group = components["schemas"]["Group"];
export type NewGroupInput = components["schemas"]["NewGroup"];
export type GroupUpdate = components["schemas"]["GroupChanges"];

export const fetchGroups = (): Promise<Group[]> => apiClient().request<Group[]>("/groups");

/** Null rather than a throw: a caller holding a stale id asks a question, not an error. */
export const fetchGroupById = async (id: string): Promise<Group | null> => {
  try {
    return await apiClient().request<Group>(`/groups/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.code === "not_found") return null;
    throw error;
  }
};

export const createGroup = (input: NewGroupInput): Promise<Group> =>
  apiClient().request<Group>("/groups", { method: "POST", body: input });

export const updateGroup = (id: string, patch: GroupUpdate): Promise<Group> =>
  apiClient().request<Group>(`/groups/${id}`, { method: "PATCH", body: patch });

export const deleteGroup = async (id: string): Promise<void> => {
  await apiClient().request(`/groups/${id}`, { method: "DELETE" });
};
