# Radarge — presença escolar (spec de design)

**Data:** 2026-07-01
**Status:** aprovado
**Tagline:** presença em foco

## 1. Produto

- **Nome:** Radarge
- **Domínio:** marcação de presença de alunos em sala, usado por professores; área administrativa com gráficos e dados de presença/absenteísmo.
- **Base de arquitetura:** Qore (Next.js + FSD-like) com dados no modelo do Bolão da Copa (Supabase direto).
- **Idioma da UI:** português brasileiro em 100% dos textos visíveis.
- **Tema:** light mode.

## 2. Usuários e visões

- **Professor:** visão **mobile-first** (uso no celular, em sala). Vê só suas turmas; faz a chamada.
- **Admin:** visão **responsiva mobile + notebook** (desktop). Dashboard com gráficos, gestão de turmas/alunos, vê tudo.

## 3. Stack

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + pnpm.
Radix/shadcn (UI), **recharts** (gráficos), TanStack Query (dados), zustand (estado), zod (validação), react-hook-form (forms).
Dados: **Supabase** (Postgres + RLS + RPCs) via `@supabase/ssr` — SPA falando direto com o banco; sem servidor próprio. Publishable key no cliente; `service_role` nunca vai ao frontend.

## 4. Arquitetura — Feature-Sliced Design

```
src/
├── app/        Next.js App Router. Rotas e layouts. Sem regra de negócio.
│               /login
│               (professor)/turmas · (professor)/chamada/[turmaId]
│               (admin)/dashboard · (admin)/turmas · (admin)/alunos
├── widgets/    UI composta (header, sidebar, painéis de gráfico).
├── features/   Casos de uso (fazer-chamada, ver-dashboard, gerir-turmas, gerir-alunos, auth).
├── entities/   Modelos de domínio (perfil, turma, aluno, chamada, presenca).
└── shared/     Infra reutilizável (ui, lib/supabase, hooks, providers).
```

Regra de import: só de layers abaixo (`app → widgets → features → entities → shared`). Nunca o contrário, nunca lateral entre slices da mesma layer.

## 5. Modelo de dados (Postgres + RLS)

- `perfis` — id (→ `auth.users`), nome, papel (`professor` | `admin`).
- `turmas` — nome, série, turno, `professor_id` (→ perfis).
- `alunos` — nome, matrícula, `turma_id` (→ turmas), ativo.
- `chamadas` — `turma_id`, data, `professor_id`. **Única por (turma_id, data)** = "aula realizada".
- `presencas` — `chamada_id`, `aluno_id`, status (`presente` | `ausente` | `atrasado` | `justificado`). **Única por (chamada_id, aluno_id)**.

Migrations em `supabase/migrations/`.

## 6. Analytics (fonte de verdade no servidor)

Views/RPCs no Supabase, não lógica no cliente:

- `frequencia_por_aluno` — % de presença por aluno.
- `frequencia_por_turma` — % de presença por turma.
- `tendencia_absenteismo` — série temporal de faltas.
- `alunos_em_risco` — alunos com faltas acima de um limite (risco de evasão).

## 7. Dashboard admin

Linha de KPIs (% presença geral, alunos em risco, aulas hoje) + gráfico de barra (presença por turma) + gráfico de linha (absenteísmo no tempo) + tabela de alertas.
3 gráficos + KPIs — sem excesso. Segue a skill `dataviz` ao construir os gráficos.

## 8. RLS (regras de acesso)

- **Professor:** SELECT/mutations só em turmas onde `professor_id = auth.uid()` e nas chamadas/presenças dessas turmas.
- **Admin:** leitura e gestão de tudo.
- Papel lido de `perfis`. `service_role` nunca no cliente; proteção real é a RLS no Postgres.

## 9. Agents (importados do Bolão da Copa, adaptados ao domínio presença)

`arq` (arquitetura FSD + Supabase), `back` (schema/RLS/RPCs de presença), `front` (frontend, perf, segurança client-side), `pixel` (UX/UI, mobile-first professor / responsivo admin), `redteam` (segurança ofensiva, threat modeling), `bug` (QA/quality gate), `qa` (E2E em tela com Playwright), `scribe` (i18n PT-BR, docs).
Regra: um agent por função, sem duplicação. Skills `bluespec.*` de segurança incluídas.

## 10. MCPs (configurados e funcionais)

`.mcp.json` com `serena` (pinado), `context-mode`, `context7` — copiados da base.

## 11. Ponytail funcional no projeto

Hook `SessionStart` no `.claude/settings.json` do projeto ativando o modo ponytail (nível `full`) em toda sessão aberta na pasta.

## 12. Git

`git init` em `projects/radarge`. `.githooks` (commit-msg bloqueia rastro de IA; pre-push só humano). Micro-commits atômicos, mensagens em inglês imperativo, autor humano. Sem `git push` sem confirmação explícita.

## 13. Fora do v1 (YAGNI)

Multi-escola/multi-tenant, notificações, relatórios PDF, importação em massa de alunos. Adicionar quando houver pedido.
