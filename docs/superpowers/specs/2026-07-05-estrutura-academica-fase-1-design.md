# Fase 1 — Estrutura acadêmica & associações

**Data:** 2026-07-05
**Status:** aprovado (aguardando revisão do spec)
**Fase:** 1 de 3 (ver "Decomposição" no fim)

## Contexto

Hoje o Radarge é, na prática, um produto de **presença + analytics**: login com papéis
(`teacher` / `coordinator` / `admin`), chamada por turma, dashboards de frequência/
absenteísmo/risco e relatório acadêmico. Isso fecha ponta a ponta sobre o store local
(`localStorage`, `radarge.db.v5`).

O que **não existe** ainda: montar a estrutura da escola pelo admin (criar turmas e
matérias, dizer quem dá o quê) e, mais adiante, provas/trabalhos e lançamento de notas.
Além disso há um **bug real**: `AttendanceForm` usa `PROFESSOR_ID = "perfil-ricardo"`
hardcoded e lista **todas** as turmas — funciona só porque o seed põe as 3 turmas no
mesmo professor.

Modelo de domínio escolhido (decisão do brainstorming): **escola BR** — a turma é um
**grupo fixo de alunos**; a turma tem **várias matérias**; cada matéria da turma é dada
por **um professor**. A chamada é **1 por turma/dia**, tirada pelo **professor regente**
da turma.

## Objetivo da Fase 1

Ao final desta fase:

1. O **admin** monta a escola inteira pela UI: cria/edita **turmas** (com regente),
   cria/edita **matérias** e define os **lecionamentos** (qual matéria da turma é dada
   por qual professor).
2. O **professor** loga e a **chamada** mostra apenas as turmas onde ele é **regente**
   — sem id hardcoded, usando a sessão.

Provas, notas e a reconciliação do analytics ficam para as Fases 2 e 3. Nesta fase o
`grade` do seed continua alimentando os relatórios exatamente como hoje.

## Convenções de implementação (obrigatórias)

- **Idioma do código: inglês em tudo** — identificadores, tipos, funções, comentários e
  **descrições de teste**. Ex.: `assignment`, `createAssignment`, `teacherId`,
  `describe("createAssignment rejects duplicate (group, subject)")`.
- **PT-BR só na UI voltada ao usuário**: texto visível em JSX, `label`, `placeholder`,
  mensagens de erro/sucesso, toasts e `aria-label`.
- **Débito pré-existente:** o código de `features/`/`widgets/` tem identificadores em
  PT-BR (ex.: `AttendanceForm` usa `turmaSelecionada`, `carregandoTurmas`). Fora do
  escopo desta fase renomear tudo. Código **novo** sai 100% inglês; ao editar um arquivo
  existente, os trechos tocados vão para inglês, sem refatorar o resto do arquivo.
- **Autoria:** todos os commits são exclusivamente do desenvolvedor (autor e committer
  Emerson Silva). Proibido qualquer co-autor e qualquer traço de IA em mensagem/PR.

## Modelo de domínio

### Entidade nova: `assignment` (lecionamento)

Peça central que faltava. Amarra turma × matéria × professor.

```ts
// src/entities/assignment/model.ts
export const assignmentSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  subjectId: z.string(),
  teacherId: z.string(),
});
export type Assignment = z.infer<typeof assignmentSchema>;
```

- **Único por `(groupId, subjectId)`**: uma matéria, numa turma, tem um professor.
  - _ponytail: co-docência (2 professores na mesma matéria/turma) fica fora; se precisar
    depois, `teacherId` vira lista. Teto conhecido, upgrade claro._
- Responde as duas perguntas do modelo:
  - "o que o professor X dá?" → lecionamentos com `teacherId === X` (duplas turma+matéria).
  - "quais matérias a turma T tem?" → lecionamentos com `groupId === T`.

### `subject` (matéria) — ganha escrita

Model inalterado (`id`, `name`, `area`). Passa a ter CRUD.

### `group` (turma) — ganha escrita

Model inalterado (`id`, `name`, `gradeLevel`, `shift`, `teacherId`). O `teacherId`
permanece e significa **professor regente** (quem tira a chamada). Passa a ter CRUD.

### Inalterado nesta fase

`profile`, `student`, `attendance-session`, `attendance-record`, `grade`, `school-event`.
Papéis seguem `teacher` / `coordinator` / `admin`.

## Camada de dados (store local)

`src/shared/lib/storage/db.ts`

