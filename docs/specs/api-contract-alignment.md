# API contract alignment

Linear: SPA-292. Prerequisite for every fetcher migration that follows.

## Why the enum keys changed

The radarge-api emits English enum values. Two front-end enums still carried the
Portuguese keys the localStorage prototype was born with:

| Field | Was | Now |
| -- | -- | -- |
| `Group.shift` | `manhã`, `afternoon`, `evening` | `morning`, `afternoon`, `evening` |
| `Subject.area` | `exatas`, `biologicas`, `linguagens`, `humanas` | `exact_sciences`, `biological_sciences`, `languages`, `humanities` |

`shift` was already half-migrated — only `manhã` diverged. The other six enums in
`entities/*/model.ts` (attendance status, evaluation type, school event type, role,
authorization status, payment status) already matched the contract and were left alone.

**The key changed, the text did not.** `shiftLabels` and `areaLabels` still render
"Manhã" and "Exatas". The UI is Portuguese by project rule; only the wire value is
English. Any screen that displayed a raw enum value would now leak an English string,
which is why the labels are the single rendering path.

## Why the storage key was bumped

`shared/lib/storage/db.ts` carries its own rule: bump the key whenever the seed shape
changes. The seed now writes `area: "exact_sciences"`, so a browser still holding
`radarge.db.v11`'s predecessor would feed `"exatas"` into `subjectSchema.parse` and
throw on first render. Bumping to `radarge.db.v11` and listing `radarge.db.v10` as
legacy discards the stale blob instead of crashing on it.

This is transitional: the store and its seed are deleted in SPA-301.

## Why the password floor moved to 8

The API rejects anything shorter. Six was the prototype's floor and does not survive a
system holding the name, birth date and guardian phone of a minor. The client validates
at 8 so the error arrives before the request, not as a round trip — the API remains the
authority either way.

Three places enforce it: the zod-adjacent guard in `entities/profile/api.ts`, and the
`minLength` attribute on both password inputs (`ProfileFormModal`, `ProfilesAdmin`).
The browser attribute is UX, not a guarantee.

## No data migration

Everything that exists today is localStorage seed data. There is no production row to
migrate.
