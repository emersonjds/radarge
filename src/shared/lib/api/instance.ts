import { createApiClient, type ApiClient } from "./client";

let instance: ApiClient | null = null;

/**
 * One client for the whole app. Each client holds its own in-flight refresh
 * promise, so a second instance would let two screens taking a 401 together each
 * run their own refresh — the second then presents a token the first already
 * rotated, which the API reads as reuse and answers by ending the whole session
 * family.
 *
 * Built on first use, not at import: `createApiClient` throws when
 * NEXT_PUBLIC_API_URL is missing, and this module is imported during the static
 * export build.
 */
export const apiClient = (): ApiClient => (instance ??= createApiClient());

/** Lets a test point the client at a different base URL than the last one built. */
export const resetApiClient = (): void => {
  instance = null;
};
