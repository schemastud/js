import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWidgetRegistry } from '@schemastud/seam';
import { FrameProvider } from '../src/context';
import { ResourcePicker } from '../src/resource-picker/ResourcePicker';
import {
    EMPTY_SELECTION,
    followFilters,
    pageState,
    selectAllMatching,
    selectionCount,
    selectionFromValue,
    selectionToValue,
    setPagePicked,
    togglePick,
    type ResourceSelection,
} from '../src/resource-picker/selection';
import { resolveKindPlacement, resolveRecordPlacement } from '../src/resource-picker/placement';
import { PICKER_KINDS, PICKER_MANIFESTS, PICKER_SECTIONS, createPickerTransport } from '../src/resource-picker/fixtures';
import { mockPrimitives } from '../src/story-harness';
import type { FrameInjection, FrameTransport } from '../src/types';

afterEach(cleanup);

function makeInjection(transport: FrameTransport, url = new URLSearchParams()): FrameInjection {
    return {
        transport,
        primitives: mockPrimitives,
        // The HOST page's URL state. The picker must neither write into it nor read from it.
        useUrlState: () => [url, () => undefined] as const,
        registry: createWidgetRegistry(),
        schemaFetcher: async (ref) => ({ $id: ref }),
        can: () => true,
        manifestFor: (resource) => PICKER_MANIFESTS[resource],
    };
}

function Providers({ injection, children }: { injection: FrameInjection; children: ReactNode }) {
    const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
    return (
        <QueryClientProvider client={client}>
            <FrameProvider value={injection}>{children}</FrameProvider>
        </QueryClientProvider>
    );
}

function RecordHarness({
    placement,
    initial = EMPTY_SELECTION,
    spy,
}: {
    placement: 'field' | 'attach' | 'bulk' | 'dynamic';
    initial?: ResourceSelection;
    spy: (s: ResourceSelection) => void;
}) {
    const [value, setValue] = useState<ResourceSelection>(initial);
    return (
        <ResourcePicker
            resource="threads"
            placement={placement}
            labelField="title"
            value={value}
            onChange={(next) => {
                spy(next);
                setValue(next);
            }}
        />
    );
}

const last = (spy: ReturnType<typeof vi.fn>) => spy.mock.calls.at(-1)?.[0] as ResourceSelection;
const checkbox = (name: string) => screen.findByRole('checkbox', { name: new RegExp(`(Select|Deselect) ${name}$`) });

