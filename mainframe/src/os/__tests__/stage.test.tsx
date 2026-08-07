/**
 * The stage / presentation model — the "site sits inside the OS" primary surface.
 *
 * Reducer: `stage` promotes a window to the primary backdrop (fills bounds, demotes the prior stage);
 * `unstage` demotes it back to a float at its saved geometry; at most one stage at a time; presentation
 * round-trips through persistence. Render: the stage paints as the backdrop (not a WindowFrame), a float
 * on top, and the chrome "send to stage" / "pop out" controls drive the promotion.
 */
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
    type Bounds,
    type WindowManagerState,
    deserializeWorkspace,
    floatingWindows,
    initialWindowManagerState,
    serializeWorkspace,
    stageKey,
    windowManagerReducer as reduce,
} from '../windowManager';
import { createMainframeRegistry, createSlotRegistry, MainframeProvider, MainframeOutlet } from '../../index';
import type { MainframeInjection } from '../../index';
import { registerOsMode, type OsWindowSpec } from '../OsMainframe';

const B: Bounds = { width: 1000, height: 800 };
const withBounds = (): WindowManagerState => reduce(initialWindowManagerState, { type: 'bounds', bounds: B });
const openMany = (keys: string[], s = withBounds()) => keys.reduce((acc, key) => reduce(acc, { type: 'open', key }), s);

describe('stage reducer ops', () => {
    it('promotes a window to the stage: fills the viewport, presentation=stage', () => {
        let s = openMany(['a', 'b']);
        s = reduce(s, { type: 'move', key: 'a', x: 100, y: 100 });
        s = reduce(s, { type: 'stage', key: 'a' });
        expect(s.windows.a.presentation).toBe('stage');
        expect(s.windows.a.geometry).toEqual({ x: 0, y: 0, width: 1000, height: 800 });
        expect(stageKey(s)).toBe('a');
    });

    it('keeps at most one stage — promoting a second demotes the first to a float at its saved geometry', () => {
        let s = openMany(['a', 'b']);
        s = reduce(s, { type: 'open', key: 'a', geometry: { x: 30, y: 40, width: 300, height: 200 } }); // idempotent focus
        // Give 'a' a known float rect, stage it, then stage 'b'.
        s = reduce(s, { type: 'resize', key: 'a', width: 300, height: 200, x: 30, y: 40 });
        s = reduce(s, { type: 'stage', key: 'a' });
        s = reduce(s, { type: 'stage', key: 'b' });
        expect(stageKey(s)).toBe('b');
        expect(s.windows.b.presentation).toBe('stage');
        // 'a' demoted back to a float at its pre-stage rect.
        expect(s.windows.a.presentation).toBe('float');
        expect(s.windows.a.geometry).toEqual({ x: 30, y: 40, width: 300, height: 200 });
    });

    it('unstage demotes the stage back to a floating window at its saved geometry', () => {
        let s = reduce(withBounds(), { type: 'open', key: 'a', geometry: { x: 50, y: 60, width: 400, height: 300 } });
        s = reduce(s, { type: 'stage', key: 'a' });
        s = reduce(s, { type: 'unstage', key: 'a' });
        expect(s.windows.a.presentation).toBe('float');
        expect(s.windows.a.geometry).toEqual({ x: 50, y: 60, width: 400, height: 300 });
        expect(stageKey(s)).toBeNull();
    });

    it('opening with presentation:stage stages directly', () => {
        const s = reduce(withBounds(), { type: 'open', key: 'site', presentation: 'stage' });
        expect(stageKey(s)).toBe('site');
        expect(s.windows.site.geometry).toEqual({ x: 0, y: 0, width: 1000, height: 800 });
    });

    it('floatingWindows excludes the stage; the stage re-projects to new bounds', () => {
        let s = openMany(['a', 'b', 'c']);
        s = reduce(s, { type: 'stage', key: 'a' });
        expect(floatingWindows(s).map((w) => w.key).sort()).toEqual(['b', 'c']);
        s = reduce(s, { type: 'bounds', bounds: { width: 1600, height: 900 } });
        expect(s.windows.a.geometry).toEqual({ x: 0, y: 0, width: 1600, height: 900 });
    });

    it('presentation round-trips through persistence', () => {
        let s = openMany(['a', 'b']);
        s = reduce(s, { type: 'stage', key: 'b' });
        const restored = deserializeWorkspace(serializeWorkspace(s), B);
        expect(stageKey(restored)).toBe('b');
        expect(restored.windows.a.presentation).toBe('float');
    });

    it('a legacy snapshot without presentation restores every window as a float', () => {
        const legacy = {
            version: 1 as const,
            windows: [{ key: 'a', geometry: { x: 0, y: 0, width: 400, height: 300 }, minimized: false, maximized: false, snap: null, restore: null, role: {} }],
            zOrder: ['a'],
            focused: 'a',
        };
        // @ts-expect-error — modelling a pre-stage snapshot (no `presentation`)
        const restored = deserializeWorkspace(legacy, B);
        expect(restored.windows.a.presentation).toBe('float');
        expect(stageKey(restored)).toBeNull();
    });
});

