import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWidgetRegistry } from '@schemastud/seam';
import { FrameProvider } from '../src/context';
import { ListShell } from '../src/ListShell';
import { EditShell } from '../src/EditShell';
import { FrameActionError, actionUrl, resolveActions } from '../src/actions';
import { createResourceTransport } from '../src/resourceTransport';
import { KNOWN_CONTEXTS, type ContextManifest } from '../src/contexts';
import type {
    FrameInjection,
    FrameNotice,
    FramePrimitives,
    FrameTransport,
    Paginated,
    ResourceActionDefinition,
    Row,
} from '../src/types';

afterEach(cleanup);

/**
 * schemastud/laravel-frame ADR-0005 — a framed resource's declared ACTIONS: the button (resource-level
 * beside "New", record-level on each row and on the detail page), the form rendered from the action's
 * input schema, the confirm-only press, the declared result (a notice plus a refetch, or navigation), and
 * the per-actor gate — an action is drawn only where `can.actions[key]` is true.
 */

const ROWS: Row[] = [{ id: '7', name: 'Alpha' }];

const RELOAD: ResourceActionDefinition = {
    key: 'reload',
    label: 'Reload credits',
    scope: 'resource',
    method: 'POST',
    url: '/api/credits/reload',
    input: 'Vendor.Commerce.Data.CreditCheckoutInputData',
    result: 'toast',
    destructive: false,
};

const ARCHIVE: ResourceActionDefinition = {
    key: 'archive',
    label: 'Archive',
    scope: 'record',
    method: 'POST',
    url: '/api/credits/{id}/archive',
    input: null,
    result: 'toast',
    destructive: true,
};

const RELOAD_SCHEMA = {
    type: 'object',
    properties: { amount_usd: { type: 'number', title: 'Amount (USD)' } },
    required: ['amount_usd'],
};

const primitives: FramePrimitives = {
    Button: ({ children, variant: _v, size: _s, ...p }: any) => <button {...p}>{children}</button>,
    Input: (p: any) => <input {...p} />,
    Label: ({ children, ...p }: any) => <label {...p}>{children}</label>,
    Popover: ({ children }: any) => <div>{children}</div>,
    PopoverTrigger: ({ children }: any) => <>{children}</>,
    PopoverContent: ({ children }: any) => <div>{children}</div>,
    SimpleSelect: (p: any) => <select {...p} />,
    Badge: ({ children }: any) => <span>{children}</span>,
    Table: ({ children }: any) => <table>{children}</table>,
    Skeleton: () => <div />,
    SidePanel: ({ children }: any) => <div>{children}</div>,
};

function makeTransport(overrides: Partial<FrameTransport> = {}): FrameTransport {
    return {
        getFilterSchema: vi.fn(async () => ({ properties: {} })),
        getFilterVariants: vi.fn(async (resource) => ({ resource, variants: [] })),
        getFilterOptions: vi.fn(async () => []),
        getSavedFilters: vi.fn(async () => []),
        saveFilter: vi.fn(async () => ({}) as never),
        deleteSavedFilter: vi.fn(async () => undefined),
        list: vi.fn(async (): Promise<Paginated<Row>> => ({ data: ROWS, total: 1, page: 1, perPage: 25 })),
        get: vi.fn(async (_r, id) => ({ id, name: 'Alpha' })),
        getFormSchema: vi.fn(async () => ({ type: 'object', properties: { name: { type: 'string' } } })),
        create: vi.fn(async () => ({}) as never),
        save: vi.fn(async (_r, id, data) => ({ id, ...(data as Row) })),
        remove: vi.fn(async () => undefined),
        invoke: vi.fn(async () => ({ message: 'Credits added.', data: { captured: true } })),
        getActionSchema: vi.fn(async () => RELOAD_SCHEMA),
        ...overrides,
    };
}

function Harness({
    children,
    transport,
    notify,
}: {
    children: ReactNode;
    transport: FrameTransport;
    notify?: (notice: FrameNotice) => void;
}) {
    const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
    const [params, setParams] = useState(new URLSearchParams());
    const [registry] = useState(() => createWidgetRegistry());

    const injection: FrameInjection = {
        transport,
        primitives,
        useUrlState: () => [params, (updater) => setParams((prev) => updater(prev))] as const,
        registry,
        schemaFetcher: async () => ({ type: 'object', properties: {} }),
        can: () => true,
        ...(notify ? { notify } : {}),
    };

    return (
        <QueryClientProvider client={client}>
            <FrameProvider value={injection}>{children}</FrameProvider>
        </QueryClientProvider>
    );
}

