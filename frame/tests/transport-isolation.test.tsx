import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    useFilterSchema,
    useFilterVariants,
    useFilterOptions,
    useSavedFilters,
    useSaveFilter,
    useDeleteSavedFilter,
} from '@schemastud/facets';
import { createWidgetRegistry } from '@schemastud/seam';
import { FrameProvider } from '../src/context';
import {
    useResourceList,
    useResourceRecord,
    useFormSchema,
    useSaveResource,
    useRemoveResource,
} from '../src/data';
import type { FrameInjection, FrameTransport } from '../src/types';

afterEach(cleanup);

function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((yes) => {
        resolve = yes;
    });
    return { promise, resolve };
}

function makeTransport(authority: string, gate?: Promise<void>): FrameTransport {
    const row = { id: '1', title: authority };
    const saved = {
        id: '1',
        name: authority,
        resource: 'things',
        query_parameters: {},
        visibility: 'private',
        is_default: false,
    };
    const result = async <T,>(value: T) => {
        await gate;
        return value;
    };
    return {
        list: vi.fn(() => result({ data: [row], total: 1, page: 1, perPage: 25 })),
        get: vi.fn(() => result(row)),
        getFormSchema: vi.fn(() => result({ title: authority, type: 'object', properties: {} })),
        getFilterSchema: vi.fn(() => result({ properties: { [authority]: {} } })),
        getFilterVariants: vi.fn(() =>
            result({
                resource: 'things',
                variants: [
                    { key: authority, resource: 'things', canonical: true, sameAsCanonical: true },
                ],
            }),
        ),
        getFilterOptions: vi.fn(() => result([{ value: authority, label: authority }])),
        getSavedFilters: vi.fn(() => result([saved])),
        create: vi.fn(async () => Response.json(await result(row)).json()),
        save: vi.fn(() => result(row)),
        remove: vi.fn(() => result(undefined)),
        saveFilter: vi.fn(() => result(saved)),
        deleteSavedFilter: vi.fn(() => result(undefined)),
    };
}

const Noop = () => null;
function fixture(first: FrameTransport, retry = false) {
    let transport = first;
    const client = new QueryClient({
        defaultOptions: {
            queries: { retry: false, staleTime: Infinity, placeholderData: keepPreviousData },
            mutations: { retry: retry ? 1 : false, retryDelay: 0 },
        },
    });
    const common: Omit<FrameInjection, 'transport'> = {
        primitives: {
            Button: Noop,
            Input: Noop,
            Label: Noop,
            Popover: Noop,
            PopoverTrigger: Noop,
            PopoverContent: Noop,
            SimpleSelect: Noop,
            Badge: Noop,
            Table: Noop,
            Skeleton: Noop,
            SidePanel: Noop,
        },
        useUrlState: () => [new URLSearchParams(), () => {}] as const,
        registry: createWidgetRegistry(),
        schemaFetcher: async (ref) => ({ $id: ref }),
        can: () => true,
    };
    function wrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={client}>
                <FrameProvider value={{ ...common, transport }}>{children}</FrameProvider>
            </QueryClientProvider>
        );
    }
    return {
        client,
        wrapper,
        switchTo: (next: FrameTransport) => {
            transport = next;
        },
    };
}

const reads = [
    { name: 'list', useRead: () => useResourceList('things', {}), method: 'list' },
    { name: 'record', useRead: () => useResourceRecord('things', '1'), method: 'get' },
    { name: 'form', useRead: () => useFormSchema('things', 'enriched'), method: 'getFormSchema' },
    { name: 'filter schema', useRead: () => useFilterSchema('things'), method: 'getFilterSchema' },
    { name: 'variants', useRead: () => useFilterVariants('things'), method: 'getFilterVariants' },
    {
        name: 'options',
        useRead: () => useFilterOptions('tags', '', 'things'),
        method: 'getFilterOptions',
    },
    { name: 'saved views', useRead: () => useSavedFilters('things'), method: 'getSavedFilters' },
] as const;

