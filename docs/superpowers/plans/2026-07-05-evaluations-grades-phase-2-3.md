# Evaluations, Grades & Derived Analytics (Phases 2 & 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let a teacher create evaluations (provas/trabalhos) per lecionamento and enter per-student grades, then make the per-subject analytics derive from those real grades.

**Architecture:** Two new entities — `evaluation` (belongs to a lecionamento's `(groupId, subjectId)`) and `evaluation-grade` (per `(evaluationId, studentId)`, `score` nullable). A new teacher screen "Notas". The existing `Grade` aggregate stays the analytics input type, but `fetchGrades` is rewritten to DERIVE it (weighted average) from evaluations + evaluation-grades, so `academic.ts` and the report widgets are untouched.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, TanStack Query, zod, Vitest, Playwright, TailAdmin UI.

**Spec:** `docs/superpowers/specs/2026-07-05-avaliacoes-notas-fase-2-3-design.md`

## Global Constraints

- **Code language: English** — identifiers, comments, test descriptions. **PT-BR only** in user-facing UI copy (visible JSX, labels, placeholders, toasts, aria-labels, thrown error messages shown to the user).
- **Authorship:** every commit's author AND committer is `Emerson Silva <emerson_jdss@hotmail.com>`. No co-author, no AI trace. Commit with `git -c user.name="Emerson Silva" -c user.email="emerson_jdss@hotmail.com" commit -m "…"`. Never push.
- **Commit messages:** English, short imperative.
- **Styling:** design tokens / TailAdmin classes only — never raw hex. Reuse the `controlClasses` string and the `undefined|null|Entity` modal-state convention from `StudentFormModal`/`SubjectFormModal`.
- **White-label:** new entities stay tenant-agnostic — no `organizationId`, no hardcoded school/"Radarge" name in domain logic.
- **Store:** bump `STORAGE_KEY` to `radarge.db.v7`; add `radarge.db.v6` to `LEGACY_KEYS`; add `"evaluations"` and `"evaluationGrades"` collections (Task 1); remove `"grades"` (Task 4).
- **Commands:** `npm test <file>` (single vitest file), `npm test` (full suite), `pnpm type-check`, `npm run build`, `npm run test:e2e <file>`.

---

### Task 1: `evaluation` entity + store collections (v7)

**Files:**

- Create: `src/entities/evaluation/model.ts`, `src/entities/evaluation/api.ts`, `src/entities/evaluation/queries.ts`, `src/entities/evaluation/api.test.ts`
- Modify: `src/shared/lib/storage/db.ts` (add `"evaluations"` + `"evaluationGrades"`; bump v7)

**Interfaces produced:**

- `EvaluationType = "exam" | "homework"`; `evaluationTypeLabels: Record<EvaluationType, string>`
- `Evaluation = { id, groupId, subjectId, name, type, date, weight }`
- `fetchEvaluationsByAssignment(groupId, subjectId): Promise<Evaluation[]>`
- `NewEvaluationInput = { groupId; subjectId; name; type; date; weight }`
- `createEvaluation(input): Promise<Evaluation>` (throws on duplicate `(groupId, subjectId, name, date)`)
- `updateEvaluation(id, patch): Promise<Evaluation>`
- `deleteEvaluation(id): Promise<void>` (cascade-deletes its evaluationGrades)
- Hooks: `useEvaluationsByAssignment`, `useCreateEvaluation`, `useUpdateEvaluation`, `useDeleteEvaluation`.

- [ ] **Step 1: Add the two collections and bump the key**

In `src/shared/lib/storage/db.ts`:

```ts
const STORAGE_KEY = "radarge.db.v7";
const LEGACY_KEYS = [
  "radarge.db.v1",
  "radarge.db.v2",
  "radarge.db.v3",
  "radarge.db.v4",
  "radarge.db.v5",
  "radarge.db.v6",
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
  | "assignments"
  | "evaluations"
  | "evaluationGrades";
```

(`"grades"` stays for now — Task 4 removes it.)

Also loosen the `Db` type so a partially-seeded store type-checks while collections are added across tasks (matches the existing "missing collection yields []" runtime contract):

```ts
export type Db = Partial<Record<Collection, unknown[]>>;
```

- [ ] **Step 2: Write the model**

`src/entities/evaluation/model.ts`:

```ts
import { z } from "zod";

export const evaluationTypeSchema = z.enum(["exam", "homework"]);
export type EvaluationType = z.infer<typeof evaluationTypeSchema>;

export const evaluationTypeLabels: Record<EvaluationType, string> = {
  exam: "Prova",
  homework: "Trabalho de casa",
};

export const evaluationSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  subjectId: z.string(),
  name: z.string().min(1),
  type: evaluationTypeSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data deve ser YYYY-MM-DD"),
  weight: z.number().int().min(1).max(3),
});

export type Evaluation = z.infer<typeof evaluationSchema>;
```

- [ ] **Step 3: Write the failing api test**

`src/entities/evaluation/api.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { mutateCollection, resetDb } from "@/shared/lib/storage/db";
import { createEvaluation, deleteEvaluation, fetchEvaluationsByAssignment } from "./api";

const base = {
  groupId: "turma-mat-b",
  subjectId: "materia-matematica",
  type: "exam",
  date: "2026-07-01",
  weight: 3,
} as const;

describe("evaluation api (over the store)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("creates an evaluation for a lecionamento", async () => {
    const created = await createEvaluation({ ...base, name: "P1" });
    const list = await fetchEvaluationsByAssignment(base.groupId, base.subjectId);
    expect(list.some((e) => e.id === created.id && e.name === "P1")).toBe(true);
  });

  it("rejects a duplicate (group, subject, name, date)", async () => {
    await createEvaluation({ ...base, name: "P1" });
    await expect(createEvaluation({ ...base, name: "P1" })).rejects.toThrow();
  });

  it("cascade-deletes the evaluation's grades", async () => {
    const created = await createEvaluation({ ...base, name: "P1" });
    await mutateCollection("evaluationGrades", (rows) => [
      ...rows,
      { id: "eg-x", evaluationId: created.id, studentId: "aluno-1", score: 8 },
    ]);
    await deleteEvaluation(created.id);
    const remaining = await mutateCollection("evaluationGrades", (rows) => rows);
    expect(
      remaining.some((row) => (row as { evaluationId: string }).evaluationId === created.id),
    ).toBe(false);
  });
});
```

- [ ] **Step 4: Run the test — verify it fails**

Run: `npm test src/entities/evaluation/api.test.ts` → FAIL (module `./api` missing).

- [ ] **Step 5: Write the api**

`src/entities/evaluation/api.ts`:

```ts
import { mutateCollection, readCollection } from "@/shared/lib/storage/db";
import { evaluationSchema, type Evaluation, type EvaluationType } from "./model";

export async function fetchEvaluations(): Promise<Evaluation[]> {
  const rows = await readCollection("evaluations");
  return rows.map((row) => evaluationSchema.parse(row));
}

export async function fetchEvaluationsByAssignment(
  groupId: string,
  subjectId: string,
): Promise<Evaluation[]> {
  const evaluations = await fetchEvaluations();
  return evaluations.filter((e) => e.groupId === groupId && e.subjectId === subjectId);
}

export interface NewEvaluationInput {
  groupId: string;
  subjectId: string;
  name: string;
  type: EvaluationType;
  date: string;
  weight: number;
}

export async function createEvaluation(input: NewEvaluationInput): Promise<Evaluation> {
  const evaluations = await fetchEvaluations();
  const name = input.name.trim();
  const duplicate = evaluations.some(
    (e) =>
      e.groupId === input.groupId &&
      e.subjectId === input.subjectId &&
      e.name === name &&
      e.date === input.date,
  );
  if (duplicate) {
    throw new Error("Já existe uma avaliação com esse nome e data nesta turma/matéria.");
  }
  const evaluation: Evaluation = {
    id: crypto.randomUUID(),
    groupId: input.groupId,
    subjectId: input.subjectId,
    name,
    type: input.type,
    date: input.date,
    weight: input.weight,
  };
  evaluationSchema.parse(evaluation);
  await mutateCollection<Evaluation>("evaluations", (rows) => [...rows, evaluation]);
  return evaluation;
}

export interface EvaluationUpdate {
  name?: string;
  type?: EvaluationType;
  date?: string;
  weight?: number;
}

export async function updateEvaluation(id: string, patch: EvaluationUpdate): Promise<Evaluation> {
  const rows = await fetchEvaluations();
  const current = rows.find((e) => e.id === id);
  if (!current) throw new Error("Avaliação não encontrada.");
  const next: Evaluation = {
    ...current,
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.type !== undefined ? { type: patch.type } : {}),
    ...(patch.date !== undefined ? { date: patch.date } : {}),
    ...(patch.weight !== undefined ? { weight: patch.weight } : {}),
  };
  evaluationSchema.parse(next);
  await mutateCollection<Evaluation>("evaluations", (evaluations) =>
    evaluations.map((e) => (e.id === id ? next : e)),
  );
  return next;
}

export async function deleteEvaluation(id: string): Promise<void> {
  // Cascade: an evaluation owns its grades.
  await mutateCollection<{ evaluationId: string }>("evaluationGrades", (rows) =>
    rows.filter((row) => row.evaluationId !== id),
  );
  await mutateCollection<Evaluation>("evaluations", (rows) => rows.filter((e) => e.id !== id));
}
```

- [ ] **Step 6: Write the queries**

`src/entities/evaluation/queries.ts`:

```ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEvaluation,
  deleteEvaluation,
  fetchEvaluationsByAssignment,
  updateEvaluation,
  type EvaluationUpdate,
  type NewEvaluationInput,
} from "./api";

export const evaluationKeys = {
  all: ["evaluations"],
  byAssignment: (groupId: string, subjectId: string) => ["evaluations", groupId, subjectId],
};

export function useEvaluationsByAssignment(groupId: string, subjectId: string) {
  return useQuery({
    queryKey: evaluationKeys.byAssignment(groupId, subjectId),
    queryFn: () => fetchEvaluationsByAssignment(groupId, subjectId),
    enabled: Boolean(groupId && subjectId),
  });
}

export function useCreateEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewEvaluationInput) => createEvaluation(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: evaluationKeys.all }),
  });
}

export function useUpdateEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: EvaluationUpdate }) =>
      updateEvaluation(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: evaluationKeys.all }),
  });
}

export function useDeleteEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEvaluation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: evaluationKeys.all }),
  });
}
```

- [ ] **Step 7: Run the test — verify it passes**

Run: `npm test src/entities/evaluation/api.test.ts` → PASS (3 tests). Then `pnpm type-check` → clean.

- [ ] **Step 8: Commit**

```bash
git add src/entities/evaluation src/shared/lib/storage/db.ts
git -c user.name="Emerson Silva" -c user.email="emerson_jdss@hotmail.com" commit -m "add evaluation entity and store collections"
```

---

### Task 2: `evaluation-grade` entity + demo seed

**Files:**

- Create: `src/entities/evaluation-grade/model.ts`, `.../api.ts`, `.../queries.ts`, `.../api.test.ts`
- Modify: `src/shared/lib/storage/seed.ts` (seed evaluations + evaluationGrades; keep the existing `grades` seed for now — Task 4 removes it)

**Interfaces produced:**

- `EvaluationGrade = { id, evaluationId, studentId, score: number | null }`
- `fetchEvaluationGradesByEvaluation(evaluationId): Promise<EvaluationGrade[]>`
- `setEvaluationGrade({ evaluationId, studentId, score }): Promise<void>` (upsert by `(evaluationId, studentId)`)
- Hooks: `useEvaluationGradesByEvaluation`, `useSetEvaluationGrade` (invalidates its own key AND `["grades"]`).

- [ ] **Step 1: Write the model**

`src/entities/evaluation-grade/model.ts`:

```ts
import { z } from "zod";

export const evaluationGradeSchema = z.object({
  id: z.string(),
  evaluationId: z.string(),
  studentId: z.string(),
  score: z.number().min(0).max(10).nullable(), // null = pendente
});

export type EvaluationGrade = z.infer<typeof evaluationGradeSchema>;
```

- [ ] **Step 2: Write the failing api test**

`src/entities/evaluation-grade/api.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "@/shared/lib/storage/db";
import { fetchEvaluationGradesByEvaluation, setEvaluationGrade } from "./api";

describe("evaluation-grade api (over the store)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("sets a grade for a student on an evaluation", async () => {
    await setEvaluationGrade({ evaluationId: "eval-1", studentId: "aluno-1", score: 7.5 });
    const grades = await fetchEvaluationGradesByEvaluation("eval-1");
    expect(grades).toHaveLength(1);
    expect(grades[0].score).toBe(7.5);
  });

  it("upserts (one row per student per evaluation)", async () => {
    await setEvaluationGrade({ evaluationId: "eval-1", studentId: "aluno-1", score: 7.5 });
    await setEvaluationGrade({ evaluationId: "eval-1", studentId: "aluno-1", score: 9 });
    const grades = await fetchEvaluationGradesByEvaluation("eval-1");
    expect(grades).toHaveLength(1);
    expect(grades[0].score).toBe(9);
  });

  it("stores a pending grade as null", async () => {
    await setEvaluationGrade({ evaluationId: "eval-1", studentId: "aluno-1", score: null });
    const grades = await fetchEvaluationGradesByEvaluation("eval-1");
    expect(grades[0].score).toBeNull();
  });
});
```

- [ ] **Step 3: Run the test — verify it fails**

Run: `npm test src/entities/evaluation-grade/api.test.ts` → FAIL.

- [ ] **Step 4: Write the api**

`src/entities/evaluation-grade/api.ts`:

```ts
import { mutateCollection, readCollection } from "@/shared/lib/storage/db";
import { evaluationGradeSchema, type EvaluationGrade } from "./model";

export async function fetchEvaluationGrades(): Promise<EvaluationGrade[]> {
  const rows = await readCollection("evaluationGrades");
  return rows.map((row) => evaluationGradeSchema.parse(row));
}

export async function fetchEvaluationGradesByEvaluation(
  evaluationId: string,
): Promise<EvaluationGrade[]> {
  const grades = await fetchEvaluationGrades();
  return grades.filter((grade) => grade.evaluationId === evaluationId);
}

export interface SetEvaluationGradeInput {
  evaluationId: string;
  studentId: string;
  score: number | null;
}

/** Upsert a single student's grade on an evaluation (unique per evaluation+student). */
export async function setEvaluationGrade(input: SetEvaluationGradeInput): Promise<void> {
  await mutateCollection<EvaluationGrade>("evaluationGrades", (rows) => {
    const existing = rows.find(
      (row) => row.evaluationId === input.evaluationId && row.studentId === input.studentId,
    );
    if (existing) {
      return rows.map((row) => (row === existing ? { ...row, score: input.score } : row));
    }
    const created: EvaluationGrade = {
      id: crypto.randomUUID(),
      evaluationId: input.evaluationId,
      studentId: input.studentId,
      score: input.score,
    };
    evaluationGradeSchema.parse(created);
    return [...rows, created];
  });
}
```

- [ ] **Step 5: Write the queries**

`src/entities/evaluation-grade/queries.ts`:

```ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { gradeKeys } from "@/entities/grade/queries";
import {
  fetchEvaluationGradesByEvaluation,
  setEvaluationGrade,
  type SetEvaluationGradeInput,
} from "./api";

export const evaluationGradeKeys = {
  all: ["evaluationGrades"],
  byEvaluation: (evaluationId: string) => ["evaluationGrades", evaluationId],
};

export function useEvaluationGradesByEvaluation(evaluationId: string) {
  return useQuery({
    queryKey: evaluationGradeKeys.byEvaluation(evaluationId),
    queryFn: () => fetchEvaluationGradesByEvaluation(evaluationId),
    enabled: Boolean(evaluationId),
  });
}

export function useSetEvaluationGrade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetEvaluationGradeInput) => setEvaluationGrade(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: evaluationGradeKeys.all });
      // Per-subject analytics is derived from these grades (Task 4).
      queryClient.invalidateQueries({ queryKey: gradeKeys.all });
    },
  });
}
```

- [ ] **Step 6: Seed demo evaluations + grades**

In `src/shared/lib/storage/seed.ts`, after `assignments` is built and before the `return`, add (reuses the existing `scoreFor`, `MATERIAS`, `alunos`):

```ts
const evaluations: Db["evaluations"] = [];
const evaluationGrades: Db["evaluationGrades"] = [];
for (const assignment of assignments) {
  const materiaIdx = MATERIAS.findIndex((m) => m.id === assignment.subjectId);
  const area = MATERIAS[materiaIdx].area;
  const groupStudents = alunos.filter((aluno) => aluno.groupId === assignment.groupId);
  const examId = `eval-${assignment.id}-p1`;
  const homeworkId = `eval-${assignment.id}-t1`;
  evaluations.push(
    {
      id: examId,
      groupId: assignment.groupId,
      subjectId: assignment.subjectId,
      name: "P1",
      type: "exam",
      date: "2026-06-20",
      weight: 3,
    },
    {
      id: homeworkId,
      groupId: assignment.groupId,
      subjectId: assignment.subjectId,
      name: "Trabalho 1",
      type: "homework",
      date: "2026-06-27",
      weight: 1,
    },
  );
  for (const aluno of groupStudents) {
    const alunoIdx = Number(aluno.id.split("-")[1]) - 1;
    const examScore = scoreFor(alunoIdx, materiaIdx, area);
    const homeworkScore = Math.min(10, Math.round((examScore + 0.5) * 10) / 10);
    evaluationGrades.push(
      {
        id: `eg-${examId}-${aluno.id}`,
        evaluationId: examId,
        studentId: aluno.id,
        score: examScore,
      },
      {
        id: `eg-${homeworkId}-${aluno.id}`,
        evaluationId: homeworkId,
        studentId: aluno.id,
        score: homeworkScore,
      },
    );
  }
}
```

Add both to the returned object (keep `grades` for now):

```ts
    grades: notas,
    assignments,
    evaluations,
    evaluationGrades,
```

- [ ] **Step 7: Run tests + type-check**

Run: `npm test src/entities/evaluation-grade/api.test.ts` → PASS (3). Run `npm test` (full) → all green. `pnpm type-check` → clean.

- [ ] **Step 8: Commit**

```bash
git add src/entities/evaluation-grade src/shared/lib/storage/seed.ts
git -c user.name="Emerson Silva" -c user.email="emerson_jdss@hotmail.com" commit -m "add evaluation-grade entity and demo seed"
```

---

### Task 3: Teacher "Notas" screen (route + nav + widgets)

**Files:**

- Create: `src/widgets/grades-teacher/GradesTeacher.tsx`, `.../EvaluationsPanel.tsx`, `.../EvaluationFormModal.tsx`, `.../GradeEntryPanel.tsx`
- Create: `src/app/(app)/grades/page.tsx`
- Modify: `src/shared/config/navigation.ts` (NavIcon `"grades"`; add to `navTeacher`)
- Modify: `src/widgets/app-shell/AppSidebar.tsx` (map `grades` → `TaskIcon`)

**Interfaces consumed:** `useSession`; `useAssignmentsByTeacher`; `useGroups`, `useSubjects`; `useEvaluationsByAssignment`, `useCreateEvaluation`, `useDeleteEvaluation`; `useStudentsByGroup`; `useEvaluationGradesByEvaluation`, `useSetEvaluationGrade`; `evaluationTypeLabels`.

- [ ] **Step 1: Nav entry + icon**

`src/shared/config/navigation.ts`:

```ts
export type NavIcon =
  "painel" | "session" | "relatorios" | "user" | "admin" | "materia" | "turma" | "grades";

export const navTeacher: NavItem[] = [
  { href: "/attendance", label: "Chamada", icon: "session" },
  { href: "/students", label: "Alunos", icon: "user" },
  { href: "/grades", label: "Notas", icon: "grades" },
];
```

In `src/widgets/app-shell/AppSidebar.tsx`, import `TaskIcon` and add `grades: <TaskIcon />` to `navIcons`.

- [ ] **Step 2: Evaluation form modal**

`src/widgets/grades-teacher/EvaluationFormModal.tsx`:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { evaluationTypeLabels, type EvaluationType } from "@/entities/evaluation/model";
import { useCreateEvaluation } from "@/entities/evaluation/queries";
import { Modal } from "@tailadmin/components/ui/modal";
import Button from "@tailadmin/components/ui/button/Button";
import Label from "@tailadmin/components/form/Label";

const controlClasses =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10";

export interface EvaluationFormModalProps {
  open: boolean;
  groupId: string;
  subjectId: string;
  onClose: () => void;
}

export function EvaluationFormModal({
  open,
  groupId,
  subjectId,
  onClose,
}: EvaluationFormModalProps) {
  const createEvaluation = useCreateEvaluation();
  const [name, setName] = useState("");
  const [type, setType] = useState<EvaluationType>("exam");
  const [date, setDate] = useState("");
  const [weight, setWeight] = useState(1);
  const [erro, setErro] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createEvaluation.isPending) return;
    setErro(null);
    try {
      await createEvaluation.mutateAsync({ groupId, subjectId, name, type, date, weight });
      setName("");
      setDate("");
      setWeight(1);
      setType("exam");
      onClose();
    } catch (motivo) {
      setErro(motivo instanceof Error ? motivo.message : "Não foi possível salvar a avaliação.");
    }
  }

  return (
    <Modal isOpen={open} onClose={onClose} className="m-4 max-w-lg p-6">
      <form onSubmit={save}>
        <h4 className="mb-6 text-lg font-semibold text-gray-800">Nova avaliação</h4>

        <div className="mb-5">
          <Label htmlFor="aval-nome">Nome</Label>
          <input
            id="aval-nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className={controlClasses}
          />
        </div>

        <div className="mb-5">
          <Label htmlFor="aval-tipo">Tipo</Label>
          <select
            id="aval-tipo"
            value={type}
            onChange={(e) => setType(e.target.value as EvaluationType)}
            className={controlClasses}
          >
            <option value="exam">{evaluationTypeLabels.exam}</option>
            <option value="homework">{evaluationTypeLabels.homework}</option>
          </select>
        </div>

        <div className="mb-5">
          <Label htmlFor="aval-data">Data</Label>
          <input
            id="aval-data"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={controlClasses}
          />
        </div>

        <div className="mb-5">
          <Label htmlFor="aval-peso">Peso</Label>
          <select
            id="aval-peso"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className={controlClasses}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
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
          <Button disabled={createEvaluation.isPending}>
            {createEvaluation.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 3: Grade entry panel (one evaluation → per-student scores)**

`src/widgets/grades-teacher/GradeEntryPanel.tsx`:

```tsx
"use client";

import { useStudentsByGroup } from "@/entities/student/queries";
import type { Evaluation } from "@/entities/evaluation/model";
import {
  useEvaluationGradesByEvaluation,
  useSetEvaluationGrade,
} from "@/entities/evaluation-grade/queries";

const inputClasses =
  "h-10 w-24 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden";

export function GradeEntryPanel({ evaluation }: { evaluation: Evaluation }) {
  const { data: students } = useStudentsByGroup(evaluation.groupId);
  const { data: grades } = useEvaluationGradesByEvaluation(evaluation.id);
  const setGrade = useSetEvaluationGrade();

  function scoreOf(studentId: string): string {
    const grade = (grades ?? []).find((g) => g.studentId === studentId);
    return grade && grade.score !== null ? String(grade.score) : "";
  }

  function onBlurScore(studentId: string, raw: string) {
    const trimmed = raw.trim();
    const score = trimmed === "" ? null : Number(trimmed);
    if (score !== null && (Number.isNaN(score) || score < 0 || score > 10)) return;
    setGrade.mutate({ evaluationId: evaluation.id, studentId, score });
  }

  return (
    <div className="mt-3 rounded-xl bg-gray-50 p-4">
      <h5 className="mb-3 text-sm font-semibold text-gray-700">Notas — {evaluation.name}</h5>
      <ul className="flex flex-col gap-2">
        {(students ?? []).map((student) => (
          <li key={student.id} className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-800">{student.name}</span>
            <input
              aria-label={`Nota de ${student.name}`}
              type="number"
              min={0}
              max={10}
              step={0.1}
              defaultValue={scoreOf(student.id)}
              key={scoreOf(student.id)}
              placeholder="—"
              onBlur={(e) => onBlurScore(student.id, e.target.value)}
              className={inputClasses}
            />
          </li>
        ))}
        {(students ?? []).length === 0 && (
          <li className="text-sm text-gray-500">Turma sem alunos.</li>
        )}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Evaluations panel (list + create + open one)**

`src/widgets/grades-teacher/EvaluationsPanel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { evaluationTypeLabels, type Evaluation } from "@/entities/evaluation/model";
import { useEvaluationsByAssignment, useDeleteEvaluation } from "@/entities/evaluation/queries";
import Button from "@tailadmin/components/ui/button/Button";
import { EvaluationFormModal } from "./EvaluationFormModal";
import { GradeEntryPanel } from "./GradeEntryPanel";

export function EvaluationsPanel({ groupId, subjectId }: { groupId: string; subjectId: string }) {
  const { data: evaluations, isLoading } = useEvaluationsByAssignment(groupId, subjectId);
  const deleteEvaluation = useDeleteEvaluation();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold text-gray-800">Avaliações</h4>
        <Button size="sm" onClick={() => setCreating(true)}>
          Nova avaliação
        </Button>
      </div>

      {isLoading ? (
        <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
      ) : (
        <ul className="flex flex-col gap-2">
          {(evaluations ?? []).map((evaluation: Evaluation) => (
            <li
              key={evaluation.id}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-800">{evaluation.name}</p>
                  <p className="text-xs text-gray-500">
                    {evaluationTypeLabels[evaluation.type]} · peso {evaluation.weight} ·{" "}
                    {evaluation.date}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOpenId(openId === evaluation.id ? null : evaluation.id)}
                  >
                    {openId === evaluation.id ? "Fechar notas" : "Lançar notas"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteEvaluation.mutate(evaluation.id)}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
              {openId === evaluation.id && <GradeEntryPanel evaluation={evaluation} />}
            </li>
          ))}
          {(evaluations ?? []).length === 0 && (
            <li className="text-sm text-gray-500">Nenhuma avaliação ainda.</li>
          )}
        </ul>
      )}

      <EvaluationFormModal
        open={creating}
        groupId={groupId}
        subjectId={subjectId}
        onClose={() => setCreating(false)}
      />
    </div>
  );
}
```

- [ ] **Step 5: Root widget (pick a lecionamento)**

`src/widgets/grades-teacher/GradesTeacher.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useSession } from "@/features/session/use-session";
import { useAssignmentsByTeacher } from "@/entities/assignment/queries";
import { useGroups } from "@/entities/group/queries";
import { useSubjects } from "@/entities/subject/queries";
import { EvaluationsPanel } from "./EvaluationsPanel";

