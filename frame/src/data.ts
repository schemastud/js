import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import type { SchemaNode } from '@schemastud/seam';
import { useFrameInjection } from './context';
import type { FormMode, Paginated, Row } from './types';

/**
 * Extra `useQuery` knobs a caller may thread onto a Frame read (e.g. `refetchInterval`,
 * `staleTime`, `enabled`). `queryKey`/`queryFn` stay owned by Frame — the cache namespace is
 * the package's, not the host's — so they're excluded. Additive and backward-compatible: every
 * call site that omits `options` behaves exactly as before.
 */
type ResourceQueryOptions<T> = Omit<UseQueryOptions<T, Error, T>, 'queryKey' | 'queryFn'>;

/** List rows for a resource through the injected transport, keyed by request params. */
export function useResourceList(
    resource: string,
    params: Record<string, string>,
    options?: ResourceQueryOptions<Paginated<Row>>,
) {
    const { transport } = useFrameInjection();

    return useQuery<Paginated<Row>, Error, Paginated<Row>>({
        queryKey: ['frame', resource, 'list', params],
        queryFn: () => transport.list(resource, params),
        ...options,
    });
}

/**
 * A single record; disabled when creating (id === null). `options` threads extra `useQuery`
 * knobs — notably `refetchInterval` for a live/polling read model (an operator provisioning
 * poll rides Frame's own `['frame',resource,'record',id]` queryKey this way, so there's one
 * cache namespace end-to-end rather than a parallel bespoke fetch). The `enabled: id !== null`
 * default still holds unless `options` overrides it.
 */
export function useResourceRecord(
    resource: string,
    id: string | null,
    options?: ResourceQueryOptions<Row>,
) {
    const { transport } = useFrameInjection();

    return useQuery<Row, Error, Row>({
        queryKey: ['frame', resource, 'record', id],
        queryFn: () => transport.get(resource, id as string),
        enabled: id !== null,
        ...options,
    });
}

/** The form JSON-schema (JsonSchemaGenerator->forRequest() on the server). */
export function useFormSchema(resource: string, form: FormMode) {
    const { transport } = useFrameInjection();

    return useQuery<SchemaNode>({
        queryKey: ['frame', resource, 'form-schema', form],
        queryFn: () => transport.getFormSchema(resource, form),
        staleTime: 5 * 60 * 1000,
    });
}

/** Save (create when id === null, else update); invalidates the resource's queries. */
export function useSaveResource(resource: string) {
    const { transport } = useFrameInjection();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string | null; data: unknown }) =>
            transport.save(resource, id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['frame', resource] });
        },
    });
}

/** Delete a record; invalidates the resource's queries. */
export function useRemoveResource(resource: string) {
    const { transport } = useFrameInjection();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => transport.remove(resource, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['frame', resource] });
        },
    });
}
