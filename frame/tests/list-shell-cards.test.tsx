import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWidgetRegistry, type WidgetRegistry } from '@schemastud/seam';
import { FrameProvider } from '../src/context';
import { ListShell, listItemRendersCards } from '../src/ListShell';
import { registerCardWidgets, type DashboardRow } from '../src/cards';
import { KNOWN_CONTEXTS, type ContextManifest } from '../src/contexts';
import type { CardsSlotProps, FrameInjection, FramePrimitives, FrameTransport, Paginated, Row } from '../src/types';

afterEach(cleanup);

/**
 * The list shell's cards path (realm-dashboards ticket 03) — and, just as load-bearing, the
 * table path it must leave byte-identical for every consumer that never asked for cards.
 */

const DASHBOARD_ROWS: DashboardRow[] = [
    {
        resource: 'tenants',
        context: 'summary',
        navOrder: 0,
        label: 'Tenants',
        href: '/operator/tenants',
        summary: { key: 'tenants', label: 'Tenants', figures: [{ key: 'total', label: 'Total', value: 42 }] },
    },
    {
        resource: 'bills',
        context: 'overview',
        navOrder: 1,
        label: 'Bills',
        href: '/operator/bills',
        summary: { key: 'bills', label: 'Bills', figures: [{ key: 'total', label: 'Period total', value: '$1,240' }] },
    },
    { resource: 'usage', context: 'nav', navOrder: 2, label: 'Usage', href: '/operator/usage', summary: null },
];

const TABLE_ROWS: Row[] = [
    { id: '1', title: 'Alpha' },
    { id: '2', title: 'Beta' },
];

/** The dashboard resource: root `list-item` bound to `dashboard-card`, no columns. */
const DASHBOARD: ContextManifest = {
    byNode: { '': { 'list-item': { participates: true, widget: 'dashboard-card' } } },
    inherits: {},
    known: KNOWN_CONTEXTS,
};

/** An ordinary table resource: columns, and no root entry. */
const TABLE: ContextManifest = {
    byNode: {
        title: { 'list-column': { participates: true, sort: 1, label: 'Title' } },
        id: { 'list-column': { participates: true, sort: 0, label: 'Identifier' } },
    },
    inherits: {},
    known: KNOWN_CONTEXTS,
};

/**
 * The shape `splicewire/tower`'s `ThreadData` / `CompositionData` emit today: a class-level
 * `#[WidgetIn('list-item')]` with NO widget name, plus `#[Column]`s. Both are live tables.
 */
const PARTICIPATES_UNBOUND: ContextManifest = {
    ...TABLE,
    byNode: { ...TABLE.byNode, '': { 'list-item': { participates: true } } },
};

const TARGETS: Record<string, ContextManifest> = {
    tenants: { byNode: {}, inherits: {}, known: KNOWN_CONTEXTS },
    bills: { byNode: {}, inherits: {}, known: KNOWN_CONTEXTS },
};

/** `envelope` overrides the page fields of the list answer — the default is one page of 25. */
function makeTransport(rows: Row[], envelope: Partial<Omit<Paginated<Row>, 'data'>> = {}): FrameTransport {
    return {
        getFilterSchema: vi.fn(async () => ({ properties: {} })),
        getFilterVariants: vi.fn(async (resource: string) => ({ resource, variants: [] })),
        getFilterOptions: vi.fn(async () => []),
        getSavedFilters: vi.fn(async () => []),
        saveFilter: vi.fn(async () => ({
            id: '1',
            name: 'v',
            resource: 'x',
            query_parameters: {},
            visibility: 'private',
            is_default: false,
        })),
        deleteSavedFilter: vi.fn(async () => undefined),
        list: vi.fn(async (): Promise<Paginated<Row>> => ({ data: rows, total: rows.length, page: 1, perPage: 25, ...envelope })),
        get: vi.fn(async (_r, id) => ({ id })),
        getFormSchema: vi.fn(async () => ({ type: 'object', properties: {} })),
        save: vi.fn(async (_r, id, data) => ({ id: id ?? '3', ...(data as Row) })),
        remove: vi.fn(async () => undefined),
    } as unknown as FrameTransport;
}

