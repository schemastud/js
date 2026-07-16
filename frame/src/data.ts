import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SchemaNode } from '@schemastud/seam';
import { useFrameInjection } from './context';
import type { FormMode, Paginated, Row } from './types';

/** List rows for a resource through the injected transport, keyed by request params. */
export function useResourceList(resource: string, params: Record<string, string>) {
    const { transport } = useFrameInjection();

    return useQuery<Paginated<Row>>({
        queryKey: ['frame', resource, 'list', params],
        queryFn: () => transport.list(resource, params),
    });
}

/** A single record; disabled when creating (id === null). */
export function useResourceRecord(resource: string, id: string | null) {
    const { transport } = useFrameInjection();

    return useQuery<Row>({
        queryKey: ['frame', resource, 'record', id],
        queryFn: () => transport.get(resource, id as string),
        enabled: id !== null,
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
