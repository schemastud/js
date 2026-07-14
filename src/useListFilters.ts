import { useEffect, useMemo, useRef, useState } from 'react';
import { useFacetsInjection } from './context';
import { useFilterSchema } from './data';
import type { FilterSchema, SavedFilterQueryParameters } from './types';

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
    /** All query params (filter[...] + sort + anything else) for the list query. */
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
    applyView: (params: SavedFilterQueryParameters) => void;
    /**
     * The current filter/sort fingerprint — changes iff a facet or the sort changed.
     * Feed it plus the list query's `isFetching` to `useFilterChangeDim` for the
     * DataTable's `loading`, so the table dims on a real re-filter but not on a
     * background refetch (poll / window-focus).
     */
    filterFingerprint: string;
}

/** Serialize just the filter[...]/sort keys of a URLSearchParams for change detection. */
function filterFingerprint(searchParams: URLSearchParams): string {
    const parts: string[] = [];
    for (const [key, value] of searchParams.entries()) {
        if (key.startsWith('filter[') || key === 'sort') {
            parts.push(`${key}=${value}`);
        }
    }
    return parts.sort().join('&');
}

export function useListFilters(resource: string): ListFilters {
    const { useUrlState } = useFacetsInjection();
    const [searchParams, setSearchParams] = useUrlState();
    const schemaQuery = useFilterSchema(resource);
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

    // Filter names the resource currently declares — used to prune a saved view
    // whose resource has since dropped a filter, so an old view still applies.
    const knownFilterNames = useMemo(
        () =>
            new Set(
                Object.values(schema?.properties ?? {})
                    .map((prop) => prop['x-filter']?.name)
                    .filter((name): name is string => Boolean(name)),
            ),
        [schema],
    );

    const setParam = (key: string, value: string | null) => {
        setSearchParams((prev) => {
            if (value === null || value === '') {
                prev.delete(key);
            } else {
                prev.set(key, value);
            }
            return prev;
        });
    };

    // Apply a saved view by replacing the filter[...]/sort state wholesale. Keys
    // the resource no longer declares are silently ignored, so resource evolution
    // never breaks a saved view.
    const applyView = (params: SavedFilterQueryParameters) => {
        setSearchParams((prev) => {
            for (const key of [...prev.keys()]) {
                if (key.startsWith('filter[') || key === 'sort') {
                    prev.delete(key);
                }
            }
            for (const [name, value] of Object.entries(params.filter ?? {})) {
                if (knownFilterNames.size === 0 || knownFilterNames.has(name)) {
                    prev.set(`filter[${name}]`, value);
                }
            }
            if (params.sort) {
                prev.set('sort', params.sort);
            }
            return prev;
        });
    };

    const fingerprint = filterFingerprint(searchParams);

    return {
        resource,
        schema,
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
