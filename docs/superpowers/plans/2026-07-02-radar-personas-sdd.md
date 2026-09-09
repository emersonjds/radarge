# Radarge Personas — SDD & Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar a pirâmide de testes do SDD (integração + E2E com evidências) e ligar as pontas de UX mock/no-op, deixando o sistema de duas personas robusto e verificado.

**Architecture:** FSD sobre Next.js 16 (App Router) + React 19. Dados em `localStorage` atrás de fetchers assíncronos, hooks TanStack Query, tipos Zod. Testes: Vitest (unit + integração de hooks sobre o store, com harness MSW pronto para o Supabase futuro) e Playwright (E2E com screenshots de evidência).

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS Modules, TanStack Query, Zod, Vitest + Testing Library, MSW, Playwright.

## Global Constraints

- UI 100% em **pt-BR**; light mode.
- **Sem Tailwind, sem CSS-in-JS, sem dependência nova** exceto `msw` e `@playwright/test` (já previstas).
- **CSS Modules + tokens** de `src/app/globals.css`; nunca hex hardcoded.
- FSD: import só para camadas abaixo (`app → widgets → features → entities → shared`).
- Sem `any` (use `unknown` + narrowing); toda função/componente público com interface de props nomeada; sem identificadores de uma letra; comentário só para "porquê" não óbvio.
- Regras de perf (vercel-react-best-practices): sem barrel imports; `"use client"` só onde há hook/estado/evento; derivar no render (sem efeito para estado derivado); `next/link` para navegação.
- Comandos neste ambiente: prefixar pnpm/node com `rtk proxy` (ex.: `rtk proxy pnpm build`) senão a saída é engolida.
- Commits: `git -c user.name="Emerson Silva" -c user.email="emerson_jdss@hotmail.com" commit`; conventional-commit em inglês, minúsculo, sem ponto final; **sem nenhum traço de LLM**.
- Gate por entrega: `rtk proxy ./node_modules/.bin/tsc --noEmit`, `rtk proxy ./node_modules/.bin/eslint src`, `rtk proxy ./node_modules/.bin/vitest run`, `rtk proxy pnpm build` verdes.

---

## Fase A — Ligar as pontas de UX

### Task A1: Rota `/relatorios/[alunoId]` e `DetalheAluno` por id

**Files:**

- Create: `src/app/(app)/relatorios/[alunoId]/page.tsx`
- Modify: `src/app/(app)/relatorios/page.tsx` (redireciona ao primeiro aluno)
- Modify: `src/widgets/detalhe-aluno/DetalheAluno.tsx` (recebe `alunoId: string`)
- Modify: `src/widgets/lista-alunos/ListaAlunos.tsx` (link admin → `/relatorios/${aluno.id}`)

**Interfaces:**

- Produces: `DetalheAlunoProps { alunoId: string }` — `DetalheAluno` deixa de pegar o primeiro aluno e passa a carregar `useAluno(alunoId)`.
- Consumes: `useAluno(id)`, `usePresencasPorAluno(id)` (já existem em `@/entities/aluno/queries` e `@/entities/presenca/queries`).

- [ ] **Step 1:** Em `DetalheAluno.tsx`, trocar a seleção do primeiro aluno por `props.alunoId`; usar `useAluno(alunoId)` em vez de `useAlunos()[0]`. Remover o `ponytail:` da linha ~59. Estado vazio: "Aluno não encontrado" quando `useAluno` retorna null.
- [ ] **Step 2:** Criar `src/app/(app)/relatorios/[alunoId]/page.tsx` — guarda `useExigirPapel(["admin"])`, lê `params` via `useParams()` (client) e renderiza `<DetalheAluno alunoId={String(params.alunoId)} />`.
- [ ] **Step 3:** `src/app/(app)/relatorios/page.tsx` — guarda admin; carrega `useAlunos()`, e com `useRouter().replace('/relatorios/' + primeiroAluno.id)` quando houver alunos; enquanto carrega, "Carregando…".
- [ ] **Step 4:** Em `ListaAlunos.tsx` (ramo admin), a ação "Ver relatório" vira `<Link href={'/relatorios/' + aluno.id}>`.
- [ ] **Step 5:** Gate (tsc/lint/build) e commit: `feat(relatorios): add per-student report route`.

### Task A2: Busca do topbar navega para `/alunos?q=`

**Files:**

- Modify: `src/widgets/app-shell/Topbar.tsx` (SearchInput controlado + submit)
- Modify: `src/widgets/lista-alunos/ListaAlunos.tsx` (lê `useSearchParams().get('q')` como termo inicial)

**Interfaces:**

