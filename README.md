# Radarge

Presença escolar. Professores marcam a chamada da turma (mobile, em sala) e
lançam notas de avaliações; a coordenação acompanha frequência, absenteísmo e
desempenho (média ponderada) em dashboards (mobile + desktop).

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **CSS Modules + design tokens** (sem Tailwind) — tokens em `src/app/globals.css`
- **TanStack Query** nos hooks de dados · **Zod** para os tipos de domínio
- **Vitest** + Testing Library para testes
- Backend-alvo: **Supabase** (Postgres + RLS + RPCs). Hoje os dados vivem em
  `localStorage` (fase de protótipo) atrás de fetchers assíncronos, então trocar
  pelo Supabase depois é um adapter — sem mexer nas features.

## Arquitetura — Feature-Sliced Design

```
src/
├── app/          Rotas e layouts (App Router). Sem regra de negócio.
├── widgets/      UI composta (app-shell, painéis).
├── features/     Casos de uso (analytics, fazer-chamada…).
├── entities/     Domínio: model (zod) + api (fetchers) + queries (hooks).
└── shared/       Infra: ui (design system), lib (storage, query, format), config.
```

Regra de import: só de camadas **abaixo** (`app → widgets → features → entities →
shared`). Nunca lateral, nunca para cima.

### Camada de dados (temporária)

`src/shared/lib/storage/` guarda um único blob versionado em `localStorage`
(`radarge.db.v2`) com seed de demonstração. `entities/*/api.ts` são fetchers
assíncronos validados com Zod; `entities/*/queries.ts` expõem os hooks TanStack.

## Scripts

```bash
pnpm dev          # desenvolvimento
pnpm build        # build de produção
pnpm type-check   # tsc --noEmit
pnpm lint         # eslint
pnpm test         # vitest run (unit + integração)
pnpm test:e2e     # playwright (E2E)
```

## Testes (SDD)

Três camadas, conforme o CLAUDE.md §8:

- **Unitário** — lógica pura (analytics, storage, format, validação zod): `src/**/*.test.ts`.
- **Integração** — hooks TanStack + fetchers sobre o store, com harness MSW
  pronto para o Supabase futuro: `src/**/*.integration.test.tsx` e `src/test/`.
- **E2E (Playwright)** — fluxos reais no browser com evidências PNG em
  `e2e/<feature>/evidencias/`: personas, troca de persona, guardas de rota e
  chamada. Rode com `pnpm test:e2e` (na 1ª vez: `npx playwright install chromium`).

Spec e plano da feature em `docs/superpowers/`.

## Skills de IA usadas no desenvolvimento

Os agents devem respeitar estas skills (além das do Superpowers). Instale-as com:

```bash
npx skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices
npx skills add https://github.com/anthropics/skills --skill frontend-design
npx skills add https://github.com/nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max
```

Os arquivos das skills não são versionados (ver `.gitignore`); o manifesto fica
em `skills-lock.json`. Referência de UI/branding em `design/mockups/`.
