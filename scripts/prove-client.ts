/**
 * Task-3 proof: exercises the hand-written client (src/shared/lib/api/client.ts)
 * against a real radarge-api instance — login, change password, relogin, create a
 * teacher, create a student, list students. With the API down, the same client
 * must reject fast with a typed NetworkError, never hang.
 *
 * Usage:
 *   NEXT_PUBLIC_API_URL=http://localhost:8099 npx tsx scripts/prove-client.ts
 *   NEXT_PUBLIC_API_URL=http://localhost:8099 npx tsx scripts/prove-client.ts --down
 */
import { createApiClient } from "../src/shared/lib/api/client";
import { NetworkError } from "../src/shared/lib/api/errors";
import { setAccessToken } from "../src/shared/lib/api/token-store";
import type { components } from "../src/shared/api/schema.d.ts";

type Session = components["schemas"]["Session"];
type Profile = components["schemas"]["ManagedProfile"];
type Student = components["schemas"]["Student"];

const BOOTSTRAP_USERNAME = "admin.proof";
const BOOTSTRAP_PASSWORD = "provisional-pass-123";
const NEW_ADMIN_PASSWORD = "rotated-pass-456";

/**
 * Node's fetch keeps no cookie jar between calls (unlike a browser). The API's
 * refresh cookie needs one for this script to behave like the real client will
 * in the browser, so the jar lives here, not in client.ts.
 */
const withCookieJar = (): typeof fetch => {
  let cookie: string | null = null;

  return async (input, init) => {
    const headers = new Headers(init?.headers);
    if (cookie) headers.set("Cookie", cookie);

    const response = await fetch(input, { ...init, headers });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0] ?? null;

    return response;
  };
};

const runHappyPath = async (): Promise<void> => {
  const client = createApiClient({ fetch: withCookieJar() });

  console.log("1. login with bootstrap admin");
  const login = await client.request<Session>("/auth/login", {
    method: "POST",
    body: { username: BOOTSTRAP_USERNAME, password: BOOTSTRAP_PASSWORD },
  });
  setAccessToken(login.accessToken);
  console.log(`   mustChangePassword=${String(login.profile.mustChangePassword)}`);

  console.log("2. change password");
  await client.request<undefined>("/auth/change-password", {
    method: "POST",
    body: { currentPassword: BOOTSTRAP_PASSWORD, newPassword: NEW_ADMIN_PASSWORD },
  });
  console.log("   204 received");

  console.log("3. relogin with the new password");
  const relogin = await client.request<Session>("/auth/login", {
    method: "POST",
    body: { username: BOOTSTRAP_USERNAME, password: NEW_ADMIN_PASSWORD },
  });
  setAccessToken(relogin.accessToken);
  console.log(`   mustChangePassword=${String(relogin.profile.mustChangePassword)}`);

  console.log("4. create a teacher");
  const teacher = await client.request<Profile>("/profiles", {
    method: "POST",
    body: {
      name: "Teacher Proof",
      username: "teacher.proof",
      role: "teacher",
      password: "teacher-pass-789",
    },
  });
  console.log(`   created profile id=${teacher.id} role=${teacher.role}`);

  console.log("5. create a student");
  const student = await client.request<Student>("/students", {
    method: "POST",
    body: {
      name: "Student Proof",
      birthDate: "2015-05-20",
      guardianName: "Guardian Proof",
      guardianPhone: "11999999999",
    },
  });
  console.log(`   created student id=${student.id}`);

  console.log("6. list students");
  const students = await client.request<Student[]>("/students");
  console.log(
    `   ${String(students.length)} student(s) found: ${students.map((one) => one.name).join(", ")}`,
  );
};

const runWithApiDown = async (): Promise<void> => {
  const client = createApiClient({ fetch: withCookieJar() });

  console.log("calling /auth/login with the API down");
  const startedAt = Date.now();

  try {
    await client.request<Session>("/auth/login", {
      method: "POST",
      body: { username: BOOTSTRAP_USERNAME, password: BOOTSTRAP_PASSWORD },
    });
    console.log("UNEXPECTED: call succeeded while the API should be down");
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    const isNetworkError = error instanceof NetworkError;
    console.log(
      `rejected in ${String(elapsedMs)}ms as ${(error as Error).name}: ${(error as Error).message}`,
    );
    console.log(`isNetworkError=${String(isNetworkError)}`);
    if (!isNetworkError) throw error;
  }
};

const main = async (): Promise<void> => {
  if (process.argv.includes("--down")) {
    await runWithApiDown();
    return;
  }

  await runHappyPath();
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