- Adicionar `"assignments"` ao union `Collection` e ao tipo `Db`.
- Bump `STORAGE_KEY` `radarge.db.v5 → radarge.db.v6`; adicionar `radarge.db.v5` a `LEGACY_KEYS`.

`src/shared/lib/storage/seed.ts`

- Adicionar array `assignments`. Semear de forma que:
  - Ricardo (regente das 3 turmas) leciona algumas matérias nelas.
  - **Carla** recebe **uma** matéria em **uma** turma — prova o caso multi-professor
    (matéria da turma dada por quem não é o regente).
- Seguir o padrão do seed: literais determinísticos, ids estáveis, sem aleatoriedade.

## Superfícies de API (mantêm a assinatura async do store → futuro adapter Supabase)

`entities/subject/api.ts`

- `createSubject(input: { name; area }): Promise<Subject>`
- `updateSubject(id, patch: Partial<{ name; area }>): Promise<Subject>`
- `deleteSubject(id): Promise<void>` — **bloqueia** se houver `assignment` ou `grade`
  referenciando a matéria (lança erro; a UI mostra mensagem PT-BR).

`entities/group/api.ts`

- `createGroup(input: { name; gradeLevel; shift; teacherId }): Promise<Group>`
- `updateGroup(id, patch): Promise<Group>`
- `deleteGroup(id): Promise<void>` — **bloqueia** se houver `student` ou
  `attendance-session` na turma.

`entities/assignment/api.ts` (novo)

- `fetchAssignments(): Promise<Assignment[]>`
- `fetchAssignmentsByGroup(groupId): Promise<Assignment[]>`
- `fetchAssignmentsByTeacher(teacherId): Promise<Assignment[]>`
- `createAssignment(input: { groupId; subjectId; teacherId }): Promise<Assignment>`
  — rejeita duplicata `(groupId, subjectId)`.
- `updateAssignment(id, patch: { teacherId }): Promise<Assignment>` — troca o professor.
- `deleteAssignment(id): Promise<void>`.

`entities/assignment/queries.ts` (novo) — hooks TanStack Query com invalidação nas
mutations (padrão dos outros entities). Idem hooks de mutation novos para subject/group.

## UI / Arquitetura de informação

Reutiliza o padrão que já existe: **lista (TanStack Table no desktop / cards no mobile)

- modal de formulário** — como `ProfilesAdmin`/`ProfileFormModal` e `StudentList`/
  `StudentFormModal`. Tudo em PT-BR.

### Navegação (admin)

`src/shared/config/navigation.ts` — `navAdmin` ganha **2 itens**: **Turmas** e
**Matérias**. Adicionar os ícones correspondentes ao tipo `NavIcon` (ex.: `"turma"`,
`"materia"`) e mapear no `AppSidebar`. Coordenador e professor não recebem esses itens.

### Rotas novas (gated a `admin` via `useRequireRole(["admin"])`)

- `src/app/(app)/subjects/page.tsx` → **Matérias**
- `src/app/(app)/groups/page.tsx` → **Turmas**

### Widget `subjects-admin` (Matérias)

- Lista de matérias (nome, área) + `SubjectFormModal` (campo nome; select de área com
  `areaLabels`). Ações criar/editar/excluir. Excluir bloqueado mostra motivo PT-BR
  ("Matéria em uso por lecionamento/nota").

### Widget `groups-admin` (Turmas)

- Lista de turmas (nome, série, turno, regente) + `GroupFormModal`
  (nome; série/`gradeLevel`; select de turno com labels PT-BR; **select de regente**
  entre perfis com `role === "teacher"`).
- **Lecionamentos dentro da turma:** ao abrir/expandir uma turma, um painel
  "Matérias desta turma" lista os `assignment` da turma — cada linha com a matéria e um
  **select de professor** (perfis `teacher`); botão "Adicionar matéria à turma" (escolhe
  uma matéria do catálogo ainda não atribuída àquela turma). Criar/editar/remover
  lecionamento ali mesmo. É o lugar natural: "a 3ªA tem estas matérias, com estes
  professores".
  - _Alternativa descartada: tela "Lecionamentos" com tabela plana turma×matéria×
    professor — mais burocrática; gerir dentro da turma é mais intuitivo pra montar a
    escola._

### Fix da chamada (`features/take-attendance/AttendanceForm.tsx`)

