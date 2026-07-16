import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(cleanup);
import { FrameProvider } from '../src/context';
import { ListShell } from '../src/ListShell';
import { EditShell } from '../src/EditShell';
import { resolveColumns } from '../src/resolveColumns';
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

/**
 * The whole frame contract exercised through fakes — mock transport, mock design-
 * system primitives, mock URL-state, an injected `can`. No backend, no router, no
 * RJSF: if the shells render a resource, page it, and round-trip a save through the
 * injected transport, the three-seam injection holds.
 */

const ROWS: Row[] = [
    { id: '1', title: 'Alpha' },
    { id: '2', title: 'Beta' },
];

function makeTransport(overrides: Partial<FrameTransport> = {}): FrameTransport {
    return {
        // facets' five
        getFilterSchema: vi.fn(async () => ({ properties: {} })),
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
        // frame's CRUD
        list: vi.fn(
            async (): Promise<Paginated<Row>> => ({
                data: ROWS,
                total: 2,
                page: 1,
                perPage: 25,
            }),
        ),
        get: vi.fn(async (_r, id) => ({ id, title: 'Alpha' })),
        getFormSchema: vi.fn(async () => ({
            type: 'object',
            properties: { title: { type: 'string' } },
        })),
        save: vi.fn(async (_r, id, data) => ({ id: id ?? '3', ...(data as Row) })),
        remove: vi.fn(async () => undefined),
        ...overrides,
    };
}

// Tagged primitive stubs so a test can prove the injected set (not a default) rendered.
const primitives: FramePrimitives = {
    Button: ({ children, ...p }: any) => (
        <button data-injected="Button" {...p}>
            {children}
        </button>
    ),
    Input: (p: any) => <input data-injected="Input" {...p} />,
    Label: ({ children, ...p }: any) => <label {...p}>{children}</label>,
    Popover: ({ children }: any) => <div>{children}</div>,
    PopoverTrigger: ({ children }: any) => <>{children}</>,
    PopoverContent: ({ children }: any) => <div>{children}</div>,
    SimpleSelect: (p: any) => <select data-injected="SimpleSelect" {...p} />,
    Badge: ({ children }: any) => <span>{children}</span>,
    Table: ({ children }: any) => <div data-injected="Table">{children}</div>,
    Skeleton: () => <div data-injected="Skeleton" />,
    SidePanel: ({ children }: any) => <aside data-injected="SidePanel">{children}</aside>,
};

function useMemoryUrlState() {
    const [params, setParams] = useState(() => new URLSearchParams());
    const set = (updater: (prev: URLSearchParams) => URLSearchParams) =>
        setParams((prev) => new URLSearchParams(updater(new URLSearchParams(prev))));
    return [params, set] as const;
}

function makeInjection(
    transport: FrameTransport,
    can: FrameCan = () => true,
): FrameInjection {
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

// A lightweight FormBody override — proves the shell wiring without dragging RJSF
// into jsdom, and honors readOnly (the shell's contract with the slot).
function MockFormBody({ schema, formData, readOnly, onChange, onSubmit }: FormBodySlotProps) {
    const props = (schema.properties ?? {}) as Record<string, unknown>;
    return (
        <form
            data-testid="mock-form"
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit(formData);
            }}
        >
            {Object.keys(props).map((field) => (
                <input
                    key={field}
                    aria-label={field}
                    disabled={readOnly}
                    defaultValue={String(formData[field] ?? '')}
                    onChange={(e) => onChange({ ...formData, [field]: e.target.value })}
                />
            ))}
        </form>
    );
}

