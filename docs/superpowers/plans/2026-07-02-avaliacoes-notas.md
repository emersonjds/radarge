# Avaliações & Notas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Professor cria avaliações por turma e lança notas 0–10; coordenação vê desempenho real e média ponderada no relatório do aluno.

**Architecture:** Duas entities novas (`avaliacao`, `nota`) seguindo o trio model(zod)/api(fetchers async sobre o store)/queries(hooks TanStack); coleções novas no storage com migração leve; `mediaPonderada` em analytics; tela `/avaliacoes` (professor) no padrão da Chamada; `DetalheAluno` troca a tabela mock por dados reais.

**Tech Stack:** Next.js 16 App Router, React 19, TS, Zod, TanStack Query, CSS Modules + tokens, Vitest, Playwright.

## Global Constraints

- UI 100% pt-BR; light mode; tokens de `src/app/globals.css`, nunca hex hardcoded; sem dependência nova.
- FSD: import só para camadas abaixo (`app → widgets → features → entities → shared`).
- Sem `any`; interfaces de props nomeadas; sem identificadores de 1 letra; comentário só para porquê não óbvio.
- Sem barrel imports; `"use client"` só onde há hook/estado/evento; derivar no render (eslint `react-hooks/set-state-in-effect` rejeita setState em efeito); `next/link` para navegação.
- Comandos npm/node prefixados com `rtk proxy` (senão a saída é engolida).
- Commits: `git -c user.name="Emerson Silva" -c user.email="emerson_jdss@hotmail.com" commit -m "..."` — inglês, minúsculo, sem ponto final, sem traço de LLM.
- Gate por task: `rtk proxy ./node_modules/.bin/tsc --noEmit` + `rtk proxy ./node_modules/.bin/eslint src` + `rtk proxy ./node_modules/.bin/vitest run` verdes.

---

### Task 1: Storage — coleções `avaliacoes`/`notas`, migração leve e seed

**Files:**

- Modify: `src/shared/lib/storage/db.ts`
- Modify: `src/shared/lib/storage/seed.ts`
- Test: `src/shared/lib/storage/db.test.ts` (adicionar casos)

**Interfaces:**

- Produces: `Collection` passa a incluir `"avaliacoes" | "notas"`; `readCollection("avaliacoes")` retorna `[]` para blob antigo sem a chave; seed contém 2 avaliações por turma (`avaliacao-<turmaId>-p1-<data>` / `...-p2-<data>`, pesos 1 e 2) e notas para a maioria dos alunos (determinístico; ~1 a cada 7 pendente = sem registro).

- [ ] **Step 1: Teste falhando (migração leve)** — em `db.test.ts`:

```ts
it("returns empty array for a collection missing from an old blob", async () => {
  await resetDb();
  // simula blob antigo persistido sem as coleções novas
  await readCollection("turmas"); // força seed
  const rows = await readCollection("avaliacoes");
  expect(Array.isArray(rows)).toBe(true);
});
```

E o caso real: montar um `Db` parcial sem `avaliacoes` via localStorage não está disponível no fallback em memória — então o teste correto é: `readCollection` não lança quando a chave falta. Implementar assim: no teste, chamar `mutateCollection` numa coleção existente para persistir, depois `readCollection("avaliacoes")` deve retornar array (do seed ou `[]`), nunca lançar.

- [ ] **Step 2: Rodar** `rtk proxy ./node_modules/.bin/vitest run src/shared/lib/storage/db.test.ts` — falha de tipo (`"avaliacoes"` não é `Collection`).
- [ ] **Step 3: Implementar** — em `db.ts`: adicionar `"avaliacoes" | "notas"` a `Collection`; em `readCollection` e `mutateCollection`, trocar `db[name] as T[]` por `((db[name] ?? []) as T[])` (migração leve). Em `seed.ts`: gerar `avaliacoes` (para cada turma: `{ id: "avaliacao-" + turma.id + "-p1-2026-06-20", turmaId, nome: "Prova 1", data: "2026-06-20", peso: 2, professorId: PROFESSOR_ID }` e `{ id: ...-p2-2026-06-27, nome: "Trabalho 1", data: "2026-06-27", peso: 1, ... }`) e `notas` (para cada avaliação × aluno da turma: pular quando `(alunoIdx + avaliacaoIdx) % 7 === 3` (pendente); senão `valor = Math.round((4 + ((alunoIdx * 3 + avaliacaoIdx * 5) % 61) / 10) * 10) / 10` → determinístico entre 4.0 e 10.0, id `"nota-" + avaliacao.id + "-" + aluno.id`).
- [ ] **Step 4: Rodar tudo** — `rtk proxy ./node_modules/.bin/vitest run` verde.
- [ ] **Step 5: Commit** — `feat(storage): add avaliacoes and notas collections with light migration`

