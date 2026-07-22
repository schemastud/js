import {
    useEffect,
    useMemo,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react';

import {
    buildNavTree,
    getNavSources,
    type NavNode,
    type NavTrack,
} from './registry';

// =============================================================================
// <ExpandableNav> — a collapsible, accessible sidebar over the nav-source seam.
//
// Consumes every registered nav source (compose-many), lazy-loads each with a
// per-source loading fallback, composes the tree via the shared builder, and renders
// track → group → item. Groups are `<button aria-expanded>` disclosures; the group
// holding the active guide opens on load/navigation; open/closed persists to
// localStorage keyed by track+group.
//
// Foundation-neutral like its @schemastud siblings: ships NO CSS. Every className is
// injected via `classes`, the link element via `renderLink`, and the current path via
// `currentHref`. Only the dynamic collapse animation + chevron rotation are inline
// styles (a grid-rows transition, suppressed under prefers-reduced-motion).
// =============================================================================

/** Injected class names for each structural part. Anything omitted renders unstyled. */
export type ExpandableNavClasses = {
    nav?: string;
    track?: string;
    trackLabel?: string;
    group?: string;
    header?: string; // the disclosure <button>
    chevron?: string; // wrapper around the chevron glyph
    panelInner?: string; // wrapper the items sit in (inside the animated grid row)
    item?: string;
    children?: string; // nested-children wrapper
    loading?: string;
};

export type ExpandableNavProps = {
    /**
     * The nav data to render. Feed a `NavNode[]` directly (the simple, synchronous path).
     * Omit it to compose from the global nav-source registry instead (compose-many + lazy
     * loading, with the per-source fallback) — useful when packages contribute their own
     * nodes. Either way the component renders the same `buildNavTree` output.
     */
    items?: NavNode[];
    /** Injected link renderer — keeps the kit router-agnostic. Gets the leaf's active state. */
    renderLink: (node: NavNode, ctx: { active: boolean }) => ReactNode;
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

const groupKey = (track: string, group: string) => `${track}::${group}`;

function readPersisted(prefix: string, key: string): boolean | undefined {
    if (typeof window === 'undefined') {
        return undefined;
    }
    try {
        const raw = window.localStorage.getItem(`${prefix}:${key}`);
        return raw === null ? undefined : raw === '1';
    } catch {
        return undefined;
    }
}

function writePersisted(prefix: string, key: string, open: boolean): void {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.localStorage.setItem(`${prefix}:${key}`, open ? '1' : '0');
    } catch {
        // Storage disabled (private mode / quota) — collapse still works in-session.
    }
}

function usePrefersReducedMotion(): boolean {
    const [reduce, setReduce] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) {
            return;
        }
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setReduce(mq.matches);
        update();
        mq.addEventListener?.('change', update);
        return () => mq.removeEventListener?.('change', update);
    }, []);
    return reduce;
}

// Does this group hold the active guide — as a root item or one of its children?
const groupHasActive = (items: NavNode[], href?: string): boolean =>
    !!href &&
    items.some(
        (item) =>
            item.href === href ||
            (item.children ?? []).some((child) => child.href === href),
    );

const defaultChevron = (_open: boolean): ReactNode => (
    <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        width="1em"
        height="1em"
        aria-hidden="true"
    >
        <path d="m6 4 4 4-4 4" />
    </svg>
);

