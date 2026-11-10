import { useState, useSyncExternalStore } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { EditShell, ListShell, createFrameKit, type ContextManifest, type Row, type SchemaPurpose } from '@schemastud/frame';
import { createMemoryTransport } from '@schemastud/frame/testing';
import type { SchemaNode } from '@schemastud/seam';

const writeSchema: SchemaNode = {
    type: 'object',
    title: 'Request',
    required: ['title'],
    properties: {
        title: { type: 'string', title: 'Title', minLength: 1 },
        status: { type: 'string', title: 'Status', enum: ['open', 'closed'], default: 'open' },
    },
};
const readSchema: SchemaNode = {
    type: 'object',
    title: 'Request',
    required: ['id', 'title', 'status', 'approvalState'],
    properties: {
        id: { type: 'string', title: 'ID' },
        title: { type: 'string', title: 'Title' },
        status: { type: 'string', title: 'Status' },
        approvalState: { type: 'string', title: 'Approval' },
    },
};

/**
 * What the producer declares for `requests`: Title and Status as list columns (Status as a badge), create but not
 * update, and one confirm-only record action.
 */
const requests: ContextManifest = {
    byNode: {
        title: { 'list-column': { participates: true, sort: 0, label: 'Title' } },
        status: { 'list-column': { participates: true, sort: 1, label: 'Status', widget: 'badge' } },
    },
    inherits: {},
    known: ['list-column'],
    singularLabel: 'request',
    can: { create: true, update: false, delete: false, actions: { approve: true } },
    actions: [
        {
            key: 'approve',
            label: 'Approve fixture',
            scope: 'record',
            method: 'POST',
            url: '/fixture/{id}/approve',
            input: null,
            result: 'toast',
            destructive: false,
        },
    ],
};

// ---------------------------------------------------------------------------------------------------------------
// The in-memory producer: one record, a write and a read schema, and a switch that fails the next read schema.
// No Beam, router, PHP backend or authentication is implied, and nothing is durable.
// ---------------------------------------------------------------------------------------------------------------
let row: Row = { id: '1', title: 'Replace monitor', status: 'closed', approvalState: 'pending' };
/** The rest of the queue the list pages through; only `row` is created, read and approved in this fixture. */
const QUEUE: Row[] = ['Order desk chair', 'Renew VPN licence', 'Fix badge reader', 'Move printer', 'Restock toner']
    .flatMap((title, i) => [0, 1, 2, 3, 4].map((n) => ({ id: String(100 + i * 5 + n), title: n ? `${title} (${n + 1})` : title, status: (i + n) % 3 ? 'open' : 'closed', approvalState: 'pending' })));
const PER_PAGE = 25;

/** The filter vocabulary the list's facets bar draws: a search on Title and a select on Status. */
const filterSchema = {
    properties: {
        title: { title: 'Title', 'x-filter': { name: 'title', operator: 'partial', control: 'search' as const }, 'x-sort': { name: 'title' } },
        status: {
            title: 'Status',
            'x-filter': {
                name: 'status',
                operator: 'exact',
                control: 'select' as const,
                options: [
                    { value: 'open', label: 'Open' },
                    { value: 'closed', label: 'Closed' },
                ],
            },
        },
    },
};
let failNextRead = false;

/** The schema requests, shown below the surface. */
let calls: string[] = [];
const listeners = new Set<() => void>();
const record = (call: string) => {
    calls = [...calls, call];
    listeners.forEach((listener) => listener());
};
const useCalls = () =>
    useSyncExternalStore(
        (listener) => (listeners.add(listener), () => listeners.delete(listener)),
        () => calls,
    );

/**
 * Frame's own memory transport, over the producer above. Only what the producer decides is overridden: which schema
 * a purpose gets, what create stores, and what the approve action does.
 */
const transport = createMemoryTransport(
    { manifest: { resources: [], contexts: { requests } } },
    {
        // Numbered pages over the record and the queue, as a producer's list endpoint would answer them.
        list: async (_resource, params) => {
            // The producer applies its own filters: a title search and a status match.
            const title = (params['filter[title]'] ?? '').toLowerCase();
            const status = params['filter[status]'];
            const all = [row, ...QUEUE].filter(
                (r) => String(r.title).toLowerCase().includes(title) && (!status || r.status === status),
            );
            const page = Math.max(1, Number(params.page ?? 1));
            return { data: all.slice((page - 1) * PER_PAGE, page * PER_PAGE), total: all.length, page, perPage: PER_PAGE } as never;
        },
        get: async () => ({ ...row }),
        getFilterSchema: async () => filterSchema as never,
        async getFormSchema(_resource, form, purpose: SchemaPurpose = 'write') {
            record(`${form}:${purpose}`);
            if (purpose === 'read' && failNextRead) {
                failNextRead = false;
                throw Error('Controlled read schema failure');
            }
            return purpose === 'read' ? readSchema : writeSchema;
        },
        async create<Result>(_resource: string, data: unknown): Promise<Result> {
            const input = data as { title: string; status?: string };
            row = { id: '2', title: input.title, status: input.status ?? 'open', approvalState: 'pending' };
            return { ...row } as Result;
        },
        save: async () => {
            throw Error('This fixture has no record editing');
        },
        async invoke() {
            row = { ...row, approvalState: 'approved' };
            return { message: 'Approved in this fixture.', data: { ...row } };
        },
    },
);

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });

/**
 * One kit, at module scope. Its defaults supply what this file used to hand-write: the provider, the `@schemastud/ui`
 * primitives and slots, a seeded widget registry, and `can` read from the manifest (create yes, update no).
 */
const frame = createFrameKit({ transport, urlState: 'memory', queryClient });

export function SchemaPurposeDemo() {
    const [view, setView] = useState<'list' | 'create' | 'detail' | 'legacy'>('list');
    const schemaCalls = useCalls();

    return (
        <frame.Provider>
            <main className="schema-purpose-example">
                <h1>Separate write and read schemas</h1>
                <nav aria-label="Fixture views">
                    <button onClick={() => setView('list')}>List</button>
                    <button onClick={() => setView('create')}>Create</button>
                    <button onClick={() => setView('detail')}>Read detail</button>
                    <button onClick={() => setView('legacy')}>Legacy disabled edit</button>
                    <button
                        onClick={() => {
                            failNextRead = true;
                            setView('detail');
                            void queryClient.resetQueries({ queryKey: ['frame', 'requests', 'form-schema', 'bare', 'read'] });
                        }}
                    >
                        Fail read schema
                    </button>
                </nav>
                {view === 'list' ? (
                    // The list the declarations describe: Title and Status columns, the filter bar, paging, and New
                    // (the manifest grants create). Opening a row shows its read detail; New opens Create.
                    <ListShell resource="requests" onOpen={(record) => setView(record.id === null ? 'create' : 'detail')} />
                ) : (
                <EditShell
                    key={view}
                    resource="requests"
                    id={view === 'create' ? null : String(row.id)}
                    readOnly={view === 'detail'}
                    schemaPurpose={view === 'detail' ? 'read' : 'write'}
                    container="bare"
                    onSaved={() => setView('detail')}
                />
                )}
                <output aria-label="Schema requests">{schemaCalls.join(', ')}</output>
            </main>
        </frame.Provider>
    );
}