const primitives = {
    Button: ({ children, ...p }: any) => <button {...p}>{children}</button>,
    Input: (p: any) => <input {...p} />,
    Label: ({ children, ...p }: any) => <label {...p}>{children}</label>,
    Popover: ({ children }: any) => <div>{children}</div>,
    PopoverTrigger: ({ children }: any) => <>{children}</>,
    PopoverContent: ({ children }: any) => <div>{children}</div>,
    SimpleSelect: (p: any) => <select {...p} />,
    Badge: ({ children }: any) => <span>{children}</span>,
    Table: ({ children }: any) => <div>{children}</div>,
    Skeleton: () => <div />,
    SidePanel: ({ children }: any) => <aside>{children}</aside>,
} as FramePrimitives;

function useMemoryUrlState() {
    const [params, setParams] = useState(() => new URLSearchParams());
    const set = (updater: (prev: URLSearchParams) => URLSearchParams) =>
        setParams((prev) => new URLSearchParams(updater(new URLSearchParams(prev))));
    return [params, set] as const;
}

function makeInjection(
    rows: Row[],
    over: Partial<FrameInjection> = {},
    envelope: Partial<Omit<Paginated<Row>, 'data'>> = {},
): FrameInjection {
    const registry = createWidgetRegistry();
    registerCardWidgets(registry);
    return {
        transport: makeTransport(rows, envelope),
        primitives,
        useUrlState: useMemoryUrlState,
        registry,
        schemaFetcher: async (ref) => ({ $id: ref }),
        can: () => true,
        manifestFor: (resource) => TARGETS[resource],
        ...over,
    };
}

function wrap(injection: FrameInjection) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>
            <FrameProvider value={injection}>{children}</FrameProvider>
        </QueryClientProvider>
    );
}

const cards = (container: HTMLElement) => container.querySelectorAll('[data-frame-slot="Cards"] [data-frame-card-cell]');

