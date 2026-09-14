import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFacetsInjection } from './context';
import { filterSchemaOptions, useFilterSchema, useFilterVariants } from './data';
import { parseSort, serializeSort } from './sort';
import type { FilterSchema, FilterVariant, SavedFilterQueryParameters } from './types';

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
export interface ListFilters {
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

/** Serialize the filter, sort and variant keys for query-change detection. */
function filterFingerprint(searchParams: URLSearchParams): string {
    const parts: string[] = [];
    for (const [key, value] of searchParams.entries()) {
        if (key.startsWith('filter[') || key === 'sort' || key === 'filterVariant') {
            parts.push(`${key}=${value}`);
        }
    }
    return parts.sort().join('&');
}

export function useListFilters(resource: string): ListFilters {
    const { useUrlState, transport } = useFacetsInjection();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useUrlState();
    const applySequence = useRef(0);
    const queryString = searchParams.toString();
    useLayoutEffect(() => {
        applySequence.current++;
        return () => {
            applySequence.current++;
        };
    }, [resource, queryString]);
    const filterVariant = searchParams.get('filterVariant') || null;
    const schemaQuery = useFilterSchema(resource, filterVariant ?? undefined);
    const variantsQuery = useFilterVariants(resource);
    const schema = schemaQuery.data;

    const requestParams = Object.fromEntries(searchParams.entries());

    const filterValues: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
        const match = key.match(/^filter\[(.+)\]$/);
        if (match) {
            filterValues[match[1]] = value;
        }
    }

    const sort = searchParams.get('sort');

    // The `x-sort` field names the resource declares — the only fields a column
    // header (or the Sort menu) may offer, derived from the schema, never
    // hand-authored.
    const sortableFields = useMemo(
        () =>
            new Set(
                Object.values(schema?.properties ?? {})
                    .map((prop) => prop['x-sort']?.name)
                    .filter((name): name is string => Boolean(name)),
            ),
        [schema],
    );

    const setParam = (key: string, value: string | null) => {
        applySequence.current++;
        setSearchParams((prev) => {
            prev.delete('page');
            if (value === null || value === '') {
                prev.delete(key);
            } else {
                prev.set(key, value);
            }
            return prev;
        });
    };

    // Changing vocabulary or applying a view replaces the current query state,
    // retaining unrelated host URL parameters.
    const clearQuery = (params: URLSearchParams) => {
        for (const key of [...params.keys()]) {
            if (
                key.startsWith('filter[') ||
                key === 'sort' ||
                key === 'filterVariant' ||
                key === 'page'
            ) {
                params.delete(key);
            }
        }
    };

    const onVariantChange = (variant: string | null) => {
        applySequence.current++;
        setSearchParams((previous) => {
            clearQuery(previous);
            if (variant) previous.set('filterVariant', variant);
            return previous;
        });
    };

    const applyView = async (params: SavedFilterQueryParameters) => {
        const sequence = ++applySequence.current;
        // Resolve the saved view's vocabulary before pruning. The currently displayed
        // variant may declare entirely different filters and sorts.
        const selectedSchema = await queryClient
            .fetchQuery(filterSchemaOptions(transport, resource, params.filterVariant))
            .catch((error: unknown) => {
                if (sequence === applySequence.current) throw error;
                return undefined;
            });
        // A newer view, manual query edit, navigation or unmount supersedes this request.
        if (!selectedSchema || sequence !== applySequence.current) return;
        const properties = Object.values(selectedSchema.properties ?? {});
        const knownFilters = new Set(properties.map((property) => property['x-filter']?.name));
        const knownSorts = new Set(properties.map((property) => property['x-sort']?.name));
        setSearchParams((prev) => {
            clearQuery(prev);
            if (params.filterVariant) prev.set('filterVariant', params.filterVariant);
            for (const [name, value] of Object.entries(params.filter ?? {})) {
                if (knownFilters.has(name)) {
                    prev.set(`filter[${name}]`, value);
                }
            }
            const sort = serializeSort(
                parseSort(params.sort ?? null).filter((entry) => knownSorts.has(entry.field)),
            );
            if (sort) {
                prev.set('sort', sort);
            }
            return prev;
        });
    };

    const fingerprint = filterFingerprint(searchParams);

    return {
        resource,
        schema,
        variants: variantsQuery.data?.variants ?? [],
        filterVariant,
        onVariantChange,
        requestParams,
        filterValues,
        sort,
        sortableFields,
        onFilterChange: (name, value) => setParam(`filter[${name}]`, value),
        onSortChange: (value) => setParam('sort', value),
        applyView,
        filterFingerprint: fingerprint,
    };
}

/**
 * Whether a list should show its dim/cross-fade — true only while a fetch triggered
 * by a genuine filter/sort change is in flight. Latches the fingerprint that was
 * current when the last fetch settled; a background refetch (poll, window-focus)
 * keeps the same fingerprint and so never dims.
 */
export function useFilterChangeDim(fingerprint: string, isFetching: boolean): boolean {
    const settled = useRef(fingerprint);
    const [, force] = useState(0);

    const changed = settled.current !== fingerprint;

    useEffect(() => {
        // When a fetch for the changed fingerprint completes, latch it so the next
        // render stops dimming.
        if (!isFetching && settled.current !== fingerprint) {
            settled.current = fingerprint;
            force((n) => n + 1);
        }
    }, [fingerprint, isFetching]);

    return changed && isFetching;
}
