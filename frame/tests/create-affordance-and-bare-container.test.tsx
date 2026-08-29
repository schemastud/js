import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWidgetRegistry } from '@schemastud/seam';
import { FrameProvider } from '../src/context';
import { ListShell } from '../src/ListShell';
import { EditShell } from '../src/EditShell';
import { DefaultToolbar } from '../src/slots/defaults';
import { ShadcnToolbar } from '../src/shadcn/list-slots';
import { KNOWN_CONTEXTS, type ContextManifest } from '../src/contexts';
import type {
    FrameInjection,
    FramePrimitives,
    FrameTransport,
    Paginated,
    Row,
    ToolbarSlotProps,
} from '../src/types';

afterEach(cleanup);

/**
 * Two slots derived from ONE census of the flagship's twelve `ListShell`/`EditShell` surfaces.
 *
 * **`createAffordance`** — `Toolbar: () => null` appears verbatim at TEN sites, every one of them
 * saying "frame's New button is not the create affordance here". Five of the ten name a resource
 * whose declaration already answers it (`creatable: false`); the answer simply had no route to a
 * shell, because a shell is handed a `ContextManifest` and never a `ResourceDefinition`. The
 * resolved value now rides the manifest block, exactly as `layout` does.
 *
 * ⚠️ The hazard this file exists to pin: it must NOT be folded into `canCreate`. Two flagship
 * pages supply their OWN Toolbar gated on `canCreate` and render a real create — `tenants`
 * (`readOnly: true`, whose create is a schema surface submitting to the REST provisioning
 * endpoint) and `scaffold-packs`. ANDing the two would have deleted a working button behind a
 * green suite: the same shape as `FrameColumn.cellSource`, where a frame-side default nearly
 * revoked a host declaration by wearing its name.
 *
 * **`container: 'bare'`** — five surfaces wrote the identical
 * `Container: ({ children }) => <>{children}</>` closure, four of them character-for-character,
 * all to undo `DefaultContainer`'s `SidePanel` inside a `<Sheet>` they had already opened.
 */

const ROWS: Row[] = [{ id: '1', name: 'Alpha' }];

const primitives: FramePrimitives = {
    Button: ({ children, ...p }: any) => <button {...p}>{children}</button>,
    Input: (p: any) => <input {...p} />,
    Label: ({ children, ...p }: any) => <label {...p}>{children}</label>,
    Popover: ({ children }: any) => <div>{children}</div>,
    PopoverTrigger: ({ children }: any) => <>{children}</>,
    PopoverContent: ({ children }: any) => <div>{children}</div>,
    SimpleSelect: (p: any) => <select {...p} />,
    Badge: ({ children }: any) => <span>{children}</span>,
    Table: ({ children }: any) => <table>{children}</table>,
    Skeleton: () => <div />,
    SidePanel: ({ children }: any) => <div data-testid="side-panel">{children}</div>,
};

function makeTransport(): FrameTransport {
    return {
        getFilterSchema: vi.fn(async () => ({ properties: {} })),
        getFilterOptions: vi.fn(async () => []),
        getSavedFilters: vi.fn(async () => []),
        saveFilter: vi.fn(async () => ({
            id: '1',
            name: 'v',
            resource: 'concepts',
            query_parameters: {},
            visibility: 'private',
            is_default: false,
        })),
        deleteSavedFilter: vi.fn(async () => undefined),
        list: vi.fn(
            async (): Promise<Paginated<Row>> => ({ data: ROWS, total: 1, page: 1, perPage: 25 }),
        ),
        get: vi.fn(async (_r, id) => ({ id, name: 'Alpha' })),
        getFormSchema: vi.fn(async () => ({
            type: 'object',
            properties: { name: { type: 'string' } },
        })),
        save: vi.fn(async (_r, id, data) => ({ id: id ?? '2', ...(data as Row) })),
        remove: vi.fn(async () => undefined),
    };
}

function Harness({ children, can = () => true }: { children: ReactNode; can?: () => boolean }) {
    const [params, setParams] = useState(new URLSearchParams());
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const injection: FrameInjection = {
        transport: makeTransport(),
        primitives,
        useUrlState: () => [params, (updater) => setParams((prev) => updater(prev))] as const,
        registry: createWidgetRegistry(),
        schemaFetcher: async () => ({ type: 'object', properties: {} }),
        can,
    };

    return (
        <QueryClientProvider client={client}>
            <FrameProvider value={injection}>{children}</FrameProvider>
        </QueryClientProvider>
    );
}

