// =============================================================================
// @schemastud/nav — a host-agnostic docs/site navigation kit.
//
// The nav-source registry (compose-many) + a pure tree builder, a collapsible
// <ExpandableNav> whose links/classNames/motion are all injected, and navTrail() —
// the breadcrumb-trail derivation off the same tree. Ships no CSS and no router.
// =============================================================================

// Nav-source registry seam + the shared tree builder + breadcrumb-trail derivation.
export {
    registerNavSource,
    getNavSources,
    clearNavSources,
    resolveNavNodes,
    buildNavTree,
    navTrail,
} from './registry';
export type {
    NavNode,
    NavSource,
    NavGroup,
    NavTrack,
    NavTrail,
    NavCrumbSibling,
} from './registry';

// Collapsible, accessible sidebar over the seam.
export { ExpandableNav } from './ExpandableNav';
export type { ExpandableNavProps, ExpandableNavClasses } from './ExpandableNav';

// In-page table of contents with scroll-spy.
export { OnThisPage } from './OnThisPage';
export type { OnThisPageProps, OnThisPageClasses } from './OnThisPage';