// ── render ─────────────────────────────────────────────────────────────────────────────────────

function osInjection(): MainframeInjection {
    const slots = createSlotRegistry();
    const mainframes = createMainframeRegistry();
    registerOsMode(mainframes);
    return { slots, mainframes };
}
function inner(label: string): MainframeInjection {
    const slots = createSlotRegistry();
    const mainframes = createMainframeRegistry();
    mainframes.register('realm', () => <div data-testid={`surface-${label}`}>{label}</div>);
    return { slots, mainframes };
}
function renderOs(apps: OsWindowSpec[], os: { initialStage?: string; initialOpen?: string[] }) {
    return render(
        <MainframeProvider injection={osInjection()}>
            <MainframeOutlet mode="os" ctx={{ os: { apps, ...os } }} />
        </MainframeProvider>,
    );
}

describe('stage rendering', () => {
    it('renders the initialStage as the backdrop (.os-stage, not a draggable frame) and a float on top', () => {
        const apps: OsWindowSpec[] = [
            { key: 'site', title: 'Site', mode: 'realm', injection: inner('site') },
            { key: 'studio', title: 'Studio', mode: 'realm', injection: inner('studio') },
        ];
        const { container } = renderOs(apps, { initialStage: 'site', initialOpen: ['studio'] });
        // The stage surface is the backdrop.
        const stageEl = container.querySelector('.os-stage[data-window="site"]');
        expect(stageEl).not.toBeNull();
        expect(screen.getByTestId('surface-site')).toBeTruthy();
        // The float renders too (studio), as an ordinary window.
        expect(screen.getByTestId('surface-studio')).toBeTruthy();
        // The stage is NOT rendered inside the float window list as a WindowFrame.
        expect(container.querySelector('.os-window[data-window="site"]')).toBeNull();
    });

    it('promoting a float via its "Send to stage" control makes it the backdrop', async () => {
        const apps: OsWindowSpec[] = [
            { key: 'site', title: 'Site', mode: 'realm', injection: inner('site') },
            { key: 'studio', title: 'Studio', mode: 'realm', injection: inner('studio') },
        ];
        const { container } = renderOs(apps, { initialStage: 'site', initialOpen: ['studio'] });
        // studio starts as a float — find its "Send to stage" button and click it.
        const btn = [...container.querySelectorAll('button[aria-label="Send to stage"]')].find((b) =>
            b.closest('[data-window="studio"]'),
        ) as HTMLButtonElement;
        expect(btn).toBeTruthy();
        await act(async () => btn.click());
        // studio is now the stage backdrop; site is no longer the stage.
        expect(container.querySelector('.os-stage[data-window="studio"]')).not.toBeNull();
        expect(container.querySelector('.os-stage[data-window="site"]')).toBeNull();
    });
});
