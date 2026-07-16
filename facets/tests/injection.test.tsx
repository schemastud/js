import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { useEffect, useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { FacetsProvider } from '../src/context';
import { ListFilters } from '../src/ListFilters';
import { useListFilters } from '../src/useListFilters';
import type {
    FacetsInjection,
    FacetsPrimitives,
    FacetsTransport,
    FilterSchema,
} from '../src/types';

/**
 * These tests exercise the three injection seams the facets extraction rests on —
 * transport, UI primitives, and URL state — entirely through fakes. No backend, no
 * router, no shadcn: if the hook fetches through the injected transport, decodes the
 * schema, and round-trips a filter through the injected URL-state, the seam holds.
 */

const SCHEMA: FilterSchema = {
    properties: {
        q: { title: 'Search', 'x-filter': { operator: 'search', name: 'q', control: 'search' } },
        status: {
            title: 'Status',
            'x-filter': {
                operator: 'exact',
                name: 'status',
                control: 'select',
                options: [
                    { value: 'open', label: 'Open' },
                    { value: 'closed', label: 'Closed' },
                ],
            },
        },
        created_at: { title: 'Created', 'x-sort': { name: 'created_at' } },
    },
};

function makeTransport(): FacetsTransport {
    return {
        getFilterSchema: vi.fn(async () => SCHEMA),
        getFilterOptions: vi.fn(async () => []),
        getSavedFilters: vi.fn(async () => []),
        saveFilter: vi.fn(async () => ({
            id: '1',
            name: 'v',
            resource: 'thing',
            query_parameters: {},
            visibility: 'private',
            is_default: false,
        })),
        deleteSavedFilter: vi.fn(async () => undefined),
    };
}

// Minimal primitive stubs — each tags itself so a test can prove the injected set
// (not some bundled default) is what rendered.
const primitives: FacetsPrimitives = {
    Button: ({ children, ...p }: any) => (
        <button data-injected="Button" {...p}>
            {children}
        </button>
    ),
    Input: (p: any) => <input data-injected="Input" {...p} />,
    Label: ({ children, ...p }: any) => (
        <label data-injected="Label" {...p}>
            {children}
        </label>
    ),
    Popover: ({ children }: any) => <div data-injected="Popover">{children}</div>,
    PopoverTrigger: ({ children }: any) => <>{children}</>,
    PopoverContent: ({ children }: any) => <div data-injected="PopoverContent">{children}</div>,
    SimpleSelect: ({ options, value, onValueChange }: any) => (
        <select
            data-injected="SimpleSelect"
            aria-label="Sort by"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
        >
            <option value="">Sort by…</option>
            {options.map((o: any) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    ),
    Badge: ({ children }: any) => <span data-injected="Badge">{children}</span>,
};

// URL-state seam backed by real React state, shared across a test's renders.
function makeUrlState() {
    const listeners = new Set<() => void>();
    let current = new URLSearchParams();
    function useUrlState() {
        const [, force] = useState(0);
        useEffect(() => {
            const l = () => force((n) => n + 1);
            listeners.add(l);
            return () => {
                listeners.delete(l);
            };
        }, []);
        const setParams = (updater: (prev: URLSearchParams) => URLSearchParams) => {
            current = updater(new URLSearchParams(current));
            listeners.forEach((l) => l());
        };
        return [current, setParams] as const;
    }
    return { useUrlState, snapshot: () => current };
}

function wrapper(injection: FacetsInjection) {
    return function Wrapper({ children }: { children: ReactNode }) {
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        return (
            <QueryClientProvider client={client}>
                <FacetsProvider value={injection}>{children}</FacetsProvider>
            </QueryClientProvider>
        );
    };
}

describe('facets injection seams', () => {
    it('fetches the schema through the injected transport and derives sortable fields', async () => {
        const transport = makeTransport();
        const url = makeUrlState();
        const injection = { transport, primitives, useUrlState: url.useUrlState };

        const { result } = renderHook(() => useListFilters('thing'), {
            wrapper: wrapper(injection),
        });

        await waitFor(() => expect(result.current.schema).toBeDefined());

        expect(transport.getFilterSchema).toHaveBeenCalledWith('thing');
        expect([...result.current.sortableFields]).toEqual(['created_at']);
    });

    it('round-trips a filter through the injected URL-state seam', async () => {
        const transport = makeTransport();
        const url = makeUrlState();
        const injection = { transport, primitives, useUrlState: url.useUrlState };

        const { result } = renderHook(() => useListFilters('thing'), {
            wrapper: wrapper(injection),
        });
        await waitFor(() => expect(result.current.schema).toBeDefined());

        act(() => result.current.onFilterChange('status', 'open'));
        expect(url.snapshot().get('filter[status]')).toBe('open');
        expect(result.current.filterValues.status).toBe('open');

        act(() => result.current.onFilterChange('status', null));
        expect(url.snapshot().has('filter[status]')).toBe(false);
    });

    it('renders the bar through the injected primitives, not a bundled default', async () => {
        const transport = makeTransport();
        const url = makeUrlState();
        const injection = { transport, primitives, useUrlState: url.useUrlState };

        function Harness() {
            const lf = useListFilters('thing');
            return <ListFilters {...lf} />;
        }

        render(<Harness />, { wrapper: wrapper(injection) });

        // The injected SimpleSelect carries the schema's sortable field as an option —
        // proving transport → schema → primitive all flowed through the seams.
        const sort = await screen.findByLabelText('Sort by');
        expect(sort.getAttribute('data-injected')).toBe('SimpleSelect');
        // humanize('created_at') → 'Created at'; its presence proves schema (via
        // transport) reached the injected sort primitive.
        expect(screen.getByRole('option', { name: 'Created at' })).toBeDefined();
    });
});
