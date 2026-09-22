import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { transportScope } from '@schemastud/facets';
import type { SchemaNode } from '@schemastud/seam';
import { useFrameInjection } from './context';
import type { FormMode, FrameTransport, Paginated, Row } from './types';

/**
 * Extra `useQuery` knobs a caller may thread onto a Frame read (e.g. `refetchInterval`,
 * `staleTime`, `enabled`). `queryKey`/`queryFn` stay owned by Frame — the cache namespace is
 * the package's, not the host's — so they're excluded. Additive and backward-compatible: every
 * call site that omits `options` behaves exactly as before.
 */
type ResourceQueryOptions<T> = Omit<UseQueryOptions<T, Error, T>, 'queryKey' | 'queryFn'>;

/** Build a resource query key; existing resource/record prefixes remain usable. */
export function resourceQueryKey(
    transport: FrameTransport,
    resource: string,
    ...parts: readonly unknown[]
) {
    return ['frame', resource, ...parts, transportScope(transport)] as const;
}

function useResourceQuery<T>(
    transport: FrameTransport,
    resource: string,
    options: UseQueryOptions<T, Error, T>,
) {
    const client = useQueryClient();
    const effective = client.defaultQueryOptions(options);
    const placeholder = effective.placeholderData;
    const scope = transportScope(transport);

    return useQuery<T, Error, T>({
        ...effective,
        // Preserve host pagination placeholders only within the same authority
        // and resource, including defaults installed on the shared QueryClient.
        placeholderData: (previous, previousQuery) => {
            if (
                previousQuery &&
                (previousQuery.queryKey[0] !== 'frame' ||
                    previousQuery.queryKey[1] !== resource ||
                    previousQuery.queryKey.at(-1) !== scope)
            ) {
                return undefined;
            }
            return typeof placeholder === 'function'
                ? (
                      placeholder as (
                          data: typeof previous,
                          query: typeof previousQuery,
                      ) => typeof previous
                  )(previous, previousQuery)
                : placeholder;
        },
    });
}

/** List rows for a resource through the injected transport, keyed by request params. */
export function useResourceList(
    resource: string,
    params: Record<string, string>,
    options?: ResourceQueryOptions<Paginated<Row>>,
) {
    const { transport } = useFrameInjection();

    return useResourceQuery<Paginated<Row>>(transport, resource, {
        queryKey: resourceQueryKey(transport, resource, 'list', params),
        queryFn: () => transport.list(resource, params),
        ...options,
    });
}

/**
 * A single record; disabled when creating (id === null). `options` threads extra `useQuery`
 * knobs — notably `refetchInterval` for a live/polling read model (an operator provisioning
 * poll rides Frame's own `resourceQueryKey(transport, resource, 'record', id)` queryKey this way, so there's one
 * cache namespace end-to-end rather than a parallel bespoke fetch). The `enabled: id !== null`
 * default still holds unless `options` overrides it.
 */
export function useResourceRecord(
    resource: string,
    id: string | null,
    options?: ResourceQueryOptions<Row>,
) {
    const { transport } = useFrameInjection();

    return useResourceQuery<Row>(transport, resource, {
        queryKey: resourceQueryKey(transport, resource, 'record', id),
        queryFn: () => transport.get(resource, id as string),
        enabled: id !== null,
        ...options,
    });
}

/** The form JSON-schema (JsonSchemaGenerator->forRequest() on the server). */
export function useFormSchema(resource: string, form: FormMode) {
    const { transport } = useFrameInjection();

    return useQuery<SchemaNode>({
        queryKey: resourceQueryKey(transport, resource, 'form-schema', form),
        placeholderData: undefined,
        queryFn: () => transport.getFormSchema(resource, form),
        staleTime: 5 * 60 * 1000,
    });
}

/** Save (create when id === null, else update); invalidates the resource's queries. */
export function useSaveResource(resource: string) {
    const { transport } = useFrameInjection();
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: resourceQueryKey(transport, resource, 'save'),
        mutationFn: ({ id, data }: { id: string | null; data: unknown }) =>
            id === null ? transport.create<Row>(resource, data) : transport.save(resource, id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['frame', resource],
                predicate: (query) => query.queryKey.at(-1) === transportScope(transport),
            });
        },
    });
}

/** Delete a record; invalidates the resource's queries. */
export function useRemoveResource(resource: string) {
    const { transport } = useFrameInjection();
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: resourceQueryKey(transport, resource, 'remove'),
        mutationFn: (id: string) => transport.remove(resource, id),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['frame', resource],
                predicate: (query) => query.queryKey.at(-1) === transportScope(transport),
            });
        },
    });
}
