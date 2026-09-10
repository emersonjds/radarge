# Screen audit: Radarge against the TailAdmin template

Branch audited: `feature/spa-284-real-session`. Nothing under `src/` was modified.

## Purpose and boundaries

This is an **audit**, not a style guide. `docs/specs/design-language.md` is already the normative
visual language and it decides typography, spacing, color, containers, tables, touch targets and
truncation. This document does three things that one does not:

1. **Quantifies the drift** between our `@theme` and the template's, token by token.
2. **Maps every primitive and widget** to the template component that already solves it, with a
   verdict of adopt / adapt / ours-is-better.
3. **Records the E2E selectors** each screen pins into the DOM, so a redesign can be shipped
   without a red suite.

Where this document and `design-language.md` disagree, `design-language.md` wins. Two such
conflicts exist and are called out explicitly in §1.4.

Reference paths written as `template/<path>` resolve under
`/Users/emerson/Documents/workspace/personal-projects/free-nextjs-admin-dashboard-main/src/`.

---

## 1. Foundation

### 1.1 What CLAUDE.md claims versus what is loaded

| Thing | CLAUDE.md §2 says | Actually in the code | Where |
|---|---|---|---|
| Font | Outfit via `next/font` | **Inter** via `next/font/google` | `src/app/layout.tsx:2,7,19` |
| Font token | `--font-outfit` | `--font-sans: Inter, sans-serif` | `src/app/globals.css:8` |
| Radius | `0.5rem` | **`0.625rem`** | `src/app/globals.css:165` |
| Type scale | one scale | **two scales coexist** | `globals.css:20-35` plus plain Tailwind sizes everywhere |

Three consequences that are bugs today, not preferences:

- **The charts ask for a font nobody loads.** `AttendanceBarChart.tsx:14` and
  `TrendLineChart.tsx:15` both pass `fontFamily: "Outfit, sans-serif"` to ApexCharts. Outfit is not
  loaded anywhere in the app, so the two dashboard charts render their axis and legend text in the
  browser's generic sans while every surrounding card renders Inter. Visible in
  `e2e/dashboard/evidence/admin-dashboard.png`: the axis labels do not match the card titles.
- **`font-sans` and the body class fight each other.** `<body>` carries `inter.className` (a
  `next/font` generated family) *and* `globals.css:228` applies `font-sans`, which resolves to the
  literal family name `Inter`. Any descendant that uses the `font-sans` utility gets a different
  resolution path than the body. One source of truth is needed, not two.
- **The template's whole scale is dead code.** Grepping `src/` for `shadow-theme-*`,
  `text-theme-*`, `text-title-*`, `font-outfit`, `no-scrollbar` and `custom-scrollbar` returns
  **zero hits outside `globals.css` itself**. Meanwhile `shadow-sm`/`shadow-xs` appears 30 times
  across 21 files.

### 1.2 Token diff against the template

Compared `template/app/globals.css` against `src/app/globals.css` in full.

**Byte-identical, nothing dropped:** every color ramp (`brand`, `gray`, `blue-light`, `orange`,
`success`, `error`, `warning`, `theme-pink-500`, `theme-purple-500`), every `--shadow-theme-*`,
`--drop-shadow-4xl`, every `--text-title-*` and `--text-theme-*`, every `--breakpoint-*`, every
`--z-index-*`.

**This is the headline finding: we did not drop the design tokens. We stopped using them.** The
flatness is not a missing shadow scale — `--shadow-theme-sm` and Tailwind's `shadow-sm` are within
a rounding error of each other. It is the four deltas below plus the missing card *content*
described in §3.1.

| Token / rule | Template | Ours | Effect |
|---|---|---|---|
| `--font-*` | `--font-outfit: Outfit, sans-serif` | `--font-sans: Inter, sans-serif` | Different family; charts still request Outfit |
| `body` background | `bg-gray-50` | `bg-background` (white) | Auth routes (`/login`, `/change-password`) sit on white with no canvas. The app shell overrides with `bg-muted`, so only the auth pages are affected |
| `--radius` | *not defined*; Tailwind defaults | `0.625rem` + a `@theme inline` ramp | See table below |
| `@utility no-scrollbar`, `custom-scrollbar` | present | **absent** | Any template markup we lift that uses them silently loses its scrollbar treatment |
| `@utility menu-item-icon`, `menu-item-arrow*`, `menu-dropdown-item*`, `menu-dropdown-badge*` | present | **absent** | No submenu or nav-badge support in the sidebar |
| `menu-item-active` | `bg-brand-50 text-brand-500` | `bg-accent text-accent-foreground` | Same background (`--accent` aliases `brand-50`), text one step darker (`brand-600` vs `brand-500`) |
| default border color | `var(--color-gray-200)` | `var(--border)` | Same value through the alias. No drift |

Radius, resolved:

| Utility | Template (Tailwind default) | Ours | Delta |
|---|---|---|---|
| `rounded-md` | 6px | 8px | +2 |
| `rounded-lg` | 8px | 10px | +2 |
| `rounded-xl` | 12px | **14px** | +2 |
| `rounded-2xl` | 16px | 16px | none — `--radius-2xl` is not overridden |
| `rounded-3xl` | 24px | 24px | none |

The `@theme inline` block overrides `sm`/`md`/`lg`/`xl` only, so our scale runs 6-8-10-14-16 and
jumps only 2px between `xl` and `2xl` while the template's runs 6-8-12-16-24. That
discontinuity is why mixing `rounded-xl` and `rounded-2xl` in the same view reads as an accident.

