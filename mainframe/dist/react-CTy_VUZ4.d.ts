import * as react from 'react';
import { ReactNode, ComponentType } from 'react';

/**
 * The Mainframe Slot Contract — the frozen seam every mode honors.
 *
 * This is to **Mainframe** what JSON Schema is to **Frame** (ticket 01, ADR-0099). A slot is a
 * named fill-point defined by a name, a fill-type, and its contributors — and *nothing about where
 * it renders*. The **mode owns placement**; entitlement (`can`) is a separate axis that gates *which
 * contributions render*, never *which slots exist* (see resolve.ts).
 *
 * Changing the core set or a core slot's fill-type is a **contract break**. Adding an *optional* or
 * a *custom* slot is not (§5 of the frozen contract).
 */

/**
 * The render-prop payload handed to the `main` slot — a CMS `Page` (with its Regions) in `window`
 * mode, or the router `<Outlet/>` element in `desk` mode. The mode frames the *result*; it does not
 * own the *content*. Kept `unknown` here: the package is host-agnostic and the host supplies the
 * concrete payload shape at the call site.
 */
type MainPayload = unknown;
/** A render-prop fill: given the page/route payload, produce the node the mode frames. */
type MainRender = (payload: MainPayload) => ReactNode;
/**
 * The three fill-types — a closed set (§3 of the frozen contract).
 * - `single-node`: one node; filled twice is a dev-warned conflict, the resolver picks one.
 * - `ordered-multi-source`: many contributions, sorted by `(zone, order, registration-index)`.
 * - `render-prop`: `(payload) => ReactNode`.
 */
type FillType = 'single-node' | 'ordered-multi-source' | 'render-prop';
/** Core slots — every mainframe MUST place these; a guaranteed contribution surface. */
type CoreSlotName = 'brand' | 'rail' | 'topBar.lead' | 'topBar.actions' | 'main' | 'overlay';
/** Optional slots — a mode MAY drop these entirely. */
type OptionalSlotName = 'railFooter' | 'command' | 'status' | 'footer';
/**
 * Any slot name. Custom mainframes add their own; the `(string & {})` arm keeps custom names
 * assignable while preserving editor autocomplete for the known ones.
 */
type SlotName = CoreSlotName | OptionalSlotName | (string & {});
/**
 * The fill-type of every contract slot. The resolver consults this to know how to resolve a slot;
 * custom slots extend it via their mainframe's `slots` declaration (see mainframe-registry.ts).
 * This map IS the frozen fill-type assignment (§4) — reordering fill-types here is a contract break.
 */
declare const SLOT_FILL_TYPES: {
    readonly brand: "single-node";
    readonly rail: "single-node";
    readonly 'topBar.lead': "single-node";
    readonly 'topBar.actions': "ordered-multi-source";
    readonly main: "render-prop";
    readonly overlay: "ordered-multi-source";
    readonly railFooter: "single-node";
    readonly command: "single-node";
    readonly status: "ordered-multi-source";
    readonly footer: "single-node";
};
/** The core set — the frozen baseline a feature author can target and trust exists everywhere. */
declare const CORE_SLOTS: readonly CoreSlotName[];
/** The optional set — a mode may place or drop each. */
declare const OPTIONAL_SLOTS: readonly OptionalSlotName[];
/**
 * The named zones for each ordered-multi-source slot (§3.1). A contribution names a zone and a
 * numeric `order`; the resolver sorts by `(zone, order, registration-index)` — deterministic
 * regardless of code-split module load order. The core zones here are frozen; custom mainframes may
 * define extra zones on their *extra* slots.
 */
declare const SLOT_ZONES: {
    readonly 'topBar.actions': readonly ["start", "end"];
    readonly overlay: readonly ["corner", "edge", "center"];
    readonly status: readonly ["start", "end"];
};
/** Default `order` for an ordered contribution that omits one (§3.1). */
declare const DEFAULT_ORDER = 50;
/** Default zone (first declared zone) for an ordered slot when a contribution omits one. */
declare const DEFAULT_ZONE = "start";

