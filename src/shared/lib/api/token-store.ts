/**
 * Access token in memory only, never localStorage: a XSS payload that reads
 * localStorage would otherwise be able to steal the session outright.
 */
let accessToken: string | null = null;

export const getAccessToken = (): string | null => accessToken;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};
