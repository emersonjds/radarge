# Radarge visual language

Normative document. Every panel screen follows these rules: whoever implements does not pick
typography, spacing, color or container on their own. The screen specs (`docs/specs/*.md`)
decide **what** appears and in what order; this document decides **how** it appears.

## Aesthetic direction

Refined minimalism with high information density.

The teacher uses this **standing up, between two classes, one-handed, on a 375px phone**. The
coordination team uses the same screens on desktop to hunt for gaps. Nobody is here to admire
anything. What makes this interface memorable is **being faster to read than the paper it
replaces**, not being decorated.

So: no ornament, no hero, no decorative gradient, no icon that carries no information, no
entrance animation. Every choice earns its place by making something faster to read or safer to
tap. That restraint **is** the aesthetic direction, and it has to be executed precisely.
Restraint executed badly is not minimalism, it is an unfinished screen.

## The seven defects this document exists to eliminate

Measured on real E2E captures at 375px and 1280px. Each section below names the ones it fixes.

| # | Defect | Evidence in the code |
|---|---|---|
| 1 | Loose information with no grouping | `StudentDetail.tsx:191`: a `dl.grid-cols-3` holding the labels `Idade`/`Responsável`/`Telefone`; the guardian's name wraps onto 3 lines and the phone number breaks in the middle |
| 2 | Missing data carrying the weight of data | `StudentDetail.tsx:214`: `—` in `text-2xl font-bold`; an em dash shouting like a number |
| 3 | Out-of-proportion empty state | `AcademicPanel.tsx:38-45`: the string "Sem notas lançadas." fills an entire card |
| 4 | A container that does not contain | `StudentDetail.tsx:213`: tiles in `bg-muted` (`#f2f4f7`) over `bg-card` (`#ffffff`): 1.08:1 contrast, no visible boundary |
| 5 | Density that ignores the available width | `ClassOverview` stuck at `md:grid-cols-2` up to 1280px, while the student identity block squeezes 3 fields into a narrow column |
| 6 | Mobile treated as a narrow desktop | `StudentRow.tsx:38`: `truncate` on the name to fit 4 single-letter buttons (`h-10 w-10` × 4 + gaps = 178px out of 343px) |
| 7 | Long list with no limit | `StudentsReportTable` renders every student: 2194px tall with 21 of them |

## Prerequisites (gaps between what was agreed and today's code)

Three things are out of place and block this language from being applied. They are not this
spec's job, but no screen is correct while they exist:

1. **The font is not Outfit.** `src/app/layout.tsx:2,7` loads `Inter` and `globals.css:8` sets
   `--font-sans: Inter, sans-serif`. What was agreed (CLAUDE.md §2) is Outfit via `next/font`.
   Fix the two lines. This is not a new choice of family, only the one already decided.
2. **`--radius` is `0.625rem`** (`globals.css:165`), not `0.5rem` as CLAUDE.md says. This
   document assumes **`0.5rem`**; adjust the token.
3. **Two typographic scales run in parallel**: Tailwind's default one and the template's
   leftovers (`--text-theme-*`, `--text-title-*`). This language uses **the default scale only**.
   The `text-theme-*` and `text-title-*` tokens are **deprecated**: do not use them in new code,
   remove them as each screen is touched.

---

## 1. Type scale

One family: **Outfit**. No second family, no monospace for data. `tabular-nums` in Outfit already
aligns a column of numbers, and a mono for a small label is template decoration.

| Role | Class | Size / line height | Weight | Where |
|---|---|---|---|---|
| **Display number** | `text-3xl font-semibold tracking-tight tabular-nums` | 30px / 36px | 600 | The number that answers the screen's main question. **At most one per screen.** |
| **Secondary number** | `text-xl font-semibold tabular-nums` | 20px / 28px | 600 | Tile value in a comparative group (the UI labels `Presentes` / `Faltas` / `Atrasos`) |
| **Inline number** | `text-sm font-medium tabular-nums` | 14px / 20px | 500 | Table cell, value inside a label+value pair |
| **Page title** (`h1`) | `text-xl font-semibold sm:text-2xl` | 20→24px / 28→32px | 600 | One per route |
| **Card title** (`h2`) | `text-base font-semibold` | 16px / 24px | 600 | Card header |
| **Body value** | `text-sm font-medium text-foreground` | 14px / 20px | 500 | Person's name, field value, list item |
| **Body** | `text-sm text-foreground` | 14px / 20px | 400 | Running sentence, `max-w-[68ch]` |
| **Label** | `text-xs font-medium text-muted-foreground` | 12px / 16px | 500 | `dt`, `label`, tile label, group header |
| **Caption / meta** | `text-xs text-muted-foreground` | 12px / 16px | 400 | Date, count, help text, subtitle |

