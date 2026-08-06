/**
 * The resolver — the host's collection step. Turns raw slot contributions into the `ResolvedSlots`
 * a Mainframe consumes, applying the two orthogonal axes:
 *
 * - **Entitlement** (`can`): drop contributions the current user can't see. This is how the public
 *   "view" falls out — edit contributions gate to empty, leaving the bare site. Gating drops
 *   *contributions*, never *slots* (a slot with everything gated out is still placed by the mode).
 * - **Placement ordering**: within a slot, sort ordered-multi-source contributions by
 *   `(zone, order, registration-index)` — load-order-proof (§3.1).
 *
 * Plus the contract's diagnostics (§6): single-node filled twice → dev-warn + pick last; unknown
 * slot name (defined by no registered mainframe) → dev-warn; known-but-unplaced → silent (the mode
 * simply never reads it).
 */
import type { ReactNode } from 'react';

import {
    DEFAULT_ORDER,
    DEFAULT_ZONE,
    type FillType,
    type MainPayload,
    OPTIONAL_SLOTS,
    CORE_SLOTS,
    SLOT_FILL_TYPES,
    SLOT_ZONES,
    type SlotName,
} from './contract';
import { devWarn } from './dev';
import type { MainframeRegistration } from './mainframe-registry';
import type { SlotContribution } from './slot-registry';

/** The host's entitlement predicate. `true` = the capability is granted. */
export type MainframeCan = (capability: string) => boolean;

/** The read API a Mainframe uses over its resolved slots. */
export interface ResolvedSlots {
    /** single-node slot → the winning node (or `undefined` if unfilled/gated out). */
    node(slot: SlotName): ReactNode | undefined;
    /** ordered-multi-source slot → sorted nodes, optionally filtered to one zone. */
    items(slot: SlotName, zone?: string): ReactNode[];
    /** render-prop `main` slot → the winning render invoked with the payload. */
    main(payload?: MainPayload): ReactNode | undefined;
    /** True if any gated-in contribution exists for the slot. */
    has(slot: SlotName): boolean;
    /** Debug: surviving contribution keys for a slot, in resolved order. */
    keys(slot: SlotName): string[];
}

export interface ResolveParams {
    /** All raw contributions from the slot registry. */
    contributions: readonly SlotContribution[];
    /** Every registered mainframe — defines the known-slot universe + custom fill-types/zones. */
    registrations: readonly MainframeRegistration[];
    /** The host's entitlement predicate. Absent → contributions that declare a `can` are dropped. */
    can?: MainframeCan;
}

/** Build the fill-type + zone maps from the frozen contract plus every mainframe's custom slots. */
function buildSlotMeta(registrations: readonly ResolveParams['registrations'][number][]) {
    const fillTypes = new Map<string, FillType>(Object.entries(SLOT_FILL_TYPES));
    const zones = new Map<string, readonly string[]>(Object.entries(SLOT_ZONES));
    for (const reg of registrations) {
        for (const spec of reg.customSlots) {
            fillTypes.set(spec.name, spec.fillType);
            if (spec.zones) zones.set(spec.name, spec.zones);
        }
    }
    return { fillTypes, zones };
}

/** Is a contribution granted for the current user? Closed-by-default when it declares a requirement. */
function isEntitled(contribution: SlotContribution, can?: MainframeCan): boolean {
    if (contribution.can == null) return true;
    const caps = Array.isArray(contribution.can) ? contribution.can : [contribution.can];
    if (caps.length === 0) return true;
    // Declares a requirement but the host wired no predicate → treat as not entitled (closed by
    // default, mirroring the app's `entitled`/`can`). Prevents chrome leaking past its gate.
    if (!can) return false;
    return caps.some((cap) => can(cap));
}

/**
 * Resolve the raw contributions into a `ResolvedSlots`. Pure over its inputs; the host memoizes the
 * result on `(mode, contributions, can)`.
 */
export function resolveSlots({ contributions, registrations, can }: ResolveParams): ResolvedSlots {
    const { fillTypes, zones } = buildSlotMeta(registrations);

    // The known-slot universe (§6): core ∪ optional ∪ every mainframe's custom slots.
    const known = new Set<string>([...CORE_SLOTS, ...OPTIONAL_SLOTS, ...fillTypes.keys()]);

    // Group entitled contributions by slot; warn once per unknown slot name.
    const bySlot = new Map<string, SlotContribution[]>();
    const warnedUnknown = new Set<string>();
    for (const c of contributions) {
        if (!known.has(c.slot)) {
            if (!warnedUnknown.has(c.slot)) {
                warnedUnknown.add(c.slot);
                devWarn(
                    `contribution "${c.key}" targets unknown slot "${c.slot}" (defined by no ` +
                        `registered mainframe) — ignored. Typo, or a missing custom-slot declaration?`,
                );
            }
            continue;
        }
        if (!isEntitled(c, can)) continue;
        const list = bySlot.get(c.slot) ?? [];
        list.push(c);
        bySlot.set(c.slot, list);
    }

    /** Sort key for an ordered slot's contribution: (zoneIndex, order, registrationIndex). */
    function zoneIndex(slot: string, zone: string | undefined): number {
        const declared = zones.get(slot);
        if (!declared) return 0;
        const at = declared.indexOf(zone ?? declared[0] ?? DEFAULT_ZONE);
        // Undeclared zone → after all declared ones (kept deterministic by the later tiebreaks).
        return at === -1 ? declared.length : at;
    }

    function sortedOrdered(slot: SlotName): SlotContribution[] {
        const list = bySlot.get(slot) ?? [];
        return [...list].sort((a, b) => {
            const zi = zoneIndex(slot, a.zone) - zoneIndex(slot, b.zone);
            if (zi !== 0) return zi;
            const oi = (a.order ?? DEFAULT_ORDER) - (b.order ?? DEFAULT_ORDER);
            if (oi !== 0) return oi;
            return a.registrationIndex - b.registrationIndex;
        });
    }

    /** The single winner for a single-node / render-prop slot: last registered wins, warn if >1. */
    function winner(slot: SlotName): SlotContribution | undefined {
        const list = bySlot.get(slot) ?? [];
        if (list.length === 0) return undefined;
        if (list.length > 1) {
            devWarn(
                `single-node slot "${slot}" filled ${list.length} times ` +
                    `(${list.map((c) => c.key).join(', ')}) — last writer wins.`,
            );
        }
        return list.reduce((a, b) => (b.registrationIndex > a.registrationIndex ? b : a));
    }

    return {
        node(slot) {
            if (fillTypes.get(slot) === 'ordered-multi-source') {
                devWarn(`node("${slot}") called on an ordered slot — use items("${slot}").`);
            }
            return winner(slot)?.node;
        },
        items(slot, zone) {
            const sorted = sortedOrdered(slot);
            const filtered =
                zone == null ? sorted : sorted.filter((c) => (c.zone ?? DEFAULT_ZONE) === zone);
            return filtered.map((c) => c.node);
        },
        main(payload) {
            return winner('main')?.render?.(payload);
        },
        has(slot) {
            return (bySlot.get(slot)?.length ?? 0) > 0;
        },
        keys(slot) {
            const type = fillTypes.get(slot);
            const list =
                type === 'ordered-multi-source' ? sortedOrdered(slot) : (bySlot.get(slot) ?? []);
            return list.map((c) => c.key);
        },
    };
}
