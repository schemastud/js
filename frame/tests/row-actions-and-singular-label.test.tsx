import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWidgetRegistry } from '@schemastud/seam';
import { FrameProvider } from '../src/context';
import { DefaultRowActions } from '../src/slots/defaults';
import { ListShell } from '../src/ListShell';
import { resolveRowActions } from '../src/rowActions';
import { KNOWN_CONTEXTS, type ContextManifest } from '../src/contexts';
import type {
    FrameInjection,
    FramePrimitives,
    FrameTransport,
    Paginated,
    Row,
} from '../src/types';

afterEach(cleanup);

/**
 * Two gaps on one surface, both of the same shape as `createAffordance`: the DECLARATION
 * already carried the answer and nothing on the client read it.
 *
 * **Row actions.** `#[RowActions(['delete'])]` has existed in `laravel-frame` since it was
 * written and had exactly ONE declaration site estate-wide, because no client consumed it.
 * Meanwhile three flagship surfaces copy-pasted the same delete control — `useRemoveResource`,
 * `window.confirm`, trash icon — differing only in the noun.
 *
 * **The singular label.** `ParticleResource::$singularLabel` reached only the docs generator,
 * so frame's own toolbar offered "New scaffold-packs" — the raw key — where a page hand-rolled
 * a whole Toolbar slot to say "New pack".
 *
 * ⚠️ The hazard both share, and the reason half these cases assert a NEGATIVE: a frame-side
 * default must not appear where nobody asked for it. A row-actions column gated on the mere
 * presence of a component would have grown a delete button on every list at the flagship,
 * because `shadcnListSlots` is named once at the provider and reaches all of them.
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
    SidePanel: ({ children }: any) => <div>{children}</div>,
};

let remove: ReturnType<typeof vi.fn>;

function makeTransport(): FrameTransport {
    return {
        getFilterSchema: vi.fn(async () => ({ properties: {} })),
        getFilterOptions: vi.fn(async () => []),
        getSavedFilters: vi.fn(async () => []),
        saveFilter: vi.fn(async () => ({
            id: '1',
            name: 'v',
            resource: 'scaffold-packs',
            query_parameters: {},
            visibility: 'private',
            is_default: false,
        })),
        deleteSavedFilter: vi.fn(async () => undefined),
        list: vi.fn(
            async (): Promise<Paginated<Row>> => ({ data: ROWS, total: 1, page: 1, perPage: 25 }),
        ),
        get: vi.fn(async (_r, id) => ({ id, name: 'Alpha' })),
        getFormSchema: vi.fn(async () => ({ type: 'object', properties: {} })),
        save: vi.fn(async (_r, id, data) => ({ id: id ?? '2', ...(data as Row) })),
        remove,
    };
}

function Harness({
    children,
    can = () => true,
    listSlots,
}: {
    children: ReactNode;
    can?: (action: string, resource: string) => boolean;
    listSlots?: Record<string, unknown>;
}) {
    const [params, setParams] = useState(new URLSearchParams());
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const injection: FrameInjection = {
        transport: makeTransport(),
        primitives,
        useUrlState: () => [params, (updater) => setParams((prev) => updater(prev))] as const,
        registry: createWidgetRegistry(),
        schemaFetcher: async () => ({ type: 'object', properties: {} }),
        can: can as FrameInjection['can'],
        ...(listSlots ? { listSlots: listSlots as never } : {}),
    };

    return (
        <QueryClientProvider client={client}>
            <FrameProvider value={injection}>{children}</FrameProvider>
        </QueryClientProvider>
    );
}

/** A manifest with one real column, plus whatever root/label the case is about. */
const manifestOf = (extra: Partial<ContextManifest> = {}): ContextManifest => ({
    byNode: { name: { 'list-column': { participates: true, label: 'Name' } } },
    inherits: {},
    known: KNOWN_CONTEXTS,
    ...extra,
});

/** The wire shape `#[RowActions([...])]` projects to: root pointer, `list-column`, `row-actions`. */
const withRowActions = (actions: unknown, extra: Partial<ContextManifest> = {}): ContextManifest =>
    manifestOf({
        ...extra,
        byNode: {
            '': { 'list-column': { participates: true, widget: 'row-actions', options: { actions } } },
            name: { 'list-column': { participates: true, label: 'Name' } },
        },
    });

const renderList = async (
    manifest: ContextManifest | undefined,
    harness: Omit<Parameters<typeof Harness>[0], 'children'> = {},
    slots?: Record<string, unknown>,
) => {
    render(
        <Harness {...harness}>
            <ListShell
                resource="scaffold-packs"
                // With a manifest this is an override MAP (the manifest is the column set); with
                // none it IS the set — the pure-passthrough path, which is one of the cases here.
                columns={manifest ? [] : [{ field: 'name', header: 'Name' }]}
                manifest={manifest}
                onOpen={() => {}}
                slots={slots as never}
            />
        </Harness>,
    );
    await waitFor(() => expect(screen.getByText('Alpha')).toBeTruthy());
};

const deleteButtons = () => document.querySelectorAll('[data-frame-action="delete"]');

