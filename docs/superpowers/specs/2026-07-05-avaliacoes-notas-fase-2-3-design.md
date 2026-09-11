# Fases 2 & 3 — Avaliações, notas & analytics derivado

**Data:** 2026-07-05
**Status:** aprovado (design travado no brainstorming; ver decisões abaixo)
**Depende de:** Fase 1 (estrutura acadêmica — `assignment`/lecionamento já existe)

## Contexto

A Fase 1 entregou a estrutura (turmas, matérias, lecionamentos turma×matéria×professor)
e a chamada escopada por regente. Falta o fluxo acadêmico que o usuário descreveu:
o professor cria **provas e trabalhos de casa** e **lança notas** por aluno; e os
relatórios passam a refletir **notas reais** em vez do agregado de seed.

Hoje o `grade` é um agregado por `(aluno, matéria)` vindo do seed, consumido por
`features/analytics/academic.ts` (que opera sobre `Grade[]`) e pelos widgets
`ReportsCenter`, `AcademicPanel`, `ClassOverview`.

## Decisões (brainstorming)

1. **Fluxo do professor:** novo item **Notas** no menu do professor → escolhe um
   lecionamento dele (turma+matéria) → vê/cria avaliações → abre uma avaliação →
   lança nota por aluno.
2. **Trabalho de casa = avaliação com `type`:** avaliação tem `type` (`exam` |
   `homework`); ambos têm nota 0–10, `weight` 1–3 e data. Média do aluno é ponderada
   pelo peso.
3. **Analytics (Fase 3) derivado:** a nota-por-matéria dos relatórios vira **média
   ponderada das avaliações reais**. Removo a coleção `grades` do seed e **semeio
   avaliações+notas de demo** para os relatórios continuarem ricos. Fonte única.

## Modelo de domínio

### Entidade nova: `evaluation` (avaliação)

```ts
// src/entities/evaluation/model.ts
export const evaluationTypeSchema = z.enum(["exam", "homework"]);
export const evaluationTypeLabels = { exam: "Prova", homework: "Trabalho de casa" };

export const evaluationSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  subjectId: z.string(),
  name: z.string().min(1),
  type: evaluationTypeSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight: z.number().int().min(1).max(3),
});
```

- Pertence a um lecionamento — a dupla `(groupId, subjectId)`. O professor é derivado
  do `assignment` correspondente.
- **Único por `(groupId, subjectId, name, date)`** (regra do CLAUDE.md).

### Entidade nova: `evaluationGrade` (nota por avaliação)

```ts
// src/entities/evaluation-grade/model.ts
export const evaluationGradeSchema = z.object({
  id: z.string(),
  evaluationId: z.string(),
  studentId: z.string(),
  score: z.number().min(0).max(10).nullable(), // null = pendente
});
```

- **Único por `(evaluationId, studentId)`** — upsert (set) por aluno.

### `grade` (agregado por matéria) — passa a ser DERIVADO (Fase 3)

O tipo `Grade` (`{ id, studentId, subjectId, score }`) continua sendo a entrada do
`academic.ts`. Mas `fetchGrades`/`fetchGradesByStudent` deixam de ler a coleção `grades`
e passam a **derivar** de `evaluations` + `evaluationGrades`:

> Para cada `(aluno, matéria)`: média **ponderada pelo `weight`** das notas não-nulas do
> aluno nas avaliações daquela matéria (nas turmas do aluno). Sem nota → matéria omitida.

Assim `academic.ts`, `ReportsCenter`, `AcademicPanel`, `ClassOverview` e o CSV **não
mudam** (mesmo shape `Grade[]`). Só a fonte muda.

## Camada de dados (store)

- `db.ts`: adicionar coleções `"evaluations"` e `"evaluationGrades"`; **remover** `"grades"`
  do union `Collection` e do `Db`. Bump `radarge.db.v6 → radarge.db.v7`; `v6` em `LEGACY_KEYS`.