describe('selection model', () => {
    it('toggles by id; single keeps one; a set toggle is an exclusion', () => {
        let s: ResourceSelection = EMPTY_SELECTION;
        s = togglePick(s, 'a', 'multi');
        s = togglePick(s, 'b', 'multi');
        expect(s).toEqual({ mode: 'ids', ids: ['a', 'b'] });
        expect(togglePick(s, 'c', 'single')).toEqual({ mode: 'ids', ids: ['c'] });
        const set = togglePick(selectAllMatching({ status: 'open' }, '-updatedAt'), 'x', 'multi');
        expect(set).toEqual({ mode: 'set', filter: { status: 'open' }, sort: '-updatedAt', exclude: ['x'] });
    });

    it('page state is tri-state, and ticking a page keeps picks from other pages', () => {
        const s = setPagePicked({ mode: 'ids', ids: ['z'] }, ['a', 'b'], true);
        expect(s).toEqual({ mode: 'ids', ids: ['z', 'a', 'b'] });
        expect(pageState(s, ['a', 'b'])).toBe('all');
        expect(pageState(s, ['a', 'c'])).toBe('some');
        expect(pageState(s, ['c'])).toBe('none');
        expect(setPagePicked(s, ['a', 'b'], false)).toEqual({ mode: 'ids', ids: ['z'] });
    });

    it('a set follows the facets and keeps its exclusions', () => {
        const set = { mode: 'set' as const, filter: {}, sort: null, exclude: ['t-2'] };
        expect(followFilters(set, { keywords: 'invoice' }, null)).toEqual({
            mode: 'set',
            filter: { keywords: 'invoice' },
            sort: null,
            exclude: ['t-2'],
        });
        expect(followFilters({ mode: 'ids', ids: ['a'] }, { keywords: 'x' }, null)).toEqual({ mode: 'ids', ids: ['a'] });
    });

    it('a set counts only exclusions known to match, and says so', () => {
        const set = { mode: 'set' as const, filter: {}, sort: null, exclude: ['a', 'b'] };
        expect(selectionCount(set, 100, 2)).toEqual({ count: 98, exact: true });
        expect(selectionCount(set, 100, 1)).toEqual({ count: 99, exact: false });
        expect(selectionCount(set, null)).toEqual({ count: null, exact: false });
    });

    it('round-trips a form value per select mode', () => {
        expect(selectionFromValue('t-1')).toEqual({ mode: 'ids', ids: ['t-1'] });
        expect(selectionFromValue(['a', 'b'])).toEqual({ mode: 'ids', ids: ['a', 'b'] });
        expect(selectionFromValue(undefined)).toEqual(EMPTY_SELECTION);
        expect(selectionToValue({ mode: 'ids', ids: ['a'] }, 'single')).toBe('a');
        expect(selectionToValue({ mode: 'ids', ids: ['a', 'b'] }, 'multi')).toEqual(['a', 'b']);
        const set = selectAllMatching({ status: 'open' }, null);
        expect(selectionFromValue(selectionToValue(set, 'set'))).toEqual(set);
    });
});

describe('placement presets', () => {
    it('stage 1: density picks the ruled body; catalog only by flag', () => {
        expect(resolveKindPlacement('nav')).toMatchObject({ scope: 'framed', density: 'compact', variant: 'rail', orientation: 'horizontal' });
        expect(resolveKindPlacement('seeder')).toMatchObject({ scope: 'writable', density: 'expanded', select: 'multi', variant: 'palette' });
        expect(resolveKindPlacement('filters')).toMatchObject({ scope: 'filterable', variant: 'rail', orientation: 'vertical' });
        expect(resolveKindPlacement('field', { density: 'expanded' }).variant).toBe('palette');
        expect(resolveKindPlacement('catalog', { variant: 'catalog' }).variant).toBe('catalog');
    });

    it('stage 2: compact typeahead for field/attach, expanded shell for bulk/dynamic', () => {
        expect(resolveRecordPlacement('field')).toEqual({ density: 'compact', select: 'single' });
        expect(resolveRecordPlacement('attach')).toEqual({ density: 'compact', select: 'multi' });
        expect(resolveRecordPlacement('bulk')).toEqual({ density: 'expanded', select: 'multi' });
        expect(resolveRecordPlacement('dynamic')).toEqual({ density: 'expanded', select: 'set' });
        expect(resolveRecordPlacement('bulk', { select: 'single' })).toEqual({ density: 'expanded', select: 'single' });
    });
});