**One more hole:** `@theme` resets `--font-*` and `--breakpoint-*` with `: initial` but **not
`--color-*`**. Tailwind's entire default palette is therefore live alongside our ramps, and
`avatar-text.tsx:17-26` uses five colors from it (`pink-100`, `cyan-100`, `green-100`,
`purple-100`, `yellow-100`) that exist in no design token. CLAUDE.md §4 forbids exactly this.

### 1.3 The foundation to build on

Adopt `design-language.md` verbatim. It already resolves the drift in §1.1:

- **Font: Outfit** via `next/font`, exposed as `--font-outfit`. Fix `layout.tsx` and
  `globals.css:8` together, and drop the hardcoded `"Outfit, sans-serif"` from the two chart
  components in favour of the token — today they are right about the family and wrong about it
  being available.
- **Radius: `0.5rem`.** Card `rounded-xl`, tile/field/large button `rounded-lg`, default button
  `rounded-md`, badge/avatar `rounded-full`.
- **One type scale: Tailwind's default.** `--text-theme-*` and `--text-title-*` are deprecated;
  delete them as each screen is touched.
- **Card anatomy:** `rounded-xl border border-border bg-card p-4 shadow-sm md:p-5`.
- **Grid gutters:** `gap-4 md:gap-6` between cards; page padding `px-4 md:px-6`.
- **Breakpoints:** 375 / 768 / 1280, with 768px as the table-to-card-list break.
- **Colors:** only `@theme` tokens. Add the missing avatar palette from `brand`, `blue-light`,
  `orange`, `success`, `error`, `warning`, `theme-pink-500`, `theme-purple-500` — eight tones
  exist in the design system already, so `avatar-text.tsx` needs no new color, only correct ones.

### 1.4 Where the brief and `design-language.md` conflict

Stated so an implementer does not have to guess:

1. **The brief asks to restore the template's `text-theme-*` / `text-title-*` scale.
   `design-language.md` §Prerequisites deprecates it.** Follow `design-language.md`. The template
   scale gives KPI numbers 30px (`text-title-sm`) where our language gives 30px
   (`text-3xl`) — the same pixel value from a token we actually use. There is nothing to gain by
   reviving a parallel scale.
2. **The brief treats the shadow scale as dropped. It is not dropped, it is unused, and
   `design-language.md` §6 rules that `shadow-sm` on cards only is the answer.** Keep
   `shadow-sm`. Do not introduce `shadow-theme-*` on cards. `shadow-theme-xs` on form controls is
   the one place the template's token adds something we lack (§2.2), and it is optional.

---

## 2. Component inventory

Verdict legend: **adopt** = take the template's classes as-is; **adapt** = take its layout and
proportions, keep our implementation; **ours** = we already have something better, do not replace.

### 2.1 The thirteen primitives in `src/shared/ui/`

| Ours | Template equivalent | Verdict | What changes |
|---|---|---|---|
| `button.tsx` | `template/components/ui/button/Button.tsx` | **ours** | Template has *no* `focus-visible` ring at all — it fails WCAG 2.2 AA. Keep our `cva`. Take only the sizing: template's `md` is `px-5 py-3.5` (≈44px). Add a responsive default so `size="default"` is `h-11 md:h-9`, which removes the `className="h-11"` patch repeated in `StudentList.tsx:137`, `ReportsCenter.tsx:179` and `ProfilesAdmin.tsx:102,116,158`. Optionally add `shadow-theme-xs` to the primary variant. |
| `input.tsx` | `template/components/form/input/InputField.tsx` | **adapt** | Template is `h-11 rounded-lg px-4 py-2.5 shadow-theme-xs` — correct 44px target. Ours is `h-9 px-3 py-1`, a 36px target. But template is `text-sm` (14px) which **zooms on iOS**; ours is `text-base md:text-sm`, which is right. Synthesis: `h-11 md:h-9`, `rounded-lg`, `px-4 py-2.5`, keep `text-base md:text-sm`, keep our `focus-visible` ring and `aria-invalid` handling. Template's `hint` slot is already covered by `form.tsx`. |
| `select.tsx` (Radix) | `template/components/form/Select.tsx` (native) | **ours** | Radix gives keyboard and ARIA semantics the native wrapper does not. Take only `h-11 ... md:h-9` on `SelectTrigger` (today `data-[size=default]:h-9`) and `rounded-lg`. Note the native `<select>` is still used raw in `AttendanceForm.tsx:115`, `ReportsCenter.tsx:150,166` and `EventDetail` — those are pinned by `getByLabel(...).selectOption(...)` in four specs and **must stay native `<select>`**. |
| `label.tsx` | `template/components/form/Label.tsx` | **ours** | Both are `text-sm font-medium`. Template adds `mb-1.5`; ours leaves spacing to the parent, which is the better call under `design-language.md` §2. No change. |
| `dialog.tsx` (Radix) | `template/components/ui/modal/index.tsx` | **ours (adapt visuals)** | Template's modal has no focus trap, no `role="dialog"`, no `aria-modal`, and restores `body.overflow` imperatively. Radix wins outright. Adopt its *look*: content `rounded-3xl p-4 lg:p-11`, and above all its close button — `h-9.5 w-9.5 sm:h-11 sm:w-11 rounded-full bg-gray-100` — because our `DialogContent` close is a bare `size-4` icon at `top-4 right-4`, well under 44px. |
| `table.tsx` | `template/components/tables/BasicTableOne.tsx` | **adapt** | Template cells are `px-5 py-4` / `px-4 py-3` with `text-theme-sm`; ours default to `p-2`, which is why every consumer overrides with a local `th`/`td` string. Move the padding into the primitive per `design-language.md` §7 (`px-4 py-3`), and **drop `whitespace-nowrap` from `TableCell`** — it is a root cause of the horizontal overflow in §3.4. |
| `badge.tsx` | `template/components/ui/badge/Badge.tsx` | **ours** | Ours has 8 variants and a focus ring; template has `light`/`solid` × 7 colors. Ours is missing `warning` and `info` tones, which `EventDetail` hand-rolls today. Add `warning` (`bg-warning-50 text-warning-700`) and `info` (`bg-blue-light-50 text-blue-light-700`) following the existing `-50`/`-700` recipe. |
| `avatar-text.tsx` | `template/components/ui/avatar/Avatar.tsx` | **ours** | Template's is image-only; we have no avatar images, so initials are correct. Fix only the five off-palette colors (§1.2). Add the `size` prop pattern from the template (`h-8`/`h-10`/`h-12`) so tables can use a smaller avatar than the page header. |
| `icon-button.tsx` | none | **ours** | `size-11 sm:size-9` is the mobile-first pattern the rest of the codebase should copy. Nothing to take. Enforce its use: `StudentsReportTable.tsx:91` hand-rolls an `h-9 w-9` button instead. |
| `tabs.tsx` (Radix) | none in template | **ours** | No template equivalent. Keep. |
| `checkbox.tsx` (Radix) | `template/components/form/input/Checkbox.tsx` | **ours** | Radix semantics beat the template's `taskCheckbox` CSS trick. |
| `textarea.tsx` | `template/components/form/input/TextArea.tsx` | **adapt** | Same `h-11`-equivalent padding and `rounded-lg` treatment as `input.tsx`. |
| `form.tsx` (RHF) | `template/components/form/Form.tsx` | **ours** | Template's is a bare `<form>` wrapper. Ours is the RHF+zod integration the project standardised on. Keep. |

