import type { components } from "@/shared/api/schema";
import { apiClient } from "@/shared/lib/api/instance";
import { setAccessToken } from "@/shared/lib/api/token-store";

export type SessionProfile = components["schemas"]["Profile"];

type Session = components["schemas"]["Session"];

export interface Credentials {
  username: string;
  password: string;
}

export const signIn = async (credentials: Credentials): Promise<SessionProfile> => {
  const session = await apiClient().request<Session>("/auth/login", {
    method: "POST",
    body: credentials,
  });

  setAccessToken(session.accessToken);
  return session.profile;
};

/**
 * With no token in memory this still answers for a signed-in user: the request
 * gets a 401, the client spends its refresh on the httpOnly cookie and retries.
 * That is what carries a session across a page reload, which always loses the
 * in-memory token.
 */
export const fetchMe = (): Promise<SessionProfile> =>
  apiClient().request<SessionProfile>("/auth/me");

export const signOut = async (): Promise<void> => {
  try {
    await apiClient().request("/auth/logout", { method: "POST" });
  } finally {
    setAccessToken(null);
  }
};

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
}

/**
 * Answers 204. The API revokes every session including this one, so the caller
 * has to send the user back to sign in rather than carry on.
 */
export const changePassword = async (change: PasswordChange): Promise<void> => {
  await apiClient().request("/auth/change-password", { method: "POST", body: change });
  setAccessToken(null);
};