/**
 * The named-slot registry — where features contribute chrome, and the host collects it.
 *
 * Mirrors schemastud Frame's `WidgetRegistry` idiom (ticket 03): a **fresh instance per provider
 * scope** via a factory (never a module singleton), so there is no shared mutable state across
 * SSR requests. Contributions are collected in registration order; the resolver (resolve.ts) applies
 * the `(zone, order, registration-index)` sort, so the registry itself stays a dumb, append-only bag.
 */

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
interface SlotContributionInput {
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
interface SlotContribution extends SlotContributionInput {
    /** Monotonic registration order — the final, load-order-proof sort tiebreak (§3.1). */
    registrationIndex: number;
}
/** The registry surface the host and features share. */
interface SlotRegistry {
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
declare function createSlotRegistry(): SlotRegistry;

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

/** The host's entitlement predicate. `true` = the capability is granted. */
type MainframeCan = (capability: string) => boolean;
/** The read API a Mainframe uses over its resolved slots. */
interface ResolvedSlots {
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
interface ResolveParams {
    /** All raw contributions from the slot registry. */
    contributions: readonly SlotContribution[];
    /** Every registered mainframe — defines the known-slot universe + custom fill-types/zones. */
    registrations: readonly MainframeRegistration[];
    /** The host's entitlement predicate. Absent → contributions that declare a `can` are dropped. */
    can?: MainframeCan;
}
/**
 * Resolve the raw contributions into a `ResolvedSlots`. Pure over its inputs; the host memoizes the
 * result on `(mode, contributions, can)`.
 */
declare function resolveSlots({ contributions, registrations, can }: ResolveParams): ResolvedSlots;

/**
 * The Mainframe registry — `register(mode, Mainframe)`.
 *
 * A **Mainframe** is a registered slot-layout: a React component `({ slots, ctx }) => ReactNode` that
 * decides *where* each resolved slot renders (the mode owns placement). Out-of-the-box modes (`desk`,
 * `window`, …) register here; a site registers its own bespoke shell **by the same call** against the
 * frozen contract — that's what "any site can create their own mainframe components" means.
 */

/** Declaration of a custom slot a mainframe adds beyond the frozen core/optional set (§5). */
interface CustomSlotSpec {
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
interface MainframeContext {
    /** The active mode this Mainframe was selected for. */
    mode: string;
    /** The `main` slot's render payload (router `<Outlet/>`, a CMS `Page`, …). */
    payload?: unknown;
    /** Host-specific extras (theme, router helpers, …). */
    [key: string]: unknown;
}
/** Props every Mainframe component receives. Defaults `Slots` to the resolver's `ResolvedSlots`. */
interface MainframeProps<Slots = ResolvedSlots> {
    /** The resolved, gated, sorted slots — read via `slots.node()/items()/main()`. */
    slots: Slots;
    /** The active-mode context. */
    ctx: MainframeContext;
}
/** A Mainframe is just a React component over `{ slots, ctx }`. */
type Mainframe<Slots = ResolvedSlots> = ComponentType<MainframeProps<Slots>>;
/** Registration options for a mode. */
interface RegisterOptions {
    /** Custom slots this mainframe places beyond the frozen set (§5). */
    slots?: readonly CustomSlotSpec[];
}
/** A stored mainframe registration. */
interface MainframeRegistration<Slots = ResolvedSlots> {
    mode: string;
    component: Mainframe<Slots>;
    customSlots: readonly CustomSlotSpec[];
}
/** The Mainframe registry surface. */
interface MainframeRegistry {
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
declare function createMainframeRegistry(): MainframeRegistry;

/** The bundle the host injects — mirrors Frame's `FrameInjection` (one context, memoized). */
interface MainframeInjection {
    /** The populated slot registry (features have contributed into it). */
    slots: SlotRegistry;
    /** The registry of mode → Mainframe. */
    mainframes: MainframeRegistry;
    /** The host's entitlement predicate. Absent → contributions declaring a `can` are dropped. */
    can?: MainframeCan;
}
/**
 * The provider. The host builds the two registries (typically in a `useMemo`, populating the slot
 * registry the way Frame's `registerHostWidgets` populates its widget registry) and passes them here
 * once. A fresh registry pair per provider scope keeps SSR request-isolated.
 */
declare function MainframeProvider({ injection, children, }: {
    injection: MainframeInjection;
    children: ReactNode;
}): react.JSX.Element;
/** Read the injected bundle. Throws only if used outside a provider (a wiring bug, not a runtime one). */
declare function useMainframe(): MainframeInjection;
/** Convenience accessor for the slot registry (features call `useSlotRegistry().contribute(...)`). */
declare function useSlotRegistry(): SlotRegistry;
/**
 * Resolve the current mode's slots, re-resolving when the registry changes (a deep-tree `useSlot`
 * contributing after paint). `useSyncExternalStore` subscribes to the registry's version; the actual
 * resolve is recomputed whenever version, mode, or `can` changes.
 */
declare function useResolvedSlots(mode: string): ResolvedSlots;
/**
 * The delegation point. Selects the Mainframe registered for `mode`, resolves the slots, and renders
 * the Mainframe with `{ slots, ctx }`. Changing `mode` swaps the child under the stable provider.
 *
 * `ctx` extras (payload, theme, router helpers) are merged over the base `{ mode, can }`.
 */
declare function MainframeOutlet({ mode, ctx, }: {
    mode: string;
    ctx?: Omit<MainframeContext, 'mode'>;
}): react.JSX.Element | null;
/**
 * Declarative contribution from within the tree — a feature deep in the app contributes chrome to a
 * slot. Registers on mount, unregisters on unmount, re-registers when the contribution changes. The
 * outlet's `useSyncExternalStore` picks it up and re-resolves.
 *
 * Note (SSR): this contributes via effect, so it lands client-side after first paint — fine for the
 * chrome affordances it targets (which are client-interactive anyway). The **`main` render-target**
 * must stay SSR-safe and is filled imperatively at host-build, never through this hook.
 */
declare function useSlot(contribution: SlotContributionInput): void;

export { useSlot as A, useSlotRegistry as B, CORE_SLOTS as C, DEFAULT_ORDER as D, type FillType as F, type MainPayload as M, OPTIONAL_SLOTS as O, type RegisterOptions as R, SLOT_FILL_TYPES as S, type CoreSlotName as a, type CustomSlotSpec as b, DEFAULT_ZONE as c, type MainRender as d, type Mainframe as e, type MainframeCan as f, type MainframeContext as g, type MainframeInjection as h, MainframeOutlet as i, type MainframeProps as j, MainframeProvider as k, type MainframeRegistration as l, type MainframeRegistry as m, type OptionalSlotName as n, type ResolveParams as o, type ResolvedSlots as p, SLOT_ZONES as q, type SlotContribution as r, type SlotContributionInput as s, type SlotName as t, type SlotRegistry as u, createMainframeRegistry as v, createSlotRegistry as w, resolveSlots as x, useMainframe as y, useResolvedSlots as z };
