import type { ComponentType } from 'react';

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
export type FilterControl =
    | 'text'
    | 'select'
    | 'multiselect'
    | 'search'
    | 'date-range'
    | 'number-range';

export interface FilterInlineOption {
    value: string | number | boolean;
    label: string;
}

export interface FilterDescriptor {
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

export interface SortDescriptor {
    /** The `sort` query field name (used as `<name>` asc / `-<name>` desc). */
    name: string;
}

export interface FilterSchemaProperty {
    title?: string;
    'x-filter'?: FilterDescriptor;
    'x-sort'?: SortDescriptor;
}

export interface FilterSchema {
    properties: Record<string, FilterSchemaProperty>;
}

export interface FilterOption {
    value: string;
    label: string;
}

/**
 * The query-parameter shape a Saved Filter stores/applies — the same
 * `filter[...]` / `sort` encoding the facets bar and URL round-trip through.
 */
export interface SavedFilterQueryParameters {
    filter?: Record<string, string>;
    sort?: string;
}

export interface SavedFilter {
    id: string;
    name: string;
    resource: string;
    query_parameters: SavedFilterQueryParameters;
    visibility: string;
    is_default: boolean;
}

/**
 * Injected transport — the host provides its own authed client; this package
 * never imports one.
 *
 * Note the shape divergence from the `@schemastud/seam` precedent: seam injects a
 * single async function (`schemaFetcher: (ref) => Promise<SchemaNode>`), because a
 * form needs exactly one operation (resolve a $ref). A list surface needs five
 * distinct operations, so facets injects a *named-method transport object* rather
 * than a bare function. This is the first learning frame's shell contract inherits:
 * the transport seam is per-capability, not one-size.
 */
export interface FacetsTransport {
    getFilterSchema(resource: string): Promise<FilterSchema>;
    getFilterOptions(ref: string, search: string): Promise<FilterOption[]>;
    getSavedFilters(resource: string): Promise<SavedFilter[]>;
    saveFilter(
        resource: string,
        payload: { name: string; query_parameters: SavedFilterQueryParameters },
    ): Promise<SavedFilter>;
    deleteSavedFilter(resource: string, id: string): Promise<void>;
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
export interface FacetsPrimitives {
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
export type UrlStateSetter = (updater: (prev: URLSearchParams) => URLSearchParams) => void;
export type UseUrlState = () => readonly [URLSearchParams, UrlStateSetter];

/** The full injection bundle a host supplies once via {@link FacetsProvider}. */
export interface FacetsInjection {
    transport: FacetsTransport;
    primitives: FacetsPrimitives;
    useUrlState: UseUrlState;
}
