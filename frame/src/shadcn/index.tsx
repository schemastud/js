// =============================================================================
// @schemastud/frame/shadcn — the batteries-included shadcn theming preset.
//
// Opt-in subpath: frame's core (`@schemastud/frame`) ships plain-HTML, theme-
// agnostic defaults; this entry point layers shadcn-convention slots + widgets for
// the (all-shadcn) ecosystem, so a host is native from its CSS tokens alone. Mirror
// of the `@rjsf/core` vs `@rjsf/shadcn` split. Core imports none of this.
// =============================================================================

// The two slot sets and the enrich textarea (ruling 02 §8). The single slot components stay inside their sets: a host
// that replaces one slot merges its own over the set.
export { shadcnListSlots } from './list-slots';
export { shadcnEditSlots } from './edit-slots';
export { ShadcnEnrichTextarea } from './enrich-textarea';
