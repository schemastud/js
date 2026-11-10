import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWidgetRegistry } from '@schemastud/seam';
import { getDefaultRegistry } from '@rjsf/core';
import type { WidgetProps } from '@rjsf/utils';
import { FrameProvider, registerFrameWidgets } from '../src/context';
import { ListShell } from '../src/ListShell';
import { resolveColumns } from '../src/resolveColumns';
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
 * Declared column KINDS — how a cell renders, said once on the server.
 *
 * The column SET has been declaration-driven since `resolveColumns` learned to read
 * `list-column` participation. How a cell RENDERS was not, and a census of the nine frame
 * lists at the flagship found 51 hand-written `cell` closures collapsing into five shapes
 * repeated verbatim. `list-column` participation has always carried a `widget` name and
 * nothing on the client read it — so `#[Column('badge')]` was a comment.
 *
 * The three properties asserted hardest are the ones that make this safe to turn on under a
 * live host: a host closure STILL wins by field, an unknown kind is inert rather than fatal,
 * and a declared cell does not quietly revoke `row-cell` inline editing.
 */

const ROWS: Row[] = [
    {
        id: '1',
        conceptId: 'CPT-1',
        kind: 'substance',
        count: 0,
        declaredAt: '2026-08-27T12:00:00Z',
        tier: 3,
        tags: [{ name: 'alpha' }, { name: 'beta' }, { name: 'gamma' }, { name: 'delta' }],
        statuses: ['awaiting_approval'],
        name: null,
    },
];

const primitives: FramePrimitives = {
    Button: ({ children, ...p }: any) => <button {...p}>{children}</button>,
    Input: (p: any) => <input {...p} />,
    Label: ({ children, ...p }: any) => <label {...p}>{children}</label>,
    Popover: ({ children }: any) => <div>{children}</div>,
    PopoverTrigger: ({ children }: any) => <>{children}</>,
    PopoverContent: ({ children }: any) => <div>{children}</div>,
    SimpleSelect: (p: any) => <select {...p} />,
    // The variant is echoed into an attribute so a test can assert WHICH badge was asked
    // for — a badge that renders with the wrong variant is exactly the class of defect a
    // "did it render a badge" assertion cannot see.
    Badge: ({ children, variant }: any) => <span data-variant={variant}>{children}</span>,
    Table: ({ children }: any) => <table>{children}</table>,
    Skeleton: () => <div />,
    SidePanel: ({ children }: any) => <div>{children}</div>,
};

function makeTransport(): FrameTransport {
    return {
        getFilterSchema: vi.fn(async () => ({ properties: {} })),
        getFilterVariants: vi.fn(async (resource) => ({ resource, variants: [] })),
        getFilterOptions: vi.fn(async () => []),
        getSavedFilters: vi.fn(async () => []),
        saveFilter: vi.fn(async () => ({
            id: '1',
            name: 'v',
            resource: 'concepts',
            queryParameters: {},
            visibility: 'private',
            isDefault: false,
        })),
        deleteSavedFilter: vi.fn(async () => undefined),
        list: vi.fn(
            async (): Promise<Paginated<Row>> => ({ data: ROWS, total: 1, page: 1, perPage: 25 }),
        ),
        get: vi.fn(async (_r, id) => ({ id })),
        getFormSchema: vi.fn(async () => ({ type: 'object', properties: {} })),
        create: vi.fn(async (_resource: string, data: unknown) => Response.json({ id: '2', ...(data as object) }).json()),
        save: vi.fn(async (_r, id, data) => ({ id, ...(data as Row) })),
        remove: vi.fn(async () => undefined),
    };
}

