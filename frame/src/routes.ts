import { createElement, type ComponentType, type ReactElement } from 'react';
import type { AliasEntry, RouteContextEntry } from './types';

// =============================================================================
// RouteRegistry + guard registry — the client name→component binding for the
// router face of the frame runtime (FC-22). The exact mirror of the widget
// registry and the nav icon map: the server declares structure by name, the host
// binds each name to a component here.
//
// A RouteRegistry maps a `routeName` to the React component the manifest's
// RouteContextEntry mounts; a GuardRegistry maps a `guard` key (e.g. `root`) to a
// guard component. Frame expands each flat entry against these two registries; the
// host router wraps the resolved component in its guard + lazy/Suspense and slots
// it under the entry's hand-written `shell`. Nesting never enters this layer.
// =============================================================================

export type RouteComponent = ComponentType<Record<string, never>>;
export type GuardComponent = ComponentType<{ children: React.ReactNode }>;

export interface RouteRegistry {
    registerRoute(routeName: string, component: RouteComponent): void;
    hasRoute(routeName: string): boolean;
    resolveRoute(routeName: string): RouteComponent | undefined;
    routeNames(): string[];
}

export interface GuardRegistry {
    registerGuard(key: string, component: GuardComponent): void;
    hasGuard(key: string): boolean;
    resolveGuard(key: string): GuardComponent | undefined;
}

/**
 * A shell layout component — a hand-written layout that owns its `<Outlet/>` + chrome
 * (tabs, headers). Generated leaves carrying that shell key nest INSIDE it (realm-
 * architecture ticket 03). It takes no props; it renders the router `<Outlet/>` itself.
 */
export type ShellComponent = ComponentType<Record<string, never>>;

/**
 * The shell registry — the third name→component binding beside routes + guards: it maps
 * a `RouteContextEntry.shell` key to the layout component the generator nests that leaf
 * under. `null`/`'app'` is the top-level (no-shell) case and is never looked up here.
 */
export interface ShellRegistry {
    registerShell(key: string, component: ShellComponent): void;
    hasShell(key: string): boolean;
    resolveShell(key: string): ShellComponent | undefined;
}

export function createRouteRegistry(): RouteRegistry {
    const routes = new Map<string, RouteComponent>();

    return {
        registerRoute(routeName, component) {
            routes.set(routeName, component);
        },
        hasRoute(routeName) {
            return routes.has(routeName);
        },
        resolveRoute(routeName) {
            return routes.get(routeName);
        },
        routeNames() {
            return [...routes.keys()];
        },
    };
}

export function createGuardRegistry(): GuardRegistry {
    const guards = new Map<string, GuardComponent>();

    return {
        registerGuard(key, component) {
            guards.set(key, component);
        },
        hasGuard(key) {
            return guards.has(key);
        },
        resolveGuard(key) {
            return guards.get(key);
        },
    };
}

export function createShellRegistry(): ShellRegistry {
    const shells = new Map<string, ShellComponent>();

    return {
        registerShell(key, component) {
            shells.set(key, component);
        },
        hasShell(key) {
            return shells.has(key);
        },
        resolveShell(key) {
            return shells.get(key);
        },
    };
}

/**
 * Boot invariant (spec §7): every RouteContextEntry (and every alias `to`) must
 * bind to a `routeName` present in the RouteRegistry, and no `routeName` may be
 * declared twice across the manifest. Throws on a duplicate or an unbound name so
 * a missing binding fails loudly at boot, not silently at navigation — the same
 * discipline the widget registry enforces.
 *
 * `mounts: 'redirect'` and standalone pages are still bound components in the
 * registry (a redirect leaf is a component that navigates), so every entry is
 * checked uniformly.
 */
