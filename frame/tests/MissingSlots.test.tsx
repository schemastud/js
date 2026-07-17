import { cleanup, fireEvent, render } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWidgetRegistry } from '@schemastud/seam';
import { FiveRegionEditShell } from '../src/FiveRegionEditShell';
import { useEditShellMount, type Conformance } from '../src/EditShellMount';

afterEach(cleanup);

const insertSpy = vi.fn();

function makeEditor(conformance: Conformance) {
    return function MockEditorWidget() {
        const mount = useEditShellMount();
        useEffect(() => {
            mount.publishConformance(conformance);
            return mount.registerInsertHandler((candidate) => insertSpy(candidate));
        }, [mount]);
        return <div data-testid="canvas-editor" />;
    };
}

function renderShell(conformance: Conformance) {
    insertSpy.mockClear();
    const registry = createWidgetRegistry();
    registry.registerWidget('editor', makeEditor(conformance));
    return render(<FiveRegionEditShell schema={{ type: 'object' }} widget="editor" registry={registry} />);
}

const base: Conformance = { nodes: 3, requiredTotal: 2, requiredFilled: 1, grammarValid: true, incompleteNodeIds: ['s'] };

describe('MissingSlots — absent-required-category chrome (ED-13 F6)', () => {
    it('paints a "Missing: N ⟨category⟩" card per deficit, no PM node', () => {
        const { container } = renderShell({
            ...base,
            requiredSlots: [{ parentId: 's', category: 'prose', min: 2, filled: 1 }],
        });

        const card = container.querySelector('[data-missing-slot]')!;
        expect(card).not.toBeNull();
        expect(card.getAttribute('data-parent-id')).toBe('s');
        expect(card.getAttribute('data-category')).toBe('prose');
        expect(card.textContent).toContain('Missing: 1 prose');
    });

    it('renders no cards when there are no deficits', () => {
        const { container } = renderShell({ ...base, requiredSlots: [] });
        expect(container.querySelector('[data-frame-missing-slots]')).toBeNull();
    });

    it('[+ Add] issues a scoped insert of the short category through the palette channel', () => {
        const { container } = renderShell({
            ...base,
            requiredSlots: [{ parentId: 's', category: 'prose', min: 2, filled: 1 }],
        });

        fireEvent.click(container.querySelector('[data-missing-add]')!);

        expect(insertSpy).toHaveBeenCalledTimes(1);
        expect(insertSpy.mock.calls[0][0]).toMatchObject({ category: 'prose', parentId: 's', scoped: true });
    });
});