describe('ListShell — the cards path', () => {
    it('renders N cards for N rows, and no table', async () => {
        const { container } = render(<ListShell resource="operator-dashboard" columns={[]} manifest={DASHBOARD} />, {
            wrapper: wrap(makeInjection(DASHBOARD_ROWS as Row[])),
        });

        await waitFor(() => expect(cards(container)).toHaveLength(3));
        expect(container.querySelector('[data-frame-slot="Table"]')).toBeNull();
        expect(container.querySelector('table')).toBeNull();
        expect(screen.queryAllByRole('columnheader')).toHaveLength(0);

        // Each row went through its own dispatch: a stat-row for the summary row, a figure-card for
        // the overview row, a nav tile for the nav row.
        expect(container.querySelector('[data-frame-card="stat-row"]')).toBeTruthy();
        expect(container.querySelector('[data-frame-card="figure-card"]')).toBeTruthy();
        expect(container.querySelector('a[data-frame-card="nav-tile"]')?.getAttribute('href')).toBe('/operator/usage');
        expect(screen.getByText('42')).toBeTruthy();
        expect(screen.getByText('$1,240')).toBeTruthy();
        // The one output the cards path must never show for a bound row.
        expect(container.innerHTML).not.toContain('{"resource"');
    });

    it('a row whose target manifest is missing drops — cell and all', async () => {
        const rows = [...DASHBOARD_ROWS, { ...DASHBOARD_ROWS[0], resource: 'ghost', label: 'Ghost' }];
        const { container } = render(<ListShell resource="operator-dashboard" columns={[]} manifest={DASHBOARD} />, {
            wrapper: wrap(makeInjection(rows as Row[])),
        });

        // Four rows, three of them drawable: the ghost takes its CELL with it, rather than
        // leaving an empty grid track that reads as a card which failed to load.
        await waitFor(() => expect(cards(container)).toHaveLength(3));
        expect(container.querySelectorAll('[data-frame-card="dashboard-card"]')).toHaveLength(2);
        expect(screen.queryByText('Ghost')).toBeNull();
    });

    it('a host Cards slot (page or injection tier) receives the rows and the bound Card', async () => {
        const HostCards = ({ rows, Card, resource }: CardsSlotProps) => (
            <ul data-testid="host-cards" data-resource={resource}>
                {rows.map((r, i) => (
                    <li key={i}>
                        <Card record={r} />
                    </li>
                ))}
            </ul>
        );
        const { container } = render(<ListShell resource="operator-dashboard" columns={[]} manifest={DASHBOARD} />, {
            wrapper: wrap(makeInjection(DASHBOARD_ROWS as Row[], { listSlots: { Cards: HostCards } })),
        });

        await waitFor(() => expect(screen.getByTestId('host-cards')).toBeTruthy());
        expect(screen.getByTestId('host-cards').getAttribute('data-resource')).toBe('operator-dashboard');
        expect(container.querySelectorAll('[data-testid="host-cards"] > li')).toHaveLength(3);
        expect(container.querySelector('[data-frame-slot="Cards"]')).toBeNull();
        expect(container.querySelector('[data-frame-card="stat-row"]')).toBeTruthy();
    });

    it('the Empty slot still answers zero rows on the cards path', async () => {
        const { container } = render(<ListShell resource="operator-dashboard" columns={[]} manifest={DASHBOARD} />, {
            wrapper: wrap(makeInjection([])),
        });

        await waitFor(() => expect(screen.getByText('No records.')).toBeTruthy());
        expect(container.querySelector('[data-frame-slot="Cards"]')).toBeNull();
    });
});

describe('ListShell — the table path is untouched', () => {
    it('a resource with columns and no root entry renders the table exactly as before', async () => {
        const { container } = render(<ListShell resource="widgets" columns={[]} manifest={TABLE} />, {
            wrapper: wrap(makeInjection(TABLE_ROWS)),
        });

        await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
        expect(container.querySelector('[data-frame-slot="Table"]')).toBeTruthy();
        expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Identifier', 'Title']);
        expect(container.querySelector('[data-frame-slot="Cards"]')).toBeNull();
    });

    it("a root that PARTICIPATES but binds nothing (tower's threads/compositions shape) renders the SAME markup as no root entry at all", async () => {
        // "Byte-identical" is a claim about two renders, so the test compares two renders. The
        // only difference between the manifests is the participating-but-unbound root entry; if
        // it changed one byte of the table — a wrapper, an attribute, a JSON.stringify(record)
        // where a row used to be — this equality is what says so.
        const baseline = render(<ListShell resource="threads" columns={[]} manifest={TABLE} />, {
            wrapper: wrap(makeInjection(TABLE_ROWS)),
        });
        await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
        const withoutRootEntry = baseline.container.innerHTML;
        cleanup();

        const { container } = render(<ListShell resource="threads" columns={[]} manifest={PARTICIPATES_UNBOUND} />, {
            wrapper: wrap(makeInjection(TABLE_ROWS)),
        });
        await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());

        expect(container.innerHTML).toBe(withoutRootEntry);
        expect(container.querySelector('[data-frame-slot="Cards"]')).toBeNull();
        // And, crucially, no JSON.stringify(record) anywhere — the unbound scalar default was never reached.
        expect(container.innerHTML).not.toContain('{"id"');
    });

    it('no manifest at all is the pure passthrough — a table', async () => {
        const { container } = render(<ListShell resource="widgets" columns={[{ field: 'title', header: 'Title' }]} />, {
            wrapper: wrap(makeInjection(TABLE_ROWS)),
        });

        await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
        expect(container.querySelector('[data-frame-slot="Table"]')).toBeTruthy();
    });
});

