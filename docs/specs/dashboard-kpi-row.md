# Dashboard: stop fabricating numbers, adopt the template card

The admin dashboard is the first screen a coordinator sees after signing in. Today it
prints two things the database never said, inside a card shape that leaves half of
itself blank.

## The defects

**A fabricated teacher count.** `AdminPanel.tsx:22-24`:

```ts
/** Below this, a lone teacher account (dev seed) would tank the stat — show a plausible mock instead. */
const MOCK_TEACHERS_THRESHOLD = 2;
const MOCK_TOTAL_TEACHERS = 148;
```

and at the render site:

```ts
String(totalTeachers < MOCK_TEACHERS_THRESHOLD ? MOCK_TOTAL_TEACHERS : totalTeachers)
```

An installation with one teacher shows **148**. This is the exact failure CLAUDE.md §6
names — "tela não inventa número" — and it is worse than any visual defect, because a
wrong number is acted on. It also cannot be caught by the eye: 148 is plausible.

**Four fabricated tasks.** `ADMIN_TASKS` is a hardcoded array — "Reunião de diretoria:
orçamento do 3º trimestre", "Renovação de credenciamento docente" — rendered as if it
were the user's task list. No route feeds it, no route ever will: the API has no tasks
resource.

**A card that is half empty.** Our `StatCard` stacks icon, label, value in a column and
stops. The template's KPI card puts label and value on the left and a figure on the
right of the same baseline, so the card reads as one row of information rather than a
column with dead space under it.

## The rule this restores

A screen shows what the server said. When the server said nothing, the screen says so —
`—`, or an empty state. It never fills the gap with a number that looks right. A
development seed with one teacher is a true state of the system, and "1" is its honest
rendering.

## What to build

### The KPI card

Adopt the template's anatomy from
`free-nextjs-admin-dashboard-main/src/components/ecommerce/EcommerceMetrics.tsx`:

```
rounded-xl border p-4 md:p-5         (the template writes rounded-2xl p-5 md:p-6)
icon tile: w-12 h-12 rounded-xl      (ours: h-11 w-11)
flex items-end justify-between mt-5  (ours: stacked, nothing on the right)
value: text-3xl font-bold            (ours: text-2xl)
label: text-sm text-muted-foreground
```

Two values come from us, not from the template: the radius and the padding. What is
adopted here is the card's *layout* — the icon tile, the `items-end justify-between`
row, label and value on the left with a figure on the right. Radius and padding follow
`design-language.md` (`rounded-xl`, `p-4 md:p-5`), which is the anatomy the shared `Card`
primitive will carry, so this card does not have to be edited a second time.

Same reasoning for the value: the template writes it `text-title-sm`, we write `text-3xl`.
Identical 30px, but `--text-title-*` is deprecated and gets deleted.

The right-hand slot takes a `Badge` (`src/shared/ui/badge.tsx`, variants `success` and
`danger` already exist) **only where a real second figure exists**:

| Card | Right slot | Source |
|---|---|---|
| Total de alunos | `{active} ativos`, variant `success` | `students.data.filter(s => s.active).length` |
| Total de professores | nothing | no second figure exists; the card degrades to label + value |
| Frequência geral | trend delta with an arrow | first vs last point of `useAbsenteeismTrend()` |

The trend delta is `(100 - last.absenceRate) - (100 - first.absenceRate)`, rounded.
Render `success` with `ArrowUpIcon` when positive, `danger` with `ArrowDownIcon` when
negative, and **render no badge at all** when the series has fewer than two points —
a single point is not a trend.

`arrow-up.svg` and `arrow-down.svg` do not exist in `src/shared/tailadmin/icons/`. Copy
both from `free-nextjs-admin-dashboard-main/src/icons/` and export them from the barrel
at `src/shared/tailadmin/icons/index.tsx`, in the style of the entries already there.

### The tasks card

Delete `ADMIN_TASKS`, `AdminTask`, `TASK_VARIANT` and the card that renders them. The
row it lives in becomes a single full-width "Tendência de frequência" card. Deleting is
the fix: there is no task resource to wire it to, and an empty "Tarefas administrativas"
card would be worse than none.

## What must not change

`e2e/dashboard/dashboard.spec.ts` asserts these strings are visible: `Total de alunos`,
`Total de professores`, `Frequência geral`, `Frequência por aula`, `Tendência de
frequência`, and `.apexcharts-canvas` with count exactly **2**. Keep all six. The
coordinator test repeats `Total de alunos` at 375px.

Removing the tasks card does not change the chart count — it was never a chart.

## Mobile, 375px

The KPI row is `grid-cols-1` there, so each card is full width and the
`items-end justify-between` row has all the space it needs. Verify the value and the
badge sit on one baseline and neither wraps.

## Verification

- `pnpm type-check`, `pnpm lint`, `pnpm test` — all clean before reporting.
- `pnpm exec playwright test e2e/dashboard` green, with the two evidence PNGs
  regenerated and **opened and looked at** before claiming they are good.
- Confirm by grep that `MOCK_TOTAL_TEACHERS`, `MOCK_TEACHERS_THRESHOLD` and
  `ADMIN_TASKS` no longer appear anywhere in `src/`.