### 2.2 Components the template ships that we do not have

Every one of these is currently hand-written inline somewhere in `src/`.

| Template component | What we do instead | Verdict |
|---|---|---|
| `common/ComponentCard.tsx` | The string `rounded-xl border bg-card ... shadow-sm` is repeated **23 times across 14 files** | **adapt into `src/shared/ui/card.tsx`.** `design-language.md` already schedules `pnpm dlx shadcn@latest add card`. Take the template's header/body split (`px-6 py-5` header, `border-t` divider, `p-4 sm:p-6` body) but our padding scale (`p-4 md:p-5`) and our radius (`rounded-xl`). This single component is the highest-leverage change in the audit. |
| `tables/Pagination.tsx` | **nothing** — no pagination exists anywhere in `src/` | **adapt.** `design-language.md` §7 mandates 20-row pagination. Template's version is a plain component with `h-10` buttons and no `aria-current`; prefer `shadcn add pagination` and use the template only for the `Mostrando 1–20 de 84` placement. |
| `common/PageBreadCrumb.tsx` | `widgets/app-shell/AppBreadcrumb.tsx` | **adapt.** Template couples the `h2` page title and the trail in one flex row (`justify-between gap-3 mb-6`). Ours renders the trail alone and every widget then renders its own `h1` below it, which is why the reports student record shows *two* stacked back-affordances (§3.2). Merging title and trail fixes that structurally. |
| `ui/alert/Alert.tsx` | `<p role="alert" className="text-sm text-destructive">` in 5 widgets | **adapt.** Four variants on the `-500` border / `-50` background recipe, matching our `Badge`. |
| `ui/dropdown/Dropdown.tsx` + `DropdownItem.tsx` | Header logout is a bare `<button>`; `AppHeader` has no user menu | **adopt the pattern, implement with Radix.** Needs the `menu-dropdown-*` utilities from §1.2 restored to `globals.css`. Low priority — no screen demands it yet. |
| `ecommerce/EcommerceMetrics.tsx` | `AdminPanel.tsx:46-56` `StatCard` | **adapt.** See §3.1. |
| `ecommerce/MonthlyTarget.tsx` | nothing | **skip.** A radial gauge for a single percentage is decoration; `dataviz` and `design-language.md` both argue against it. |
| `user-profile/UserInfoCard.tsx` | `StudentDetail.tsx:194-213` | **adopt the grid, verbatim.** See §3.2. |
| `layout/AppSidebar.tsx` | `widgets/app-shell/AppSidebar.tsx` | **ours.** The 290/90px collapse already matches and is pinned by E2E. |
| `layout/AppHeader.tsx` | `widgets/app-shell/AppHeader.tsx` | **ours.** Template's header carries a search box and theme toggle we do not want. |

---

## 3. Per-screen findings

### 3.1 Admin dashboard — `/` (admin)

- **Today:** `e2e/dashboard/evidence/admin-dashboard.png`; `src/widgets/admin-panel/AdminPanel.tsx`.
  Three KPI cards, a bar chart 2/3 + alerts 1/3, a line chart 2/3 + tasks 1/3.

- **What is wrong:**
  1. **The alerts card stretches to the chart's height with one sentence in it.** `grid ... lg:grid-cols-3` makes both children equal-height; "Sem dados ainda." occupies ~340px of empty card. `design-language.md` §5 forbids exactly this ("an empty state never grows to match a sibling's height").
  2. **`MOCK_TOTAL_TEACHERS = 148`** (`AdminPanel.tsx:24`). When fewer than two teacher profiles exist the KPI prints a fabricated 148. CLAUDE.md §6 says the screen never invents a number. This is a correctness defect wearing a UI costume.
  3. **`ADMIN_TASKS`** (`AdminPanel.tsx:33-38`) is four hardcoded Portuguese strings left over from the template demo. "Tarefas administrativas" is not a feature; it is fiction rendered as data.
  4. **The KPI card is half-empty.** Template's `EcommerceMetrics` pairs an icon tile with a delta `Badge` on the value row. Ours has the icon and no delta, so the right half of every KPI card is blank.
  5. **Bar chart labels collide.** `AdminPanel.tsx:101` slices group names at `—`, so two different groups both render as "E2E Detalhe". Visible in the PNG.
  6. Cards are `p-4` with no `md:p-5`; the template is `p-5 md:p-6`.

