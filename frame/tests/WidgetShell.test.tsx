import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createWidgetRegistry } from '@schemastud/seam';
import { WidgetSurface } from '../src/WidgetShell';
import { resolveWidgetFor } from '../src/resolveWidgetFor';

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