export interface AssertRouteContextOptions {
    /**
     * What an unbound `routeName` means. `'throw'` (the default, and today's behaviour) keeps the boot
     * invariant; `'report'` hands it to `onUnbound` instead, which is what a host running a `mounts`
     * fallback wants — there, an unbound name is not a defect, it is the ordinary case.
     *
     * ⚠️ **Only this arm is configurable.** The duplicate-`routeName` and non-string-`path` throws below
     * stay unconditional at every setting, because a typo must stay visible: a duplicated route identity
     * and a nested path are author errors no dispatcher can rescue, and relaxing them to make the
     * fallback usable would trade a loud boot failure for a silently missing page.
     */
    unbound?: 'throw' | 'report';
    /** Called per unbound entry when `unbound: 'report'`. Never called under `'throw'`. */
    onUnbound?: (entry: RouteContextEntry) => void;
}

export function assertRouteContext(
    entries: RouteContextEntry[],
    registry: RouteRegistry,
    options: AssertRouteContextOptions = {},
): void {
    const seen = new Set<string>();

    for (const entry of entries) {
        if (seen.has(entry.routeName)) {
            throw new Error(
                `[frame] duplicate routeName "${entry.routeName}" in the RouteContext — every route identity must be unique.`,
            );
        }
        seen.add(entry.routeName);

        // A path segment that reintroduces a parent/child boundary is the nesting
        // the flat guardrail forbids. A flat entry's path may carry params
        // (`:id`) but the manifest must never emit a child route table; guard the
        // shape defensively so a regression surfaces at boot.
        if (typeof entry.path !== 'string') {
            throw new Error(
                `[frame] RouteContext entry "${entry.routeName}" has a non-string path — RouteContext is flat; nesting is hand-written.`,
            );
        }

        if (!registry.hasRoute(entry.routeName)) {
            if (options.unbound === 'report') {
                options.onUnbound?.(entry);
                continue;
            }

            throw new Error(
                `[frame] RouteContext entry "${entry.routeName}" (${entry.path}) has no component bound in the RouteRegistry.`,
            );
        }
    }
}

// =============================================================================
// RealmRoutes generator (realm-architecture ticket 02) — the realm-agnostic
// manifest→router-leaf expansion, lifted out of the app-local `AdminManifestRoutes`.
// Given a realm's flat RouteContext + the route/guard registries it binds each leaf's
// `routeName` → component and wraps it in its `guard`. It stays react-router-free: a
// leaf is a plain `{ path, element }` (structurally a react-router `RouteObject`), so
// the host owns the router call (`useRoutes`) plus its realm-specific extras — the
// index redirect, the not-found fallback, and slotting under the realm's `routeBase`.
// =============================================================================

/**
 * One generated router leaf — the shape react-router's `RouteObject` accepts (a `path`
 * + an `element`, and — for a shell layout — `children`), produced without a react-router
 * dependency in the foundation. A shell parent carries `children` + a layout `element`
 * (no leaf component); a flat leaf carries `element` + no children.
 */
export interface RealmRouteObject {
    path: string;
    element: ReactElement;
    children?: RealmRouteObject[];
}

export interface RealmRouteRegistries {
    /** Binds each leaf's `routeName` → the component it mounts. */
    routes: RouteRegistry;
    /** Binds each leaf's `guard` key → the guard component wrapping it. */
    guards: GuardRegistry;
    /**
     * Binds each leaf's `shell` key → the layout it nests under. Optional: absent (or a
     * leaf whose `shell` is null/`'app'`/unregistered) means the leaf stays top-level — so
     * a flat realm (the operator console) passes no shells and behaves exactly as before.
     */
    shells?: ShellRegistry;
    /**
     * Hand-written child routes to append INSIDE a shell's layout, keyed by shell key — the
     * bespoke + record-nested routes a section keeps hand-authored (`silos/:id/*`,
     * `scopes/:id/golden`, the section overview) which live under the same layout as the
     * generated leaves but aren't manifest resources.
     */
    shellChildren?: Record<string, RealmRouteObject[]>;
    /**
     * Called when a leaf's `routeName` has no bound component. `assertRouteContext` is
     * the loud boot invariant; this is the soft per-leaf fallback so one unbound name
     * skips its leaf rather than crashing the whole realm (the host can dev-warn).
     */
    onUnbound?: (entry: RouteContextEntry) => void;
    /**
     * Last resort for a leaf no `registerRoute()` bound: render it from its DECLARED `mounts` verb.
     * `createMountDispatcher` is the supplied one; any `(entry) => RouteComponent | undefined` works.
     *
     * ⚠️ **Consulted only after `resolveRoute()` misses, and that order is the whole contract.** Every
     * existing `registerRoute()` call keeps winning, so `registerRoute` becomes an OVERRIDE rather than
     * the only path — a host that binds nothing new behaves exactly as it did. A fallback that returns
     * `undefined` (a decline) is also byte-identical to today: the leaf is skipped and `onUnbound` fires,
     * which is what happens with no fallback at all.
     */
    fallback?: (entry: RouteContextEntry) => RouteComponent | undefined;
}