export function GradesTeacher() {
  const { profileId } = useSession();
  const { data: assignments, isLoading } = useAssignmentsByTeacher(profileId ?? "");
  const { data: groups } = useGroups();
  const { data: subjects } = useSubjects();
  const [selected, setSelected] = useState<string | null>(null);

  function groupName(id: string) {
    return (groups ?? []).find((g) => g.id === id)?.name ?? id;
  }
  function subjectName(id: string) {
    return (subjects ?? []).find((s) => s.id === id)?.name ?? id;
  }

  const current = (assignments ?? []).find((a) => a.id === selected);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-gray-800">Notas</h1>

      {isLoading ? (
        <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
      ) : (assignments ?? []).length === 0 ? (
        <p className="text-sm text-gray-500">Você não leciona nenhuma matéria ainda.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(assignments ?? []).map((assignment) => (
            <button
              key={assignment.id}
              type="button"
              onClick={() => setSelected(assignment.id)}
              className={`rounded-xl border px-4 py-2 text-sm ${
                selected === assignment.id
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-200 bg-white text-gray-700"
              }`}
            >
              {subjectName(assignment.subjectId)} — {groupName(assignment.groupId)}
            </button>
          ))}
        </div>
      )}

      {current && <EvaluationsPanel groupId={current.groupId} subjectId={current.subjectId} />}
    </div>
  );
}
```

- [ ] **Step 6: Route**

`src/app/(app)/grades/page.tsx`:

```tsx
"use client";