function Harness({ children }: { children: ReactNode }) {
    const [params, setParams] = useState(new URLSearchParams());
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const injection: FrameInjection = {
        transport: makeTransport(),
        primitives,
        useUrlState: () => [params, (updater) => setParams((prev) => updater(prev))] as const,
        registry: createWidgetRegistry(),
        schemaFetcher: async () => ({ type: 'object', properties: {} }),
        can: () => true,
    };

    return (
        <QueryClientProvider client={client}>
            <FrameProvider value={injection}>{children}</FrameProvider>
        </QueryClientProvider>
    );
}

/** A registry with frame's built-ins installed, as a kit's or a FrameProvider's is. */
const REGISTRY = createWidgetRegistry();
registerFrameWidgets(REGISTRY);

const manifestOf = (
    byNode: ContextManifest['byNode'],
): ContextManifest => ({ byNode, inherits: {}, known: KNOWN_CONTEXTS });

// ─────────────────────────────────────────────────────────────────────────────

describe('resolveColumns — the declared kind becomes the cell', () => {
    it('synthesizes a cell from the declared widget name, and tags where it came from', () => {
        const manifest = manifestOf({
            kind: { 'list-column': { participates: true, widget: 'badge' } },
        });

        const [column] = resolveColumns('concepts', undefined, [], manifest, REGISTRY);

        expect(column.cell).toBeTypeOf('function');
        expect(column.cellSource).toBe('declared');
    });

    it('leaves a column with NO declared kind exactly as it was — no cell at all', () => {
        const manifest = manifestOf({ kind: { 'list-column': { participates: true } } });

        const [column] = resolveColumns('concepts', undefined, [], manifest, REGISTRY);

        expect(column.cell).toBeUndefined();
        expect(column.cellSource).toBeUndefined();
    });

    it('a HOST closure still wins by field — the declaration is a default, not a replacement', () => {
        const manifest = manifestOf({
            kind: { 'list-column': { participates: true, widget: 'badge' } },
        });
        const hostCell = () => 'HOST';

        const [column] = resolveColumns('concepts', undefined, [{ field: 'kind', cell: hostCell }], manifest, REGISTRY);

        expect(column.cell).toBe(hostCell);
        expect(column.cellSource).toBe('host');
    });

    it('an UNKNOWN kind is not fatal: it is unbound, and the cell draws the unbound marker (ruling 01 §4)', () => {
        const manifest = manifestOf({
            kind: { 'list-column': { participates: true, widget: 'sparkline-from-the-future' } },
        });

        expect(() => resolveColumns('concepts', undefined, [], manifest, REGISTRY)).not.toThrow();
        const [column] = resolveColumns('concepts', undefined, [], manifest, REGISTRY);
        render(<>{column.cell?.(ROWS[0])}</>);
        expect(document.querySelector('[data-frame-view="unbound-column"]')).not.toBeNull();
    });

    it('resolves a DOTTED pointer through the same path resolution the default cell uses', () => {
        const manifest = manifestOf({
            'commerce.plan': { 'list-column': { participates: true, widget: 'text' } },
        });

        const [column] = resolveColumns('tenants', undefined, [], manifest, REGISTRY);

        expect(column.cell).toBeTypeOf('function');
        expect(column.field).toBe('commerce.plan');
    });

    it('a list column takes the widget contract: a stock RJSF widget gets id, registry and readonly, and badges gets the array (29)', () => {
        // RJSF core's own TextWidget, registered for `list-column` under a name; the wrapper only records what reached it.
        const { TextWidget } = getDefaultRegistry().widgets;
        const seen: WidgetProps[] = [];
        const Recorded = (props: WidgetProps) => {
            seen.push(props);
            return <TextWidget {...props} />;
        };
        const registry = createWidgetRegistry();
        registerFrameWidgets(registry);
        registry.registerWidget('plain', Recorded as never, undefined, { contexts: ['list-column'] });
        const manifest = manifestOf({
            conceptId: { 'list-column': { participates: true, sort: 1, widget: 'plain' } },
            statuses: { 'list-column': { participates: true, sort: 2, widget: 'badges' } },
        });

        const [plain, badges] = resolveColumns('concepts', undefined, [], manifest, registry);
        render(
            <Harness>
                <div data-cell="plain">{plain.cell?.(ROWS[0])}</div>
                <div data-cell="badges">{badges.cell?.({ ...ROWS[0], statuses: ['awaiting_approval', 'approved'] })}</div>
            </Harness>,
        );

        const props = seen.at(-1)!;
        expect(typeof props.id).toBe('string');
        expect(props.id.length).toBeGreaterThan(0);
        expect(typeof props.registry.schemaUtils.retrieveSchema).toBe('function');
        expect(props.readonly).toBe(true);
        expect((document.querySelector('[data-cell="plain"] input') as HTMLInputElement).value).toBe('CPT-1');

        const drawn = document.querySelectorAll('[data-cell="badges"] [data-variant]');
        expect(drawn).toHaveLength(2);
        expect([...drawn].map((b) => b.textContent)).toEqual(['Awaiting approval', 'Approved']);
    });

    it('frame registers exactly the five derived kinds for list-column — a sixth is a decision, not a typo', () => {
        const listColumn = REGISTRY.names()
            .filter(({ registrations }) => registrations.some((r) => r.contexts?.includes('list-column')))
            .map(({ name }) => name);
        expect(listColumn).toEqual(['badge', 'badges', 'date', 'number', 'text']);
    });
});

