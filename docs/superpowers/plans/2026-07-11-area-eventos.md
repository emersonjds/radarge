# Plano — Área de Eventos (SPA-16)

Spec: `docs/superpowers/specs/2026-07-11-area-eventos-design.md`
Branch: `feat/events-area`

## Tarefas

### T1 — Domínio: entidades `event` e `event-participation`
- `src/entities/event/{model,api,queries}.ts` — CRUD do evento (duplicata por aula+título+data barrada; cascata nas participações ao excluir).
- `src/entities/event-participation/{model,api,queries}.ts` — upsert de autorização/pagamento por (evento, aluno), espelhando `evaluation-grade`.
- `db.ts`: coleções `events` + `eventParticipations`, chave `radar.db.v10`.
- `seed.ts`: 2 eventos de demo (Zoológico — pago; Planetário — gratuito) com participações variadas.
- Testes: `event/api.test.ts` (duplicata, cascata), `event-participation/api.test.ts` (upsert idempotente).

### T2 — Derivações: resumo e aviso
- `src/features/events/summary.ts` — contagens + arrecadado/esperado.
- `src/features/events/notice.ts` — texto do aviso PT-BR + link `wa.me` (normalização de telefone BR).
- Testes unitários dos dois (incluindo evento gratuito, isento, telefone com/sem DDI).

### T3 — UI: rota, navegação e widget
- `src/app/(app)/events/page.tsx` + item **Eventos** em `shared/config/navigation.ts` (3 papéis) + ícone.
- `src/widgets/events/`: `Events.tsx` (lista por aula + seleção), `EventFormModal.tsx` (admin/coordenador), `EventDetail.tsx` (resumo + tabela de participação + WhatsApp).
- Escopo por papel via `visibleGroups`; professor não vê evento de aula alheia e não vê o botão de criar.

### T4 — Integração
- `src/features/events/participation.integration.test.tsx` — react-query + store: marcar autorização/pagamento reflete no resumo e persiste.
- `src/entities/event/event-crud.integration.test.ts` — criar → listar → excluir (cascata).

### T5 — E2E + evidências
- `e2e/events/events.spec.ts`: coordenador cria evento → professor autoriza/marca pago → resumo atualiza → escopo (professor não vê aula alheia) → mobile.
- Evidências PNG em `e2e/events/evidencias/`.

### T6 — Gate
- `pnpm type-check`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`, review do agent `bug`.

## Ordem
T1 → (T2 ‖ T3) → T4 → T5 → T6. T1 é bloqueante; T2 e T3 correm juntos.
