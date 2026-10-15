import * as react from 'react';
import { ComponentType, ReactNode } from 'react';
import * as _tanstack_react_query from '@tanstack/react-query';

/**
 * Canonical `x-filter` / `x-sort` vendor-keyword shapes.
 *
 * These mirror the emission of the `rushing/laravel-data-filters` PHP spine
 * (`Rushing\DataFilters\Operators\Operator::keyword()` and the per-operator
 * `toControl()` overrides). The canonical source of truth is co-located with the
 * operators at:
 *
 *     laravel-data-filters/resources/types/filter-schema.ts
 *
 * and a PHP conformance test (`FilterSchemaTypeConformanceTest`) fails if the
 * operator emission drifts from that declaration. This copy is the npm-side
 * vendoring of that canonical file; keep the two in lockstep. A future zero-drift
 * single-source (an operator-emission → TS collector wired into the app's
 * `typescript:transform` step) is a frame/PRD decision, not built in this tracer.
 *
 * Drift corrected relative to the app's former hand-written types:
 *   - `control` now carries the full operator range, including `date-range` /
 *     `number-range` (emitted by the Range operator);
 *   - `options` (inline finite-domain options from backed enums / bools) is
 *     modelled — the former types only knew the relational `optionsRef` path.
 */
type FilterControl = 'text' | 'select' | 'multiselect' | 'search' | 'date-range' | 'number-range';
interface FilterInlineOption {
    value: string | number | boolean;
    label: string;
}
interface FilterDescriptor {
    /** The operator name — `exact` | `partial` | `range` | `set` | `search` | `scope`, plus host operators (e.g. `any_tags`). */
    operator: string;
    /** The `filter[<name>]` query key. */
    name: string;
    control: FilterControl;
    /** Relational options: the named Options Source key resolved via transport. */
    optionsRef?: string;
    valueKey?: string;
    labelKey?: string;
    searchable?: boolean;
    /** Inline finite-domain options (backed enum / bool), emitted in place of `optionsRef`. */
    options?: FilterInlineOption[];
}
interface SortDescriptor {
    /** The `sort` query field name (used as `<name>` asc / `-<name>` desc). */
    name: string;
}
interface FilterSchemaProperty {
    title?: string;
    'x-filter'?: FilterDescriptor;
    'x-sort'?: SortDescriptor;
}
interface FilterSchema {
    /** Application capability metadata, normalized from the schema response envelope. */
    savedViewsResource?: string;
    savedViewsCan?: ResourceMutationPermissions;
    properties: Record<string, FilterSchemaProperty>;
}
interface ResourceMutationPermissions {
    create: boolean;
    update: boolean;
    delete: boolean;
}
interface FilterOption {
    value: string;
    label: string;
}
interface FilterVariant {
    key: string;
    resource: string;
    canonical: boolean;
    sameAsCanonical: boolean;
}
interface FilterVariants {
    resource: string;
    variants: FilterVariant[];
}
/**
 * The query-parameter shape a Saved Filter stores/applies — the same
 * `filter[...]` / `sort` encoding the facets bar and URL round-trip through.
 */
interface SavedFilterQueryParameters {
    filter?: Record<string, string>;
    sort?: string;
    filterVariant?: string;
}
interface SavedFilter {
    id: string;
    name: string;
    resource: string;
    queryParameters: SavedFilterQueryParameters;
    visibility: string;
    isDefault: boolean;
    /** Server-authorized mutations for this record, including ownership checks. */
    can?: ResourceMutationPermissions;
}
/**
 * Injected transport — the host provides its own authed client; this package
 * never imports one.
 *
 * Note the shape divergence from the `@schemastud/seam` precedent: seam injects a
 * single async function (`schemaFetcher: (ref) => Promise<SchemaNode>`), because a
 * form needs exactly one operation (resolve a $ref). A list surface needs several
 * distinct operations, so facets injects a *named-method transport object* rather
 * than a bare function. This is the first learning frame's shell contract inherits:
 * the transport seam is per-capability, not one-size.
 */
