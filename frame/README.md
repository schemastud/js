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

`src/cards/` ships the seven default card widgets by `x-widget` name: `stat-row`, `figure-card`,
`recent-list`, `record-line`, `nav-tile`, `dashboard-card`, `trend-card`. A host installs them with one call on
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
`trend-card` is also named-only: it draws a summary's figures as a period series (each figure one
period, in order), with every figure marked `forecast: true` drawn as a dashed segment, and a
visually hidden table as its text alternative. Values plot when they are numbers or plain decimal
strings; a formatted string is a gap in the line and keeps its value in the table.
`iconFor` maps icon names to glyphs;
`renderLink` is the host's navigation primitive (absent, a card draws a plain `<a href>`).
A realm dashboard is one read-only resource of card rows rendered through these widgets:
`splicewire/laravel-beam docs/adr/0222-a-realm-dashboard-is-one-read-only-resource-per-realm-of-card-rows.md`.

## The `manifestFor` seam

`ManifestLookup` (`src/types.ts`) is `(resource: string) => ContextManifest | undefined`. The
mount dispatcher's `manifestFor` option and the injection's `manifestFor` are the same function:
a host wires one lookup and both the shells (whose `list-column` participation is the column set)
and the cards (`RecentList`, `DashboardCard` resolving a target resource's manifest) read it.

## Route, guard and shell registries

`createRouteRegistry()`, `createGuardRegistry()` and `createShellRegistry()` (`src/routes.ts`) bind a name
the server declares to the component a host mounts for it: a `routeName` to its page, a `guard` key to its
guard, a `shell` key to its layout. Each call makes its own registry. Each is a
[`@schemastud/registry`](../registry/README.md) registry, rooted at `frame.routes`, `frame.guards` and
`frame.shells`.

**Duplicate policy: `Supersede`, declared.** Registering a name that is already bound replaces the binding.
The later component wins and keeps the earlier one's place in `routeNames()`. Nothing throws. That is what
these registries did as plain maps; what is new is that the policy is declared and the displaced binding is
recorded.

```ts
const routes = createRouteRegistry();

routes.registerRoute('tenants.index', TenantsList, '@splicewire/tower-ux');
routes.registerRoute('tenants.index', HostTenantsList, 'app/host'); // replaces, in place

routes.resolveRoute('tenants.index');       // HostTenantsList
routes.routeRegistrant?.('tenants.index');  // 'app/host'
routes.supersededRoutes?.('tenants.index'); // [{ component: TenantsList, by: '@splicewire/tower-ux', supersededBy: 'app/host' }]
```

- **The registrant is optional.** The third argument of `registerRoute`, `registerGuard` and `registerShell`
  names who is registering, such as a package name. Left out, the registrant reads back as `null`.
- **Reading it back.** `routeRegistrant(name)` and `supersededRoutes(name)`, with `guardRegistrant` /
  `supersededGuards` and `shellRegistrant` / `supersededShells` beside them. They are optional members of the
  interface types, so a hand-written registry or a test double still satisfies the type. A registry from one
  of the three factories always has them.
- **A miss is `undefined`.** A name nothing is bound to resolves `undefined`, and so does a name that only
  prefixes bound names (`tenants`, with `tenants.index` bound). `buildRealmRoutes` relies on both: an unbound
  route falls to `fallback` and then `onUnbound`, and an unbound guard refuses the leaf.
- **Any string is a name.** `Admin/Users`, `DocsLayout` and the empty string bind and resolve as they did in
  a map. A name is compared exactly: no case folding, no trimming. A read handed something that is not a
  string (a manifest entry with no `routeName`) misses and does not throw. A registration handed one binds it
  under its string form, so `registerRoute(5, C)` is found by `'5'` and not by `5`; a map found it by `5`.
- **A route the server sends twice still throws.** `assertRouteContext` refuses a `routeName` that appears
  twice in a `RouteContext`. That is a duplicate in the manifest, which no host can override. A host binding
  a name twice is an override, so it is allowed.

**Who relied on replacing.** Before the policy was declared, callers were searched for a name bound twice
in one registry (2026-11-18).

- The search: `git grep -n -E '\.(registerRoute|registerGuard|registerShell)\('` over every tracked file of
  this repository, and `grep -rn -E '(registerRoute|registerGuard|registerShell)\b'` over the `src` of the 18
  `beam-*` packages of the beam JS workspace, of `splicewire/tower-ux` and of the flagship's `ui`. A second
  search, for any file naming the factories or the three interface types under `~/Workspaces/js/packages`,
  `~/Herd` and `~/Workspaces/laravel/starters`, found callers in those three repositories only.
- No call site binds a literal name twice in one registry. The flagship binds `beam-ux-entry.index` on two
  lines of `ui/src/app/routeRegistry.tsx`, in the two arms of one `if`.
- One call site can bind a name twice at run time. beam-inertia's `src/frame/router.tsx` binds a list leaf's
  create route and read-detail route by names taken from the manifest, once per list leaf. Two list leaves of
  one resource in one shell that share a route-name stem would bind those names twice. The read-detail
  bindings are equivalent. The create bindings are not: each one's `onSaved` returns to its own list leaf's
  path, so the later leaf's return path wins, as it did in a map. Under `Reject` that would throw at mount.
- The search found no test, here or in those three repositories, that binds a name twice.
- What the zero means: no call site, as written, depends on replacement. It does not show that no host does.
  The search reads calls spelled with the method's own name, so a binding made through an alias, and any host
  outside the searched roots, is not covered. `Supersede` is declared because it is what the registries
  already did and a host re-binding a package's name is an override, not because the search found nobody.

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

See [schema purpose](docs/schema-purpose.md) for separate write/read projection, presentation, cache and compatibility, and the independent Frame example.

### Message locale and diagnostics

Date cells use the outer message provider's locale. Without a message provider,
DateCell uses `en-US`; it no longer selects the browser locale implicitly. This
is an intentional change from the previous browser-dependent date display.

Errors from `useResourceAction` about unavailable actions or missing record IDs,
and `resourceTransport` errors about missing saved-view addresses, are developer
diagnostics describing invalid integration calls. Their stable English Error
messages remain unchanged. Server-authored error messages pass through unchanged.
Default frame notices and rendered picker/card copy use the frame catalog.

Counted defaults now select singular and plural forms (`1 node` and `1 resource`,
correcting the earlier `1 nodes` / `1 resources`). Selection summaries emphasize
only the count; their matching-total suffix now shares the surrounding text tone
instead of a separate muted span. Set summaries translate the whole exclusion
sentence together and emphasize that complete summary. Rich elements are rendered
after scalar substitution; catalogs do not contain HTML or React elements.
