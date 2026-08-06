/**
 * The `os` Mainframe mode — empty-structure + recursion tests (Frame OS ticket 04).
 *
 * Verifies: (a) an empty registry + no windows renders the desktop regions but no chrome contributions
 * (honestly empty neutral desktop); (b) a `ctx.os.apps` descriptor opens a window whose nested
 * MainframeOutlet renders the REAL inner surface (recursion); (c) the two custom slots resolve inside
 * the window's own scope; (d) key-based override replace/suppress works against the os registry.
 */
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createMainframeRegistry, createSlotRegistry } from '../../index';
import type { Mainframe, MainframeInjection } from '../../index';
import { MainframeProvider, MainframeOutlet } from '../../react';
import { OS_WINDOW_SLOTS, registerOsMode, type OsWindowSpec } from '../OsMainframe';

/** Build an `os`-mode injection with the desktop contributions supplied, plus optional `can`. */
function osInjection(
    contribute?: (slots: ReturnType<typeof createSlotRegistry>) => void,
    can?: (cap: string) => boolean,
): MainframeInjection {
    const slots = createSlotRegistry();
    const mainframes = createMainframeRegistry();
    registerOsMode(mainframes);
    contribute?.(slots);
    return { slots, mainframes, can };
}

/** A trivial inner Mainframe (the window's realm surface) for the recursion test. */
const InnerMainframe: Mainframe = ({ slots }) => <div data-testid="inner-surface">{slots.node('main' as never) ?? 'REAL SURFACE'}</div>;

function innerInjection(): MainframeInjection {
    const slots = createSlotRegistry();
    const mainframes = createMainframeRegistry();
    mainframes.register('realm', InnerMainframe);
    return { slots, mainframes };
}

function renderOs(injection: MainframeInjection, os?: { apps?: OsWindowSpec[]; initialOpen?: string[] }) {
    return render(
        <MainframeProvider injection={injection}>
            <MainframeOutlet mode="os" ctx={{ os: { apps: os?.apps ?? [], initialOpen: os?.initialOpen } }} />
        </MainframeProvider>,
    );
}

describe('os mode — empty structure', () => {
    it('renders an honestly empty neutral desktop with no chrome contributions', () => {
        const { container } = renderOs(osInjection());
        // The structural regions exist…
        expect(container.querySelector('.os-root')).not.toBeNull();
        expect(container.querySelector('.os-menubar')).not.toBeNull();
        expect(container.querySelector('.os-desktop')).not.toBeNull();
        // …but no chrome was contributed, so the menubar actions + dock + windows are empty.
        expect(container.querySelector('.os-menubar-actions')?.textContent).toBe('');
        expect(container.querySelector('.os-dock')).toBeNull(); // no rail contribution → no dock
        expect(container.querySelector('.os-desktop-windows')?.childElementCount).toBe(0);
    });

    it('places the remapped core slots (brand/topBar/rail/status) without extending the vocabulary', () => {
        const injection = osInjection((slots) => {
            slots.contribute({ slot: 'brand', key: 'brand', node: <span data-testid="brand">◆</span> });
            slots.contribute({ slot: 'topBar.actions', key: 'a1', node: <span data-testid="menu-a">File</span> });
            slots.contribute({ slot: 'rail', key: 'dock', node: <span data-testid="dock">DOCK</span> });
            slots.contribute({ slot: 'status', key: 's1', node: <span data-testid="status">OK</span> });
        });
        const { container } = renderOs(injection);
        expect(screen.getByTestId('brand')).toBeTruthy();
        expect(screen.getByTestId('menu-a')).toBeTruthy();
        expect(screen.getByTestId('dock')).toBeTruthy();
        expect(screen.getByTestId('status')).toBeTruthy();
        expect(container.querySelector('.os-dock')).not.toBeNull();
        expect(container.querySelector('.os-statusbus')).not.toBeNull();
    });

    it('declares exactly the two new custom slots and no fourth fill-type', () => {
        expect(OS_WINDOW_SLOTS.map((s) => s.name)).toEqual(['window.chrome', 'window.toolbar']);
        for (const s of OS_WINDOW_SLOTS) {
            expect(['single-node', 'ordered-multi-source', 'render-prop']).toContain(s.fillType);
        }
    });
});

