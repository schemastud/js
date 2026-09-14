import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFacetsInjection, useFacetsResource } from './context';
import type {
    FacetsTransport,
    FilterSchema,
    FilterOption,
    SavedFilterQueryParameters,
} from './types';

/**
 * List-surface data hooks, each resolving through the host-injected
 * transport (never a bundled HTTP client). Schema and saved-view cache keys
 * distinguish the resource and selected variant.
 */

/** The generated filter schema for a resource (carries x-filter / x-sort). */
export function filterSchemaOptions(
    transport: FacetsTransport,
    resource: string,
    variant?: string
) {
    return {
        queryKey: ['filter-schema', resource, variant ?? null],
        // A host's list-wide keepPreviousData default must not carry another
        // resource or variant's vocabulary and permissions into this one.
        placeholderData: undefined,
        staleTime: 5 * 60_000,
        queryFn: () =>
            variant
                ? transport.getFilterSchema(resource, variant)
                : transport.getFilterSchema(resource),
    };
}

export function useFilterSchema(resource: string, variant?: string) {
    const { transport } = useFacetsInjection();
    return useQuery(filterSchemaOptions(transport, resource, variant));
}

export function useFilterVariants(resource: string) {
    const { transport } = useFacetsInjection();
    return useQuery({
        queryKey: ['filter-variants', resource],
        placeholderData: undefined,
        staleTime: 5 * 60_000,
        queryFn: () => transport.getFilterVariants(resource),
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
            transport.getFilterOptions(target as string, ref as string, search) as Promise<
                FilterOption[]
            >,
    });
}

export function useSavedFilters(resource: string, enabled = true, variant?: string) {
    const { transport } = useFacetsInjection();
    return useQuery({
        queryKey: ['saved-filters', resource, variant ?? null],
        placeholderData: undefined,
        enabled,
        queryFn: () =>
            variant
                ? transport.getSavedFilters(resource, variant)
                : transport.getSavedFilters(resource),
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

export function useDeleteSavedFilter(resource: string, variant?: string) {
    const { transport } = useFacetsInjection();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            variant
                ? transport.deleteSavedFilter(resource, id, variant)
                : transport.deleteSavedFilter(resource, id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-filters', resource] }),
    });
}

export type { FilterSchema };