- Consumes: `useRouter`, `useSearchParams` de `next/navigation`; `SearchInput { value, onChange }`.

- [ ] **Step 1:** No `Topbar`, tornar a busca controlada (`useState`), e ao submeter (Enter) `router.push('/alunos?q=' + encodeURIComponent(termo))`. Envolver em `<form>` com `onSubmit` para acessibilidade (Enter).
- [ ] **Step 2:** Em `ListaAlunos`, inicializar o termo de busca a partir de `useSearchParams().get('q') ?? ''` (derivado no render; o filtro já existe).
- [ ] **Step 3:** Gate e commit: `feat(app-shell): wire topbar search to students filter`.

### Task A3: "Ver todos em risco" filtra a lista de alunos

**Files:**

- Modify: `src/widgets/painel-admin/PainelAdmin.tsx` (link do card de alertas → `/alunos?filtro=risco`)
- Modify: `src/widgets/lista-alunos/ListaAlunos.tsx` (honra `filtro=risco`)

- [ ] **Step 1:** No card "Alertas de baixa frequência", trocar o `<button>` por `<Link href="/alunos?filtro=risco">Ver todos os alunos em risco</Link>`.
- [ ] **Step 2:** Em `ListaAlunos`, ler `useSearchParams().get('filtro')`; quando `=== 'risco'`, restringir a lista aos alunos com `contarFaltas >= LIMITE_FALTAS_RISCO` (derivado no render). Título/subtítulo refletem o filtro ("Alunos em risco").
- [ ] **Step 3:** Gate e commit: `feat(alunos): support risk filter from admin alerts`.

### Task A4: Navegação de mês no calendário de presença

**Files:**

- Modify: `src/widgets/detalhe-aluno/CalendarioPresenca.tsx`

- [ ] **Step 1:** Adicionar estado `mesVisivel` (YYYY-MM) inicial = mês com mais registros (lógica atual). Os IconButtons chevron-left/right mudam o mês (±1, atravessando ano). Remover o `ponytail:` de navegação visual-only.
- [ ] **Step 2:** Derivar as células do `mesVisivel`; desabilitar prev/next além do intervalo com dados (ou permitir livremente, mostrando "sem aula"). Manter aria-label/title por célula.
- [ ] **Step 3:** Gate e commit: `feat(relatorios): make attendance calendar month navigable`.

### Task A5: Quick links do painel do professor

**Files:**

- Modify: `src/widgets/dashboard-professor/DashboardProfessor.tsx`

- [ ] **Step 1:** Garantir que os tiles de "Acesso rápido" e ações apontem só para rotas do professor (`/chamada`, `/alunos`) via `next/link`; remover destinos inválidos/admin. "Iniciar chamada" já vai para `/chamada`.
- [ ] **Step 2:** Gate e commit: `feat(dashboard): point quick links to valid professor routes`.

---

## Fase B — Camada de integração (MSW + hooks sobre o store)

### Task B1: Harness MSW + utilitário de render com QueryClient

**Files:**

- Add dep: `msw` (já instalada)
- Create: `src/test/msw/handlers.ts` (handlers descrevendo a forma REST futura do Supabase; documentado como dormente até o adapter)
- Create: `src/test/msw/server.ts` (`setupServer`)
- Create: `src/test/react-query.tsx` (`renderHookComQuery` — wrapper com `QueryClientProvider` novo por teste)
- Modify: `vitest.setup.ts` (opcional: `server.listen()/resetHandlers()/close()` — sem `onUnhandledRequest:error`, pois hoje não há HTTP)

**Interfaces:**

- Produces: `renderHookComQuery<T>(hook: () => T)` retornando `{ result, ... }` do Testing Library com um `QueryClient` isolado (`retry: false`).

- [ ] **Step 1:** `src/test/react-query.tsx`: exporta `renderHookComQuery` que cria `new QueryClient({ defaultOptions: { queries: { retry: false } } })` e um wrapper `QueryClientProvider`. Usa `renderHook` de `@testing-library/react`.
- [ ] **Step 2:** `src/test/msw/handlers.ts` + `server.ts`: `setupServer()` com um handler de exemplo comentado (forma `GET /rest/v1/turmas`) marcado como dormente. Comentário explica que hoje os dados vêm do store; MSW entra com o adapter Supabase.
- [ ] **Step 3:** Commit: `test: add msw harness and react-query test util`.

### Task B2: Testes de integração dos hooks sobre o store

**Files:**

- Create: `src/entities/aluno/queries.integration.test.tsx`
- Create: `src/features/fazer-chamada/salvar-chamada.integration.test.tsx`

