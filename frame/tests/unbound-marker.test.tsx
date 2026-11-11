import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, waitFor, type RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWidgetRegistry, type SchemaNode } from '@schemastud/seam';
import { FrameProvider } from '../src/context';
import { KNOWN_CONTEXTS, type ContextManifest, type NodeParticipation } from '../src/contexts';
import { EditShell } from '../src/EditShell';
import { EditableCell } from '../src/EditableCell';
import { resolveColumns } from '../src/resolveColumns';
import { SchemaView } from '../src/SchemaView';
import { WidgetSurface } from '../src/WidgetShell';
import { DashboardCard } from '../src/cards/DashboardCard';
import { mockPrimitives } from '../src/story-harness';
import { createMemoryTransport } from '../src/testing';
import type { FrameInjection, Row } from '../src/types';
import type { DashboardRow } from '../src/cards/types';

/**
 * Ticket 42 (ruling 01 §3): a misspelled widget name draws the same marker in every context, in development and in
 * production. The root carries `data-frame-unbound="<context>"` and `data-frame-unbound-widget="<name>"`, the copy is
 * "Unable to display this field" and never the name, nothing throws, and development alone adds one `console.error`.
 * The name sits on a four-value enum, where inference would draw `radio` if it ran for an unbound name.
 */
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

const FLAVOUR: SchemaNode = { type: 'string', title: 'Flavour', enum: ['a', 'b', 'c', 'd'] };
const SCHEMA: SchemaNode = { type: 'object', properties: { title: { type: 'string', title: 'Title' }, flavour: FLAVOUR } };
const RECORD: Row = { id: '1', title: 'One', flavour: 'b' };
const on = (widget: string): NodeParticipation => ({ participates: true, widget });

const manifestOf = (byNode: ContextManifest['byNode']): ContextManifest => ({
    byNode,
    inherits: { overview: ['summary'], 'row-cell': ['edit'] },
    known: KNOWN_CONTEXTS,
});

function injection(manifests: Record<string, ContextManifest> = {}, formSchema: SchemaNode = SCHEMA) {
    const transport = createMemoryTransport({ formSchema: { things: formSchema } });
    const create = vi.fn(async (_resource: string, data: unknown) => ({ id: 'new', ...(data as object) }));
    const value: FrameInjection = {
        transport: { ...transport, create },
        primitives: mockPrimitives,
        registry: createWidgetRegistry(),
        schemaFetcher: async () => formSchema,
        can: () => true,
        useUrlState: () => [new URLSearchParams(), () => {}] as const,
        manifestFor: (resource) => manifests[resource],
    };
    return { value, create };
}

function wrap(value: FrameInjection) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>
            <FrameProvider value={value}>{children}</FrameProvider>
        </QueryClientProvider>
    );
}

const row = (context: 'summary' | 'overview'): DashboardRow => ({
    resource: 'things',
    context,
    navOrder: 0,
    label: 'Things',
    icon: 'box',
    href: '/things',
    summary: { key: 'things', label: 'Things', figures: [] },
});

