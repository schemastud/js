import * as react from 'react';
import { ReactNode } from 'react';

/**
 * The atom a source emits: a leaf link or a group node. `parent` is the INPUT nesting
 * hint (a sibling's leaf slug, from a `navParent`-style frontmatter model); `children`
 * is the OUTPUT the tree builder populates — a source emits flat nodes.
 */
type NavNode = {
    title: string;
    href?: string;
    group?: string;
    track?: string;
    parent?: string;
    children?: NavNode[];
    order?: number;
    groupOrder?: number;
};
/** A named, lazily-loaded contributor of nav nodes. */
type NavSource = {
    id: string;
    order?: number;
    load: () => Promise<NavNode[]>;
};
/** One section group within a track: its label, sort hint, and nested items. */
type NavGroup = {
    group: string;
    groupOrder?: number;
    items: NavNode[];
};
/** One top-level track: its key and its ordered section groups. */
type NavTrack = {
    track: string;
    groups: NavGroup[];
};
/** Register a nav source. Additive — never replaces previously registered sources. */
declare function registerNavSource(source: NavSource): void;
/**
 * Every registered source, in resolution order: by `order` (unset sorts last), then
 * registration order for ties (a stable sort preserves it).
 */
declare function getNavSources(): NavSource[];
/** Test/hot-reload hygiene: drop all registered sources. */
declare function clearNavSources(): void;
/**
 * Load and concatenate every registered source's nodes (compose-many). Each source's
 * `load()` is awaited; a source that throws is skipped rather than failing the whole
 * sidebar, so one bad package can't blank the nav.
 */
declare function resolveNavNodes(list?: NavSource[]): Promise<NavNode[]>;
/**
 * Compose flat NavNodes into the sidebar tree: partition by `track`, then group and nest
 * each track. Track order follows `trackOrder` when given (the consumer's authority), else
 * first-seen. Tracks with no nodes are omitted.
 */
declare function buildNavTree(nodes: NavNode[], trackOrder?: string[]): NavTrack[];
/** A selectable sibling for a switcher crumb: a label and its navigation target. */
type NavCrumbSibling = {
    label: string;
    href: string;
};
/**
 * The breadcrumb trail for the active href, derived from the same tree the sidebar uses.
 * `group.siblings` are the other section groups in the track (each pointing at that
 * group's lead guide); `page.siblings` are the guides in the active group (roots +
 * children, flattened). Both back a searchable switcher; the host maps them to crumbs.
 * Null when the href isn't found in the tree (e.g. a landing page, not a guide).
 */
type NavTrail = {
    trackKey: string;
    group: {
        label: string;
        current: string;
        siblings: NavCrumbSibling[];
    } | null;
    page: {
        label: string;
        href: string;
        siblings: NavCrumbSibling[];
    } | null;
} | null;
/**
 * Derive the breadcrumb trail (track → group → page) for `href` from a composed nav tree.
 */
declare function navTrail(tree: NavTrack[], href?: string): NavTrail;

/** Injected class names for each structural part. Anything omitted renders unstyled. */
type ExpandableNavClasses = {
    nav?: string;
    track?: string;
    trackLabel?: string;
    group?: string;
    header?: string;
    chevron?: string;
    panelInner?: string;
    item?: string;
    children?: string;
    loading?: string;
};
type ExpandableNavProps = {
    /**
     * The nav data to render. Feed a `NavNode[]` directly (the simple, synchronous path).
     * Omit it to compose from the global nav-source registry instead (compose-many + lazy
     * loading, with the per-source fallback) — useful when packages contribute their own
     * nodes. Either way the component renders the same `buildNavTree` output.
     */
    items?: NavNode[];
    /** Injected link renderer — keeps the kit router-agnostic. Gets the leaf's active state. */
    renderLink: (node: NavNode, ctx: {
        active: boolean;
    }) => ReactNode;
    /** The current path, used to mark the active leaf and default-open its group. */
    currentHref?: string;
    /** Explicit track render order; else first-seen. */
    trackOrder?: string[];
    /** Map a track key to its display label; defaults to the raw key. */
    trackLabel?: (track: string) => string;
    /** localStorage key prefix for persisted open/closed group state. */
    storagePrefix?: string;
    /**
     * Where groups start with no stored preference: `'expanded'` (default, all open) or
     * `'collapsed'` (all closed except the active guide's group). The active group opens
     * on load/navigation regardless; a stored preference or in-session toggle still wins.
     */
    initialGroupState?: 'expanded' | 'collapsed';
    /** Injected class names for each structural part. */
    classes?: ExpandableNavClasses;
    /** Custom chevron glyph; receives the open state. Defaults to a rotating caret. */
    renderChevron?: (open: boolean) => ReactNode;
    /** Accessible label for the nav landmark. */
    'aria-label'?: string;
};
declare function ExpandableNav({ items, renderLink, currentHref, trackOrder, trackLabel, storagePrefix, initialGroupState, classes, renderChevron, 'aria-label': ariaLabel, }: ExpandableNavProps): react.JSX.Element;

/** Injected class names for each part. Anything omitted renders unstyled. */
type OnThisPageClasses = {
    root?: string;
    title?: string;
    list?: string;
    item?: string;
    link?: string;
    linkActive?: string;
    linkLevel3?: string;
};
type OnThisPageProps = {
    /** Changes trigger a re-scan (e.g. the current URL). */
    routeKey?: string;
    /** Optional container selector the headings are scoped to (e.g. '.site-prose'). */
    container?: string;
    /** Heading selector (default `h2[id], h3[id]`). Only id-bearing headings link. */
    selector?: string;
    /** Heading label (default "On this page"). */
    title?: ReactNode;
    /** Hide the whole TOC below this many headings (default 2 — a lone heading isn't a TOC). */
    minHeadings?: number;
    classes?: OnThisPageClasses;
    /** Accessible label for the nav landmark. */
    'aria-label'?: string;
};
declare function OnThisPage({ routeKey, container, selector, title, minHeadings, classes, 'aria-label': ariaLabel, }: OnThisPageProps): react.JSX.Element | null;

/** One TOC item: an id to anchor at, its text, and its heading depth (2 for <h2>, …). */
type TocHeading = {
    id: string;
    text: string;
    level: number;
};
/** Default: level-2 and level-3 headings that carry an id. */
declare const DEFAULT_HEADING_SELECTOR = "h2[id], h3[id]";
/**
 * Scope a heading selector to a container: `scopeHeadingSelector('.site-prose', 'h2[id],
 * h3[id]')` → `.site-prose h2[id], .site-prose h3[id]`. A comma-list is distributed across
 * the container prefix. Pure — no DOM.
 */
declare function scopeHeadingSelector(container: string | undefined, selector: string): string;
/**
 * Read id-bearing headings from the DOM into a flat TOC item list. `container` scopes the
 * query (e.g. `.site-prose`); `selector` picks the heading levels (default h2/h3); `doc`
 * overrides the document (tests/SSR). Returns `[]` with no document or no matches.
 */
declare function scanHeadings(options?: {
    container?: string;
    selector?: string;
    doc?: Document;
}): TocHeading[];

export { DEFAULT_HEADING_SELECTOR, ExpandableNav, type ExpandableNavClasses, type ExpandableNavProps, type NavCrumbSibling, type NavGroup, type NavNode, type NavSource, type NavTrack, type NavTrail, OnThisPage, type OnThisPageClasses, type OnThisPageProps, type TocHeading, buildNavTree, clearNavSources, getNavSources, navTrail, registerNavSource, resolveNavNodes, scanHeadings, scopeHeadingSelector };