export function ExpandableNav({
    items,
    renderLink,
    currentHref,
    trackOrder,
    trackLabel = (t) => t,
    storagePrefix = 'schemastud-nav:open',
    initialGroupState = 'expanded',
    classes = {},
    renderChevron = defaultChevron,
    'aria-label': ariaLabel = 'Navigation',
}: ExpandableNavProps) {
    const reduceMotion = usePrefersReducedMotion();

    // Data comes either straight from `items` (the direct, synchronous path) or from the
    // global nav-source registry (compose-many + lazy). The registry hooks always run but
    // do nothing when `items` is supplied — sources is empty, so nothing loads.
    const fromRegistry = items === undefined;

    // Per-source loaded nodes; null = still loading. Compose-many builds the tree from
    // whatever has resolved, so a slow source shows a fallback without blocking the rest.
    const sources = useMemo(
        () => (fromRegistry ? getNavSources() : []),
        [fromRegistry],
    );
    const [loaded, setLoaded] = useState<Record<string, NavNode[] | null>>(() =>
        Object.fromEntries(sources.map((s) => [s.id, null])),
    );

    useEffect(() => {
        let alive = true;
        for (const source of sources) {
            source
                .load()
                .then((nodes) => {
                    if (alive) {
                        setLoaded((prev) => ({ ...prev, [source.id]: nodes }));
                    }
                })
                .catch(() => {
                    if (alive) {
                        setLoaded((prev) => ({ ...prev, [source.id]: [] }));
                    }
                });
        }
        return () => {
            alive = false;
        };
    }, [sources]);

    const pending = sources.filter((s) => loaded[s.id] === null);
    const tree: NavTrack[] = useMemo(() => {
        const nodes = items ?? sources.flatMap((s) => loaded[s.id] ?? []);
        return buildNavTree(nodes, trackOrder);
    }, [items, sources, loaded, trackOrder]);

    // Open/closed per group, resolved by priority (first match wins):
    //   1. in-session toggle; 2. holds the active guide; 3. stored preference;
    //   4. the initialGroupState fallback.
    const [openState, setOpenState] = useState<Record<string, boolean>>({});

    const isOpen = (
        track: string,
        group: string,
        items: NavNode[],
    ): boolean => {
        const key = groupKey(track, group);
        if (key in openState) {
            return openState[key];
        }
        if (groupHasActive(items, currentHref)) {
            return true;
        }
        const persisted = readPersisted(storagePrefix, key);
        if (persisted !== undefined) {
            return persisted;
        }
        return initialGroupState === 'expanded';
    };

    // Flip from the on-screen state (passed in), so one click always toggles.
    const toggle = (track: string, group: string, open: boolean) => {
        const key = groupKey(track, group);
        const next = !open;
        writePersisted(storagePrefix, key, next);
        setOpenState((prev) => ({ ...prev, [key]: next }));
    };

    return (
        <nav className={classes.nav} aria-label={ariaLabel}>
            {tree.map((navTrack) => (
                <div key={navTrack.track} className={classes.track}>
                    <p className={classes.trackLabel}>
                        {trackLabel(navTrack.track)}
                    </p>
                    {navTrack.groups.map((group) => {
                        const open = isOpen(
                            navTrack.track,
                            group.group,
                            group.items,
                        );
                        const panelId =
                            `sn-${navTrack.track}-${group.group}`.replace(
                                /\s+/g,
                                '-',
                            );

                        const panelStyle: CSSProperties = {
                            display: 'grid',
                            gridTemplateRows: open ? '1fr' : '0fr',
                            transition: reduceMotion
                                ? undefined
                                : 'grid-template-rows 200ms ease',
                        };
                        const chevronStyle: CSSProperties = {
                            display: 'inline-flex',
                            transition: reduceMotion
                                ? undefined
                                : 'transform 180ms ease',
                            transform: open ? 'rotate(90deg)' : 'none',
                        };

                        return (
                            <div key={group.group} className={classes.group}>
                                <button
                                    type="button"
                                    className={classes.header}
                                    aria-expanded={open}
                                    aria-controls={panelId}
                                    onClick={() =>
                                        toggle(
                                            navTrack.track,
                                            group.group,
                                            open,
                                        )
                                    }
                                >
                                    <span
                                        className={classes.chevron}
                                        style={chevronStyle}
                                        aria-hidden="true"
                                    >
                                        {renderChevron(open)}
                                    </span>
                                    <span>{group.group}</span>
                                </button>
                                <div
                                    id={panelId}
                                    style={panelStyle}
                                    aria-hidden={!open}
                                >
                                    <div
                                        className={classes.panelInner}
                                        style={{
                                            overflow: 'hidden',
                                            minHeight: 0,
                                            visibility: open
                                                ? undefined
                                                : 'hidden',
                                        }}
                                    >
                                        {group.items.map((item) => (
                                            <div
                                                key={item.href ?? item.title}
                                                className={classes.item}
                                            >
                                                {renderLink(item, {
                                                    active:
                                                        item.href ===
                                                        currentHref,
                                                })}
                                                {item.children &&
                                                    item.children.length > 0 && (
                                                        <div
                                                            className={
                                                                classes.children
                                                            }
                                                        >
                                                            {item.children.map(
                                                                (child) => (
                                                                    <div
                                                                        key={
                                                                            child.href ??
                                                                            child.title
                                                                        }
                                                                        className={
                                                                            classes.item
                                                                        }
                                                                    >
                                                                        {renderLink(
                                                                            child,
                                                                            {
                                                                                active:
                                                                                    child.href ===
                                                                                    currentHref,
                                                                            },
                                                                        )}
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}
            {pending.length > 0 && (
                <div className={classes.loading} aria-live="polite">
                    {pending.map((s) => (
                        <span key={s.id}>Loading…</span>
                    ))}
                </div>
            )}
        </nav>
    );
}
