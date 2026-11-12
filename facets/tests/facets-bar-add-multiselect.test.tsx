import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FacetsProvider } from '../src/context';
import { FacetsBar } from '../src/FacetsBar';
import type { FacetsPrimitives, FacetsTransport, FilterDescriptor } from '../src/types';

afterEach(cleanup);

// owner-review-20261112 06, build-qa REVISE at 6f5a3a4: a multiselect facet added from `+ Filter` closed on its first
// pick, because its first value moved it from the "just added" popover to the active chips, a different element. The
// real bar, picker and kit list run here; only the popover is a stand-in that honours open and close.

const OpenContext = createContext<{ open: boolean; toggle: () => void }>({ open: false, toggle: () => {} });
const Popover = ({ open, onOpenChange, children }: { open?: boolean; onOpenChange?: (open: boolean) => void; children?: ReactNode }) => (
    <OpenContext.Provider value={{ open: Boolean(open), toggle: () => onOpenChange?.(!open) }}>
        <div data-popover>{children}</div>
    </OpenContext.Provider>
);
// The trigger's click toggles, as Radix's does.
const PopoverTrigger = ({ children }: { children?: ReactNode }) => {
    const { toggle } = useContext(OpenContext);
    return <span onClickCapture={toggle}>{children}</span>;
};
const PopoverContent = ({ children }: { children?: ReactNode }) => (useContext(OpenContext).open ? <div data-popover-content>{children}</div> : null);

const agents = [
    { value: 'a1', label: 'Ada' },
    { value: 'a2', label: 'Grace' },
];

function mount(control: FilterDescriptor['control']) {
    const transport: FacetsTransport = {
        getFilterSchema: async () => ({ properties: {} }),
        getFilterVariants: async (resource) => ({ resource, variants: [] }),
        getFilterOptions: vi.fn(async (_resource: string, _ref: string, search: string) =>
            agents.filter((agent) => agent.label.toLowerCase().includes(search.toLowerCase())),
        ),
        getSavedFilters: async () => [],
        saveFilter: async () => {
            throw new Error('Unused');
        },
        deleteSavedFilter: async () => undefined,
    };
    const Noop = () => null;
    const primitives: FacetsPrimitives = {
        Input: (props) => <input {...props} />,
        Badge: ({ children }) => <span>{children}</span>,
        Button: ({ children, ...props }) => <button type="button" {...props}>{children}</button>,
        Label: ({ children }) => <span>{children}</span>,
        Popover,
        PopoverTrigger,
        PopoverContent,
        SimpleSelect: Noop,
    };
    function Host() {
        const [values, setValues] = useState<Record<string, string>>({});
        return (
            <>
                <FacetsBar
                    resource="threads"
                    schema={{ properties: { agentId: { title: 'Agent', 'x-filter': { name: 'agentId', operator: 'set', control, optionsRef: 'agents' } } } }}
                    values={values}
                    sort={null}
                    onFilterChange={(name, value) => setValues((prev) => {
                        const next = { ...prev };
                        if (value) next[name] = value;
                        else delete next[name];
                        return next;
                    })}
                    onSortChange={() => {}}
                />
                <output data-testid="value">{values.agentId ?? ''}</output>
            </>
        );
    }
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <FacetsProvider value={{ transport, primitives, useUrlState: () => [new URLSearchParams(), () => {}] }}>
                <Host />
            </FacetsProvider>
        </QueryClientProvider>,
    );
}

async function addAgentFacet() {
    fireEvent.click(screen.getByRole('button', { name: /Filter/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Agent' }));
    const input = await screen.findByRole('combobox', { name: 'Agent' });
    fireEvent.focus(input);
    await screen.findByRole('option', { name: 'Ada' });
    return input;
}

describe('a facet added from + Filter keeps its picker across the first value', () => {
    it('multiselect: the first and second keyboard picks both land, with the list open between them', async () => {
        mount('multiselect');
        const input = await addAgentFacet();

        fireEvent.keyDown(input, { key: 'Enter' });
        expect(screen.getByTestId('value').textContent).toBe('a1');
        // Still open, the same input still in the document, the list still showing.
        expect(screen.getByRole('combobox', { name: 'Agent' })).toBe(input);
        expect(await screen.findByRole('option', { name: 'Grace' })).toBeTruthy();

        fireEvent.keyDown(input, { key: 'ArrowDown' });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(screen.getByTestId('value').textContent).toBe('a1,a2');
        expect(screen.getByRole('listbox')).toBeTruthy();
        await waitFor(() => expect(screen.getByRole('button', { name: 'Clear Agent' })).toBeTruthy());
    });

    it('select: the first pick replaces the value and closes', async () => {
        mount('select');
        const input = await addAgentFacet();

        fireEvent.keyDown(input, { key: 'Enter' });

        expect(screen.getByTestId('value').textContent).toBe('a1');
        await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
        expect(screen.queryByRole('combobox', { name: 'Agent' })).toBeNull();
    });
});