- **Fix:** card shell from `template/components/common/ComponentCard.tsx`
  (`rounded-2xl border border-gray-200 bg-white`, header `px-6 py-5`, body `border-t`), rescaled to
  our tokens as `rounded-xl border border-border bg-card p-4 shadow-sm md:p-5`. KPI card from
  `template/components/ecommerce/EcommerceMetrics.tsx`: adopt
  `flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl` for the icon tile and
  `flex items-end justify-between mt-5` for the value row, with our `Badge` in the delta slot —
  or, if no delta is available from the API, drop the `justify-between` and let the value own the
  row rather than shipping a permanent void. Alerts and tasks move to `items-start` so neither
  stretches. Delete the mock teacher count and the fake task list.

- **375px:** `grid-cols-1` already stacks correctly. With the tasks card gone the page loses ~300px
  of scroll. Keep the KPI row `grid-cols-1 sm:grid-cols-3` — three 24px numbers side by side at
  375px would each get 105px.

- **Must not change:** `page.locator(".apexcharts-canvas")` must resolve to **exactly 2** elements
  (`e2e/dashboard/dashboard.spec.ts:15`), and at least 1 on the coordinator view (line 27).
  Removing the tasks card is safe; removing a chart is not.

### 3.2 Student record — `/students?aluno=` and `/reports?studentId=`

- **Today:** `e2e/reports/evidence/student-record.png` (1280px),
  `e2e/student-detail/evidence/mobile-student-detail.png` (375px);
  `src/widgets/student-detail/StudentDetail.tsx`.

- **What is wrong, measured:**
  1. **`StudentDetail.tsx:194` is `<dl className="grid grid-cols-3 gap-3 text-sm">` with no
     breakpoint prefix.** Three columns at 375px *and* at 1280px, inside a `lg:col-span-1` column
     ~296px wide. At 1280px "Mãe de Ferreira" wraps to two lines and `(11) 93333-0001` breaks
     after the hyphen. At 375px it is worse: "Responsável do Aluno Detalhe Um" wraps to **three**
     lines and the phone still breaks mid-number. A broken phone number cannot be dialled or
     copied — and it is a `tel:` link, so this is the one field on the screen with a job to do.
  2. **Two `text-2xl font-bold` tiles showing `—`** (`StudentDetail.tsx:215-224`). ~86px tall each
     to display nothing. `design-language.md` catalogues this as defect 2 and defect 4.
  3. **The tiles are `bg-muted` with no border** on `bg-card` — 1.08:1, no visible boundary.
  4. **Two stacked back-affordances.** `AppBreadcrumb` renders `Início › Relatórios`, then
     `StudentDetail` renders its own `← Relatórios` link immediately below. On the reports route
     the breadcrumb's last crumb reads "Relatórios" while the page is a student record — the
     mismatch the brief describes.
  5. **~250px of unused whitespace** below the left card at 1280px while the right column ends
     at y≈470.
  6. `"AULAS"` uppercase (`:227`) and `"ATIVO"` uppercase (`:181`) both violate
     `design-language.md` §1 (uppercase is `<th>`-only).

- **Fix — `template/components/user-profile/UserInfoCard.tsx`, adopted directly.** Its grid is
  `grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7`, each pair being
  `<p className="mb-2 text-xs leading-normal text-gray-500">` above
  `<p className="text-sm font-medium text-gray-800">`, in a full-width
  `p-5 border border-gray-200 rounded-2xl lg:p-6` card. Two adaptations for us: the identity block
  becomes **full width above** the tabs instead of living in the narrow left column, and per
  `design-language.md` §6 the pairs stack (`flex flex-col gap-3`) rather than going to two columns,
  since we have three fields and the guardian name is the long one. Phone gets
  `whitespace-nowrap tabular-nums`. The `—` tiles become the `EmptyValue` treatment from
  `design-language.md` §4 — and where the tile's *only* content is the absence, it shows the reason
  ("Sem chamadas registradas") instead of a 24px em dash.

- **375px:** identity pairs stacked full-width, no wrap on any of the three. Tabs stay
  `grid-cols-2` full width. Header `h1` drops from `text-2xl` to `text-xl` per the language's
  page-title row.

- **Must not change:**
  - `getByRole("heading", { name: <student name> })` — the name stays an `h1`/`h2`.
  - `page.locator('a[href^="tel:"]')` must exist for an in-scope student and have **count 0** for
    an out-of-scope one (`student-detail.spec.ts:83,100`).
  - `getByText("Responsável do Aluno Detalhe Um")` must be a single text node — do not split the
    guardian name across elements.
  - `getByRole("tab", { name: "Presença" })` / `{ name: "Notas" }`, and the headings
    `"Resumo de presença"` / `"Desempenho acadêmico"` swapping with them.
  - `getByText("Aluno não encontrado.")`, `getByRole("link", { name: "Voltar para Relatórios" })`
    and `{ name: "Voltar para Alunos" }`.
  - **`student-detail.spec.ts:113`: `expect(page.getByText("—", { exact: true })).toHaveCount(2)`.**
    This test pins the two empty tiles the redesign is meant to remove. **This assertion must be
    rewritten in the same commit** — it is the only selector in the suite that actively defends a
    defect. Replace with an assertion on the reason text.