import { useRequireRole } from "@/features/session/use-require-role";
import { GradesTeacher } from "@/widgets/grades-teacher/GradesTeacher";

export default function GradesPage() {
  const permitido = useRequireRole(["teacher"]);
  if (!permitido) return null;
  return <GradesTeacher />;
}
```

- [ ] **Step 7: Verify + commit**

Run: `pnpm type-check` → clean. `npm run build` → succeeds (export includes `/grades`).

```bash
git add src/widgets/grades-teacher "src/app/(app)/grades" src/shared/config/navigation.ts src/widgets/app-shell/AppSidebar.tsx
git -c user.name="Emerson Silva" -c user.email="emerson_jdss@hotmail.com" commit -m "add teacher notas screen for evaluations and grades"
```

---

### Task 4: Derive per-subject analytics from real grades (Phase 3)

**Files:**

- Create: `src/entities/grade/derive.ts`, `src/entities/grade/derive.test.ts`
- Modify: `src/entities/grade/api.ts` (derive instead of reading the `grades` collection)
- Modify: `src/shared/lib/storage/seed.ts` (remove the `grades`/`notas` block + key), `src/shared/lib/storage/db.ts` (remove `"grades"` from the union + `Db`)

**Interfaces produced:**

- `deriveSubjectGrades(evaluations: Evaluation[], evaluationGrades: EvaluationGrade[], studentIds?: string[]): Grade[]`

- [ ] **Step 1: Write the failing derive test**

`src/entities/grade/derive.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Evaluation } from "@/entities/evaluation/model";
import type { EvaluationGrade } from "@/entities/evaluation-grade/model";
import { deriveSubjectGrades } from "./derive";