const manifestOf = (createAffordance?: 'frame' | 'host'): ContextManifest => ({
    byNode: { name: { 'list-column': { participates: true, label: 'Name' } } },
    inherits: {},
    known: KNOWN_CONTEXTS,
    ...(createAffordance ? { createAffordance } : {}),
});

const renderList = async (manifest: ContextManifest, slots?: Record<string, unknown>) => {
    render(
        <Harness>
            <ListShell
                resource="concepts"
                columns={[]}
                manifest={manifest}
                onOpen={() => {}}
                slots={slots as never}
            />
        </Harness>,
    );
    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
};

// ─────────────────────────────────────────────────────────────────────────────

describe('createAffordance — who owns the New button', () => {
    it("emits frame's own create button when the manifest says 'frame'", async () => {
        await renderList(manifestOf('frame'));

        expect(document.querySelector('[data-frame-action="new"]')).not.toBeNull();
    });

    it("emits NOTHING when the manifest says 'host' — the ten `Toolbar: () => null` sites, said once", async () => {
        await renderList(manifestOf('host'));

        expect(document.querySelector('[data-frame-action="new"]')).toBeNull();
        expect(document.querySelector('[data-frame-slot="Toolbar"]')).toBeNull();
    });

    it('defaults to frame when the manifest carries no createAffordance — an older server, zero migration', async () => {
        await renderList(manifestOf());

        expect(document.querySelector('[data-frame-action="new"]')).not.toBeNull();
    });

    it('defaults to frame when there is no manifest at all — the pure-passthrough list', async () => {
        render(
            <Harness>
                <ListShell
                    resource="concepts"
                    columns={[{ field: 'name', header: 'Name' }]}
                    onOpen={() => {}}
                />
            </Harness>,
        );
        await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());

        expect(document.querySelector('[data-frame-action="new"]')).not.toBeNull();
    });

    /**
     * ⚠️ THE defect this slot was shaped to avoid. `canCreate` answers "may this actor create" and
     * must keep answering only that: two flagship pages supply their own Toolbar, read `canCreate`
     * alone, and render a create flow frame knows nothing about. Had `createAffordance` been ANDed
     * into `canCreate`, `tenants` — `readOnly: true`, `creatable: false`, and carrying a REAL
     * create through `editData: CreateTenantData` — would have silently lost its "New tenant"
     * button.
     */
    it('does NOT fold the affordance into canCreate — a host Toolbar reading canCreate is untouched', async () => {
        const seen: ToolbarSlotProps[] = [];

        await renderList(manifestOf('host'), {
            Toolbar: (props: ToolbarSlotProps) => {
                seen.push(props);
                return props.canCreate ? <button data-testid="host-new">New tenant</button> : null;
            },
        });

        expect(screen.getByTestId('host-new')).toBeTruthy();
        expect(seen[0].canCreate).toBe(true);
        expect(seen[0].framesCreate).toBe(false);
    });

    it('threads BOTH answers to the Toolbar slot so a host can tell them apart', async () => {
        const seen: ToolbarSlotProps[] = [];

        await renderList(manifestOf('frame'), {
            Toolbar: (props: ToolbarSlotProps) => {
                seen.push(props);
                return null;
            },
        });

        expect(seen[0]).toMatchObject({ resource: 'concepts', canCreate: true, framesCreate: true });
    });

    it("an actor who may not create still gets nothing, even when the affordance is frame's", async () => {
        render(
            <Harness can={() => false}>
                <ListShell
                    resource="concepts"
                    columns={[]}
                    manifest={manifestOf('frame')}
                    onOpen={() => {}}
                />
            </Harness>,
        );
        await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());

        expect(document.querySelector('[data-frame-action="new"]')).toBeNull();
    });

    it('BOTH shipped toolbars honour it — the shadcn preset is the one every flagship surface uses', () => {
        for (const Toolbar of [DefaultToolbar, ShadcnToolbar]) {
            cleanup();
            render(
                <Harness>
                    <Toolbar resource="concepts" canCreate framesCreate={false} onNew={() => {}} />
                </Harness>,
            );
            expect(document.querySelector('[data-frame-action="new"]')).toBeNull();

            cleanup();
            render(
                <Harness>
                    <Toolbar resource="concepts" canCreate framesCreate onNew={() => {}} />
                </Harness>,
            );
            expect(document.querySelector('[data-frame-action="new"]')).not.toBeNull();
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────

const renderEdit = async (props: Record<string, unknown>) => {
    render(
        <Harness>
            <EditShell
                resource="concepts"
                id="1"
                slots={{ FormBody: () => <div data-testid="form-body" /> }}
                {...props}
            />
        </Harness>,
    );
    await waitFor(() => expect(screen.getByTestId('form-body')).toBeTruthy());
};

describe("EditShell container='bare'", () => {
    it("contributes no container at all — the five verbatim passthrough closures, said once", async () => {
        await renderEdit({ container: 'bare' });

        expect(screen.queryByTestId('side-panel')).toBeNull();
        expect(document.querySelector('[data-frame-slot="Container"]')).toBeNull();
        expect(document.querySelector('[data-frame-container]')).toBeNull();
    });

    /**
     * Not a `<div>`. A block box between a host Sheet's padding and the form is a layout change
     * dressed as a no-op — precisely what the five host closures were written to avoid — so the
     * shell's own root must be the FIRST element rendered.
     */
    it('wraps the shell in no ELEMENT, not merely in no styling', async () => {
        const { container } = render(
            <Harness>
                <EditShell
                    resource="concepts"
                    id="1"
                    container="bare"
                    slots={{ FormBody: () => <div data-testid="form-body" /> }}
                />
            </Harness>,
        );
        await waitFor(() => expect(screen.getByTestId('form-body')).toBeTruthy());

        expect(container.firstElementChild?.getAttribute('data-frame-shell')).toBe('edit');
    });

    it("leaves 'panel' — the default — rendering the SidePanel it always did", async () => {
        await renderEdit({});

        expect(screen.getByTestId('side-panel')).toBeTruthy();
    });

    it("leaves 'page' rendering the full-surface region, not a drawer", async () => {
        await renderEdit({ container: 'page' });

        expect(document.querySelector('[data-frame-container="page"]')).not.toBeNull();
        expect(screen.queryByTestId('side-panel')).toBeNull();
    });

    /**
     * The caller still outranks the prop. `slots.Container` is the page speaking, not a default,
     * and the precedence `EditShell` documents must survive a third value being added below it.
     */
    it("a page's own slots.Container still wins over container='bare'", async () => {
        await renderEdit({
            container: 'bare',
            slots: {
                FormBody: () => <div data-testid="form-body" />,
                Container: ({ children }: { children: ReactNode }) => (
                    <div data-testid="page-container">{children}</div>
                ),
            },
        });

        expect(screen.getByTestId('page-container')).toBeTruthy();
    });

    /**
     * ⚠️ And the app-wide `editSlots.Container` must NOT. It sits below the prop by the same rule
     * that keeps `container: 'page'` from being turned back into a drawer by an injection default;
     * `'bare'` is the same kind of explicit per-render statement.
     */
    it("an app-wide editSlots.Container does NOT override container='bare'", async () => {
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const injection = {
            transport: makeTransport(),
            primitives,
            registry: createWidgetRegistry(),
            schemaFetcher: async () => ({ type: 'object', properties: {} }),
            can: () => true,
            editSlots: {
                Container: ({ children }: { children: ReactNode }) => (
                    <div data-testid="app-wide-container">{children}</div>
                ),
            },
        } as unknown as FrameInjection;

        render(
            <QueryClientProvider client={client}>
                <FrameProvider value={injection}>
                    <EditShell
                        resource="concepts"
                        id="1"
                        container="bare"
                        slots={{ FormBody: () => <div data-testid="form-body" /> }}
                    />
                </FrameProvider>
            </QueryClientProvider>,
        );
        await waitFor(() => expect(screen.getByTestId('form-body')).toBeTruthy());

        expect(screen.queryByTestId('app-wide-container')).toBeNull();
    });
});
