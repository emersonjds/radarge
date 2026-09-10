import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Puts the accounts and the demo dataset the specs need into a running radarge-api.
 *
 * The API has no self-registration: an administrator has to exist first, created by
 * the API's own BOOTSTRAP_ADMIN_* variables, and everyone else is created through it.
 * Re-running this is safe — whatever already exists is left alone.
 *
 * Every spec file signs in as its own account(s), never one shared across files. Two
 * reasons: sign-in is throttled per username (ten attempts per five minutes, and the
 * throttle counts successes too — a known API bug, Linear SPA-307), and the refresh
 * cookie the API hands out is single-use with reuse detection, so two contexts sharing
 * one saved session knock each other's session family out the moment either replays a
 * spent cookie. One account per file keeps both concerns file-local: re-running a single
 * spec while debugging never touches another file's throttle budget or session.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** Bootstrap-only: seeds data over the API. Never signed into from a spec's UI. */
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
  // auth-real.spec.ts — each test is a distinct sign-in flow, never reused.
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

  // auth/auth.spec.ts — nav-by-role and profile CRUD.
  profilesAdmin: {
    name: "Admin Perfis E2E",
    username: "e2e.perfis",
    role: "admin",
    provisionalPassword: "provisoria-perfis-admin-1",
    password: "definitiva-perfis-admin-1",
  },
  profilesTeacher: {
    name: "Renata Teixeira",
    username: "e2e.perfis.professor",
    role: "teacher",
    provisionalPassword: "provisoria-perfis-prof-1",
    password: "definitiva-perfis-prof-1",
  },
  profilesCoordinator: {
    name: "Coordenador Perfis E2E",
    username: "e2e.perfis.coordenador",
    role: "coordinator",
    provisionalPassword: "provisoria-perfis-coord-1",
    password: "definitiva-perfis-coord-1",
  },

  // academic-structure/academic-structure.spec.ts — subject/turma CRUD and roll-call scoping.
  academicAdmin: {
    name: "Admin Academica E2E",
    username: "e2e.academica",
    role: "admin",
    provisionalPassword: "provisoria-academica-admin-1",
    password: "definitiva-academica-admin-1",
  },
  academicaProfessor1: {
    name: "Ricardo Alves",
    username: "e2e.academica.professor1",
    role: "teacher",
    provisionalPassword: "provisoria-academica-prof1-1",
    password: "definitiva-academica-prof1-1",
  },
  academicaProfessor2: {
    name: "Bruno Ferreira E2E",
    username: "e2e.academica.professor2",
    role: "teacher",
    provisionalPassword: "provisoria-academica-prof2-1",
    password: "definitiva-academica-prof2-1",
  },

  // dashboard/dashboard.spec.ts — KPIs and charts, no dedicated dataset needed.
  dashboardAdmin: {
    name: "Admin Painel E2E",
    username: "e2e.painel",
    role: "admin",
    provisionalPassword: "provisoria-painel-admin-1",
    password: "definitiva-painel-admin-1",
  },
  dashboardCoordinator: {
    name: "Coordenador Painel E2E",
    username: "e2e.painel.coordenador",
    role: "coordinator",
    provisionalPassword: "provisoria-painel-coord-1",
    password: "definitiva-painel-coord-1",
  },

  // evaluations/evaluations.spec.ts — grade entry flow.
  gradesTeacher: {
    name: "Professor Notas E2E",
    username: "e2e.notas",
    role: "teacher",
    provisionalPassword: "provisoria-notas-1",
    password: "definitiva-notas-1",
  },

  // events/events.spec.ts — participation, payment and scoping.
  eventsTeacher1: {
    name: "Professor Eventos Um E2E",
    username: "e2e.eventos.professor1",
    role: "teacher",
    provisionalPassword: "provisoria-eventos-prof1-1",
    password: "definitiva-eventos-prof1-1",
  },
  eventsTeacher2: {
    name: "Professor Eventos Dois E2E",
    username: "e2e.eventos.professor2",
    role: "teacher",
    provisionalPassword: "provisoria-eventos-prof2-1",
    password: "definitiva-eventos-prof2-1",
  },
  eventsCoordinator: {
    name: "Coordenador Eventos E2E",
    username: "e2e.eventos.coordenador",
    role: "coordinator",
    provisionalPassword: "provisoria-eventos-coord-1",
    password: "definitiva-eventos-coord-1",
  },

  // pivot/pivot.spec.ts — ficha + matrícula N:N end to end.
  pivotAdmin: {
    name: "Admin Pivot E2E",
    username: "e2e.pivot",
    role: "admin",
    provisionalPassword: "provisoria-pivot-admin-1",
    password: "definitiva-pivot-admin-1",
  },
  pivotTeacher: {
    name: "Professor Pivot E2E",
    username: "e2e.pivot.professor",
    role: "teacher",
    provisionalPassword: "provisoria-pivot-prof-1",
    password: "definitiva-pivot-prof-1",
  },

  // reports/reports.spec.ts — the analysis centre and the student record.
  reportsAdmin: {
    name: "Admin Relatorios E2E",
    username: "e2e.relatorios",
    role: "admin",
    provisionalPassword: "provisoria-relatorios-admin-1",
    password: "definitiva-relatorios-admin-1",
  },
  reportsTeacher: {
    name: "Professor Relatorios E2E",
    username: "e2e.relatorios.professor",
    role: "teacher",
    provisionalPassword: "provisoria-relatorios-prof-1",
    password: "definitiva-relatorios-prof-1",
  },

  // student-detail/student-detail.spec.ts — the student record per role, and scoping.
  detailAdmin: {
    name: "Admin Detalhe E2E",
    username: "e2e.detalhe",
    role: "admin",
    provisionalPassword: "provisoria-detalhe-admin-1",
    password: "definitiva-detalhe-admin-1",
  },
  detailTeacher1: {
    name: "Professor Detalhe Um E2E",
    username: "e2e.detalhe.professor1",
    role: "teacher",
    provisionalPassword: "provisoria-detalhe-prof1-1",
    password: "definitiva-detalhe-prof1-1",
  },
  detailTeacher2: {
    name: "Professor Detalhe Dois E2E",
    username: "e2e.detalhe.professor2",
    role: "teacher",
    provisionalPassword: "provisoria-detalhe-prof2-1",
    password: "definitiva-detalhe-prof2-1",
  },

  // students/students.spec.ts — self-contained CRUD, no fixture data.
  studentsAdmin: {
    name: "Admin Alunos E2E",
    username: "e2e.alunos",
    role: "admin",
    provisionalPassword: "provisoria-alunos-admin-1",
    password: "definitiva-alunos-admin-1",
  },

  // take-attendance/take-attendance.spec.ts — mobile and desktop roll-call UI.
  rollCallTeacher: {
    name: "Professor Chamada E2E",
    username: "e2e.chamada",
    role: "teacher",
    provisionalPassword: "provisoria-chamada-1",
    password: "definitiva-chamada-1",
  },
} as const satisfies Record<string, TestAccount>;

