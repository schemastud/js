import { cleanup, fireEvent, render } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWidgetRegistry } from '@schemastud/seam';
import { FiveRegionEditShell } from '../src/FiveRegionEditShell';
import { useEditShellMount } from '../src/EditShellMount';

const insertSpy = vi.fn();

afterEach(() => {
    cleanup();
    insertSpy.mockClear();
});

// Candidates as blockdoc's insertableCandidatesAt (ED-03) would publish them.
const CANDIDATES = [
    { nodeType: 'para', category: 'prose', label: 'prose', arity: { min: 1, max: null }, edgeTarget: null },
    { nodeType: 'head', category: 'heading', label: 'heading', arity: { min: 0, max: 1 }, edgeTarget: null },
    {
        nodeType: 'collection',
        category: 'gallery',
        label: 'gallery',
        arity: { min: 0, max: null },
        edgeTarget: { attr: 'items', target: 'catalog', pickMany: true },
    },
];

// A mock editor that publishes candidates + registers the insert handler.
function MockEditorWidget() {
    const mount = useEditShellMount();
    useEffect(() => {
        mount.publishCandidates(CANDIDATES);
        return mount.registerInsertHandler((candidate) => insertSpy(candidate));
    }, [mount]);
    return <div data-testid="canvas-editor" />;
}

function renderShell() {
    const registry = createWidgetRegistry();
    registry.registerWidget('editor', MockEditorWidget);
    return render(<FiveRegionEditShell schema={{ type: 'object' }} widget="editor" registry={registry} />);
}

describe('PalettePane — hoisted palette (ED-09)', () => {
    it('renders the published candidates browsably in the left shell pane', () => {
        const { container } = renderShell();

        const palette = container.querySelector('[data-frame-region="palette"]')!;
        const items = palette.querySelectorAll('[data-frame-palette] button');

        expect(items).toHaveLength(3);
        expect([...items].map((b) => b.getAttribute('data-node-type'))).toEqual(['para', 'head', 'collection']);
    });

    it('derives affordance labels from the candidate fields (max 1, pick-many → catalog)', () => {
        const { container } = renderShell();
        const palette = container.querySelector('[data-frame-region="palette"]')!;

        const head = palette.querySelector('[data-node-type="head"]')!;
        expect(head.textContent).toContain('max 1');

        const collection = palette.querySelector('[data-node-type="collection"]')!;
        expect(collection.textContent).toContain('pick-many → catalog');
    });

    it('issues "insert X" back through the palette channel on click', () => {
        const { container } = renderShell();
        const palette = container.querySelector('[data-frame-region="palette"]')!;

        fireEvent.click(palette.querySelector('[data-node-type="para"]')!);

        expect(insertSpy).toHaveBeenCalledTimes(1);
        expect(insertSpy.mock.calls[0][0].nodeType).toBe('para');
    });

    it('shows an empty state when nothing is insertable', () => {
        const registry = createWidgetRegistry();
        registry.registerWidget('editor', () => <div />); // publishes no candidates
        const { container } = render(
            <FiveRegionEditShell schema={{ type: 'object' }} widget="editor" registry={registry} />,
        );

        const palette = container.querySelector('[data-frame-region="palette"]')!;
        expect(palette.querySelector('[data-frame-palette]')).toBeNull();
        expect(palette.textContent).toContain('Nothing insertable here');
    });
});
