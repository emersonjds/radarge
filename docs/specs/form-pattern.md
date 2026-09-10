# Form pattern

Linear: SPA-311. Every form in the panel follows this shape. New forms start here.

Reference implementation: `src/widgets/subjects-admin/SubjectFormModal.tsx`.

## The pieces

| Concern | Where it lives |
| -- | -- |
| Field state and submit | `react-hook-form` `useForm` |
| Validation | `zodResolver` over a `*FormSchema` in the entity's `model.ts` |
| Markup | `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` from `@/shared/ui/form` |
| Select | `@/shared/ui/select`, never a raw `<select>` |
| Failure copy | `messageForError` from `@/shared/lib/api/error-message` |

## Why the form schema is separate from the entity schema

`subjectSchema` parses API responses as well as form input. A validation message on it
would never be read in the response path, and the response path has no business carrying
Portuguese. So each entity exports a second, smaller schema — `subjectFormSchema` — holding
exactly the fields the form collects, with the user-facing messages on them.

It lives in the entity's `model.ts`, next to the entity schema, so a second form over the
same entity reuses it instead of writing a third.

## Why server errors land on `root`, not on a field

The API answers `{ code, message }` and nothing else — there is no field path in the body.
Mapping a failure onto a specific input would mean guessing. So `form.setError("root", …)`
carries it, and the form renders that above the buttons with `role="alert"`.

Field-level problems are caught by the resolver before the request is ever sent, which is
where per-field messages belong.

The server's `message` is never rendered. `messageForError` picks our copy from the `code`,
and every caller passes a fallback for the untyped case.

## Rules

- `noValidate` on the `<form>` — the resolver owns validation, not the browser. The
  `minLength`/`required` attributes are removed as each form migrates.
- `formState.isSubmitting` disables the submit button. No separate `saving` state, and no
  `if (saving) return` guard — RHF already blocks a concurrent submit.
- `defaultValues` always covers every field, so the form is never uncontrolled.
- On a modal, the body component takes `key={entity?.id ?? "new"}` so reopening it for a
  different row remounts with fresh defaults.

## Not covered here

`LoginForm` is rewritten against the API in SPA-284 and adopts this pattern there rather
than being migrated twice.
