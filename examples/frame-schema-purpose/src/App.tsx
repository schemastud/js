import { useMemo, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    FrameProvider,
    EditShell,
    createResourceTransport,
    type FrameInjection,
    type SchemaPurpose,
    type Row,
} from '@schemastud/frame';
import { createWidgetRegistry, type SchemaNode } from '@schemastud/seam';
import type { UseUrlState } from '@schemastud/facets';

const writeSchema: SchemaNode = {
    type: 'object',
    title: 'Request',
    required: ['title'],
    properties: {
        title: { type: 'string', title: 'Title', minLength: 1 },
        status: {
            type: 'string',
            title: 'Status',
            enum: ['open', 'closed'],
            default: 'open',
        },
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
const Button = (p: ComponentProps<'button'>) => <button {...p} />;
const Input = (p: ComponentProps<'input'>) => <input {...p} />;
const Label = (p: ComponentProps<'label'>) => <label {...p} />;
const Box = ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
);
const Dialog = ({
    children,
    title,
    open,
}: {
    children?: React.ReactNode;
    title?: string;
    open?: boolean;
}) =>
    open === false ? null : (
        <section role="dialog" aria-label={title}>
            {title ? <h2>{title}</h2> : null}
            {children}
        </section>
    );
const primitives: FrameInjection['primitives'] = {
    Button,
    Input,
    Label,
    Badge: Box,
    Table: Box,
    Skeleton: () => <span>Loading</span>,
    Popover: Box,
    PopoverTrigger: Box,
    PopoverContent: Box,
    SimpleSelect: (p) => (
        <select
            value={p.value}
            onChange={(e) => p.onValueChange(e.target.value)}
            aria-label={p.placeholder}
        >
            {p.options.map((o: { value: string; label: string }) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    ),
    SidePanel: Box,
    Dialog,
};
const manifest = {
    byNode: {},
    inherits: {},
    known: [],
    singularLabel: 'request',
    can: {
        create: true,
        update: false,
        delete: false,
        actions: { approve: true },
    },
    actions: [
        {
            key: 'approve',
            label: 'Approve fixture',
            scope: 'record' as const,
            method: 'POST',
            url: '/fixture/{id}/approve',
            input: null,
            result: 'toast' as const,
            destructive: false,
        },
    ],
};

/** A standalone in-memory producer; no Beam, router, PHP backend or authentication is implied. */
export function SchemaPurposeDemo() {
    const [client] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: { retry: false, staleTime: Infinity },
                },
            }),
    );
    const [view, setView] = useState<'create' | 'detail' | 'legacy'>('create');
    const [calls, setCalls] = useState<string[]>([]);
    const row = useRef<Row>({
        id: '1',
        title: 'Replace monitor',
        status: 'closed',
        approvalState: 'pending',
    });
    const failRead = useRef(false);
    const useUrlState: UseUrlState = () => [new URLSearchParams(), () => {}];
    const transport = useMemo(
        () =>
            createResourceTransport(
                {
                    list: async () =>
                        Response.json({
                            data: [row.current],
                            total: 1,
                            page: 1,
                            perPage: 25,
                        }).json(),
                    get: async () => ({ ...row.current }),
                    async getFormSchema(
                        _resource,
                        form,
                        purpose: SchemaPurpose = 'write',
                    ) {
                        await Promise.resolve();
                        setCalls((before) => [...before, `${form}:${purpose}`]);
                        if (purpose === 'read' && failRead.current) {
                            failRead.current = false;
                            throw Error('Controlled read schema failure');
                        }
                        return purpose === 'read' ? readSchema : writeSchema;
                    },
                    async create<Result>(
                        _resource: string,
                        data: unknown,
                    ): Promise<Result> {
                        const input = data as {
                            title: string;
                            status?: string;
                        };
                        row.current = {
                            id: '2',
                            title: input.title,
                            status: input.status ?? 'open',
                            approvalState: 'pending',
                        };
                        return { ...row.current } as Result;
                    },
                    save: async () => {
                        throw Error('This fixture has no record editing');
                    },
                    remove: async () => {
                        throw Error('This fixture has no delete');
                    },
                },
                {
                    resourceUrl: (resource) => '/fixture/' + resource,
                    read: async () => {
                        throw Error('No filters in this fixture');
                    },
                    async write<T>() {
                        row.current = {
                            ...row.current,
                            approvalState: 'approved',
                        };
                        return {
                            message: 'Approved in this fixture.',
                            data: { ...row.current },
                        } as T;
                    },
                },
            ),
        [],
    );
    const value: FrameInjection = {
        transport,
        primitives,
        useUrlState,
        registry: createWidgetRegistry(),
        schemaFetcher: async () => ({}),
        can: (action) => action === 'create',
        manifestFor: () => manifest,
    };
    return (
        <QueryClientProvider client={client}>
            <FrameProvider value={value}>
                <main className="schema-purpose-example">
                    <h1>Separate write and read schemas</h1>
                    <nav aria-label="Fixture views">
                        <button onClick={() => setView('create')}>
                            Create
                        </button>
                        <button onClick={() => setView('detail')}>
                            Read detail
                        </button>
                        <button onClick={() => setView('legacy')}>
                            Legacy disabled edit
                        </button>
                        <button
                            onClick={() => {
                                failRead.current = true;
                                setView('detail');
                                void client.resetQueries({
                                    queryKey: [
                                        'frame',
                                        'requests',
                                        'form-schema',
                                        'bare',
                                        'read',
                                    ],
                                });
                            }}
                        >
                            Fail read schema
                        </button>
                    </nav>
                    <EditShell
                        key={view}
                        resource="requests"
                        id={view === 'create' ? null : String(row.current.id)}
                        readOnly={view === 'detail'}
                        schemaPurpose={view === 'detail' ? 'read' : 'write'}
                        container="bare"
                        manifest={manifest}
                        onSaved={() => setView('detail')}
                    />
                    <output aria-label="Schema requests">
                        {calls.join(', ')}
                    </output>
                </main>
            </FrameProvider>
        </QueryClientProvider>
    );
}
