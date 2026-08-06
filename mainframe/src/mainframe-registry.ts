/**
 * The Mainframe registry — `register(mode, Mainframe)`.
 *
 * A **Mainframe** is a registered slot-layout: a React component `({ slots, ctx }) => ReactNode` that
 * decides *where* each resolved slot renders (the mode owns placement). Out-of-the-box modes (`desk`,
 * `window`, …) register here; a site registers its own bespoke shell **by the same call** against the
 * frozen contract — that's what "any site can create their own mainframe components" means.
 */
import type { ComponentType } from 'react';

import type { FillType, SlotName } from './contract';
// Type-only (erased at build) → no runtime cycle with resolve.ts, which imports this module's types.
import type { ResolvedSlots } from './resolve';

/** Declaration of a custom slot a mainframe adds beyond the frozen core/optional set (§5). */
export interface CustomSlotSpec {
    /** The custom slot's name. */
    name: SlotName;
    /** Its fill-type — teaches the resolver how to resolve it. */
    fillType: FillType;
    /** For an ordered-multi-source custom slot, its named zones. */
    zones?: readonly string[];
}

/**
 * The context a Mainframe receives alongside its resolved slots. `mode` is the active mode; `payload`
 * is the `main` render-prop's argument (router outlet element or CMS page); the host may thread extra
 * fields (open kept deliberately — the package is host-agnostic).
 */
export interface MainframeContext {
    /** The active mode this Mainframe was selected for. */
    mode: string;
    /** The `main` slot's render payload (router `<Outlet/>`, a CMS `Page`, …). */
    payload?: unknown;
    /** Host-specific extras (theme, router helpers, …). */
    [key: string]: unknown;
}

/** Props every Mainframe component receives. Defaults `Slots` to the resolver's `ResolvedSlots`. */
export interface MainframeProps<Slots = ResolvedSlots> {
    /** The resolved, gated, sorted slots — read via `slots.node()/items()/main()`. */
    slots: Slots;
    /** The active-mode context. */
    ctx: MainframeContext;
}

/** A Mainframe is just a React component over `{ slots, ctx }`. */
export type Mainframe<Slots = ResolvedSlots> = ComponentType<MainframeProps<Slots>>;

/** Registration options for a mode. */
export interface RegisterOptions {
    /** Custom slots this mainframe places beyond the frozen set (§5). */
    slots?: readonly CustomSlotSpec[];
}

/** A stored mainframe registration. */
export interface MainframeRegistration<Slots = ResolvedSlots> {
    mode: string;
    component: Mainframe<Slots>;
    customSlots: readonly CustomSlotSpec[];
}

/** The Mainframe registry surface. */
export interface MainframeRegistry {
    /** Register (or replace) the mainframe for a mode. Re-registering a mode dev-warns is deferred to caller. */
    register(mode: string, component: Mainframe, options?: RegisterOptions): void;
    /** The mainframe registered for a mode, or `undefined`. */
    get(mode: string): MainframeRegistration | undefined;
    /** Every registered mode name. */
    modes(): readonly string[];
    /** Every registration (used by the resolver to compute the known-slot universe). */
    all(): readonly MainframeRegistration[];
}

/**
 * Create an isolated Mainframe registry. Like the slot registry, a fresh instance per provider scope
 * keeps SSR request-safe. OTB modes are registered into it by the host at build time.
 */
export function createMainframeRegistry(): MainframeRegistry {
    const byMode = new Map<string, MainframeRegistration>();

    function register(mode: string, component: Mainframe, options?: RegisterOptions): void {
        byMode.set(mode, {
            mode,
            component,
            customSlots: options?.slots ?? [],
        });
    }

    return {
        register,
        get: (mode) => byMode.get(mode),
        modes: () => [...byMode.keys()],
        all: () => [...byMode.values()],
    };
}