**Interfaces:**

- Consumes: `renderHookComQuery`, `useAlunosPorTurma`, `useCriarChamada`, `useDefinirPresenca`, `usePresencasPorChamada`, `resetDb`.

- [ ] **Step 1 (falha):** `queries.integration.test.tsx` — `beforeEach(resetDb)`; testa `useAlunosPorTurma('turma-mat-b')` via `renderHookComQuery`, `await waitFor(() => expect(result.current.isSuccess).toBe(true))`, e verifica que todos os alunos retornados têm `turmaId === 'turma-mat-b'`. Rodar e ver passar (o hook já existe) — este é teste de caracterização.
- [ ] **Step 2:** `salvar-chamada.integration.test.tsx` — simula o fluxo: `useCriarChamada` + `useDefinirPresenca` para 2 alunos; depois `usePresencasPorChamada(chamadaId)` reflete os status; criar chamada 2x não duplica. Usa `act`/`waitFor`.
- [ ] **Step 3:** Gate (`vitest run`) e commit: `test: add integration tests for query hooks over the store`.

---

## Fase C — E2E Playwright com evidências

### Task C1: Infra Playwright

**Files:**

- Add dep (dev): `@playwright/test`
- Create: `playwright.config.ts` (webServer = `pnpm dev`, baseURL, screenshot dir)
- Modify: `package.json` (script `test:e2e`)
- Modify: `.gitignore` (`/test-results`, `/playwright-report` já ignorados; garantir)

- [ ] **Step 1:** `rtk proxy pnpm add -D @playwright/test`; `rtk proxy npx playwright install chromium` (download fora de script npm; se falhar, reportar honestamente).
- [ ] **Step 2:** `playwright.config.ts`: `testDir: 'e2e'`, `use.baseURL: 'http://localhost:3000'`, `webServer: { command: 'pnpm dev', url: 'http://localhost:3000', reuseExistingServer: true }`, `projects: [{ name: 'chromium' }]`. Screenshots manuais via `page.screenshot`.
- [ ] **Step 3:** Script `"test:e2e": "playwright test"`. Commit: `build: add playwright e2e harness`.

### Task C2: Specs E2E + evidências PNG

**Files:**

- Create: `e2e/personas/personas.spec.ts` (+ evidências em `e2e/personas/evidencias/*.png`)
- Create: `e2e/chamada/chamada.spec.ts` (+ `e2e/chamada/evidencias/*.png`)

**Cenários (cada um com `page.screenshot({ path: 'e2e/<f>/evidencias/<nome>.png' })`):**

- [ ] **Step 1:** `personas.spec.ts`:
  - Login como Professor → home mostra "Bem-vindo" e nav tem "Chamada", não tem "Relatórios"; screenshot `professor-home.png`.
  - Trocar persona para Coordenação no topbar → home vira painel admin ("Total de alunos"), nav tem "Relatórios"; screenshot `admin-home.png`.
  - Guarda: como professor, ir a `/relatorios` → redireciona para `/`; screenshot `guard-professor.png`.
  - Guarda: como admin, ir a `/chamada` → redireciona para `/`.
- [ ] **Step 2:** `chamada.spec.ts`:
  - Como professor, abrir `/chamada`, marcar todos presente, salvar → banner "Chamada salva"; screenshot `chamada-salva.png`.
  - Reabrir `/chamada` mesma turma → status prefilled.
- [ ] **Step 3:** `rtk proxy pnpm test:e2e` verde; confirmar PNGs gerados. Commit: `test(e2e): add persona and chamada flows with evidence`.

---

## Fase D — Fecho

### Task D1: Gate final + merge

- [ ] `tsc`, `eslint`, `vitest run`, `pnpm build`, `pnpm test:e2e` verdes.
- [ ] Atualizar README (seção Testes: unit/integração/E2E + como rodar).
- [ ] Merge `feat/sdd-tests-hardening` → master (ff), sem push.

---

## Self-review (cobertura do spec)

- Spec §4 "pirâmide de testes" → Fases B (integração/MSW) e C (E2E). ✅
- Spec §4 "ligar pontas de UX" → Fase A (A1 rota por id, A2 busca, A3 risco, A4 calendário, A5 quick links). ✅
- Spec §5 tabela de camadas → Tasks B1/B2/C1/C2. ✅
- Spec §7 risco Playwright/ignore-scripts → Task C1 Step 1 nota honesta. ✅
- Spec §7 risco MSW-sobre-localStorage → Task B1 handlers dormentes documentados. ✅
- Fora de escopo (auth real, CRUD, PDF) → não há tasks, coerente com o spec. ✅
