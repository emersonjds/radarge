# Radarge — Sistema de presença com duas personas · Design (spec)

Data: 2026-07-02 · Status: aprovado por delegação (usuário ausente; premissas
marcadas abaixo, revisáveis)

## 1. Contexto

Radarge é um app de presença escolar (Next.js 16 App Router, React 19, TS, FSD,
CSS Modules + tokens, TanStack Query, Zod). Os dados vivem hoje em `localStorage`
(`radarge.db.v1`) atrás de fetchers assíncronos — adapter para Supabase depois. O
front já está construído: design system, app-shell, telas (painel professor,
chamada, painel admin, detalhe do aluno, alunos, login) e a camada de sessão que
distingue as duas personas.

## 2. Objetivo desta rodada

Formalizar os artefatos SDD (este spec + o plano) e **fazer o sistema funcionar
bem**: fechar a pirâmide de testes do projeto e ligar as pontas de UX que hoje
são mock/no-op — sem inventar novas entidades nem telas de gestão.

## 3. Personas (já implementadas, aqui documentadas)

- **Professor** (enxuto): `Painel` (suas turmas), `Chamada` (lista de presença,
  fluxo funcional de salvar), `Alunos` (dados básicos só das turmas dele).
- **Coordenação/Admin** (visão ampla): `Painel` (KPIs, gráficos, alertas de
  risco), `Alunos` (todos, com link ao relatório), `Relatórios` (detalhe do
  aluno). Peso informacional concentrado aqui.

Sessão mock em `features/sessao` (`useSyncExternalStore` sobre `localStorage`
`radarge.sessao`, default `professor`). Nav, home (`/` role-aware com code-split) e
guardas de rota derivam do papel. Troca de persona no topbar e no login.
Premissa: auth real (Supabase) fica fora desta rodada — a persona é escolhida.

## 4. Escopo

### Entra

1. **Artefatos SDD**: este spec + plano de implementação.
2. **Pirâmide de testes** (CLAUDE.md §8):
   - Unitário — já existe (analytics, storage, format, apis). Manter/expandir.
   - **Integração com MSW** — fetchers/queries contra Supabase mockado em
     `src/test/msw/`. Premissa: como os dados hoje são `localStorage`, os testes
     de integração exercitam os hooks TanStack + fetchers contra o **store real
     em memória** e preparam o harness MSW para quando o adapter Supabase entrar.
   - **E2E Playwright com evidências PNG** em `e2e/<feature>/evidencias/*.png`:
     login por persona, troca de persona, chamada salvando presença, guardas de
     rota (professor barrado em `/relatorios`, admin em `/chamada`).
3. **Ligar pontas de UX mock/no-op**:
   - Rota real `/relatorios/[alunoId]` (detalhe do aluno por id); admin →
     "Ver relatório" aponta para ela; `/relatorios` sem id redireciona ao
     primeiro aluno.
   - Busca do topbar funcional (navega para `/alunos` filtrando por termo).
   - "Ver todos em risco" (admin) leva à lista de alunos filtrada por risco.
   - Navegação de mês no calendário de presença (prev/next reais).
   - Quick links do painel do professor apontando para rotas válidas do papel.

### Fica fora (YAGNI nesta rodada)

- Auth real / Supabase (adapter e RLS ficam para a fase de backend).
- CRUD de gestão (criar/editar turmas, alunos, professores).
- Geração real de PDF; entidade de "atividades/notas" (segue mock).
- Configurações e notificações reais.

## 5. Estratégia de testes

| Camada           | Onde                                      | O que cobre                                                                                        |
| ---------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Unit             | `src/**/*.test.ts` (Vitest)               | lógica pura: analytics, storage, format, validação zod, unicidade/upsert                           |
| Integração (MSW) | `src/test/msw/` + `*.integration.test.ts` | hooks TanStack + fetchers ponta a ponta sobre o store; handlers MSW prontos para o Supabase futuro |
| E2E (Playwright) | `e2e/` + evidências PNG                   | fluxos reais no browser: personas, chamada, guardas                                                |

Gate por implementação: `npm run type-check`, `npm run lint`, `npm test`,
`npm run build` e os E2E verdes antes de concluir.

## 6. Arquitetura (inalterada, referência)

FSD: `app` (rotas) → `widgets` (blocos de UI) → `features` (casos de uso:
sessão, fazer-chamada, analytics, auth) → `entities` (perfil, turma, aluno,
chamada, presença — model zod + api + queries) → `shared` (ui, lib/storage,
lib/query, config). Import só para camadas abaixo.

### Mudanças estruturais desta rodada

- `src/app/(app)/relatorios/[alunoId]/page.tsx` (nova rota dinâmica) e
  `DetalheAluno` passa a receber `alunoId` como prop em vez de pegar o primeiro.
- `src/test/msw/` (handlers + server) — infra de teste.
- `e2e/` (Playwright config + specs + evidências).
- Busca do topbar: estado controlado + `router.push('/alunos?q=...')`;
  `ListaAlunos` lê `useSearchParams`.

## 7. Riscos / decisões

- **Playwright em ambiente com `ignore-scripts` global**: o download dos browsers
  é feito por `npx playwright install chromium` (fora de script npm), então não é
  bloqueado; ainda assim é ~100MB — se falhar, os E2E são reportados como não
  executados, sem mascarar.
- **MSW sobre localStorage**: como não há HTTP hoje, os testes de "integração"
  exercitam a fronteira fetcher↔store; os handlers MSW ficam prontos e cobrem a
  forma dos payloads do Supabase para reduzir atrito na migração. Explicitado
  para não vender cobertura de rede que ainda não existe.
- **`/relatorios` sem id**: redireciona para o primeiro aluno (ou lista curta),
  evitando tela vazia; o destino canônico é `/relatorios/[alunoId]`.

## 8. Critérios de aceite

- Specs e plano commitados em `docs/superpowers/`.
- Três camadas de teste presentes e verdes; evidências PNG geradas de fato.
- Pontas de UX acima funcionais (sem `ponytail:` de no-op nas que entraram no
  escopo).
- `type-check`, `lint`, `test`, `build` verdes; personas verificadas em browser.
- Micro-commits sem traço de LLM, merge na master.
