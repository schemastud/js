import { cleanup, fireEvent, render } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWidgetRegistry } from '@schemastud/seam';
import { FiveRegionEditShell, type FiveRegionEditShellProps } from '../src/FiveRegionEditShell';
import { useEditShellMount, type EditShellMountValue } from '../src/EditShellMount';

afterEach(cleanup);

// A mock editor that hands its mount out so a test can drive dirty/saving state.
let capturedMount: EditShellMountValue | null = null;
function MockEditorWidget() {
    const mount = useEditShellMount();
    useEffect(() => {
        capturedMount = mount;
    }, [mount]);
    return <div data-testid="canvas-editor" />;
}

function renderShell(props: Partial<FiveRegionEditShellProps> = {}) {
    capturedMount = null;
    const registry = createWidgetRegistry();
    registry.registerWidget('editor', MockEditorWidget);
    return render(
        <FiveRegionEditShell schema={{ type: 'object' }} record={{ a: 1 }} widget="editor" registry={registry} {...props} />,
    );
}

describe('SavePill + Rich|Source toggle (ED-10)', () => {
    it('reflects Saved / Unsaved / Saving… from the mount state', () => {
        const { container } = renderShell();

        // Opens clean → Saved.
        expect(container.querySelector('[data-frame-save-pill="saved"]')).not.toBeNull();

        // An edit → Unsaved (a mode-toggle click re-renders the shell to observe it).
        capturedMount!.markDirty(true);
        fireEvent.click(container.querySelector('[data-mode="source"]')!);
        expect(container.querySelector('[data-frame-save-pill="unsaved"]')).not.toBeNull();

        // A commit in flight → Saving….
        capturedMount!.markSaving(true);
        fireEvent.click(container.querySelector('[data-mode="rich"]')!);
        expect(container.querySelector('[data-frame-save-pill="saving"]')).not.toBeNull();
    });

    it('hides the manual Save when autosave is on (default), shows it when off', () => {
        const on = renderShell();
        expect(on.container.querySelector('[data-frame-save-action]')).toBeNull();
        cleanup();

        const onSave = vi.fn();
        const off = renderShell({ autosave: false, onSave });
        const save = off.container.querySelector('[data-frame-save-action]');
        expect(save).not.toBeNull();
        fireEvent.click(save!);
        expect(onSave).toHaveBeenCalled();
    });

    it('opens in Rich; the Source toggle switches the canvas to a raw-JSON view', () => {
        const { container, getByTestId } = renderShell();

        // Opens Rich: the editor is mounted, no source view.
        expect(getByTestId('canvas-editor')).toBeTruthy();
        expect(container.querySelector('[data-frame-source-view]')).toBeNull();

        fireEvent.click(container.querySelector('[data-mode="source"]')!);
        const source = container.querySelector('[data-frame-source-view]');
        expect(source).not.toBeNull();
        expect(source!.textContent).toContain('"a": 1');

        fireEvent.click(container.querySelector('[data-mode="rich"]')!);
        expect(container.querySelector('[data-frame-source-view]')).toBeNull();
    });

    it('hides the Rich|Source toggle when sourceToggle is off', () => {
        const { container } = renderShell({ sourceToggle: false });
        expect(container.querySelector('[data-frame-mode-toggle]')).toBeNull();
    });
});