describe('shared QueryClient, distinct Frame transports', () => {
    it.each(reads)(
        'isolates cached $name and inherited placeholders, but reuses its own cache',
        async ({ useRead, method }) => {
            const first = makeTransport('first-authority');
            const gate = deferred();
            const second = makeTransport('second-authority', gate.promise);
            const f = fixture(first);
            const hook = renderHook(() => useRead(), { wrapper: f.wrapper });
            await waitFor(() =>
                expect(JSON.stringify(hook.result.current.data)).toContain('first-authority'),
            );
            f.switchTo(second);
            hook.rerender();
            expect(hook.result.current.data).toBeUndefined();
            await waitFor(() => expect(second[method]).toHaveBeenCalledTimes(1));
            await act(async () => {
                gate.resolve();
            });
            await waitFor(() =>
                expect(JSON.stringify(hook.result.current.data)).toContain('second-authority'),
            );
            f.switchTo(first);
            hook.rerender();
            expect(JSON.stringify(hook.result.current.data)).toContain('first-authority');
            expect(first[method]).toHaveBeenCalledTimes(1);
            hook.unmount();
            f.client.clear();
        },
    );

    it.each(reads)(
        'keeps an overlapping $name response in its original cache',
        async ({ useRead, method }) => {
            const gate = deferred();
            const first = makeTransport('first-authority', gate.promise);
            const second = makeTransport('second-authority');
            const f = fixture(first);
            const hook = renderHook(() => useRead(), { wrapper: f.wrapper });
            await waitFor(() => expect(first[method]).toHaveBeenCalledTimes(1));
            f.switchTo(second);
            hook.rerender();
            await waitFor(() =>
                expect(JSON.stringify(hook.result.current.data)).toContain('second-authority'),
            );
            await act(async () => {
                gate.resolve();
            });
            expect(JSON.stringify(hook.result.current.data)).toContain('second-authority');
            f.switchTo(first);
            hook.rerender();
            await waitFor(() =>
                expect(JSON.stringify(hook.result.current.data)).toContain('first-authority'),
            );
            expect(first[method]).toHaveBeenCalledTimes(1);
            hook.unmount();
            f.client.clear();
        },
    );

    it.each(['default', 'explicit'] as const)(
        'preserves %s pagination placeholders within a resource only',
        async (source) => {
            const gate = deferred();
            const transport = makeTransport('first-authority');
            const list = vi.mocked(transport.list);
            list.mockImplementation(async (_resource, params) => {
                if (params.page === '2') await gate.promise;
                return {
                    data: [{ title: `page-${params.page}` }],
                    total: 2,
                    page: Number(params.page),
                    perPage: 1,
                };
            });
            const f = fixture(transport);
            const hook = renderHook(
                ({ resource, page }) =>
                    useResourceList(
                        resource,
                        { page },
                        source === 'explicit' ? { placeholderData: keepPreviousData } : undefined,
                    ),
                {
                    initialProps: { resource: 'things', page: '1' },
                    wrapper: f.wrapper,
                },
            );
            await waitFor(() => expect(hook.result.current.data?.data[0].title).toBe('page-1'));
            hook.rerender({ resource: 'things', page: '2' });
            expect(hook.result.current.isPlaceholderData).toBe(true);
            expect(hook.result.current.data?.data[0].title).toBe('page-1');
            hook.rerender({ resource: 'other', page: '2' });
            expect(hook.result.current.data).toBeUndefined();
            await act(async () => {
                gate.resolve();
            });
            await waitFor(() => expect(hook.result.current.data?.data[0].title).toBe('page-2'));
            hook.unmount();
            f.client.clear();
        },
    );
});

const writes = [
    {
        name: 'resource create',
        method: 'create',
        useWrite: () => {
            const mutation = useSaveResource('things');
            return () => mutation.mutateAsync({ id: null, data: { title: 'created' } });
        },
    },
    {
        name: 'resource save',
        method: 'save',
        useWrite: () => {
            const mutation = useSaveResource('things');
            return () => mutation.mutateAsync({ id: '1', data: {} });
        },
    },
    {
        name: 'resource remove',
        method: 'remove',
        useWrite: () => {
            const mutation = useRemoveResource('things');
            return () => mutation.mutateAsync('1');
        },
    },
    {
        name: 'saved view save',
        method: 'saveFilter',
        useWrite: () => {
            const mutation = useSaveFilter('things');
            return () => mutation.mutateAsync({ name: 'saved', query_parameters: {} });
        },
    },
    {
        name: 'saved view delete',
        method: 'deleteSavedFilter',
        useWrite: () => {
            const mutation = useDeleteSavedFilter('things');
            return () => mutation.mutateAsync('1');
        },
    },
] as const;

describe('pending mutations retain their transport', () => {
    it.each(writes)(
        '$name completes and invalidates only its originating transport',
        async ({ useWrite, method }) => {
            const gate = deferred();
            const first = makeTransport('first-authority');
            const gated = makeTransport('first-authority', gate.promise);
            Object.assign(first, { [method]: gated[method] });
            const second = makeTransport('second-authority');
            const f = fixture(first);
            const hook = renderHook(
                () => ({
                    list: useResourceList('things', {}),
                    views: useSavedFilters('things'),
                    write: useWrite(),
                }),
                { wrapper: f.wrapper },
            );
            await waitFor(() =>
                expect(
                    hook.result.current.list.isSuccess && hook.result.current.views.isSuccess,
                ).toBe(true),
            );
            f.switchTo(second);
            hook.rerender();
            await waitFor(() =>
                expect(JSON.stringify(hook.result.current.list.data)).toContain('second-authority'),
            );
            await waitFor(() =>
                expect(hook.result.current.views.data?.[0].name).toBe('second-authority'),
            );
            f.switchTo(first);
            hook.rerender();
            let pending!: Promise<unknown>;
            act(() => {
                pending = hook.result.current.write();
            });
            await waitFor(() => expect(first[method]).toHaveBeenCalledTimes(1));
            f.switchTo(second);
            hook.rerender();
            await act(async () => {
                gate.resolve();
                await pending;
            });
            expect(second[method]).not.toHaveBeenCalled();
            expect(second.list).toHaveBeenCalledTimes(1);
            expect(second.getSavedFilters).toHaveBeenCalledTimes(1);
            f.switchTo(first);
            hook.rerender();
            const read = method === 'create' || method === 'save' || method === 'remove' ? 'list' : 'getSavedFilters';
            await waitFor(() => expect(first[read]).toHaveBeenCalledTimes(2));
            hook.unmount();
            f.client.clear();
        },
    );

    it.each(writes)(
        '$name retries on the original transport after provider change',
        async ({ useWrite, method }) => {
            const gate = deferred();
            const first = makeTransport('first-authority');
            vi.mocked(first[method]).mockImplementationOnce(async (): Promise<never> => {
                await gate.promise;
                throw new Error('retry');
            });
            const second = makeTransport('second-authority');
            const f = fixture(first, true);
            const hook = renderHook(() => useWrite(), { wrapper: f.wrapper });
            let pending!: Promise<unknown>;
            act(() => {
                pending = hook.result.current();
            });
            await waitFor(() => expect(first[method]).toHaveBeenCalledTimes(1));
            f.switchTo(second);
            hook.rerender();
            await act(async () => {
                gate.resolve();
                await pending;
            });
            expect(first[method]).toHaveBeenCalledTimes(2);
            expect(second[method]).not.toHaveBeenCalled();
            hook.unmount();
            f.client.clear();
        },
    );
});
