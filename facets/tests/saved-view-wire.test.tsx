import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
// Owner ruling 2026-10-09 18:18Z: the SavedFilter wire is camel (laravel-beam fbc93d80, strict input), no aliases.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FacetsProvider } from '../src/context';
import { ListFilters } from '../src/ListFilters';
import { useListFilters } from '../src/useListFilters';
import type { FacetsInjection, FacetsPrimitives, FilterSchema, SavedFilter } from '../src/types';

afterEach(cleanup);

const allowed = { create: true, update: true, delete: true };
const denied = { create: false, update: false, delete: false };
const rows: SavedFilter[] = [
    { id: 'private', name: 'My private view', visibility: 'private', can: allowed },
    { id: 'shared', name: 'My shared view', visibility: 'shared', can: allowed },
    { id: 'other-shared', name: 'Shared by a colleague', visibility: 'shared', can: denied },
    { id: 'other-public', name: 'Public view', visibility: 'public', can: denied },
    { id: 'historical', name: 'View without permissions', visibility: 'private' },
].map((row) => ({ ...row, resource: 'papers', queryParameters: {}, isDefault: false }));

const primitives: FacetsPrimitives = {
    Button: ({ children, size: _size, variant: _variant, ...props }) => (
        <button {...props}>{children}</button>
    ),
    Input: (props) => <input {...props} />,
    Label: (props) => <label {...props} />,
    Popover: ({ children }) => <div>{children}</div>,
    PopoverTrigger: ({ children }) => <>{children}</>,
    PopoverContent: ({ children }) => <div>{children}</div>,
    SimpleSelect: () => null,
    Badge: ({ children }) => <span>{children}</span>,
};

function mount(schema: FilterSchema, can?: FacetsInjection['can']) {
    const transport = {
        getFilterSchema: vi.fn(async () => schema),
        getFilterVariants: vi.fn(async () => ({ resource: 'papers', variants: [] })),
        getFilterOptions: vi.fn(async () => []),
        getSavedFilters: vi.fn(async () => rows),
        saveFilter: vi.fn(async () => rows[0]),
        deleteSavedFilter: vi.fn(async () => undefined),
    };
    function Harness() {
        const filters = useListFilters('papers');
        return <ListFilters {...filters} />;
    }
    render(
        <QueryClientProvider
            client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
            <FacetsProvider
                value={{
                    transport,
                    primitives,
                    can,
                    useUrlState() {
                        const [params, setParams] = useState(new URLSearchParams());
                        return [
                            params,
                            (updater) =>
                                setParams((previous) => updater(new URLSearchParams(previous))),
                        ] as const;
                    },
                }}
            >
                <Harness />
            </FacetsProvider>
        </QueryClientProvider>
    );
    return transport;
}

const schema: FilterSchema = {
    properties: { title: { 'x-sort': { name: 'title' } } },
    savedViewsResource: 'team-views',
    savedViewsCan: allowed,
};

describe('saved-view wire names', () => {
    it('saves the current view with the camel queryParameters key and no snake alias', async () => {
        const transport = mount(schema);
        fireEvent.click(await screen.findByRole('button', { name: 'Save current view' }));
        fireEvent.change(screen.getByPlaceholderText('View name'), { target: { value: 'Mine' } });
        fireEvent.click(screen.getByRole('button', { name: 'Confirm save' }));
        await waitFor(() => expect(transport.saveFilter).toHaveBeenCalledTimes(1));
        const [resource, payload] = transport.saveFilter.mock.calls[0] as unknown as [string, Record<string, unknown>];
        expect(resource).toBe('papers');
        expect(payload).toHaveProperty('name', 'Mine');
        expect(payload).toHaveProperty('queryParameters');
        expect(payload).not.toHaveProperty('query_parameters');
    });
});
