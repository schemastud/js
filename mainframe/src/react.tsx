/**
 * The React seam: the host-delegation machinery.
 *
 * The doctrine (ADR-0099): the **host** (app-specific — splicewire-app's `AppShell`) is the stable
 * root — it owns providers, router, `can`, **mode state, and the slot collection**. It wraps the tree
 * in `<MainframeProvider>` and drops a `<MainframeOutlet mode={mode} />` where the shell renders. The
 * outlet **selects a Mainframe by mode** and hands it the resolved slots. Switching mode re-renders
 * the outlet and swaps *only its child Mainframe* — a **child-swap under a stable host**: no provider
 * remount, so state above the outlet is preserved (the smooth live-edit toggle). The host must NOT
 * *become* a Mainframe — that would remount the tree on every mode change.
 */
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useSyncExternalStore,
    type ReactNode,
} from 'react';

import type { SlotContributionInput, SlotRegistry } from './slot-registry';
import type { MainframeRegistry, MainframeContext } from './mainframe-registry';
import { resolveSlots, type MainframeCan, type ResolvedSlots } from './resolve';
import { devWarn } from './dev';

/** The bundle the host injects — mirrors Frame's `FrameInjection` (one context, memoized). */
export interface MainframeInjection {
    /** The populated slot registry (features have contributed into it). */
    slots: SlotRegistry;
    /** The registry of mode → Mainframe. */
    mainframes: MainframeRegistry;
    /** The host's entitlement predicate. Absent → contributions declaring a `can` are dropped. */
    can?: MainframeCan;
}

const MainframeCtx = createContext<MainframeInjection | null>(null);

/**
 * The provider. The host builds the two registries (typically in a `useMemo`, populating the slot
 * registry the way Frame's `registerHostWidgets` populates its widget registry) and passes them here
 * once. A fresh registry pair per provider scope keeps SSR request-isolated.
 */
export function MainframeProvider({
    injection,
    children,
}: {
    injection: MainframeInjection;
    children: ReactNode;
}) {
    return <MainframeCtx.Provider value={injection}>{children}</MainframeCtx.Provider>;
}

/** Read the injected bundle. Throws only if used outside a provider (a wiring bug, not a runtime one). */
export function useMainframe(): MainframeInjection {
    const injection = useContext(MainframeCtx);
    if (!injection) {
        throw new Error('useMainframe must be used within a <MainframeProvider>.');
    }
    return injection;
}

/** Convenience accessor for the slot registry (features call `useSlotRegistry().contribute(...)`). */
export function useSlotRegistry(): SlotRegistry {
    return useMainframe().slots;
}

/**
 * Resolve the current mode's slots, re-resolving when the registry changes (a deep-tree `useSlot`
 * contributing after paint). `useSyncExternalStore` subscribes to the registry's version; the actual
 * resolve is recomputed whenever version, mode, or `can` changes.
 */
export function useResolvedSlots(mode: string): ResolvedSlots {
    const { slots, mainframes, can } = useMainframe();
    const version = useSyncExternalStore(
        useCallback((cb) => slots.subscribe(cb), [slots]),
        () => slots.version(),
        () => slots.version(),
    );
    return useMemo(
        () =>
            resolveSlots({
                contributions: slots.contributions(),
                registrations: mainframes.all(),
                can,
            }),
        // `version` is the change signal for the mutable contributions/registrations; mode does not
        // change *which* contributions exist, but different modes place different slots, so re-running
        // is harmless and keeps the memo honest if `can` is mode-derived upstream.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [slots, mainframes, can, version, mode],
    );
}

/**
 * The delegation point. Selects the Mainframe registered for `mode`, resolves the slots, and renders
 * the Mainframe with `{ slots, ctx }`. Changing `mode` swaps the child under the stable provider.
 *
 * `ctx` extras (payload, theme, router helpers) are merged over the base `{ mode, can }`.
 */
export function MainframeOutlet({
    mode,
    ctx,
}: {
    mode: string;
    ctx?: Omit<MainframeContext, 'mode'>;
}) {
    const { mainframes, can } = useMainframe();
    const slots = useResolvedSlots(mode);
    const registration = mainframes.get(mode);

    const mainframeCtx = useMemo<MainframeContext>(
        () => ({ mode, can, ...ctx }),
        [mode, can, ctx],
    );

    if (!registration) {
        devWarn(
            `no mainframe registered for mode "${mode}" ` +
                `(registered: ${mainframes.modes().join(', ') || 'none'}) — rendering nothing.`,
        );
        return null;
    }

    const Mainframe = registration.component;
    return <Mainframe slots={slots} ctx={mainframeCtx} />;
}

/**
 * Declarative contribution from within the tree — a feature deep in the app contributes chrome to a
 * slot. Registers on mount, unregisters on unmount, re-registers when the contribution changes. The
 * outlet's `useSyncExternalStore` picks it up and re-resolves.
 *
 * Note (SSR): this contributes via effect, so it lands client-side after first paint — fine for the
 * chrome affordances it targets (which are client-interactive anyway). The **`main` render-target**
 * must stay SSR-safe and is filled imperatively at host-build, never through this hook.
 */
export function useSlot(contribution: SlotContributionInput): void {
    const { slots } = useMainframe();
    // Keep the latest contribution in a ref so we don't churn the effect on inline-object identity;
    // re-register only when the meaningful fields change (serialized below).
    const latest = useRef(contribution);
    latest.current = contribution;

    const signature = JSON.stringify({
        slot: contribution.slot,
        key: contribution.key,
        zone: contribution.zone,
        order: contribution.order,
        can: contribution.can,
    });

    useEffect(() => {
        const unregister = slots.contribute(latest.current);
        return unregister;
        // Re-register only when the structural fields change (slot/key/zone/order/can). A contribution
        // whose *node* changes but whose structure is stable keeps its first node — fine for the static
        // chrome this hook targets; a feature needing a live-updating node should bump `key`.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slots, signature]);
}
