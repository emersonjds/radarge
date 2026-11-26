# Product tour on first access

Cards: RAD-79 (front), RAD-80 (radarge-api).

## Goal

A teacher or coordinator who signs in for the first time lands on a sidebar they
have never seen. The tour walks them through it once: the screen dims, one control
is highlighted at a time, and a popover says what it is for. It runs once per
person, not once per device, and can be replayed on demand.

## Where "already seen" lives

On the profile, in the API. `localStorage` would make the tour reappear on every
new phone and every cleared browser, and the project treats `localStorage` in
`src/` as a bug.

- `profiles.tour_completed boolean not null default false`, the same shape as
  `must_change_password`. Existing accounts start at `false`, so everyone already
  using the system sees the tour once.
- `Profile.tourCompleted: boolean`, returned wherever a profile is (`/auth/me`,
  sign-in, refresh).
- `POST /auth/me/tour-completed` -> `204`. Idempotent. Allowed only after the
  provisional password is gone (plain `authorize`, not the password-change
  variant). No request body, so the client sends no `Content-Type` (the same rule
  that broke logout once).
- Replay writes nothing, so there is no reset route.

Finishing and skipping both count as completed. A person who closes the tour on
step one has decided they do not want it; showing it again on the next sign-in is
nagging.

## When it starts

Only inside the authenticated shell, after the provisional-password change
(`mustChangePassword === false`), and only when `tourCompleted === false`. The
mark-complete call fires when the tour is destroyed for any reason. If the call
fails, the tour still closes; the person sees it again next session, which is the
safe direction.

## Steps

Built from `navForRole(role)`, so a nav item added later is either in the tour
copy table or skipped, never a dangling highlight.

1. Welcome (no target, centered).
2. One step per nav item of the role, highlighting its sidebar link.
3. The "Rever tour" button in the header.

Copy is pt-BR and lives next to the step builder, keyed by `href`.

## Mobile

Below `lg` the sidebar is off-canvas. The tour opens it before the nav steps and
closes it at the end, so every highlight has a visible target at 375px.

## Layers

`features/product-tour` owns the steps and the `driver.js` call and knows nothing
about the session. `completeTour()` sits in `features/auth/api.ts` next to
`fetchMe`. The `app-shell` widget wires them: it reads the session, opens the
mobile sidebar, runs the tour and marks it complete. Features never import each
other.

## Library

`driver.js`: overlay, highlight and popover with no runtime dependencies. Its
default popover is restyled in `globals.css` with the theme tokens; no raw hex.

## Tests

- Unit: `stepsForRole` per role (count, order, targets).
- MSW: the complete call is `POST /auth/me/tour-completed` with no body and no
  `Content-Type`.
- Playwright against the live API, 375 and 1440: first sign-in shows the tour;
  skipping and reloading does not show it again; "Rever tour" opens it. Evidence
  in `e2e/product-tour/evidence/`.