/** One row per context: how it is drawn, and the name it declares there. */
const CONTEXTS: ReadonlyArray<readonly [context: string, name: string, draw: () => RenderResult]> = [
    [
        'edit',
        'flavr-picker',
        () => {
            const { value } = injection({}, { ...SCHEMA, properties: { ...SCHEMA.properties, flavour: { ...FLAVOUR, 'x-widget': 'flavr-picker' } } });
            return render(<EditShell resource="things" id={null} container="page" />, { wrapper: wrap(value) });
        },
    ],
    [
        'detail',
        'flavr-detail',
        () =>
            render(
                <SchemaView schema={SCHEMA} record={RECORD} manifest={manifestOf({ flavour: { detail: on('flavr-detail') } })} context="detail" registry={createWidgetRegistry()} />,
            ),
    ],
    [
        'list-item',
        'flavr-card',
        () =>
            render(
                <SchemaView schema={SCHEMA} record={RECORD} manifest={manifestOf({ '': { 'list-item': on('flavr-card') } })} context="list-item" registry={createWidgetRegistry()} />,
            ),
    ],
    [
        'row-cell',
        'flavr-cell',
        () =>
            render(
                <EditableCell node={FLAVOUR} rootSchema={SCHEMA} rowCell={on('flavr-cell')} edit={undefined} value="b" onCommit={() => {}} registry={createWidgetRegistry()} />,
            ),
    ],
    [
        'list-column',
        'flavr-column',
        () => {
            const columns = resolveColumns('things', SCHEMA, [], manifestOf({ flavour: { 'list-column': on('flavr-column') } }), createWidgetRegistry());
            const column = columns.find((c) => c.field === 'flavour');
            return render(<>{column?.cell?.(RECORD)}</>);
        },
    ],
    [
        'summary',
        'flavr-summary',
        () => {
            const { value } = injection({ things: manifestOf({ '': { summary: on('flavr-summary') } }) });
            return render(<DashboardCard value={row('summary')} />, { wrapper: wrap(value) });
        },
    ],
    [
        'overview',
        'flavr-overview',
        () => {
            const { value } = injection({ things: manifestOf({ '': { overview: on('flavr-overview') } }) });
            return render(<DashboardCard value={row('overview')} />, { wrapper: wrap(value) });
        },
    ],
    [
        'widget-route',
        'flavr-route',
        () => render(<WidgetSurface schema={SCHEMA} widget="flavr-route" registry={createWidgetRegistry()} />),
    ],
];

const ENVS = ['development', 'production'] as const;
const unboundErrors = (spy: ReturnType<typeof vi.spyOn>) =>
    spy.mock.calls.filter((call: unknown[]) => String(call[0]).startsWith('[schemastud] unbound widget'));

describe('an unbound widget name is one visible state', () => {
    it.each(ENVS.flatMap((env) => CONTEXTS.map(([context, name, draw]) => [context, env, name, draw] as const)))(
        '%s, NODE_ENV=%s: the marker, never the name, never a throw',
        async (context, env, name, draw) => {
            vi.stubEnv('NODE_ENV', env);
            const error = vi.spyOn(console, 'error').mockImplementation(() => {});

            const { container } = draw();

            const marker = await waitFor(() => {
                const found = container.querySelector<HTMLElement>(`[data-frame-unbound="${context}"]`);
                expect(found).not.toBeNull();
                return found!;
            });
            expect(marker.getAttribute('data-frame-unbound-widget')).toBe(name);
            expect(marker.textContent).toContain('Unable to display this field');
            expect(container.textContent).not.toContain(name);
            // Inference did not run for the misspelled name: no radio group stood in for it.
            expect(container.querySelector('input[type="radio"]')).toBeNull();

            const reported = unboundErrors(error);
            if (env === 'development') {
                expect(reported.length).toBeGreaterThanOrEqual(1);
                expect(String(reported[0][0])).toContain(`"${name}"`);
                expect(String(reported[0][0])).toContain(`"${context}"`);
            } else {
                expect(reported).toHaveLength(0);
            }
            vi.unstubAllEnvs();
        },
    );

    it.each(ENVS)('edit, NODE_ENV=%s: a required unbound field on create does not save, and says why', async (env) => {
        vi.stubEnv('NODE_ENV', env);
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const required: SchemaNode = {
            ...SCHEMA,
            required: ['title', 'flavour'],
            properties: { ...SCHEMA.properties, flavour: { ...FLAVOUR, 'x-widget': 'flavr-picker' } },
        };
        const { value, create } = injection({}, required);
        const { container, findByLabelText, getByRole } = render(<EditShell resource="things" id={null} container="page" />, {
            wrapper: wrap(value),
        });

        fireEvent.change(await findByLabelText(/Title/), { target: { value: 'One' } });
        expect(container.querySelector('[data-frame-unbound="edit"]')).not.toBeNull();
        fireEvent.click(getByRole('button', { name: 'Save' }));

        await waitFor(() => expect(container.textContent).toMatch(/required/i));
        expect(container.querySelector('[data-frame-unbound="edit"]')).not.toBeNull();
        expect(create).not.toHaveBeenCalled();
        vi.unstubAllEnvs();
    });
});
