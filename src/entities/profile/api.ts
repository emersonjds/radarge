import type { components } from "@/shared/api/schema";
import { apiClient } from "@/shared/lib/api/instance";
import { ApiError } from "@/shared/lib/api/errors";

/**
 * The contract is the source of truth for the shape. A field the API renames
 * becomes a type error here rather than `undefined` on a screen.
 */
export type PublicProfile = components["schemas"]["ManagedProfile"];

export type NewProfileInput = components["schemas"]["NewProfile"];
export type ProfileUpdate = components["schemas"]["ProfileChanges"];

export const fetchProfiles = (): Promise<PublicProfile[]> =>
  apiClient().request<PublicProfile[]>("/profiles");

/** Null rather than a throw: a caller holding a stale id asks a question, not an error. */
export const fetchProfile = async (id: string): Promise<PublicProfile | null> => {
  try {
    return await apiClient().request<PublicProfile>(`/profiles/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.code === "not_found") return null;
    throw error;
  }
};

export const createProfile = (input: NewProfileInput): Promise<PublicProfile> =>
  apiClient().request<PublicProfile>("/profiles", { method: "POST", body: input });

export const updateProfile = (id: string, patch: ProfileUpdate): Promise<PublicProfile> =>
  apiClient().request<PublicProfile>(`/profiles/${id}`, { method: "PATCH", body: patch });

export const setProfileActive = async (id: string, active: boolean): Promise<void> => {
  await updateProfile(id, { active });
};

export const deleteProfile = async (id: string): Promise<void> => {
  await apiClient().request(`/profiles/${id}`, { method: "DELETE" });
};
