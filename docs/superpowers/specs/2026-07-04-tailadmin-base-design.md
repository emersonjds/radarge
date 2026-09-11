# Radarge sobre TailAdmin — Design

**Data:** 2026-07-04
**Branch:** `feat/tailadmin-base`
**Objetivo:** Adotar o template TailAdmin (`free-nextjs-admin-dashboard`, Tailwind 4, Next 16, React 19) como base de UI do Radarge, reescrevendo as telas existentes sobre os componentes do template, sem reconstruir CSS. Preservar toda a lógica de domínio.

## 1. Estratégia — híbrido "cérebro do Radarge + corpo do TailAdmin"

**Fica (domínio, intacto):**

- `entities/*` — model/api/queries (profile, student, group, attendance-session, attendance-record, school-event).
- `features/*` — auth, session (useSyncExternalStore), analytics (attendanceRate/countAbsences).
- `shared/lib/*` — storage (localStorage `radarge.db.v4`, seed), format, auth/password (SHA-256 demo).
- Providers React Query, navegação por papel, guards por papel, conteúdo PT-BR.

**Entra do template (passa a mandar na apresentação):**

- Tailwind 4 via `@import 'tailwindcss'` + bloco `@theme` no `globals.css`.
- Shell: `AppSidebar` + `AppHeader` + `Backdrop` + `SidebarContext`.
- Kit `ui`: Button, Badge, Avatar, Modal, Table, Dropdown, Alert, controles de formulário.
- Gráficos: ApexCharts (`react-apexcharts`).

**Sai:**

- CSS Modules (`*.module.css`) e tokens custom (`var(--color-*)`, `var(--space-*)`).
- `AppShell` atual, bottom-nav mobile, toggle de dark mode.

## 2. Decisões travadas com o usuário

| Tema                   | Decisão                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| Identidade visual      | **TailAdmin puro** — paleta/índigo e fonte Outfit do template, sem retematizar para o azul Radarge agora. |
| Navegação mobile       | **Sidebar responsiva do template** (off-canvas + backdrop no mobile). Remove a bottom-nav custom.         |
| Dark mode              | **Travar em claro (v1)** — remove o toggle; mantém só o tema claro.                                       |
| Gerenciador de pacotes | **npm** (gerar `package-lock.json`; ignorar o `package-lock.json` do template).                           |

## 3. Estrutura de arquivos (mantendo FSD)

- **Raiz:** `postcss.config.js` (`@tailwindcss/postcss`), deps Tailwind no `package.json`, `globals.css` com `@theme`.
- `src/shared/ui/` ← kit `ui` do TailAdmin (substitui os primitivos atuais Button/Badge/Avatar/Table/Icon…).
- `src/shared/icons/` ← ícones SVG do template (via `@svgr/webpack`, já presente).
- `src/shared/hooks/` ← `useModal` (e afins úteis).
- `src/shared/context/SidebarContext.tsx` ← do template (sem ThemeContext/dark).
- `src/widgets/app-shell/` ← `AppSidebar` + `AppHeader` + `Backdrop`, com os itens de menu vindos da config de navegação por papel do Radarge.
- `src/app/(app)/*` mantém as rotas atuais (Painel, Alunos, Chamada, Relatórios, Perfis) agora sob o shell do template; `src/app/(auth)/login` sem shell (full-width).
- Cada widget de tela reescrito com Tailwind + componentes do template, consumindo os mesmos hooks/queries de hoje.

## 4. Telas a portar (domínio preservado, UI nova)

1. **Login** — form usuário+senha (full-width), autentica via `features/auth`.
2. **Painel/Dashboard** (admin/coordenador) — StatCards + gráficos ApexCharts (frequência, absenteísmo, alunos em risco) a partir de `features/analytics`.
3. **Alunos** — tabela do template + busca + CRUD (Adicionar/Editar em Modal, Excluir com confirmação, Ver relatório).
4. **Chamada** (professor) — cards mobile-first, marcação P/A/F/J, única por (turma, data).
5. **Perfis** (admin) — form (Nome, Login, Papel, Senha) + lista com ações em ícone (ativar/desativar, excluir).
6. **Relatórios** + **StudentDetail** — ficha de desempenho/presença do aluno.

Guards por papel e navegação por papel inalterados em comportamento; só re-renderizados no shell novo. Professor: Chamada + Alunos. Coordenador: Painel + Alunos + Relatórios. Admin: + Perfis.

## 5. Execução

- **Fase 0 — Fundação:** instalar deps do template com npm; `postcss.config.js`; `globals.css` (`@theme`); trazer `SidebarContext`, `icons`, `hooks`, kit `ui`, shell (`AppSidebar`/`AppHeader`/`Backdrop`); wire providers; layout `(app)` usando o shell; nav por papel no sidebar; **login rodando**. Remover CSS Modules/tokens antigos conforme cada consumidor migra.
- **Fases 1..N — uma por tela** (ordem: Login → Alunos → Chamada → Perfis → Painel/Dashboard → Relatórios/StudentDetail), mantendo `npm run type-check` verde a cada passo.
- **Limpeza final:** remover `AppShell`, bottom-nav, tokens e `*.module.css` órfãos; remover deps não usadas.

## 6. Testes

- **Unit/integração de domínio** (vitest + MSW/store) continuam valendo — não tocam UI.
- **E2E (Playwright)** mudam: some a bottom-nav ("Navegação inferior"); seletores de navegação passam a mirar a sidebar. Atualizar specs + **evidências PNG** por fase (login, alunos CRUD, chamada, perfis, guards por papel).
- Gate por fase: `npm run type-check`, `npm run lint`, `npx vitest run`, Playwright, `npm run build`.

## 7. Riscos e mitigações

- **Fonte/paleta mudam** (Outfit/índigo em vez de Inter/azul) — aceito (TailAdmin puro); retematização de marca fica como trabalho futuro opcional.
- **Deps pesadas do template** (FullCalendar, jvectormap, swiper, flatpickr, react-dnd, dropzone) — instalar **apenas o necessário** (ApexCharts sim; o resto só se uma tela do Radarge usar). O calendário de eventos escolares atual permanece na sua forma simples, sem FullCalendar nesta fase.
- **Migração grande** — feita incremental na branch, com type-check verde a cada tela, para nunca deixar a base quebrada.

## 8. Fora de escopo (nesta migração)

- Retematizar para a marca azul do Radarge.
- Backend Supabase (segue front-only com localStorage).
- FullCalendar, mapas jvectormap, dropzone, drag-and-drop — só se uma tela exigir.
- Dark mode.
