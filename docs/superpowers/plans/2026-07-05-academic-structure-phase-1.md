# Academic Structure (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin build the school structure (turmas, matérias, lecionamentos) and fix the roll-call so a professor only sees the turmas they are regente of.

**Architecture:** Feature-Sliced Design over a localStorage store (`radarge.db`, async fetchers mirroring a future Supabase adapter). New entity `assignment` (turma × matéria × professor) joins the existing `group`/`subject`. Admin CRUD reuses the list+form-modal pattern already used by `ProfilesAdmin`/`StudentList`. Attendance stays one-per-(turma, date), scoped by the group's regente.

**Tech Stack:** Next.js 16 (App Router, static export), React 19, TypeScript, Tailwind CSS 4, TanStack Query, zod, Vitest, Playwright, TailAdmin UI components.

**Spec:** `docs/superpowers/specs/2026-07-05-estrutura-academica-fase-1-design.md`

## Global Constraints

- **Code language: English everywhere** — identifiers, types, comments, and test descriptions. Example: `createAssignment`, `describe("createAssignment rejects duplicate (group, subject)")`.
- **PT-BR only in user-facing UI** — visible JSX text, `label`, `placeholder`, error/success copy, toasts, `aria-label`. Thrown `Error` messages that surface to the user are UI copy → PT-BR.
- **Authorship:** every commit's author AND committer is `Emerson Silva <emerson_jdss@hotmail.com>`. No co-author, no AI trace anywhere. Commit with `git -c user.name="Emerson Silva" -c user.email="emerson_jdss@hotmail.com" commit -m "…"`. Never `git push` (human-only).
- **Commit messages:** English, short imperative (`add …`, `fix …`).
- **Styling:** design tokens only (`var(--color-*)`, `text-brand-*`, etc.) — never raw hex. Mobile-first; verify 375/768/1280.
- **White-label:** keep new code tenant-agnostic — no `organizationId`, no hardcoded school/ONG/"Radarge" name in domain logic (branding stays only in `AppSidebar`).
- **Store:** bump `STORAGE_KEY` to `radarge.db.v6` (adds the `assignments` collection); add `radarge.db.v5` to `LEGACY_KEYS`.
- **Commands:** `npm test` (Vitest), `npm run type-check`, `npm run build`, `npm run test:e2e` (Playwright). If the `rtk` hook interferes, prefix with `rtk proxy` (e.g. `rtk proxy npm test`).

---

### Task 1: `assignment` entity + store wiring + seed

**Files:**

- Create: `src/entities/assignment/model.ts`
- Create: `src/entities/assignment/api.ts`
- Create: `src/entities/assignment/queries.ts`
- Create: `src/entities/assignment/api.test.ts`
- Modify: `src/shared/lib/storage/db.ts` (add `"assignments"` collection; bump key to v6)
- Modify: `src/shared/lib/storage/seed.ts` (add a second teacher + `assignments`)

**Interfaces:**

- Consumes: `readCollection`, `mutateCollection` from `@/shared/lib/storage/db`.
- Produces:
  - `Assignment = { id: string; groupId: string; subjectId: string; teacherId: string }`
  - `fetchAssignments(): Promise<Assignment[]>`
  - `fetchAssignmentsByGroup(groupId: string): Promise<Assignment[]>`
  - `fetchAssignmentsByTeacher(teacherId: string): Promise<Assignment[]>`
  - `NewAssignmentInput = { groupId: string; subjectId: string; teacherId: string }`
  - `createAssignment(input: NewAssignmentInput): Promise<Assignment>` (throws on duplicate `(groupId, subjectId)`)
  - `updateAssignmentTeacher(id: string, teacherId: string): Promise<void>`
  - `deleteAssignment(id: string): Promise<void>`
  - Hooks: `useAssignmentsByGroup`, `useAssignmentsByTeacher`, `useCreateAssignment`, `useUpdateAssignmentTeacher`, `useDeleteAssignment`.

- [ ] **Step 1: Add the collection to the store**

In `src/shared/lib/storage/db.ts`, add `"assignments"` to the `Collection` union and bump the key:

```ts
const STORAGE_KEY = "radarge.db.v6";
const LEGACY_KEYS = [
  "radarge.db.v1",
  "radarge.db.v2",
  "radarge.db.v3",
  "radarge.db.v4",
  "radarge.db.v5",
];

export type Collection =
  | "profiles"
  | "groups"
  | "students"
  | "attendanceSessions"
  | "attendanceRecords"
  | "schoolEvents"
  | "subjects"
  | "grades"
  | "assignments";
```

- [ ] **Step 2: Write the model**

`src/entities/assignment/model.ts`:

```ts
import { z } from "zod";

export const assignmentSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  subjectId: z.string(),
  teacherId: z.string(),
});

export type Assignment = z.infer<typeof assignmentSchema>;
```

- [ ] **Step 3: Write the failing api test**

`src/entities/assignment/api.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "@/shared/lib/storage/db";
import {
  createAssignment,
  deleteAssignment,
  fetchAssignmentsByGroup,
  fetchAssignmentsByTeacher,
  updateAssignmentTeacher,
} from "./api";

describe("assignment api (over the store)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("creates an assignment for a group/subject/teacher", async () => {
    const created = await createAssignment({
      groupId: "turma-fis-a",
      subjectId: "materia-quimica",
      teacherId: "perfil-ricardo",
    });
    expect(created.id).toBeTruthy();
    const forGroup = await fetchAssignmentsByGroup("turma-fis-a");
    expect(forGroup.some((a) => a.subjectId === "materia-quimica")).toBe(true);
  });

  it("rejects a duplicate (group, subject)", async () => {
    await createAssignment({
      groupId: "turma-fis-a",
      subjectId: "materia-quimica",
      teacherId: "perfil-ricardo",
    });
    await expect(
      createAssignment({
        groupId: "turma-fis-a",
        subjectId: "materia-quimica",
        teacherId: "perfil-bruno",
      }),
    ).rejects.toThrow();
  });

  it("changes the teacher of an assignment", async () => {
    const created = await createAssignment({
      groupId: "turma-fis-a",
      subjectId: "materia-quimica",
      teacherId: "perfil-ricardo",
    });
    await updateAssignmentTeacher(created.id, "perfil-bruno");
    const forTeacher = await fetchAssignmentsByTeacher("perfil-bruno");
    expect(forTeacher.some((a) => a.id === created.id)).toBe(true);
  });

  it("deletes an assignment", async () => {
    const created = await createAssignment({
      groupId: "turma-fis-a",
      subjectId: "materia-quimica",
      teacherId: "perfil-ricardo",
    });
    await deleteAssignment(created.id);
    const forGroup = await fetchAssignmentsByGroup("turma-fis-a");
    expect(forGroup.some((a) => a.id === created.id)).toBe(false);
  });
});
```