describe('ResourcePicker — stage 2 embedded list shell', () => {
    it('selection survives paging (server pages, kept by id)', async () => {
        const transport = createPickerTransport({ threads: 30 });
        const spy = vi.fn();
        render(
            <Providers injection={makeInjection(transport)}>
                <RecordHarness placement="bulk" spy={spy} />
            </Providers>,
        );
        fireEvent.click(await checkbox('Invoice dispute #0001'));
        fireEvent.click(screen.getByRole('button', { name: /Next/ }));
        fireEvent.click(await checkbox('Invoice dispute #0013'));
        expect(last(spy)).toEqual({ mode: 'ids', ids: ['t-1', 't-13'] });

        fireEvent.click(screen.getByRole('button', { name: /Prev/ }));
        const first = await checkbox('Invoice dispute #0001');
        expect((first as HTMLInputElement).checked).toBe(true);
        // The page request went to the server with its own page param — never sliced client-side.
        expect(transport.calls.some((c) => c.resource === 'threads' && c.params.page === '2')).toBe(true);
        // …and the picker's paging never touched the host page's URL state.
        expect(transport.calls.every((c) => !('placement' in c.params))).toBe(true);
    });

    it('the header checkbox is tri-state, and picked rows carry the selected tint hook', async () => {
        const transport = createPickerTransport({ threads: 30 });
        const spy = vi.fn();
        render(
            <Providers injection={makeInjection(transport)}>
                <RecordHarness placement="bulk" spy={spy} />
            </Providers>,
        );
        fireEvent.click(await checkbox('Invoice dispute #0001'));
        const header = screen.getByRole('checkbox', { name: 'Select all threads on this page' }) as HTMLInputElement;
        expect(header.indeterminate).toBe(true);
        expect(header.getAttribute('aria-checked')).toBe('mixed');
        const row = (await checkbox('Invoice dispute #0001')).closest('tr')!;
        expect(row.hasAttribute('data-selected')).toBe(true);
        expect(row.getAttribute('aria-selected')).toBe('true');

        fireEvent.click(header);
        expect((last(spy) as { ids: string[] }).ids).toHaveLength(10);
        const all = screen.getByRole('checkbox', { name: 'Deselect all threads on this page' }) as HTMLInputElement;
        expect(all.checked).toBe(true);
        expect(all.indeterminate).toBe(false);
    });

    it('“Select all N matching” becomes a set, and an untick becomes an exclusion', async () => {
        const transport = createPickerTransport({ threads: 30 });
        const spy = vi.fn();
        render(
            <Providers injection={makeInjection(transport)}>
                <RecordHarness placement="bulk" spy={spy} />
            </Providers>,
        );
        fireEvent.click(await screen.findByRole('button', { name: 'Select all 30 matching' }));
        expect(last(spy)).toEqual({ mode: 'set', filter: {}, sort: null, exclude: [] });

        fireEvent.click(await checkbox('Onboarding checklist #0002'));
        expect(last(spy)).toEqual({ mode: 'set', filter: {}, sort: null, exclude: ['t-2'] });
        const bar = screen.getByRole('status');
        await waitFor(() => expect(within(bar).getByText(/except 1/)).toBeTruthy());
        expect(within(bar).getByText(/29 today/)).toBeTruthy();
    });

    it('exclusions survive a filter change, and the count stops claiming to be exact', async () => {
        const transport = createPickerTransport({ threads: 30 });
        const spy = vi.fn();
        render(
            <Providers injection={makeInjection(transport)}>
                <RecordHarness
                    placement="bulk"
                    initial={{ mode: 'set', filter: {}, sort: null, exclude: ['t-2'] }}
                    spy={spy}
                />
            </Providers>,
        );
        await checkbox('Onboarding checklist #0002');
        fireEvent.change(await screen.findByRole('textbox', { name: 'Search' }), { target: { value: 'Refund' } });
        await waitFor(() =>
            expect(last(spy)).toEqual({ mode: 'set', filter: { keywords: 'Refund' }, sort: null, exclude: ['t-2'] }),
        );
        // t-2 ("Onboarding…") does not match "Refund"; it is kept, but not subtracted from the count.
        await waitFor(() => expect(within(screen.getByRole('status')).getByText(/up to 3 today/)).toBeTruthy());
    });

    it('the dynamic preset starts as a set over every record', async () => {
        const transport = createPickerTransport({ threads: 30 });
        render(
            <Providers injection={makeInjection(transport)}>
                <RecordHarness placement="dynamic" spy={vi.fn()} />
            </Providers>,
        );
        const bar = await screen.findByRole('status');
        await waitFor(() => expect(within(bar).getByText('Dynamic')).toBeTruthy());
        expect(within(bar).getByText(/30 today/)).toBeTruthy();
        expect(((await checkbox('Invoice dispute #0001')) as HTMLInputElement).checked).toBe(true);
    });

    it('never offers New, row actions or inline edits, whatever the host allows', async () => {
        const transport = createPickerTransport({ threads: 30 });
        render(
            <Providers injection={makeInjection(transport)}>
                <RecordHarness placement="bulk" spy={vi.fn()} />
            </Providers>,
        );
        await checkbox('Invoice dispute #0001');
        expect(screen.queryByRole('button', { name: /^New/ })).toBeNull();
        expect(screen.queryByRole('button', { name: /Delete/ })).toBeNull();
    });

    it('a failed read keeps the selection and offers a retry', async () => {
        const transport = createPickerTransport({ threads: 30, failList: true });
        render(
            <Providers injection={makeInjection(transport)}>
                <RecordHarness placement="bulk" initial={{ mode: 'ids', ids: ['t-1'] }} spy={vi.fn()} />
            </Providers>,
        );
        expect(await screen.findByText(/Your selection is kept/)).toBeTruthy();
        expect(screen.getAllByRole('button', { name: /Try again|Retry/ }).length).toBeGreaterThan(0);
    });
});

