import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FacetsProvider, FacetsResourceProvider } from '../src/context';
import { MultiSelectFilter } from '../src/MultiSelectFilter';
import type { FacetsPrimitives, FacetsTransport, FilterDescriptor } from '../src/types';

afterEach(cleanup);

// The Threads agent filter's shape: a relational facet over the `agents` Options Source (owner-review-20261112 06).
const agents = [
    { value: 'a1', label: 'Ada' },
    { value: 'a2', label: 'Grace' },
    { value: 'a3', label: 'Grant' },
];

const multiple: FilterDescriptor = { name: 'agentId', operator: 'set', control: 'multiselect', optionsRef: 'agents' };
const single: FilterDescriptor = { name: 'circuitId', operator: 'exact', control: 'select', optionsRef: 'agents' };

function mount(descriptor: FilterDescriptor, initial = '') {
    const getFilterOptions = vi.fn(async (_resource: string, _ref: string, search: string) =>
        agents.filter((agent) => agent.label.toLowerCase().includes(search.toLowerCase())),
    );
    const transport: FacetsTransport = {
        getFilterSchema: async () => ({ properties: {} }),
        getFilterVariants: async (resource) => ({ resource, variants: [] }),
        getFilterOptions,
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
        Button: Noop,
        Label: Noop,
        Popover: Noop,
        PopoverTrigger: Noop,
        PopoverContent: Noop,
        SimpleSelect: Noop,
    };
    function Host() {
        const [value, setValue] = useState(initial);
        return (
            <>
                <MultiSelectFilter descriptor={descriptor} label="Agent" value={value} onChange={(next) => setValue(next ?? '')} />
                <output data-testid="value">{value}</output>
            </>
        );
    }
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <FacetsProvider value={{ transport, primitives, useUrlState: () => [new URLSearchParams(), () => {}] }}>
                <FacetsResourceProvider resource="threads">
                    <Host />
                </FacetsResourceProvider>
            </FacetsProvider>
        </QueryClientProvider>,
    );

    return { getFilterOptions, input: screen.getByRole('combobox', { name: 'Agent' }) };
}

const searched = (spy: ReturnType<typeof vi.fn>) => spy.mock.calls.map(([, , search]) => search);

describe('a relational facet picks through the kit combobox', () => {
    it('asks the options source once per typing pause, not once per keystroke', async () => {
        const { input, getFilterOptions } = mount(multiple);

        fireEvent.focus(input);
        await screen.findByRole('option', { name: 'Ada' });
        expect(searched(getFilterOptions)).toEqual(['']);

        for (const typed of ['g', 'gr', 'gra']) fireEvent.change(input, { target: { value: typed } });
        await screen.findByRole('option', { name: 'Grant' });
        await waitFor(() => expect(screen.queryByRole('option', { name: 'Ada' })).toBeNull());

        expect(searched(getFilterOptions)).toEqual(['', 'gra']);
    });

    it('picks with the arrow keys and Enter, and names the active option', async () => {
        const { input } = mount(multiple);
        fireEvent.focus(input);
        await screen.findByRole('option', { name: 'Ada' });

        fireEvent.keyDown(input, { key: 'ArrowDown' });
        expect(input.getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: 'Grace' }).id);
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(screen.getByTestId('value').textContent).toBe('a2');
        expect(screen.getByRole('button', { name: 'Remove Grace' })).toBeTruthy();
    });

    it('multiple: toggles values into a comma-joined set and stays open', async () => {
        const { input } = mount(multiple, 'a1');
        fireEvent.focus(input);
        expect(screen.getByRole('listbox').getAttribute('aria-multiselectable')).toBe('true');

        fireEvent.click(await screen.findByRole('option', { name: 'Grant' }));
        expect(screen.getByTestId('value').textContent).toBe('a1,a3');
        expect(screen.getByRole('listbox')).toBeTruthy();

        fireEvent.click(screen.getByRole('option', { name: 'Ada', selected: true }));
        expect(screen.getByTestId('value').textContent).toBe('a3');
    });

    it('single: replaces the value and closes', async () => {
        const { input } = mount(single, 'a1');
        fireEvent.focus(input);

        fireEvent.click(await screen.findByRole('option', { name: 'Grace' }));
        expect(screen.getByTestId('value').textContent).toBe('a2');
        expect(screen.queryByRole('listbox')).toBeNull();
        expect(input.getAttribute('aria-expanded')).toBe('false');
    });

    it('shows a preselected value by its label before the picker is opened', async () => {
        const { getFilterOptions } = mount(multiple, 'a3');

        expect(await screen.findByRole('button', { name: 'Remove Grant' })).toBeTruthy();
        expect(screen.queryByRole('listbox')).toBeNull();
        expect(searched(getFilterOptions)).toEqual(['']);
    });
});