- [ ] **Step 4: Run the test — verify it fails**

Run: `npm test src/entities/assignment/api.test.ts`
Expected: FAIL (module `./api` not found).

- [ ] **Step 5: Write the api**

`src/entities/assignment/api.ts`:

```ts
import { mutateCollection, readCollection } from "@/shared/lib/storage/db";
import { assignmentSchema, type Assignment } from "./model";

export async function fetchAssignments(): Promise<Assignment[]> {
  const rows = await readCollection("assignments");
  return rows.map((row) => assignmentSchema.parse(row));
}

export async function fetchAssignmentsByGroup(groupId: string): Promise<Assignment[]> {
  const assignments = await fetchAssignments();
  return assignments.filter((assignment) => assignment.groupId === groupId);
}

export async function fetchAssignmentsByTeacher(teacherId: string): Promise<Assignment[]> {
  const assignments = await fetchAssignments();
  return assignments.filter((assignment) => assignment.teacherId === teacherId);
}

export interface NewAssignmentInput {
  groupId: string;
  subjectId: string;
  teacherId: string;
}

export async function createAssignment(input: NewAssignmentInput): Promise<Assignment> {
  const assignments = await fetchAssignments();
  const duplicate = assignments.some(
    (assignment) =>
      assignment.groupId === input.groupId && assignment.subjectId === input.subjectId,
  );
  if (duplicate) {
    // Surfaces to the admin in the turma panel → PT-BR copy.
    throw new Error("Esta matéria já está atribuída a esta turma.");
  }
  const assignment: Assignment = {
    id: crypto.randomUUID(),
    groupId: input.groupId,
    subjectId: input.subjectId,
    teacherId: input.teacherId,
  };
  assignmentSchema.parse(assignment);
  await mutateCollection<Assignment>("assignments", (rows) => [...rows, assignment]);
  return assignment;
}

export async function updateAssignmentTeacher(id: string, teacherId: string): Promise<void> {
  await mutateCollection<Assignment>("assignments", (rows) =>
    rows.map((assignment) => (assignment.id === id ? { ...assignment, teacherId } : assignment)),
  );
}

export async function deleteAssignment(id: string): Promise<void> {
  await mutateCollection<Assignment>("assignments", (rows) =>
    rows.filter((assignment) => assignment.id !== id),
  );
}
```

- [ ] **Step 6: Write the queries**

`src/entities/assignment/queries.ts`:

```ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAssignment,
  deleteAssignment,
  fetchAssignmentsByGroup,
  fetchAssignmentsByTeacher,
  updateAssignmentTeacher,
  type NewAssignmentInput,
} from "./api";

export const assignmentKeys = {
  all: ["assignments"],
  byGroup: (groupId: string) => ["assignments", "group", groupId],
  byTeacher: (teacherId: string) => ["assignments", "teacher", teacherId],
};

export function useAssignmentsByGroup(groupId: string) {
  return useQuery({
    queryKey: assignmentKeys.byGroup(groupId),
    queryFn: () => fetchAssignmentsByGroup(groupId),
    enabled: Boolean(groupId),
  });
}

export function useAssignmentsByTeacher(teacherId: string) {
  return useQuery({
    queryKey: assignmentKeys.byTeacher(teacherId),
    queryFn: () => fetchAssignmentsByTeacher(teacherId),
    enabled: Boolean(teacherId),
  });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewAssignmentInput) => createAssignment(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assignmentKeys.all }),
  });
}

export function useUpdateAssignmentTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, teacherId }: { id: string; teacherId: string }) =>
      updateAssignmentTeacher(id, teacherId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assignmentKeys.all }),
  });
}

export function useDeleteAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAssignment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assignmentKeys.all }),
  });
}
```

- [ ] **Step 7: Seed a second teacher and the assignments**

In `src/shared/lib/storage/seed.ts`: add a second teacher id constant, add the profile, give each turma an explicit regente, seed chamadas with the turma's regente, and build `assignments`.

Add near the top constants:

```ts
const TEACHER_TWO_ID = "perfil-bruno";
```

In `seedDb()`, add Bruno to `perfis` (reuse the `prof123` hash — demo only):

```ts
    { id: TEACHER_TWO_ID, name: "Bruno Farias", email: "bruno@radarge.escola", role: "teacher", jobTitle: "Professor", username: "bruno", passwordHash: "00624b02e1f9b996a3278f559d5d55313552ad2c0bafc82adfd975c12df61eaf", active: true },
```

Replace the `const turmas = …` line so each turma has an explicit regente (Bruno is regente of Ciências):

```ts
const REGENTE_POR_TURMA: Record<string, string> = {
  "turma-mat-b": PROFESSOR_ID,
  "turma-fis-a": PROFESSOR_ID,
  "turma-cie-c": TEACHER_TWO_ID,
};
const turmas = TURMAS.map((turma) => ({ ...turma, teacherId: REGENTE_POR_TURMA[turma.id] }));
```

In the chamada loop, seed each session with the turma's regente instead of the hardcoded professor:

```ts
        teacherId: turma.teacherId,
```

Add the `assignments` array before the `return`:

```ts
const assignments = [
  {
    id: "assign-matb-mat",
    groupId: "turma-mat-b",
    subjectId: "materia-matematica",
    teacherId: PROFESSOR_ID,
  },
  {
    id: "assign-matb-fis",
    groupId: "turma-mat-b",
    subjectId: "materia-fisica",
    teacherId: PROFESSOR_ID,
  },
  {
    id: "assign-matb-his",
    groupId: "turma-mat-b",
    subjectId: "materia-historia",
    teacherId: TEACHER_TWO_ID,
  },
  {
    id: "assign-fisa-fis",
    groupId: "turma-fis-a",
    subjectId: "materia-fisica",
    teacherId: PROFESSOR_ID,
  },
  {
    id: "assign-fisa-ing",
    groupId: "turma-fis-a",
    subjectId: "materia-ingles",
    teacherId: TEACHER_TWO_ID,
  },
  {
    id: "assign-ciec-bio",
    groupId: "turma-cie-c",
    subjectId: "materia-biologia",
    teacherId: TEACHER_TWO_ID,
  },
  {
    id: "assign-ciec-por",
    groupId: "turma-cie-c",
    subjectId: "materia-portugues",
    teacherId: PROFESSOR_ID,
  },
];
```