describe('ListShell', () => {
    it('renders a resource end-to-end from a mock transport + mock primitives', async () => {
        const transport = makeTransport();
        const Wrapper = wrap(makeInjection(transport));

        render(
            <ListShell resource="widgets" columns={[{ field: 'title', header: 'Title' }]} />,
            { wrapper: Wrapper },
        );

        await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
        expect(screen.getByText('Beta')).toBeTruthy();
        expect(transport.list).toHaveBeenCalledWith('widgets', expect.any(Object));
        // Frame's generalized DataTable default rendered.
        expect(document.querySelector('[data-frame-slot="Table"]')).toBeTruthy();
    });

    it('shows the empty default when the transport returns no rows', async () => {
        const transport = makeTransport({
            list: vi.fn(async () => ({ data: [], total: 0, page: 1, perPage: 25 })),
        });
        const Wrapper = wrap(makeInjection(transport));

        render(<ListShell resource="widgets" columns={[{ field: 'title' }]} />, {
            wrapper: Wrapper,
        });

        await waitFor(() => expect(screen.getByText('No records.')).toBeTruthy());
    });

    it('overriding one slot via `slots?` swaps only that slot', async () => {
        const transport = makeTransport();
        const Wrapper = wrap(makeInjection(transport));

        render(
            <ListShell
                resource="widgets"
                columns={[{ field: 'title' }]}
                slots={{ Empty: () => <div>custom empty</div>, Toolbar: () => <div>custom toolbar</div> }}
            />,
            { wrapper: Wrapper },
        );

        await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
        // The Table default still rendered (not overridden); Toolbar was swapped.
        expect(screen.getByText('custom toolbar')).toBeTruthy();
        expect(document.querySelector('[data-frame-slot="Table"]')).toBeTruthy();
    });

    it('gates the New affordance through the injected `can`', async () => {
        const transport = makeTransport();
        const cannotCreate: FrameCan = (action) => action !== 'create';
        const Wrapper = wrap(makeInjection(transport, cannotCreate));

        render(
            <ListShell resource="widgets" columns={[{ field: 'title' }]} onOpen={() => {}} />,
            { wrapper: Wrapper },
        );

        await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
        expect(screen.queryByText('New widgets')).toBeNull();
    });
});

describe('EditShell', () => {
    it('renders a form from a mock getFormSchema and submits via transport.save', async () => {
        const transport = makeTransport();
        const onSaved = vi.fn();
        const Wrapper = wrap(makeInjection(transport));

        render(
            <EditShell resource="widgets" id={null} slots={{ FormBody: MockFormBody }} onSaved={onSaved} />,
            { wrapper: Wrapper },
        );

        await waitFor(() => expect(screen.getByLabelText('title')).toBeTruthy());

        fireEvent.change(screen.getByLabelText('title'), { target: { value: 'Gamma' } });
        await act(async () => {
            fireEvent.click(screen.getByText('Save'));
        });

        await waitFor(() =>
            expect(transport.save).toHaveBeenCalledWith('widgets', null, { title: 'Gamma' }),
        );
        expect(onSaved).toHaveBeenCalled();
    });

    it('readOnly disables inputs and hides the Save affordance', async () => {
        const transport = makeTransport();
        const Wrapper = wrap(makeInjection(transport));

        render(
            <EditShell resource="widgets" id="1" readOnly slots={{ FormBody: MockFormBody }} />,
            { wrapper: Wrapper },
        );

        await waitFor(() => expect(screen.getByLabelText('title')).toBeTruthy());
        expect((screen.getByLabelText('title') as HTMLInputElement).disabled).toBe(true);
        expect(screen.queryByText('Save')).toBeNull();
    });

    it('hides the splicewire/raw mode toggle by default (a dev-only affordance)', async () => {
        const transport = makeTransport();
        const Wrapper = wrap(makeInjection(transport));

        render(<EditShell resource="widgets" id={null} slots={{ FormBody: MockFormBody }} />, {
            wrapper: Wrapper,
        });

        await waitFor(() => expect(screen.getByTestId('mock-form')).toBeTruthy());
        // A resource declares its `form` mode; the runtime switch is noise in the product.
        expect(screen.queryByRole('radiogroup', { name: 'Form mode' })).toBeNull();
    });

    it('shows the mode toggle when showModeToggle is opted in', async () => {
        const transport = makeTransport();
        const Wrapper = wrap(makeInjection(transport));

        render(
            <EditShell resource="widgets" id={null} showModeToggle slots={{ FormBody: MockFormBody }} />,
            { wrapper: Wrapper },
        );

        await waitFor(() => expect(screen.getByTestId('mock-form')).toBeTruthy());
        expect(screen.getByRole('radiogroup', { name: 'Form mode' })).toBeTruthy();
    });

    it('binds `id === null` to create (save with null id)', async () => {
        const transport = makeTransport();
        const Wrapper = wrap(makeInjection(transport));

        render(<EditShell resource="widgets" id={null} slots={{ FormBody: MockFormBody }} />, {
            wrapper: Wrapper,
        });

        await waitFor(() => expect(screen.getByTestId('mock-form')).toBeTruthy());
        // No record fetch when creating.
        expect(transport.get).not.toHaveBeenCalled();
    });
});