const manifestOf = (
    actions: ResourceActionDefinition[],
    can: Record<string, boolean> | undefined,
): ContextManifest => ({
    byNode: { name: { 'list-column': { participates: true, label: 'Name' } } },
    inherits: {},
    known: KNOWN_CONTEXTS,
    createAffordance: 'host',
    actions,
    can: { create: false, update: false, delete: false, ...(can ? { actions: can } : {}) },
});

describe('resolveActions', () => {
    it('keeps only declared actions of the scope this actor may press', () => {
        const manifest = manifestOf([RELOAD, ARCHIVE], { reload: true, archive: false });

        expect(resolveActions(manifest, 'resource').map((a) => a.key)).toEqual(['reload']);
        expect(resolveActions(manifest, 'record')).toEqual([]);
        // Absent `can.actions` hides everything: deny while unknown.
        expect(resolveActions(manifestOf([RELOAD, ARCHIVE], undefined), 'resource')).toEqual([]);
        expect(resolveActions(undefined, 'resource')).toEqual([]);
    });

    it('hides an action the transport cannot send, or whose form it cannot fetch', () => {
        const manifest = manifestOf([RELOAD, ARCHIVE], { reload: true, archive: true });

        expect(resolveActions(manifest, 'resource', {})).toEqual([]);
        expect(resolveActions(manifest, 'resource', { invoke: vi.fn() })).toEqual([]);
        expect(resolveActions(manifest, 'record', { invoke: vi.fn() }).map((a) => a.key)).toEqual(['archive']);
    });

    it('fills a record action URL with the encoded id and leaves a resource URL alone', () => {
        expect(actionUrl(ARCHIVE, 'a/b')).toBe('/api/credits/a%2Fb/archive');
        expect(actionUrl(RELOAD, '7')).toBe('/api/credits/reload');
    });
});

