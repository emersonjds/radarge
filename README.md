# Radarge

Presença escolar. Professores marcam a chamada da turma (mobile, em sala) e
lançam notas de avaliações; a coordenação acompanha frequência, absenteísmo e
desempenho (média ponderada) em dashboards (mobile + desktop).

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS 4** com tokens em CSS custom properties no `@theme` de `src/app/globals.css`
  (CSS-first, sem `tailwind.config`) · **shadcn/ui** em `src/shared/ui`
- **TanStack Query** nos hooks de dados · **Zod** para os tipos de domínio
- **Vitest** + Testing Library para testes
- **react-hook-form + zod** em todo formulário (ver `docs/specs/form-pattern.md`)
- Backend: a **`radarge-api`** (Node, Fastify, Postgres), no repositório irmão
  `personal-projects/radarge-api`. O contrato publicado em `openapi.json` gera os tipos
  do front, então divergência vira erro de `npm run type-check` e não `undefined` em tela.

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
npm run dev          # desenvolvimento
npm run build        # build de produção
npm run type-check   # tsc --noEmit
npm run lint         # eslint
npm test         # vitest run (unit + integração)
npm run test:e2e     # playwright (E2E)
```

## Testes (SDD)

Três camadas, conforme o CLAUDE.md §8:

- **Unitário** — lógica pura (analytics, storage, format, validação zod): `src/**/*.test.ts`.
- **Integração** — hooks TanStack e fetchers contra a radarge-api mockada com MSW:
  `src/**/*.integration.test.tsx` e `src/test/`.
- **E2E (Playwright)** — fluxos reais no browser com evidências PNG em
  `e2e/<feature>/evidencias/`: personas, troca de persona, guardas de rota e
  chamada. Rode com `npm run test:e2e` (na 1ª vez: `npx playwright install chromium`).

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
