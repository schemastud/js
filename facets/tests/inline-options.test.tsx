import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FacetsProvider, FacetsResourceProvider } from '../src/context';
import { MultiSelectFilter } from '../src/MultiSelectFilter';
import { FacetsBar } from '../src/FacetsBar';
import type { FacetsPrimitives, FacetsTransport, FilterDescriptor } from '../src/types';

afterEach(cleanup);

function mount(descriptor: FilterDescriptor, initial = '', bar = false) {
    const labels = vi.fn();
    const getFilterOptions = vi.fn(async (_resource: string, _ref: string, search: string) =>
        [{ value: 'remote', label: 'Remote record' }].filter((option) => option.label.toLowerCase().includes(search.toLowerCase())),
    );
    const transport: FacetsTransport = {
        getFilterSchema: async () => ({ properties: {} }),
        getFilterVariants: async (resource) => ({ resource, variants: [] }),
        getFilterOptions,
        getSavedFilters: async () => [],
        saveFilter: async () => { throw new Error('Unused'); },
        deleteSavedFilter: async () => undefined,
    };
    const Noop = () => null;
    const primitives: FacetsPrimitives = {
        Input: (props) => <input {...props} />,
        Badge: ({ children }) => <span>{children}</span>,
        Button: Noop, Label: Noop, Popover: ({ children }) => <>{children}</>, PopoverTrigger: ({ children }) => <>{children}</>, PopoverContent: Noop, SimpleSelect: Noop,
    };
    function Host() {
        const [value, setValue] = useState(initial);
        if (bar) return <FacetsBar resource="pages" schema={{ properties: {
            status: { title: 'Status', 'x-filter': descriptor },
            other: { title: 'Other', 'x-filter': { ...descriptor, name: 'other', options: [{ value: 'published', label: 'Other label' }] } },
        } }} values={{ status: value, other: 'published' }} sort={null} onFilterChange={() => {}} onSortChange={() => {}} />;
        return <><MultiSelectFilter descriptor={descriptor} value={value} onChange={(next) => setValue(next ?? '')} onLabelsResolved={labels} /><output data-testid="value">{value}</output></>;
    }
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <FacetsProvider value={{ transport, primitives, useUrlState: () => [new URLSearchParams(), () => {}] }}>
            <FacetsResourceProvider resource="pages"><Host /></FacetsResourceProvider>
        </FacetsProvider>
    </QueryClientProvider>);
    return { labels, getFilterOptions, input: screen.queryByPlaceholderText('Search…')! };
}

const descriptor: FilterDescriptor = {
    name: 'status', operator: 'set', control: 'multiselect',
    options: [{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }, { value: 'archived', label: 'Archived' }],
};

describe('declared inline filter options', () => {
    it('searches enum labels, picks multiple values and preserves labels for initial selections', async () => {
        const { input, labels, getFilterOptions } = mount(descriptor, 'draft');
        expect(screen.getByRole('button', { name: 'Remove Draft' })).toBeTruthy();
        fireEvent.focus(input);
        expect(screen.getByRole('button', { name: 'Archived' })).toBeTruthy();
        fireEvent.change(input, { target: { value: 'unmatched' } });
        expect(screen.queryByRole('list')).toBeNull();
        expect(screen.queryByRole('button', { name: 'Published' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Archived' })).toBeNull();
        fireEvent.change(input, { target: { value: 'PUBL' } });
        expect(screen.queryByRole('button', { name: 'Archived' })).toBeNull();
        fireEvent.mouseDown(screen.getByRole('button', { name: 'Published' }));
        expect(screen.getByTestId('value').textContent).toBe('draft,published');
        expect(screen.getByRole('button', { name: 'Remove Draft' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Remove Draft' }));
        expect(screen.getByTestId('value').textContent).toBe('published');
        await waitFor(() => expect(labels).toHaveBeenCalledWith({ draft: 'Draft', published: 'Published', archived: 'Archived' }));
        expect(getFilterOptions).not.toHaveBeenCalled();
    });

    it('serializes numeric and boolean values including zero and false without losing their labels', () => {
        const { input, getFilterOptions } = mount({ ...descriptor, options: [
            { value: 0, label: 'Zero' }, { value: false, label: 'No' }, { value: true, label: 'Yes' },
        ] }, 'false');
        expect(screen.getByRole('button', { name: 'Remove No' })).toBeTruthy();
        fireEvent.focus(input);
        fireEvent.mouseDown(screen.getByRole('button', { name: 'Zero' }));
        fireEvent.mouseDown(screen.getByRole('button', { name: 'Yes' }));
        expect(screen.getByTestId('value').textContent).toBe('false,0,true');
        expect(getFilterOptions).not.toHaveBeenCalled();
    });

    it('replaces a single value and closes the inline picker', () => {
        const { input } = mount({ ...descriptor, control: 'select' }, 'draft');
        fireEvent.focus(input);
        fireEvent.mouseDown(screen.getByRole('button', { name: 'Published' }));
        expect(screen.getByTestId('value').textContent).toBe('published');
        expect(screen.queryByRole('list')).toBeNull();
    });

    it('uses each facet declaration for collapsed deep-linked chips before opening a picker', () => {
        const { getFilterOptions } = mount(descriptor, 'published', true);
        expect(screen.getByRole('button', { name: 'Status: Published' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Other: Other label' })).toBeTruthy();
        expect(getFilterOptions).not.toHaveBeenCalled();
    });

    it('keeps relational option loading and server search working', async () => {
        const { input, getFilterOptions } = mount({ name: 'record', operator: 'set', control: 'multiselect', optionsRef: 'records' });
        fireEvent.focus(input);
        fireEvent.mouseDown(await screen.findByRole('button', { name: 'Remote record' }));
        expect(screen.getByTestId('value').textContent).toBe('remote');
        fireEvent.change(input, { target: { value: 'other' } });
        await waitFor(() => expect(getFilterOptions).toHaveBeenCalledWith('pages', 'records', 'other'));
        expect(screen.getByRole('button', { name: 'Remove Remote record' })).toBeTruthy();
    });
});
