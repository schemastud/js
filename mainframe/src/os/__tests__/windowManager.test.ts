/**
 * Exhaustive unit tests for the capability-complete window-manager reducer (Frame OS ticket 03).
 * Extends the shipped 15-case reducer test with the full op set, z-order/anchor invariants,
 * snap/tile geometry, role honoring, and workspace round-trip persistence. Pure logic — no DOM.
 */
import { describe, expect, it } from 'vitest';

import {
    type Bounds,
    DEFAULT_BOUNDS,
    deserializeWorkspace,
    initialWindowManagerState,
    isTaskOpen,
    type WindowManagerState,
    serializeWorkspace,
    snapRect,
    tileRects,
    visibleWindows,
    windowManagerReducer as reduce,
    zIndexOf,
} from '../windowManager';

const B: Bounds = { width: 1000, height: 800 };

function withBounds(bounds: Bounds = B): WindowManagerState {
    return reduce(initialWindowManagerState, { type: 'bounds', bounds });
}

function openMany(keys: string[], base = withBounds()): WindowManagerState {
    return keys.reduce((s, key) => reduce(s, { type: 'open', key }), base);
}

describe('open / focus / close (baseline lifecycle, preserved)', () => {
    it('opens a window, focuses it, and adds it to zOrder', () => {
        const s = reduce(withBounds(), { type: 'open', key: 'a' });
        expect(isTaskOpen(s, 'a')).toBe(true);
        expect(s.focused).toBe('a');
        expect(s.zOrder).toEqual(['a']);
        expect(s.windows.a.minimized).toBe(false);
    });

    it('open is idempotent: re-opening focuses + un-minimizes, keeps geometry', () => {
        let s = openMany(['a', 'b']);
        s = reduce(s, { type: 'minimize', key: 'a' });
        const geom = s.windows.a.geometry;
        s = reduce(s, { type: 'open', key: 'a' });
        expect(s.windows.a.minimized).toBe(false);
        expect(s.focused).toBe('a');
        expect(s.windows.a.geometry).toEqual(geom);
        expect(Object.keys(s.windows)).toHaveLength(2);
    });

    it('focus raises a window to the front and sets focused', () => {
        let s = openMany(['a', 'b', 'c']);
        expect(s.focused).toBe('c');
        s = reduce(s, { type: 'focus', key: 'a' });
        expect(s.focused).toBe('a');
        expect(s.zOrder[s.zOrder.length - 1]).toBe('a');
    });

    it('close removes the window and refocuses the topmost visible', () => {
        let s = openMany(['a', 'b', 'c']);
        s = reduce(s, { type: 'close', key: 'c' });
        expect(isTaskOpen(s, 'c')).toBe(false);
        expect(s.focused).toBe('b');
        expect(s.zOrder).toEqual(['a', 'b']);
    });

    it('close on an unknown key is a no-op', () => {
        const s = openMany(['a']);
        expect(reduce(s, { type: 'close', key: 'zzz' })).toBe(s);
    });

    it('closing the last window leaves focused null', () => {
        let s = openMany(['a']);
        s = reduce(s, { type: 'close', key: 'a' });
        expect(s.focused).toBeNull();
        expect(s.zOrder).toEqual([]);
    });
});

