import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import type { WidgetProps } from '@rjsf/utils';
import { afterEach, describe, expect, it } from 'vitest';
import { createWidgetRegistry, type SchemaNode } from '@schemastud/seam';
import { FrameProvider } from '../src/context';
import { EditShell } from '../src/EditShell';
import { mockPrimitives } from '../src/story-harness';
import { createMemoryTransport, createMemoryUrlState } from '../src/testing';
import type { FormMode, FrameInjection } from '../src/types';

afterEach(cleanup);

function DeclaredWidget(props: WidgetProps) {
    return <output data-testid="declared-widget">{String(props.value ?? '')}</output>;
}

// The declared name arrives only inside a FETCHED reference: the served schema carries a `$ref`, and the
// schema fetcher answers it with a node that names the widget. A strip over the served schema never saw it.
const SERVED: SchemaNode = { type: 'object', properties: { title: { $ref: 'https://schemas.test/title.json' } } };
const FETCHED: SchemaNode = { type: 'string', 'x-widget': 'declared-proof' };

function mount(form: FormMode) {
    const registry = createWidgetRegistry();
    registry.registerWidget('declared-proof', DeclaredWidget);
    const injection: FrameInjection = {
        transport: createMemoryTransport({ rows: { notes: [{ id: '1', title: 'Alpha' }] }, formSchema: { notes: SERVED } }),
        primitives: mockPrimitives,
        registry,
        schemaFetcher: async () => FETCHED,
        can: () => true,
        useUrlState: createMemoryUrlState(),
    };
    return render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <FrameProvider value={injection}>
                <EditShell resource="notes" id="1" container="bare" form={form} />
            </FrameProvider>
        </QueryClientProvider>,
    );
}

/**
 * frame-foundation 24 (ruling 01 slice 4): one widget keyword, and `bare` acts in the form's resolver, after
 * references resolve, so it covers a name a fetched reference carries.
 */
describe('a declared widget that arrives through a fetched reference', () => {
    it('mounts in enriched', async () => {
        mount('enriched');
        expect((await screen.findByTestId('declared-widget')).textContent).toBe('Alpha');
    });

    it('is the inferred control in bare', async () => {
        mount('bare');
        const input = (await screen.findByDisplayValue('Alpha')) as HTMLInputElement;
        expect(input.tagName).toBe('INPUT');
        expect(screen.queryByTestId('declared-widget')).toBeNull();
    });
});
