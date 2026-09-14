import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
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
].map((row) => ({ ...row, resource: 'papers', query_parameters: {}, is_default: false }));

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

describe('saved-view mutation permissions', () => {
    it('keeps every readable view applicable and offers deletion only for permitted records', async () => {
        const transport = mount(schema);
        for (const row of rows)
            expect(await screen.findByRole('button', { name: row.name })).toBeDefined();
        expect(screen.getByRole('button', { name: 'Save current view' })).toBeDefined();
        expect(screen.getAllByRole('button', { name: /^Delete / })).toHaveLength(2);
        expect(screen.queryByRole('button', { name: 'Delete Shared by a colleague' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Delete Public view' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Delete My private view' }));
        await waitFor(() =>
            expect(transport.deleteSavedFilter).toHaveBeenCalledWith('papers', 'private')
        );
    });

    it.each([denied, undefined])(
        'hides Save without affirmative create permission while preserving reads (%s)',
        async (permission) => {
            mount({ ...schema, savedViewsCan: permission });
            expect(await screen.findByRole('button', { name: 'Public view' })).toBeDefined();
            expect(screen.queryByRole('button', { name: 'Save current view' })).toBeNull();
        }
    );

    it('allows the host to narrow permissions on the advertised resource and actual record', async () => {
        const can = vi.fn<NonNullable<FacetsInjection['can']>>(
            (action, resource, record) =>
                resource === 'team-views' &&
                action === 'delete' &&
                (record as SavedFilter)?.id === 'shared'
        );
        mount(schema, can);
        expect(await screen.findByRole('button', { name: 'Public view' })).toBeDefined();
        expect(screen.queryByRole('button', { name: 'Save current view' })).toBeNull();
        expect(screen.getAllByRole('button', { name: /^Delete / })).toHaveLength(1);
        expect(screen.getByRole('button', { name: 'Delete My shared view' })).toBeDefined();
        expect(can).toHaveBeenCalledWith('create', 'team-views');
        expect(can).toHaveBeenCalledWith('delete', 'team-views', rows[1]);
    });

    it('cannot use a permissive host check to restore a server-denied action', async () => {
        mount({ ...schema, savedViewsCan: denied }, () => true);
        expect(await screen.findByRole('button', { name: 'Public view' })).toBeDefined();
        expect(screen.queryByRole('button', { name: 'Save current view' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Delete Public view' })).toBeNull();
    });
});
