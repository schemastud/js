import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createWidgetRegistry } from '@schemastud/seam';
import { FrameProvider } from '../src/context';
import { EditShell } from '../src/EditShell';
import { mockPrimitives, createMockTransport } from '../src/story-harness';
import type { FrameInjection } from '../src/types';
import schema from './fixtures/beam-ux-entry-edit-schema.json';

// Captured 2026-09-24 from the booted laravel-beam-starter: the configured generator's output for
// BeamUxEntryInputData, the `editData:` of splicewire/laravel-beam-ux's `beam-ux-entry` resource.
// The ux-demo screenshot review of 2026-09-24 (G3-BEAM-FRAME-CONSOLE) found the edit form showing
// no Type radio selected for a record whose `type` is "page".
afterEach(cleanup);

// Radix's RadioGroup measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
} as unknown as typeof ResizeObserver;

const record = {
    id: 'entry-1',
    type: 'page',
    title: 'Probe page',
    slug: 'probe-page',
    realm: 'site',
    parent_id: null,
    segment: null,
    nav_order: null,
};

function mountEdit(form: 'bare' | 'enriched') {
    const transport = createMockTransport({
        formSchema: { 'beam-ux-entry': schema },
        rows: { 'beam-ux-entry': [record] },
    });
    const injection: FrameInjection = {
        transport,
        primitives: mockPrimitives,
        registry: createWidgetRegistry(),
        schemaFetcher: async () => schema,
        can: () => true,
        useUrlState: () => [new URLSearchParams(), () => {}] as const,
    };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
        <QueryClientProvider client={client}>
            <FrameProvider value={injection}>
                <EditShell resource="beam-ux-entry" id="entry-1" container="page" form={form} />
            </FrameProvider>
        </QueryClientProvider>,
    );
}

describe.each(['bare', 'enriched'] as const)('editing a beam-ux-entry (%s form)', (form) => {
    it('selects the record’s Type radio', async () => {
        mountEdit(form);
        await waitFor(() => expect(screen.getByDisplayValue('Probe page')).toBeTruthy());
        const page = screen.getByRole('radio', { name: 'page' });
        expect(page.getAttribute('aria-checked')).toBe('true');
    });
});