/**
 * Expand a realm's flat `RouteContext` into router leaves: resolve each `routeName` to its
 * component and, when the leaf carries a `guard`, wrap the element in the guard component.
 *
 * Shell-aware (realm-architecture ticket 03): a leaf whose `shell` resolves in the shell
 * registry is nested under that shell's layout — the generator groups such leaves by shell
 * key, wraps each group in `{ path: shellKey, element: <Layout/>, children: [...] }` (the
 * layout owns the `<Outlet/>` + chrome), and appends any hand-written `shellChildren` for
 * that shell. Leaves with no registered shell stay top-level. Realm-agnostic — no realm
 * names, no tenancy, no RBAC; the host supplies the entries + registry bindings and slots
 * the result under the realm's routeBase. Shell groups emit in first-seen order.
 */
export function buildRealmRoutes(
    entries: RouteContextEntry[],
    registries: RealmRouteRegistries,
): RealmRouteObject[] {
    const routes: RealmRouteObject[] = [];
    // shell key → the group's children array (a live ref spliced into `routes` in order).
    const shellGroups = new Map<string, RealmRouteObject[]>();

    const leafElement = (entry: RouteContextEntry): ReactElement | null => {
        // A bound component wins; the declared `mounts` verb is the fallback. `onUnbound` still fires
        // when BOTH miss, so a host that passes no fallback sees exactly the behaviour it always saw.
        const Component =
            registries.routes.resolveRoute(entry.routeName) ?? registries.fallback?.(entry);

        if (!Component) {
            registries.onUnbound?.(entry);
            return null;
        }

        let element: ReactElement = createElement(Component);
        const Guard = entry.guard ? registries.guards.resolveGuard(entry.guard) : undefined;
        if (Guard) {
            element = createElement(Guard, null, element);
        }
        return element;
    };

    for (const entry of entries) {
        const Shell =
            entry.shell && entry.shell !== 'app'
                ? registries.shells?.resolveShell(entry.shell)
                : undefined;

        // A leaf with no registered shell stays flat (the operator-console behaviour).
        if (!Shell || !entry.shell) {
            const element = leafElement(entry);
            if (element) {
                routes.push({ path: entry.path, element });
            }
            continue;
        }

        // A shelled leaf nests under its layout. The group is created lazily on first sight
        // (preserving first-seen order in `routes`) and its bespoke shellChildren appended.
        let children = shellGroups.get(entry.shell);
        if (!children) {
            children = [...(registries.shellChildren?.[entry.shell] ?? [])];
            shellGroups.set(entry.shell, children);
            routes.push({ path: entry.shell, element: createElement(Shell), children });
        }

        const element = leafElement(entry);
        if (element) {
            children.push({ path: entry.path, element });
        }
    }

    return routes;
}

/**
 * A convenience the host router uses to walk aliases; kept here so alias handling
 * lives beside the RouteContext it complements. Interpolates a `:id`-style param
 * present in both `from` and `to` — the host passes the matched params.
 */
export function resolveAliasTarget(
    alias: AliasEntry,
    params: Record<string, string | undefined>,
    search: string,
): string {
    let to = alias.to;

    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
            to = to.replace(`:${key}`, value);
        }
    }

    return alias.preserveQuery && search ? `${to}${search}` : to;
}