- Remover `const PROFESSOR_ID = "perfil-ricardo"`.
- Usar `useSession()`: `teacherId = session.profileId`.
- Filtrar as turmas do select para `teacherId === session.profileId` (regência). Se o
  professor não é regente de nenhuma turma → empty state ("Você não é regente de nenhuma
  turma").
- Salvar a `attendance-session` com o `teacherId` da sessão (não mais hardcoded).

## Testes (as 3 camadas obrigatórias do SDD)

1. **Unitário** — zod dos schemas; unicidade `(groupId, subjectId)` do lecionamento;
   guards de delete (subject em uso, group com aluno/chamada).
2. **Integração (MSW)** — fetchers/mutations de subject, group e assignment contra o
   Supabase mockado (`src/test/msw/`), incluindo os caminhos de erro (duplicata, delete
   bloqueado).
3. **E2E de tela (Playwright, com PNG em `e2e/estrutura-academica/evidencias/`)**:
   - Admin loga → **Matérias**: cria uma matéria.
   - Admin → **Turmas**: cria uma turma (define regente) → adiciona 2 matérias com
     professores (uma delas de outro professor que não o regente).
   - Professor **Ricardo** loga → **Chamada**: o select mostra só as turmas onde ele é
     regente; salvar registra com o id dele (não `perfil-ricardo` hardcoded).
   - Um segundo regente vê apenas as turmas dele.

## Critérios de aceite

- [ ] Admin cria/edita/exclui matéria; exclusão bloqueada quando em uso, com mensagem.
- [ ] Admin cria/edita/exclui turma com regente; exclusão bloqueada quando tem aluno/chamada.
- [ ] Admin adiciona/troca/remove matérias (com professor) dentro de uma turma; sem
      duplicar matéria na mesma turma.
- [ ] Chamada não tem mais id hardcoded; lista só as turmas do regente logado; salva com
      o id da sessão.
- [ ] `pnpm type-check`, testes das 3 camadas e `pnpm build` passam. UI 100% PT-BR.
      Responsivo (375/768/1280). Sem `console.log`, sem imports não usados.

## White-label / multi-tenant (mapeamento — NÃO implementar na Fase 1)

Contexto: hoje o cliente é uma ONG; amanhã outra escola pode usar. Meta: **não travar** o
white-label, sem construí-lo agora (YAGNI até existir 2º cliente real).

Seams que já existem (ou custam ~0) e devem ser preservados:

- **Tema por design token** (`var(--color-*)` em `globals.css`) — já é o mecanismo de
  rebranding: trocar tokens, não componentes. Regra "nunca hex cru" (já no CLAUDE.md) é o
  que mantém isso funcionando. Nada de cor/estilo hardcoded no código novo.
- **Fetchers assíncronos de assinatura estável** (`entities/*/api.ts`) — já pensados como
  futuro adapter Supabase. O **escopo por escola entra no backend** (coluna
  `organization_id` + RLS), **sem** mexer nas features. Por isso as entidades novas
  (`group`, `subject`, `assignment`) **não** ganham `organizationId` nesta fase
  (front-only, single-tenant); a coluna nasce junto com o Supabase.
- **Zero hardcode de identidade**: nenhum código novo cita "Radarge"/"ONG"/nome da escola em
  lógica de domínio. Nome/logo do produto ficam num único ponto de branding (o
  `TailAdminShell`/header) — uma futura config de tenant lê dali.

Ação concreta na Fase 1: manter entidades e regras **tenant-agnósticas** (nada que assuma
"uma única escola"). É natural no modelo escolhido — o cuidado é só não introduzir
suposição de cliente único.

Explicitamente fora da Fase 1: modelo multi-tenant, tabela de organizações, tenant
switcher, domínio próprio, motor de tema por tenant.

## Fora de escopo (Fases 2 e 3)

- **Fase 2 — Avaliações & notas:** entidade `avaliação` (prova | trabalho de casa; nome,
  data, peso 1–3) presa a um lecionamento; lançamento de nota por aluno × avaliação
  (0–10, `null` = pendente), scoped às duplas do professor.
- **Fase 3 — Analytics reconciliado:** a nota-por-matéria dos relatórios passa a ser
  **derivada** das avaliações reais (média ponderada), substituindo o `grade` do seed;
  relatórios e export CSV seguem funcionando.

## Decomposição (visão geral)

| Fase                                          | Entrega                                                           | Depende de |
| --------------------------------------------- | ----------------------------------------------------------------- | ---------- |
| **1 — Estrutura & associações** _(este spec)_ | Admin cria turma/matéria/lecionamento; corrige scoping da chamada | —          |
| 2 — Avaliações & notas                        | Professor cria provas/trabalhos e lança notas                     | 1          |
| 3 — Analytics reconciliado                    | Nota-por-matéria derivada das notas reais                         | 2          |