const evaluations: Evaluation[] = [
  {
    id: "e1",
    groupId: "g1",
    subjectId: "math",
    name: "P1",
    type: "exam",
    date: "2026-06-20",
    weight: 3,
  },
  {
    id: "e2",
    groupId: "g1",
    subjectId: "math",
    name: "T1",
    type: "homework",
    date: "2026-06-27",
    weight: 1,
  },
  {
    id: "e3",
    groupId: "g1",
    subjectId: "hist",
    name: "P1",
    type: "exam",
    date: "2026-06-20",
    weight: 1,
  },
];

describe("deriveSubjectGrades", () => {
  it("computes a weight-weighted average per (student, subject)", () => {
    const eg: EvaluationGrade[] = [
      { id: "a", evaluationId: "e1", studentId: "s1", score: 8 }, // weight 3
      { id: "b", evaluationId: "e2", studentId: "s1", score: 4 }, // weight 1
    ];
    const derived = deriveSubjectGrades(evaluations, eg);
    // (8*3 + 4*1) / (3+1) = 7
    expect(derived).toEqual([
      { id: "derived-s1-math", studentId: "s1", subjectId: "math", score: 7 },
    ]);
  });

  it("ignores pending (null) grades and omits subjects with no scores", () => {
    const eg: EvaluationGrade[] = [
      { id: "a", evaluationId: "e1", studentId: "s1", score: null },
      { id: "b", evaluationId: "e3", studentId: "s1", score: 6 },
    ];
    const derived = deriveSubjectGrades(evaluations, eg);
    expect(derived).toEqual([
      { id: "derived-s1-hist", studentId: "s1", subjectId: "hist", score: 6 },
    ]);
  });
});
```

- [ ] **Step 2: Run the test — verify it fails**

Run: `npm test src/entities/grade/derive.test.ts` → FAIL.

- [ ] **Step 3: Implement the derive helper**

`src/entities/grade/derive.ts`:

```ts
import type { Evaluation } from "@/entities/evaluation/model";
import type { EvaluationGrade } from "@/entities/evaluation-grade/model";
import type { Grade } from "./model";