Add `assignments` to the returned object:

```ts
return {
  profiles: perfis,
  groups: turmas,
  students: alunos,
  attendanceSessions: chamadas,
  attendanceRecords: presencas,
  schoolEvents: eventosEscolares,
  subjects: materias,
  grades: notas,
  assignments,
};
```

- [ ] **Step 8: Run the test — verify it passes**

Run: `npm test src/entities/assignment/api.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 9: Type-check and commit**

Run: `npm run type-check` → no errors.

```bash
git add src/entities/assignment src/shared/lib/storage/db.ts src/shared/lib/storage/seed.ts
git -c user.name="Emerson Silva" -c user.email="emerson_jdss@hotmail.com" commit -m "add assignment entity linking group, subject and teacher"
```

---

### Task 2: `subject` writes (create/update/delete + guard)

**Files:**

- Modify: `src/entities/subject/api.ts`
- Modify: `src/entities/subject/queries.ts`
- Create: `src/entities/subject/write.test.ts`

**Interfaces:**

- Consumes: `mutateCollection`, `readCollection`; `Assignment`, `Grade` shapes for the delete guard.
- Produces:
  - `NewSubjectInput = { name: string; area: Area }`
  - `SubjectUpdate = { name?: string; area?: Area }`
  - `createSubject(input): Promise<Subject>`
  - `updateSubject(id, patch): Promise<Subject>`
  - `deleteSubject(id): Promise<void>` (throws if referenced by an assignment or a grade)
  - Hooks: `useCreateSubject`, `useUpdateSubject`, `useDeleteSubject`.

- [ ] **Step 1: Write the failing test**

`src/entities/subject/write.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "@/shared/lib/storage/db";
import { createAssignment } from "@/entities/assignment/api";
import { createSubject, deleteSubject, fetchSubjects, updateSubject } from "./api";

