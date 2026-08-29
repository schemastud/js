import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWidgetRegistry } from '@schemastud/seam';
import { FrameProvider } from '../src/context';
import { EditShell } from '../src/EditShell';
import { ListShell } from '../src/ListShell';
import { createMountDispatcher } from '../src/mountDispatcher';
import { resolveColumns } from '../src/resolveColumns';
import { KNOWN_CONTEXTS, type ContextManifest } from '../src/contexts';
import type {
    FormBodySlotProps,
    FrameInjection,
    FramePrimitives,
    FrameTransport,
    Paginated,
    Row,
    RouteContextEntry,
} from '../src/types';

afterEach(cleanup);

/**
 * The manifest-driven list, and the provider-level slot defaults.
 *
 * Both changes exist because of the SAME wrong belief, stated in `resolveColumns`'s old docblock
 * and copied into the dispatcher: that a host must hand a list its columns. It never had to — a
 * `ContextManifest`'s `list-column` participation already IS the column set and its order, and
 * host columns are a per-field override map. The dispatcher's `columnsFor` requirement therefore
 * demanded of the host exactly what the declaration already carried, and every `mounts: 'list'`
 * leaf declined for want of nothing.
 */

const ROWS: Row[] = [
    { id: '1', title: 'Alpha', secret: 'shh' },
    { id: '2', title: 'Beta', secret: 'shh' },
];

/**
 * Deliberately declared OUT of sort order and with a non-participating node, so a passing test
 * cannot be explained by object key order or by "everything in byNode became a column".
 */
const MANIFEST: ContextManifest = {
    byNode: {
        '': { 'list-item': { participates: true } },
        title: { 'list-column': { participates: true, sort: 2, label: 'Title' } },
        id: { 'list-column': { participates: true, sort: 1, label: 'Identifier' } },
        secret: { 'list-column': { participates: false } },
    },
    inherits: {},
    known: KNOWN_CONTEXTS,
};

function makeTransport(): FrameTransport {
    return {
        getFilterSchema: vi.fn(async () => ({ properties: {} })),
        getFilterOptions: vi.fn(async () => []),
        getSavedFilters: vi.fn(async () => []),
        saveFilter: vi.fn(async () => ({
            id: '1',
            name: 'v',
            resource: 'widgets',
            query_parameters: {},
            visibility: 'private',
            is_default: false,
        })),
        deleteSavedFilter: vi.fn(async () => undefined),
        list: vi.fn(
            async (): Promise<Paginated<Row>> => ({ data: ROWS, total: 2, page: 1, perPage: 25 }),
        ),
        get: vi.fn(async (_r, id) => ({ id, title: 'Alpha' })),
        getFormSchema: vi.fn(async () => ({
            type: 'object',
            properties: { title: { type: 'string' } },
        })),
        save: vi.fn(async (_r, id, data) => ({ id: id ?? '3', ...(data as Row) })),
        remove: vi.fn(async () => undefined),
    };
}

const primitives: FramePrimitives = {
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
    SidePanel: ({ children }: any) => <aside data-testid="side-panel">{children}</aside>,
    Page: ({ children }: any) => <main data-testid="page">{children}</main>,
};

function useMemoryUrlState() {
    const [params, setParams] = useState(() => new URLSearchParams());
    const set = (updater: (prev: URLSearchParams) => URLSearchParams) =>
        setParams((prev) => new URLSearchParams(updater(new URLSearchParams(prev))));
    return [params, set] as const;
}