### Task 2: Entities `avaliacao` e `nota` (model + api + queries)

**Files:**

- Create: `src/entities/avaliacao/model.ts`, `api.ts`, `queries.ts`, `api.test.ts`
- Create: `src/entities/nota/model.ts`, `api.ts`, `queries.ts`, `api.test.ts`

**Interfaces (Produces — telas dependem destas assinaturas):**

```ts
// avaliacao/model.ts
export const avaliacaoSchema = z.object({
  id: z.string(),
  turmaId: z.string(),
  nome: z.string().min(1),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  peso: z.number().int().min(1).max(3),
  professorId: z.string(),
});
export type Avaliacao = z.infer<typeof avaliacaoSchema>;

// avaliacao/api.ts
export async function fetchAvaliacoesPorTurma(turmaId: string): Promise<Avaliacao[]>; // ordenada por data desc
export interface NovaAvaliacao {
  turmaId: string;
  nome: string;
  data: string;
  peso: number;
  professorId: string;
}
export async function criarAvaliacao(input: NovaAvaliacao): Promise<Avaliacao>;
// id determinístico: "avaliacao-" + turmaId + "-" + slug(nome) + "-" + data,
// slug = nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-");
// criar 2x a mesma (turmaId, slug(nome), data) retorna a existente sem duplicar (padrão criarChamada)

// avaliacao/queries.ts
export const avaliacaoKeys = {
  all: ["avaliacoes"] as const,
  porTurma: (id: string) => ["avaliacoes", "turma", id] as const,
};
export function useAvaliacoesPorTurma(turmaId: string); // enabled: Boolean(turmaId)
export function useCriarAvaliacao(); // invalida all + porTurma(result.turmaId)

// nota/model.ts
export const notaSchema = z.object({
  id: z.string(),
  avaliacaoId: z.string(),
  alunoId: z.string(),
  valor: z.number().min(0).max(10).multipleOf(0.1).nullable(),
});
export type Nota = z.infer<typeof notaSchema>;

// nota/api.ts
export async function fetchNotasPorAvaliacao(avaliacaoId: string): Promise<Nota[]>;
export async function fetchNotasPorAluno(alunoId: string): Promise<Nota[]>;
export async function definirNota(input: {
  avaliacaoId: string;
  alunoId: string;
  valor: number | null;
}): Promise<Nota>;
// id "nota-" + avaliacaoId + "-" + alunoId; upsert por (avaliacaoId, alunoId) — padrão definirPresenca

// nota/queries.ts
export const notaKeys = {
  all: ["notas"] as const,
  porAvaliacao: (id: string) => ["notas", "avaliacao", id] as const,
  porAluno: (id: string) => ["notas", "aluno", id] as const,
};
export function useNotasPorAvaliacao(avaliacaoId: string);
export function useNotasPorAluno(alunoId: string);
export function useDefinirNota(); // invalida all + porAvaliacao + porAluno
```

- Consumes: `readCollection`/`mutateCollection` de `@/shared/lib/storage/db`. Espelhar `src/entities/chamada/*` e `src/entities/presenca/*` (mesmo estilo).

- [ ] **Step 1: Testes falhando** — `avaliacao/api.test.ts`: criar 2x mesma (turma,nome,data) → 1 registro; nome com acento gera slug estável ("Prova Única" 2x não duplica); `peso: 0` rejeita. `nota/api.test.ts`: `definirNota` 2x (6.5 depois 8.0) → 1 registro com 8.0; `valor: 10.05` rejeita; `valor: null` aceita. `beforeEach(resetDb)`.
- [ ] **Step 2: Rodar e ver falhar** (módulos não existem).
- [ ] **Step 3: Implementar** os 6 arquivos conforme as assinaturas acima.
- [ ] **Step 4: Rodar tudo verde.**
- [ ] **Step 5: Commit** — `feat(entities): add avaliacao and nota with zod, fetchers and hooks`

### Task 3: Analytics — `mediaPonderada`

**Files:**

- Modify: `src/features/analytics/model.ts`
- Test: `src/features/analytics/model.test.ts` (adicionar casos)