describe('ListShell — the pager on a single page', () => {
    const pagers = (container: HTMLElement) => container.querySelectorAll('[data-frame-slot="Pagination"]');
    const eightRows: DashboardRow[] = Array.from({ length: 8 }, (_, i) => ({
        ...DASHBOARD_ROWS[0],
        resource: 'tenants',
        label: `Tenants ${i}`,
    }));

    it('the cards path with an 8-row single page renders NO pager, above or below', async () => {
        const { container } = render(<ListShell resource="operator-dashboard" columns={[]} manifest={DASHBOARD} />, {
            wrapper: wrap(makeInjection(eightRows as Row[], {}, { total: 8, page: 1, perPage: 25 })),
        });

        await waitFor(() => expect(cards(container)).toHaveLength(8));
        expect(pagers(container)).toHaveLength(0);
    });

    it("beam's Unpaged shape — `total == perPage` — is one page too", async () => {
        const { container } = render(<ListShell resource="operator-dashboard" columns={[]} manifest={DASHBOARD} />, {
            wrapper: wrap(makeInjection(eightRows as Row[], {}, { total: 8, page: 1, perPage: 8 })),
        });

        await waitFor(() => expect(cards(container)).toHaveLength(8));
        expect(pagers(container)).toHaveLength(0);
    });

    it('a 30-row / 25-per-page table still shows the pager (both placements)', async () => {
        const page = Array.from({ length: 25 }, (_, i) => ({ id: String(i + 1), title: `Row ${i + 1}` }));
        const { container } = render(<ListShell resource="widgets" columns={[]} manifest={TABLE} />, {
            wrapper: wrap(makeInjection(page, {}, { total: 30, page: 1, perPage: 25 })),
        });

        await waitFor(() => expect(screen.getByText('Row 1')).toBeTruthy());
        expect(pagers(container)).toHaveLength(2);
        expect(container.querySelector('[data-frame-page]')?.textContent).toBe('1 / 2');
    });

    it('a stale URL past page 1 over a one-page answer keeps the pager as the way back', async () => {
        const { container } = render(<ListShell resource="widgets" columns={[]} manifest={TABLE} />, {
            wrapper: wrap(makeInjection(TABLE_ROWS, {}, { total: 2, page: 3, perPage: 25 })),
        });

        await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
        expect(pagers(container)).toHaveLength(2);
    });
});

describe('listItemRendersCards — the gate, as a pure function', () => {
    const schema = { type: 'object' };
    let registry: WidgetRegistry;

    const fresh = () => {
        registry = createWidgetRegistry();
        registerCardWidgets(registry);
        return registry;
    };

    it('false without a root entry, without participation, or with a name nothing resolves', () => {
        expect(listItemRendersCards(TABLE, schema, fresh())).toBe(false);
        expect(listItemRendersCards(PARTICIPATES_UNBOUND, schema, fresh())).toBe(false);
        expect(
            listItemRendersCards(
                { ...TABLE, byNode: { '': { 'list-item': { participates: false, widget: 'dashboard-card' } } } },
                schema,
                fresh(),
            ),
        ).toBe(false);
        expect(
            listItemRendersCards(
                { ...TABLE, byNode: { '': { 'list-item': { participates: true, widget: 'not-registered' } } } },
                schema,
                fresh(),
            ),
        ).toBe(false);
    });

    it('true when the bound name resolves a component, or a host registered a list-item default', () => {
        expect(listItemRendersCards(DASHBOARD, schema, fresh())).toBe(true);

        const withDefault = fresh();
        withDefault.registerWidget((s) => s['x-frame-context'] === 'list-item', () => <div />);
        expect(listItemRendersCards(PARTICIPATES_UNBOUND, schema, withDefault)).toBe(true);
    });
});
