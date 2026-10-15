export { C as CORE_SLOTS, a as CoreSlotName, b as CustomSlotSpec, D as DEFAULT_ORDER, c as DEFAULT_ZONE, F as FillType, M as MainPayload, d as MainRender, e as Mainframe, f as MainframeCan, g as MainframeContext, h as MainframeInjection, i as MainframeOutlet, j as MainframeProps, k as MainframeProvider, l as MainframeRegistration, m as MainframeRegistry, O as OPTIONAL_SLOTS, n as OptionalSlotName, R as RegisterOptions, o as ResolveParams, p as ResolvedSlots, S as SLOT_FILL_TYPES, q as SLOT_ZONES, r as SlotContribution, s as SlotContributionInput, t as SlotName, u as SlotRegistry, v as createMainframeRegistry, w as createSlotRegistry, x as resolveSlots, y as useMainframe, z as useResolvedSlots, A as useSlot, B as useSlotRegistry } from './react-CTy_VUZ4.js';
import 'react';

/**
 * Dev-only diagnostics. The contract's rule (§6) is **warn, never throw**: throwing would couple
 * the registry to the load order of every mainframe's slot set. In production these are silent.
 */
/** True in a non-production build. Guards every warning so prod stays quiet. */
declare const isDev: boolean;
/** Dev-mode `console.warn`, prefixed. No-op in production. Never throws. */
declare function devWarn(message: string): void;

export { devWarn, isDev };
