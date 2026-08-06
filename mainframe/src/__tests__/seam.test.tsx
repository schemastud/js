/**
 * The seam smoke test (ticket 03 acceptance): prove the two load-bearing properties of the
 * host→Mainframe delegation seam, plus the resolver's contract behavior.
 *
 * 1. **Delegation** — the host owns mode state; the outlet renders the Mainframe registered for that
 *    mode, handing it the resolved slots.
 * 2. **State-preserving child-swap** — switching mode swaps *only the child Mainframe*; state held
 *    above the outlet (the "host") does NOT remount. This is why AppShell delegates to a Mainframe
 *    instead of *becoming* one (ADR-0099).
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    createMainframeRegistry,
    createSlotRegistry,
    MainframeOutlet,
    MainframeProvider,
    resolveSlots,
    type Mainframe,
    type MainframeInjection,
    type SlotRegistry,
} from '../index';

// --- Delegation + child-swap -------------------------------------------------------------------

// Module-level mount counters: incremented in each component's mount effect. If a component
// remounts, its counter climbs — the tell for "the tree above the outlet was torn down".
let hostSentinelMounts = 0;
let modeAMounts = 0;
let modeBMounts = 0;

function useMountCounter(bump: () => void) {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useState(() => {
        bump();
        return null;
    });
}

const ModeA: Mainframe = ({ slots }) => {
    useMountCounter(() => {
        modeAMounts++;
    });
    return (
        <div data-testid="mainframe">
            <span data-testid="mode">A</span>
            <span data-testid="brand">{slots.node('brand')}</span>
        </div>
    );
};

const ModeB: Mainframe = ({ slots, ctx }) => {
    useMountCounter(() => {
        modeBMounts++;
    });
    return (
        <div data-testid="mainframe">
            <span data-testid="mode">B</span>
            <span data-testid="main">{slots.main(ctx.payload)}</span>
        </div>
    );
};

function buildInjection(): MainframeInjection {
    const slots = createSlotRegistry();
    const mainframes = createMainframeRegistry();
    mainframes.register('a', ModeA);
    mainframes.register('b', ModeB);
    slots.contribute({ slot: 'brand', key: 'logo', node: <b>splicewire</b> });
    slots.contribute({ slot: 'main', key: 'page', render: (payload) => <em>{String(payload)}</em> });
    return { slots, mainframes };
}

/** The stable host: owns mode state + a mount sentinel that must survive a mode swap. */
function Host() {
    const [injection] = useState(buildInjection);
    const [mode, setMode] = useState('a');
    useMountCounter(() => {
        hostSentinelMounts++;
    });
    return (
        <MainframeProvider injection={injection}>
            <button onClick={() => setMode((m) => (m === 'a' ? 'b' : 'a'))}>toggle</button>
            <MainframeOutlet mode={mode} ctx={{ payload: 'hello' }} />
        </MainframeProvider>
    );
}

describe('host → Mainframe delegation seam', () => {
    beforeEach(() => {
        hostSentinelMounts = 0;
        modeAMounts = 0;
        modeBMounts = 0;
    });

    it('delegates: renders the Mainframe registered for the active mode, with resolved slots', () => {
        render(<Host />);
        expect(screen.getByTestId('mode').textContent).toBe('A');
        expect(screen.getByTestId('brand').textContent).toBe('splicewire');
    });

    it('swaps the child Mainframe on mode change without remounting the host', () => {
        render(<Host />);
        expect(modeAMounts).toBe(1);
        expect(hostSentinelMounts).toBe(1);

        act(() => {
            fireEvent.click(screen.getByText('toggle'));
        });

        // Delegation followed the mode: B is now rendered, reading a different slot.
        expect(screen.getByTestId('mode').textContent).toBe('B');
        expect(screen.getByTestId('main').textContent).toBe('hello');

        // Child-swap: B mounted, and the host sentinel did NOT remount (still 1) — state above the
        // outlet is preserved. This is the property the whole seam exists to guarantee.
        expect(modeBMounts).toBe(1);
        expect(hostSentinelMounts).toBe(1);

        // Toggling back mounts A afresh (it was unmounted), host still stable.
        act(() => {
            fireEvent.click(screen.getByText('toggle'));
        });
        expect(screen.getByTestId('mode').textContent).toBe('A');
        expect(modeAMounts).toBe(2);
        expect(hostSentinelMounts).toBe(1);
    });
});

// --- Resolver contract behavior ----------------------------------------------------------------