describe('ResourcePicker — stage 2 compact typeahead', () => {
    it('searches the server with filter[keywords] and per_page=8, says “8 of N”, and offers Browse all N', async () => {
        const transport = createPickerTransport({ threads: 300 });
        const spy = vi.fn();
        render(
            <Providers injection={makeInjection(transport)}>
                <RecordHarness placement="field" spy={spy} />
            </Providers>,
        );
        fireEvent.click(screen.getByRole('button', { name: /Choose a thread/ }));
        const search = await screen.findByRole('combobox', { name: 'Search threads' });
        await screen.findByText('8 of 300', { exact: false });
        expect(screen.getByRole('button', { name: 'Browse all 300 with filters' })).toBeTruthy();

        fireEvent.change(search, { target: { value: 'refund' } });
        await waitFor(() =>
            expect(
                transport.calls.some((c) => c.params['filter[keywords]'] === 'refund' && c.params.per_page === '8'),
            ).toBe(true),
        );
        const option = await screen.findByRole('option', { name: /Refund request #0003/ });
        fireEvent.click(option);
        expect(last(spy)).toEqual({ mode: 'ids', ids: ['t-3'] });
        // Single closes on pick and the trigger names the pick from the label cache.
        await waitFor(() => expect(screen.getByRole('button', { name: /Refund request #0003/ })).toBeTruthy());
    });

    it('“Browse all” opens the embedded shell in a sheet that edits a draft until confirmed', async () => {
        const transport = createPickerTransport({ threads: 30 });
        const spy = vi.fn();
        render(
            <Providers injection={makeInjection(transport)}>
                <RecordHarness placement="attach" spy={spy} />
            </Providers>,
        );
        fireEvent.click(screen.getByRole('button', { name: /Add threads/ }));
        fireEvent.click(await screen.findByRole('button', { name: /Browse all 30 with filters/ }));
        const sheet = await screen.findByRole('dialog', { name: 'Choose threads' });
        fireEvent.click(await within(sheet).findByRole('checkbox', { name: 'Select Invoice dispute #0001' }));
        expect(spy).not.toHaveBeenCalled();
        fireEvent.click(within(sheet).getByRole('button', { name: 'Use 1 thread' }));
        expect(last(spy)).toEqual({ mode: 'ids', ids: ['t-1'] });
    });
});

describe('ResourcePicker — stage 1 kinds', () => {
    function KindHarness(props: { placement: 'nav' | 'field' | 'filters' | 'seeder' | 'catalog'; variant?: 'catalog'; spy: (k: string[]) => void }) {
        const [value, setValue] = useState<string[]>([]);
        return (
            <ResourcePicker
                kinds={PICKER_KINDS}
                sections={PICKER_SECTIONS}
                placement={props.placement}
                variant={props.variant}
                value={value}
                onChange={(next) => {
                    props.spy(next);
                    setValue(next);
                }}
            />
        );
    }

    it('expanded is the palette: searchable, scoped, multi for the seeder', () => {
        const spy = vi.fn();
        const { container } = render(<KindHarness placement="seeder" spy={spy} />);
        expect(container.querySelector('[data-variant="palette"]')).toBeTruthy();
        // writable scope: read-only Messages is out, Threads is in.
        expect(screen.queryByRole('button', { name: /^Messages/ })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /^Threads/ }));
        fireEvent.click(screen.getByRole('button', { name: /^Agents/ }));
        expect(spy.mock.calls.at(-1)?.[0]).toEqual(['threads', 'agents']);
        fireEvent.change(screen.getByRole('searchbox', { name: 'Search resources' }), { target: { value: 'circ' } });
        expect(screen.queryByRole('button', { name: /^Threads/ })).toBeNull();
        expect(screen.getByRole('button', { name: /^Circuits/ })).toBeTruthy();
    });

    it('compact is the rail: section icons with flyouts; the unsectioned tail groups by package', async () => {
        const spy = vi.fn();
        const { container } = render(<KindHarness placement="field" spy={spy} />);
        expect(container.querySelector('[data-variant="rail"]')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /^Other, 5 resources/ }));
        expect(await screen.findByText('Market')).toBeTruthy();
        expect(screen.getByText('Accounts')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /^Products/ }));
        expect(spy.mock.calls.at(-1)?.[0]).toEqual(['products']);
    });

    it('catalog is reachable only by the variant flag', () => {
        const { container } = render(<KindHarness placement="catalog" variant="catalog" spy={vi.fn()} />);
        expect(container.querySelector('[data-variant="catalog"]')).toBeTruthy();
        cleanup();
        const plain = render(<KindHarness placement="catalog" spy={vi.fn()} />);
        expect(plain.container.querySelector('[data-variant="palette"]')).toBeTruthy();
    });

    it('nav scope is framed kinds only', () => {
        render(<KindHarness placement="nav" spy={vi.fn()} />);
        // 19 kinds, 3 unframed (tags, messages, api-tokens) → the rail's sections count only framed ones.
        expect(screen.getByRole('button', { name: /^Knowledge, 3 resources/ })).toBeTruthy();
    });
});