### 3.3 Roll call — `/attendance` (teacher, mobile-first)

- **Today:** `e2e/take-attendance/evidence/roll-call-mobile.png` (375px);
  `src/features/take-attendance/AttendanceForm.tsx`, `StudentRow.tsx`.

- **What is wrong, measured:**
  1. **`Aluno Ch...` — the name is truncated to ~69px.** The arithmetic:
     375 − 32 (page `p-4`) = 343 card; − 32 (`px-4`) = 311; − 178 (four `h-10 w-10` buttons +
     3 × `gap-1.5`) = 133; − 40 (avatar) − 12 (`gap-3`) = **81px for the student's name**, which
     `truncate` (`StudentRow.tsx:38`) then cuts. During roll call the name is the only thing that
     makes the row mean anything.
  2. **Status buttons are 40×40px** (`StudentRow.tsx:55`), under the 44px minimum, and separated by
     `gap-1.5` = 6px, under the 8px minimum. A mis-tap here records an absence against the wrong
     child.
  3. **The date has no label and no field.** `formatDateLong(TODAY)` renders as a `<p>` with a
     calendar glyph, floating under the group `<select>` (`AttendanceForm.tsx:128-131`). It reads
     as decoration, and a teacher cannot tell whether it is editable.
  4. **The search input is `text-sm`** (`AttendanceForm.tsx:139`) — 14px, so **iOS zooms the page
     on focus** and the teacher loses their place. Note `ReportsCenter.tsx:29` gets this right with
     `text-base ... sm:text-sm`; the two files disagree.
  5. **`Marcar todos como presente` is `size="sm"` = 32px tall.** This is the button that makes the
     screen fast — CLAUDE.md's "todos presente por padrão, exceção manual" — and it is the smallest
     target on the page.
  6. **The placeholder promises a field that does not exist**: "Buscar aluno por nome ou
     matrícula..." — CLAUDE.md §10 states students have no matrícula.
  7. **Vocabulary collision.** The counter tiles read `Presente / Atrasado / Ausente / Justificado`
     while the buttons read `P / A / F / J`. `A` is `Atrasado` but sits next to a tile labelled
     `Ausente`. There is no legend.
  8. `TODAY` is computed once at module scope (`AttendanceForm.tsx:21`). A tab left open overnight
     saves the roll call against yesterday.

- **Fix:** `design-language.md` §9 already specifies the row — name on its own full-width line in
  `line-clamp-2 break-words`, four buttons below in `grid grid-cols-4 gap-2`, each 79 × 44px.
  Adopt that. Reuse `template/components/form/input/InputField.tsx` proportions for the search
  (`h-11 rounded-lg px-4 py-2.5`) with `text-base md:text-sm`. The date becomes a labelled field
  (`text-xs font-medium text-muted-foreground` label + bordered control), per `design-language.md`
  §8. Promote `Marcar todos como presente` to full width `h-11`. `Salvar chamada` goes into the
  sticky footer the language prescribes.

- **375px:** this *is* the 375px design. Everything above is the mobile spec; desktop
  (`roll-call-desktop.png`) can keep the inline row from `md:` up.

- **Must not change:**
  - `page.locator('[aria-label^="Status de presença de"]')` — the row group keeps that exact
    `aria-label` prefix, and the spec parses the student name out of it
    (`take-attendance.spec.ts:31,36`).
  - `getByRole("button", { name: "Ausente" })` with `aria-pressed` toggling to `"true"` — the
    four buttons keep their full Portuguese `aria-label`s, not the letters.
  - `getByLabel("Selecionar aula")` on a native `<select>` (also used by
    `academic-structure.spec.ts:56,74` and `pivot.spec.ts:50` with `.selectOption()`).
  - `getByPlaceholder("Buscar aluno por nome ou matrícula...")` — **fixing the misleading copy
    changes this selector in three places in `take-attendance.spec.ts` (29, 41, 44).** Update
    together.
  - `page.locator("aside")` at x < 0 closed, x = 0 open; width 290 expanded, 90 collapsed.
  - `page.locator("div.fixed.inset-0.z-40")` — the `Backdrop` keeps exactly those three classes.
  - `semOverflowHorizontal`: `document.scrollWidth - clientWidth <= 0` at 375px.

### 3.4 Student list — `/students`

- **Today:** `e2e/students/evidence/student-created.png` (element capture);
  `src/widgets/student-list/StudentList.tsx`.

- **What is wrong:**
  1. **No pagination.** Every student renders. `design-language.md` measured 2194px for 21 rows.
  2. **Eight columns** for admin (`columnCount = 8`, `StudentList.tsx:111`) against the language's
     seven-column ceiling.
  3. **Horizontal overflow, proven by the test that works around it.**
     `students.spec.ts:34-38` walks up the `<table>`'s ancestors setting `scrollLeft = 0` because
     the action column is otherwise off-screen. The comment in the spec says so outright. Root
     cause: `TableCell` carries `whitespace-nowrap` (`table.tsx:74`) and the `Aulas` column joins
     every group name into one string (`StudentList.tsx:104`).
  4. **The `th`/`td` class strings are duplicated verbatim** in `StudentList.tsx:25-26` and
     `StudentsReportTable.tsx:23-24`.
  5. Search input is `text-sm` at `h-11` — same iOS zoom bug as §3.3.
  6. At <768px the table just scrolls sideways; there is no card list.

