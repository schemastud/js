import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createWidgetRegistry } from '@schemastud/seam';
import {
    CANVAS_MIN,
    INSPECTOR_MIN,
    PALETTE_MIN,
    collapseModes,
    deriveCollapseLevel,
} from '../src/responsive';
import { FiveRegionEditShell } from '../src/FiveRegionEditShell';

afterEach(cleanup);

describe('responsive collapse ordering (ED-11)', () => {
    it('derives the level from region min-widths (not magic breakpoints)', () => {
        expect(deriveCollapseLevel(CANVAS_MIN + INSPECTOR_MIN + PALETTE_MIN)).toBe(0);
        expect(deriveCollapseLevel(CANVAS_MIN + INSPECTOR_MIN + PALETTE_MIN - 1)).toBe(1);
        expect(deriveCollapseLevel(CANVAS_MIN + INSPECTOR_MIN)).toBe(1);
        expect(deriveCollapseLevel(CANVAS_MIN + INSPECTOR_MIN - 1)).toBe(2);
        expect(deriveCollapseLevel(200)).toBe(2);
    });

    it('yields the palette before the inspector; canvas is last-standing', () => {
        // Level 1: palette has yielded (rail) but the inspector still holds (pane).
        const mid = collapseModes(1);
        expect(mid.palette).toBe('rail');
        expect(mid.inspector).toBe('pane');
        expect(mid.canvasFullBleed).toBe(false);

        // Level 2: both side panes are drawers; the canvas goes full-bleed.
        const narrow = collapseModes(2);
        expect(narrow.palette).toBe('drawer');
        expect(narrow.inspector).toBe('drawer');
        expect(narrow.canvasFullBleed).toBe(true);

        // Level 0: full 3-pane.
        expect(collapseModes(0)).toEqual({ palette: 'pane', inspector: 'pane', canvasFullBleed: false });
    });
});

describe('FiveRegionEditShell responsive rendering (ED-11)', () => {
    function renderAt(level: 0 | 1 | 2) {
        const registry = createWidgetRegistry();
        registry.registerWidget('editor', () => <div data-testid="canvas-editor" />);
        return render(
            <FiveRegionEditShell schema={{ type: 'object' }} widget="editor" registry={registry} collapseLevel={level} />,
        );
    }

    it('renders full 3-pane at level 0', () => {
        const { container } = renderAt(0);
        expect(container.querySelector('[data-frame-region="palette"]')!.getAttribute('data-palette-mode')).toBe('pane');
        expect(container.querySelector('[data-frame-region="inspector-region"]')!.getAttribute('data-inspector-mode')).toBe('pane');
        expect(container.querySelector('[data-frame-region="canvas"]')!.hasAttribute('data-full-bleed')).toBe(false);
    });

    it('collapses the palette first at level 1 while the inspector holds', () => {
        const { container } = renderAt(1);
        expect(container.querySelector('[data-frame-region="palette"]')!.getAttribute('data-palette-mode')).toBe('rail');
        expect(container.querySelector('[data-frame-region="inspector-region"]')!.getAttribute('data-inspector-mode')).toBe('pane');
    });

    it('turns both side panes into drawers with a full-bleed canvas at level 2', () => {
        const { container } = renderAt(2);
        expect(container.querySelector('[data-frame-region="palette"]')!.getAttribute('data-palette-mode')).toBe('drawer');
        expect(container.querySelector('[data-frame-region="inspector-region"]')!.getAttribute('data-inspector-mode')).toBe('drawer');
        expect(container.querySelector('[data-frame-region="canvas"]')!.hasAttribute('data-full-bleed')).toBe(true);
    });
});
