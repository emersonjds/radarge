# SPA-291: typed HTTP client, execution report

Branch `feature/spa-291-typed-api-client`. Four commits, one per task.

## Commits

- `a88e849` add typed API contract from radarge-api openapi snapshot
- `8d59698` add hand-written API client with in-flight refresh and typed errors
- `d10327c` add proof script exercising the client against a real radarge-api
- `9b5b4a8` cover the API client with MSW: happy path, typed errors, single-flight refresh

## Task 1: contract types

- Installed `openapi-typescript` as a devDependency.
- Copied `../radarge-api/openapi.json` to the root and versioned it (175,963 bytes).
- The `api:types` script generates `src/shared/api/schema.d.ts` (3759 lines).
- Proof: created `src/shared/api/_type-check-proof.ts` importing
  `components["schemas"]["Profile"]`, ran `pnpm type-check` clean, deleted the file before the
  commit.

## Task 2: the client

Created `src/shared/lib/api/{client,token-store,errors}.ts` and added `NEXT_PUBLIC_API_URL` to
`.env.local.example`.

- Base URL read from `NEXT_PUBLIC_API_URL` in `createApiClient()`; its absence fails construction
  naming the variable (confirmed in Task 3).
- Token in memory (`token-store.ts`), never localStorage.
- Every call with `credentials: "include"` and `Authorization: Bearer` when a token exists.
- `ApiError` carries the server `code`; `NetworkError` covers a network drop and an unusable body;
  `SessionEndedError` covers a failed refresh.
- A 401 triggers `refreshOnce()`, which keeps the in-flight promise (`refreshInFlight ??=
performRefresh()`); concurrent calls reuse the same promise, so there is a single
  `POST /auth/refresh`.
- `fetch` is injectable (`CreateApiClientOptions.fetch`), which the Task 3 script needs: it runs
  in Node and needs a manual cookie jar, because Node's native `fetch` does not keep cookies
  between calls the way a browser does.

## Task 3: the integration proof (against the real API)

Steps executed:

1. `docker exec radarge-api-postgres-1 psql -U radarge -d postgres -c "CREATE DATABASE radarge_spa291_proof;"`,
   a throwaway database on the Postgres already running at `localhost:55432`.
2. `cd ../radarge-api && pnpm build`, which is `tsc --project tsconfig.build.json`, no errors.
3. Started the server with `DATABASE_URL` pointing at the throwaway database,
   `CORS_ORIGIN=http://localhost:3000`, a 42-character `JWT_SECRET`, `PORT=8099` and the four
   `BOOTSTRAP_ADMIN_*`. Boot log:
   ```
   {"level":30,...,"username":"admin.proof","msg":"first administrator created"}
   {"level":30,...,"msg":"Server listening at http://127.0.0.1:8099"}
   ```
4. Added `tsx` as a devDependency on the front end (the same role it already plays in
   `radarge-api`) to run `scripts/prove-client.ts`: extensionless imports (`./errors`,
   `./token-store`) resolve under Next's bundler but not under Node's native ESM resolver.
5. Script `scripts/prove-client.ts` (runs via `pnpm api:prove` or
   `npx tsx scripts/prove-client.ts`), using nothing but `createApiClient` from this repository:
   login with the bootstrap admin, read `mustChangePassword`, change the password, log in again,
   create a teacher, create a student, list students.

**Real output with the API up** (`NEXT_PUBLIC_API_URL=http://localhost:8099 npx tsx scripts/prove-client.ts`):

```
1. login with bootstrap admin
   mustChangePassword=true
2. change password
   204 received
3. relogin with the new password
   mustChangePassword=false
4. create a teacher
   created profile id=b192cb70-9678-43d6-b743-7ed96edb2b1d role=teacher
5. create a student
   created student id=277ceb6b-2a06-4699-bed1-cb859614ca04
6. list students
   1 student(s) found: Student Proof
```

**Real output with the API down** (server killed, `npx tsx scripts/prove-client.ts --down`):

```
calling /auth/login with the API down
rejected in 20ms as NetworkError: network request failed
isNetworkError=true
```

Rejected in 20ms: a typed error, not a hanging promise.

**Bonus check** (outside the script, a one-off): without `NEXT_PUBLIC_API_URL`,
`createApiClient()` throws `Error: NEXT_PUBLIC_API_URL is not set` at construction, before any
call.

Afterwards: `docker exec radarge-api-postgres-1 psql -U radarge -d postgres -c "DROP DATABASE radarge_spa291_proof;"`,
the throwaway database torn down, confirmed by `\l` (back to the original 5 databases). The server
process was killed before the "API down" test.

## Task 4: tests with MSW

`src/test/msw/handlers.ts` swapped: out went the fake Supabase handler (`*/rest/v1/turmas`), in
came the default login in the radarge-api format. `vitest.setup.ts` only had its comment fixed
(the "No HTTP happens today" line became false as of this task); the
`onUnhandledRequest: "bypass"` behavior stayed.

New `src/shared/lib/api/client.test.ts`, 7 cases: missing environment variable; the
`Authorization` header present only when there is a token; the typed happy path; `ApiError`
preserving `code` on a 422; `NetworkError` on a response with no body (an empty 500); three
concurrent calls to `/students` taking a 401 and triggering a single `POST /auth/refresh` (count
asserted, `refreshCount === 1`); a refresh answering 401 ending in `SessionEndedError` with the
token cleared.

## Final gate

```
pnpm type-check   -> clean
pnpm lint         -> clean
pnpm test -- --reporter=dot -> 30 files, 105 tests, all passing
pnpm build        -> production build finished, 11 static routes
```

## What did not work first time

- A top-level `await main()` in `scripts/prove-client.ts` broke `tsx` (with no `"type": "module"`
  in `package.json`, esbuild treats the file as CJS, which does not accept top-level await);
  swapped for `main().catch(...)`.
- Node 24 runs `.ts` natively, but its ESM resolver demands an explicit extension on relative
  imports; `client.ts` imports `./errors` and `./token-store` without one (the correct convention
  for Next's bundler, used across the repo), which made running the client under plain `node`
  impossible. Solved by adding `tsx` as a devDependency, the same piece `radarge-api` already uses
  for the same problem.
- Nothing else needed rework: type-check, lint and the test suite passed first time after those
  two fixes.