- **Fix:** `template/components/tables/BasicTableOne.tsx` for the shell
  (`overflow-hidden rounded-xl border border-gray-200 bg-white`, header row
  `border-b border-gray-100`, body `divide-y divide-gray-100`) with our padding moved into
  `table.tsx` itself so the local `th`/`td` constants disappear. `template/components/tables/Pagination.tsx`
  for placement, `shadcn add pagination` for the component. Drop `whitespace-nowrap` from
  `TableCell`; `Aulas` becomes `truncate` with a `title`, per `design-language.md` §9.

- **375px:** table → card list at 768px per `design-language.md` §7. Search and
  `Adicionar aluno` stack full-width `h-11`.

- **Must not change:**
  - `getByRole("row").filter({ hasText: name })` and `getByRole("table")` — at desktop widths the
    `<table>` element stays. The 768px card-list swap is safe because `students.spec.ts` runs at
    the default (desktop) viewport.
  - `getByRole("link", { name: "Ver detalhes de <name>" })`, `{ name: "Editar <name>" }`,
    `{ name: "Excluir <name>" }` — the `IconButton` `aria-label`s.
  - `getByRole("heading", { name: "Meus alunos" })` (teacher) and `{ name: "Alunos" }` (admin).
  - Form modal: `getByLabel("Nome", { exact: true })`, `"Data de nascimento"`,
    `"Nome do responsável"`, `"Telefone do responsável"`;
    `getByRole("heading", { name: "Adicionar aluno" })` / `{ name: "Editar aluno" }`.
  - **`students.spec.ts:36-38` (the `scrollLeft = 0` walk) should be deleted** once overflow is
    gone. Leaving it is harmless but it documents a bug that no longer exists.

### 3.5 Reports — `/reports`

- **Today:** `e2e/reports/evidence/reports-overview.png`;
  `src/widgets/reports/ReportsCenter.tsx`, `ClassOverview.tsx`, `StudentsReportTable.tsx`.

- **What is wrong:**
  1. **The `Período` select does nothing.** `term` is set at `ReportsCenter.tsx:39` and read by no
     query, no filter, no export. A control that lies about filtering is worse than no control.
  2. **`ClassOverview` stat tiles are `bg-muted` with no border** (`ClassOverview.tsx:19,48,54`) —
     the same 1.08:1 non-container as §3.2.
  3. **Mixed value sizes in one comparable row**: `text-2xl` for two tiles, `text-lg` for
     "Área forte", and a `<p>` full of `Badge`es for the fourth. Four tiles side by side with three
     different typographic weights read as three unrelated things.
  4. **`StudentsReportTable.tsx:91` hand-rolls an `h-9 w-9` action button** instead of using
     `IconButton` (`size-11 sm:size-9`) — 36px on mobile.
  5. No pagination (same as §3.4).
  6. Breadcrumb mismatch on the student-record branch (covered in §3.2).

- **Fix:** delete the `Período` select until a term filter exists on the API. Tiles get
  `rounded-lg border border-border bg-gray-50 p-3` per `design-language.md` §6 and one value step
  (`text-xl font-semibold tabular-nums`) across all four. Card shell from `ComponentCard`.
  Replace the hand-rolled button with `IconButton`.

- **375px:** `grid-cols-2` tiles are correct at 375px; go to `lg:grid-cols-4`. Filter row stacks.

- **Must not change:**
  - **`page.locator("section").filter({ hasText: "Panorama — Todas as aulas" })`
    (`reports.spec.ts:19`) — `ClassOverview`'s root must stay a `<section>` element.** If it is
    wrapped in the new `Card`, the `<section>` has to be the card's own tag.
  - `getByRole("heading", { name: "Panorama — <scope>" })`.
  - The texts `"Nota média"`, `"Área forte"`, `"Média por área"` inside that section.
  - `getByLabel("Selecionar aula")` on a native `<select>` with `.selectOption({ label })`.
  - `getByRole("button", { name: "Exportar CSV" })` and the download it triggers.
  - `getByRole("row").filter({ hasText: name })` plus
    `getByRole("link", { name: "Ver relatório de <name>" })` and
    `{ name: "Abrir relatório de <name>" }` — both phrasings appear across specs.
  - `getByRole("heading", { name: "Relatórios", exact: true })` — `exact: true` means a heading
    reading "Relatórios — algo" would break it.
  - `page.getByRole("main").getByRole("link", { name: "Relatórios" })` must exist on the student
    record (`reports.spec.ts:53`). Merging title and breadcrumb per §2.2 must keep a
    "Relatórios" link inside `<main>`.

### 3.6 Events — `/events`

- **Today:** `e2e/events/evidence/mobile-event.png` (375px), `event-created.png`;
  `src/widgets/events/Events.tsx`, `EventDetail.tsx`.

- **What is wrong:**
  1. **`grid-cols-3` with no breakpoint at 375px, twice** (`EventDetail.tsx:94,257`). Each tile is
     ~105px. "Não autorizados" wraps to two lines; "Pendentes de pagamento" wraps to **three**. The
     tile grows to fit its label while the number it exists to show stays put.
  2. Two stat-tile systems on one screen — `statTileVariants` (cva, `EventDetail.tsx:~55`) for the
     authorization/payment groups and the bespoke `MoneyCard` grid at `:112`. Different padding,
     different value sizes.
  3. `MoneyCard` concatenates `` `de ${collected} de ${expected} esperados` `` into one text node
     (`:126`) — `design-language.md` §10 rule 3 forbids exactly this, and it is why the sentence
     wraps under the progress bar at 375px.

- **Fix:** `grid-cols-2 sm:grid-cols-3` for both tile groups so labels get ~160px at 375px, or keep
  three columns and shorten the labels to "Não autoriz." — prefer the former; the label is the
  thing being read. Unify on one tile component (the `cva` one) and delete the `MoneyCard` grid
  gymnastics. Tiles take the border treatment from `design-language.md` §6.