interface FacetsTransport {
    getFilterSchema(resource: string, variant?: string): Promise<FilterSchema>;
    getFilterVariants(resource: string): Promise<FilterVariants>;
    /**
     * Resolve a named options source for a resource. `resource` was added when the filter surface
     * became per-resource (splicewire api-surface-coherence 35): the flat, resource-less options
     * route it replaced had nothing to authorize against and enumerated every value list to any
     * authenticated caller.
     */
    getFilterOptions(resource: string, ref: string, search: string): Promise<FilterOption[]>;
    getSavedFilters(resource: string, variant?: string): Promise<SavedFilter[]>;
    saveFilter(resource: string, payload: {
        name: string;
        queryParameters: SavedFilterQueryParameters;
    }): Promise<SavedFilter>;
    deleteSavedFilter(resource: string, id: string, variant?: string): Promise<void>;
}
/**
 * Injected UI primitives — the host's shadcn/Radix (or any) component set.
 *
 * This has NO precedent in `@schemastud/seam`: seam renders through RJSF's theme,
 * so it never injects primitives. The facets bar renders bespoke chrome (chips,
 * popovers, a sort control) directly, so it must receive the primitives. This is
 * the second, load-bearing learning for frame's slot contract — a batteries-UX
 * rung needs a *primitive-injection* seam the mechanism rung lacks. Typed as
 * `ComponentType<any>` for the tracer; a precise per-primitive prop contract is a
 * frame-design task, not a tracer one.
 */
interface FacetsPrimitives {
    Button: ComponentType<any>;
    Input: ComponentType<any>;
    Label: ComponentType<any>;
    Popover: ComponentType<any>;
    PopoverTrigger: ComponentType<any>;
    PopoverContent: ComponentType<any>;
    SimpleSelect: ComponentType<any>;
    Badge: ComponentType<any>;
}
/**
 * Injected URL-state seam — the third coupling, one seam never had.
 *
 * The list surface reads/writes `filter[...]` + `sort` on the URL. In the app that
 * is react-router's `useSearchParams`, but the package must not hard-depend on a
 * router. The host injects a hook returning the current params plus a functional
 * setter. This is the third learning: a batteries-UX rung that owns URL state is
 * router-coupled unless the router is injected too.
 */
type UrlStateSetter = (updater: (prev: URLSearchParams) => URLSearchParams, options?: {
    replace?: boolean;
}) => void;
type UseUrlState = () => readonly [URLSearchParams, UrlStateSetter];
/** The full injection bundle a host supplies once via {@link FacetsProvider}. */
interface FacetsInjection {
    transport: FacetsTransport;
    primitives: FacetsPrimitives;
    useUrlState: UseUrlState;
    /** Optional host restriction, applied in addition to the server's permission. */
    can?: (action: 'create' | 'update' | 'delete', resource: string, record?: unknown) => boolean;
}

declare function FacetsProvider({ value, children, }: {
    value: FacetsInjection;
    children: ReactNode;
}): react.JSX.Element;
declare function FacetsResourceProvider({ resource, children, }: {
    resource: string;
    children: ReactNode;
}): react.JSX.Element;
/**
 * The resource in scope. Null outside a `FacetsBar` — a caller using the hooks standalone passes
 * the resource itself.
 */
declare function useFacetsResource(): string | null;
/** Read the injection bundle; throws if a facets hook/component renders outside a provider. */
declare function useFacetsInjection(): FacetsInjection;

/**
 * The facets bar: a compact, inline chip bar over the same `x-filter`/`x-sort` schema
 * the old FilterPanel consumed — but nothing is expanded until a chip is clicked. It
 * carries a Search input, one chip per active filter (click to edit in a scoped
 * popover, ✕ to clear), a `+ Filter ▾` affordance to add a facet, and a Sort control.
 * State stays bidirectional with the `filter[...]`/`sort` query string — the caller
 * owns URL serialization. Renders through host-injected primitives (SimpleSelect /
 * hand-rolled anchored panels), never a native `<select>`.
 */
