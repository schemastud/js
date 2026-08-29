import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { type ReactNode, useEffect, useState } from 'react';
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
 * An EMPTY filter vocabulary is not an unresolved one (api-surface-coherence 125).
 *
 * `filters/schema` used to answer 404 for a resource that declared no filter surface, so `schema`
 * stayed `undefined` and `ListFilters` rendered nothing **by accident**. The endpoint now answers
 * `{properties: {}}`, which is truthy — so the accident stopped covering the case and the surface
 * had to state it.
 *
 * ⚠️ The load-bearing assertion is not "no bar appeared". It is that `getSavedFilters` was never
 * called: `SavedViews` mounts inside `ListFilters`, and its own read 404s for exactly the resources
 * this change stops 404-ing. Rendering the bar would have traded two 404s for one 404 and called it
 * a fix.
 */

const EMPTY: FilterSchema = { properties: {} };

const POPULATED: FilterSchema = {
    properties: {
        created_at: { title: 'Created', 'x-sort': { name: 'created_at' } },
    },
};

function makeTransport(schema: FilterSchema): FacetsTransport {
    return {
        getFilterSchema: vi.fn(async () => schema),
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

const primitives: FacetsPrimitives = {
    Button: ({ children, ...p }: any) => <button {...p}>{children}</button>,
    Input: (p: any) => <input {...p} />,
    Label: ({ children, ...p }: any) => <label {...p}>{children}</label>,
    Popover: ({ children }: any) => <div>{children}</div>,
    PopoverTrigger: ({ children }: any) => <>{children}</>,
    PopoverContent: ({ children }: any) => <div>{children}</div>,
    SimpleSelect: ({ options, value, onValueChange }: any) => (
        <select aria-label="Sort by" value={value} onChange={(e) => onValueChange(e.target.value)}>
            <option value="">Sort by…</option>
            {options.map((o: any) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    ),
    Badge: ({ children }: any) => <span>{children}</span>,
};

function makeUrlState() {
    const listeners = new Set<() => void>();
    let current = new URLSearchParams();
    return function useUrlState() {
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
    };
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

/**
 * ⚠️ `data-schema` is not decoration — it is the only thing that makes the empty case a real test.
 * Waiting on `getFilterSchema` having been CALLED settles before the query resolves, so the surface
 * is still in its `schema === undefined` branch and renders nothing for the wrong reason. Measured:
 * with that weaker wait, deleting the guard under test left the suite green. The assertions below
 * run only once the resolved schema has actually reached the component.
 */
function Harness({ resource }: { resource: string }) {
    const lf = useListFilters(resource);
    return (
        <div data-testid="host" data-schema={lf.schema ? 'resolved' : 'pending'}>
            <ListFilters {...lf} />
        </div>
    );
}

function mount(schema: FilterSchema) {
    const transport = makeTransport(schema);
    const injection = { transport, primitives, useUrlState: makeUrlState() };
    render(<Harness resource="thing" />, { wrapper: wrapper(injection) });
    return transport;
}

describe('an empty filter vocabulary', () => {
    it('renders nothing, and never reaches the saved-filters read', async () => {
        const transport = mount(EMPTY);

        await waitFor(() =>
            expect(screen.getByTestId('host').dataset.schema).toBe('resolved'),
        );
        expect(transport.getFilterSchema).toHaveBeenCalledWith('thing');

        // The bar is what a populated vocabulary renders; the empty one must render none of it.
        expect(screen.queryByLabelText('Sort by')).toBeNull();
        expect(screen.getByTestId('host').childElementCount).toBe(0);
        // The assertion that makes this a fix rather than a relocation of the 404.
        expect(transport.getSavedFilters).not.toHaveBeenCalled();
    });

    it('still renders the bar when the resource DOES declare a vocabulary', async () => {
        // The negative case. Without it, `return null` unconditionally would pass the test above.
        const transport = mount(POPULATED);

        expect(await screen.findByLabelText('Sort by')).toBeDefined();
        await waitFor(() => expect(transport.getSavedFilters).toHaveBeenCalledWith('thing'));
    });
});
