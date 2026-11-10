import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createWidgetRegistry } from '@schemastud/seam';
import { WidgetSurface } from '../src/WidgetShell';
import { resolveWidgetFor } from '../src/resolveWidgetFor';
import { EditShell } from '../src/EditShell';
import { createFrameKit } from '../src/kit';
import { createMemoryTransport } from '../src/testing';

// Radix measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
} as unknown as typeof ResizeObserver;

// A stand-in heavyweight editor: a component (not a bare RJSF name).
function HeavyEditor({ formData }: { formData?: Record<string, unknown> }) {
    return <div data-testid="heavy">heavy:{JSON.stringify(formData)}</div>;
}

function makeRegistry() {
    const r = createWidgetRegistry();
    r.registerWidget('circuit-graph', HeavyEditor);
    return r;
}

describe('WidgetSurface — mounts:"widget" materialization (ED-04)', () => {
    it('mounts one heavyweight widget full-surface, not a field form', () => {
        const { container, getByTestId } = render(
            <WidgetSurface
                schema={{ type: 'object' }}
                record={{ a: 1 }}
                widget="circuit-graph"
                registry={makeRegistry()}
            />,
        );

        expect(container.querySelector('[data-frame-shell="widget"]')).not.toBeNull();
        expect(getByTestId('heavy').textContent).toContain('heavy:{"a":1}');
        // Full-surface widget, not a field form.
        expect(container.querySelector('form')).toBeNull();
    });

    it('surfaces an unbound notice when the widget name has no registry match', () => {
        const { container } = render(
            <WidgetSurface schema={{ type: 'object' }} widget="not-registered" registry={makeRegistry()} />,
        );

        expect(container.querySelector('[data-frame-shell="widget-unbound"]')).not.toBeNull();
        expect(container.querySelector('[data-frame-shell="widget"]')).toBeNull();
    });

    it('resolves the heavyweight widget in edit but still suppresses it inside a row-cell (unchanged)', () => {
        const registry = makeRegistry();
        const parent = { participates: true, widget: 'circuit-graph', heavyweight: true };

        // edit → full mount (what WidgetSurface uses)
        const edit = resolveWidgetFor({ type: 'object' }, 'edit', parent, undefined, registry);
        expect(typeof edit.widget).toBe('function');

        // row-cell → suppressed (never inlines a heavyweight editor into a cell)
        const cell = resolveWidgetFor(
            { type: 'object' },
            'row-cell',
            { participates: true, inheritsBinding: true },
            parent,
            registry,
        );
        expect(cell.widget).toBeUndefined();
    });
});

/** frame-foundation 14 (ruling 04 slice 4): one read-only spelling, `readonly`, reaches every widget. */
describe('one read-only spelling', () => {
    it('a full-surface editor receives readonly: true and no readOnly key', () => {
        const seen: Record<string, unknown>[] = [];
        const Recorded = (props: Record<string, unknown>) => {
            seen.push(props);
            return <div data-testid="heavy" />;
        };
        const registry = createWidgetRegistry();
        registry.registerWidget('circuit-graph', Recorded as never);

        render(<WidgetSurface schema={{ type: 'object' }} record={{ a: 1 }} widget="circuit-graph" registry={registry} readOnly />);

        const props = seen.at(-1)!;
        expect(props.readonly).toBe(true);
        expect('readOnly' in props).toBe(false);
    });

    it('a widget inside <EditShell readOnly> receives readonly: true', async () => {
        const seen: Record<string, unknown>[] = [];
        const Probe = (props: Record<string, unknown>) => {
            seen.push(props);
            return <span data-probe>{String(props.value ?? '')}</span>;
        };
        const frame = createFrameKit({
            transport: createMemoryTransport({
                rows: { members: [{ id: '1', name: 'Ada Lovelace' }] },
                formSchema: { members: { type: 'object', properties: { name: { type: 'string', 'x-widget': 'probe' } } } },
            }),
            urlState: 'memory',
            can: () => true,
            widgets: (r) => r.registerWidget('probe', Probe as never),
        });

        render(
            <frame.Provider>
                <EditShell resource="members" id="1" readOnly />
            </frame.Provider>,
        );

        await waitFor(() => expect(document.querySelector('[data-probe]')?.textContent).toBe('Ada Lovelace'));
        expect(seen.at(-1)!.readonly).toBe(true);
    });
});