declare function FacetsBar({ resource, schema, values, sort, onFilterChange, onSortChange, }: {
    /**
     * The resource key this bar filters. Required since the filter endpoints became per-resource
     * (splicewire api-surface-coherence 35) — the options lookup a facet performs now needs a
     * resource to address, and to be authorized against. Provided to the leaves through
     * `FacetsResourceProvider` rather than threaded as a prop through the chip-rendering tree.
     */
    resource: string;
    schema: FilterSchema;
    values: Record<string, string>;
    sort: string | null;
    onFilterChange: (name: string, value: string | null) => void;
    onSortChange: (value: string | null) => void;
}): react.JSX.Element;

/**
 * A type-ahead picker over declared inline options or an Options Source, composed from
 * an Input, results and removable chips. Finite enum/bool options search locally;
 * relational options resolve through `optionsRef` with server-side type-ahead.
 *
 * Serves both cardinalities off the descriptor's `control`: `multiselect` accrues a
 * comma-joined id set, `select` holds a single relational id (replace-on-pick,
 * closes the list after choosing) — e.g. "Produced By Circuit", which filters
 * Fragments to one circuit's lineage.
 */
declare function MultiSelectFilter({ descriptor, value, onChange, onLabelsResolved, }: {
    descriptor: FilterDescriptor;
    value: string;
    onChange: (value: string | null) => void;
    onLabelsResolved?: (labels: Record<string, string>) => void;
}): react.JSX.Element;

/**
 * Save the current facets-bar state as a named view and recall it — CRUD against the
 * host's Saved Filter transport, operating purely on the same filter[...]/sort
 * encoding. Works on any resource key mounted via the generalized bar. Applying loads
 * a view's parameters back into the bar state; a save naming an unknown filter
 * surfaces the endpoint's 422 as a field-level message.
 */
declare function SavedViews({ resource, current, onApply, }: {
    resource: string;
    current: SavedFilterQueryParameters;
    onApply: (params: SavedFilterQueryParameters) => void | Promise<void>;
}): react.JSX.Element | null;

/**
 * The one keystone hook every list surface mounts to get the generalized facets
 * bar. Given only a `resource` key it owns the whole URL⇄filter contract: it
 * fetches the resource's generated `x-filter`/`x-sort` schema, decodes the
 * `filter[...]`/`sort` query string into panel state, derives the sortable-field
 * set from the schema (never hand-authored), applies a saved view by replacing the
 * filter/sort state wholesale (pruning keys the resource no longer declares so an
 * old view still applies), and reports whether the *filter/sort* params actually
 * changed, so a list dims only on a real re-filter, not on every background
 * refetch.
 *
 * A page becomes pure wiring: call `useListFilters('<resource>')`, spread
 * `requestParams` into its list query, render `<ListFilters {...listFilters} />`,
 * and pass `{ sortableFields, sort, onSortChange }` to the DataTable's `sorting`
 * prop. New resources need nothing more than a registered key.
 *
 * The URL read/write goes through the host-injected `useUrlState` seam (react-router
 * in the app), so this package carries no router dependency.
 */
interface ListFilters$1 {
    resource: string;
    schema: FilterSchema | undefined;
    variants: FilterVariant[];
    filterVariant: string | null;
    onVariantChange: (variant: string | null) => void;
    /** All query params, including filterVariant, for the ordinary list request. */
    requestParams: Record<string, string>;
    /** Decoded `filter[...]` values, keyed by each descriptor's query name. */
    filterValues: Record<string, string>;
    /** The comma-joined `sort` param, or null. */
    sort: string | null;
    /** The `x-sort` field names the resource declares — the DataTable's sortable set. */
    sortableFields: Set<string>;
    /** Set/clear one filter facet. */
    onFilterChange: (name: string, value: string | null) => void;
    /** Set/clear the shared `sort` param. */
    onSortChange: (value: string | null) => void;
    /** Apply a saved view, pruning keys the resource no longer declares. */
    applyView: (params: SavedFilterQueryParameters) => Promise<void>;
    /**
     * The current filter/sort/variant fingerprint — changes when query behavior changes.
     * Feed it plus the list query's `isFetching` to `useFilterChangeDim` for the
     * DataTable's `loading`, so the table dims on a real re-filter but not on a
     * background refetch (poll / window-focus).
     */
    filterFingerprint: string;
}
declare function useListFilters(resource: string): ListFilters$1;
/**
 * Whether a list should show its dim/cross-fade — true only while a fetch triggered
 * by a genuine filter/sort change is in flight. Latches the fingerprint that was
 * current when the last fetch settled; a background refetch (poll, window-focus)
 * keeps the same fingerprint and so never dims.
 */
