import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWidgetRegistry, type SchemaNode } from '@schemastud/seam';
import { FrameProvider, registerFrameWidgets } from '../src/context';
import { ListShell } from '../src/ListShell';
import { resolveColumns } from '../src/resolveColumns';
import { DefaultCell } from '../src/slots/defaults';
import { ShadcnCell } from '../src/shadcn/list-slots';
import { KNOWN_CONTEXTS, type ContextManifest } from '../src/contexts';
import type { FrameInjection, FramePrimitives, FrameTransport, Paginated, Row } from '../src/types';

afterEach(cleanup);

/**
 * frame-foundation 76: the default list cell shows an enum value by its label.
 *
 * The form already shows an enum by its `enumNames` label (ticket 44 lifts it into `ui:enumNames`); the list showed
 * the raw backing value. `resolveColumns` has the list schema, so a resolved column over a scalar enum node carries
 * the node's value-to-label map, under ticket 44's own rule, and the default cell renders it.
 */

const SCHEMA: SchemaNode = {
    type: 'object',
    properties: {
        conceptId: { type: 'string' },
        status: {
            type: 'string',
            enum: ['draft', 'awaiting_approval', 'approved'],
            enumNames: ['Draft', 'Awaiting approval', 'Approved'],
        },
    },
};

const ROWS: Row[] = [
    { id: '1', conceptId: 'CPT-1', status: 'awaiting_approval' },
    // A value the enum does not name (a legacy row): it shows raw, as before.
    { id: '2', conceptId: 'CPT-2', status: 'retired_legacy' },
];

const manifestOf = (byNode: ContextManifest['byNode']): ContextManifest => ({ byNode, inherits: {}, known: KNOWN_CONTEXTS });

const MANIFEST = manifestOf({
    conceptId: { 'list-column': { participates: true, sort: 1 } },
    status: { 'list-column': { participates: true, sort: 2 } },
});

const REGISTRY = createWidgetRegistry();
registerFrameWidgets(REGISTRY);

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

