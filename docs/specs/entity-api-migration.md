# Entity migration to the API

Linear: SPA-293 to SPA-300. Reference implementation: `src/entities/profile/api.ts`.

Each `entities/*/api.ts` swaps its body from `localStorage` to the radarge-api. **The
exported names and signatures do not change** — that is what lets the features and widgets
stay untouched, and it was the reason the fetchers were written async from the start.

## Types come from the contract, not from zod

The payload type is `components["schemas"][...]` out of `shared/api/schema.d.ts`, generated
from `openapi.json`. A field the API renames then becomes a `npm run type-check` failure rather
than `undefined` on a screen.

The entity's zod schema stops parsing rows off the wire — the API already validated them,
and a second parse only adds a way to disagree. What zod keeps doing is the `*FormSchema`
in `model.ts`, which validates what a person typed.

## The rules the client already owns

Do not re-implement these in a fetcher:

- **Uniqueness, scoping and referential rules are the API's.** `conflict` on a duplicate,
  `not_found` on a stale id, and the teacher-only `WHERE` are answered by the server. Delete
  the hand-rolled `if (existing) throw new Error(...)` guards — they were standing in for a
  database that now exists, and keeping them means two sources of truth that will drift.
- **Error copy belongs to the screen.** A fetcher lets `ApiError` through; the component
  turns it into text with `messageForError`. A fetcher never throws a Portuguese string.
- **204 is success.** The client already returns `undefined` for it.

## The one shape worth writing by hand

A "fetch one" that answers `null` for a missing row, because a caller holding a stale id is
asking a question rather than making an error:

```ts
try {
  return await apiClient().request<T>(`/things/${id}`);
} catch (error) {
  if (error instanceof ApiError && error.code === "not_found") return null;
  throw error;
}
```

Anything else propagates.

## Contract details that bite

- Enrolling answers **200, not 201**. Withdrawing is `DELETE /enrollments` with a body, not
  a path id.
- The roll-call payload field is **`entries`**, not `records` — and the grade sheet uses
  `entries` too. Both are saved whole with `PUT`, not row by row.
- Analytics is **four routes**, not one: `/analytics/attendance-rate`,
  `/analytics/absenteeism-trend`, `/analytics/students-at-risk`,
  `/analytics/academic-summary`. `GET /analytics` is a 404.
- `/grades` answers the weighted average per student and subject, which the front derives in
  JavaScript today.
- `PUT` has to be added to `RequestOptions["method"]` in `shared/lib/api/client.ts` — the
  union stops at DELETE right now.

## Tests

Integration with MSW, per entity, asserting the **request** as much as the response: the
path, the verb, and the body actually sent. A test that only checks the parsed answer would
pass while sending `records` instead of `entries`.

Keep the localStorage tests only for what still reads localStorage.