**Interfaces:**

- Produces: `export function mediaPonderada(notas: Nota[], avaliacoes: Avaliacao[]): number | null` — soma(valor×peso)/soma(pesos) só das avaliações cuja nota existe e `valor !== null`; arredonda 1 casa; `null` se nenhuma nota lançada. Importa tipos de `@/entities/nota/model` e `@/entities/avaliacao/model` (features → entities, permitido).

- [ ] **Step 1: Teste falhando**

```ts
describe("mediaPonderada", () => {
  const avs = [av("a1", 2), av("a2", 1)]; // helper local com peso
  it("weighs by peso", () => {
    expect(mediaPonderada([nota("a1", 8), nota("a2", 5)], avs)).toBe(7);
  });
  it("skips null and missing notas", () => {
    expect(mediaPonderada([nota("a1", 9), nota("a2", null)], avs)).toBe(9);
  });
  it("returns null with no launched notas", () => {
    expect(mediaPonderada([], avs)).toBeNull();
  });
});
```

- [ ] **Step 2: Falha** (função não existe). **Step 3: Implementar.** **Step 4: Verde.**
- [ ] **Step 5: Commit** — `feat(analytics): add weighted grade average`

### Task 4: Ícone `nota` + item de menu do professor

**Files:**

- Modify: `src/shared/ui/Icon/Icon.tsx` (adicionar `"nota"` ao union `IconName` + SVG inline 1.5px stroke `currentColor` — ex.: prancheta com marca de conferido, mesma linguagem dos demais)
- Modify: `src/shared/config/navigation.ts` (em `NavIcon` adicionar `"nota"`; em `navProfessor` inserir `{ href: "/avaliacoes", label: "Avaliações", icon: "nota" }` depois de "Chamada")

- [ ] **Step 1:** Implementar as duas mudanças. **Step 2:** `tsc` + `eslint` verdes. **Step 3: Commit** — `feat(nav): add avaliacoes entry for professor`

### Task 5: Tela `/avaliacoes` (professor) — criar avaliação e lançar notas

**Files:**

- Create: `src/app/(app)/avaliacoes/page.tsx`
- Create: `src/features/lancar-notas/AvaliacoesView.tsx` (+ `.module.css`)
- Create: `src/features/lancar-notas/NotaRow.tsx` (se ajudar legibilidade)

**Interfaces:**

- Consumes: `useTurmas`, `useAlunosPorTurma`, `useAvaliacoesPorTurma`, `useCriarAvaliacao`, `useNotasPorAvaliacao`, `useDefinirNota`, `useSessao` (professorId = `perfil.id`), `useExigirPapel(["professor"])`, `formatarData`, design system (Card, Button, Badge, Avatar, Icon, cx, Table opcional).
- Produces: rota `/avaliacoes` funcional.

Comportamento (espelhar `features/fazer-chamada/ChamadaForm.tsx` — ler antes):

1. Page: `"use client"`, guarda professor, `<Suspense>` não é preciso (sem useSearchParams), renderiza `<AvaliacoesView/>`.
2. Seletor de turma (`<select>`, padrão primeira turma).
3. Lista de avaliações da turma (nome, data via `formatarData`, `Badge` "Peso N", "X/Y notas"), clicável para selecionar; a selecionada destaca.
4. "Nova avaliação": formulário inline (nome text obrigatório, data `<input type="date">` padrão hoje, peso `<select>` 1..3) → `criarAvaliacao.mutateAsync` → seleciona a criada.
5. Grade de lançamento da avaliação selecionada: linha por aluno (Avatar, nome, matrícula) + `<input type="number" min={0} max={10} step={0.1} inputMode="decimal">`; estado local `Record<alunoId, string>` (string do input; converter ao salvar); prefill de `useNotasPorAvaliacao` sincronizado durante o render com guarda `avaliacaoSincronizada !== avaliacaoId` (mesmo padrão anti-loop do ChamadaForm — NUNCA setState em efeito).
6. "Salvar notas" (CTA primário único): valida 0–10, `Promise.all` de `definirNota` (só das linhas preenchidas/alteradas; vazio → `valor: null` se já existia nota, senão pula); `isPending` desabilita; sucesso = `Badge tone="success"` "Notas salvas"; erro = banner com "Tentar novamente".
7. Estados: carregando, turma sem alunos, turma sem avaliações ("Crie a primeira avaliação").
8. Touch ≥44px nos inputs/botões; labels visíveis; pt-BR.