- **375px:** the two-column tile grid is the whole fix. The per-student `<li>` cards already stack
  their two selects and two buttons correctly — that part is good and the E2E defends it.

- **Must not change:**
  - **`getByText("Autorizados", { exact: true }).locator("..").locator("p.text-2xl")`
    (`events.spec.ts:67-69`, three of them: `Autorizados`, `Pagos`, `Arrecadado`).** This is the
    most brittle selector in the suite. It pins: (a) the value is a `<p>`, (b) it carries the
    literal class `text-2xl`, (c) it is a child of the label's **direct parent**. Moving the value
    to `text-xl` per the language's tile step, or wrapping either element one level deeper,
    breaks all three. **Rewrite these to `getByLabel`/`getByTestId` in the same commit** — the
    right fix is a stable hook, not preserving `text-2xl` forever.
  - `getByRole("listitem").filter({ hasText: <student name> })` — the per-student row stays an
    `<li>` inside a `<ul>`.
  - `getByLabel("Autorização de <name>")` and `getByLabel("Pagamento de <name>")` on native
    `<select>`s, matched by `/^Autorização de /` and `/^Pagamento de /`.
  - `getByRole("link", { name: "WhatsApp" })` with `target="_blank"` and a `wa.me` href.
  - `getByText("Gratuito")`, `getByText("Total de alunos")`; on a free event
    `getByText("Pagos", { exact: true })` and `getByText("Arrecadado")` must have **count 0**.
  - Form modal labels: `"Aula"`, `"Título"`, `"Data"`, `"Local"`, `"Valor por aluno (R$)"`;
    heading `"Novo evento"`.
  - `events.spec.ts:144-149` asserts both controls of the first `<li>` lie within
    `0 ≤ x ≤ 375`. Any tile change must keep that true.

### 3.7 Groups, subjects, profiles, grades — `/groups`, `/subjects`, `/users`, `/grades`

Grouped because they share one shape and one set of problems.

- **Today:** `e2e/auth/evidence/admin-profiles.png`,
  `e2e/academic-structure/evidence/group-with-assignment.png`,
  `e2e/evaluations/evidence/evaluation-created.png`; `GroupsAdmin.tsx`, `SubjectsAdmin.tsx`,
  `ProfilesAdmin.tsx`, `GradesTeacher.tsx` and their panels.

- **What is wrong:**
  1. All four hand-roll the card string (`rounded-xl border bg-card px-4 py-3 shadow-sm`) with
     slightly different padding: `px-4 py-3` in `GroupsAdmin.tsx:56` and `SubjectsAdmin.tsx:50`,
     `p-4 ... md:p-5` in `ProfilesAdmin.tsx:90,188`. Same visual role, three paddings.
  2. `ProfilesAdmin` patches `className="h-11"` onto `Input` and `SelectTrigger` four times
     (`:102,116,131,158`) because the primitives default to 36px. That patch is the strongest
     argument for the responsive default in §2.1.
  3. Loading skeletons are ad-hoc `h-24`/`h-16 animate-pulse rounded-xl bg-muted` divs in four
     files, not a shared `Skeleton`.
  4. `/users` renders the create form and the list as two peer `<section>` cards, so on desktop the
     form occupies the top third of the page permanently. Template's pattern for this is a modal
     (`ProfileFormModal` already exists and is used for *editing*) — the create form should use it
     too.

- **Fix:** one `Card` (§2.2), one `Skeleton` (`shadcn add skeleton`, already scheduled by
  `design-language.md`), and the responsive `Input`/`Button`/`SelectTrigger` heights, which deletes
  every `h-11` patch. No new components.

- **375px:** these are admin screens but the language applies. `ProfilesAdmin`'s
  `grid-cols-1 sm:grid-cols-2` form is already correct.

- **Must not change:**
  - `getByRole("listitem").filter({ hasText: username })` — profile rows stay `<li>`.
  - `getByLabel("Nome")`, `"Login de usuário"`, `"Papel"` (with `exact: true`), `"Senha"`,
    `"Professor regente"`, `"Data"`.
  - `getByLabel("Adicionar aluno")` in `pivot.spec.ts:40` is a native `<select>` scoped to a group
    card — distinct from the `Adicionar aluno` **button** on `/students`. Do not unify those two
    strings.
  - `getByRole("heading", { name: "Perfis", exact: true })`, `{ name: "Aulas" }`,
    `{ name: "Avaliações" }`.
  - `evaluations.spec.ts:17,43`: `getByRole("button", { name: /—/ }).first()` — a button whose
    accessible name is an **em dash** opens grade entry. If `EmptyValue` replaces bare em dashes
    globally (`design-language.md` §4), this selector needs the `aria-label` it should have had
    from the start.
  - `card.getByRole("spinbutton")` — grade inputs stay `type="number"`.

### 3.8 Login and change password — `/(auth)/login`, `/(auth)/change-password`

- **Today:** `e2e/auth-real/evidence/valid-sign-in.png`, `provisional-password.png`;
  `src/features/auth/LoginForm.tsx`.

- **What is wrong:** these routes render outside `TailAdminShell`, so they inherit `body`'s
  `bg-background` (white). The template puts every full-width auth page on `bg-gray-50` with a
  centered card — `template/app/(full-width-pages)/(auth)/layout.tsx`. On ours the form floats on
  an unbounded white field with no card boundary. It is the cheapest fix in the audit and the
  first screen every user sees.

- **Fix:** `bg-gray-50` on the auth layout, form inside the standard `Card`, max-width ~`max-w-md`,
  inputs at `h-11` with `text-base`.