describe('resolveColumns seam', () => {
    it('v1 strategy returns the host-supplied FrameColumn[]', () => {
        const columns = [{ field: 'title' }, { field: 'value' }];
        expect(resolveColumns('widgets', undefined, columns)).toBe(columns);
    });
});

describe('ListShell — editable row-cell wiring (FC-23)', () => {
    // A registry carrying a controllable `email-input` so a row-cell-participating
    // field can become editable-in-place.
    const EmailInput = ({ value, onChange }: any) => (
        <input data-testid="cell-input" value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
    );

    function injectionWithWidget(transport: FrameTransport): FrameInjection {
        const registry = createWidgetRegistry();
        registry.registerWidget('email-input', EmailInput);
        return { ...makeInjection(transport), registry };
    }

    const manifest = {
        byNode: {
            title: {
                edit: { participates: true, widget: 'email-input' },
                'row-cell': { participates: true, inheritsBinding: true },
                'list-column': { participates: true, label: 'Title' },
            },
        },
        inherits: { 'row-cell': ['edit'] as const },
        known: ['edit', 'row-cell', 'list-column'],
    } as any;

    it('a row-cell-participating field with no host cell becomes editable-in-place', async () => {
        const transport = makeTransport();
        const onCellCommit = vi.fn();
        const Wrapper = wrap(injectionWithWidget(transport));

        render(
            <ListShell
                resource="widgets"
                columns={[{ field: 'title', header: 'Title' }]}
                manifest={manifest}
                onCellCommit={onCellCommit}
            />,
            { wrapper: Wrapper },
        );

        await waitFor(() => expect(screen.getAllByText('Alpha')[0]).toBeTruthy());

        // Read view first; activate the first row's cell → the inherited edit widget mounts.
        expect(screen.queryByTestId('cell-input')).toBeNull();
        fireEvent.click(screen.getAllByText('Alpha')[0]);
        const input = screen.getByTestId('cell-input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'Alpha!' } });
        await act(async () => {
            fireEvent.blur(input.parentElement!);
        });
        expect(onCellCommit).toHaveBeenCalledWith(
            expect.objectContaining({ id: '1', title: 'Alpha' }),
            'title',
            'Alpha!',
        );
    });

    it('a host FrameColumn.cell override still wins — EditableCell is not used', async () => {
        const transport = makeTransport();
        const Wrapper = wrap(injectionWithWidget(transport));

        render(
            <ListShell
                resource="widgets"
                columns={[{ field: 'title', cell: (r) => <span data-testid="host-cell">{String(r.title)}</span> }]}
                manifest={manifest}
                onCellCommit={vi.fn()}
            />,
            { wrapper: Wrapper },
        );

        await waitFor(() => expect(screen.getAllByTestId('host-cell')[0]).toBeTruthy());
        // The host closure rendered; no editable-cell affordance for this field.
        fireEvent.click(screen.getAllByTestId('host-cell')[0]);
        expect(screen.queryByTestId('cell-input')).toBeNull();
        expect(document.querySelector('[data-frame-cell]')).toBeNull();
    });

    it('absent manifest ⇒ unchanged behavior — no EditableCell (not a gate)', async () => {
        const transport = makeTransport();
        const Wrapper = wrap(injectionWithWidget(transport));

        render(
            <ListShell resource="widgets" columns={[{ field: 'title', header: 'Title' }]} />,
            { wrapper: Wrapper },
        );

        await waitFor(() => expect(screen.getAllByText('Alpha')[0]).toBeTruthy());
        // No manifest → the plain DefaultCell path; no editable-cell markup at all.
        expect(document.querySelector('[data-frame-cell]')).toBeNull();
        fireEvent.click(screen.getAllByText('Alpha')[0]);
        expect(screen.queryByTestId('cell-input')).toBeNull();
    });
});
