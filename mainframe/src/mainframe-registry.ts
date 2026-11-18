/**
 * The Mainframe registry — `register(mode, Mainframe)`.
 *
 * A **Mainframe** is a registered slot-layout: a React component `({ slots, ctx }) => ReactNode` that
 * decides *where* each resolved slot renders (the mode owns placement). Out-of-the-box modes (`desk`,
 * `window`, …) register here; a site registers its own bespoke shell **by the same call** against the
 * frozen contract — that's what "any site can create their own mainframe components" means.
 */
import type { ComponentType } from 'react';
import { OnKeyDuplicate, createRegistry, type Registry, type RegistryKey } from '@schemastud/registry';

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

/**
 * One registration a later `register` of the same mode displaced: the registration that was there, who
 * registered it, and who registered the one that took its place. `null` where a registration named nobody.
 * History only: a displaced registration is never returned by `get` or `all`.
 */
export interface SupersededMainframe {
    readonly registration: MainframeRegistration;
    readonly by: string | null;
    readonly supersededBy: string | null;
}

/**
 * The Mainframe registry surface.
 *
 * Registering a mode that is already registered REPLACES it (the kernel's `Supersede` policy, declared in
 * `createMainframeRegistry`): the later registration wins, keeps the earlier one's place in `modes()` and
 * `all()`, and the displaced one is recorded. It never throws and never warns; a caller that wants to warn
 * on a re-registration reads `supersededModes(mode)` and calls `devWarn` itself.
 *
 * `modeRegistrant` and `supersededModes` are optional so a hand-written `MainframeRegistry` keeps
 * compiling; every registry `createMainframeRegistry()` returns has both.
 */
export interface MainframeRegistry {
    /**
     * Register (or replace) the mainframe for a mode. `by` names who is registering (a package name, say);
     * left out, the registrant reads back as `null`.
     */
    register(mode: string, component: Mainframe, options?: RegisterOptions, by?: string): void;
    /** The mainframe registered for a mode, or `undefined`. */
    get(mode: string): MainframeRegistration | undefined;
    /** Every registered mode name, in registration order. */
    modes(): readonly string[];
    /** Every registration, in registration order (used by the resolver to compute the known-slot universe). */
    all(): readonly MainframeRegistration[];
    /** Who registered the mainframe this mode resolves to, or `null` when nothing is registered or it named nobody. */
    modeRegistrant?(mode: string): string | null;
    /** What later registrations of this mode displaced, oldest first. Empty when it was registered at most once. */
    supersededModes?(mode: string): SupersededMainframe[];
}

/**
 * Create an isolated Mainframe registry. Like the slot registry, a fresh instance per provider scope
 * keeps SSR request-safe. OTB modes are registered into it by the host at build time.
 *
 * Each call makes its own `@schemastud/registry` registry rooted at `mainframe.modes`, which answers
 * names exactly as the `Map` it replaces did:
 *
 * - Any string is a mode name. One that is not a legal registry key (`Desk`, `a/b`, `''`) is carried as
 *   one segment under the root and never throws; `keyFor` never reads a name as absolute.
 * - A read is `has(key) ? resolve(key) : undefined`. A branch name (`os`, with `os.window` registered)
 *   is not registered and answers `undefined`; the kernel's `tryResolve` would throw for it.
 * - A read with a name that is not a string misses, as a `Map` lookup did.
 */
export function createMainframeRegistry(): MainframeRegistry {
    const registry: Registry<MainframeRegistration> = createRegistry<MainframeRegistration>({
        root: 'mainframe.modes',
        onKeyDuplicate: OnKeyDuplicate.Supersede,
        description: 'Mode name to the Mainframe (slot layout) that places its resolved slots.',
    });
    const root = registry.declaration.root;

    // A read handed something that is not a string misses, as it did in a `Map`. Null here is that miss.
    const keyOf = (mode: string): RegistryKey | null => (typeof mode === 'string' ? registry.keyFor(mode) : null);

    function register(mode: string, component: Mainframe, options?: RegisterOptions, by?: string): void {
        // A mode that is not a string is registered under its string form; the registration keeps it as given.
        registry.register(
            registry.keyFor(String(mode)),
            { mode, component, customSlots: options?.slots ?? [] },
            typeof by === 'string' ? by : null,
        );
    }

    return {
        register,
        get(mode) {
            const key = keyOf(mode);

            return key !== null && registry.has(key) ? registry.resolve(key) : undefined;
        },
        modes: () => registry.names(),
        all: () => registry.matches(root),
        modeRegistrant(mode) {
            const key = keyOf(mode);

            return key === null ? null : registry.registrantOf(key);
        },
        supersededModes(mode) {
            const key = keyOf(mode);

            return key === null
                ? []
                : registry.superseded(key).map(({ entry, by, supersededBy }) => ({ registration: entry, by, supersededBy }));
        },
    };
}
