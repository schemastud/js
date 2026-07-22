// =============================================================================
// Nav-source registry + tree builder + breadcrumb-trail derivation.
//
// A host-agnostic seam for composing site/docs nav data from named sources (the
// "seam is a registry" doctrine). A package contributes nav data by registering a
// NavSource — an `id`, an optional `order`, and a lazy `load()` returning typed
// NavNode atoms. Resolution is COMPOSE-MANY: every registered source's nodes
// concatenate, then the pure tree builder groups (by `group`), nests one level (by
// `parent` leaf slug), and sorts (`groupOrder` across groups, `order` within). The
// same tree feeds both the sidebar (<ExpandableNav>) and the breadcrumb (navTrail).
//
// No router, no framework, no vendor vocabulary — the host owns link rendering and
// the current path.
// =============================================================================

/**
 * The atom a source emits: a leaf link or a group node. `parent` is the INPUT nesting
 * hint (a sibling's leaf slug, from a `navParent`-style frontmatter model); `children`
 * is the OUTPUT the tree builder populates — a source emits flat nodes.
 */
export type NavNode = {
    title: string;
    href?: string; // leaf link; group nodes may be href-less
    group?: string; // section label
    track?: string; // top-level track key
    parent?: string; // leaf slug of this node's nav parent, input-only
    children?: NavNode[]; // one level of nesting (populated by the tree builder)
    order?: number; // sort within a group
    groupOrder?: number; // sort of this node's group among groups
};

/** A named, lazily-loaded contributor of nav nodes. */
export type NavSource = {
    id: string;
    order?: number; // sources with a lower order compose first; unset sorts last
    load: () => Promise<NavNode[]>; // lazy, per package (a dynamic import)
};

/** One section group within a track: its label, sort hint, and nested items. */
export type NavGroup = {
    group: string;
    groupOrder?: number;
    items: NavNode[]; // roots with `children` populated
};

/** One top-level track: its key and its ordered section groups. */
export type NavTrack = {
    track: string;
    groups: NavGroup[];
};

// Module-scoped registry. Registration is additive; `getNavSources()` reads it back in
// resolution order. A source plugs in by calling `registerNavSource`, no consumer edit.
const sources: NavSource[] = [];

/** Register a nav source. Additive — never replaces previously registered sources. */
export function registerNavSource(source: NavSource): void {
    sources.push(source);
}

/**
 * Every registered source, in resolution order: by `order` (unset sorts last), then
 * registration order for ties (a stable sort preserves it).
 */
export function getNavSources(): NavSource[] {
    return [...sources].sort(
        (a, b) => (a.order ?? Infinity) - (b.order ?? Infinity),
    );
}

/** Test/hot-reload hygiene: drop all registered sources. */
export function clearNavSources(): void {
    sources.length = 0;
}

/**
 * Load and concatenate every registered source's nodes (compose-many). Each source's
 * `load()` is awaited; a source that throws is skipped rather than failing the whole
 * sidebar, so one bad package can't blank the nav.
 */
export async function resolveNavNodes(
    list: NavSource[] = getNavSources(),
): Promise<NavNode[]> {
    const loaded = await Promise.all(
        list.map(async (source) => {
            try {
                return await source.load();
            } catch {
                return [] as NavNode[];
            }
        }),
    );

    return loaded.flat();
}

// 'docs/build/setup' or '/docs/build/setup' → 'setup'. A node's identity for nesting is
// its href's last segment, matched against another node's `parent` slug.
const leafSlug = (href: string | undefined): string | undefined =>
    href?.split('/').filter(Boolean).pop();

const byOrder = (a: NavNode, b: NavNode) =>
    (a.order ?? Infinity) - (b.order ?? Infinity);

/**
 * Group a track's nodes by `group`, build a one-level tree (a node whose `parent` matches
 * a sibling's leaf slug nests under it), then sort: groups by `groupOrder` (declared leads
 * first-seen), items/children by `order`.
 */