- `seed.ts`: remover o bloco `notas`/`grades`. Semear, para cada `assignment` (turma×matéria),
  uma ou duas avaliações e as notas dos alunos daquela turma — determinístico (reaproveitar
  a lógica `scoreFor` para gerar valores variados por aluno/área). Objetivo: os relatórios
  derivados ficam ~equivalentes aos de hoje.

## Convenções de implementação (obrigatórias)

- **Código em inglês** (identificadores, comentários, descrições de teste); **UI em PT-BR**
  (texto visível, labels, toasts, aria-label, mensagens de erro que aparecem ao usuário).
- **Autoria:** todos os commits do Emerson (autor e committer), sem co-autor e sem traço de IA.
- **Design tokens** apenas; mobile-first; responsivo 375/768/1280.
- **White-label:** entidades novas seguem tenant-agnósticas (sem `organizationId`; scoping
  por escola entra depois no Supabase, via coluna + RLS).

## Fase 2 — Avaliações & notas (professor)

- Entidade `evaluation` (model/api/queries/test): fetch por `(group, subject)`, por professor
  (via assignments), create (guard de unicidade `(groupId, subjectId, name, date)`), update, delete
  (cascade das `evaluationGrades` da avaliação ao excluir).
- Entidade `evaluation-grade` (model/api/queries/test): fetch por avaliação; `setGrade` (upsert por
  `(evaluationId, studentId)`); ao mutar, invalidar também as queries de `grade` derivado.
- **Tela Notas** (professor, gated a `teacher`): nav item "Notas" (`/grades`); lista os lecionamentos
  do professor (assignments dele) → seleciona → lista avaliações da dupla → modal "Nova avaliação"
  (nome, tipo, data, peso) → abrir avaliação → lançar nota por aluno da turma (input 0–10 ou vazio=pendente).
- **Seed** de avaliações+notas de demo (base para a Fase 3).

## Fase 3 — Analytics derivado

- Helper puro `deriveSubjectGrades(evaluations, evaluationGrades, studentIds?)`: produz `Grade[]`
  (média ponderada por `(aluno, matéria)`), com teste unitário cobrindo peso e notas pendentes.
- Reescrever `grade/api.ts` (`fetchGrades`/`fetchGradesByStudent`) para derivar via o helper,
  lendo `evaluations`+`evaluationGrades`. `grade/model.ts` e `grade/queries.ts` mantêm o shape.
- Remover a coleção `grades` do seed e do `db.ts`.
- Garantir invalidação: mutação de `evaluationGrade` invalida `gradeKeys.all`.
- `academic.ts`, `ReportsCenter`, `AcademicPanel`, `ClassOverview`, CSV: **não tocar** (validar por teste).

## Testes (3 camadas)

- **Unit:** zod dos schemas; unicidade da avaliação; upsert da nota; `deriveSubjectGrades`
  (peso, pendentes, matéria sem nota omitida). `academic.test.ts` existente deve continuar verde.
- **Integração (store):** CRUD de evaluation/evaluationGrade; `fetchGrades` derivado devolve o
  esperado a partir de avaliações semeadas.
- **E2E (Playwright + PNG em `e2e/evaluations/evidencias/`):** professor loga → Notas → cria uma
  prova num lecionamento → lança notas → (opcional) admin/coord abre Relatórios e vê a média
  refletida.

## Critérios de aceite

- [ ] Professor cria prova/trabalho por lecionamento (sem duplicar `(turma, matéria, nome, data)`).
- [ ] Professor lança/edita nota por aluno; pendente = vazio.
- [ ] Excluir avaliação remove suas notas (cascade).
- [ ] Relatórios/`AcademicPanel`/CSV passam a refletir a média **derivada** das avaliações; a
      coleção `grades` do seed foi removida e nada quebra.
- [ ] `npm run type-check`, 3 camadas de teste e `npm run build` verdes; UI 100% PT-BR; sem `console.log`.

## Fora de escopo

Recuperação/média final com regra de aprovação, boletim em PDF, edição de peso pós-lançamento em
massa. (Supabase entra depois — as assinaturas dos fetchers já são o encaixe.)
