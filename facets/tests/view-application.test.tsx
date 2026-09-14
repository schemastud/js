import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useSyncExternalStore, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FacetsProvider } from '../src/context';
import { useListFilters } from '../src/useListFilters';
import type { FacetsPrimitives, FacetsTransport, FilterSchema } from '../src/types';

afterEach(cleanup);

const schema: FilterSchema = {
    properties: {
        term: { 'x-filter': { name: 'term', operator: 'partial', control: 'search' } },
        title: { 'x-sort': { name: 'title' } },
    },
};

function fixture() {
    let current = new URLSearchParams();
    const listeners = new Set<() => void>();
    const subscribe = (listener: () => void) => {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    };
    const snapshot = () => current;
    let release!: (value: FilterSchema) => void;
    const pending = new Promise<FilterSchema>((resolve) => {
        release = resolve;
    });
    const transport: FacetsTransport = {
        getFilterSchema: vi.fn(async (_resource, variant) =>
            variant === 'slow' ? pending : schema,
        ),
        getFilterVariants: async (resource) => ({ resource, variants: [] }),
        getFilterOptions: async () => [],
        getSavedFilters: async () => [],
        saveFilter: async () => {
            throw new Error('Unused');
        },
        deleteSavedFilter: async () => undefined,
    };
    const Noop = () => null;
    const primitives: FacetsPrimitives = {
        Button: Noop,
        Input: Noop,
        Label: Noop,
        Popover: Noop,
        PopoverTrigger: Noop,
        PopoverContent: Noop,
        SimpleSelect: Noop,
        Badge: Noop,
    };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function Wrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={client}>
                <FacetsProvider
                    value={{
                        transport,
                        primitives,
                        useUrlState() {
                            const params = useSyncExternalStore(subscribe, snapshot);
                            return [
                                params,
                                (updater) => {
                                    current = updater(new URLSearchParams(current));
                                    listeners.forEach((listener) => listener());
                                },
                            ] as const;
                        },
                    }}
                >
                    {children}
                </FacetsProvider>
            </QueryClientProvider>
        );
    }
    const hook = renderHook(({ resource }) => useListFilters(resource), {
        initialProps: { resource: 'papers' },
        wrapper: Wrapper,
    });
    return { ...hook, release: () => release(schema), snapshot, transport };
}

describe('pending saved-view application', () => {
    it.each(['filter', 'sort', 'variant', 'resource'] as const)(
        'cannot overwrite a newer %s selection',
        async (change) => {
            const { result, rerender, release, snapshot, transport } = fixture();
            await waitFor(() => expect(result.current.schema).toBeDefined());
            const applying = result.current.applyView({
                filterVariant: 'slow',
                filter: { term: 'old' },
            });
            await waitFor(() =>
                expect(transport.getFilterSchema).toHaveBeenCalledWith('papers', 'slow'),
            );
            act(() => {
                if (change === 'filter') result.current.onFilterChange('term', 'new');
                if (change === 'sort') result.current.onSortChange('title');
                if (change === 'variant') result.current.onVariantChange('fast');
                if (change === 'resource') rerender({ resource: 'books' });
            });
            const expected = snapshot().toString();
            await act(async () => {
                release();
                await applying;
            });
            expect(snapshot().toString()).toBe(expected);
            expect(result.current.resource).toBe(change === 'resource' ? 'books' : 'papers');
        },
    );

    it('lets the newer saved-view choice win when the older schema finishes last', async () => {
        const { result, release, snapshot } = fixture();
        await waitFor(() => expect(result.current.schema).toBeDefined());
        const older = result.current.applyView({ filterVariant: 'slow', filter: { term: 'old' } });
        await act(async () => {
            await result.current.applyView({ filterVariant: 'fast', filter: { term: 'new' } });
        });
        await act(async () => {
            release();
            await older;
        });
        expect(Object.fromEntries(snapshot())).toEqual({
            filterVariant: 'fast',
            'filter[term]': 'new',
        });
    });
});
