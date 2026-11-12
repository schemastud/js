import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { transportScope } from './transportScope';
import { useFacetsCollection, useFacetsInjection, useFacetsResource } from './context';
import type {
    FacetsTransport,
    FilterSchema,
    FilterOption,
    SavedFilterQueryParameters,
} from './types';

/**
 * List-surface data hooks, each resolving through the host-injected
 * transport (never a bundled HTTP client). Schema and saved-view cache keys
 * distinguish the transport, resource and selected variant.
 */

/** The generated filter schema for a resource (carries x-filter / x-sort). */
export function filterSchemaOptions(
    transport: FacetsTransport,
    resource: string,
    variant?: string,
    collection?: string,
) {
    return {
        queryKey: ['filter-schema', resource, variant ?? null, collection ?? null, transportScope(transport)],
        // A host's list-wide keepPreviousData default must not carry another
        // resource or variant's vocabulary and permissions into this one.
        placeholderData: undefined,
        staleTime: 5 * 60_000,
        queryFn: () =>
            collection
                ? transport.getFilterSchema(resource, variant, collection)
                : variant
                  ? transport.getFilterSchema(resource, variant)
                  : transport.getFilterSchema(resource),
    };
}

export function useFilterSchema(resource: string, variant?: string, collection?: string) {
    const { transport } = useFacetsInjection();
    return useQuery(filterSchemaOptions(transport, resource, variant, collection));
}

export function useFilterVariants(resource: string, collection?: string) {
    const { transport } = useFacetsInjection();
    return useQuery({
        queryKey: ['filter-variants', resource, collection ?? null, transportScope(transport)],
        placeholderData: undefined,
        staleTime: 5 * 60_000,
        queryFn: () =>
            collection ? transport.getFilterVariants(resource, collection) : transport.getFilterVariants(resource),
    });
}

/**
 * Options Source client: resolve a named Options Source (silos, tags, …) to its
 * rows, with type-ahead via `search`. Cached per (ref, search) for the session.
 */
export function useFilterOptions(ref: string | undefined, search: string, resource?: string) {
    const options = useFilterOptionsQuery(ref, resource);
    return useQuery({ ...options(search), enabled: options.enabled });
}

/**
 * The same Options Source as an imperative `search(term)` for a combobox, read through the query cache on the
 * `useFilterOptions` key: a term already asked for in the last minute (by the picker, or the facets bar warming its
 * chip labels) is not asked again.
 */
export function useFilterOptionsSearch(ref: string | undefined, resource?: string) {
    const queryClient = useQueryClient();
    const options = useFilterOptionsQuery(ref, resource);
    return useCallback(
        (search: string) => (options.enabled ? queryClient.fetchQuery(options(search)) : Promise.resolve([] as FilterOption[])),
        // `options` is rebuilt each render, so the callback keys on what it is built from: the search stays stable
        // across renders, which the combobox's debounce effect depends on.
        [queryClient, options.enabled, ...options.keyParts],
    );
}

function useFilterOptionsQuery(ref: string | undefined, resource?: string) {
    const { transport } = useFacetsInjection();
    const contextResource = useFacetsResource();
    const contextCollection = useFacetsCollection();
    const target = resource ?? contextResource;
    const scope = transportScope(transport);
    const build = (search: string) => ({
        queryKey: ['filter-options', target, ref, search, contextCollection ?? null, scope],
        placeholderData: undefined,
        staleTime: 60_000,
        queryFn: () =>
            (contextCollection
                ? transport.getFilterOptions(target as string, ref as string, search, contextCollection)
                : transport.getFilterOptions(target as string, ref as string, search)) as Promise<FilterOption[]>,
    });

    return Object.assign(build, {
        enabled: Boolean(ref) && Boolean(target),
        keyParts: [target, ref, contextCollection ?? null, scope, transport] as const,
    });
}

export function useSavedFilters(resource: string, enabled = true, variant?: string, collection?: string) {
    const { transport } = useFacetsInjection();
    return useQuery({
        queryKey: ['saved-filters', resource, variant ?? null, collection ?? null, transportScope(transport)],
        placeholderData: undefined,
        enabled,
        queryFn: () =>
            collection
                ? variant
                    ? transport.getSavedFilters(resource, variant, collection)
                    : transport.getSavedFilters(resource, undefined, collection)
                : variant
                  ? transport.getSavedFilters(resource, variant)
                  : transport.getSavedFilters(resource),
    });
}

export function useSaveFilter(resource: string, collection?: string) {
    const { transport } = useFacetsInjection();
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: ['saved-filters', resource, collection ?? null, transportScope(transport), 'save'],
        mutationFn: (payload: { name: string; queryParameters: SavedFilterQueryParameters }) =>
            collection ? transport.saveFilter(resource, payload, collection) : transport.saveFilter(resource, payload),
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: ['saved-filters', resource],
                predicate: (query) => query.queryKey.at(-1) === transportScope(transport),
            }),
    });
}

export function useDeleteSavedFilter(resource: string, variant?: string, collection?: string) {
    const { transport } = useFacetsInjection();
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: [
            'saved-filters',
            resource,
            transportScope(transport),
            'delete',
            variant ?? null,
            collection ?? null,
        ],
        mutationFn: (id: string) =>
            collection
                ? variant
                    ? transport.deleteSavedFilter(resource, id, variant, collection)
                    : transport.deleteSavedFilter(resource, id, undefined, collection)
                : variant
                  ? transport.deleteSavedFilter(resource, id, variant)
                  : transport.deleteSavedFilter(resource, id),
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: ['saved-filters', resource],
                predicate: (query) => query.queryKey.at(-1) === transportScope(transport),
            }),
    });
}

export type { FilterSchema };
