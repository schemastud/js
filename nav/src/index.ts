// =============================================================================
// @schemastud/nav — a host-agnostic suite of navigation primitives for content sites.
//
// A DELIBERATE umbrella (not a catch-all): the members share a model + house style (no
// CSS, no router; everything injected) and the package is meant to grow more nav
// primitives — a prev/next pager, a top nav, tabs — rather than fragment into a package
// each. Components stay specifically named (ExpandableNav, OnThisPage) so the umbrella
// never hides what you import. Standalone atoms with their own home (breadcrumb rendering,
// combobox) are COMPOSED, never re-implemented here.
//
// Today: the nav-source registry (compose-many) + a pure tree builder, a collapsible
// <ExpandableNav>, navTrail() (breadcrumb-trail derivation off the same tree), and
// <OnThisPage> (in-page TOC + scroll-spy).
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
