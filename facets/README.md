# @schemastud/facets

The schema-driven **facets surface**: a resource-agnostic filter/sort bar that reads
the `x-filter` / `x-sort` vendor keywords a backend emits (the
[`rushing/laravel-data-filters`](https://github.com/rushing/laravel-data-filters) PHP
spine) and renders a batteries-included list-filtering UX — chips, popovers, a sort
control, saved views — with **zero per-resource code**.

This package is a **frame-rung tracer** for the planned `@schemastud/frame`. It exists
to prove, end-to-end, the three injection seams a batteries-UX rung needs on top of the
lean `@schemastud/seam` mechanism rung:

1. **Injected transport** — a named-method `FacetsTransport`, not a bundled HTTP
   client. (Diverges from seam's single-function `schemaFetcher`: a list needs five
   operations, not one.)
2. **Injected UI primitives** — a `FacetsPrimitives` bundle (Button, Input, Label,
   Popover, SimpleSelect, Badge). Seam has no precedent here — it renders through RJSF's
   theme; a bespoke-chrome surface must receive its primitives.
3. **Injected URL-state** — a `useUrlState` hook seam, so the package carries no router
   dependency (the app binds react-router's `useSearchParams`).

## Usage

Provide the injection bundle once at the app root:

```tsx
import { FacetsProvider, type FacetsInjection } from '@schemastud/facets';

const injection: FacetsInjection = { transport, primitives, useUrlState };

<FacetsProvider value={injection}>
    <App />
</FacetsProvider>;
```

Then any list page is pure wiring:

```tsx
import { ListFilters, useListFilters, useFilterChangeDim } from '@schemastud/facets';

function FragmentsPage() {
    const listFilters = useListFilters('fragment');
    const rows = useRows(listFilters.requestParams);
    const dimming = useFilterChangeDim(listFilters.filterFingerprint, rows.isFetching);
    return (
        <>
            <ListFilters {...listFilters} />
            <DataTable data={rows.data} loading={dimming} sorting={listFilters} />
        </>
    );
}
```

## Variants and saved views

`getFilterVariants(resource)` returns `{ resource, variants }`, where each variant declares
`key`, `resource`, `canonical`, and `sameAsCanonical`. The generic list offers selection when
noncanonical variants exist, including when the default vocabulary is empty. Selection calls
`getFilterSchema(resource, variant)` and travels with ordinary list requests as the top-level
`filterVariant` URL parameter. Switching clears filters, sort and page; saved views preserve
the variant and restore only filters and sorts its current schema declares.

Saved-view support comes from the schema response's `savedViewsResource`. Mutation controls
also require server permissions: `savedViewsCan.create` for Save and each saved row's
`can.delete` for Delete. Missing permissions leave readable views applicable and hide the
corresponding mutation. An optional `FacetsInjection.can(action, resource, record?)` can further
restrict those actions; it receives the advertised saved-view resource and, for deletion, the
actual row. `FrameProvider` forwards its existing `can` callback. The backend remains the
authority when a request executes.

## Peers

`react >=18`, `@tanstack/react-query ^5`, `lucide-react`. No router, no HTTP client.

## Canonical types

`FilterDescriptor` / `SortDescriptor` mirror the emission of the `laravel-data-filters`
operators. The canonical source of truth is co-located with the operators at
`laravel-data-filters/resources/types/filter-schema.ts`, and a PHP conformance test
fails if the operator emission drifts from it. Keep this copy in lockstep.

### Transport lifetime and query caching

Keep the injected transport object stable while its realm, tenant and principal are stable.
Replace it when that authority changes. Frame and facets scope cached reads, mutations and
pending saved-view application to that object, so providers may share a QueryClient safely.
Changing credentials inside an existing transport does not change its cache identity.

The implicit identity is opaque and runtime-local. It does not provide a persistent-cache or
SSR hydration protocol. Existing resource query prefixes still support deliberate broad
invalidation; Frame's `resourceQueryKey(transport, resource, ...parts)` builds an exact key
for seeding or targeting one transport. Mutation hooks invalidate their own transport only.
