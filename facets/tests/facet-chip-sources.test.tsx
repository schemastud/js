import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FacetsProvider } from '../src/context';
import { FacetsBar } from '../src/FacetsBar';
import type { FacetsPrimitives, FacetsTransport, FilterDescriptor, FilterOption } from '../src/types';

afterEach(cleanup);

/**
 * frame-foundation 60, the amend (build-qa REVISE on f59742a): matching is local to the facet. A value matches only its
 * OWN source's options (the label cache is kept per optionsRef), and membership is by own key, never an inherited Object
 * property. These are build-qa's probes, as written.
 */
const periods: FilterOption[] = [
    { value: '7', label: 'Last 7 days' },
    { value: '28', label: 'Last 28 days' },
];

const passthrough = ({ children }: { children?: ReactNode }) => <>{children}</>;

function mount(
    descriptor: Omit<FilterDescriptor, 'name' | 'operator'>,
    values: Record<string, string>,
    getFilterOptions: FacetsTransport['getFilterOptions'] = vi.fn(async () => periods),
) {
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
    const primitives: FacetsPrimitives = {
        Input: (props) => <input {...props} />,
        Badge: ({ children }) => <span>{children}</span>,
        Button: ({ children, ...props }) => <button type="button" {...props}>{children}</button>,
        Label: ({ children }) => <span>{children}</span>,
        Popover: passthrough,
        PopoverTrigger: passthrough,
        PopoverContent: () => null,
        SimpleSelect: () => null,
    };
    return render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <FacetsProvider value={{ transport, primitives, useUrlState: () => [new URLSearchParams(), () => {}] }}>
                <FacetsBar
                    resource="traffic"
                    schema={{ properties: { period: { title: 'Period', 'x-filter': { name: 'period', operator: 'exact', ...descriptor } }, status: { title: 'Status', 'x-filter': { name: 'status', operator: 'exact', control: 'select', optionsRef: 'statuses' } } } }}
                    values={values}
                    sort={null}
                    onFilterChange={() => {}}
                    onSortChange={() => {}}
                />
            </FacetsProvider>
        </QueryClientProvider>,
    );
}

/** The chip's trigger: the button whose text is the facet label, alone (neutral) or followed by a value. */
const chip = () =>
    screen.queryAllByRole('button').find((button) => button.textContent === 'Period' || button.textContent?.startsWith('Period:')) ?? null;
const clear = () => screen.queryByRole('button', { name: 'Clear Period' });

describe('review: matching is local to the current facet', () => {
 it('keeps an unknown period neutral when another facet has that id', async () => {
  mount({control:'select',optionsRef:'periods'}, {period:'13',status:'13'}, vi.fn(async(_resource,ref)=>ref==='statuses'?[{value:'13',label:'Blue'}]:periods));
  await waitFor(()=>expect(screen.queryAllByRole('button').some(b=>b.textContent==='Status: Blue')).toBe(true));
  expect(chip()?.textContent).toBe('Period');
 });
 it('does not count another facet option as a period selection', async () => {
  mount({control:'multiselect',optionsRef:'periods'}, {period:'7,13',status:'13'}, vi.fn(async(_resource,ref)=>ref==='statuses'?[{value:'13',label:'Blue'}]:periods));
  await waitFor(()=>expect(screen.queryAllByRole('button').some(b=>b.textContent==='Status: Blue')).toBe(true));
  expect(chip()?.textContent).toBe('Period: Last 7 days');
 });
 it('does not count Object.prototype properties as options', () => {
  mount({control:'multiselect',options:[{value:'7',label:'Last 7 days'}]}, {period:'7,toString'});
  expect(chip()?.textContent).toBe('Period: Last 7 days');
 });
});