- [ ] **Step 1:** Implementar. **Step 2:** Gate (tsc/eslint/vitest). **Step 3:** Smoke manual: dev server, `/avaliacoes` responde 200 e grava (criar avaliação → lançar 2 notas → recarregar → prefill).
- [ ] **Step 4: Commit** — `feat(avaliacoes): add professor grade entry screen`

### Task 6: Relatório do aluno real (coordenação)

**Files:**

- Modify: `src/widgets/detalhe-aluno/DetalheAluno.tsx` (+ `.module.css` se preciso)

**Interfaces:**

- Consumes: `useNotasPorAluno(alunoId)`, `useAvaliacoesPorTurma(aluno.turmaId)`, `mediaPonderada`.

- [ ] **Step 1:** Trocar a tabela mock "Desempenho por atividade" por dados reais: uma linha por avaliação da turma do aluno — colunas Avaliação · Data (`formatarData`) · Peso · Nota (1 casa; "—" se pendente) · Status (`Badge tone="success"` "Lançada" / `tone="warning"` "Pendente"). Remover o array mock e o `ponytail:` correspondente. Ordenar por data desc. Vazio: "Sem avaliações nesta turma".
- [ ] **Step 2:** Card de perfil: mini-stat "Média" com `mediaPonderada(notas, avaliacoes)` ("—" quando `null`), ao lado de Frequência/Faltas.
- [ ] **Step 3:** Gate + smoke (`/relatorios/<id>` mostra avaliações do seed e média coerente).
- [ ] **Step 4: Commit** — `feat(relatorios): show real avaliacoes, notas and weighted average`

### Task 7: Integração + E2E com evidências

**Files:**

- Create: `src/features/lancar-notas/lancar-notas.integration.test.tsx`
- Create: `e2e/avaliacoes/avaliacoes.spec.ts` (+ `e2e/avaliacoes/evidencias/*.png`)

- [ ] **Step 1 (integração):** com `renderHookComQuery` + `resetDb`: `criarAvaliacao` (turma-mat-b, "Prova E2E", hoje, peso 2) → `definirNota` aluno-1 = 6.5 → depois 8.0 → `useNotasPorAvaliacao` reflete 1 registro valor 8.0; `criarAvaliacao` 2x → `useAvaliacoesPorTurma` sem duplicata. Rodar verde.
- [ ] **Step 2 (E2E):** spec com: professor → `/avaliacoes` → cria "Prova Final" (peso 2) → lança nota 8.5 no primeiro aluno → salva → espera "Notas salvas" → screenshot `notas-salvas.png`; recarrega → prefill 8.5 → screenshot `notas-prefill.png`; troca para Coordenação (topbar) → navega ao relatório do primeiro aluno (via `/alunos`, "Ver relatório") → espera "Prova Final" visível na tabela e mini-stat "Média" → screenshot `relatorio-com-notas.png`; guarda: como Coordenação, `/avaliacoes` redireciona a `/`. Seletores por role/text (`getByRole`, `getByLabel`); free port 3000 antes (`pkill -f "next dev"` etc.).
- [ ] **Step 3:** `rtk proxy npm run test:e2e` verde; PNGs existem.
- [ ] **Step 4: Commit** — `test: cover grade entry flow with integration and e2e evidence`

### Task 8: Fecho

- [ ] Gate completo: `tsc`, `eslint src e2e playwright.config.ts`, `vitest run`, `rtk proxy npm run build` (atenção: página nova não usa `useSearchParams`, não precisa de Suspense), `npm run test:e2e`.
- [ ] README: adicionar "Avaliações & Notas" à seção de domínio/testes (1–2 linhas).
- [ ] Merge `feat/avaliacoes-notas` → master (ff-only), deletar branch, sem push.
- [ ] Commit README — `docs: mention avaliacoes and notas`

---

## Self-review

- Spec §3 (entities/storage/analytics) → Tasks 1–3 ✅ · §4 professor → Tasks 4–5 ✅ · §4 coordenação → Task 6 ✅ · §5 testes → Tasks 1–3 (unit) + 7 (integração/E2E) ✅ · §7 aceite → Tasks 5–8 ✅.
- Assinaturas consistentes entre Tasks 2, 5, 6, 7 (`useNotasPorAvaliacao`, `useDefinirNota`, `mediaPonderada(notas, avaliacoes)`). ✅
- Sem placeholders; código/critério concreto em cada step. ✅
