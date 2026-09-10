/**
 * Puts the accounts and the demo dataset the specs need into a running radarge-api.
 *
 * The API has no self-registration: an administrator has to exist first, created by
 * the API's own BOOTSTRAP_ADMIN_* variables, and everyone else is created through it.
 * Re-running this is safe — whatever already exists is left alone.
 *
 * Every scenario that signs out gets its own account on purpose. Sign-in is throttled
 * per username (ten attempts per five minutes) and the throttle counts successes as
 * well, so specs sharing one account lock each other out. Signing out is the other
 * reason: it ends that account's session on every device.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export const ADMIN = {
  name: "Administrador Radarge",
  username: "admin",
  password: "radarge-dev-admin-2026",
};

export interface TestAccount {
  name: string;
  username: string;
  role: "teacher" | "coordinator" | "admin";
  provisionalPassword: string;
  /** Absent when the account is meant to stay on its provisional password. */
  password?: string;
}

export const ACCOUNTS = {
  /** Owns the demo groups, so the teacher-scoped screens have something to show. */
  teacher: {
    name: "Ricardo Alves",
    username: "ricardo.alves",
    role: "teacher",
    provisionalPassword: "provisoria-ricardo-1",
    password: "definitiva-ricardo-1",
  },
  coordinator: {
    name: "Sofia Coordenadora",
    username: "sofia.coord",
    role: "coordinator",
    provisionalPassword: "provisoria-sofia-1",
    password: "definitiva-sofia-1",
  },
  signIn: {
    name: "Ana Professora",
    username: "e2e.entrada",
    role: "teacher",
    provisionalPassword: "provisoria-entrada-1",
    password: "definitiva-entrada-1",
  },
  wrongPassword: {
    name: "Bruno Professor",
    username: "e2e.senha.errada",
    role: "teacher",
    provisionalPassword: "provisoria-errada-1",
    password: "definitiva-errada-1",
  },
  reload: {
    name: "Carla Professora",
    username: "e2e.recarga",
    role: "teacher",
    provisionalPassword: "provisoria-recarga-1",
    password: "definitiva-recarga-1",
  },
  logout: {
    name: "Diego Professor",
    username: "e2e.saida",
    role: "teacher",
    provisionalPassword: "provisoria-saida-1",
    password: "definitiva-saida-1",
  },
  provisional: {
    name: "Elena Professora",
    username: "e2e.provisoria",
    role: "teacher",
    provisionalPassword: "provisoria-mantida-1",
  },
} as const satisfies Record<string, TestAccount>;

interface Identified {
  id: string;
}

const request = async (
  path: string,
  method: string,
  token?: string,
  body?: unknown,
): Promise<Response> =>
  fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export const signIn = async (username: string, password: string): Promise<string | null> => {
  const response = await request("/auth/login", "POST", undefined, { username, password });
  if (!response.ok) return null;
  const session = (await response.json()) as { accessToken: string };
  return session.accessToken;
};

const ensureAccount = async (token: string, account: TestAccount): Promise<void> => {
  const response = await request("/profiles", "POST", token, {
    name: account.name,
    username: account.username,
    password: account.provisionalPassword,
    role: account.role,
  });

  if (!response.ok && response.status !== 409) {
    throw new Error(`could not create ${account.username}: ${String(response.status)}`);
  }
};

/**
 * Spends the provisional password once, so the specs that need an ordinary sign-in are
 * not also the ones exercising the password screen. On a second run the password is
 * already settled, the provisional sign-in fails, and that is the skip.
 */
const settlePassword = async (account: TestAccount): Promise<void> => {
  if (account.password === undefined) return;

  const token = await signIn(account.username, account.provisionalPassword);
  if (token === null) return;

  await request("/auth/change-password", "POST", token, {
    currentPassword: account.provisionalPassword,
    newPassword: account.password,
  });
};

export const seedAccounts = async (): Promise<string> => {
  const adminToken = await signIn(ADMIN.username, ADMIN.password);

  if (adminToken === null) {
    throw new Error(
      `no administrator at ${API_URL}. Start radarge-api with BOOTSTRAP_ADMIN_* set, then rotate the provisional password to ${ADMIN.password}.`,
    );
  }

  for (const account of Object.values(ACCOUNTS)) {
    await ensureAccount(adminToken, account);
    await settlePassword(account);
  }

  return adminToken;
};

const SUBJECTS = [
  { name: "Matemática", area: "exact_sciences" },
  { name: "Português", area: "languages" },
] as const;

const GROUPS = [
  { name: "Reforço de Matemática — Segunda", shift: "afternoon" },
  { name: "Reforço de Português — Quarta", shift: "morning" },
] as const;

const STUDENTS = [
  { name: "João Pedro Silva", birthDate: "2012-03-15", guardianName: "Maria Silva", guardianPhone: "(11) 98765-4321" },
  { name: "Beatriz Souza", birthDate: "2013-07-02", guardianName: "Carlos Souza", guardianPhone: "(11) 97654-3210" },
  { name: "Miguel Santos", birthDate: "2011-11-20", guardianName: "Ana Santos", guardianPhone: "(11) 96543-2109" },
] as const;

/** Matches on the natural key, since the API hands out the id. */
const findOrCreate = async <TRow extends Identified>(
  token: string,
  collection: string,
  matches: (row: TRow) => boolean,
  body: unknown,
): Promise<TRow> => {
  const existing = (await (await request(collection, "GET", token)).json()) as TRow[];
  const found = existing.find(matches);
  if (found) return found;

  const created = await request(collection, "POST", token, body);
  if (!created.ok) {
    throw new Error(`could not seed ${collection}: ${String(created.status)}`);
  }
  return (await created.json()) as TRow;
};

/**
 * Enough rows for the panel to have something to render. Deliberately small: a spec
 * asserting a count is easier to read against three students than against thirty.
 */
export const seedDemoData = async (adminToken: string): Promise<void> => {
  const teacher = (
    (await (await request("/profiles", "GET", adminToken)).json()) as {
      id: string;
      username: string;
    }[]
  ).find((profile) => profile.username === ACCOUNTS.teacher.username);

  if (!teacher) throw new Error("the demo teacher was not created");

  const subjects = [];
  for (const subject of SUBJECTS) {
    subjects.push(
      await findOrCreate<Identified & { name: string }>(
        adminToken,
        "/subjects",
        (row) => row.name === subject.name,
        subject,
      ),
    );
  }

  const groups = [];
  for (const group of GROUPS) {
    groups.push(
      await findOrCreate<Identified & { name: string }>(
        adminToken,
        "/groups",
        (row) => row.name === group.name,
        { ...group, teacherId: teacher.id },
      ),
    );
  }

  const students = [];
  for (const student of STUDENTS) {
    students.push(
      await findOrCreate<Identified & { name: string }>(
        adminToken,
        "/students",
        (row) => row.name === student.name,
        student,
      ),
    );
  }

  for (const [index, subject] of subjects.entries()) {
    const group = groups[index];
    if (!group) continue;
    await request("/assignments", "POST", adminToken, {
      groupId: group.id,
      subjectId: subject.id,
      teacherId: teacher.id,
    });
  }

  // Enrolling is idempotent and answers 200, so a repeat run costs nothing.
  const firstGroup = groups[0];
  if (firstGroup) {
    for (const student of students) {
      await request("/enrollments", "POST", adminToken, {
        studentId: student.id,
        groupId: firstGroup.id,
      });
    }
  }
};

export const seedAll = async (): Promise<void> => {
  const adminToken = await seedAccounts();
  await seedDemoData(adminToken);
};
