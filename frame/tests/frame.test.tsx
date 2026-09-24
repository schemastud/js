import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(cleanup);
import { FrameProvider } from '../src/context';
import { ListShell } from '../src/ListShell';
import { DefaultLoading } from '../src/slots/defaults';
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
        getFilterVariants: vi.fn(async (resource) => ({ resource, variants: [] })),
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
        create: vi.fn(async (_resource: string, data: unknown) => Response.json({ id: '3', ...(data as object) }).json()),
        save: vi.fn(async (_r, id, data) => ({ id, ...(data as Row) })),
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
    Skeleton: (p: any) => <div data-injected="Skeleton" {...p} />,
    SidePanel: ({ children }: any) => <aside data-injected="SidePanel">{children}</aside>,
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
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>
            <FrameProvider value={injection}>{children}</FrameProvider>
        </QueryClientProvider>
    );
}

// A lightweight FormBody override — proves the shell wiring without dragging RJSF
// into jsdom, and honors readOnly (the shell's contract with the slot).
function MockFormBody({
    schema,
    formData,
    readOnly,
    onChange,
    onSubmit,
    registerSubmit,
}: FormBodySlotProps) {
    const ref = useRef<HTMLFormElement>(null);
    useEffect(() => {
        registerSubmit(() => ref.current?.requestSubmit());
        return () => registerSubmit(null);
    }, [registerSubmit]);
    const props = (schema.properties ?? {}) as Record<string, unknown>;
    return (
        <form
            ref={ref}
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

describe('DefaultLoading', () => {
    // A list's loading state rendered an unsized Skeleton (no height), so a loading page looked EMPTY, and
    // nothing marked it busy for a waiting reader or capture (launch ticket 00, overnight-ui2 02).
    it('is a visible, busy placeholder', () => {
        const Wrapper = wrap(makeInjection({} as FrameTransport));
        const { container } = render(<DefaultLoading />, { wrapper: Wrapper });

        const slot = container.querySelector('[data-frame-slot="Loading"]');
        expect(slot?.getAttribute('aria-busy')).toBe('true');
        const skeleton = container.querySelector('[data-injected="Skeleton"]');
        expect(skeleton?.className ?? '').toMatch(/\bh-\d/);
    });
});

describe('ListShell', () => {
    it('renders a resource end-to-end from a mock transport + mock primitives', async () => {
        const transport = makeTransport();
        const Wrapper = wrap(makeInjection(transport));

        render(<ListShell resource="widgets" columns={[{ field: 'title', header: 'Title' }]} />, {
            wrapper: Wrapper,
        });

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

    // api-surface-coherence 107: a FAILED read is not an EMPTY one. Before the ErrorState
    // slot existed, every 5xx on every frame list fell through to `rows.length === 0` and
    // rendered "No records." — a hard server error presenting as a clean empty state.
    it('renders the error state, not the empty state, when the list read fails', async () => {
        const transport = makeTransport({
            list: vi.fn(async () => {
                throw new Error('Request failed with status code 500');
            }),
        });
        const Wrapper = wrap(makeInjection(transport));

        render(<ListShell resource="widgets" columns={[{ field: 'title' }]} />, {
            wrapper: Wrapper,
        });

        await waitFor(() =>
            expect(document.querySelector('[data-frame-slot="ErrorState"]')).toBeTruthy(),
        );
        expect(screen.getByText('Request failed with status code 500')).toBeTruthy();
        expect(screen.queryByText('No records.')).toBeNull();
    });

    it('a host ErrorState override replaces the default failed-read state', async () => {
        const transport = makeTransport({
            list: vi.fn(async () => {
                throw new Error('boom');
            }),
        });
        const Wrapper = wrap(makeInjection(transport));

        render(
            <ListShell
                resource="widgets"
                columns={[{ field: 'title' }]}
                slots={{ ErrorState: () => <div>custom error</div> }}
            />,
            { wrapper: Wrapper },
        );

        await waitFor(() => expect(screen.getByText('custom error')).toBeTruthy());
    });

    it('overriding one slot via `slots?` swaps only that slot', async () => {
        const transport = makeTransport();
        const Wrapper = wrap(makeInjection(transport));

        render(
            <ListShell
                resource="widgets"
                columns={[{ field: 'title' }]}
                slots={{
                    Empty: () => <div>custom empty</div>,
                    Toolbar: () => <div>custom toolbar</div>,
                }}
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

        render(<ListShell resource="widgets" columns={[{ field: 'title' }]} onOpen={() => {}} />, {
            wrapper: Wrapper,
        });

        await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
        expect(screen.queryByText('New widgets')).toBeNull();
    });
});

describe('EditShell', () => {
    it('renders a form from a mock getFormSchema and submits creation via transport.create', async () => {
        const transport = makeTransport();
        const onSaved = vi.fn();
        const Wrapper = wrap(makeInjection(transport));

        render(
            <EditShell
                resource="widgets"
                id={null}
                slots={{ FormBody: MockFormBody }}
                onSaved={onSaved}
            />,
            { wrapper: Wrapper },
        );

        await waitFor(() => expect(screen.getByLabelText('title')).toBeTruthy());

        fireEvent.change(screen.getByLabelText('title'), {
            target: { value: 'Gamma' },
        });
        await act(async () => {
            fireEvent.click(screen.getByText('Save'));
        });

        await waitFor(() =>
            expect(transport.create).toHaveBeenCalledWith('widgets', {
                title: 'Gamma',
            }),
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
            <EditShell
                resource="widgets"
                id={null}
                showModeToggle
                slots={{ FormBody: MockFormBody }}
            />,
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
        <input
            data-testid="cell-input"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
        />
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
                columns={[
                    {
                        field: 'title',
                        cell: (r) => <span data-testid="host-cell">{String(r.title)}</span>,
                    },
                ]}
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

        render(<ListShell resource="widgets" columns={[{ field: 'title', header: 'Title' }]} />, {
            wrapper: Wrapper,
        });

        await waitFor(() => expect(screen.getAllByText('Alpha')[0]).toBeTruthy());
        // No manifest → the plain DefaultCell path; no editable-cell markup at all.
        expect(document.querySelector('[data-frame-cell]')).toBeNull();
        fireEvent.click(screen.getAllByText('Alpha')[0]);
        expect(screen.queryByTestId('cell-input')).toBeNull();
    });
});

describe('ListShell — contributed columns under dotted pointers (ticket 19)', () => {
    // A producer above frame folds a named slice onto each row; the manifest declares its
    // participation under `as.prop`. Frame knows nothing about the producer — only that a
    // field pointer may have depth.
    const NESTED_ROWS: Row[] = [
        {
            id: '1',
            title: 'Alpha',
            commerce: { plan: 'Pro', billStatus: 'finalized' },
        },
        { id: '2', title: 'Beta', commerce: null },
    ];

    const manifest = {
        byNode: {
            title: { 'list-column': { participates: true, label: 'Title', sort: 0 } },
            'commerce.plan': {
                'list-column': { participates: true, label: 'Plan', sort: 10 },
            },
        },
        inherits: { 'row-cell': ['edit'] as const },
        known: ['edit', 'detail', 'list-column', 'list-item', 'row-cell'],
    } as any;

    function nestedTransport(): FrameTransport {
        return makeTransport({
            list: vi.fn(async () => ({
                data: NESTED_ROWS,
                total: 2,
                page: 1,
                perPage: 25,
            })),
        } as Partial<FrameTransport>);
    }

    it('resolves a contributed column into the column set off the manifest alone', () => {
        // No host column for it: participation IS the declaration, so the seam emits it.
        const resolved = resolveColumns('widgets', undefined, [], manifest);

        expect(resolved.map((c) => c.field)).toEqual(['title', 'commerce.plan']);
        expect(resolved[1].header).toBe('Plan');
    });

    it('a host column may pin a contributed field by its dotted name', () => {
        // `participation.has(col.field)` matches on the dotted string as-is — the manifest
        // check needed no path resolution, only the value read did.
        expect(() =>
            resolveColumns('widgets', undefined, [{ field: 'commerce.plan' }], manifest),
        ).not.toThrow();
    });

    it('renders the contributed value by walking the path, not indexing flat', async () => {
        const Wrapper = wrap(makeInjection(nestedTransport()));

        render(<ListShell resource="widgets" columns={[]} manifest={manifest} />, {
            wrapper: Wrapper,
        });

        await waitFor(() => expect(screen.getAllByText('Alpha')[0]).toBeTruthy());
        // The whole point: a flat `record['commerce.plan']` renders nothing here.
        expect(screen.getAllByText('Pro')[0]).toBeTruthy();
    });

    it('a row whose slice ran and returned null renders empty, not a crash', async () => {
        const Wrapper = wrap(makeInjection(nestedTransport()));

        render(<ListShell resource="widgets" columns={[]} manifest={manifest} />, {
            wrapper: Wrapper,
        });

        await waitFor(() => expect(screen.getAllByText('Beta')[0]).toBeTruthy());
        expect(screen.queryByText('null')).toBeNull();
        expect(screen.queryByText('undefined')).toBeNull();
    });

    it('a contributed field never becomes an inline editor — the seam is read-only', async () => {
        // Belt to the server's braces: a producer folding a slice is refused `row-cell`
        // participation where it declares it, so this manifest cannot legally exist. If it
        // ever did, an editor here would commit into a slice with no writer.
        const Wrapper = wrap(makeInjection(nestedTransport()));

        render(
            <ListShell
                resource="widgets"
                columns={[]}
                manifest={manifest}
                onCellCommit={vi.fn()}
            />,
            {
                wrapper: Wrapper,
            },
        );

        await waitFor(() => expect(screen.getAllByText('Pro')[0]).toBeTruthy());
        expect(document.querySelector('[data-frame-cell]')).toBeNull();
    });
});

describe('EditShell read failures', () => {
    it('does not turn a missing existing record into an empty editable form and can retry', async () => {
        const get = vi
            .fn<FrameTransport['get']>()
            .mockRejectedValueOnce(new Error('404'))
            .mockResolvedValue({ id: 'missing', title: 'Recovered' });
        const transport = makeTransport({ get });
        render(
            <EditShell
                resource="widgets"
                id="missing"
                container="bare"
                slots={{ FormBody: MockFormBody }}
            />,
            { wrapper: wrap(makeInjection(transport)) },
        );
        await screen.findByRole('alert');
        expect(screen.queryByRole('textbox')).toBeNull();
        expect(screen.queryByText('Save')).toBeNull();
        expect(transport.save).not.toHaveBeenCalled();
        fireEvent.click(screen.getByText('Retry'));
        await screen.findByDisplayValue('Recovered');
    });

    it('requires a loaded schema even for create mode', async () => {
        const transport = makeTransport({
            getFormSchema: vi.fn(async () => {
                throw new Error('Unavailable');
            }),
        });
        render(<EditShell resource="widgets" id={null} container="bare" />, {
            wrapper: wrap(makeInjection(transport)),
        });
        expect((await screen.findByRole('alert')).textContent).toContain(
            'Could not load this form.',
        );
        expect(screen.queryByText('Save')).toBeNull();
        expect(transport.get).not.toHaveBeenCalled();
    });

    it('retains unsaved edits across a failed background fetch and successful retry', async () => {
        const get = vi
            .fn<FrameTransport['get']>()
            .mockResolvedValueOnce({ id: '1', title: 'Original' })
            .mockRejectedValueOnce(new Error('Offline'))
            .mockResolvedValue({ id: '1', title: 'Remote update' });
        const transport = makeTransport({ get });
        const client = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });
        render(
            <QueryClientProvider client={client}>
                <FrameProvider value={makeInjection(transport)}>
                    <EditShell
                        resource="widgets"
                        id="1"
                        container="bare"
                        slots={{ FormBody: MockFormBody }}
                    />
                </FrameProvider>
            </QueryClientProvider>,
        );
        fireEvent.change(await screen.findByDisplayValue('Original'), {
            target: { value: 'Local draft' },
        });
        await act(async () => {
            await client.refetchQueries({
                queryKey: ['frame', 'widgets', 'record', '1'],
            });
        });
        await screen.findByRole('alert');
        expect(screen.getByDisplayValue('Local draft')).toBeTruthy();
        expect(screen.queryByText('Save')).toBeNull();
        fireEvent.click(screen.getByText('Retry'));
        await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
        fireEvent.click(screen.getByText('Save'));
        await waitFor(() =>
            expect(transport.save).toHaveBeenCalledWith('widgets', '1', {
                id: '1',
                title: 'Local draft',
            }),
        );
    });

    it('resets an edited record draft when switching to create mode', async () => {
        const transport = makeTransport();
        const view = render(
            <EditShell
                resource="widgets"
                id="1"
                container="bare"
                slots={{ FormBody: MockFormBody }}
            />,
            { wrapper: wrap(makeInjection(transport)) },
        );
        fireEvent.change(await screen.findByDisplayValue('Alpha'), {
            target: { value: 'Previous draft' },
        });
        view.rerender(
            <EditShell
                resource="widgets"
                id={null}
                container="bare"
                slots={{ FormBody: MockFormBody }}
            />,
        );
        await screen.findByRole('textbox');
        fireEvent.click(screen.getByText('Save'));
        await waitFor(() => expect(transport.create).toHaveBeenCalledWith('widgets', {}));
    });
});

describe('EditShell default form stability', () => {
    it('keeps the focused input mounted while editing with asynchronous schema resolution', async () => {
        const transport = makeTransport();
        render(<EditShell resource="widgets" id="1" container="bare" />, {
            wrapper: wrap(makeInjection(transport)),
        });
        const input = await screen.findByDisplayValue('Alpha');
        input.focus();
        await act(async () => {
            fireEvent.change(input, { target: { value: 'Local draft' } });
        });
        await waitFor(() => expect(screen.getByDisplayValue('Local draft')).toBe(input));
        expect(input.isConnected).toBe(true);
        expect(document.activeElement).toBe(input);
        fireEvent.click(screen.getByText('Save'));
        await waitFor(() =>
            expect(transport.save).toHaveBeenCalledWith('widgets', '1', {
                id: '1',
                title: 'Local draft',
            }),
        );
    });
});