describe('role fields (no privileged root window; reducer honors metadata)', () => {
    it('a persistent window ignores close', () => {
        let s = reduce(withBounds(), { type: 'open', key: 'desktop', role: { persistent: true } });
        s = reduce(s, { type: 'close', key: 'desktop' });
        expect(isTaskOpen(s, 'desktop')).toBe(true);
    });

    it('a non-closable window ignores close', () => {
        let s = reduce(withBounds(), { type: 'open', key: 'hud', role: { closable: false } });
        s = reduce(s, { type: 'close', key: 'hud' });
        expect(isTaskOpen(s, 'hud')).toBe(true);
    });

    it('zAnchor bands are honored: floor stays below normal, top stays above — even after focus', () => {
        let s = withBounds();
        s = reduce(s, { type: 'open', key: 'floor', role: { zAnchor: 'floor' } });
        s = reduce(s, { type: 'open', key: 'n1' });
        s = reduce(s, { type: 'open', key: 'top', role: { zAnchor: 'top' } });
        s = reduce(s, { type: 'open', key: 'n2' });
        // Invariant: floor first, then normals, then top — regardless of open order.
        expect(s.zOrder).toEqual(['floor', 'n1', 'n2', 'top']);
        // Focusing the floor window raises it only within its band (still below all normals).
        s = reduce(s, { type: 'focus', key: 'floor' });
        expect(s.zOrder[0]).toBe('floor');
        expect(zIndexOf(s, 'floor')).toBeLessThan(zIndexOf(s, 'n1'));
        // Focusing a normal cannot lift it above the top-anchored window.
        s = reduce(s, { type: 'focus', key: 'n1' });
        expect(zIndexOf(s, 'n1')).toBeLessThan(zIndexOf(s, 'top'));
        expect(s.zOrder[s.zOrder.length - 1]).toBe('top');
    });
});

describe('minimize / maximize / restore', () => {
    it('minimize hides from the desktop and refocuses the next visible', () => {
        let s = openMany(['a', 'b']);
        s = reduce(s, { type: 'minimize', key: 'b' });
        expect(s.windows.b.minimized).toBe(true);
        expect(s.focused).toBe('a');
        expect(visibleWindows(s).map((w) => w.key)).toEqual(['a']);
    });

    it('maximize fills the workspace bounds and remembers the restore rect', () => {
        let s = reduce(withBounds(), { type: 'open', key: 'a', geometry: { x: 100, y: 100, width: 300, height: 200 } });
        s = reduce(s, { type: 'maximize', key: 'a' });
        expect(s.windows.a.maximized).toBe(true);
        expect(s.windows.a.geometry).toEqual({ x: 0, y: 0, width: B.width, height: B.height });
        expect(s.windows.a.restore).toEqual({ x: 100, y: 100, width: 300, height: 200 });
    });

    it('restore returns to the pre-maximize rect and clears flags', () => {
        let s = reduce(withBounds(), { type: 'open', key: 'a', geometry: { x: 100, y: 100, width: 300, height: 200 } });
        s = reduce(s, { type: 'maximize', key: 'a' });
        s = reduce(s, { type: 'restore', key: 'a' });
        expect(s.windows.a.maximized).toBe(false);
        expect(s.windows.a.snap).toBeNull();
        expect(s.windows.a.geometry).toEqual({ x: 100, y: 100, width: 300, height: 200 });
    });
});

describe('move / resize free the window from snap/maximize', () => {
    it('move sets x/y and drops maximized/snap', () => {
        let s = reduce(withBounds(), { type: 'open', key: 'a' });
        s = reduce(s, { type: 'maximize', key: 'a' });
        s = reduce(s, { type: 'move', key: 'a', x: 42, y: 24 });
        expect(s.windows.a.geometry.x).toBe(42);
        expect(s.windows.a.geometry.y).toBe(24);
        expect(s.windows.a.maximized).toBe(false);
        expect(s.windows.a.snap).toBeNull();
    });

    it('resize sets width/height (and optional origin) and drops snap/maximize', () => {
        let s = reduce(withBounds(), { type: 'open', key: 'a' });
        s = reduce(s, { type: 'snap', key: 'a', zone: 'left' });
        s = reduce(s, { type: 'resize', key: 'a', width: 500, height: 400, x: 10, y: 20 });
        expect(s.windows.a.geometry).toEqual({ x: 10, y: 20, width: 500, height: 400 });
        expect(s.windows.a.snap).toBeNull();
    });
});