const round1 = (value: number): number => Math.round(value * 10) / 10;

/**
 * Aggregate per-evaluation grades into one weighted average per (student, subject).
 * Weight = the evaluation's `weight`. Pending (null) grades are ignored; a subject
 * with no scored evaluations for a student is omitted. Optional `studentIds` limits
 * the output (used by per-student fetches).
 */
export function deriveSubjectGrades(
  evaluations: Evaluation[],
  evaluationGrades: EvaluationGrade[],
  studentIds?: string[],
): Grade[] {
  const evaluationById = new Map(evaluations.map((evaluation) => [evaluation.id, evaluation]));
  const allow = studentIds ? new Set(studentIds) : null;
  const acc = new Map<
    string,
    { studentId: string; subjectId: string; sum: number; weight: number }
  >();

  for (const grade of evaluationGrades) {
    if (grade.score === null) continue;
    if (allow && !allow.has(grade.studentId)) continue;
    const evaluation = evaluationById.get(grade.evaluationId);
    if (!evaluation) continue;
    const key = `${grade.studentId}-${evaluation.subjectId}`;
    const bucket = acc.get(key) ?? {
      studentId: grade.studentId,
      subjectId: evaluation.subjectId,
      sum: 0,
      weight: 0,
    };
    bucket.sum += grade.score * evaluation.weight;
    bucket.weight += evaluation.weight;
    acc.set(key, bucket);
  }

  return [...acc.values()].map(({ studentId, subjectId, sum, weight }) => ({
    id: `derived-${studentId}-${subjectId}`,
    studentId,
    subjectId,
    score: round1(sum / weight),
  }));
}
```

- [ ] **Step 4: Run the test — verify it passes**

Run: `npm test src/entities/grade/derive.test.ts` → PASS (2).

- [ ] **Step 5: Rewrite `grade/api.ts` to derive**

Replace the body of `src/entities/grade/api.ts` with:

```ts
import { readCollection } from "@/shared/lib/storage/db";
import { evaluationSchema, type Evaluation } from "@/entities/evaluation/model";
import { evaluationGradeSchema, type EvaluationGrade } from "@/entities/evaluation-grade/model";
import type { Grade } from "./model";
import { deriveSubjectGrades } from "./derive";