describe('os mode — recursion (each window is the real surface)', () => {
    it('opens an initial window whose nested MainframeOutlet renders the real inner surface', () => {
        const app: OsWindowSpec = { key: 'studio', title: 'Studio', mode: 'realm', injection: innerInjection() };
        renderOs(osInjection(), { apps: [app], initialOpen: ['studio'] });
        // The nested scope rendered the inner realm surface (recursion).
        expect(screen.getByTestId('inner-surface').textContent).toBe('REAL SURFACE');
        // The window title bar (chrome owned by the window) shows the spec title.
        expect(screen.getByText('Studio')).toBeTruthy();
    });

    it('resolves the window.chrome / window.toolbar custom slots inside the window scope', () => {
        const slots = createSlotRegistry();
        const mainframes = createMainframeRegistry();
        // The inner scope declares the os window slots so its own contributions resolve there.
        mainframes.register('realm', InnerMainframe, { slots: OS_WINDOW_SLOTS });
        slots.contribute({ slot: 'window.toolbar', key: 'save', node: <button data-testid="win-action">Save</button> });
        slots.contribute({ slot: 'window.chrome', key: 'badge', zone: 'start', node: <span data-testid="win-badge">●</span> });
        const app: OsWindowSpec = { key: 'studio', title: 'Studio', mode: 'realm', injection: { slots, mainframes } };

        renderOs(osInjection(), { apps: [app], initialOpen: ['studio'] });

        expect(screen.getByTestId('win-action')).toBeTruthy();
        expect(screen.getByTestId('win-badge')).toBeTruthy();
    });
});

describe('os mode — key-based override (no new machinery)', () => {
    it('replaces a single-node contribution (last writer wins) and suppresses one with node:null', () => {
        const injection = osInjection((slots) => {
            // Replace: re-contributing the brand (single-node) — last writer wins.
            slots.contribute({ slot: 'brand', key: 'brand', node: <span data-testid="brand">ORIGINAL</span> });
            slots.contribute({ slot: 'brand', key: 'brand', node: <span data-testid="brand">REPLACED</span> });
            // Suppress: the winning `rail` (single-node) contribution is a null node → no dock renders.
            slots.contribute({ slot: 'rail', key: 'dock', node: <span data-testid="dock">SHOWN</span> });
            slots.contribute({ slot: 'rail', key: 'dock', node: null });
        });
        const { container } = renderOs(injection);
        expect(screen.getByTestId('brand').textContent).toBe('REPLACED');
        // The suppressed dock (winning node is null) renders no dock region.
        expect(container.querySelector('.os-dock')).toBeNull();
    });
});

describe('os mode — window manager wiring', () => {
    it('a dock contribution can open a window via useOs()', async () => {
        // A dock button that opens the studio app through the os context.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { useOs } = await import('../OsMainframe');
        function DockOpener() {
            const { openApp } = useOs();
            return <button data-testid="open-studio" onClick={() => openApp('studio')}>Open</button>;
        }
        const injection = osInjection((slots) => {
            slots.contribute({ slot: 'rail', key: 'dock', node: <DockOpener /> });
        });
        const app: OsWindowSpec = { key: 'studio', title: 'Studio', mode: 'realm', injection: innerInjection() };
        renderOs(injection, { apps: [app] });

        // No window open initially.
        expect(screen.queryByTestId('inner-surface')).toBeNull();
        // Click the dock button → opens the window (nested surface appears).
        await act(async () => {
            screen.getByTestId('open-studio').click();
        });
        expect(screen.getByTestId('inner-surface')).toBeTruthy();
    });
});