declare function useFilterChangeDim(fingerprint: string, isFetching: boolean): boolean;

/** Render the declared filter vocabulary, with saved views only when advertised. */
declare function ListFilters(state: ListFilters$1): react.JSX.Element | null;

declare function useFilterSchema(resource: string, variant?: string): _tanstack_react_query.UseQueryResult<FilterSchema, Error>;
declare function useFilterVariants(resource: string): _tanstack_react_query.UseQueryResult<FilterVariants, Error>;
/**
 * Options Source client: resolve a named Options Source (silos, tags, …) to its
 * rows, with type-ahead via `search`. Cached per (ref, search) for the session.
 */
declare function useFilterOptions(ref: string | undefined, search: string, resource?: string): _tanstack_react_query.UseQueryResult<FilterOption[], Error>;
declare function useSavedFilters(resource: string, enabled?: boolean, variant?: string): _tanstack_react_query.UseQueryResult<SavedFilter[], Error>;
declare function useSaveFilter(resource: string): _tanstack_react_query.UseMutationResult<SavedFilter, Error, {
    name: string;
    queryParameters: SavedFilterQueryParameters;
}, unknown>;
declare function useDeleteSavedFilter(resource: string, variant?: string): _tanstack_react_query.UseMutationResult<void, Error, string, unknown>;

/**
 * The one shared sort vocabulary for both the facets-bar Sort control and the
 * host DataTable's sortable column headers. A sort is an ordered list of keys,
 * each `field` (ascending) or `-field` (descending), serialized as a single
 * comma-joined `sort` query param — e.g. `sort=-createdAt,name` = createdAt
 * descending then name ascending. This is exactly the shape Spatie query-builder
 * parses, so header state and the Sort menu round-trip through the URL over one
 * param and can never define a competing mechanism.
 */
interface SortKey {
    /** The `x-sort` field name (never prefixed). */
    field: string;
    desc: boolean;
}
/** Parse a comma-joined `sort` param into its ordered keys. Empty/null → []. */
declare function parseSort(sort: string | null | undefined): SortKey[];
/** Serialize ordered keys back to the comma-joined param. Empty → null (clears it). */
declare function serializeSort(keys: SortKey[]): string | null;
/**
 * Apply a header click to the current keys and return the next ordered list.
 *
 * - Plain click: the field becomes the *sole* sort, cycling asc → desc → cleared
 *   when it's already the only active key; otherwise it replaces the whole sort.
 * - Shift-click (`append`): the field joins/updates the ordered list without
 *   dropping the others, cycling asc → desc → removed in place — its ordinal
 *   position is preserved across the asc→desc toggle.
 */
declare function toggleSortKey(keys: SortKey[], field: string, append: boolean): SortKey[];
/** The current sort state for one field, for rendering its header affordance. */
declare function sortStateFor(keys: SortKey[], field: string): {
    active: boolean;
    desc: boolean;
    index: number;
};

declare function transportScope(transport: object): string;

/** Shared browser subscription; hosts with a router can inject its own equivalent. */
declare const useBrowserUrlState: UseUrlState;

export { FacetsBar, type FacetsInjection, type FacetsPrimitives, FacetsProvider, FacetsResourceProvider, type FacetsTransport, type FilterControl, type FilterDescriptor, type FilterInlineOption, type FilterOption, type FilterSchema, type FilterSchemaProperty, type FilterVariant, type FilterVariants, ListFilters, type ListFilters$1 as ListFiltersState, MultiSelectFilter, type ResourceMutationPermissions, type SavedFilter, type SavedFilterQueryParameters, SavedViews, type SortDescriptor, type SortKey, type UrlStateSetter, type UseUrlState, parseSort, serializeSort, sortStateFor, toggleSortKey, transportScope, useBrowserUrlState, useDeleteSavedFilter, useFacetsInjection, useFacetsResource, useFilterChangeDim, useFilterOptions, useFilterSchema, useFilterVariants, useListFilters, useSaveFilter, useSavedFilters };