async function readEvaluations(): Promise<Evaluation[]> {
  const rows = await readCollection("evaluations");
  return rows.map((row) => evaluationSchema.parse(row));
}

async function readEvaluationGrades(): Promise<EvaluationGrade[]> {
  const rows = await readCollection("evaluationGrades");
  return rows.map((row) => evaluationGradeSchema.parse(row));
}

/** Per-subject aggregate, derived from evaluations + evaluation grades. */
export async function fetchGrades(): Promise<Grade[]> {
  const [evaluations, evaluationGrades] = await Promise.all([
    readEvaluations(),
    readEvaluationGrades(),
  ]);
  return deriveSubjectGrades(evaluations, evaluationGrades);
}

export async function fetchGradesByStudent(studentId: string): Promise<Grade[]> {
  const [evaluations, evaluationGrades] = await Promise.all([
    readEvaluations(),
    readEvaluationGrades(),
  ]);
  return deriveSubjectGrades(evaluations, evaluationGrades, [studentId]);
}
```

(`grade/model.ts` and `grade/queries.ts` are unchanged — same `Grade` shape and `gradeKeys`.)

- [ ] **Step 6: Remove the `grades` seed and collection**

In `src/shared/lib/storage/seed.ts`: delete the `notas`/`grades` block (the `const notas: Db["grades"] = []; ... for (const aluno of alunos) { ... }` loop) and remove `grades: notas,` from the returned object. Keep `scoreFor` (still used by the evaluation seed).

In `src/shared/lib/storage/db.ts`: remove `"grades"` from the `Collection` union.

- [ ] **Step 7: Verify the whole analytics chain still works**

Run: `npm test` (full suite) → all green, including the existing `src/features/analytics/academic.test.ts` (it uses explicit `Grade[]` inputs, so it must still pass unchanged). `pnpm type-check` → clean. `npm run build` → succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/entities/grade src/shared/lib/storage/seed.ts src/shared/lib/storage/db.ts
git -c user.name="Emerson Silva" -c user.email="emerson_jdss@hotmail.com" commit -m "derive per-subject grades from real evaluations"
```