describe("subject writes (over the store)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("creates and updates a subject", async () => {
    const created = await createSubject({ name: "Filosofia", area: "humanas" });
    expect(created.id).toBeTruthy();
    await updateSubject(created.id, { name: "Sociologia" });
    const found = (await fetchSubjects()).find((s) => s.id === created.id);
    expect(found?.name).toBe("Sociologia");
  });

  it("deletes an unused subject", async () => {
    const created = await createSubject({ name: "Filosofia", area: "humanas" });
    await deleteSubject(created.id);
    expect((await fetchSubjects()).some((s) => s.id === created.id)).toBe(false);
  });

  it("refuses to delete a subject used by an assignment", async () => {
    const created = await createSubject({ name: "Filosofia", area: "humanas" });
    await createAssignment({
      groupId: "turma-mat-b",
      subjectId: created.id,
      teacherId: "perfil-ricardo",
    });
    await expect(deleteSubject(created.id)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the test — verify it fails**

Run: `npm test src/entities/subject/write.test.ts`
Expected: FAIL (`createSubject` not exported).

- [ ] **Step 3: Implement the writes**

Append to `src/entities/subject/api.ts` (keep the existing `fetchSubjects`; add the import for `mutateCollection` and the guard reads):

```ts
import { mutateCollection, readCollection } from "@/shared/lib/storage/db";
import { subjectSchema, type Area, type Subject } from "./model";

// (existing fetchSubjects stays)

export interface NewSubjectInput {
  name: string;
  area: Area;
}

export interface SubjectUpdate {
  name?: string;
  area?: Area;
}

export async function createSubject(input: NewSubjectInput): Promise<Subject> {
  const subject: Subject = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    area: input.area,
  };
  subjectSchema.parse(subject);
  await mutateCollection<Subject>("subjects", (rows) => [...rows, subject]);
  return subject;
}

export async function updateSubject(id: string, patch: SubjectUpdate): Promise<Subject> {
  const rows = await fetchSubjects();
  const current = rows.find((subject) => subject.id === id);
  if (!current) throw new Error("Matéria não encontrada.");
  const next: Subject = {
    ...current,
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.area !== undefined ? { area: patch.area } : {}),
  };
  subjectSchema.parse(next);
  await mutateCollection<Subject>("subjects", (subjects) =>
    subjects.map((subject) => (subject.id === id ? next : subject)),
  );
  return next;
}

export async function deleteSubject(id: string): Promise<void> {
  const assignments = await readCollection<{ subjectId: string }>("assignments");
  const grades = await readCollection<{ subjectId: string }>("grades");
  const inUse =
    assignments.some((assignment) => assignment.subjectId === id) ||
    grades.some((grade) => grade.subjectId === id);
  if (inUse) {
    throw new Error("Matéria em uso (lecionamento ou nota) não pode ser removida.");
  }
  await mutateCollection<Subject>("subjects", (subjects) =>
    subjects.filter((subject) => subject.id !== id),
  );
}
```

- [ ] **Step 4: Add the mutation hooks**

Append to `src/entities/subject/queries.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createSubject,
  deleteSubject,
  updateSubject,
  type NewSubjectInput,
  type SubjectUpdate,
} from "./api";

export function useCreateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewSubjectInput) => createSubject(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subjectKeys.all }),
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: SubjectUpdate }) => updateSubject(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subjectKeys.all }),
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSubject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subjectKeys.all }),
  });
}
```

- [ ] **Step 5: Run the test — verify it passes**

Run: `npm test src/entities/subject/write.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Type-check and commit**

Run: `npm run type-check` → no errors.

```bash
git add src/entities/subject
git -c user.name="Emerson Silva" -c user.email="emerson_jdss@hotmail.com" commit -m "add subject create, update and guarded delete"
```

---

### Task 3: `group` writes (create/update/delete + guard) + shift labels

**Files:**

- Modify: `src/entities/group/model.ts` (add `shiftLabels`)
- Modify: `src/entities/group/api.ts`
- Modify: `src/entities/group/queries.ts`
- Create: `src/entities/group/write.test.ts`

**Interfaces:**

- Produces:
  - `shiftLabels: Record<Shift, string>` (PT-BR display for the shift enum)
  - `NewGroupInput = { name: string; gradeLevel: string; shift: Shift; teacherId: string }`
  - `GroupUpdate = { name?: string; gradeLevel?: string; shift?: Shift; teacherId?: string }`
  - `createGroup(input): Promise<Group>`
  - `updateGroup(id, patch): Promise<Group>`
  - `deleteGroup(id): Promise<void>` (throws if the turma has students or attendance sessions)
  - Hooks: `useCreateGroup`, `useUpdateGroup`, `useDeleteGroup`.

- [ ] **Step 1: Add PT-BR shift labels to the model**

Append to `src/entities/group/model.ts`:

```ts
export const shiftLabels: Record<Shift, string> = {
  manhã: "Manhã",
  afternoon: "Tarde",
  evening: "Noite",
};
```

- [ ] **Step 2: Write the failing test**

`src/entities/group/write.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "@/shared/lib/storage/db";
import { createStudent } from "@/entities/student/api";
import { createGroup, deleteGroup, fetchGroups, updateGroup } from "./api";

describe("group writes (over the store)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("creates and updates a group with a regente", async () => {
    const created = await createGroup({
      name: "Redação I",
      gradeLevel: "1ª série",
      shift: "afternoon",
      teacherId: "perfil-ricardo",
    });
    await updateGroup(created.id, { teacherId: "perfil-bruno" });
    const found = (await fetchGroups()).find((g) => g.id === created.id);
    expect(found?.teacherId).toBe("perfil-bruno");
  });

  it("deletes an empty group", async () => {
    const created = await createGroup({
      name: "Redação I",
      gradeLevel: "1ª série",
      shift: "afternoon",
      teacherId: "perfil-ricardo",
    });
    await deleteGroup(created.id);
    expect((await fetchGroups()).some((g) => g.id === created.id)).toBe(false);
  });

  it("refuses to delete a group that has students", async () => {
    const created = await createGroup({
      name: "Redação I",
      gradeLevel: "1ª série",
      shift: "afternoon",
      teacherId: "perfil-ricardo",
    });
    await createStudent({ name: "Aluno Teste", groupId: created.id });
    await expect(deleteGroup(created.id)).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Run the test — verify it fails**

Run: `npm test src/entities/group/write.test.ts`
Expected: FAIL (`createGroup` not exported).

- [ ] **Step 4: Implement the writes**

Update the import line and append to `src/entities/group/api.ts`:

```ts
import { mutateCollection, readCollection } from "@/shared/lib/storage/db";
import { groupSchema, type Group, type Shift } from "./model";

// (existing fetchGroups / fetchGroupById stay)

export interface NewGroupInput {
  name: string;
  gradeLevel: string;
  shift: Shift;
  teacherId: string;
}

export interface GroupUpdate {
  name?: string;
  gradeLevel?: string;
  shift?: Shift;
  teacherId?: string;
}

export async function createGroup(input: NewGroupInput): Promise<Group> {
  const group: Group = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    gradeLevel: input.gradeLevel.trim(),
    shift: input.shift,
    teacherId: input.teacherId,
  };
  groupSchema.parse(group);
  await mutateCollection<Group>("groups", (rows) => [...rows, group]);
  return group;
}

export async function updateGroup(id: string, patch: GroupUpdate): Promise<Group> {
  const rows = await fetchGroups();
  const current = rows.find((group) => group.id === id);
  if (!current) throw new Error("Turma não encontrada.");
  const next: Group = {
    ...current,
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.gradeLevel !== undefined ? { gradeLevel: patch.gradeLevel.trim() } : {}),
    ...(patch.shift !== undefined ? { shift: patch.shift } : {}),
    ...(patch.teacherId !== undefined ? { teacherId: patch.teacherId } : {}),
  };
  groupSchema.parse(next);
  await mutateCollection<Group>("groups", (groups) =>
    groups.map((group) => (group.id === id ? next : group)),
  );
  return next;
}

export async function deleteGroup(id: string): Promise<void> {
  const students = await readCollection<{ groupId: string }>("students");
  const sessions = await readCollection<{ groupId: string }>("attendanceSessions");
  const inUse =
    students.some((student) => student.groupId === id) ||
    sessions.some((session) => session.groupId === id);
  if (inUse) {
    throw new Error("Turma com alunos ou chamadas não pode ser removida.");
  }
  await mutateCollection<Group>("groups", (groups) => groups.filter((group) => group.id !== id));
}
```

> Note: `deleteGroup` blocks when the turma has students or sessions; once it passes that guard it **cascade-deletes the turma's own `assignment` rows** (lecionamentos are sub-objects of the turma), so no orphaned assignments remain to lock their subjects. (Added after the final review flagged the orphan-lock — commit `cascade delete lecionamentos when a turma is removed`.)

- [ ] **Step 5: Add the mutation hooks**

Append to `src/entities/group/queries.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createGroup, deleteGroup, updateGroup, type NewGroupInput, type GroupUpdate } from "./api";

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewGroupInput) => createGroup(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupKeys.all }),
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: GroupUpdate }) => updateGroup(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupKeys.all }),
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGroup(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupKeys.all }),
  });
}
```

- [ ] **Step 6: Run the test — verify it passes**

Run: `npm test src/entities/group/write.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Type-check and commit**

Run: `npm run type-check` → no errors.

```bash
git add src/entities/group
git -c user.name="Emerson Silva" -c user.email="emerson_jdss@hotmail.com" commit -m "add group create, update and guarded delete"
```

---

### Task 4: Matérias admin screen (`subjects-admin` widget + route + nav)

**Files:**

- Create: `src/widgets/subjects-admin/SubjectsAdmin.tsx`
- Create: `src/widgets/subjects-admin/SubjectFormModal.tsx`
- Create: `src/app/(app)/subjects/page.tsx`
- Modify: `src/shared/config/navigation.ts` (add `"materia"` icon + `/subjects` entry to `navAdmin`)
- Modify: `src/widgets/app-shell/AppSidebar.tsx` (map `materia` → `DocsIcon`)

**Interfaces:**

- Consumes: `useSubjects`, `useCreateSubject`, `useUpdateSubject`, `useDeleteSubject`; `areaLabels`, `AREAS`, `type Subject`, `type Area`.
- Produces: route `/subjects` (admin-only).

- [ ] **Step 1: Add the nav entry and icon type**

In `src/shared/config/navigation.ts`, extend `NavIcon` and `navAdmin`:

```ts
export type NavIcon = "painel" | "session" | "relatorios" | "user" | "admin" | "materia";

export const navAdmin: NavItem[] = [
  ...navCoordinator,
  { href: "/subjects", label: "Matérias", icon: "materia" },
  { href: "/users", label: "Perfis", icon: "admin" },
];
```

In `src/widgets/app-shell/AppSidebar.tsx`, import `DocsIcon` and add it to `navIcons`:

```ts
import { GridIcon, CalenderIcon, GroupIcon, PieChartIcon, UserCircleIcon, DocsIcon } from "@tailadmin/icons";

const navIcons: Record<NavIcon, ReactNode> = {
  painel: <GridIcon />,
  session: <CalenderIcon />,
  user: <GroupIcon />,
  relatorios: <PieChartIcon />,
  admin: <UserCircleIcon />,
  materia: <DocsIcon />,
};
```

- [ ] **Step 2: Write the form modal**

`src/widgets/subjects-admin/SubjectFormModal.tsx` (mirrors `StudentFormModal`):

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { AREAS, areaLabels, type Area } from "@/entities/subject/model";
import type { Subject } from "@/entities/subject/model";
import { useCreateSubject, useUpdateSubject } from "@/entities/subject/queries";
import { Modal } from "@tailadmin/components/ui/modal";
import Button from "@tailadmin/components/ui/button/Button";
import Label from "@tailadmin/components/form/Label";

const controlClasses =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10";

export interface SubjectFormModalProps {
  subject: Subject | null | undefined;
  onClose: () => void;
}

export function SubjectFormModal({ subject, onClose }: SubjectFormModalProps) {
  return (
    <Modal isOpen={subject !== undefined} onClose={onClose} className="m-4 max-w-lg p-6">
      {subject !== undefined && (
        <SubjectFormBody key={subject?.id ?? "new"} subject={subject} onClose={onClose} />
      )}
    </Modal>
  );
}

function SubjectFormBody({ subject, onClose }: { subject: Subject | null; onClose: () => void }) {
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();

  const [name, setName] = useState(subject?.name ?? "");
  const [area, setArea] = useState<Area>(subject?.area ?? "exatas");
  const [erro, setErro] = useState<string | null>(null);
  const saving = createSubject.isPending || updateSubject.isPending;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setErro(null);
    try {
      if (subject) {
        await updateSubject.mutateAsync({ id: subject.id, patch: { name: name.trim(), area } });
      } else {
        await createSubject.mutateAsync({ name, area });
      }
      onClose();
    } catch {
      setErro("Não foi possível salvar a matéria.");
    }
  }

  return (
    <form onSubmit={save}>
      <h4 className="mb-6 text-lg font-semibold text-gray-800">
        {subject ? "Editar matéria" : "Adicionar matéria"}
      </h4>

      <div className="mb-5">
        <Label htmlFor="materia-nome">Nome</Label>
        <input
          id="materia-nome"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          autoFocus
          className={controlClasses}
        />
      </div>

      <div className="mb-5">
        <Label htmlFor="materia-area">Área</Label>
        <select
          id="materia-area"
          value={area}
          onChange={(event) => setArea(event.target.value as Area)}
          className={controlClasses}
        >
          {AREAS.map((value) => (
            <option key={value} value={value}>
              {areaLabels[value]}
            </option>
          ))}
        </select>
      </div>

      {erro && (
        <p role="alert" className="mb-5 text-sm text-error-600">
          {erro}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Write the list widget**

`src/widgets/subjects-admin/SubjectsAdmin.tsx`:

```tsx
"use client";

import { useState } from "react";
import { areaLabels, type Subject } from "@/entities/subject/model";
import { useSubjects, useDeleteSubject } from "@/entities/subject/queries";
import Button from "@tailadmin/components/ui/button/Button";
import { SubjectFormModal } from "./SubjectFormModal";

export function SubjectsAdmin() {
  const { data: subjects, isLoading } = useSubjects();
  const deleteSubject = useDeleteSubject();
  // undefined = modal closed; null = creating; Subject = editing.
  const [editing, setEditing] = useState<Subject | null | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);

  async function remover(subject: Subject) {
    setErro(null);
    try {
      await deleteSubject.mutateAsync(subject.id);
    } catch (motivo) {
      setErro(motivo instanceof Error ? motivo.message : "Não foi possível remover.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Matérias</h1>
        <Button size="sm" onClick={() => setEditing(null)}>
          Adicionar matéria
        </Button>
      </header>

      {erro && (
        <p role="alert" className="text-sm text-error-600">
          {erro}
        </p>
      )}

      {isLoading ? (
        <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
      ) : (
        <ul className="flex flex-col gap-2">
          {(subjects ?? []).map((subject) => (
            <li
              key={subject.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <div>
                <p className="font-medium text-gray-800">{subject.name}</p>
                <p className="text-xs text-gray-500">{areaLabels[subject.area]}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(subject)}>
                  Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => remover(subject)}>
                  Excluir
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <SubjectFormModal subject={editing} onClose={() => setEditing(undefined)} />
    </div>
  );
}
```

- [ ] **Step 4: Add the route**

`src/app/(app)/subjects/page.tsx`:

```tsx
"use client";

import { useRequireRole } from "@/features/session/use-require-role";
import { SubjectsAdmin } from "@/widgets/subjects-admin/SubjectsAdmin";

export default function SubjectsPage() {
  const permitido = useRequireRole(["admin"]);
  if (!permitido) return null;
  return <SubjectsAdmin />;
}
```

- [ ] **Step 5: Verify build + type-check**

Run: `npm run type-check` → no errors.
Run: `npm run build` → succeeds (static export includes `/subjects`).

- [ ] **Step 6: Commit**

```bash
git add src/widgets/subjects-admin "src/app/(app)/subjects" src/shared/config/navigation.ts src/widgets/app-shell/AppSidebar.tsx
git -c user.name="Emerson Silva" -c user.email="emerson_jdss@hotmail.com" commit -m "add subjects admin screen"
```

---

### Task 5: Turmas admin screen + lecionamentos (`groups-admin` widget + route + nav)

**Files:**

- Create: `src/widgets/groups-admin/GroupsAdmin.tsx`
- Create: `src/widgets/groups-admin/GroupFormModal.tsx`
- Create: `src/widgets/groups-admin/GroupAssignmentsPanel.tsx`
- Create: `src/app/(app)/groups/page.tsx`
- Modify: `src/shared/config/navigation.ts` (add `"turma"` icon + `/groups` entry)
- Modify: `src/widgets/app-shell/AppSidebar.tsx` (map `turma` → `TableIcon`)

**Interfaces:**

- Consumes: `useGroups`, `useCreateGroup`, `useUpdateGroup`, `useDeleteGroup`, `shiftLabels`, `shiftSchema`, `type Group`, `type Shift`; `useProfiles` (regente/teacher select, filter `role === "teacher"`); `useSubjects`; `useAssignmentsByGroup`, `useCreateAssignment`, `useUpdateAssignmentTeacher`, `useDeleteAssignment`.
- Produces: route `/groups` (admin-only).

- [ ] **Step 1: Add the nav entry and icon**

In `src/shared/config/navigation.ts`:

```ts
export type NavIcon = "painel" | "session" | "relatorios" | "user" | "admin" | "materia" | "turma";

export const navAdmin: NavItem[] = [
  ...navCoordinator,
  { href: "/groups", label: "Turmas", icon: "turma" },
  { href: "/subjects", label: "Matérias", icon: "materia" },
  { href: "/users", label: "Perfis", icon: "admin" },
];
```

In `src/widgets/app-shell/AppSidebar.tsx`, import `TableIcon` and add `turma: <TableIcon />` to `navIcons`.

- [ ] **Step 2: Write the group form modal**

`src/widgets/groups-admin/GroupFormModal.tsx` (regente select = teachers only):

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { shiftSchema, shiftLabels, type Group, type Shift } from "@/entities/group/model";
import { useCreateGroup, useUpdateGroup } from "@/entities/group/queries";
import { useProfiles } from "@/entities/profile/queries";
import { Modal } from "@tailadmin/components/ui/modal";
import Button from "@tailadmin/components/ui/button/Button";
import Label from "@tailadmin/components/form/Label";

const controlClasses =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10";

export interface GroupFormModalProps {
  group: Group | null | undefined;
  onClose: () => void;
}

export function GroupFormModal({ group, onClose }: GroupFormModalProps) {
  return (
    <Modal isOpen={group !== undefined} onClose={onClose} className="m-4 max-w-lg p-6">
      {group !== undefined && (
        <GroupFormBody key={group?.id ?? "new"} group={group} onClose={onClose} />
      )}
    </Modal>
  );
}

function GroupFormBody({ group, onClose }: { group: Group | null; onClose: () => void }) {
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const { data: profiles } = useProfiles();
  const teachers = (profiles ?? []).filter((profile) => profile.role === "teacher");

  const [name, setName] = useState(group?.name ?? "");
  const [gradeLevel, setGradeLevel] = useState(group?.gradeLevel ?? "");
  const [shift, setShift] = useState<Shift>(group?.shift ?? "manhã");
  const [teacherId, setTeacherId] = useState(group?.teacherId ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const saving = createGroup.isPending || updateGroup.isPending;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setErro(null);
    const regente = teacherId || teachers[0]?.id || "";
    try {
      if (group) {
        await updateGroup.mutateAsync({
          id: group.id,
          patch: { name: name.trim(), gradeLevel: gradeLevel.trim(), shift, teacherId: regente },
        });
      } else {
        await createGroup.mutateAsync({
          name,
          gradeLevel,
          shift,
          teacherId: regente,
        });
      }
      onClose();
    } catch {
      setErro("Não foi possível salvar a turma.");
    }
  }

  return (
    <form onSubmit={save}>
      <h4 className="mb-6 text-lg font-semibold text-gray-800">
        {group ? "Editar turma" : "Adicionar turma"}
      </h4>

      <div className="mb-5">
        <Label htmlFor="turma-nome">Nome</Label>
        <input
          id="turma-nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          className={controlClasses}
        />
      </div>

      <div className="mb-5">
        <Label htmlFor="turma-serie">Série</Label>
        <input
          id="turma-serie"
          value={gradeLevel}
          onChange={(e) => setGradeLevel(e.target.value)}
          required
          className={controlClasses}
        />
      </div>

      <div className="mb-5">
        <Label htmlFor="turma-turno">Turno</Label>
        <select
          id="turma-turno"
          value={shift}
          onChange={(e) => setShift(e.target.value as Shift)}
          className={controlClasses}
        >
          {shiftSchema.options.map((value) => (
            <option key={value} value={value}>
              {shiftLabels[value]}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-5">
        <Label htmlFor="turma-regente">Professor regente</Label>
        <select
          id="turma-regente"
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          required
          className={controlClasses}
        >
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}
            </option>
          ))}
        </select>
      </div>

      {erro && (
        <p role="alert" className="mb-5 text-sm text-error-600">
          {erro}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Write the assignments panel (lecionamentos inside a turma)**

`src/widgets/groups-admin/GroupAssignmentsPanel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useSubjects } from "@/entities/subject/queries";
import { useProfiles } from "@/entities/profile/queries";
import {
  useAssignmentsByGroup,
  useCreateAssignment,
  useUpdateAssignmentTeacher,
  useDeleteAssignment,
} from "@/entities/assignment/queries";
import Button from "@tailadmin/components/ui/button/Button";

const controlClasses =
  "h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden";

export function GroupAssignmentsPanel({ groupId }: { groupId: string }) {
  const { data: assignments } = useAssignmentsByGroup(groupId);
  const { data: subjects } = useSubjects();
  const { data: profiles } = useProfiles();
  const createAssignment = useCreateAssignment();
  const updateTeacher = useUpdateAssignmentTeacher();
  const deleteAssignment = useDeleteAssignment();

  const teachers = (profiles ?? []).filter((profile) => profile.role === "teacher");
  const usedSubjectIds = new Set((assignments ?? []).map((a) => a.subjectId));
  const availableSubjects = (subjects ?? []).filter((s) => !usedSubjectIds.has(s.id));

  const [newSubjectId, setNewSubjectId] = useState("");
  const [newTeacherId, setNewTeacherId] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function subjectName(id: string) {
    return (subjects ?? []).find((s) => s.id === id)?.name ?? id;
  }

  async function adicionar() {
    setErro(null);
    const subjectId = newSubjectId || availableSubjects[0]?.id;
    const teacherId = newTeacherId || teachers[0]?.id;
    if (!subjectId || !teacherId) return;
    try {
      await createAssignment.mutateAsync({ groupId, subjectId, teacherId });
      setNewSubjectId("");
      setNewTeacherId("");
    } catch (motivo) {
      setErro(motivo instanceof Error ? motivo.message : "Não foi possível adicionar.");
    }
  }

  return (
    <div className="mt-3 rounded-xl bg-gray-50 p-4">
      <h5 className="mb-3 text-sm font-semibold text-gray-700">Matérias desta turma</h5>

      <ul className="mb-4 flex flex-col gap-2">
        {(assignments ?? []).map((assignment) => (
          <li key={assignment.id} className="flex flex-wrap items-center gap-2">
            <span className="min-w-32 text-sm text-gray-800">
              {subjectName(assignment.subjectId)}
            </span>
            <select
              aria-label={`Professor de ${subjectName(assignment.subjectId)}`}
              value={assignment.teacherId}
              onChange={(e) =>
                updateTeacher.mutate({ id: assignment.id, teacherId: e.target.value })
              }
              className={controlClasses}
            >
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => deleteAssignment.mutate(assignment.id)}
            >
              Remover
            </Button>
          </li>
        ))}
        {(assignments ?? []).length === 0 && (
          <li className="text-sm text-gray-500">Nenhuma matéria atribuída ainda.</li>
        )}
      </ul>

      {erro && (
        <p role="alert" className="mb-2 text-sm text-error-600">
          {erro}
        </p>
      )}

      {availableSubjects.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Matéria a adicionar"
            value={newSubjectId}
            onChange={(e) => setNewSubjectId(e.target.value)}
            className={controlClasses}
          >
            {availableSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Professor da matéria"
            value={newTeacherId}
            onChange={(e) => setNewTeacherId(e.target.value)}
            className={controlClasses}
          >
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={adicionar}>
            Adicionar matéria à turma
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write the list widget (expandable per turma)**

`src/widgets/groups-admin/GroupsAdmin.tsx`:

```tsx
"use client";

import { useState } from "react";
import { shiftLabels, type Group } from "@/entities/group/model";
import { useGroups, useDeleteGroup } from "@/entities/group/queries";
import { useProfiles } from "@/entities/profile/queries";
import Button from "@tailadmin/components/ui/button/Button";
import { GroupFormModal } from "./GroupFormModal";
import { GroupAssignmentsPanel } from "./GroupAssignmentsPanel";

export function GroupsAdmin() {
  const { data: groups, isLoading } = useGroups();
  const { data: profiles } = useProfiles();
  const deleteGroup = useDeleteGroup();
  const [editing, setEditing] = useState<Group | null | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function regenteName(teacherId: string) {
    return (profiles ?? []).find((p) => p.id === teacherId)?.name ?? "—";
  }

  async function remover(group: Group) {
    setErro(null);
    try {
      await deleteGroup.mutateAsync(group.id);
    } catch (motivo) {
      setErro(motivo instanceof Error ? motivo.message : "Não foi possível remover.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Turmas</h1>
        <Button size="sm" onClick={() => setEditing(null)}>
          Adicionar turma
        </Button>
      </header>

      {erro && (
        <p role="alert" className="text-sm text-error-600">
          {erro}
        </p>
      )}

      {isLoading ? (
        <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
      ) : (
        <ul className="flex flex-col gap-2">
          {(groups ?? []).map((group) => (
            <li key={group.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-800">{group.name}</p>
                  <p className="text-xs text-gray-500">
                    {group.gradeLevel} · {shiftLabels[group.shift]} · Regente:{" "}
                    {regenteName(group.teacherId)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setExpandedId(expandedId === group.id ? null : group.id)}
                  >
                    {expandedId === group.id ? "Fechar matérias" : "Matérias"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(group)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remover(group)}>
                    Excluir
                  </Button>
                </div>
              </div>
              {expandedId === group.id && <GroupAssignmentsPanel groupId={group.id} />}
            </li>
          ))}
        </ul>
      )}

      <GroupFormModal group={editing} onClose={() => setEditing(undefined)} />
    </div>
  );
}
```

- [ ] **Step 5: Add the route**

`src/app/(app)/groups/page.tsx`:

```tsx
"use client";

import { useRequireRole } from "@/features/session/use-require-role";
import { GroupsAdmin } from "@/widgets/groups-admin/GroupsAdmin";

export default function GroupsPage() {
  const permitido = useRequireRole(["admin"]);
  if (!permitido) return null;
  return <GroupsAdmin />;
}
```

- [ ] **Step 6: Verify build + type-check**

Run: `npm run type-check` → no errors.
Run: `npm run build` → succeeds (static export includes `/groups`).

- [ ] **Step 7: Commit**

```bash
git add src/widgets/groups-admin "src/app/(app)/groups" src/shared/config/navigation.ts src/widgets/app-shell/AppSidebar.tsx
git -c user.name="Emerson Silva" -c user.email="emerson_jdss@hotmail.com" commit -m "add turmas admin screen with lecionamentos"
```

---

### Task 6: Fix roll-call scoping (drop hardcoded professor, scope to regente)

**Files:**

- Create: `src/features/take-attendance/scope.ts` (pure helper + its test target)
- Create: `src/features/take-attendance/scope.test.ts`
- Modify: `src/features/take-attendance/AttendanceForm.tsx`

**Interfaces:**

- Produces: `groupsForRegente(groups: Group[], teacherId: string | null): Group[]`.

- [ ] **Step 1: Write the failing test for the scope helper**

`src/features/take-attendance/scope.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Group } from "@/entities/group/model";
import { groupsForRegente } from "./scope";

const groups: Group[] = [
  { id: "g1", name: "A", gradeLevel: "1", shift: "manhã", teacherId: "t1" },
  { id: "g2", name: "B", gradeLevel: "2", shift: "manhã", teacherId: "t2" },
  { id: "g3", name: "C", gradeLevel: "3", shift: "manhã", teacherId: "t1" },
];

describe("groupsForRegente", () => {
  it("returns only the groups where the teacher is regente", () => {
    expect(groupsForRegente(groups, "t1").map((g) => g.id)).toEqual(["g1", "g3"]);
  });

  it("returns an empty list for a null teacher", () => {
    expect(groupsForRegente(groups, null)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test — verify it fails**

Run: `npm test src/features/take-attendance/scope.test.ts`
Expected: FAIL (`./scope` not found).

- [ ] **Step 3: Implement the helper**

`src/features/take-attendance/scope.ts`:

```ts
import type { Group } from "@/entities/group/model";

/** The turmas a teacher runs roll-call for = the ones they are regente of. */
export function groupsForRegente(groups: Group[], teacherId: string | null): Group[] {
  if (!teacherId) return [];
  return groups.filter((group) => group.teacherId === teacherId);
}
```

- [ ] **Step 4: Run the test — verify it passes**

Run: `npm test src/features/take-attendance/scope.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire it into `AttendanceForm`**

In `src/features/take-attendance/AttendanceForm.tsx`:

1. Remove the line `const PROFESSOR_ID = "perfil-ricardo";`.
2. Add imports:

```tsx
import { useSession } from "@/features/session/use-session";
import { groupsForRegente } from "./scope";
```

3. Inside the component, derive the scoped turmas and the teacher id from the session (replace the `const { data: turmas, … } = useGroups();` usage so the select is scoped):

```tsx
const { profileId } = useSession();
const { data: allGroups, isLoading: carregandoTurmas } = useGroups();
const turmas = groupsForRegente(allGroups ?? [], profileId);
```

4. In `salvarChamada`, use the session id instead of the removed constant:

```tsx
const chamada = await createAttendanceSession.mutateAsync({
  groupId,
  date: HOJE,
  teacherId: profileId ?? "",
});
```

5. Add an empty state when the teacher is regente of no turma — right after the header block's `{!groupId && …}` message, adjust it to cover the no-turmas case:

```tsx
{
  turmas.length === 0 && !carregandoTurmas && (
    <p className="text-sm text-gray-500">Você não é regente de nenhuma turma.</p>
  );
}
```

(Keep the rest of the component unchanged. `groupId` already derives from `turmas?.[0]?.id`, so with an empty list it becomes `""` and the roll-call stays disabled.)

- [ ] **Step 6: Verify unit + type-check + build**

Run: `npm test src/features/take-attendance/scope.test.ts` → PASS.
Run: `npm run type-check` → no errors.
Run: `npm run build` → succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/features/take-attendance
git -c user.name="Emerson Silva" -c user.email="emerson_jdss@hotmail.com" commit -m "scope roll-call turmas to the logged regente"
```

---

### Task 7: E2E — admin builds structure, professor sees scoped roll-call

**Files:**

- Create: `e2e/academic-structure/academic-structure.spec.ts`
- Produces evidence PNGs in `e2e/academic-structure/evidencias/`.

**Interfaces:**

- Consumes: seed credentials — `ana`/`admin123` (admin), `ricardo`/`prof123` (teacher, regente of turma-mat-b + turma-fis-a), `bruno`/`prof123` (teacher, regente of turma-cie-c).

- [ ] **Step 1: Write the E2E spec**

`e2e/academic-structure/academic-structure.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, user: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Usuário").fill(user);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

function sidebar(page: Page) {
  return page.getByRole("navigation", { name: "Navegação principal" });
}

test.describe("academic structure admin", () => {
  test("admin creates a subject", async ({ page }) => {
    await login(page, "ana", "admin123");
    await sidebar(page).getByRole("link", { name: "Matérias", exact: true }).click();
    await page.getByRole("button", { name: "Adicionar matéria" }).click();
    await page.getByLabel("Nome").fill("Filosofia");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Filosofia")).toBeVisible();
    await page.screenshot({
      path: "e2e/academic-structure/evidencias/materia-criada.png",
      fullPage: true,
    });
  });

  test("admin creates a turma and assigns a matéria to a teacher", async ({ page }) => {
    await login(page, "ana", "admin123");
    await sidebar(page).getByRole("link", { name: "Turmas", exact: true }).click();

    await page.getByRole("button", { name: "Adicionar turma" }).click();
    await page.getByLabel("Nome").fill("Redação I");
    await page.getByLabel("Série").fill("1ª série");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Redação I")).toBeVisible();

    // Open the turma's matérias panel and add one.
    const card = page.locator("li", { hasText: "Redação I" });
    await card.getByRole("button", { name: "Matérias" }).click();
    await card.getByRole("button", { name: "Adicionar matéria à turma" }).click();
    await expect(card.getByText("Nenhuma matéria atribuída ainda.")).toHaveCount(0);

    await page.screenshot({
      path: "e2e/academic-structure/evidencias/turma-com-lecionamento.png",
      fullPage: true,
    });
  });
});

test.describe("roll-call scoping", () => {
  test("ricardo sees only his regência turmas in the roll-call select", async ({ page }) => {
    await login(page, "ricardo", "prof123");
    await sidebar(page).getByRole("link", { name: "Chamada", exact: true }).click();

    const select = page.getByLabel("Selecionar turma");
    const options = await select.locator("option").allTextContents();
    expect(options.join(" ")).toContain("Matemática Avançada II");
    expect(options.join(" ")).toContain("Física I");
    expect(options.join(" ")).not.toContain("Ciências Gerais");

    await page.screenshot({
      path: "e2e/academic-structure/evidencias/chamada-ricardo.png",
      fullPage: true,
    });
  });

  test("bruno sees only Ciências Gerais in the roll-call select", async ({ page }) => {
    await login(page, "bruno", "prof123");
    await sidebar(page).getByRole("link", { name: "Chamada", exact: true }).click();

    const select = page.getByLabel("Selecionar turma");
    const options = await select.locator("option").allTextContents();
    expect(options.join(" ")).toContain("Ciências Gerais");
    expect(options.join(" ")).not.toContain("Matemática Avançada II");

    await page.screenshot({
      path: "e2e/academic-structure/evidencias/chamada-bruno.png",
      fullPage: true,
    });
  });
});
```

- [ ] **Step 2: Run the E2E suite**

Run: `npm run test:e2e e2e/academic-structure/academic-structure.spec.ts`
Expected: PASS (4 tests), PNGs written under `e2e/academic-structure/evidencias/`.

- [ ] **Step 3: Full regression + build**

Run: `npm test` → all unit/integration pass.
Run: `npm run type-check` → no errors.
Run: `npm run build` → succeeds.

- [ ] **Step 4: Commit**

```bash
git add e2e/academic-structure
git -c user.name="Emerson Silva" -c user.email="emerson_jdss@hotmail.com" commit -m "add e2e for academic structure and scoped roll-call"
```

---

## Self-Review

**Spec coverage:**

- Admin CRUD matéria → Task 2 (api) + Task 4 (UI). ✓
- Admin CRUD turma with regente → Task 3 (api) + Task 5 (UI). ✓
- Lecionamentos inside turma → Task 1 (assignment) + Task 5 (panel). ✓
- Fix roll-call hardcoded professor → Task 6. ✓
- Seed with a second teacher / multi-professor → Task 1 Step 7. ✓
- Store bump v6 → Task 1 Step 1. ✓
- Nav: Turmas + Matérias → Tasks 4 & 5. ✓
- 3 test layers → unit (Tasks 1–3, 6), integration over store (Tasks 1–3), E2E with evidence (Task 7). ✓
- Language convention (EN code/tests) → all new code/tests in English; UI copy PT-BR. ✓
- White-label: no `organizationId`, no new hardcoded product name. ✓

**Placeholder scan:** no TBD/TODO/"handle edge cases" — every step carries real code.

**Type consistency:** `Assignment`, `NewAssignmentInput`, `updateAssignmentTeacher`, `NewSubjectInput`, `SubjectUpdate`, `NewGroupInput`, `GroupUpdate`, `shiftLabels`, `groupsForRegente` — names used identically across the tasks that define and consume them.

## Out of scope (Phases 2 & 3)

Avaliações (provas/trabalhos), grade entry per evaluation, and deriving the subject-average analytics from real grades. See the spec's "Fora de escopo" and "Decomposição".