- **375px:** single column, `px-4`, sticky submit not needed (the form is short).

- **Must not change:** `getByLabel("Usuário")`, `getByLabel("Senha")`,
  `getByRole("heading", { name: "Defina sua senha" })`, and
  `getByText(<profile name>).first()` being visible after sign-in.

---

## 4. Cross-cutting selectors any redesign must respect

Independent of screen:

| Selector | Pins | Where |
|---|---|---|
| `page.locator("aside")` | The sidebar is an `<aside>`; 290px expanded / 90px collapsed; x < 0 when the mobile drawer is closed | `take-attendance.spec.ts:62,90` |
| `page.locator("div.fixed.inset-0.z-40")` | `Backdrop` keeps those exact three classes | `take-attendance.spec.ts:69` |
| `getByRole("button", { name: "Alternar menu" })` | Header toggle label | `take-attendance.spec.ts:65,93` |
| `getByRole("navigation", { name: "Navegação principal" })` | Sidebar `nav` `aria-label` | `take-attendance.spec.ts:79` |
| `getByRole("main")` | `TailAdminShell` keeps `<main>` | `reports.spec.ts:53` |
| `document.scrollWidth - clientWidth <= 0` | **No horizontal page scroll at 375px**, asserted in `take-attendance`, `student-detail` and `events` | three specs |
| `getByText("404")` having count 0 | Client-side routes never fall through to the static-export 404 | `student-detail.spec.ts` ×4 |

---

## 5. Prioritised cards

Ranked by (frequency of use) × (severity), not by effort.

| # | Card | Screens | Why here | Existing card |
|---|---|---|---|---|
| 1 | **Foundation: Outfit, `--radius: 0.5rem`, one type scale, chart font token** | all | Every other card cites these values. Shipping any redesign before this means redoing it. Includes the two charts that request an unloaded font and the five off-palette avatar colors. | **new** |
| 2 | **`Card` primitive + responsive `h-11 md:h-9` on `Button`/`Input`/`SelectTrigger`** | all | 23 inline card strings across 14 files, and every screen currently patches its own touch targets. This is the single change that makes the rest small. | **new** |
| 3 | **Roll call at 375px** | `/attendance` | The most-used screen by the most-constrained user. Name truncated to 81px, 40px targets 6px apart, an input that zooms iOS, a placeholder promising a field that does not exist. A wrong tap here writes a wrong absence. | **SPA-324** — extend it: the card names the floating date and `Aluno Ch...`; it does not name the iOS zoom, the 32px bulk-action button, the matrícula copy, or the P/A/F/J legend. |
| 4 | **Student record layout** | `/students?aluno=`, `/reports?studentId=` | Broken at *both* 375px and 1280px, and it breaks a `tel:` link that a coordinator actually dials. The `UserInfoCard` fix is well-understood. | **SPA-322** — fits, plus one addition: the card must also rewrite `student-detail.spec.ts:113`, which currently asserts the defect. |
| 5 | **List density, pagination and overflow** | `/students`, `/reports` | Unbounded lists and a table so wide the E2E has to scroll it back. Blocks the 768px card-list break. | **SPA-321** — fits. Add: delete the `scrollLeft` workaround in `students.spec.ts:36-38` and remove `whitespace-nowrap` from `TableCell`, which is the shared root cause. |
| 6 | **Dashboard honesty: delete `MOCK_TOTAL_TEACHERS` and `ADMIN_TASKS`** | `/` (admin) | A fabricated teacher count and four invented tasks violate CLAUDE.md §6 directly. This is a correctness bug that happens to live in a widget. Ranked above the dashboard's visual work because a wrong number is worse than an ugly one. | **new** — do not fold into a visual card. |
| 7 | **Dashboard card anatomy and stretched empty states** | `/` (admin) | The alerts card renders one sentence in 340px because it is height-matched to a chart. KPI cards are half-empty without the template's delta slot. | **new** |
| 8 | **Event tiles at 375px** | `/events` | `grid-cols-3` at 375px wraps "Não autorizados" and "Pendentes de pagamento". Teacher-facing and mobile. Ranked below roll call only because it is used per-event, not per-class-per-day. | **new** — includes replacing the three `p.text-2xl` selectors with stable hooks. |
| 9 | **Breadcrumb owns the page title** | all, visibly `/reports` | Merging `PageBreadCrumb`'s title+trail row removes the doubled back-affordance and the "Relatórios" crumb sitting above a student's name. | **SPA-323** — fits, and the structural fix is the breadcrumb, not the reports route. |
| 10 | **Auth pages get a canvas and a card** | `/login`, `/change-password` | First screen every user sees, currently a form floating on white. Smallest diff in the list. | **new** |
| 11 | **Reports: delete the dead `Período` select; unify `ClassOverview` tiles** | `/reports` | A filter that filters nothing is a trust problem, but it is admin-only and low-traffic. | **new** |
| 12 | **Admin CRUD consistency (`/groups`, `/subjects`, `/users`, `/grades`)** | four routes | Mostly absorbed by cards 1 and 2. What remains is a shared `Skeleton` and moving the `/users` create form into the existing modal. | **new** |

Cards 1 and 2 are prerequisites for 3–12. Card 6 is independent of all of them and can ship first.

---

## Verification

- `git rev-parse --abbrev-ref HEAD` → `feature/spa-284-real-session`
- `git status --porcelain` before this document: `?? .superpowers/` only
- Files written by this task: `docs/specs/screen-audit.md` (this file). Nothing under `src/`,
  nothing under `e2e/`, no git command that writes.
- Every screen claim above cites either the evidence PNG that was opened or the widget file and
  line that was read.
