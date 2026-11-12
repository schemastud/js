import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FacetsProvider } from '../src/context';
import { FacetsBar } from '../src/FacetsBar';
import type { FacetsPrimitives, FacetsTransport, FilterDescriptor, FilterOption } from '../src/types';

afterEach(cleanup);

/**
 * frame-foundation 60: a select facet's chip never shows a raw URL value. On /operator/analytics-traffic
 * `?filter[period]=13` drew "Period: 13" (the server falls back to its default; 13 is no option). The x-filter descriptor
 * names no default, so (coord-lead ruling, 19:17Z, confirmed by root): an INLINE-options facet (a complete domain) draws
 * no chip for a value that matches no option; an optionsRef facet (a domain not promised complete) draws a NEUTRAL chip,
 * the facet label alone, visible and clearable, for an unmatched value and while its options load. A valid value draws
 * its label, and "N selected" counts only matching values. The raw value never shows.
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
                    schema={{ properties: { period: { title: 'Period', 'x-filter': { name: 'period', operator: 'exact', ...descriptor } } } }}
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

describe('a select facet chip never shows a raw URL value', () => {
    it('optionsRef, an unknown single value: a neutral chip (the label alone), visible and clearable, never the raw value', async () => {
        const options = vi.fn(async () => periods);
        const { container } = mount({ control: 'select', optionsRef: 'periods' }, { period: '13' }, options);
        await waitFor(() => expect(options).toHaveBeenCalled());
        await act(async () => {});
        expect(chip()?.textContent).toBe('Period');
        expect(clear()).not.toBeNull();
        expect(container.textContent).not.toContain('13');
    });

    it('optionsRef, a VALID value beyond a capped first page: the same neutral chip, so the applied filter stays visible and clearable', async () => {
        // The source caps its list (7 and 28 only); 90 is valid server-side but absent from what the bar can see.
        const { container } = mount({ control: 'select', optionsRef: 'periods' }, { period: '90' });
        await act(async () => {});
        await waitFor(() => expect(chip()?.textContent).toBe('Period'));
        expect(clear()).not.toBeNull();
        expect(container.textContent).not.toContain('90');
    });

    it('inline options, an unknown single value: no chip', () => {
        const { container } = mount({ control: 'select', options: [{ value: 7, label: 'Last 7 days' }, { value: 28, label: 'Last 28 days' }] }, { period: '13' });
        expect(chip()).toBeNull();
        expect(clear()).toBeNull();
        expect(container.textContent).not.toContain('13');
    });

    it('inline options, a valid value: its label', () => {
        mount({ control: 'select', options: [{ value: 7, label: 'Last 7 days' }, { value: 28, label: 'Last 28 days' }] }, { period: '28' });
        expect(chip()?.textContent).toBe('Period: Last 28 days');
    });

    it('optionsRef, a valid value: its label', async () => {
        mount({ control: 'select', optionsRef: 'periods' }, { period: '28' });
        await waitFor(() => expect(chip()?.textContent).toBe('Period: Last 28 days'));
    });

    it('an absent filter draws no chip', async () => {
        mount({ control: 'select', optionsRef: 'periods' }, {});
        await act(async () => {});
        expect(chip()).toBeNull();
    });

    it('optionsRef, while the options load: the neutral chip, never the raw value; then still never it', async () => {
        let resolve!: (rows: FilterOption[]) => void;
        const options = vi.fn(() => new Promise<FilterOption[]>((r) => (resolve = r)));
        const { container } = mount({ control: 'select', optionsRef: 'periods' }, { period: '13' }, options);
        await waitFor(() => expect(options).toHaveBeenCalled());
        expect(chip()?.textContent).toBe('Period');
        expect(container.textContent).not.toContain('13');
        await act(async () => resolve(periods));
        expect(chip()?.textContent).toBe('Period');
        expect(container.textContent).not.toContain('13');
    });

    it('optionsRef, a valid value while loading: the neutral chip, then its label', async () => {
        let resolve!: (rows: FilterOption[]) => void;
        const options = vi.fn(() => new Promise<FilterOption[]>((r) => (resolve = r)));
        const { container } = mount({ control: 'select', optionsRef: 'periods' }, { period: '28' }, options);
        await waitFor(() => expect(options).toHaveBeenCalled());
        expect(chip()?.textContent).toBe('Period');
        expect(container.textContent).not.toMatch(/\b28\b/);
        await act(async () => resolve(periods));
        await waitFor(() => expect(chip()?.textContent).toBe('Period: Last 28 days'));
    });

    it('"N selected" counts only the values that match an option', async () => {
        mount({ control: 'multiselect', optionsRef: 'periods' }, { period: '7,13,28' });
        await waitFor(() => expect(chip()?.textContent).toBe('Period: 2 selected'));
    });

    it('a multi-value facet with one matching value draws that label, never the unmatched one', async () => {
        const { container } = mount({ control: 'multiselect', optionsRef: 'periods' }, { period: '13,28' });
        await waitFor(() => expect(chip()?.textContent).toBe('Period: Last 28 days'));
        expect(container.textContent).not.toContain('13');
    });

    it('inline options, a multi-value facet with no matching value: no chip', () => {
        const { container } = mount({ control: 'multiselect', options: [{ value: 7, label: 'Last 7 days' }] }, { period: '13,90' });
        expect(chip()).toBeNull();
        expect(container.textContent).not.toMatch(/13|90/);
    });
});
