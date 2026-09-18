# @schemastud/frame

The **agnostic resource scaffolding runtime** atop `@schemastud/seam` + `@schemastud/facets`:
resource-blind `ListShell` / `EditShell`, a three-seam injection bundle (transport, design-system
primitives, URL state), layered slots, and a `resolveColumns` seam. The shell renders any resource
from its schema plus a thin manifest entry, with no per-resource UI code. It knows nothing about
Laravel, beam, or any host's models; the PHP half (`schemastud/laravel-frame`) emits the wire
contracts this package consumes.

## Render contexts

Seven render contexts, in three subject grains (`src/contexts.ts`, `FrameContext`):

| grain | contexts | subject |
|---|---|---|
| property | `edit`, `detail`, `list-column`, `row-cell` | one field of one record, under a property pointer |
| record | `list-item` | one whole record (a card body, a row), at pointer `""` |
| collection | `summary`, `overview` | the whole collection, compressed to figures (`summary`) or expanded to a card with a body (`overview`), also at `""` |

"A summary of this record" is `list-item`, not a new context. The PHP projector refuses a record
or collection context on a property, so the client never sees one under a property pointer.
Decision: `schemastud/laravel-frame docs/adr/0003-summary-and-overview-are-collection-render-contexts-and-a-summary-provider-is-a-hidden-resource-slot.md`.

## Cards

`src/cards/` ships the six default card widgets by `x-widget` name: `stat-row`, `figure-card`,
`recent-list`, `record-line`, `nav-tile`, `dashboard-card`. A host installs them with one call on
its seam registry:

```ts
registerCardWidgets(registry, { iconFor, renderLink });
```

`stat-row` and `figure-card` also register as the context defaults for an unbound `summary` /
`overview` node; a declared `x-widget` name always wins, and an unknown name stays honestly
unbound rather than silently taking the default. `record-line` is a named entry only: `RecentList`
picks it by name for a row whose target resource declared no `list-item` widget, and it is never
registered as a `list-item` context default (that predicate would resolve a component for every
participates-but-unbound root and flip tabular list-items into card grids; see `cards/index.ts`).
`iconFor` maps icon names to glyphs;
`renderLink` is the host's navigation primitive (absent, a card draws a plain `<a href>`).
A realm dashboard is one read-only resource of card rows rendered through these widgets:
`splicewire/laravel-beam docs/adr/0222-a-realm-dashboard-is-one-read-only-resource-per-realm-of-card-rows.md`.

## The `manifestFor` seam

`ManifestLookup` (`src/types.ts`) is `(resource: string) => ContextManifest | undefined`. The
mount dispatcher's `manifestFor` option and the injection's `manifestFor` are the same function:
a host wires one lookup and both the shells (whose `list-column` participation is the column set)
and the cards (`RecentList`, `DashboardCard` resolving a target resource's manifest) read it.

## Tailwind sources

Cards and shells emit Tailwind utilities, and Tailwind v4 ignores symlinked `node_modules`, so a
consumer must scan this package's built `dist`:

```css
@source '../../node_modules/@schemastud/frame/dist';
```

The starters derive that line at build time through `familySources()` from `@schemastud/seam/vite`,
which injects one `@source` per family package carrying a `dist`; a host without that plugin adds
the line by hand.

## Verify

- `npm run build` — tsup ESM + `.d.ts`.
- `npm run typecheck` — `tsc --noEmit`.
- `npm test` — vitest.