### The number versus its label: explicit rule

Every number+label pair obeys three rules at once:

1. **The number sits exactly one step above the label** in the table above, never two.
   `text-3xl` ↔ `text-xs`; `text-xl` ↔ `text-xs`; `text-sm` (cell) ↔ `text-xs` (`th`).
2. **The number is `font-semibold` (600); the label is `font-medium` (500) at most.** Nothing in
   this interface uses `font-bold` (700): hierarchy comes from size plus color, and 700 in Outfit
   at `text-3xl` is already too heavy for an operational screen.
3. **`tabular-nums` on the number only.** The label never takes it. It is what makes a percentage
   column line up.

The label goes **above** the number when the block is vertical (tile, KPI) and **to the left**
when it is horizontal (a label+value pair in a field list). Never both patterns in the same row.

> Fixes defect 2 (`—` inheriting `text-2xl font-bold` because no step was defined for a "missing
> value") and defect 1 (label and value with no declared typographic relationship).

### Uppercase

Forbidden, with **one exception**: the table column header (`<th>`), in
`text-xs font-medium uppercase tracking-wide text-muted-foreground`.

Choice: uppercase stays only on `th` because it separates the header band from the data rows
without costing a second border, and it is the data-table convention the coordination team
already reads in spreadsheets. Everywhere else the literal UI copy goes to sentence case: "AULAS"
in `StudentDetail.tsx:224` and "ATIVO"/"INATIVO" in the `Badge` at `StudentDetail.tsx:177` become
"Aulas", "Ativo", "Inativo".

### Line length and alignment

- Running text: `max-w-[68ch]`. No sentence spans a full 1280px.
- Everything left-aligned. Centered **only** in a block or page empty state and in a table cell
  that spans a full `colSpan`. A number in a table column: `text-right`.
- No justified text, no custom `tracking` beyond `tracking-tight` on the display number and
  `tracking-wide` on `th`.

---

## 2. Spacing rhythm

Allowed steps: **1 (4px), 2 (8px), 3 (12px), 4 (16px), 5 (20px), 6 (24px), 8 (32px), 12 (48px)**.
Nothing else. No arbitrary value (`p-[13px]`), no `space-y-7`.

| Relationship | Value | Class |
|---|---|---|
| Label → its value | 4px | `gap-1` (vertical block) |
| Icon → text beside it | 8px | `gap-2` |
| Between two adjacent touch targets | 8px | `gap-2` (absolute minimum, see §8) |
| Between fields of the same group | 12px | `gap-3` |
| Card inner padding | 16px → 20px | `p-4 md:p-5` |
| Between groups inside a card | 16px + divider | `mt-4 pt-4 border-t border-border` |
| Between card title and content | 16px | `mt-4` |
| Between cards | 16px → 24px | `gap-4 md:gap-6` |
| Page side padding | 16px → 24px | `px-4 md:px-6` |
| Page header → first card | 24px | `mt-6` |
| Vertical breathing room of a page empty state | 48px | `py-12` |

Grouping rule (the one that fixes defect 1): **the distance between related elements is always
smaller than the distance to the neighboring group.** If label and value sit 4px apart and the
next pair is 12px away, the eye groups them on its own. A uniform `grid gap-3` between three
label+value pairs groups nothing, and that is what produces the floating "Idade / Responsável /
Telefone".

Vertical spacing inside a card uses `flex flex-col gap-*`, not a `margin` on a child. Loose
margins are what cancel each other out when two screens stack the same component.

> Fixes defects 1 and 4.

---

## 3. Color with meaning

Every color comes from `@theme` (`globals.css`). **Never a raw hex.**

| Role | Token | What it gets | What it never gets |
|---|---|---|---|
| **Brand** | `brand-500` / `primary` | Primary action, link, focus `ring`, active navigation item, selected state, **and at most one display number per screen** | Student status, decoration, background of a large block |
| **Success** | `success-*` | `Presente`, a regular situation, saved successfully | Anything that is not "all good" |
| **Warning** | `warning-*` | `Atrasado`, waiting on an action, student close to the absence limit | A real error |
| **Error** | `error-*` / `destructive` | `Ausente`, student at risk, validation failure, destructive action | Generic emphasis |
| **Neutral** | `gray-*` / `muted-foreground` | Everything else: label, meta, divider, value with no status weight, **`Justificado`** | — |

The status names in that table are the literal Portuguese UI labels, exactly as rendered:
`Presente`, `Ausente`, `Atrasado`, `Justificado`.

Tone recipe (the same one `Badge` uses, reuse it): `-50` background, `-200` border, `-700` text.
Solid fill (`bg-*-500 text-white`) only on an active status button and on a count badge, never as
a large background block.

**`Justificado` uses neutral, not brand.** Today it is `bg-primary` (`StudentRow.tsx:19`).
Choice: a justified absence asks for no action at all, so it cannot compete visually with the two
that do (`Ausente`, `Atrasado`); and using the brand color for a status would make the only
interactive color in the interface mean two things. It moves to `bg-gray-500 text-white` in the
active state and `bg-gray-100 text-gray-700` as a tint. The roll-call screen spec updates the E2E
along with it.

### The rule that keeps color from being the only carrier

**Every meaning carried by color also appears as text in the same element.** Not in `title`, not
in `aria-label` alone: in visible text, or in a glyph with an adjacent accessible label.

In the roll call, each status button carries its letter (P/A/F/J), the full `aria-label` and
`aria-pressed`; color is the third reinforcement, not the first. In a table, "Em risco" is the
word and `error-50` is its background. If you strip all color from the screen down to grayscale,
no information may disappear. That is the test.

Contrast: text on a tint always at the `-700` step (≥4.5:1 over the matching `-50`).
`muted-foreground` text (`gray-500`, 4.6:1 on white) is the lightest gray allowed for text;
`gray-400` is allowed **only** for the missing-value em dash (§4), which is not informative text.

> Fixes defect 4 (tint with no border) and supports defect 6 (status readable without depending on
> width).

---

## 4. Missing data

One treatment for the whole application. **"There is no value here" never looks like a value.**

```tsx
// src/shared/ui/empty-value.tsx
export function EmptyValue({ label = "sem dados" }: { label?: string }) {
  return (
    <span className="text-sm font-normal text-gray-400 tabular-nums" aria-label={label}>
      —
    </span>
  );
}
```

Rules:

1. **The em dash takes the label's step, never the value's.** Where a `text-3xl font-semibold`
   would fit, `text-sm font-normal text-gray-400` goes instead. A 30px em dash is defect 2 in
   full.
2. **A real zero is a value, not an absence.** `0%`, `0 faltas` and `R$ 0,00` use the number's
   full formatting. Use `EmptyValue` only when there is no record to compute from: the difference
   between "attended every one" and "never had a roll call" is the most expensive piece of
   information on this screen.
3. **A block whose only content is the missing value shows no em dash.** It gives the reason in a
   sentence: the "Frequência" tile with no records becomes `text-sm text-muted-foreground` reading
   "Sem chamadas registradas". The em dash is for when it sits next to siblings that do have a
   value (a table cell, a label+value pair in a list).
4. `EmptyValue` never takes a status color. Absence is not an error.
5. In an exported CSV, absence is an empty cell, not `—` (`ReportsCenter.tsx:120` exports the em
   dash; an em dash in a spreadsheet is text that poisons a sum).

> Fixes defect 2, and fixes it for the whole app instead of screen by screen.

---

## 5. Empty-state anatomy

Three sizes. The choice is not aesthetic: **count what is missing.**

| Missing… | Size | Anatomy |
|---|---|---|
| one value | **inline** | `EmptyValue` (§4). No padding, no border, no icon, no sentence. |
| the content of a card that already exists and has siblings | **block** | `py-6 text-center`, one sentence in `text-sm text-muted-foreground`, optionally a `size="sm"` link or button below it with `mt-3`. No icon, no title (the card already has an `h2`), no dashed border. |
| the whole route | **page** | `py-12 text-center`: `size-10 text-gray-300` icon (`aria-hidden`), `text-base font-semibold text-foreground` title, `mt-2 text-sm text-muted-foreground max-w-sm mx-auto` sentence, primary action at `mt-6`. |

Rules that hold for all three:

- **An empty state never grows to match a sibling's height.** No `h-full`, `min-h-*`, `flex-1` or
  `items-stretch` on a container whose child is an empty state. That is exactly what makes
  "Sem notas lançadas." fill an entire card (defect 3).
- **Dashed border only at page size.** At block size it draws a second box inside a box that
  already has a border.
- **The sentence says what to do, it does not apologize.** The UI copy reads "Nenhuma nota lançada
  nesta aula. Lance a primeira em Avaliações.", not "Ainda não há dados disponíveis no momento."
- **An error state uses the same anatomy**, switching the sentence color to `text-destructive` and
  always including a recovery action ("Tentar de novo"). The API `message` never reaches the
  screen (CLAUDE.md §6): the text is ours, routed by `code`.
- **A loading state does not use this anatomy**: tables and lists load with a `skeleton` shaped
  like the content; everything else loads with a single `text-sm text-muted-foreground` line.
  Never a spinner centered in a card.

> Fixes defect 3.

---

## 6. Container hierarchy

**Two surfaces, at most.** Page (`bg-background`, white) → card (`bg-card` + border + shadow).
There is no third stacked surface.

| Level | What it is | Classes |
|---|---|---|
| **Card** | A unit of content that would make sense on its own on another screen | `rounded-xl border border-border bg-card p-4 shadow-sm md:p-5` |
| **Simple group** | A subdivision inside a card | No background, no border. Separated by `mt-4 pt-4 border-t border-border`, or by spacing plus a label |
| **Value tile** | One value in a set of **two or more** comparable ones, side by side | `rounded-lg border border-border bg-gray-50 p-3` — **border required** |
| **Nothing** | Page header, section title, block empty state | Text directly on the parent surface |

Rules:

- **Never a card inside a card.** If you thought you needed one, the inner one is a simple group.
- **A lone value is not a tile.** It is a label+value pair in a simple group. A tile exists for
  side-by-side comparison; a solitary tile is a box around nothing.
- **`bg-muted` without a border is never a container.** `gray-100` (`#f2f4f7`) over `bg-card`
  (`#ffffff`) gives 1.08:1, below the threshold where the eye sees a boundary. The tile floats
  between the real cards instead of belonging to one. That is defect 4. Choice: solved with
  **a border plus `gray-50`** instead of darkening the background to `gray-100`, because the
  border defines the boundary with 100% reliability and a darker background drops the contrast of
  the text inside it.
- `bg-muted` stays valid where it is **not** a container: table header band, row `hover`, progress
  bar track.
- Radius: `rounded-xl` (card), `rounded-lg` (tile, large button, field), `rounded-md` (default
  button), `rounded-full` (badge, avatar, chip). Never `rounded-2xl` or `rounded-none`.
- Shadow: **`shadow-sm` only, and only on a card.** Tile, group and badge have no shadow. The
  shadow is the signal for "this is a card"; if everything has one, it signals nothing.

### Density and use of width (defect 5)

- The student identity block is **a simple group of stacked label+value pairs**
  (`flex flex-col gap-3`), not a `grid-cols-3`. Stacked, the guardian's name gets 300px+ to itself
  and does not wrap onto three lines.
- Page content grid: `grid-cols-1` → `lg:grid-cols-3` (side column 1 / main 2). Inner panels that
  stop at `md:grid-cols-2` today go on to `xl:grid-cols-3` when they hold 3+ comparable blocks.
  The 1280px of width is there to fit one more column, not to stretch the same ones.
- Maximum width of the page container: `max-w-[1440px] mx-auto`. Without it, a 7-column table on
  an ultrawide monitor becomes a 2000px row that no eye can track.

> Fixes defects 4 and 5.

---

## 7. Table density and the break to mobile

### ≥768px: table

| Element | Classes |
|---|---|
| Header (`th`) | `px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground` over `bg-muted` + `border-b border-border` |
| Cell (`td`) | `px-4 py-3 text-sm text-foreground` → a row of ~44px |
| Row | `border-t border-border hover:bg-muted` |
| Clickable row | the whole row is the target; the link covers the identifying cell |

Down from `px-5 py-4` (a ~52px row) to `px-4 py-3` (~44px): two more rows per screen without
losing the 44px target.

Column rules:

- **Column 1 is always the identifier** (the person's name), flexible, `min-w-[12rem]`, never
  truncated.
- **Numeric column**: `w-24 text-right tabular-nums`. Every numeric column right-aligned, which is
  what lets the eye compare magnitude going down.
- **Status column**: `w-32`, one `Badge`.
- **Action column**: `w-14 text-right`, icon in a 36px target (`size-9`) on desktop.
- **Seven columns maximum.** The eighth piece of information lives on the detail screen, not in
  one more column.
- **No `overflow-x-auto` on the table.** Choice: a column off-screen is a column nobody discovers,
  and CLAUDE.md forbids horizontal page scrolling. Below 768px the table does not scroll, it turns
  into something else.

### <768px: card list

The break is exactly at **768px** (`hidden md:table` on the table, `md:hidden` on the list).
Choice: 768px and not 640px because the minimum viable table here has 5 readable columns; at 640px
each one drops below 110px and the name truncates again (defect 6).

Anatomy of the row card:

```
┌──────────────────────────────────────────────┐  rounded-xl border bg-card p-4, min-h-16
│ [AV]  Maria Aparecida dos Santos    [Em risco]│  nome: text-sm font-medium, line-clamp-2
│                                                │  badge à direita, shrink-0
│ Nota 8,5 · Frequência 92% · 2 faltas          │  text-xs text-muted-foreground,
└──────────────────────────────────────────────┘  no máximo 3 pares
```

The whole card is the target (a covering `<Link>`). At most three label+value pairs on the second
line; the fourth goes to the detail screen.

### Long-list limit: 20-row pagination

Client-side, with the UI copy "Mostrando 1–20 de 84" in `text-xs text-muted-foreground` next to
the controls.

Choice, in one line: **pagination** instead of virtualization (which needs a library and a
measured row height, for lists of hundreds, not thousands) and instead of a fixed height with
internal scrolling (nested scrolling on a phone is the worst of the three and it hides the total,
which here is information: the coordination team needs to know there are 84 students). It applies
the same way in the ≥768px table and in the <768px card list, with the same controls.

The CSV exports **every** row of the filter, not the current page.

> Fixes defects 5, 6 and 7.

---

## 8. Touch and target size

- **44×44 CSS px minimum** for any interactive element below 768px. `h-11` on mobile, `md:h-9` on
  desktop, on button, field, select and icon button. `Button` is `h-9` at every width today
  (`button.tsx:22`), so the mobile screen passes `className="h-11 md:h-9"` until `size` gains the
  responsive variant.
- **8px minimum between adjacent targets** (`gap-2`). A 44px target with 4px of slack produces a
  wrong tap, and a wrong tap during roll call is an absence recorded against the wrong student.
- **Form field at `text-base` (16px) up to `md:text-sm`.** Below 16px iOS zooms in and shifts the
  screen. `Input` already gets it right (`input.tsx:11`); the `select` in `ReportsCenter.tsx:29`
  is fixed at `text-sm`, which is a bug: fix it to `text-base md:text-sm`.
- **Every field has a visible `<label>`.** The date `<select>` floating with no label and no
  border (defect 6) does not exist in this language: label in
  `text-xs font-medium text-muted-foreground` above, field with `border border-input`, always.
- **Thumb reach at 375px.** The screen's primary action lives in the bottom third, in a fixed bar:
  `sticky bottom-0 border-t border-border bg-card px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]`.
  The top-right corner takes only a secondary or destructive action: it is the hardest zone to
  reach one-handed, and it is where an accidental tap costs the most.
- **Safe area**: every route layout respects `env(safe-area-inset-*)` in the fixed footer and in
  the navigation bar.
- **Visible focus is never removed.** `focus-visible:ring-[3px] focus-visible:ring-ring/50` is
  already the default in the `shared/ui` components; `outline-none` with no replacement is
  forbidden.
- **No `hover` as the only carrier of affordance.** A phone has no hover; if the only sign that a
  row is clickable is `hover:bg-muted`, it is not clickable on mobile.

> Fixes defect 6.

---

## 9. Truncation policy

**Never truncate** (`whitespace-nowrap` without `truncate`, or wrapping allowed):

- **A person's name that identifies a row.** Never. This is the hardest rule in the document:
  `Aluno Ch...` (defect 6) makes the row useless; the name is the reason the row exists.
- Numeric value, percentage, grade, currency.
- Phone number and date: `whitespace-nowrap tabular-nums`. A number split in the middle (defect 1)
  is unreadable and cannot be copied.
- Error message and status label.

**May truncate**, always with a `title` holding the full text:

- Class or subject name in a secondary column: `truncate`.
- Long description, note: `line-clamp-2`.
- Name in a breadcrumb (never the last segment).

### The rule that closes the case

**When the name does not fit, the layout is what changes, not the name.**

Name in `line-clamp-2 break-words` (never `truncate`), and the controls drop to the line below in
`flex-col`. In the roll call at 375px that means: the name on a full 343px line, the four status
buttons in `grid-cols-4 gap-2` on the next line, each 79px wide and 44px tall. More readable and
safer to tap than today's `h-10 w-10`, and it costs nothing of the name. The detailed design of
that row belongs to the roll-call screen spec; the rule here is that the name is non-negotiable.

> Fixes defects 1 and 6.

---

## 10. The "do not" list

The exact patterns that produced the seven defects. If you write one of these, you are
reintroducing a bug that is already catalogued.

1. **Do not** put three or more label+value pairs in a `grid-cols-*` with a uniform gap. Stack
   them. *(defect 1)*
2. **Do not** let a missing value inherit the classes of a present one. `—` is never
   `text-2xl font-bold`. Use `EmptyValue`. *(defect 2)*
3. **Do not** concatenate two pieces of data into one string inside the same text element
   (`` `${a} de ${b}` ``). They are two sibling elements, and that is what stops the value from
   breaking in the middle. *(defect 1)*
4. **Do not** give `h-full`, `min-h-*` or `flex-1` to a container whose child is an empty state.
   *(defect 3)*
5. **Do not** use `bg-muted` without a border as a content container. *(defect 4)*
6. **Do not** nest a card inside a card, or put `shadow-sm` on something that is not a card.
   *(defect 4)*
7. **Do not** let a layout stop at `md:grid-cols-2` when there are 3+ comparable blocks and the
   screen is 1280px wide. *(defect 5)*
8. **Do not** use `truncate` on a person's name. Never, at any width. *(defect 6)*
9. **Do not** shrink the content to fit the controls. Move the controls to another line.
   *(defect 6)*
10. **Do not** use `overflow-x-auto` to "solve" a table on a phone. Below 768px, a table becomes a
    card list. *(defect 6)*
11. **Do not** render an unbounded collection. Every list paginates at 20. *(defect 7)*
12. **Do not** use `<select>` or `<input>` with `text-sm` on mobile: iOS zooms in. *(defect 6)*
13. **Do not** use color as the only carrier of meaning, and do not use the brand color for a
    status.
14. **Do not** use uppercase outside `<th>`, or `font-bold` (700) anywhere.
15. **Do not** write a raw hex, an arbitrary spacing value (`p-[13px]`), or
    `text-theme-*` / `text-title-*`.

---

## shadcn registry components to add

Only what is missing, with the reason. Nothing hand-rolled that the registry already delivers.

| Component | `pnpm dlx shadcn@latest add …` | Why |
|---|---|---|
| `card` | `card` | The `rounded-xl border bg-card p-4 shadow-sm` pattern is copied across ~10 files. Centralizing it is what makes §6 hold by construction instead of by discipline. |
| `pagination` | `pagination` | Required by §7. Brings `aria-current` and navigation semantics ready-made. |
| `skeleton` | `skeleton` | Table and list loading (§5). For that only. |

**Do not** add now: `progress` (the bar is static and decorative, two `div`s cover it),
`sheet`/`drawer` (no screen asks for one), `tooltip` (the native `title` covers the truncation
case), `separator` (`border-t` covers it).

`EmptyValue` (§4) is the only new component of our own: the registry has no equivalent, and it is
six lines. It goes in `src/shared/ui/empty-value.tsx`.

---

## What is deliberately left to the screen specs

Stated here so it does not look like a gap:

- **Content order and choice**: which indicators appear, in what sequence, which columns the table
  has. This document defines how an indicator looks, not which indicator matters.
- **Layout of the roll-call row at 375px**: the rule here is "the name does not truncate" (§9);
  the exact arrangement of the four buttons belongs to the roll-call screen spec.
- **Charts (ApexCharts)**: chart type, axes, series and legends follow the `dataviz` skill. From
  this document they inherit only the palette (§3), the label scale (§1) and the container (§6).
- **Copy**: each screen spec writes its own text. The inherited rules are sentence tone, active
  voice, and the API `message` never reaching the screen.
- **Navigation and app shell** (sidebar, header, breadcrumb): out of scope for this language,
  handled in a spec of their own.
- **Dark mode**: does not exist in v1. No new `dark:` class.
