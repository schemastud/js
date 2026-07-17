import { cleanup, fireEvent, render } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWidgetRegistry } from '@schemastud/seam';
import { FiveRegionEditShell } from '../src/FiveRegionEditShell';
import { useEditShellMount, type Conformance } from '../src/EditShellMount';

afterEach(cleanup);

const revealSpy = vi.fn();

// A mock editor that publishes conformance and records reveal calls (reveal
// fires alongside selectNode when the incomplete segment cycles).
function makeEditor(conformance: Conformance) {
    return function MockEditorWidget() {
        const mount = useEditShellMount();
        useEffect(() => {
            mount.publishConformance(conformance);
            return mount.registerRevealHandler((id) => revealSpy(id));
        }, [mount]);
        return <div data-testid="canvas-editor" />;
    };
}

function renderShell(conformance: Conformance) {
    revealSpy.mockClear();
    const registry = createWidgetRegistry();
    registry.registerWidget('editor', makeEditor(conformance));
    return render(<FiveRegionEditShell schema={{ type: 'object' }} widget="editor" registry={registry} />);
}

describe('StatusBar — conformance readout (ED-14)', () => {
    it('renders N nodes · R required (F of R) · complete · grammar ✓ from published data', () => {
        const { container } = renderShell({
            nodes: 5,
            requiredTotal: 2,
            requiredFilled: 2,
            grammarValid: true,
            incompleteNodeIds: [],
        });
        const bar = container.querySelector('[data-frame-status-bar]')!;

        expect(bar.querySelector('[data-status-seg="nodes"]')!.textContent).toBe('5 nodes');
        expect(bar.querySelector('[data-status-seg="required"]')!.textContent).toBe('2 required (2 of 2)');
        expect(bar.querySelector('[data-status-seg="complete"]')).not.toBeNull();
        expect(bar.querySelector('[data-status-seg="grammar"]')!.getAttribute('data-grammar')).toBe('valid');
    });

    it('shows grammar ✗ only for a doc that violates the schema', () => {
        const { container } = renderShell({
            nodes: 3,
            requiredTotal: 1,
            requiredFilled: 0,
            grammarValid: false,
            incompleteNodeIds: ['a'],
        });
        expect(
            container.querySelector('[data-status-seg="grammar"]')!.getAttribute('data-grammar'),
        ).toBe('invalid');
    });

    it('clicking `incomplete` cycles through incompleteNodeIds via the selection + reveal channel', () => {
        const { container } = renderShell({
            nodes: 4,
            requiredTotal: 2,
            requiredFilled: 0,
            grammarValid: true,
            // absent-category on the parent id + present-but-empty on the child id
            incompleteNodeIds: ['parent-1', 'child-2'],
        });

        const incomplete = container.querySelector('[data-status-seg="incomplete"]')!;

        fireEvent.click(incomplete);
        expect(revealSpy).toHaveBeenLastCalledWith('parent-1');

        fireEvent.click(incomplete);
        expect(revealSpy).toHaveBeenLastCalledWith('child-2');

        // cycles on repeat
        fireEvent.click(incomplete);
        expect(revealSpy).toHaveBeenLastCalledWith('parent-1');
    });
});
