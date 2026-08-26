import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFacetsInjection, useFacetsResource } from './context';
import type { FilterSchema, FilterOption, SavedFilter, SavedFilterQueryParameters } from './types';

/**
 * The five list-surface data hooks, each resolving through the host-injected
 * transport (never a bundled HTTP client). Cache keys and stale times match the
 * app's former in-tree hooks so behaviour is identical after extraction.
 */

/** The generated filter schema for a resource (carries x-filter / x-sort). */
export function useFilterSchema(resource: string) {
    const { transport } = useFacetsInjection();
    return useQuery({
        queryKey: ['filter-schema', resource],
        staleTime: 5 * 60_000,
        queryFn: () => transport.getFilterSchema(resource),
    });
}

/**
 * Options Source client: resolve a named Options Source (silos, tags, …) to its
 * rows, with type-ahead via `search`. Cached per (ref, search) for the session.
 */
export function useFilterOptions(ref: string | undefined, search: string, resource?: string) {
    const { transport } = useFacetsInjection();
    const contextResource = useFacetsResource();
    const target = resource ?? contextResource;
    return useQuery({
        queryKey: ['filter-options', target, ref, search],
        enabled: Boolean(ref) && Boolean(target),
        staleTime: 60_000,
        queryFn: () =>
            transport.getFilterOptions(
                target as string,
                ref as string,
                search,
            ) as Promise<FilterOption[]>,
    });
}

export function useSavedFilters(resource: string) {
    const { transport } = useFacetsInjection();
    return useQuery({
        queryKey: ['saved-filters', resource],
        queryFn: () => transport.getSavedFilters(resource) as Promise<SavedFilter[]>,
    });
}

export function useSaveFilter(resource: string) {
    const { transport } = useFacetsInjection();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: { name: string; query_parameters: SavedFilterQueryParameters }) =>
            transport.saveFilter(resource, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-filters', resource] }),
    });
}

export function useDeleteSavedFilter(resource: string) {
    const { transport } = useFacetsInjection();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => transport.deleteSavedFilter(resource, id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-filters', resource] }),
    });
}

export type { FilterSchema };
