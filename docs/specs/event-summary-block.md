# Indicator block: event detail

Scope: `src/widgets/events/EventDetail.tsx`, the indicator strip between the event header and the
student list. It does not touch the header or the list.

## Decisions (summary)

1. **`Arrecadado` becomes a highlight card of its own**, no longer a tile like all the others. It
   is the answer to the first question a reader asks: can the trip go ahead?
2. **The value `R$ 25,00` and the expected total `de R$ 50,00 esperados` are two separate
   paragraphs**, never one concatenated string. That is what removes the line break.
3. **Seven indicators become three groups**: money card (1) → authorization (3) → payment (3).
   Each group is a closed `grid-cols-3`, which ends the orphan tile in the grid.
4. **Color comes in as reinforcement, never as the only carrier of meaning**: every tile has a
   text label, and the color (success/warning/error/neutral) is extra on top.
5. **The whole block gets the same card (`border` + `bg-card` + `shadow-sm`) as the header and the
   list**, so the tiles stop floating on loose `bg-muted`.
6. No new icon on the count tiles: label plus background color already carry the fast read, and an
   icon per tile is decoration nobody asked for (YAGNI). Revisit only if user testing shows color
   alone is not enough.
7. The progress bar is two `div`s with color tokens, not a new component: it is static and not
   interactive, which does not justify `pnpm dlx shadcn add progress`.

## Data mapping (`EventSummary`)

The label column holds the literal PT-BR UI copy, exactly as it is rendered.

| `EventSummary` field | PT-BR label | Group |
|---|---|---|
| `collected` + `expected` | "Arrecadado" / "de {expected} esperados" | Money (top) |
| `authorized` | "Autorizados" | Authorization |
| `pendingAuthorization` | "Aguardando" | Authorization |
| `denied` | "Não autorizados" | Authorization |
| `paid` | "Pagos" | Payment |
| `pendingPayment` | "Pendentes de pagamento" | Payment |
| `waived` | "Isentos" | Payment |
| `total` | "Total de alunos" | Free event only |

Reading order, top to bottom, always: **money → authorization → payment**. It is the order of the
teacher's own question: can the trip go ahead, who still has to authorize, everything else is
detail.

---

## 375px layout (paid event)

Assumed content width: 343px (375 viewport − 16px of padding on each side, inherited from the page
container).

```
┌ Cartão de dinheiro ───────────────────────────┐ 343px, p-4, rounded-xl
│ Arrecadado                             [50%]  │  label text-sm + badge %
│ R$ 25,00                                      │  text-2xl font-bold text-brand-700
│ de R$ 50,00 esperados                         │  text-sm text-muted-foreground
│ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  h-2 rounded-full bar, decorative
└────────────────────────────────────────────────┘
  mt-4

AUTORIZAÇÃO                                          text-xs font-semibold uppercase
                                                      tracking-wide text-muted-foreground
┌─────────────┬─────────────┬─────────────┐  gap-2 (8px), each column ~109px
│ Autorizados │  Aguardando │Não autoriz. │  label text-xs, cor por tom (ver tabela)
│      8      │      3      │      1      │  text-2xl font-bold text-foreground
└─────────────┴─────────────┴─────────────┘
  mt-4, border-t pt-4

PAGAMENTO
┌─────────────┬─────────────┬─────────────┐
│    Pagos    │ Pend. pag.  │   Isentos   │  label text-xs text-muted-foreground
│      5      │      5      │      2      │  text-2xl font-semibold text-foreground
└─────────────┴─────────────┴─────────────┘
```

The labels "Pendentes de pagamento" and "Não autorizados" may wrap onto 2 lines inside those
109px. That is acceptable and expected: the bug was the **value** wrapping, not the label. Since
it is a grid, the three columns of the same row stretch together to the same height, so the layout
does not distort.

## ≥1024px layout (paid event)

```
┌ Cartão de dinheiro ──────────────────────────────────────────────────────────┐
│ Arrecadado                                                          [50%]    │
│ R$ 25,00   de R$ 50,00 esperados      ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░ (w-48)      │
└────────────────────────────────────────────────────────────────────────────────┘
  mt-4, grid-cols-2 gap-6

┌ AUTORIZAÇÃO ───────────────────────┐   ┌ PAGAMENTO ──────────────────────────┐
│ ┌─────────┬─────────┬─────────┐   │   │ ┌─────────┬─────────┬─────────┐    │
│ │Autorizad│Aguardand│Não autor│   │   │ │  Pagos  │Pend.pag.│ Isentos │    │
│ │    8    │    3    │    1    │   │   │ │    5    │    5    │    2    │    │
│ └─────────┴─────────┴─────────┘   │   │ └─────────┴─────────┴─────────┘    │
└─────────────────────────────────────┘   └───────────────────────────────────┘
```

In the money card on desktop, the content becomes `flex items-center justify-between gap-6`: the
text block (label, value, "de X esperados") on the left, the percentage badge plus the bar (fixed
`w-48` width) on the right. It spends the extra width instead of growing the text.

---

## Visual hierarchy