describe('the kinds render what the 51 closures rendered', () => {
    const renderList = async (byNode: ContextManifest['byNode']) => {
        render(
            <Harness>
                <ListShell resource="concepts" columns={[]} manifest={manifestOf(byNode)} />
            </Harness>,
        );
        await waitFor(() => expect(screen.queryByText('CPT-1')).not.toBeNull(), { timeout: 3000 });
    };

    it('badge: the value in the primitive Badge, at the declared variant', async () => {
        await renderList({
            conceptId: { 'list-column': { participates: true, widget: 'text' } },
            kind: {
                'list-column': {
                    participates: true,
                    widget: 'badge',
                    options: { variant: 'secondary' },
                },
            },
        });

        // app-walkthrough APP-09: with no declared label the value is humanized, never shown as its raw backing value.
        const badge = screen.getByText('Substance');
        expect(badge.getAttribute('data-variant')).toBe('secondary');
    });

    it('badge: a per-VALUE label map, which is how a numeric tier reads as a word', async () => {
        await renderList({
            conceptId: { 'list-column': { participates: true, widget: 'text' } },
            tier: {
                'list-column': {
                    participates: true,
                    widget: 'badge',
                    options: { labels: { '3': 'Verified' }, variant: 'secondary' },
                },
            },
        });

        expect(screen.queryByText('Verified')).not.toBeNull();
        expect(screen.queryByText('3')).toBeNull();
    });

    it('badges: a SCALAR array value humanizes exactly like the single badge (C02)', async () => {
        await renderList({
            conceptId: { 'list-column': { participates: true, widget: 'text' } },
            statuses: { 'list-column': { participates: true, widget: 'badges' } },
        });

        // Parity with the single `badge` (APP-09): the raw enum value is humanized, never shown raw.
        expect(screen.queryByText('Awaiting approval')).not.toBeNull();
        expect(screen.queryByText('awaiting_approval')).toBeNull();
    });

    it('badges: an explicit per-value label still wins over humanization (C02)', async () => {
        await renderList({
            conceptId: { 'list-column': { participates: true, widget: 'text' } },
            statuses: {
                'list-column': {
                    participates: true,
                    widget: 'badges',
                    options: { labels: { awaiting_approval: 'Pending review' } },
                },
            },
        });

        expect(screen.queryByText('Pending review')).not.toBeNull();
        expect(screen.queryByText('Awaiting approval')).toBeNull();
    });

    it('badges: user-authored object names are preserved, never humanized (C02)', async () => {
        await renderList({
            conceptId: { 'list-column': { participates: true, widget: 'text' } },
            tags: {
                'list-column': {
                    participates: true,
                    widget: 'badges',
                    options: { labelKey: 'name' },
                },
            },
        });

        // An authored name is carried verbatim — not run through key humanization.
        expect(screen.queryByText('alpha')).not.toBeNull();
        expect(screen.queryByText('Alpha')).toBeNull();
    });

    it('date: an ISO string through toLocaleDateString, the census’s most verbatim repeat', async () => {
        await renderList({
            conceptId: { 'list-column': { participates: true, widget: 'text' } },
            declaredAt: { 'list-column': { participates: true, widget: 'date' } },
        });

        const expected = new Date('2026-08-27T12:00:00Z').toLocaleDateString();
        expect(screen.queryByText(expected)).not.toBeNull();
    });

    it('number: zero reads as a calm dash when the declaration asks for it, and as 0 when it does not', async () => {
        await renderList({
            conceptId: { 'list-column': { participates: true, widget: 'text' } },
            count: {
                'list-column': {
                    participates: true,
                    widget: 'number',
                    options: { zeroAsDash: true, tone: 'muted' },
                },
            },
        });

        expect(screen.queryByText('—')).not.toBeNull();
        expect(screen.queryByText('0')).toBeNull();

        cleanup();

        await renderList({
            conceptId: { 'list-column': { participates: true, widget: 'text' } },
            count: { 'list-column': { participates: true, widget: 'number' } },
        });

        expect(screen.queryByText('0')).not.toBeNull();
    });

    it('text: an absent value takes the declared placeholder rather than an empty cell', async () => {
        await renderList({
            conceptId: { 'list-column': { participates: true, widget: 'text' } },
            name: {
                'list-column': {
                    participates: true,
                    widget: 'text',
                    options: { placeholder: 'ad-hoc', placeholderStyle: 'italic' },
                },
            },
        });

        expect(screen.queryByText('ad-hoc')).not.toBeNull();
    });

    it('badges: an array capped at the limit, with the remainder summarised', async () => {
        await renderList({
            conceptId: { 'list-column': { participates: true, widget: 'text' } },
            tags: {
                'list-column': {
                    participates: true,
                    widget: 'badges',
                    options: { labelKey: 'name', limit: 3 },
                },
            },
        });

        expect(screen.queryByText('alpha')).not.toBeNull();
        expect(screen.queryByText('gamma')).not.toBeNull();
        expect(screen.queryByText('delta')).toBeNull();
        expect(screen.queryByText('+1 more')).not.toBeNull();
    });
});