describe('ResourcePicker — accessible name', () => {
    it('a labelled trigger is named by the field label AND its value', async () => {
        const transport = createPickerTransport({ threads: 30 });
        render(
            <Providers injection={makeInjection(transport)}>
                <span id="thread-label">Thread</span>
                <ResourcePicker
                    resource="threads"
                    placement="field"
                    labelField="title"
                    value={EMPTY_SELECTION}
                    onChange={() => undefined}
                    aria-labelledby="thread-label"
                />
            </Providers>,
        );
        expect(screen.getByRole('button', { name: 'Thread Choose a thread…' })).toBeTruthy();
    });
});

describe('ResourcePicker — revision (impeccable critique)', () => {
    it('a dynamic set offers no Clear: it cannot mean "nothing", and its facets stay true', async () => {
        const transport = createPickerTransport({ threads: 30 });
        render(
            <Providers injection={makeInjection(transport)}>
                <RecordHarness placement="dynamic" spy={vi.fn()} />
            </Providers>,
        );
        await checkbox('Invoice dispute #0001');
        expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
    });

    it('the confirm bar carries the live count in one verb', async () => {
        const transport = createPickerTransport({ threads: 30 });
        function Confirmable() {
            const [value, setValue] = useState<ResourceSelection>({ mode: 'set', filter: {}, sort: null, exclude: ['t-2'] });
            return (
                <ResourcePicker resource="threads" placement="bulk" labelField="title" value={value} onChange={setValue} onConfirm={() => undefined} />
            );
        }
        render(
            <Providers injection={makeInjection(transport)}>
                <Confirmable />
            </Providers>,
        );
        expect(await screen.findByRole('button', { name: 'Use 29 threads (all matching)' })).toBeTruthy();
    });
});
