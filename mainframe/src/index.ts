/**
 * @schemastud/mainframe — the generic Mainframe engine (React-only, host-agnostic).
 *
 * Relocated here from `@splicewire/beam-mainframe` (Frame OS ADR-0011, ticket 01): the slot contract
 * and its frozen tables, the SSR-safe named-slot registry, the mode registry, the `can`-gated
 * resolver, and the React delegation seam. This package knows **nothing** about Inertia, beam, or any
 * CMS-authoring layer — those (`createMainframeHost`, the `domain`/`window` modes, `useBeamUxEntry`,
 * `isPuckBody`) stay in `@splicewire/beam-mainframe`, which re-exports these primitives so downstream
 * import sites keep resolving unchanged.
 *
 * It also declares `react-rnd` as a dependency so the Frame OS window-frame work (ticket 03) has its
 * geometry atom in place — the reducer and registry never import it (guarded), only the window frame.
 */

// The frozen slot contract (types + tables).
export {
    CORE_SLOTS,
    OPTIONAL_SLOTS,
    SLOT_FILL_TYPES,
    SLOT_ZONES,
    DEFAULT_ORDER,
    DEFAULT_ZONE,
    type CoreSlotName,
    type OptionalSlotName,
    type SlotName,
    type FillType,
    type MainPayload,
    type MainRender,
} from './contract';

// The named-slot registry (the socket — compose-many-by-name; SSR-safe per scope).
export {
    createSlotRegistry,
    type SlotRegistry,
    type SlotContribution,
    type SlotContributionInput,
} from './slot-registry';

// The Mainframe registry (register a mode-layout by name).
export {
    createMainframeRegistry,
    type MainframeRegistry,
    type MainframeRegistration,
    type Mainframe,
    type MainframeProps,
    type MainframeContext,
    type CustomSlotSpec,
    type RegisterOptions,
} from './mainframe-registry';

// The resolver (gate by `can`, sort ordered, single-node winner, unknown-slot dev-warn).
export { resolveSlots, type ResolvedSlots, type MainframeCan, type ResolveParams } from './resolve';

// The React seam (host delegation): provider, hooks, the delegation outlet, declarative contribution.
export {
    MainframeProvider,
    MainframeOutlet,
    useMainframe,
    useSlotRegistry,
    useResolvedSlots,
    useSlot,
    type MainframeInjection,
} from './react';

// Dev diagnostics (warn-never-throw; silent in production).
export { devWarn, isDev } from './dev';
