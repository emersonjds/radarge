# TailAdmin Base Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild every Radarge screen on top of the TailAdmin template (Tailwind 4 + its UI kit + sidebar/header shell), preserving all domain logic and PT-BR content.

**Architecture:** Hybrid — keep Radarge's `entities/features/shared-lib/queries` (localStorage front-only), replace the presentation layer (CSS Modules → Tailwind, custom shell → TailAdmin shell). Incremental on branch `feat/tailadmin-base`, `pnpm type-check` green after every task.

**Tech Stack:** Next 16 (App Router, static export), React 19, TypeScript, Tailwind CSS 4 (`@tailwindcss/postcss`), TanStack Query, Zod, ApexCharts, Playwright, Vitest, pnpm.

**Template source:** `~/Downloads/free-nextjs-admin-dashboard-main` (referred to as `$TPL`).

## Global Constraints

- Package manager: **pnpm** (`rtk proxy pnpm ...`). Generate `pnpm-lock.yaml`; never commit the template's `package-lock.json`.
- Static export stays: `next.config` keeps `output: "export"`. No server code.
- UI text: **PT-BR** in 100% of visible strings.
- **Light mode only** — do NOT bring `ThemeContext`; `<html>` has no `dark` class; strip the theme toggle from `AppHeader`.
- Preserve domain contracts: `entities/*/api.ts` + `queries.ts` signatures, `features/session`, `features/auth`, `features/analytics`, `shared/lib/storage` (`radarge.db.v4`).
- Roles `teacher | coordinator | admin`; nav & guards per role unchanged in behavior.
- Commits: micro, English imperative, author **Emerson Silva <emerson_jdss@hotmail.com>**, ZERO LLM traces (no `Co-Authored-By`, no 🤖, no AI mention). Never `git push`.
- Gate per phase: `pnpm type-check`, `pnpm lint`, `pnpm vitest run`, Playwright (affected specs), `pnpm build`.

---

## PHASE 0 — Foundation

### Task 0.1: Install Tailwind + template runtime deps (pnpm)

**Files:** Modify `package.json`, generate `pnpm-lock.yaml`.

- [ ] Add deps with pnpm (only what Radarge needs now — ApexCharts yes; skip fullcalendar/jvectormap/swiper/flatpickr/dnd/dropzone):
      `rtk proxy pnpm add tailwindcss@^4.1.17 @tailwindcss/postcss@^4.1.17 @tailwindcss/forms@^0.5.10 tailwind-merge@^2.6.0 apexcharts@^4.7.0 react-apexcharts@^1.8.0`
- [ ] `rtk proxy pnpm add -D postcss@^8.5.6 autoprefixer@^10.4.22` (autoprefixer only if a plugin needs it; `@tailwindcss/postcss` is the main one).
- [ ] Verify install: `rtk proxy pnpm ls tailwindcss` shows 4.x.
- [ ] Commit: `add tailwind and apexcharts dependencies`.

### Task 0.2: PostCSS config + Tailwind globals

**Files:** Create `postcss.config.js`; replace `src/app/globals.css`.

- [ ] Create `postcss.config.js`:

```js
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

- [ ] Copy `$TPL/src/app/globals.css` → `src/app/globals.css` **verbatim** (keeps the `@theme`, `@utility menu-*`, scrollbar, and third-party CSS blocks — inert if the lib is unused; do not trim, that would be rebuilding CSS).
- [ ] `rtk proxy pnpm type-check` (CSS doesn't affect TS; just confirm nothing else broke).
- [ ] Commit: `add postcss config and tailwind globals`.

### Task 0.3: Root layout — Outfit font, light-only, providers

**Files:** Modify `src/app/layout.tsx`, `src/app/globals.css` already done. Keep existing `src/app/providers.tsx` (React Query) — inspect it first.

- [ ] Read current `src/app/layout.tsx` and the providers it renders (React Query client). Preserve them.
- [ ] Rewrite `src/app/layout.tsx` to: import `Outfit` from `next/font/google`, import `./globals.css`, wrap children in existing React-Query provider **and** the new `SidebarProvider` (Task 0.4). `<html lang="pt-BR">`, `<body className={outfit.className}>` (NO `dark:` classes, NO ThemeProvider). Remove the old Inter font wiring and any CSS-module import.
- [ ] `rtk proxy pnpm type-check`.
- [ ] Commit: `switch root layout to outfit font and sidebar provider`.

### Task 0.4: Bring SidebarContext (no dark)

**Files:** Create `src/shared/context/SidebarContext.tsx`.

- [ ] Copy `$TPL/src/context/SidebarContext.tsx` verbatim to `src/shared/context/SidebarContext.tsx` (it has no dark-mode logic — safe).
- [ ] Update `src/app/layout.tsx` import to `@/shared/context/SidebarContext`.
- [ ] `rtk proxy pnpm type-check`.
- [ ] Commit: `add sidebar context`.

### Task 0.5: Bring icons + hooks

**Files:** Copy `$TPL/src/icons` → `src/shared/icons`; copy `$TPL/src/hooks/useModal.ts` → `src/shared/hooks/useModal.ts`.

- [ ] Copy the whole `src/icons` dir (SVGs + `index.ts`) to `src/shared/icons`. Confirm `next.config` + `@svgr/webpack` handles `?url`/SVG-as-component the same way the template's `next.config.ts` does — diff `$TPL/next.config.ts` against Radarge's `next.config` and port the SVGR webpack rule if missing.
- [ ] Copy `useModal.ts` to `src/shared/hooks/`.
- [ ] `rtk proxy pnpm type-check`.
- [ ] Commit: `add template icons and use-modal hook`.

### Task 0.6: Bring UI kit (Button, Badge, Table, Modal, Avatar, form controls, Alert, Dropdown)

**Files:** Copy from `$TPL/src/components/ui/*` and `$TPL/src/components/form/*` into `src/shared/ui/tailadmin/*` (namespaced to avoid clashing with the old primitives during migration). Fix internal import paths (`@/icons` → `@/shared/icons`, `@/hooks` → `@/shared/hooks`).

- [ ] Copy: `ui/button/Button.tsx`, `ui/badge/Badge.tsx`, `ui/table/index.tsx`, `ui/modal/index.tsx`, `ui/avatar/AvatarText.tsx` (initials — Radarge has no photos), `ui/dropdown/*`, `ui/alert/Alert.tsx`, `form/input/InputField.tsx`, `form/Label.tsx`, `form/select/Select.tsx` (or `form/Select.tsx`), `form/input/Checkbox.tsx`.
- [ ] Rewrite import paths inside copied files.
- [ ] `rtk proxy pnpm type-check` (unused for now is fine; just must compile).
- [ ] Commit: `add tailadmin ui kit`.

**Interfaces produced (memorize for later tasks):**

- `Button` (default export): `{ children, size?: "sm"|"md", variant?: "primary"|"outline", startIcon?, endIcon?, onClick?, disabled?, className? }`. No `danger` — for destructive use `variant="outline"` + `className="text-error-600 ring-error-200 hover:bg-error-50"`.
- `Badge`: `{ variant?: "light"|"solid", color?: "primary"|"success"|"error"|"warning"|"info"|"light"|"dark", size?, children }`.
- `Table, TableHeader, TableBody, TableRow, TableCell` (named). `TableCell` has `isHeader?`.
- `Modal`: `{ isOpen, onClose, className?, children, showCloseButton?, isFullscreen? }`.
- `InputField` (default `Input`): controlled-unfriendly (`defaultValue` only). **For controlled Radarge forms, use a plain `<input>` with these classes:** `h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden`.
- `Label`: `{ htmlFor?, children, className? }`.

### Task 0.7: App shell — AppSidebar/AppHeader/Backdrop with role-based nav

**Files:** Create `src/widgets/app-shell/AppSidebar.tsx`, `AppHeader.tsx`, `Backdrop.tsx`. Read current nav config `src/shared/config/navigation.ts` and current `AppShell` to preserve nav-by-role.

- [ ] Copy `$TPL/src/layout/{AppSidebar,AppHeader,Backdrop}.tsx` into `src/widgets/app-shell/`. Fix imports (`@/context` → `@/shared/context`, `@/icons` → `@/shared/icons`).
- [ ] **AppSidebar:** replace the template's hard-coded `navItems` with Radarge's role-based nav. Read `role` from `useSession()`; build items from `navTeacher`/`navCoordinator`/`navAdmin` (labels PT-BR: Painel, Alunos, Chamada, Relatórios, Perfis) mapping each `NavIcon` to a `@/shared/icons` component. Remove the template's submenu/"Others"/promo `SidebarWidget` sections. Brand: replace logo with a text "Radarge" wordmark.
- [ ] **AppHeader:** strip the theme toggle, search, notifications, and the user dropdown's template links; keep a simple right-side user block (name + role via `useSession()`) and a "Sair" (logout) action calling `session.logout()`. Keep the mobile hamburger (`toggleMobileSidebar`).
- [ ] `rtk proxy pnpm type-check`.
- [ ] Commit: `add app shell with role based navigation`.

### Task 0.8: `(app)` layout uses the new shell; delete old AppShell

**Files:** Modify `src/app/(app)/layout.tsx`. Later-delete `src/widgets/app-shell/AppShell.*` (old) once nothing imports it.

- [ ] Rewrite `src/app/(app)/layout.tsx` to the TailAdmin admin-layout pattern: `useSidebar()` → dynamic `mainContentMargin`, render `<AppSidebar/><Backdrop/>` + `<div><AppHeader/><div className="p-4 md:p-6 mx-auto max-w-(--breakpoint-2xl)">{children}</div></div>`. Keep the existing per-layout auth guard (redirect to `/login` when no session) — read the current layout to preserve it.
- [ ] `rtk proxy pnpm type-check` + `rtk proxy pnpm build` (must compile the whole app; screens still use old primitives — that's fine, they still exist).
- [ ] Commit: `render app routes inside tailadmin shell`.

**Phase 0 gate:** `pnpm type-check`, `pnpm build` green. App boots with the new shell; individual screens may look transitional but must render.

---

## PHASE 1 — Login

**Files:** `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx` and/or its widget. Test: `e2e/auth/auth.spec.ts`.

- [ ] Read current login widget + `features/auth/authenticate.ts` (`authenticate(username, password) → PublicProfile|null`) and `session.setSession(profileId)`. Preserve this flow exactly.
- [ ] Rebuild the login as a centered full-width card (Tailwind): title "Entrar", `Label`+plain controlled inputs (Usuário, Senha), submit `Button` "Entrar", error `Alert` "Usuário ou senha inválidos." Keep `getByLabel("Usuário")`, `getByLabel("Senha")`, button name "Entrar" so E2E selectors survive.
- [ ] `(auth)/layout.tsx`: simple full-width wrapper (no sidebar), light bg.
- [ ] Run `rtk proxy pnpm exec playwright test e2e/auth` — fix selectors as needed; regenerate PNG evidence.
- [ ] `pnpm type-check`, `pnpm lint`.
- [ ] Commit: `rebuild login on tailwind`.

---

## PHASE 2 — Alunos (list + CRUD)

**Files:** `src/widgets/student-list/StudentList.tsx` (rewrite), new `StudentFormModal.tsx`; delete `StudentList.module.css`, `StudentForm.tsx`, `StudentForm.module.css`. Test: `e2e/students/students.spec.ts`.

- [ ] Preserve hooks: `useStudents`, `useGroups`, `useAttendanceRecords`, `useCreateStudent`, `useUpdateStudent`, `useDeleteStudent`, `useSession`; derivations `attendanceRate`, `countAbsences`, `LIMITE_FALTAS_RISCO`; search `q` + `filtro=risco`.
- [ ] Rebuild header: title + subtitle, right side = search input (Tailwind) + `Button` "Adicionar aluno" (startIcon plus). Same-height alignment via matching `h-11`.
- [ ] Rebuild the table with `Table/TableRow/TableCell` (template). Columns per role (professor: no matrícula/ação). Situação → `Badge` (`error` risco / `success` regular). Ação → icon buttons (view→`/reports/id` link, edit→open modal, delete→confirm) using `@/shared/icons` inside small `hover:bg-gray-100 rounded-full` buttons.
- [ ] `StudentFormModal.tsx`: `Modal` (template) wrapping create/edit form (Nome, Turma `select`, Ativo checkbox on edit). Uses `useCreateStudent`/`useUpdateStudent`. Keep ids `#aluno-nome`/`#aluno-turma` for E2E.
- [ ] Update `e2e/students/students.spec.ts` if the add/edit now opens a Modal (assert modal heading, fill `#aluno-nome`, Salvar). Regenerate PNG evidence.
- [ ] `pnpm type-check`, `pnpm lint`, `pnpm vitest run` (student CRUD integration unaffected), Playwright students.
- [ ] Commit(s): `rebuild student list on tailwind`, `move student form into modal`.

---

## PHASE 3 — Chamada (take-attendance)

**Files:** `src/widgets/take-attendance/*` (rewrite to Tailwind), delete its `*.module.css`. Test: `e2e/take-attendance/take-attendance.spec.ts`.

- [ ] Preserve: session/roster hooks, P/A/F/J marking, per-`(turma,data)` uniqueness, save mutation. Read the current widget for exact hook names before touching UI.
- [ ] Rebuild mobile-first: turma/date selectors on top, roster as cards/rows with 4 status controls (P/A/F/J) styled with `brand`/`success`/`error`/`warning`, a save `Button`. Keep test-visible labels/roles.
- [ ] Update E2E + PNG evidence (`chamada-mobile.png`, painel screenshots).
- [ ] Gate + commit: `rebuild take attendance on tailwind`.

---

## PHASE 4 — Perfis (profiles admin)

**Files:** `src/widgets/profiles-admin/ProfilesAdmin.tsx` (rewrite), delete `.module.css`. Test: `e2e/auth/auth.spec.ts` (profile mgmt cases).

- [ ] Preserve: `useProfiles`, `useCreateProfile`, `useSetProfileActive`, `useDeleteProfile`, `roleLabels`, `roleSchema.options`, self-guard (`perfil.id === profileId`).
- [ ] Rebuild "Novo perfil" as a Tailwind form card (Nome, Login de usuário, Papel `select`, Senha) + `Button` "Criar perfil" (`size="sm"`). Error/success `Alert`.
- [ ] Rebuild "Perfis existentes" list: rows with name/meta, `Badge` Ativo/Inativo, icon actions (power = ativar/desativar, trash = excluir) using `@/shared/icons`. Keep button accessible names containing "Desativar"/"Ativar"/"Excluir" and "Criar perfil" for E2E.
- [ ] Update E2E labels if needed; regenerate PNG.
- [ ] Gate + commit: `rebuild profiles admin on tailwind`.

---

## PHASE 5 — Painel/Dashboard (ApexCharts)

**Files:** `src/widgets/*dashboard*` (admin + coordinator + professor home). Read current dashboards + the `draw charts on canvas` implementation to know the metrics. Delete canvas chart code + `.module.css`.

- [ ] Preserve analytics inputs (`features/analytics`): frequency, absenteeism trend, alunos em risco. Keep numbers identical.
- [ ] Rebuild StatCards (Tailwind cards) + charts with `react-apexcharts` (line for absenteísmo trend, bar/donut for frequência). Use `dynamic(() => import("react-apexcharts"), { ssr: false })` (static export + client-only).
- [ ] Update E2E painel screenshots (professor/coordenação/admin) + PNG evidence.
- [ ] Gate + commit: `rebuild dashboards with apexcharts`.

---

## PHASE 6 — Relatórios + StudentDetail

**Files:** `src/widgets/student-detail/StudentDetail.tsx`, reports list widget. Delete `.module.css`.

- [ ] Preserve `useStudent`, attendance/grade-free report data, the compact monthly calendar/school-events block (keep simple, no FullCalendar).
- [ ] Rebuild ficha: header (avatar-initials + name + turma, NO matrícula/ID per earlier decision), frequência/faltas cards, presence breakdown, events block — all Tailwind.
- [ ] Update E2E + PNG.
- [ ] Gate + commit: `rebuild student detail on tailwind`.

---

## PHASE 7 — Cleanup

**Files:** delete orphans across `src/shared/ui/*` (old CSS-module primitives), any remaining `*.module.css`, old `AppShell`, bottom-nav, unused icons, unused deps.

- [ ] `grep -rl "module.css" src` → ensure none remain referenced; delete files.
- [ ] Remove old `Icon.tsx`/`Button.tsx`/`Badge.tsx` (CSS-module versions) once nothing imports them; `rtk proxy pnpm ls` prune unused deps.
- [ ] Full gate: `pnpm type-check`, `pnpm lint`, `pnpm vitest run`, full Playwright, `pnpm build`.
- [ ] Commit: `remove legacy css modules and unused primitives`.

---

## Self-review notes

- **Spec coverage:** Phases map 1:1 to spec §4 screens; Phase 0 = spec §5 Fase 0; testing = spec §6; risks (light-only, deps pruned, no FullCalendar) enforced in Global Constraints + Task 0.3 + Task 0.1.
- **Controlled inputs:** template `InputField` is `defaultValue`-only; plan mandates plain `<input>` + documented Tailwind classes for controlled forms (Login/StudentForm/Profiles) — avoids fighting the component.
- **Avatar:** template `Avatar` needs an image `src`; Radarge has no photos → use `AvatarText` (initials) instead. Noted in Task 0.6 + Phase 6.
- **E2E survival:** each phase keeps accessible names/ids the specs rely on (`getByLabel("Usuário"/"Senha")`, button names, `#aluno-nome`); nav specs move from bottom-nav to sidebar in Phase 0/1.