interface Identified {
  id: string;
}

export const apiRequest = async (
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

/** GET a collection and parse it, for specs that need a seeded row's real id. */
export const apiList = async <TRow>(path: string, token: string): Promise<TRow[]> =>
  (await apiRequest(path, "GET", token)).json() as Promise<TRow[]>;

export const signIn = async (username: string, password: string): Promise<string | null> => {
  const response = await apiRequest("/auth/login", "POST", undefined, { username, password });
  if (!response.ok) return null;
  const session = (await response.json()) as { accessToken: string };
  return session.accessToken;
};

/**
 * Written once by the setup project and read by every spec file after it. Playwright
 * gives each file its own worker process, so a fresh sign-in per file would spend ten
 * of the administrator's ten attempts per five minutes - the throttle counts successes
 * (Linear SPA-307). The access token lasts fifteen minutes, comfortably longer than a
 * suite run.
 */
const ADMIN_TOKEN_FILE = "e2e/.auth/admin-token.txt";

const freshAdminToken = async (): Promise<string> => {
  const token = await signIn(ADMIN.username, ADMIN.password);

  if (token === null) {
    throw new Error(
      `no administrator at ${API_URL}. Start radarge-api with BOOTSTRAP_ADMIN_* set, then rotate the provisional password to ${ADMIN.password}.`,
    );
  }

  return token;
};

export const cacheAdminToken = async (): Promise<string> => {
  const token = await freshAdminToken();
  await mkdir(dirname(ADMIN_TOKEN_FILE), { recursive: true });
  await writeFile(ADMIN_TOKEN_FILE, token, "utf8");
  return token;
};

export const adminToken = async (): Promise<string> => {
  try {
    const cached = (await readFile(ADMIN_TOKEN_FILE, "utf8")).trim();
    if (cached.length > 0) return cached;
  } catch {
    // No cached token yet - fall through and sign in.
  }

  return cacheAdminToken();
};

/** Looks a seeded row up by name — the API hands out the id, the specs only know the name. */
export const findByName = async <TRow extends Identified & { name: string }>(
  token: string,
  collection: string,
  name: string,
): Promise<TRow> => {
  const rows = await apiList<TRow>(collection, token);
  const found = rows.find((row) => row.name === name);
  if (!found) throw new Error(`no row named "${name}" in ${collection}`);
  return found;
};

/** Answers whether it created the account, so only a brand new one spends its
 * provisional password. */
const ensureAccount = async (token: string, account: TestAccount): Promise<boolean> => {
  const response = await apiRequest("/profiles", "POST", token, {
    name: account.name,
    username: account.username,
    password: account.provisionalPassword,
    role: account.role,
  });

  if (response.ok) return true;
  if (response.status !== 409) {
    throw new Error(`could not create ${account.username}: ${String(response.status)}`);
  }

  // Already existed from an earlier fixture generation — reconcile name and role so
  // the spec that signs in as this username sees the identity it expects today.
  const profiles = await apiList<Identified & { username: string; name: string; role: string }>(
    "/profiles",
    token,
  );
  const existing = profiles.find((profile) => profile.username === account.username);
  if (existing && (existing.name !== account.name || existing.role !== account.role)) {
    await apiRequest(`/profiles/${existing.id}`, "PATCH", token, {
      name: account.name,
      role: account.role,
    });
  }

  return false;
};

/**
 * Spends the provisional password once, so the specs that need an ordinary sign-in are
 * not also the ones exercising the password screen. On a second run the password is
 * already settled, the provisional sign-in fails, and that is the skip.
 */
/**
 * Only for an account that was just created. Re-running it on a settled account costs
 * a failed sign-in, and a failed sign-in spends that username's throttle budget - ten
 * per five minutes, successes included (Linear SPA-307). With two dozen accounts that
 * is two dozen wasted attempts every run, which locks the suite out of itself.
 */
const settlePassword = async (account: TestAccount): Promise<void> => {
  if (account.password === undefined) return;

  const token = await signIn(account.username, account.provisionalPassword);
  if (token === null) return;

  await apiRequest("/auth/change-password", "POST", token, {
    currentPassword: account.provisionalPassword,
    newPassword: account.password,
  });
};

export const seedAccounts = async (): Promise<string> => {
  // Signs in for real and writes the token down, so the spec files that follow read
  // it instead of spending the administrator's throttle budget one worker at a time.
  const token = await cacheAdminToken();

  for (const account of Object.values(ACCOUNTS)) {
    if (await ensureAccount(token, account)) {
      await settlePassword(account);
    }
  }

  return token;
};

/** Shared lookup values, not owned by anyone — safe for every file's groups to reference. */
const SUBJECTS = [
  { name: "Matemática", area: "exact_sciences" },
  { name: "Português", area: "languages" },
  { name: "Ciências", area: "biological_sciences" },
] as const;

type SubjectName = (typeof SUBJECTS)[number]["name"];

/** Matches on the natural key, since the API hands out the id. */
const findOrCreate = async <TRow extends Identified>(
  token: string,
  collection: string,
  matches: (row: TRow) => boolean,
  body: unknown,
): Promise<TRow> => {
  const existing = await apiList<TRow>(collection, token);
  const found = existing.find(matches);
  if (found) return found;

  const created = await apiRequest(collection, "POST", token, body);
  if (!created.ok) {
    throw new Error(`could not seed ${collection}: ${String(created.status)}`);
  }
  return (await created.json()) as TRow;
};

const seedSubjects = async (token: string): Promise<Map<SubjectName, Identified>> => {
  const subjects = new Map<SubjectName, Identified>();
  for (const subject of SUBJECTS) {
    const row = await findOrCreate<Identified & { name: string }>(
      token,
      "/subjects",
      (candidate) => candidate.name === subject.name,
      subject,
    );
    subjects.set(subject.name, row);
  }
  return subjects;
};

const profileIdOf = async (token: string, username: string): Promise<string> => {
  const profiles = await apiList<Identified & { username: string }>("/profiles", token);
  const profile = profiles.find((row) => row.username === username);
  if (!profile) throw new Error(`the demo account "${username}" was not created`);
  return profile.id;
};

interface GroupFixture {
  name: string;
  shift: "morning" | "afternoon" | "evening";
  teacherId: string;
  subject?: SubjectName;
}

const seedGroup = async (
  token: string,
  subjects: Map<SubjectName, Identified>,
  fixture: GroupFixture,
): Promise<Identified> => {
  const group = await findOrCreate<Identified & { name: string; teacherId: string }>(
    token,
    "/groups",
    (candidate) => candidate.name === fixture.name,
    { name: fixture.name, shift: fixture.shift, teacherId: fixture.teacherId },
  );

  // A leftover row from an earlier fixture generation can still hold this exact
  // name under a different teacher — reclaim it instead of silently testing against
  // someone else's turma.
  if (group.teacherId !== fixture.teacherId) {
    await apiRequest(`/groups/${group.id}`, "PATCH", token, { teacherId: fixture.teacherId });
  }

  if (fixture.subject) {
    await apiRequest("/assignments", "POST", token, {
      groupId: group.id,
      subjectId: subjects.get(fixture.subject)!.id,
      teacherId: fixture.teacherId,
    });
  }

  return group;
};

interface EventFixture {
  title: string;
  date: string;
  location: string;
  cost: number;
}

/**
 * Matched by title, since that is the only natural key the specs know. The API
 * has no PATCH for an event's groupId, so a row that drifted onto a stale group
 * (deleted and re-created under a fresh id by an earlier fixture generation) is
 * unrecoverable in place — the fix is to replace it, not to leave events the
 * owning teacher can never see again.
 */
const seedEvent = async (token: string, group: Identified, fixture: EventFixture): Promise<Identified> => {
  const existing = await findOrCreate<Identified & { title: string; groupId: string }>(
    token,
    "/events",
    (candidate) => candidate.title === fixture.title,
    { groupId: group.id, ...fixture },
  );

  if (existing.groupId === group.id) return existing;

  await apiRequest(`/events/${existing.id}`, "DELETE", token);
  const created = await apiRequest("/events", "POST", token, { groupId: group.id, ...fixture });
  return (await created.json()) as Identified;
};

interface StudentFixture {
  name: string;
  birthDate: string;
  guardianName: string;
  guardianPhone: string;
  groups: Identified[];
  active?: boolean;
}

const seedStudent = async (token: string, fixture: StudentFixture): Promise<Identified> => {
  const student = await findOrCreate<Identified & { name: string }>(
    token,
    "/students",
    (candidate) => candidate.name === fixture.name,
    {
      name: fixture.name,
      birthDate: fixture.birthDate,
      guardianName: fixture.guardianName,
      guardianPhone: fixture.guardianPhone,
    },
  );

  if (fixture.active === false) {
    await apiRequest(`/students/${student.id}`, "PATCH", token, { active: false });
  }

  // Enrolling is idempotent and answers 200, so a repeat run costs nothing.
  for (const group of fixture.groups) {
    await apiRequest("/enrollments", "POST", token, { studentId: student.id, groupId: group.id });
  }

  return student;
};

/**
 * academic-structure.spec.ts owns "Ricardo Alves" (2 turmas) and "Bruno Ferreira"
 * (1 turma) — the roll-call scoping test compares the two directly, so both must
 * exist inside this one file's fixture.
 */
const seedAcademicStructure = async (
  token: string,
  subjects: Map<SubjectName, Identified>,
): Promise<void> => {
  const teacher1Id = await profileIdOf(token, ACCOUNTS.academicaProfessor1.username);
  const teacher2Id = await profileIdOf(token, ACCOUNTS.academicaProfessor2.username);

  await seedGroup(token, subjects, {
    name: "Reforço de Matemática — Segunda",
    shift: "afternoon",
    teacherId: teacher1Id,
    subject: "Matemática",
  });
  await seedGroup(token, subjects, {
    name: "Reforço de Português — Quarta",
    shift: "morning",
    teacherId: teacher1Id,
    subject: "Português",
  });
  await seedGroup(token, subjects, {
    name: "Reforço de Ciências — Quarta",
    shift: "afternoon",
    teacherId: teacher2Id,
    subject: "Ciências",
  });
};

/** auth.spec.ts's "excluir professor regente" needs exactly one teacher with 2 turmas. */
const seedProfiles = async (token: string, subjects: Map<SubjectName, Identified>): Promise<void> => {
  const teacherId = await profileIdOf(token, ACCOUNTS.profilesTeacher.username);

  await seedGroup(token, subjects, {
    name: "E2E Perfis — Aula A",
    shift: "afternoon",
    teacherId: teacherId,
  });
  await seedGroup(token, subjects, {
    name: "E2E Perfis — Aula B",
    shift: "morning",
    teacherId: teacherId,
  });
};

/** evaluations.spec.ts creates its own avaliações against one turma with one aluno. */
const seedGrades = async (token: string, subjects: Map<SubjectName, Identified>): Promise<void> => {
  const teacherId = await profileIdOf(token, ACCOUNTS.gradesTeacher.username);

  const group = await seedGroup(token, subjects, {
    name: "E2E Notas — Aula",
    shift: "afternoon",
    teacherId: teacherId,
    subject: "Matemática",
  });

  await seedStudent(token, {
    name: "Aluno Notas Um",
    birthDate: "2012-02-02",
    guardianName: "Responsável do Aluno Notas Um",
    guardianPhone: "(11) 92222-0001",
    groups: [group],
  });
};

/**
 * events.spec.ts needs two teachers with clearly different groups: one that already
 * carries a paid and a free outing (so participation, payment and WhatsApp flows have
 * something to act on), and one with none (the scoping test starts from an empty group).
 * Benjamin's marks are reset to pending on every run, so "escopo" always starts clean.
 */
const seedEvents = async (token: string, subjects: Map<SubjectName, Identified>): Promise<void> => {
  const teacher1Id = await profileIdOf(token, ACCOUNTS.eventsTeacher1.username);
  const teacher2Id = await profileIdOf(token, ACCOUNTS.eventsTeacher2.username);

  // The coordinator test creates "Feira de Ciências" live through the UI, on the
  // teacher-2 group the scoping test expects to start empty. Clear it so a rerun's
  // scoping check isn't seeing the previous run's leftover event.
  const events = await apiList<Identified & { title: string }>("/events", token);
  for (const event of events.filter((row) => row.title === "Feira de Ciências")) {
    await apiRequest(`/events/${event.id}`, "DELETE", token);
  }

  const groupA = await seedGroup(token, subjects, {
    name: "E2E Eventos — Aula A",
    shift: "afternoon",
    teacherId: teacher1Id,
    subject: "Matemática",
  });
  await seedGroup(token, subjects, {
    name: "E2E Eventos — Aula B",
    shift: "afternoon",
    teacherId: teacher2Id,
    subject: "Ciências",
  });

  const benjamin = await seedStudent(token, {
    name: "Benjamin Harrison",
    birthDate: "2012-08-22",
    guardianName: "Responsável de Harrison",
    guardianPhone: "(11) 91111-0002",
    groups: [groupA],
  });
  await seedStudent(token, {
    name: "Marcus Thorne",
    birthDate: "2012-04-11",
    guardianName: "Mãe de Thorne",
    guardianPhone: "(11) 91111-0001",
    groups: [groupA],
  });

  const zooTrip = await seedEvent(token, groupA, {
    title: "Passeio ao Zoológico",
    date: "2026-09-05",
    location: "Zoológico Municipal",
    cost: 25,
  });
  await seedEvent(token, groupA, {
    title: "Visita ao Planetário",
    date: "2026-09-12",
    location: "Planetário",
    cost: 0,
  });

  await apiRequest(`/events/${zooTrip.id}/participations/${benjamin.id}`, "PUT", token, {
    authorization: "pending",
    payment: "pending",
  });
};

/**
 * pivot.spec.ts creates "João Pedro Silva" live through the UI and enrolls it —
 * an earlier run of this seed used to plant a student with that exact name, which turns
 * every `getByText("João Pedro Silva")` in that spec into a strict-mode violation.
 */
const removeStaleFixture = async (token: string, name: string): Promise<void> => {
  const students = await apiList<Identified & { name: string }>("/students", token);
  for (const student of students.filter((row) => row.name === name)) {
    await apiRequest(`/students/${student.id}`, "DELETE", token);
  }
};

const seedPivot = async (token: string): Promise<void> => {
  await removeStaleFixture(token, "João Pedro Silva");

  const teacherId = await profileIdOf(token, ACCOUNTS.pivotTeacher.username);
  await seedGroup(token, new Map(), { name: "E2E Pivot — Aula", shift: "afternoon", teacherId: teacherId });
};

/** "Enzo Ferreira" scores high in Matemática and lower in Português: aptitude reads "Exatas". */
const seedReports = async (token: string, subjects: Map<SubjectName, Identified>): Promise<void> => {
  const teacherId = await profileIdOf(token, ACCOUNTS.reportsTeacher.username);

  const groupA = await seedGroup(token, subjects, {
    name: "E2E Relatorios — Aula A",
    shift: "afternoon",
    teacherId: teacherId,
    subject: "Matemática",
  });
  const groupB = await seedGroup(token, subjects, {
    name: "E2E Relatorios — Aula B",
    shift: "morning",
    teacherId: teacherId,
    subject: "Português",
  });

  const enzo = await seedStudent(token, {
    name: "Enzo Ferreira",
    birthDate: "2012-04-11",
    guardianName: "Mãe de Ferreira",
    guardianPhone: "(11) 93333-0001",
    groups: [groupA, groupB],
  });

  const entries: { group: Identified; subjectName: SubjectName; score: number }[] = [
    { group: groupA, subjectName: "Matemática", score: 9.5 },
    { group: groupB, subjectName: "Português", score: 6 },
  ];

  for (const entry of entries) {
    const evaluation = await findOrCreate<Identified & { groupId: string; subjectId: string }>(
      token,
      "/evaluations",
      (candidate) =>
        candidate.groupId === entry.group.id && candidate.subjectId === subjects.get(entry.subjectName)!.id,
      {
        groupId: entry.group.id,
        subjectId: subjects.get(entry.subjectName)!.id,
        name: "Avaliação Diagnóstica",
        type: "exam",
        date: "2026-03-10",
        weight: 1,
      },
    );

    await apiRequest(`/evaluations/${evaluation.id}/grades`, "PUT", token, {
      entries: [{ studentId: enzo.id, score: entry.score }],
    });
  }
};

/**
 * student-detail.spec.ts needs a full scoping picture on its own: a student with two
 * turmas under one professor, a student owned only by the other professor, one with no
 * turma at all, and one inactive.
 */
const seedStudentDetail = async (token: string, subjects: Map<SubjectName, Identified>): Promise<void> => {
  const teacher1Id = await profileIdOf(token, ACCOUNTS.detailTeacher1.username);
  const teacher2Id = await profileIdOf(token, ACCOUNTS.detailTeacher2.username);

  const groupA = await seedGroup(token, subjects, {
    name: "E2E Detalhe — Aula A",
    shift: "afternoon",
    teacherId: teacher1Id,
    subject: "Matemática",
  });
  const groupB = await seedGroup(token, subjects, {
    name: "E2E Detalhe — Aula B",
    shift: "morning",
    teacherId: teacher1Id,
    subject: "Português",
  });
  await seedGroup(token, subjects, {
    name: "E2E Detalhe — Aula C",
    shift: "afternoon",
    teacherId: teacher2Id,
    subject: "Ciências",
  });
  const groupC = await findByName<Identified & { name: string }>(token, "/groups", "E2E Detalhe — Aula C");

  const studentOne = await seedStudent(token, {
    name: "Aluno Detalhe Um",
    birthDate: "2012-04-11",
    guardianName: "Responsável do Aluno Detalhe Um",
    guardianPhone: "(11) 94444-0001",
    groups: [groupA, groupB],
  });

  // Without at least one roll call, the record's "Presença" tab has no month to
  // summarize and renders an empty state instead of a heading — real, but not what
  // the tab-switching spec means to exercise.
  const session = await apiRequest("/attendance-sessions", "POST", token, {
    groupId: groupA.id,
    date: "2026-03-16",
  });
  const { id: sessionId } = (await session.json()) as Identified;
  await apiRequest(`/attendance-sessions/${sessionId}/records`, "PUT", token, {
    entries: [{ studentId: studentOne.id, status: "present" }],
  });
  await seedStudent(token, {
    name: "Aluno Detalhe Dois",
    birthDate: "2012-01-30",
    guardianName: "Responsável do Aluno Detalhe Dois",
    guardianPhone: "(11) 94444-0002",
    groups: [groupC],
  });
  await seedStudent(token, {
    name: "Aluno Detalhe Sem Aula",
    birthDate: "2012-06-18",
    guardianName: "Responsável do Aluno Detalhe Sem Aula",
    guardianPhone: "(11) 94444-0003",
    groups: [],
  });
  await seedStudent(token, {
    name: "Aluno Detalhe Inativo",
    birthDate: "2011-09-09",
    guardianName: "Responsável do Aluno Detalhe Inativo",
    guardianPhone: "(11) 94444-0004",
    groups: [],
    active: false,
  });
};

const seedRollCall = async (token: string): Promise<void> => {
  const teacherId = await profileIdOf(token, ACCOUNTS.rollCallTeacher.username);
  const group = await seedGroup(token, new Map(), {
    name: "E2E Chamada — Aula",
    shift: "afternoon",
    teacherId: teacherId,
  });

  await seedStudent(token, {
    name: "Aluno Chamada Um",
    birthDate: "2012-05-05",
    guardianName: "Responsável do Aluno Chamada Um",
    guardianPhone: "(11) 95555-0001",
    groups: [group],
  });
  await seedStudent(token, {
    name: "Aluno Chamada Dois",
    birthDate: "2012-06-06",
    guardianName: "Responsável do Aluno Chamada Dois",
    guardianPhone: "(11) 95555-0002",
    groups: [group],
  });
};

/**
 * Specs stamp their throwaway rows with `Date.now()` so a rerun never collides with
 * the last one, but nothing ever deleted them — the panel accumulated one "Redação
 * E2E 1789…" turma, one "Filosofia E2E 1789…" matéria, one "P2 1789…" avaliação and
 * so on per run, forever. These patterns are exactly what those specs emit and
 * nothing a person would type by hand: a real matéria is never named "Filosofia
 * E2E <13-digit number>".
 */
const STALE_GROUP = /^Redação E2E \d+$/;
const STALE_SUBJECT = /^Filosofia E2E \d+$/;
const STALE_EVALUATION = /^P[23] \d+$/;
const STALE_STUDENT = /^Aluno Teste E2E \d+$/;
const STALE_PROFILE_USERNAME = /^perfil\.(teste|papel|inativo|ciclo)\.\d+$/;

const deleteRow = async (
  token: string,
  collection: string,
  id: string,
  label: string,
  failures: string[],
): Promise<void> => {
  const response = await apiRequest(`${collection}/${id}`, "DELETE", token);
  if (!response.ok) {
    failures.push(`${collection}/${id} (${label}): ${String(response.status)}`);
  }
};

/**
 * Removes every leftover a previous run's timestamped fixture created, before this
 * run seeds anything. Assignments go first because the API refuses to delete a
 * group or a subject still referenced by one (409 conflict). A row this cannot
 * remove is reported, not swallowed — a silent `catch {}` here would just let the
 * litter keep growing under a different reason.
 */
const sweepLeftovers = async (token: string): Promise<void> => {
  const [groups, subjects, evaluations, students, profiles, assignments] = await Promise.all([
    apiList<Identified & { name: string }>("/groups", token),
    apiList<Identified & { name: string }>("/subjects", token),
    apiList<Identified & { name: string }>("/evaluations", token),
    apiList<Identified & { name: string }>("/students", token),
    apiList<Identified & { username: string }>("/profiles", token),
    apiList<Identified & { groupId: string; subjectId: string }>("/assignments", token),
  ]);

  const staleGroups = groups.filter((group) => STALE_GROUP.test(group.name));
  const staleSubjects = subjects.filter((subject) => STALE_SUBJECT.test(subject.name));
  const staleGroupIds = new Set(staleGroups.map((group) => group.id));
  const staleSubjectIds = new Set(staleSubjects.map((subject) => subject.id));

  const failures: string[] = [];

  for (const assignment of assignments) {
    if (staleGroupIds.has(assignment.groupId) || staleSubjectIds.has(assignment.subjectId)) {
      await deleteRow(token, "/assignments", assignment.id, "assignment on a stale row", failures);
    }
  }

  for (const evaluation of evaluations.filter((row) => STALE_EVALUATION.test(row.name))) {
    await deleteRow(token, "/evaluations", evaluation.id, evaluation.name, failures);
  }

  for (const group of staleGroups) {
    await deleteRow(token, "/groups", group.id, group.name, failures);
  }

  for (const subject of staleSubjects) {
    await deleteRow(token, "/subjects", subject.id, subject.name, failures);
  }

  for (const student of students.filter((row) => STALE_STUDENT.test(row.name))) {
    await deleteRow(token, "/students", student.id, student.name, failures);
  }

  for (const profile of profiles.filter((row) => STALE_PROFILE_USERNAME.test(row.username))) {
    await deleteRow(token, "/profiles", profile.id, profile.username, failures);
  }

  if (failures.length > 0) {
    throw new Error(`sweepLeftovers could not remove: ${failures.join(", ")}`);
  }
};

export const seedAll = async (): Promise<void> => {
  const token = await seedAccounts();
  await sweepLeftovers(token);
  const subjects = await seedSubjects(token);

  await seedAcademicStructure(token, subjects);
  await seedProfiles(token, subjects);
  await seedGrades(token, subjects);
  await seedEvents(token, subjects);
  await seedPivot(token);
  await seedReports(token, subjects);
  await seedStudentDetail(token, subjects);
  await seedRollCall(token);
};
