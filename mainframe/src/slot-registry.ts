/**
 * The named-slot registry — where features contribute chrome, and the host collects it.
 *
 * Mirrors schemastud Frame's `WidgetRegistry` idiom (ticket 03): a **fresh instance per provider
 * scope** via a factory (never a module singleton), so there is no shared mutable state across
 * SSR requests. Contributions are collected in registration order; the resolver (resolve.ts) applies
 * the `(zone, order, registration-index)` sort, so the registry itself stays a dumb, append-only bag.
 */
import type { ReactNode } from 'react';

import type { MainRender, SlotName } from './contract';

/**
 * One contribution to a slot. The shape a contributor supplies (`registrationIndex` is assigned by
 * the registry, not the caller):
 * - single-node slots read `node`;
 * - ordered-multi-source slots read `node` + `zone` + `order`;
 * - render-prop slots (`main`) read `render`.
 *
 * `can` is the **entitlement axis** (orthogonal to placement): a capability key (or keys, OR-matched)
 * the host's `can` predicate must satisfy for this contribution to render. Absent = always renders.
 */
export interface SlotContributionInput {
    /** The slot this fills. */
    slot: SlotName;
    /** Stable id for dedup + debugging (e.g. the feature name). */
    key: string;
    /** single-node / ordered-multi-source fill. */
    node?: ReactNode;
    /** render-prop fill (the `main` slot). */
    render?: MainRender;
    /** ordered-multi-source: which named zone (§3.1). Defaults per contract. */
    zone?: string;
    /** ordered-multi-source: numeric sort key within the zone. Defaults to 50. */
    order?: number;
    /** Entitlement requirement — capability key(s) the host's `can` must satisfy. OR-matched. */
    can?: string | string[];
}

/** A stored contribution: the input plus the registry-assigned stable tiebreak index. */
export interface SlotContribution extends SlotContributionInput {
    /** Monotonic registration order — the final, load-order-proof sort tiebreak (§3.1). */
    registrationIndex: number;
}

/** The registry surface the host and features share. */
export interface SlotRegistry {
    /**
     * Contribute to a slot. Returns an `unregister` fn (used by the `useSlot` hook's cleanup).
     * Later registrations get a higher `registrationIndex`; the resolver uses it as the stable
     * tiebreak and, for single-node conflicts, as "last writer" (dev-warned).
     */
    contribute(input: SlotContributionInput): () => void;
    /** All contributions, in registration order. The resolver sorts; this stays raw. */
    contributions(): readonly SlotContribution[];
    /**
     * Subscribe to registry changes (a contribute or unregister). Returns an unsubscribe fn. Lets
     * the outlet re-resolve when a deep-tree `useSlot` contributes after first paint — the
     * `useSyncExternalStore` seam.
     */
    subscribe(listener: () => void): () => void;
    /**
     * A monotonic version, bumped on every change. The `getSnapshot` for `useSyncExternalStore`:
     * a stable primitive (never a fresh array), so it won't tear or loop.
     */
    version(): number;
}

/**
 * Create an isolated slot registry. One per `MainframeProvider` scope — the SSR-safety property.
 * Populate it imperatively at host-build time (mirroring Frame's `registerHostWidgets`) and/or via
 * the `useSlot` hook from within the tree.
 */
export function createSlotRegistry(): SlotRegistry {
    const entries: SlotContribution[] = [];
    const listeners = new Set<() => void>();
    let nextIndex = 0;
    let ver = 0;

    function notify(): void {
        ver++;
        for (const l of listeners) l();
    }

    function contribute(input: SlotContributionInput): () => void {
        const entry: SlotContribution = { ...input, registrationIndex: nextIndex++ };
        entries.push(entry);
        notify();
        return () => {
            const at = entries.indexOf(entry);
            if (at !== -1) {
                entries.splice(at, 1);
                notify();
            }
        };
    }

    return {
        contribute,
        contributions: () => entries,
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        version: () => ver,
    };
}