describe('a resource-level action with a declared input', () => {
    it('renders beside the list, opens a form from the input schema, sends it, and announces and refetches', async () => {
        const transport = makeTransport();
        const notify = vi.fn();
        render(
            <Harness transport={transport} notify={notify}>
                <ListShell resource="credits" columns={[]} manifest={manifestOf([RELOAD], { reload: true })} />
            </Harness>,
        );

        fireEvent.click(await screen.findByRole('button', { name: 'Reload credits' }));

        const amount = await screen.findByLabelText(/Amount \(USD\)/);
        expect(transport.getActionSchema).toHaveBeenCalledWith('credits', 'reload');
        fireEvent.change(amount, { target: { value: '25' } });

        const dialog = screen.getByRole('dialog', { name: 'Reload credits' });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Reload credits' }));

        await waitFor(() =>
            expect(transport.invoke).toHaveBeenCalledWith(RELOAD, { id: null, data: { amount_usd: 25 } }),
        );
        await waitFor(() => expect(notify).toHaveBeenCalledWith({ tone: 'success', message: 'Credits added.' }));
        // The declared default result refetches the resource's reads.
        await waitFor(() => expect(transport.list).toHaveBeenCalledTimes(2));
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('shows a 422 on the form and keeps it open', async () => {
        const transport = makeTransport({
            invoke: vi.fn(async () => {
                throw new FrameActionError(422, {
                    message: 'The given data was invalid.',
                    errors: { amount_usd: ['The amount must be at least 1.'] },
                });
            }),
        });
        const notify = vi.fn();
        render(
            <Harness transport={transport} notify={notify}>
                <ListShell resource="credits" columns={[]} manifest={manifestOf([RELOAD], { reload: true })} />
            </Harness>,
        );

        fireEvent.click(await screen.findByRole('button', { name: 'Reload credits' }));
        fireEvent.change(await screen.findByLabelText(/Amount \(USD\)/), { target: { value: '0.5' } });
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reload credits' }));

        expect(await screen.findByText('The amount must be at least 1.')).toBeTruthy();
        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(notify).not.toHaveBeenCalled();
    });

    it('announces any other refusal with the server message', async () => {
        const transport = makeTransport({
            invoke: vi.fn(async () => {
                throw new FrameActionError(402, { message: 'The reload was declined (card_declined).' });
            }),
        });
        const notify = vi.fn();
        render(
            <Harness transport={transport} notify={notify}>
                <ListShell resource="credits" columns={[]} manifest={manifestOf([RELOAD], { reload: true })} />
            </Harness>,
        );

        fireEvent.click(await screen.findByRole('button', { name: 'Reload credits' }));
        fireEvent.change(await screen.findByLabelText(/Amount \(USD\)/), { target: { value: '666.02' } });
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reload credits' }));

        await waitFor(() =>
            expect(notify).toHaveBeenCalledWith({
                tone: 'error',
                message: 'The reload was declined (card_declined).',
            }),
        );
    });

    it('is not drawn for an actor without `can.actions`, nor for one refused it', async () => {
        const transport = makeTransport();
        const { rerender } = render(
            <Harness transport={transport}>
                <ListShell resource="credits" columns={[]} manifest={manifestOf([RELOAD], undefined)} />
            </Harness>,
        );

        await screen.findByText('Alpha');
        expect(screen.queryByRole('button', { name: 'Reload credits' })).toBeNull();

        rerender(
            <Harness transport={transport}>
                <ListShell resource="credits" columns={[]} manifest={manifestOf([RELOAD], { reload: false })} />
            </Harness>,
        );
        await screen.findByText('Alpha');
        expect(screen.queryByRole('button', { name: 'Reload credits' })).toBeNull();
    });
});

describe('a confirm-only record action', () => {
    it('renders on the row, asks, and sends no body for that record; the result shows inline without a host toast', async () => {
        const transport = makeTransport({ invoke: vi.fn(async () => ({ message: 'Archived.', data: null })) });
        const onOpen = vi.fn();
        render(
            <Harness transport={transport}>
                <ListShell
                    resource="credits"
                    columns={[]}
                    onOpen={onOpen}
                    manifest={manifestOf([ARCHIVE], { archive: true })}
                />
            </Harness>,
        );

        fireEvent.click(await screen.findByRole('button', { name: 'Archive' }));
        // The row opens on click; the action must not open it too.
        expect(onOpen).not.toHaveBeenCalled();

        const dialog = screen.getByRole('dialog', { name: 'Archive' });
        expect(within(dialog).getByText('Archive? This cannot be undone.')).toBeTruthy();
        expect(transport.getActionSchema).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Archive' }));

        await waitFor(() => expect(transport.invoke).toHaveBeenCalledWith(ARCHIVE, { id: '7', data: undefined }));
        expect((await screen.findByRole('status')).textContent).toContain('Archived.');
    });

    it('navigates to the resulting record when the result is declared `navigate`', async () => {
        const transport = makeTransport({ invoke: vi.fn(async () => ({ message: 'Copied.', data: { id: '99' } })) });
        const onOpen = vi.fn();
        render(
            <Harness transport={transport}>
                <ListShell
                    resource="credits"
                    columns={[]}
                    onOpen={onOpen}
                    manifest={manifestOf([{ ...ARCHIVE, key: 'copy', label: 'Copy', destructive: false, result: 'navigate' }], { copy: true })}
                />
            </Harness>,
        );

        fireEvent.click(await screen.findByRole('button', { name: 'Copy' }));
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Copy' }));

        await waitFor(() => expect(onOpen).toHaveBeenCalledWith({ id: '99' }));
    });

    it('renders on the detail page for the shown record', async () => {
        const transport = makeTransport();
        render(
            <Harness transport={transport}>
                <EditShell
                    resource="credits"
                    id="7"
                    readOnly
                    container="bare"
                    manifest={manifestOf([ARCHIVE], { archive: true })}
                />
            </Harness>,
        );

        fireEvent.click(await screen.findByRole('button', { name: 'Archive' }));
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Archive' }));

        await waitFor(() => expect(transport.invoke).toHaveBeenCalledWith(ARCHIVE, { id: '7', data: undefined }));
    });
});

describe('createResourceTransport', () => {
    // The CRUD half a host hands over has no action methods of its own.
    const { invoke: _invoke, getActionSchema: _schema, ...crud } = makeTransport();

    it('sends an action to its own URL through the host write and reads its schema off the resource root', async () => {
        const write = vi.fn(async () => ({ success: true, message: 'Archived.', data: { id: '7' } }));
        const read = vi.fn(async () => RELOAD_SCHEMA);
        const transport = createResourceTransport(crud, {
            resourceUrl: (resource) => `/frame/resources/${resource}`,
            read: read as never,
            write: write as never,
        });

        await expect(transport.invoke!(ARCHIVE, { id: '7' })).resolves.toEqual({
            message: 'Archived.',
            data: { id: '7' },
        });
        expect(write).toHaveBeenCalledWith('POST', '/api/credits/7/archive', undefined);

        await transport.invoke!(RELOAD, { data: { amount_usd: 25 } });
        expect(write).toHaveBeenLastCalledWith('POST', '/api/credits/reload', { amount_usd: 25 });

        await transport.getActionSchema!('credits', 'reload');
        expect(read).toHaveBeenCalledWith('/frame/resources/credits/actions/reload/schema');
    });

    it('has no invoke when the host adapter cannot write, so no action is drawn', () => {
        const transport = createResourceTransport(crud, {
            resourceUrl: (resource) => `/frame/resources/${resource}`,
            read: vi.fn() as never,
        });

        expect(transport.invoke).toBeUndefined();
    });
});
