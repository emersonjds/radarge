import { http, HttpResponse } from "msw";

const defaultProfile = {
  id: "profile-default",
  name: "Ana Professora",
  username: "ana",
  role: "teacher",
  email: null,
  jobTitle: null,
  mustChangePassword: false,
};

/**
 * Happy-path defaults for the radarge-api contract. A test that needs a
 * different response — an error, a failed refresh, a counted 401 — overrides
 * it with server.use() rather than growing this list.
 */
export const handlers = [
  http.post("*/auth/login", () =>
    HttpResponse.json({
      accessToken: "default-access-token",
      expiresInSeconds: 900,
      profile: defaultProfile,
    }),
  ),
];