| Layer | What it is | Size/weight | Color |
|---|---|---|---|
| **Headline** | the `Arrecadado` value | `text-2xl font-bold` | `text-brand-700` (the only brand color in the block: it is the number that matters most) |
| **Secondary** | "de X esperados", the % badge, the authorization labels | `text-sm` / `text-xs font-semibold` | `text-muted-foreground`, success/warning/error tone on the authorization labels |
| **Tertiary** | the `Autorizados` / `Aguardando` / `Não autorizados` values | `text-2xl font-bold text-foreground` | background tint by tone, neutral text |
| **Quaternary** | the whole Payment group (label and value) | `text-2xl font-semibold text-foreground` (weight 600, not 700) | neutral, no background tint |

Size note: the `Autorizados` and `Pagos` values are pinned to `text-2xl` by the E2E contract (see
the final section). That is why the hierarchy between the authorization and payment groups does
not come from font size, which is the same in both, but from **weight** (700 vs 600), **color**
(tint vs neutral) and **position** (authorization comes first, payment is the last group). Giving
the three tiles of one row different sizes would look broken, which is why `Aguardando` and
`Não autorizados` also use `text-2xl`, even with no test requiring it.

## Tone per tile (Authorization group)

| Tile | `border` | `bg` | label color |
|---|---|---|---|
| Autorizados | `border-success-200` | `bg-success-50` | `text-success-700` |
| Aguardando | `border-warning-300` | `bg-warning-50` | `text-warning-700` |
| Não autorizados | `border-error-200` | `bg-error-50` | `text-error-700` |

`Aguardando` uses `border-warning-300`, one step stronger than the `-200` of its neighbors: it is
the actionable number the teacher has to see first (who still has to authorize), the only tone
with emphasis of its own in the group.

Payment group: all three tiles neutral, `border-border bg-gray-50` with a `text-muted-foreground`
label. It reinforces that, with the money card already at the top, this group is supporting
detail, not the main answer.

Reuse the color pattern from `src/shared/ui/badge.tsx` (`success: bg-success-50
text-success-700`, `danger: bg-error-50 text-error-700`): same tokens, same logic, applied to a
tile `div` instead of a badge `span`.

---

## Composing `collected` / `expected` (the core of the work)

The original bug was a single string, `${formatCurrency(collected)} de ${formatCurrency(expected)}`,
inside one `p.text-2xl`. The fix is structural, not typographic:

```
<div>                                          ← parent compartilhado (contrato de E2E)
  <div class="flex items-center justify-between">
    <p class="text-sm font-medium text-muted-foreground">Arrecadado</p>
    <span class="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
      {porcentagem}%
    </span>
  </div>
  <p class="mt-1 text-2xl font-bold text-brand-700">{formatCurrency(collected)}</p>
  <p class="text-sm text-muted-foreground">de {formatCurrency(expected)} esperados</p>
  <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-brand-100" aria-hidden="true">
    <div class="h-full rounded-full bg-brand-500" style="width: {porcentagem}%" />
  </div>
</div>
```

- `formatCurrency(collected)` on its own never wraps: the largest plausible value
  (`R$ 1.234,56`) still fits on one line at 343px with `text-2xl`.
- `de {formatCurrency(expected)} esperados` is a **sibling** `<p>`, outside the `p.text-2xl`. It
  can wrap as much as it likes without affecting the value or the test, which only looks at the
  `p.text-2xl`.
- `porcentagem = Math.round((collected / expected) * 100)`, formatted with `formatPercent` (it
  already exists in `src/shared/lib/format.ts`: reuse it, do not rewrite it).
- No clamp at 100%: the domain model guarantees `paid ≤ total - waived`, so `collected ≤ expected`
  always. There is no point defending a case the business rule already prevents.
- The progress bar is `aria-hidden="true"`: the value is already spelled out in the text above,
  and announcing the bar again would be redundant for a screen reader.

### Edge case: everyone waived (`expected === 0` with `total > 0`)

This happens only when `waived === total` (and then `collected` is always `0` too, because `paid`
and `waived` are mutually exclusive statuses per student). The money card in that case:

```
Arrecadado
R$ 0,00
Todos os alunos estão isentos de pagamento.
```

No percentage badge, no bar (dividing by zero has no useful reading). The value stays in the
`p.text-2xl` holding "R$ 0,00", which keeps the E2E contract (`toContainText("R$")`).

---

## Variant: free event

No money card, no payment group. Here the "can we go" question is authorization alone, so the
authorization group moves to the top:

```
AUTORIZAÇÃO
┌─────────────┬─────────────┬─────────────┐
│ Autorizados │  Aguardando │Não autoriz. │
│      8      │      3      │      1      │
└─────────────┴─────────────┴─────────────┘
  mt-3

┌ Total de alunos ─────────────────────────┐  <- full-width tile, in no grid at all,
│ Total de alunos                      12  │     so a broken 4+3 grid can never
└────────────────────────────────────────────┘     leave a tile orphaned.
```

The "Total de alunos" tile uses the same label+value pattern as the rest (`label` and
`p.text-2xl` as direct children of the same `div`), but in `flex items-center justify-between`
(label on the left, value on the right, same line) instead of stacked: alone in a row, stacked
would leave too much empty space.

