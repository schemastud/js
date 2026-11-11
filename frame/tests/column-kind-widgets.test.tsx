import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { WidgetProps } from '@rjsf/utils';
import { afterEach, describe, expect, it } from 'vitest';
import type { WidgetRegistry } from '@schemastud/seam';
import { KNOWN_CONTEXTS, type ContextManifest } from '../src/contexts';
import { createFrameKit } from '../src/kit';
import { ListShell } from '../src/ListShell';
import { createMemoryTransport } from '../src/testing';

afterEach(cleanup);

// Radix measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
} as unknown as typeof ResizeObserver;

const ROW = { id: '1', name: 'Ada Lovelace', kind: 'substance', declaredAt: '2026-08-27T12:00:00Z', mood: 'calm' };

const manifestOf = (byNode: ContextManifest['byNode']) => ({
    resources: [],
    contexts: { concepts: { byNode, inherits: {}, known: KNOWN_CONTEXTS } as ContextManifest },
});

/** A kit's list over one row, with the columns its manifest declares. */
async function list(
    byNode: ContextManifest['byNode'],
    widgets?: (registry: WidgetRegistry) => void,
    properties?: Record<string, unknown>,
) {
    const frame = createFrameKit({
        transport: createMemoryTransport(
            { rows: { concepts: [ROW] }, manifest: manifestOf(byNode) },
            // The list's schema, whose properties a column's node is read from.
            properties ? { getFilterSchema: async () => ({ type: 'object', properties }) as never } : {},
        ),
        urlState: 'memory',
        widgets,
    });
    render(
        <frame.Provider>
            <ListShell resource="concepts" />
        </frame.Provider>,
    );
    await waitFor(() => expect(document.querySelector('tbody tr')).not.toBeNull());
}

const cell = (kind: string) => document.querySelector(`[data-frame-cell="${kind}"]`);

/**
 * frame-foundation 27 (ruling 01 §4, slice 5): a column kind is a widget registered for `list-column`, resolved
 * through the registry and mounted through `widgetProps`. A fresh seam registry registers RJSF's `text` and `date`
 * unscoped (ticket 20); frame's scoped kinds win the column.
 */
describe('a column kind is a widget', () => {
    it("on a fresh kit, #[Column('badge')], date and text resolve to frame's list-column kinds, not RJSF's stock widgets", async () => {
        await list({
            name: { 'list-column': { participates: true, sort: 1, widget: 'text' } },
            kind: { 'list-column': { participates: true, sort: 2, widget: 'badge' } },
            declaredAt: { 'list-column': { participates: true, sort: 3, widget: 'date' } },
        });

        expect(cell('text')?.textContent).toBe('Ada Lovelace');
        expect(screen.getByText('Substance')).toBeTruthy();
        expect(cell('date')?.textContent).toBe(new Date('2026-08-27T12:00:00Z').toLocaleDateString());
        // RJSF's stock text and date widgets draw inputs; a column cell draws none.
        expect(document.querySelector('tbody input')).toBeNull();
    });

    it("a host's unscoped `date` does not take a `date` column; a host's list-column `badge` does", async () => {
        const HostDate = () => <span data-host="date">host date</span>;
        const HostBadge = ({ value }: WidgetProps) => <span data-host="badge">{`host ${String(value)}`}</span>;
        await list(
            {
                kind: { 'list-column': { participates: true, sort: 1, widget: 'badge' } },
                declaredAt: { 'list-column': { participates: true, sort: 2, widget: 'date' } },
            },
            (registry) => {
                registry.registerWidget('date', HostDate as never);
                registry.registerWidget('badge', HostBadge as never, undefined, { contexts: ['list-column'] });
            },
        );

        expect(document.querySelector('[data-host="date"]')).toBeNull();
        expect(cell('date')).not.toBeNull();
        expect(document.querySelector('[data-host="badge"]')?.textContent).toBe('host substance');
    });

    it('a kind nothing binds is unbound and draws the marker in its cell', async () => {
        await list({
            name: { 'list-column': { participates: true, sort: 1, widget: 'text' } },
            mood: { 'list-column': { participates: true, sort: 2, widget: 'sparkline-from-the-future' } },
        });

        expect(document.querySelector('[data-frame-unbound="list-column"][data-frame-unbound-widget="sparkline-from-the-future"]')).not.toBeNull();
    });

    it("the column entry's options win a key both set; the node's own x-widget-options stay beneath (edit B)", async () => {
        await list(
            { declaredAt: { 'list-column': { participates: true, sort: 1, widget: 'date', options: { time: false } } } },
            undefined,
            {
                declaredAt: {
                    type: 'string',
                    format: 'date-time',
                    'x-widget': 'date',
                    'x-widget-options': { time: true, tone: 'muted' },
                },
            },
        );

        // Frame's list-column `date` with { time: false, tone: 'muted' }: the date alone, in the muted tone.
        await waitFor(() => expect(cell('date')?.getAttribute('style') ?? '').toContain('muted-foreground'));
        expect(cell('date')?.textContent).toBe(new Date('2026-08-27T12:00:00Z').toLocaleDateString());
    });
});
