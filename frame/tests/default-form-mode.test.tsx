import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import type { WidgetProps } from '@rjsf/utils';
import { afterEach, expect, it } from 'vitest';
import { createWidgetRegistry } from '@schemastud/seam';
import { FrameProvider } from '../src/context';
import { EditShell } from '../src/EditShell';
import { mockPrimitives } from '../src/story-harness';
import { createMemoryTransport, createMemoryUrlState } from '../src/testing';
import type { FrameInjection } from '../src/types';

afterEach(cleanup);

function DeclaredWidget(props: WidgetProps) {
    return <output data-testid="declared-widget">{String(props.value ?? '')}</output>;
}

/**
 * frame-foundation 17: `enriched` is the default form mode, so an `EditShell` given no `form` prop
 * draws the widget the schema declares. Under the old `bare` default the declaration was stripped
 * and the inferred text input drew instead. The node declares it with the host keyword
 * (`x-stud-widget`), the spelling `bare` strips until ticket 24 moves `bare` into the resolver.
 */
it('an EditShell with no form prop mounts a declared widget', async () => {
    const registry = createWidgetRegistry();
    registry.registerWidget('declared-proof', DeclaredWidget);
    const injection: FrameInjection = {
        transport: createMemoryTransport({
            rows: { notes: [{ id: '1', title: 'Alpha' }] },
            formSchema: {
                notes: { type: 'object', properties: { title: { type: 'string', 'x-stud-widget': 'declared-proof' } } },
            },
        }),
        primitives: mockPrimitives,
        registry,
        schemaFetcher: async (ref) => ({ $id: ref }),
        can: () => true,
        useUrlState: createMemoryUrlState(),
    };

    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <FrameProvider value={injection}>
                <EditShell resource="notes" id="1" container="bare" />
            </FrameProvider>
        </QueryClientProvider>,
    );

    expect((await screen.findByTestId('declared-widget')).textContent).toBe('Alpha');
});