describe('a declared kind does not revoke a different declaration', () => {
    /**
     * `ListShell` skips the `row-cell` editable-in-place wiring for any column that already
     * has a `cell`, on the reading "the host said how this renders". A cell synthesized from
     * the presentation kind is NOT that statement, and treating it as one would mean adding
     * `#[Column('badge')]` to a field silently turned it read-only — a declaration revoking a
     * declaration, invisibly, behind a green suite.
     */
    it('a row-cell field keeps its inline editor even when it also declares a presentation kind', async () => {
        render(
            <Harness>
                <ListShell
                    resource="concepts"
                    columns={[]}
                    manifest={manifestOf({
                        conceptId: {
                            'list-column': { participates: true, widget: 'text' },
                            'row-cell': { participates: true },
                        },
                    })}
                    onCellCommit={() => {}}
                />
            </Harness>,
        );

        // EditableCell marks its cell `editable`/`readonly`/`editing`; the plain declared
        // text cell marks it `text`. If the declared cell had won, only `text` would exist.
        await waitFor(
            () =>
                expect(
                    document.querySelector(
                        '[data-frame-cell="editable"],[data-frame-cell="readonly"],[data-frame-cell="editing"]',
                    ),
                ).not.toBeNull(),
            { timeout: 3000 },
        );
        expect(document.querySelector('[data-frame-cell="text"]')).toBeNull();
    });
});