function resolveWith(
    populate: (r: SlotRegistry) => void,
    can?: (cap: string) => boolean,
) {
    const slots = createSlotRegistry();
    const mainframes = createMainframeRegistry();
    mainframes.register('x', (() => null) as Mainframe, {
        slots: [{ name: 'custom.panel', fillType: 'single-node' }],
    });
    populate(slots);
    return resolveSlots({ contributions: slots.contributions(), registrations: mainframes.all(), can });
}

describe('resolver (frozen contract behavior)', () => {
    afterEach(() => vi.restoreAllMocks());

    it('sorts ordered-multi-source by (zone, order, registration index)', () => {
        const resolved = resolveWith((r) => {
            // Deliberately out of final order; keys encode expected final position.
            r.contribute({ slot: 'topBar.actions', key: 'end-50', node: null, zone: 'end' });
            r.contribute({ slot: 'topBar.actions', key: 'start-10', node: null, zone: 'start', order: 10 });
            r.contribute({ slot: 'topBar.actions', key: 'start-90', node: null, zone: 'start', order: 90 });
            r.contribute({ slot: 'topBar.actions', key: 'end-20', node: null, zone: 'end', order: 20 });
        });
        // start zone before end zone; within a zone, by order; registration index breaks final ties.
        expect(resolved.keys('topBar.actions')).toEqual(['start-10', 'start-90', 'end-20', 'end-50']);
        expect(resolved.items('topBar.actions', 'start')).toHaveLength(2);
    });

    it('gates contributions by `can` — the entitlement axis, orthogonal to placement', () => {
        const resolved = resolveWith(
            (r) => {
                r.contribute({ slot: 'topBar.actions', key: 'public', node: null, zone: 'start' });
                r.contribute({ slot: 'topBar.actions', key: 'edit', node: null, zone: 'start', can: 'compose.edit' });
            },
            (cap) => cap !== 'compose.edit', // visitor: lacks the edit entitlement
        );
        // The edit contribution gates to empty; the slot is still placeable, just thinner.
        expect(resolved.keys('topBar.actions')).toEqual(['public']);
    });

    it('drops a `can`-gated contribution when no predicate is wired (closed by default)', () => {
        const resolved = resolveWith((r) => {
            r.contribute({ slot: 'brand', key: 'gated', node: <span>x</span>, can: 'anything' });
        });
        expect(resolved.node('brand')).toBeUndefined();
    });

    it('single-node filled twice → dev-warns and last writer wins', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const resolved = resolveWith((r) => {
            r.contribute({ slot: 'brand', key: 'first', node: <span>first</span> });
            r.contribute({ slot: 'brand', key: 'second', node: <span>second</span> });
        });
        const { container } = render(<>{resolved.node('brand')}</>);
        expect(container.textContent).toBe('second');
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('filled 2 times'));
    });

    it('unknown slot name → dev-warns and is ignored (never throws)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const resolved = resolveWith((r) => {
            r.contribute({ slot: 'topBra.actions', key: 'typo', node: null });
        });
        expect(resolved.has('topBra.actions')).toBe(false);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown slot'));
    });

    it('a custom slot declared by a mainframe is known (no unknown-slot warning)', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const resolved = resolveWith((r) => {
            r.contribute({ slot: 'custom.panel', key: 'p', node: <span>panel</span> });
        });
        expect(warn).not.toHaveBeenCalled();
        const { container } = render(<>{resolved.node('custom.panel')}</>);
        expect(container.textContent).toBe('panel');
    });
});

// --- Window-mode: the public "view" falls out of the entitlement axis (ticket 05) -----------------

/**
 * A stripped `window`-shaped Mainframe: it frames the `main` render-target (the live site) and floats
 * a gated `windowEdit` custom slot for its editor overlays — the shape splicewire-app's real
 * `WindowMainframe` uses. Rendered through the *same* seam with two different `can` predicates, it
 * proves the ADR-0099 claim: the same mode tree gates down to the bare site for a visitor — no
 * separate render path.
 */
const WindowLike: Mainframe = ({ slots, ctx }) => (
    <div data-testid="window">
        <div data-testid="site">{slots.main(ctx.payload)}</div>
        {slots.items('windowEdit').map((node, i) => (
            <div key={i} data-testid="edit-overlay">
                {node}
            </div>
        ))}
    </div>
);

