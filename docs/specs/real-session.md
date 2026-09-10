# Real session against the radarge-api

Linear: SPA-284. Replaces the demo login (pick a role, no password) with real authentication.

## Contract, verified against a live API on 2026-09-10

`POST /auth/login` with `{ username, password }` answers `200` with
`{ accessToken, expiresInSeconds: 900, profile }` and sets the refresh cookie. The profile
carries `id`, `name`, `username`, `role`, `email`, `jobTitle`, `mustChangePassword`.

**`GET /auth/me` is exempt from the provisional-password block.** Measured with a
provisional admin: `/auth/me` answers `200` while `/students`, `/groups`, `/subjects` and
`/profiles` all answer `403 password_change_required`. That exemption is what makes the flow
work — the front can read who you are, see `mustChangePassword`, and route you to the
password screen without ever getting a usable answer from a data route.

Every code the API emits: `not_found`, `conflict`, `validation_failed`, `unauthorized`,
`forbidden`, `too_many_attempts`, `password_change_required`, `internal_error`.

## The two failure modes this card exists to prevent

**Loading is not logged out.** While `GET /auth/me` is in flight the answer is "not known
yet", a third state next to signed-in and signed-out. Collapsing it into signed-out throws
the user at the login screen on every page refresh.

**A reload kills the in-memory token, not the session.** The access token lives only in
memory, so `F5` always loses it. Before concluding the session is over, the client spends
its one refresh attempt on the httpOnly cookie. Session surviving `F5` is the acceptance
criterion, not a nicety.

## Shape

- `session-store.ts` stops holding a profile id in `localStorage`. The session is whatever
  `/auth/me` says.
- `useSession` exposes `profile`, `role`, and an honest `status` of
  `"loading" | "authenticated" | "anonymous"` rather than a boolean that lies during load.
- The route guard reads `role` from the API profile. The role→screen map already exists in
  `shared/config/navigation.ts` — reuse it, do not restate it.
- Logout calls `POST /auth/logout`, clears the in-memory token, and routes to login.
- `LoginForm` is rewritten on the standard form pattern (`docs/specs/form-pattern.md`) —
  it was deliberately skipped in SPA-311 to avoid migrating it twice.

## Copy rules

`401` reads as "usuário ou senha incorretos". `429` gets its own text telling the user to
wait — reusing the wrong-password copy there sends them to reset a password that is fine.
Neither text comes from the API. `shared/lib/api/error-message.ts` already owns this
mapping; extend it rather than writing strings in the component.

## Provisional password

The screen asks for the current and the new password, posts to `POST /auth/change-password`,
then sends the user back to login. The change revokes every session on purpose, including
the one that made it — saying so on screen stops the user thinking they broke something.

Floor of eight characters, new different from current, both validated client-side so the
error arrives before the request.

## Acceptance

Proven against a live API, not a mock: sign in as the bootstrap admin, land on the password
screen, change it, sign in again, reload and stay in, sign out and get sent to login.