At ≥1024px the same tile keeps `flex justify-between`, with only `max-w-xs` added so it does not
stretch to the card's edge and turn into an empty bar.

---

## Empty case: class with no enrolled students (`total === 0`)

Render no tile and no money card: a wall of zeros informs nothing. A single block replaces the
whole group:

```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  border dashed border-border, py-8,
│         Nenhum aluno matriculado          │  text-center, text-sm text-muted-foreground
│   nesta aula ainda. Os indicadores        │
│   aparecem assim que houver alunos.       │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

Optional decorative icon (`Users`, `lucide-react`, `aria-hidden`) above the text: nice to have, it
does not block delivery. This condition is checked before any other (`free`, waived and so on): if
`total === 0`, it is the only content of the block.

---

## Tokens, spacing, container

- Container of the whole block: `<section aria-label="Indicadores do evento" class="rounded-xl
  border bg-card p-4 shadow-sm md:p-5">`, the same visual treatment as the header and the student
  list (`border`, `bg-card`, `shadow-sm`, `rounded-xl`), creating the same card rhythm across the
  screen (header → indicators → list). This is the change that fixes the "floating" tiles: they
  come to live inside a real card instead of loose on `bg-muted`.
- Inner spacing: `gap-4` between the money card and the first row; `border-t pt-4 mt-4` between
  the authorization row and the payment row (a subtle divider, `border-border`).
- Tiles: `gap-2` at 375px, `gap-3` from `sm:` up; padding `p-3` (count rows) and `p-4` (money
  card, since it is the highlight).
- `--radius` (`0.5rem`) on every corner: `rounded-lg` for the small tiles, `rounded-xl` for the
  money card and the outer container, consistent with the rest of the screen.
- Group headers ("Autorização", "Pagamento"): a styled `<p>` (`text-xs
  font-semibold uppercase tracking-wide text-muted-foreground`), not a real `<h2>`/`<h3>`. It is a
  visual grouping label, not a navigation landmark; the page already has an `h1` (the event title)
  and needs no more heading levels here.
- The count tiles are not interactive (they have no `onClick`), so the 44px touch-target rule does
  not apply to them. It starts applying the day they become a clickable filter.
- No color in raw hex: every color named in this spec is an existing `@theme` token
  (`--color-brand-*`, `--color-success-*`, `--color-warning-*`, `--color-error-*`,
  `--color-gray-*`) or a shadcn alias (`bg-card`, `text-muted-foreground`, `border`).

## Components

- Reuse the `Stat` component that already exists in `EventDetail.tsx`, extending it with a
  `tone?: "neutral" | "success" | "warning" | "danger"` prop that resolves to the classes in the
  tone table above. Do not create a new component per tile.
- The money card is a separate block (not a variation of `Stat`): its own structure is described
  in the composition section.
- Progress bar: `<div>` + `<div>` with `style={{ width: `${porcentagem}%` }}` and the
  `bg-brand-100`/`bg-brand-500` tokens. Do not add shadcn's `progress`: it is decorative, static,
  with no interaction and no `aria-valuenow` to expose.
- No new icon on the count tiles (decision 6, above).

---

## Markup contract for the E2E (`e2e/events/events.spec.ts`)

For `Autorizados`, `Pagos` and `Arrecadado`, the test does:

```ts
page.getByText("<Rótulo>", { exact: true }).locator("..").locator("p.text-2xl")
```

For those three labels this requires: a text element holding exactly the label, a **shared direct
parent**, and inside that same parent a `<p class="text-2xl">` with the value. Rules the
implementation must follow so it does not break this:

1. **Do not wrap the label in a `<div>`/wrapper of its own** (for example, to put an icon beside
   it). That changes the parent `locator("..")` finds, and the `p.text-2xl` stops being inside it.
   This is why the spec puts no icon next to the label of any of those three tiles.
2. **`Autorizados` and `Pagos`**: the `p.text-2xl` must contain **the number alone**, with no
   suffix and no extra whitespace beyond the automatic trim. The test runs `Number(await
   statAutorizados.textContent())` and `Number(...)` on `statPagos`; any text besides the digits
   breaks the parse.
3. **`Arrecadado`**: the `p.text-2xl` must contain `formatCurrency(collected)` **alone** (for
   example `"R$ 25,00"`), never concatenated with "de X esperados". The test only requires
   `toContainText("R$")` and that the text changes when the value changes; the "de X esperados"
   sentence sits in a sibling `<p>` outside the `p.text-2xl`, which the spec already defines
   above.
4. Extra elements inside the same parent (% badge, progress bar, the second line "de X
   esperados") **do not break** the contract: the selector looks for a specific `p.text-2xl`
   inside the parent and ignores the other children.
5. `Aguardando`, `Não autorizados`, `Pendentes de pagamento`, `Isentos` and `Total de alunos` have
   no fixed locator in the E2E today: any markup is fine, as long as the label text stays visible
   (the "free event" tests use a plain `getByText`, without `exact`, on those labels).

No change to the test file is needed: the spec was designed to fit inside the existing contract,
not to rewrite it.
