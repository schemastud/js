// C17 — Frame shell terminal-state + create-chrome contract (UX08/UX09/UX13/UX14).
// The shells must own complete, mutually-exclusive loading/empty/not-found/error states; create mode
// must carry a resource heading; a long edit form must keep scroll space under its sticky Save bar;
// and an empty list must render ONE pagination boundary, never the top+bottom pair.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FrameProvider } from '../src/context';
import { ListShell } from '../src/ListShell';
import { EditShell } from '../src/EditShell';
import type {
    FrameCan,
    FrameInjection,
    FramePrimitives,
    FrameTransport,
    FormBodySlotProps,
    Paginated,
    Row,
} from '../src/types';
import { createWidgetRegistry } from '@schemastud/seam';

afterEach(cleanup);

const ROWS: Row[] = [
    { id: '1', title: 'Alpha' },
    { id: '2', title: 'Beta' },
];

function makeTransport(overrides: Partial<FrameTransport> = {}): FrameTransport {
    return {
        getFilterSchema: vi.fn(async () => ({ properties: {} })),
        getFilterVariants: vi.fn(async (resource) => ({ resource, variants: [] })),
        getFilterOptions: vi.fn(async () => []),
        getSavedFilters: vi.fn(async () => []),
        saveFilter: vi.fn(async () => ({
            id: '1',
            name: 'v',
            resource: 'thing',
            queryParameters: {},
            visibility: 'private',
            isDefault: false,
        })),
        deleteSavedFilter: vi.fn(async () => undefined),
        list: vi.fn(
            async (): Promise<Paginated<Row>> => ({ data: ROWS, total: 2, page: 1, perPage: 25 }),
        ),
        get: vi.fn(async (_r, id) => ({ id, title: 'Alpha' })),
        getFormSchema: vi.fn(async () => ({ type: 'object', properties: { title: { type: 'string' } } })),
        create: vi.fn(async (_resource: string, data: unknown) => ({ id: '3', ...(data as object) })),
        save: vi.fn(async (_r, id, data) => ({ id, ...(data as Row) })),
        remove: vi.fn(async () => undefined),
        ...overrides,
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
    Skeleton: (p: any) => <div {...p} />,
    SidePanel: ({ children }: any) => <aside>{children}</aside>,
};

function useMemoryUrlState() {
    const [params, setParams] = useState(() => new URLSearchParams());
    const set = (updater: (prev: URLSearchParams) => URLSearchParams) =>
        setParams((prev) => new URLSearchParams(updater(new URLSearchParams(prev))));
    return [params, set] as const;
}

function makeInjection(transport: FrameTransport, can: FrameCan = () => true): FrameInjection {
    return {
        transport,
        primitives,
        useUrlState: useMemoryUrlState,
        registry: createWidgetRegistry(),
        schemaFetcher: async (ref) => ({ $id: ref }),
        can,
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

function MockFormBody({ schema, formData, readOnly, onChange, onSubmit, registerSubmit }: FormBodySlotProps) {
    const ref = useRef<HTMLFormElement>(null);
    useEffect(() => {
        registerSubmit(() => ref.current?.requestSubmit());
        return () => registerSubmit(null);
    }, [registerSubmit]);
    const props = (schema.properties ?? {}) as Record<string, unknown>;
    return (
        <form ref={ref} data-testid="mock-form" onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
            {Object.keys(props).map((field) => (
                <input key={field} aria-label={field} disabled={readOnly}
                    defaultValue={String(formData[field] ?? '')}
                    onChange={(e) => onChange({ ...formData, [field]: e.target.value })} />
            ))}
        </form>
    );
}

const WIDGET_MANIFEST = { singularLabel: 'Widget' } as any;
const status = (code: number, msg = 'x') => Object.assign(new Error(msg), { status: code });

describe('EditShell create chrome (C17)', () => {
    it('renders an h1 derived from the resource title in create mode', async () => {
        const transport = makeTransport();
        render(
            <EditShell resource="widgets" id={null} container="bare" slots={{ FormBody: MockFormBody }} manifest={WIDGET_MANIFEST} />,
            { wrapper: wrap(makeInjection(transport)) },
        );
        const h1 = await screen.findByRole('heading', { level: 1 });
        expect(h1.textContent).toBe('New Widget');
    });

    it('keeps bottom scroll space under a sticky Save bar so Save cannot cover the last field', async () => {
        const transport = makeTransport();
        const { container } = render(
            <EditShell resource="widgets" id={null} container="bare" slots={{ FormBody: MockFormBody }} manifest={WIDGET_MANIFEST} />,
            { wrapper: wrap(makeInjection(transport)) },
        );
        await screen.findByRole('heading', { level: 1 });
        const spacer = container.querySelector('[data-frame-shell="edit-bottom-spacer"]') as HTMLElement | null;
        expect(spacer).not.toBeNull();
        expect(parseFloat(spacer!.style.height)).toBeGreaterThan(0);
        const saveBar = container.querySelector('[data-frame-slot="SaveBar"]') as HTMLElement | null;
        expect(saveBar).not.toBeNull();
        expect(saveBar!.getAttribute('data-frame-sticky')).toBe('save');
        expect(saveBar!.style.position).toBe('sticky');
    });
});

describe('EditShell terminal states (C17)', () => {
    it('renders a DISTINCT not-found state (no retry) for a 404 record read', async () => {
        const get = vi.fn<FrameTransport['get']>().mockRejectedValue(status(404, 'nope'));
        const { container } = render(
            <EditShell resource="widgets" id="missing" container="bare" slots={{ FormBody: MockFormBody }} manifest={WIDGET_MANIFEST} />,
            { wrapper: wrap(makeInjection(makeTransport({ get }))) },
        );
        await screen.findByRole('alert');
        expect(container.querySelector('[data-frame-slot="NotFound"]')).not.toBeNull();
        expect(container.querySelector('[data-frame-shell="edit-error"]')).toBeNull();
        expect(screen.queryByText('Retry')).toBeNull();
        expect(screen.queryByRole('textbox')).toBeNull();
    });

    it('renders the generic retryable error (NOT not-found) for a non-404 read failure', async () => {
        const get = vi.fn<FrameTransport['get']>().mockRejectedValue(status(500, 'kaboom'));
        const { container } = render(
            <EditShell resource="widgets" id="x" container="bare" slots={{ FormBody: MockFormBody }} manifest={WIDGET_MANIFEST} />,
            { wrapper: wrap(makeInjection(makeTransport({ get }))) },
        );
        await screen.findByRole('alert');
        expect(container.querySelector('[data-frame-shell="edit-error"]')).not.toBeNull();
        expect(container.querySelector('[data-frame-slot="NotFound"]')).toBeNull();
        expect(screen.getByText('Retry')).toBeTruthy();
    });
});

describe('ListShell state matrix (C17)', () => {
    it('empty page shows the empty state with EXACTLY ONE pagination boundary', async () => {
        const list = vi.fn(async (): Promise<Paginated<Row>> => ({ data: [], total: 100, page: 5, perPage: 25 }));
        const { container } = render(
            <ListShell resource="widgets" columns={[{ field: 'title' }]} />,
            { wrapper: wrap(makeInjection(makeTransport({ list }))) },
        );
        await screen.findByText('No records.');
        expect(container.querySelectorAll('[data-frame-slot="Empty"]').length).toBe(1);
        expect(container.querySelectorAll('[data-frame-slot="Pagination"]').length).toBe(1);
        expect(container.querySelector('[data-frame-slot="ErrorState"]')).toBeNull();
        expect(container.querySelector('[data-frame-slot="Loading"]')).toBeNull();
    });

    it('a populated list keeps top AND bottom pagination (two boundaries)', async () => {
        const list = vi.fn(async (): Promise<Paginated<Row>> => ({ data: ROWS, total: 100, page: 1, perPage: 25 }));
        const { container } = render(
            <ListShell resource="widgets" columns={[{ field: 'title' }]} />,
            { wrapper: wrap(makeInjection(makeTransport({ list }))) },
        );
        await screen.findByText('Alpha');
        expect(container.querySelectorAll('[data-frame-slot="Pagination"]').length).toBe(2);
    });

    it('a rejected list read shows the error state, not empty, with no pagination', async () => {
        const list = vi.fn(async () => { throw status(500, 'boom'); });
        const { container } = render(
            <ListShell resource="widgets" columns={[{ field: 'title' }]} />,
            { wrapper: wrap(makeInjection(makeTransport({ list }))) },
        );
        await waitFor(() => expect(screen.getByText('Could not load this list.')).toBeTruthy());
        expect(container.querySelector('[data-frame-slot="Empty"]')).toBeNull();
        expect(container.querySelectorAll('[data-frame-slot="Pagination"]').length).toBe(0);
    });
});
