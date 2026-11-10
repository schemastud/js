import { useState, useSyncExternalStore } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { EditShell, createFrameKit, type ContextManifest, type Row, type SchemaPurpose } from '@schemastud/frame';
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

/** What the producer declares for `requests`: create but not update, and one confirm-only record action. */
const requests: ContextManifest = {
    byNode: {},
    inherits: {},
    known: [],
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
        list: async () => ({ data: [row], total: 1, page: 1, perPage: 25 }) as never,
        get: async () => ({ ...row }),
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
    const [view, setView] = useState<'create' | 'detail' | 'legacy'>('create');
    const schemaCalls = useCalls();

    return (
        <frame.Provider>
            <main className="schema-purpose-example">
                <h1>Separate write and read schemas</h1>
                <nav aria-label="Fixture views">
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
                <EditShell
                    key={view}
                    resource="requests"
                    id={view === 'create' ? null : String(row.id)}
                    readOnly={view === 'detail'}
                    schemaPurpose={view === 'detail' ? 'read' : 'write'}
                    container="bare"
                    onSaved={() => setView('detail')}
                />
                <output aria-label="Schema requests">{schemaCalls.join(', ')}</output>
            </main>
        </frame.Provider>
    );
}