beforeEach(() => {
    remove = vi.fn(async () => undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
});

// ─────────────────────────────────────────────────────────────────────────────

describe('resolveRowActions — reading the declaration off the wire', () => {
    it('returns the declared verbs frame can render', () => {
        expect(resolveRowActions(withRowActions(['delete']))).toEqual(['delete']);
    });

    it('drops verbs frame cannot render, so beam-ux\'s four-verb declaration yields one', () => {
        expect(
            resolveRowActions(withRowActions(['edit', 'duplicate', 'delete', 'promote-to-central'])),
        ).toEqual(['delete']);
    });

    it('returns nothing for a resource that declared nothing — the estate-wide default', () => {
        expect(resolveRowActions(manifestOf())).toEqual([]);
        expect(resolveRowActions(undefined)).toEqual([]);
    });

    it('ignores a root list-column bound to some OTHER widget, options and all', () => {
        expect(
            resolveRowActions(
                manifestOf({
                    byNode: {
                        '': {
                            'list-column': {
                                participates: true,
                                widget: 'summary-card',
                                options: { actions: ['delete'] },
                            },
                        },
                    },
                }),
            ),
        ).toEqual([]);
    });
});

describe('the declared row-actions column', () => {
    it('renders ONE delete control per row when the resource declared it', async () => {
        await renderList(withRowActions(['delete']));

        expect(deleteButtons().length).toBe(1);
    });

    /**
     * ⚠️ Counting delete BUTTONS is not enough here and the mutation proved it: the component
     * self-gates on `actions`, so ungating the shell still renders nothing visible — and quietly
     * adds an empty action COLUMN to every table in the estate. The header cell is the witness.
     */
    it('renders no action column at all when the resource declared no row actions', async () => {
        await renderList(manifestOf());

        expect(deleteButtons().length).toBe(0);
        expect(document.querySelectorAll('thead th').length).toBe(1);
    });

    it('adds exactly one action column when the resource DID declare one', async () => {
        await renderList(withRowActions(['delete']));

        expect(document.querySelectorAll('thead th').length).toBe(2);
    });

    it('renders NOTHING with no manifest at all — the pure-passthrough path', async () => {
        await renderList(undefined);

        expect(deleteButtons().length).toBe(0);
    });

    it('confirms with the resolved SINGULAR, not the resource key', async () => {
        await renderList(withRowActions(['delete'], { singularLabel: 'Scaffold pack' }));

        fireEvent.click(deleteButtons()[0]!);

        expect(window.confirm).toHaveBeenCalledWith('Delete scaffold pack "Alpha"?');
        await waitFor(() => expect(remove).toHaveBeenCalledWith('scaffold-packs', '1'));
    });

    /**
     * Used OUTSIDE a table — the flagship's agents surface is a card grid, so the RowActions slot
     * never reaches it and the component is mounted directly next to the card's own open handler.
     * Frame's two Table slots stop propagation at the cell, so a test through them cannot see this;
     * mutation-checked, and removing `stopPropagation` survives the table path entirely.
     */
    it('does not trigger a surrounding open handler that does not stop propagation itself', async () => {
        const onOpen = vi.fn();
        render(
            <Harness>
                <div onClick={onOpen}>
                    <DefaultRowActions
                        record={ROWS[0]!}
                        resource="scaffold-packs"
                        actions={['delete']}
                        singularLabel="Scaffold pack"
                    />
                </div>
            </Harness>,
        );

        fireEvent.click(deleteButtons()[0]!);

        await waitFor(() => expect(remove).toHaveBeenCalled());
        expect(onOpen).not.toHaveBeenCalled();
    });

    it('is suppressed for an actor who may not delete — the declaration is not the authorization', async () => {
        await renderList(withRowActions(['delete']), { can: (action) => action !== 'delete' });

        expect(deleteButtons().length).toBe(0);
    });

    it('leaves an app-wide RowActions slot UNCONDITIONAL — a host statement frame must not gate', async () => {
        await renderList(manifestOf(), {
            listSlots: { RowActions: () => <button data-testid="host-row-action" /> },
        });

        expect(screen.getAllByTestId('host-row-action').length).toBe(1);
        expect(deleteButtons().length).toBe(0);
    });

    it('lets a page slot win over the declared default, without doubling it', async () => {
        await renderList(withRowActions(['delete']), {}, {
            RowActions: () => <button data-testid="page-row-action" />,
        });

        expect(screen.getAllByTestId('page-row-action').length).toBe(1);
        expect(deleteButtons().length).toBe(0);
    });
});

describe('the singular label on the create affordance', () => {
    it('says the resolved singular rather than the pluralised key', async () => {
        await renderList(manifestOf({ singularLabel: 'Scaffold pack' }));

        expect(document.querySelector('[data-frame-action="new"]')?.textContent).toBe(
            'New scaffold pack',
        );
    });

    it('falls back to the resource key when the manifest carries none — the old behaviour, kept', async () => {
        await renderList(manifestOf());

        expect(document.querySelector('[data-frame-action="new"]')?.textContent).toBe(
            'New scaffold-packs',
        );
    });

    it('is a WORD and not a gate — it cannot resurrect a create the resource closed', async () => {
        await renderList(
            manifestOf({ singularLabel: 'Scaffold pack', createAffordance: 'host' }),
        );

        expect(document.querySelector('[data-frame-action="new"]')).toBeNull();
    });
});
