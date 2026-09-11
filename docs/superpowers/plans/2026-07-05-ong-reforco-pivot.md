# Plano SDD — Pivô ONG de reforço

**Spec:** `docs/superpowers/specs/2026-07-05-pivot-ong-reforco-analise.md`
**Branch:** `feat/ong-reforco-pivot` a partir de `developer`
**Merge alvo:** `developer` (fast-forward quando possível)

## Escopo (todas as 3 fases combinadas)

- **Fase A — Ficha do aluno**: novos campos (`birthDate`, `guardianName`, `guardianPhone`),
  remove `enrollment`, `groupId` do aluno passa a viver na tabela `enrollment` (fase B).
- **Fase B — Matrícula N:N**: nova entity `enrollment`; alunos podem participar de várias
  aulas; `fetchStudentsByGroup` passa a resolver via enrollment.
- **Fase C — Reidentificação**: copy PT-BR "Turma" → "Aula", `CLAUDE.md` reescrito para ONG.

## Regras globais

- Idioma: código/identificadores em EN; UI em PT-BR.
- Autoria: `Emerson Silva <emerson_jdss@hotmail.com>`, sem menção a IA.
- Commit messages: EN, curto, imperativo.
- Design tokens / TailAdmin classes; sem hex cru.
- Bump storage → `radarge.db.v8`, `radarge.db.v7` entra em `LEGACY_KEYS`.
- Cada task deixa `npm run type-check`, `npm test` e `npm run build` verdes antes do commit.

## Tarefas (ordem de execução)

### T1 · store v8 + Group perde gradeLevel

- `src/shared/lib/storage/db.ts`: bump v8, v7 vira legacy.
- `src/entities/group/model.ts`: remove `gradeLevel`.
- `src/entities/group/api.ts`: remove `gradeLevel` de `NewGroupInput`/`GroupUpdate`.
- Ajustar callers: `group/write.test.ts`, `take-attendance/scope.test.ts` (fixture),
  seed (`TURMAS`), qualquer widget que exiba série.
- **Commit:** `remove série from group model`

### T2 · Student model reformado

- `src/entities/student/model.ts`: adiciona `birthDate` (regex YYYY-MM-DD), `guardianName`
  (>= 1 char), `guardianPhone` (>= 8 dígitos). Remove `enrollment`. `groupId` sai daqui
  (migrará para enrollment em T4).
- `src/entities/student/api.ts`: `NewStudentInput`/`StudentUpdate` refletem os novos campos;
  `createStudent` não pede `groupId` mais.
- Helper puro `computeAgeAt(birthDate, referenceDate)` em `src/entities/student/age.ts` +
  teste unit.
- Atualiza `student-crud.integration.test.ts` para o novo shape.
- **Commit:** `reshape student to nome guardian birthdate`

### T3 · Enrollment entity (N:N aluno↔aula)

- `src/entities/enrollment/model.ts`: `{ id, studentId, groupId, joinedAt, active }`,
  zod, único por `(studentId, groupId)` ativo.
- `src/entities/enrollment/api.ts`: `fetchEnrollments`, `fetchEnrollmentsByGroup`,
  `fetchEnrollmentsByStudent`, `enrollStudent`, `unenrollStudent`.
- `src/entities/enrollment/queries.ts`: hooks `useEnrollmentsByGroup`, etc.
- Testes unit + integração.
- Coleção `"enrollments"` em `Collection`.
- **Commit:** `add enrollment entity for student-aula membership`

### T4 · Seed v8

- `src/shared/lib/storage/seed.ts`:
  - `TURMAS` sem `gradeLevel`.
  - `alunos` gerados com `birthDate` determinístico (11–17 anos), `guardianName`
    determinístico (parente do sobrenome), `guardianPhone` no formato `(11) 9xxxx-xxxx`;
    sem `enrollment`; sem `groupId`.
  - Nova coleção `enrollments`: 1 enrollment por aluno com o antigo `groupId` da lista
    (preserva a distribuição atual, mantém chamadas/avaliações consistentes).
- **Commit:** `seed alunos com ficha e enrollments`

### T5 · Migrar readers para enrollment

- `src/entities/student/api.ts`: `fetchStudentsByGroup(groupId)` agora resolve via
  `enrollments` (busca ativos, mapeia para alunos).
- Atualiza chamadas: `AttendanceForm` continua usando `useStudentsByGroup` (transparente).
- Widget de "alunos em risco" (AdminPanel) — `aluno.groupId` some, precisa mudar para
  "alunos com faltas altas somando todas as aulas".
- Atualiza `StudentList` para não exibir "Turma" única (mostra count de aulas ou omite).
- **Commit:** `route student-by-group through enrollments`

### T6 · Novo StudentFormModal (só ficha)

- `src/widgets/student-list/StudentFormModal.tsx`: form com Nome, Data de nascimento,
  Nome do responsável, Telefone do responsável. Sem seletor de aula.
- `StudentList`: coluna "Matrícula" some; nova coluna "Idade" (derivada) e "Responsável".
- **Commit:** `redesign student form to ficha`

### T7 · Painel "Alunos da aula" (matrícula)

- Dentro de `src/widgets/groups-admin/`: painel/modal que lista os alunos matriculados na
  aula, com "adicionar" (autocompletar por nome) e "remover" (soft: seta `active=false`).
- **Commit:** `add alunos-da-aula panel with enroll and unenroll`

### T8 · Student detail lista todas as aulas

- `src/widgets/student-detail/StudentDetail.tsx`: seção "Aulas" mostrando todas as aulas
  em que o aluno está matriculado (nome da aula, frequência agregada da aula).
- **Commit:** `list aulas do aluno on student detail`

### T9 · Copy PT-BR "Turma" → "Aula"

- Passe global no `src/**/*.tsx`: rótulos, headings, botões, aria-labels, placeholders
  que dizem "Turma" e não são sobre uma turma escolar (série) passam a "Aula".
  Mantém "aluno" e "professor".
- Sidebar: item "Turmas" → "Aulas".
- **Commit:** `rename turma to aula on ui copy`

### T10 · CLAUDE.md reflete identidade ONG

- Reescreve seção "Identidade do Produto" e "Domínio" para ONG de reforço no contra-turno:
  aula ≠ turma; matrícula (enrollment) N:N; sem promoção/série; ficha do aluno com
  responsável.
- **Commit:** `update project rules to ong reforço identity`

### T11 · E2E — cadastro e matrícula

- `e2e/pivot/pivot.spec.ts`:
  1. Admin cria um aluno (ficha completa).
  2. Admin abre uma aula e matricula o aluno recém criado.
  3. Professor da aula loga, faz chamada, vê o aluno.
- Evidências PNG em `e2e/pivot/evidencias/`.
- **Commit:** `add e2e for admin ficha and enrollment flow`

## Aceite final

- `npm run lint`, `npm run type-check`, `npm test`, `npm run build` — todos verdes.
- `npx playwright test` — todos verdes.
- Merge fast-forward de `feat/ong-reforco-pivot` em `developer`; branch removida.