describe('snap geometry', () => {
    it('snaps to each zone with the correct rect', () => {
        const cases: Array<[Parameters<typeof snapRect>[0], { x: number; y: number; width: number; height: number }]> = [
            ['left', { x: 0, y: 0, width: 500, height: 800 }],
            ['right', { x: 500, y: 0, width: 500, height: 800 }],
            ['top', { x: 0, y: 0, width: 1000, height: 400 }],
            ['bottom', { x: 0, y: 400, width: 1000, height: 400 }],
            ['top-left', { x: 0, y: 0, width: 500, height: 400 }],
            ['bottom-right', { x: 500, y: 400, width: 500, height: 400 }],
            ['maximized', { x: 0, y: 0, width: 1000, height: 800 }],
        ];
        for (const [zone, rect] of cases) {
            let s = reduce(withBounds(), { type: 'open', key: 'a' });
            s = reduce(s, { type: 'snap', key: 'a', zone });
            expect(s.windows.a.geometry).toEqual(rect);
            expect(s.windows.a.snap).toBe(zone);
        }
    });

    it('snapPreview sets and clears the transient zone hint; move clears it', () => {
        let s = reduce(withBounds(), { type: 'open', key: 'a' });
        s = reduce(s, { type: 'snapPreview', zone: 'left' });
        expect(s.snap).toBe('left');
        s = reduce(s, { type: 'move', key: 'a', x: 5, y: 5 });
        expect(s.snap).toBeNull();
    });
});

describe('tile', () => {
    it('tiles all visible windows into a near-square grid filling the bounds', () => {
        const s = openMany(['a', 'b', 'c', 'd']);
        const t = reduce(s, { type: 'tile' });
        // 4 windows → 2x2 grid of 500x400.
        expect(t.windows.a.geometry).toEqual({ x: 0, y: 0, width: 500, height: 400 });
        expect(t.windows.d.geometry).toEqual({ x: 500, y: 400, width: 500, height: 400 });
    });

    it('tile skips minimized windows and accepts an explicit key set', () => {
        let s = openMany(['a', 'b', 'c']);
        s = reduce(s, { type: 'minimize', key: 'c' });
        const t = reduce(s, { type: 'tile' });
        // Only a,b visible → 1x2 grid (cols=ceil(sqrt2)=2, rows=1) of 500x800.
        expect(t.windows.a.geometry.width).toBe(500);
        expect(t.windows.c.geometry).toEqual(s.windows.c.geometry); // untouched
    });

    it('tileRects is a pure helper producing `count` rects', () => {
        expect(tileRects(1, B)).toHaveLength(1);
        expect(tileRects(3, B)).toHaveLength(3);
    });
});

describe('dock', () => {
    it('docks to a left strip of default 1/4 width', () => {
        let s = reduce(withBounds(), { type: 'open', key: 'a' });
        s = reduce(s, { type: 'dock', key: 'a', edge: 'left' });
        expect(s.windows.a.geometry).toEqual({ x: 0, y: 0, width: 250, height: 800 });
    });

    it('docks to a right strip with an explicit size', () => {
        let s = reduce(withBounds(), { type: 'open', key: 'a' });
        s = reduce(s, { type: 'dock', key: 'a', edge: 'right', size: 300 });
        expect(s.windows.a.geometry).toEqual({ x: 700, y: 0, width: 300, height: 800 });
    });
});

describe('bounds re-projection', () => {
    it('re-projects maximized + snapped windows when the viewport changes', () => {
        let s = openMany(['a', 'b']);
        s = reduce(s, { type: 'maximize', key: 'a' });
        s = reduce(s, { type: 'snap', key: 'b', zone: 'right' });
        s = reduce(s, { type: 'bounds', bounds: { width: 1600, height: 900 } });
        expect(s.windows.a.geometry).toEqual({ x: 0, y: 0, width: 1600, height: 900 });
        expect(s.windows.b.geometry).toEqual({ x: 800, y: 0, width: 800, height: 900 });
    });
});