function renderWindow(can: (cap: string) => boolean) {
    const slots = createSlotRegistry();
    const mainframes = createMainframeRegistry();
    mainframes.register('window', WindowLike, {
        slots: [{ name: 'windowEdit', fillType: 'ordered-multi-source' }],
    });
    // The site (ungated, everyone sees it) + a gated editor overlay — the exact contribution shape.
    slots.contribute({ slot: 'main', key: 'site', render: () => <p>live site</p> });
    slots.contribute({
        slot: 'windowEdit',
        key: 'editBar',
        node: <span>edit tools</span>,
        can: 'site.edit',
    });
    const injection: MainframeInjection = { slots, mainframes, can };
    return render(
        <MainframeProvider injection={injection}>
            <MainframeOutlet mode="window" ctx={{ payload: {} }} />
        </MainframeProvider>,
    );
}

describe('window mode — public view falls out of entitlement (ticket 05)', () => {
    it('editor (entitled) sees the same site plus the floating edit overlay', () => {
        renderWindow((cap) => cap === 'site.edit'); // an editor
        expect(screen.getByTestId('site').textContent).toBe('live site');
        expect(screen.getAllByTestId('edit-overlay')).toHaveLength(1);
        expect(screen.getByText('edit tools')).toBeTruthy();
    });

    it('visitor (unentitled) sees the SAME tree gated down to the bare site — no overlays', () => {
        renderWindow(() => false); // a visitor: no site.edit
        // Same Mainframe, same `main` — the site still renders...
        expect(screen.getByTestId('site').textContent).toBe('live site');
        // ...but the gated overlay resolved to empty: pure site, not a separate render path.
        expect(screen.queryByTestId('edit-overlay')).toBeNull();
        expect(screen.queryByText('edit tools')).toBeNull();
    });
});

// --- Focus-mode: the focus placement — recedes the desk slots, no visitor fall-out (ticket 07) -----

/**
 * A stripped `focus`-shaped Mainframe: it frames `main` (the focused task) full-bleed and places
 * one custom `focusExit` slot for its receding mode chrome — the shape splicewire-app's real
 * `FocusMainframe` uses. Deliberately does NOT place the desk slots (rail/topBar/etc.): they
 * resolve but this mode ignores them (the known-but-unplaced silent no-op). Unlike `window`, its
 * chrome is *ungated* — focus is never a public view.
 */
const FocusLike: Mainframe = ({ slots, ctx }) => (
    <div data-testid="focus">
        <div data-testid="task">{slots.main(ctx.payload)}</div>
        {slots.items('focusExit').map((node, i) => (
            <div key={i} data-testid="exit-chrome">
                {node}
            </div>
        ))}
    </div>
);

function renderFocus(can: (cap: string) => boolean) {
    const slots = createSlotRegistry();
    const mainframes = createMainframeRegistry();
    mainframes.register('focus', FocusLike, {
        slots: [{ name: 'focusExit', fillType: 'ordered-multi-source' }],
    });
    // The task surface in `main` + an ungated exit pill in the custom slot. A desk-only contribution
    // (`rail`) is also present, to prove focus recedes it rather than placing it.
    slots.contribute({ slot: 'main', key: 'task', render: () => <p>focused editor</p> });
    slots.contribute({ slot: 'focusExit', key: 'exit', node: <span>exit focus</span> });
    slots.contribute({ slot: 'rail', key: 'nav', node: <span>rail nav</span> });
    const injection: MainframeInjection = { slots, mainframes, can };
    return render(
        <MainframeProvider injection={injection}>
            <MainframeOutlet mode="focus" ctx={{ payload: {} }} />
        </MainframeProvider>,
    );
}

describe('focus mode — focus one task, no visitor fall-out (ticket 07)', () => {
    it('frames the task full-bleed, places its exit chrome, and recedes the desk rail', () => {
        renderFocus((cap) => cap === 'site.edit'); // an entitled operator
        expect(screen.getByTestId('task').textContent).toBe('focused editor');
        expect(screen.getAllByTestId('exit-chrome')).toHaveLength(1);
        expect(screen.getByText('exit focus')).toBeTruthy();
        // The rail contribution exists but this mode never places it → receded, not dropped.
        expect(screen.queryByText('rail nav')).toBeNull();
    });

    it('keeps its exit chrome regardless of entitlement — unlike window, no gate to fall through', () => {
        renderFocus(() => false); // strip every capability
        // focus is admin-only, never a public view: the ungated exit pill still renders.
        expect(screen.getByTestId('task').textContent).toBe('focused editor');
        expect(screen.getByText('exit focus')).toBeTruthy();
    });
});
