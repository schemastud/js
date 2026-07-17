import { cleanup, fireEvent, render } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWidgetRegistry, StarRatingWidget } from '@schemastud/seam';
import { FiveRegionEditShell } from '../src/FiveRegionEditShell';
import { useEditShellMount } from '../src/EditShellMount';

// The node the mock editor exposes through the node-attrs channel.
const CALLOUT = {
    type: 'callout',
    attrsSchema: {
        type: 'object',
        properties: {
            rating: { type: 'integer', maximum: 5, 'x-widget': 'star-rating' },
            title: { type: 'string' },
        },
    },
    attrs: { rating: 3, title: 'Hi' },
};

const setNodeAttrsSpy = vi.fn();

afterEach(() => {
    cleanup();
    setNodeAttrsSpy.mockClear();
});

// A stand-in for the blockdoc heavyweight editor: it plugs its node-attrs channel
// into the shared mount and lets us select a block.
function MockEditorWidget() {
    const mount = useEditShellMount();

    useEffect(() => {
        return mount.registerNodeAccess({
            getNode: (id) => (id === 'block-1' ? CALLOUT : null),
            setNodeAttrs: (id, attrs) => setNodeAttrsSpy(id, attrs),
        });
    }, [mount]);

    return (
        <div data-testid="canvas-editor">
            <button type="button" onClick={() => mount.selectNode('block-1')}>
                select block-1
            </button>
        </div>
    );
}

function makeRegistry() {
    const r = createWidgetRegistry();
    r.registerWidget('editor', MockEditorWidget);
    r.registerWidget((s) => s['x-widget'] === 'star-rating', StarRatingWidget);
    return r;
}

function renderShell() {
    return render(
        <FiveRegionEditShell schema={{ type: 'object' }} widget="editor" registry={makeRegistry()} />,
    );
}

describe('FiveRegionEditShell + always-mounted inspector (ED-08)', () => {
    it('renders all five regions with the editor mounted full-surface in the canvas', () => {
        const { container, getByTestId } = renderShell();

        for (const region of ['top-bar', 'palette', 'canvas', 'inspector-region', 'status']) {
            expect(container.querySelector(`[data-frame-region="${region}"]`)).not.toBeNull();
        }
        // The heavyweight widget mounts in the canvas.
        expect(getByTestId('canvas-editor')).toBeTruthy();
    });

    it('rests empty until a block is selected, then shows the node inspector', () => {
        const { container, getByText } = renderShell();

        // Empty selection → placeholder, no auto-select of root.
        expect(container.querySelector('[data-frame-inspector-empty]')).not.toBeNull();
        expect(getByText('Select a block to edit')).toBeTruthy();

        fireEvent.click(getByText('select block-1'));

        expect(container.querySelector('[data-frame-inspector-empty]')).toBeNull();
        expect(container.querySelector('[data-frame-region="inspector"][data-node-type="callout"]')).not.toBeNull();
    });

    it('renders the attrs through their x-widget widgets (star-rating) in the inspector', () => {
        const { container, getByText } = renderShell();
        fireEvent.click(getByText('select block-1'));

        // The rating attr resolves the star-rating widget inside the inspector's form.
        const inspector = container.querySelector('[data-frame-region="inspector"]')!;
        expect(inspector.querySelector('[data-widget="star-rating"]')).not.toBeNull();
    });

    it('routes an inspector edit through setNodeAttrs (the one write-back pipe)', () => {
        const { container, getByText } = renderShell();
        fireEvent.click(getByText('select block-1'));

        const inspector = container.querySelector('[data-frame-region="inspector"]')!;
        // Click the 5th star → the widget fires onChange(5) → SchemaForm onChange →
        // mount.setNodeAttrs → the editor's registered writer.
        fireEvent.click(inspector.querySelector('[data-star="5"]')!);

        expect(setNodeAttrsSpy).toHaveBeenCalled();
        expect(setNodeAttrsSpy.mock.calls.at(-1)?.[0]).toBe('block-1');
    });
});