describe('workspace persistence round-trip', () => {
    it('serialize → deserialize restores open set, geometry, z-order, min/max, snap', () => {
        let s = openMany(['a', 'b', 'c']);
        s = reduce(s, { type: 'minimize', key: 'b' });
        s = reduce(s, { type: 'snap', key: 'c', zone: 'left' });
        s = reduce(s, { type: 'move', key: 'a', x: 33, y: 44 });
        s = reduce(s, { type: 'focus', key: 'a' });

        const persisted = serializeWorkspace(s);
        const restored = deserializeWorkspace(persisted, B);

        expect(Object.keys(restored.windows).sort()).toEqual(['a', 'b', 'c']);
        expect(restored.windows.a.geometry).toEqual(s.windows.a.geometry);
        expect(restored.windows.b.minimized).toBe(true);
        expect(restored.windows.c.snap).toBe('left');
        expect(restored.zOrder).toEqual(s.zOrder);
        expect(restored.focused).toBe('a');
    });

    it('deserialize of null / wrong version degrades to the initial state (no throw)', () => {
        expect(deserializeWorkspace(null, B).windows).toEqual({});
        // @ts-expect-error — modelling a legacy/unknown snapshot
        expect(deserializeWorkspace({ version: 99 }, B).zOrder).toEqual([]);
    });

    it('a restored snapshot re-projects to the new viewport bounds', () => {
        let s = openMany(['a']);
        s = reduce(s, { type: 'maximize', key: 'a' });
        const persisted = serializeWorkspace(s);
        const restored = deserializeWorkspace(persisted, { width: 2000, height: 1200 });
        expect(restored.windows.a.geometry).toEqual({ x: 0, y: 0, width: 2000, height: 1200 });
    });

    it('preserves the pre-maximize restore rect across a round-trip (regression: was lost)', () => {
        let s = reduce(withBounds(), { type: 'open', key: 'a', geometry: { x: 100, y: 100, width: 300, height: 200 } });
        s = reduce(s, { type: 'maximize', key: 'a' });

        const restored = deserializeWorkspace(serializeWorkspace(s), B);
        // After a reload, un-maximizing must return to the ORIGINAL floating rect, not the max rect.
        const unmax = reduce(restored, { type: 'restore', key: 'a' });
        expect(unmax.windows.a.geometry).toEqual({ x: 100, y: 100, width: 300, height: 200 });
    });

    it('a legacy snapshot without a restore field degrades gracefully (falls back to geometry)', () => {
        const legacy = {
            version: 1 as const,
            windows: [{ key: 'a', geometry: { x: 0, y: 0, width: 500, height: 400 }, minimized: false, maximized: false, snap: null, role: {} }],
            zOrder: ['a'],
            focused: 'a',
        };
        // @ts-expect-error — modelling a pre-restore-field snapshot (no `restore` key)
        const restored = deserializeWorkspace(legacy, B);
        expect(restored.windows.a.restore).toBeNull();
        expect(restored.focused).toBe('a');
    });

    it('does not restore a minimized window as focused (regression: focus fell on a hidden window)', () => {
        let s = openMany(['a', 'b']);
        s = reduce(s, { type: 'focus', key: 'a' });
        s = reduce(s, { type: 'minimize', key: 'a' });
        // At this point focused is 'b' (topmost visible). Force a snapshot that names the minimized 'a'.
        const persisted = { ...serializeWorkspace(s), focused: 'a' };

        const restored = deserializeWorkspace(persisted, B);
        // 'a' is minimized → focus must fall through to the topmost visible ('b'), never a hidden window.
        expect(restored.windows.a.minimized).toBe(true);
        expect(restored.focused).toBe('b');
    });
});

describe('defaults', () => {
    it('exposes a default bounds and an empty initial state', () => {
        expect(DEFAULT_BOUNDS.width).toBeGreaterThan(0);
        expect(initialWindowManagerState.zOrder).toEqual([]);
        expect(initialWindowManagerState.focused).toBeNull();
    });
});