function makeInjection(over: Partial<FrameInjection> = {}): FrameInjection {
    return {
        transport: makeTransport(),
        primitives,
        useUrlState: useMemoryUrlState,
        registry: createWidgetRegistry(),
        schemaFetcher: async (ref) => ({ $id: ref }),
        can: () => true,
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

const listEntry: RouteContextEntry = {
    routeName: 'widgets.index',
    path: 'widgets',
    shell: null,
    lazy: false,
    guard: null,
    mounts: 'list',
    resource: 'widgets',
};

const headers = () => screen.getAllByRole('columnheader').map((h) => h.textContent);

// -----------------------------------------------------------------------------------------
// 1. The fact the old docblock denied.
// -----------------------------------------------------------------------------------------

describe('resolveColumns — a manifest with ZERO host columns is a complete column set', () => {
    it('returns every participating field, sort-ordered, with manifest labels as headers', () => {
        expect(resolveColumns('widgets', null, [], MANIFEST)).toEqual([
            { field: 'id', header: 'Identifier' },
            { field: 'title', header: 'Title' },
        ]);
    });

    it('still passes host columns straight through when there is NO manifest — the other path', () => {
        const host = [{ field: 'title', header: 'Custom' }];
        expect(resolveColumns('widgets', null, host, undefined)).toBe(host);
    });
});

// -----------------------------------------------------------------------------------------
// 2. mounts: 'list' renders from the manifest alone.
// -----------------------------------------------------------------------------------------

describe("createMountDispatcher — mounts: 'list'", () => {
    it('dispatches with manifestFor alone, no columnsFor anywhere', () => {
        const dispatch = createMountDispatcher({ manifestFor: () => MANIFEST });

        expect(dispatch(listEntry)).toBeTypeOf('function');
    });

    it('renders a real table whose columns came from the manifest, in sort order', async () => {
        const dispatch = createMountDispatcher({ manifestFor: () => MANIFEST });
        const Dispatched = dispatch(listEntry)!;

        render(<Dispatched />, { wrapper: wrap(makeInjection()) });

        await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
        // Declared title-then-id in byNode; rendered id-then-title because `sort` says so. And
        // `secret` never appears: participates:false is the filter, not schema presence.
        expect(headers()).toEqual(['Identifier', 'Title']);
        expect(screen.queryByText('shh')).toBeNull();
    });

    it('keeps columnsFor as a per-FIELD override, not the set', async () => {
        const dispatch = createMountDispatcher({
            manifestFor: () => MANIFEST,
            columnsFor: () => [{ field: 'title', header: 'Renamed' }],
        });
        const Dispatched = dispatch(listEntry)!;

        render(<Dispatched />, { wrapper: wrap(makeInjection()) });

        await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
        // One header overridden; the set and its order are still the manifest's — a host column
        // cannot add, remove or reorder.
        expect(headers()).toEqual(['Identifier', 'Renamed']);
    });

    it('declines only when the host wired NEITHER lookup, and says which', () => {
        const seen: string[] = [];
        const dispatch = createMountDispatcher({ onDecline: (_, reason) => seen.push(reason) });

        expect(dispatch(listEntry)).toBeUndefined();
        expect(seen[0]).toContain('manifestFor');
    });

    it('renders nothing rather than a headerless table when the manifest has not arrived yet', () => {
        // The decline above is about HOST WIRING and is decided once, at dispatch. Whether a given
        // resource has a manifest is runtime data — a query in flight — and is decided at render,
        // where the component re-runs when it lands.
        const dispatch = createMountDispatcher({ manifestFor: () => undefined });
        const Dispatched = dispatch(listEntry)!;

        const { container } = render(<Dispatched />, { wrapper: wrap(makeInjection()) });

        expect(dispatch(listEntry)).toBeTypeOf('function');
        expect(container.querySelector('[data-frame-shell="list"]')).toBeNull();
    });
});

// -----------------------------------------------------------------------------------------
// 3. Design-system slots default at the provider.
// -----------------------------------------------------------------------------------------

const HostTable = (props: any) => (
    <table data-testid="host-table">
        <thead>
            <tr>
                {props.columns.map((c: { field: string; header?: string }) => (
                    <th key={c.field}>{c.header ?? c.field}</th>
                ))}
            </tr>
        </thead>
        <tbody />
    </table>
);
const HostEmpty = () => <div data-testid="host-empty" />;
const PageTable = (props: any) => (
    <table data-testid="page-table">
        <thead>
            <tr>
                {props.columns.map((c: { field: string; header?: string }) => (
                    <th key={c.field}>{c.header ?? c.field}</th>
                ))}
            </tr>
        </thead>
        <tbody />
    </table>
);

describe('FrameInjection.listSlots — the host names its design system once', () => {
    it('a ListShell passing NO slots at all gets the injection default', async () => {
        render(<ListShell resource="widgets" columns={[]} manifest={MANIFEST} />, {
            wrapper: wrap(makeInjection({ listSlots: { Table: HostTable, Empty: HostEmpty } })),
        });

        await waitFor(() => expect(screen.getByTestId('host-table')).toBeTruthy());
    });

    it('merges PER SLOT: a page overriding Table still inherits the default Empty', async () => {
        const transport = makeTransport();
        (transport.list as any).mockResolvedValue({ data: [], total: 0, page: 1, perPage: 25 });

        render(
            <ListShell
                resource="widgets"
                columns={[]}
                manifest={MANIFEST}
                slots={{ Table: PageTable }}
            />,
            {
                wrapper: wrap(
                    makeInjection({
                        transport,
                        listSlots: { Table: HostTable, Empty: HostEmpty },
                    }),
                ),
            },
        );

        // Zero rows, so it is the Empty slot that renders — and it is the INJECTION's, even though
        // this page supplied a `slots` object. Object-level replacement would have dropped it back
        // to frame's plain-HTML default, which is the bug this shape exists to prevent.
        await waitFor(() => expect(screen.getByTestId('host-empty')).toBeTruthy());
        expect(screen.queryByTestId('host-table')).toBeNull();
    });
});

function MockFormBody({ onSubmit, formData }: FormBodySlotProps) {
    return <form data-testid="mock-form" onSubmit={() => onSubmit(formData)} />;
}

describe('FrameInjection.editSlots — and the one slot the container prop outranks', () => {
    const editInjection = (over: Partial<FrameInjection> = {}) =>
        makeInjection({ editSlots: { FormBody: MockFormBody, Container: HostContainer }, ...over });

    it('supplies an EditShell that passes no slots', async () => {
        render(<EditShell resource="widgets" id="1" />, { wrapper: wrap(editInjection()) });

        await waitFor(() => expect(screen.getByTestId('host-container')).toBeTruthy());
        expect(screen.getByTestId('mock-form')).toBeTruthy();
    });

    it("⚠️ container: 'page' still renders a PAGE, not the injection's default Container", async () => {
        // The dispatched `mounts: 'edit'` leaf is full-page by construction. An app-wide default
        // Container that could override that would silently turn every dispatched editor back into
        // a drawer — with a green tsc, a green suite, and a wrong page. Hence: prop beats default.
        render(<EditShell resource="widgets" id="1" container="page" />, {
            wrapper: wrap(editInjection()),
        });

        await waitFor(() => expect(screen.getByTestId('page')).toBeTruthy());
        expect(screen.queryByTestId('host-container')).toBeNull();
    });

    it("a page's OWN slots.Container still wins over both — that is the caller, not a default", async () => {
        render(
            <EditShell
                resource="widgets"
                id="1"
                container="page"
                slots={{ Container: ({ children }: any) => <div data-testid="own">{children}</div> }}
            />,
            { wrapper: wrap(editInjection()) },
        );

        await waitFor(() => expect(screen.getByTestId('own')).toBeTruthy());
    });
});

function HostContainer({ children }: { children?: ReactNode }) {
    return <div data-testid="host-container">{children}</div>;
}
