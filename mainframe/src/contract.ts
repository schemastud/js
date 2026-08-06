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
import type { ReactNode } from 'react';

/**
 * The render-prop payload handed to the `main` slot — a CMS `Page` (with its Regions) in `window`
 * mode, or the router `<Outlet/>` element in `desk` mode. The mode frames the *result*; it does not
 * own the *content*. Kept `unknown` here: the package is host-agnostic and the host supplies the
 * concrete payload shape at the call site.
 */
export type MainPayload = unknown;

/** A render-prop fill: given the page/route payload, produce the node the mode frames. */
export type MainRender = (payload: MainPayload) => ReactNode;

/**
 * The three fill-types — a closed set (§3 of the frozen contract).
 * - `single-node`: one node; filled twice is a dev-warned conflict, the resolver picks one.
 * - `ordered-multi-source`: many contributions, sorted by `(zone, order, registration-index)`.
 * - `render-prop`: `(payload) => ReactNode`.
 */
export type FillType = 'single-node' | 'ordered-multi-source' | 'render-prop';

/** Core slots — every mainframe MUST place these; a guaranteed contribution surface. */
export type CoreSlotName =
    | 'brand'
    | 'rail'
    | 'topBar.lead'
    | 'topBar.actions'
    | 'main'
    | 'overlay';

/** Optional slots — a mode MAY drop these entirely. */
export type OptionalSlotName = 'railFooter' | 'command' | 'status' | 'footer';

/**
 * Any slot name. Custom mainframes add their own; the `(string & {})` arm keeps custom names
 * assignable while preserving editor autocomplete for the known ones.
 */
export type SlotName = CoreSlotName | OptionalSlotName | (string & {});

/**
 * The fill-type of every contract slot. The resolver consults this to know how to resolve a slot;
 * custom slots extend it via their mainframe's `slots` declaration (see mainframe-registry.ts).
 * This map IS the frozen fill-type assignment (§4) — reordering fill-types here is a contract break.
 */
export const SLOT_FILL_TYPES = {
    // Core
    brand: 'single-node',
    rail: 'single-node',
    'topBar.lead': 'single-node',
    'topBar.actions': 'ordered-multi-source',
    main: 'render-prop',
    overlay: 'ordered-multi-source',
    // Optional
    railFooter: 'single-node',
    command: 'single-node',
    status: 'ordered-multi-source',
    footer: 'single-node',
} as const satisfies Record<CoreSlotName | OptionalSlotName, FillType>;

/** The core set — the frozen baseline a feature author can target and trust exists everywhere. */
export const CORE_SLOTS: readonly CoreSlotName[] = [
    'brand',
    'rail',
    'topBar.lead',
    'topBar.actions',
    'main',
    'overlay',
];

/** The optional set — a mode may place or drop each. */
export const OPTIONAL_SLOTS: readonly OptionalSlotName[] = [
    'railFooter',
    'command',
    'status',
    'footer',
];

/**
 * The named zones for each ordered-multi-source slot (§3.1). A contribution names a zone and a
 * numeric `order`; the resolver sorts by `(zone, order, registration-index)` — deterministic
 * regardless of code-split module load order. The core zones here are frozen; custom mainframes may
 * define extra zones on their *extra* slots.
 */
export const SLOT_ZONES = {
    'topBar.actions': ['start', 'end'],
    overlay: ['corner', 'edge', 'center'],
    status: ['start', 'end'],
} as const satisfies Partial<Record<CoreSlotName | OptionalSlotName, readonly string[]>>;

/** Default `order` for an ordered contribution that omits one (§3.1). */
export const DEFAULT_ORDER = 50;

/** Default zone (first declared zone) for an ordered slot when a contribution omits one. */
export const DEFAULT_ZONE = 'start';