function groupNodes(nodes: NavNode[]): NavGroup[] {
    const groups = new Map<string, NavNode[]>();

    for (const node of nodes) {
        const key = node.group ?? '';
        const list = groups.get(key) ?? [];
        list.push(node);
        groups.set(key, list);
    }

    const declaredGroupOrder = (items: NavNode[]) =>
        items.find((i) => i.groupOrder !== undefined)?.groupOrder ?? Infinity;

    return [...groups.entries()]
        .sort(([, a], [, b]) => declaredGroupOrder(a) - declaredGroupOrder(b))
        .map(([group, items]) => {
            const leaves = new Set(
                items.map((i) => leafSlug(i.href)).filter(Boolean) as string[],
            );
            const childrenOf = new Map<string, NavNode[]>();

            for (const item of items) {
                if (item.parent && leaves.has(item.parent)) {
                    const list = childrenOf.get(item.parent) ?? [];
                    list.push(item);
                    childrenOf.set(item.parent, list);
                }
            }

            const roots = items
                .filter((item) => !(item.parent && leaves.has(item.parent)))
                .map((item) => {
                    const slug = leafSlug(item.href);
                    const children = ((slug && childrenOf.get(slug)) || []).sort(
                        byOrder,
                    );

                    return children.length > 0
                        ? { ...item, children }
                        : { ...item };
                })
                .sort(byOrder);

            return {
                group,
                groupOrder: declaredGroupOrder(items),
                items: roots,
            } satisfies NavGroup;
        });
}

/**
 * Compose flat NavNodes into the sidebar tree: partition by `track`, then group and nest
 * each track. Track order follows `trackOrder` when given (the consumer's authority), else
 * first-seen. Tracks with no nodes are omitted.
 */
export function buildNavTree(
    nodes: NavNode[],
    trackOrder?: string[],
): NavTrack[] {
    const byTrack = new Map<string, NavNode[]>();

    for (const node of nodes) {
        const key = node.track ?? '';
        const list = byTrack.get(key) ?? [];
        list.push(node);
        byTrack.set(key, list);
    }

    const keys = trackOrder
        ? [
              ...trackOrder.filter((t) => byTrack.has(t)),
              ...[...byTrack.keys()].filter((t) => !trackOrder.includes(t)),
          ]
        : [...byTrack.keys()];

    return keys
        .map((track) => ({
            track,
            groups: groupNodes(byTrack.get(track) ?? []),
        }))
        .filter((t) => t.groups.length > 0);
}

// --- Breadcrumb-trail derivation -------------------------------------------------

/** A selectable sibling for a switcher crumb: a label and its navigation target. */
export type NavCrumbSibling = { label: string; href: string };

/**
 * The breadcrumb trail for the active href, derived from the same tree the sidebar uses.
 * `group.siblings` are the other section groups in the track (each pointing at that
 * group's lead guide); `page.siblings` are the guides in the active group (roots +
 * children, flattened). Both back a searchable switcher; the host maps them to crumbs.
 * Null when the href isn't found in the tree (e.g. a landing page, not a guide).
 */
export type NavTrail = {
    trackKey: string;
    group: {
        label: string;
        current: string; // the active group's lead-guide href (marks the current group)
        siblings: NavCrumbSibling[];
    } | null;
    page: {
        label: string;
        href: string;
        siblings: NavCrumbSibling[];
    } | null;
} | null;

// Flatten a group's items (roots then their children) to a linear guide list.
const flattenItems = (items: NavNode[]): NavNode[] =>
    items.flatMap((item) => [item, ...(item.children ?? [])]);

// The href that represents a group in a switcher: its first guide's link.
const leadHref = (group: NavGroup): string | undefined =>
    flattenItems(group.items).find((i) => i.href)?.href;

/**
 * Derive the breadcrumb trail (track → group → page) for `href` from a composed nav tree.
 */
export function navTrail(tree: NavTrack[], href?: string): NavTrail {
    if (!href) {
        return null;
    }

    for (const track of tree) {
        for (const group of track.groups) {
            const flat = flattenItems(group.items);
            const active = flat.find((i) => i.href === href);
            if (!active) {
                continue;
            }

            const groupSiblings: NavCrumbSibling[] = track.groups
                .map((g) => {
                    const lead = leadHref(g);
                    return lead ? { label: g.group, href: lead } : null;
                })
                .filter((s): s is NavCrumbSibling => s !== null);

            const pageSiblings: NavCrumbSibling[] = flat
                .filter((i) => i.href)
                .map((i) => ({ label: i.title, href: i.href as string }));

            return {
                trackKey: track.track,
                group: {
                    label: group.group,
                    current: leadHref(group) ?? href,
                    siblings: groupSiblings,
                },
                page: {
                    label: active.title,
                    href,
                    siblings: pageSiblings,
                },
            };
        }
    }

    return null;
}
