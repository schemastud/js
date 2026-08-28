# The source-blind boundary, and why the gate checks identifiers

`@schemastud/big-calendar` is the commodity view engine: it renders whatever
`FoundationCalendarEvent[]` it is handed, emits generic intents, and delegates vocabulary,
chrome and transport to injected slots. Its whole value is that a second consumer — one with
no compositions, no channels, no releases — can mount it unchanged.

`scripts/check-imports.mjs` is the gate. Run it with `npm run lint:imports`.

## ⚠️ The gate used to check imports only, and it passed while the seam leaked

For its whole life the deny-list scanned `import` lines: no `@/…`, no `sonner`, no `axios`,
no `ziggy-js`, no `@inertiajs/*`, no `@splicewire/*`. It reported success continuously — and
during that time `src/types.ts` declared:

```ts
export interface FoundationCalendarEvent {
    compositionId: string;   // required, top-level
}
export interface CalendarClient<E> {
    createRelease(input: …): Promise<E>;
}
```

in a package whose own file header says it "never learns that 'calendar'/'composition'/
'channel' exist".

**Vocabulary does not need an import to leak.** It leaks through the type surface, which is
the only part of a foundation package a consumer is *forced* to speak. A consumer can ignore
every export except the types; it cannot ignore the types. So a gate that inspects imports
and calls the result "source-blind" reports success by not measuring the thing it exists to
measure — the estate's recurring defect class, in its quietest form.

## How the leak announced itself

The satellite's adapter (`@splicewire/beam-calendar`, `src/mapEvent.ts`) had to write:

```ts
sourceId: owningCalendarId,                       // was: compositionId
referencedCompositionId: dto.composition_id,      // the ACTUAL composition, in meta
```

The field named `compositionId` was being filled with an owning **calendar** id, while the
real composition was parked in the `meta` bag — under a docblock explaining the discrepancy.

**A field whose name needs an apology is the wrong name.** That docblock was the bug report;
it just wasn't filed as one. When an adapter has to explain why it is filling a field with
something other than what the field is called, the boundary has already been crossed.

## What the gate checks now

Two deny-lists, applied differently:

| list | scope | catches |
|---|---|---|
| `FORBIDDEN` | whole line | app-local paths, toast/transport/route libs, Inertia, `@splicewire/*` |
| `FORBIDDEN_VOCAB` | **code only** | `compositionId`, `createRelease`, `Release`, `composition`, `channelId` |

**Prose is exempt, deliberately.** A comment may say "a composition" while explaining what a
consumer maps in — that documents the seam rather than crossing it. `codeOnly()` strips
comments and string literals before the vocabulary scan. Without that exemption the gate
would fail on its own explanatory docblocks, and the cheapest way to make it pass would be to
delete the explanation — the opposite of what should happen.

`resource` is deliberately **not** on the list: react-big-calendar's own lane API is called
`resources`, so banning it would fail on the vendor's vocabulary rather than on ours.

## The foundation's vocabulary

| foundation | consumer's domain |
|---|---|
| `sourceId` | the owning calendar / composition / whatever owns the entry |
| `laneId` | a channel |
| `event` | a Release, a cell, an entry |
| `occurrence` (non-resident) | a virtual series instance |
| `meta` | everything else — the foundation never reads it |

## Adding a term

Add it to `FORBIDDEN_VOCAB` with the foundation's replacement named in the `why`. An error
that says only "forbidden" makes the author delete the line; one that names the neutral
equivalent makes them fix the seam.

## The twin — and the axis it is NOT a twin on

`@splicewire/beam-workflows` carries a sibling gate. It is deliberately **not** extended to
vocabulary, and it should not be.

The two gates share the **host-coupling** half — no `@/…`, no sonner, no axios, no ziggy-js, no
Inertia — and that is all "twin" ever meant. This package carries one extra rule (`@splicewire/*`,
now plus the vocabulary list) because it makes one extra claim.

`beam-workflows` never made that claim. It is `@splicewire/*`, product tier, describing itself as
*"the workflows-**domain** beam surfaces… mirrors the PHP package **by domain**… type off the
generated `Workflow*` projections"*, and it says **portable and tenancy-agnostic**, never
source-blind. Its own gate has no `@splicewire/*` rule at all, and its types say `Workflow` 35
times.

Extending the vocabulary list there would enforce a rule the package never adopted — this file's
own defect in reverse: an instrument reporting violations of a claim nobody made. It would fail on
`Workflow` in a package whose entire job is workflows.

**The test for a third package is the claim, not the family.** Read what it says it is before
pointing this gate at it.
