// =============================================================================
// @schemastud/frame/shadcn — the batteries-included shadcn theming preset.
//
// Opt-in subpath: frame's core (`@schemastud/frame`) ships plain-HTML, theme-
// agnostic defaults; this entry point layers shadcn-convention slots + widgets for
// the (all-shadcn) ecosystem, so a host is native from its CSS tokens alone. Mirror
// of the `@rjsf/core` vs `@rjsf/shadcn` split. Core imports none of this.
// =============================================================================

export {
    shadcnListSlots,
    ShadcnTable,
    ShadcnCell,
    ShadcnEmpty,
    ShadcnToolbar,
    ShadcnPagination,
} from './list-slots';
export { shadcnEditSlots, ShadcnToggle, ShadcnSaveBar } from './edit-slots';
export { ShadcnEnrichTextarea } from './enrich-textarea';