function makeTransport(): FrameTransport {
    return {
        getFilterSchema: vi.fn(async () => SCHEMA),
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
        list: vi.fn(async (): Promise<Paginated<Row>> => ({ data: ROWS, total: 2, page: 1, perPage: 25 })),
        get: vi.fn(async (_r, id) => ({ id })),
        getFormSchema: vi.fn(async () => ({ type: 'object', properties: {} })),
        create: vi.fn(async (_resource: string, data: unknown) => ({ id: '3', ...(data as object) })),
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

describe('the default list cell shows an enum value by its label', () => {
    it('a list over an enum with enumNames shows the label, and a value outside the enum shows raw', async () => {
        render(
            <Harness>
                <ListShell resource="concepts" columns={[]} manifest={MANIFEST} />
            </Harness>,
        );

        await waitFor(() => expect(screen.queryByText('Awaiting approval')).not.toBeNull(), { timeout: 3000 });
        expect(screen.queryByText('awaiting_approval')).toBeNull();
        expect(screen.queryByText('retired_legacy')).not.toBeNull();
    });

    it('resolveColumns carries the value-to-label map on a column with no cell', () => {
        const [, status] = resolveColumns('concepts', SCHEMA, [], MANIFEST, REGISTRY);

        expect(status.cell).toBeUndefined();
        expect(status.enumLabels).toEqual({ draft: 'Draft', awaiting_approval: 'Awaiting approval', approved: 'Approved' });
    });

    it('the shadcn cell renders the label too, and keeps its empty-value dash', () => {
        const [, status] = resolveColumns('concepts', SCHEMA, [], MANIFEST, REGISTRY);

        render(<ShadcnCell column={status} record={{ status: 'approved' }} />);
        expect(screen.queryByText('Approved')).not.toBeNull();
        cleanup();

        render(<ShadcnCell column={status} record={{ status: null }} />);
        expect(screen.queryByText('—')).not.toBeNull();
        cleanup();

        render(<ShadcnCell column={status} record={{ status: 'retired_legacy' }} />);
        expect(screen.queryByText('retired_legacy')).not.toBeNull();
    });

    it('a column with its own cell is untouched: the host closure renders, and no map is set', () => {
        const hostCell = (record: Row) => `HOST:${String(record.status)}`;
        const [, status] = resolveColumns('concepts', SCHEMA, [{ field: 'status', cell: hostCell }], MANIFEST, REGISTRY);

        expect(status.cell).toBe(hostCell);
        expect(status.enumLabels).toBeUndefined();
        render(<DefaultCell column={status} record={{ status: 'approved' }} />);
        expect(screen.queryByText('HOST:approved')).not.toBeNull();
    });

    it('a declared kind keeps its own rendering: no map is set beside a declared cell', () => {
        const manifest = manifestOf({ status: { 'list-column': { participates: true, widget: 'text' } } });
        const [status] = resolveColumns('concepts', SCHEMA, [], manifest, REGISTRY);

        expect(status.cellSource).toBe('declared');
        expect(status.enumLabels).toBeUndefined();
    });

    it("ticket 44's rule: enumNames that is not an array as long as enum carries no map", () => {
        const short: SchemaNode = {
            type: 'object',
            properties: { status: { type: 'string', enum: ['draft', 'approved'], enumNames: ['Draft'] } },
        };
        const [status] = resolveColumns('concepts', short, [], manifestOf({ status: { 'list-column': { participates: true } } }), REGISTRY);

        expect(status.enumLabels).toBeUndefined();
        render(<DefaultCell column={status} record={{ status: 'draft' }} />);
        expect(screen.queryByText('draft')).not.toBeNull();
    });

    it('a list shows the label for the shape the PHP generator emits: a $ref to a $defs enum, nullable as anyOf', async () => {
        const STATUS_DEF = {
            type: 'string',
            enum: ['draft', 'awaiting_approval'],
            enumNames: ['Draft', 'Awaiting approval'],
        };
        const generated: SchemaNode = {
            type: 'object',
            $defs: {
                Status: STATUS_DEF,
                NullableStatus: { anyOf: [{ $ref: '#/$defs/Status' }, { type: 'null' }] },
            },
            properties: {
                byRef: { $ref: '#/$defs/Status' },
                nullable: { anyOf: [{ $ref: '#/$defs/Status' }, { type: 'null' }] },
                refToNullable: { $ref: '#/$defs/NullableStatus' },
            },
        };
        const manifest = manifestOf({
            byRef: { 'list-column': { participates: true, sort: 1 } },
            nullable: { 'list-column': { participates: true, sort: 2 } },
            refToNullable: { 'list-column': { participates: true, sort: 3 } },
        });

        const columns = resolveColumns('concepts', generated, [], manifest, REGISTRY);
        const labels = { draft: 'Draft', awaiting_approval: 'Awaiting approval' };
        expect(columns.map((column) => column.enumLabels)).toEqual([labels, labels, labels]);

        render(<DefaultCell column={columns[1]} record={{ nullable: 'awaiting_approval' }} />);
        expect(screen.queryByText('Awaiting approval')).not.toBeNull();
        cleanup();
        render(<ShadcnCell column={columns[1]} record={{ nullable: null }} />);
        expect(screen.queryByText('—')).not.toBeNull();
    });

    it("a host column's own enumLabels wins over the schema's", () => {
        const [, status] = resolveColumns(
            'concepts',
            SCHEMA,
            [{ field: 'status', enumLabels: { approved: 'Signed off' } }],
            MANIFEST,
            REGISTRY,
        );

        expect(status.enumLabels).toEqual({ approved: 'Signed off' });
        render(<DefaultCell column={status} record={{ status: 'approved' }} />);
        expect(screen.queryByText('Signed off')).not.toBeNull();
    });

    it('the shadcn cell reads the map before its boolean and empty-value handling', () => {
        const flags: SchemaNode = {
            type: 'object',
            properties: {
                live: { type: 'boolean', enum: [true, false], enumNames: ['Active', 'Archived'] },
                tone: { type: 'string', enum: ['', 'loud'], enumNames: ['Default', 'Loud'] },
            },
        };
        const [live, tone] = resolveColumns(
            'concepts',
            flags,
            [],
            manifestOf({ live: { 'list-column': { participates: true, sort: 1 } }, tone: { 'list-column': { participates: true, sort: 2 } } }),
            REGISTRY,
        );

        render(<ShadcnCell column={live} record={{ live: true }} />);
        expect(screen.queryByText('Active')).not.toBeNull();
        cleanup();
        render(<ShadcnCell column={tone} record={{ tone: '' }} />);
        expect(screen.queryByText('Default')).not.toBeNull();
    });

    it('a numeric enum is keyed by its string form', () => {
        const tiers: SchemaNode = {
            type: 'object',
            properties: { tier: { type: 'integer', enum: [1, 2], enumNames: ['Bronze', 'Silver'] } },
        };
        const [tier] = resolveColumns('concepts', tiers, [], manifestOf({ tier: { 'list-column': { participates: true } } }), REGISTRY);

        render(<DefaultCell column={tier} record={{ tier: 2 }} />);
        expect(screen.queryByText('Silver')).not.toBeNull();
    });
});