---

### Task 5: E2E — teacher creates an evaluation and enters grades

**Files:**

- Create: `e2e/evaluations/evaluations.spec.ts` (+ PNG evidence in `e2e/evaluations/evidencias/`)

**Interfaces consumed:** seed creds `ricardo`/`prof123` (teacher); Ricardo teaches Matemática/Física in his turmas. The teacher nav has a "Notas" link (`/grades`).

- [ ] **Step 1: Write the E2E spec**

`e2e/evaluations/evaluations.spec.ts`:

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

test.describe("teacher grades flow", () => {
  test("teacher creates an evaluation and enters a grade", async ({ page }) => {
    await login(page, "ricardo", "prof123");
    await sidebar(page).getByRole("link", { name: "Notas", exact: true }).click();

    // Pick the first lecionamento.
    await page.getByRole("button", { name: /—/ }).first().click();
    await expect(page.getByRole("heading", { name: "Avaliações" })).toBeVisible();

    // Create an evaluation.
    await page.getByRole("button", { name: "Nova avaliação" }).click();
    await page.getByLabel("Nome").fill("P2");
    await page.getByLabel("Data").fill("2026-07-10");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("P2")).toBeVisible();
    await page.screenshot({
      path: "e2e/evaluations/evidencias/avaliacao-criada.png",
      fullPage: true,
    });

    // Open its grade entry and set a score for the first student.
    const card = page.locator("li", { hasText: "P2" });
    await card.getByRole("button", { name: "Lançar notas" }).click();
    const firstScore = card.getByRole("spinbutton").first();
    await firstScore.fill("9.5");
    await firstScore.blur();
    await expect(firstScore).toHaveValue("9.5");
    await page.screenshot({ path: "e2e/evaluations/evidencias/nota-lancada.png", fullPage: true });
  });
});
```

- [ ] **Step 2: Run the E2E**

Run: `npm run test:e2e e2e/evaluations/evaluations.spec.ts` → PASS, PNGs written. (You may adjust selectors/waits to match the real DOM; keep the intent. If browsers are missing: `npx playwright install chromium`.)

- [ ] **Step 3: Full regression + build**

Run: `npm test` → all green. `pnpm type-check` → clean. `npm run build` → succeeds.

- [ ] **Step 4: Commit**

```bash
git add e2e/evaluations
git -c user.name="Emerson Silva" -c user.email="emerson_jdss@hotmail.com" commit -m "add e2e for teacher evaluations and grades"
```

---

## Self-Review

**Spec coverage:**

- `evaluation` entity + uniqueness + cascade → Task 1. ✓
- `evaluation-grade` upsert + pending null → Task 2. ✓
- Demo seed of evaluations+grades → Task 2. ✓
- Teacher "Notas" screen (lecionamento → evaluation → grade entry) → Task 3. ✓
- Derived per-subject analytics; `academic.ts`/reports/CSV untouched; `grades` collection removed → Task 4. ✓
- Invalidation of `gradeKeys.all` on grade set → Task 2 queries. ✓
- Store bump v7 + collections → Tasks 1 & 4. ✓
- 3 test layers + E2E evidence → Tasks 1–5. ✓
- Language (EN code / PT-BR UI), authorship, white-label → Global Constraints, enforced per task. ✓

**Placeholder scan:** no TBD/TODO; every step carries real code.

**Type consistency:** `Evaluation`, `EvaluationType`, `NewEvaluationInput`, `EvaluationUpdate`, `EvaluationGrade`, `SetEvaluationGradeInput`, `deriveSubjectGrades`, `gradeKeys` used identically across defining and consuming tasks. `deleteEvaluation`'s cascade and Task 4's derive both read the `"evaluationGrades"` collection by the same name.

## Out of scope

Final-grade/approval rules, PDF report cards, bulk weight editing. Supabase migration comes after (the async fetcher signatures are the seam).
