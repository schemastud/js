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
export function assertRouteContext(
    entries: RouteContextEntry[],
    registry: RouteRegistry,
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
 * + an `element`), produced without a react-router dependency in the foundation.
 */
export interface RealmRouteObject {
    path: string;
    element: ReactElement;
}

export interface RealmRouteRegistries {
    /** Binds each leaf's `routeName` → the component it mounts. */
    routes: RouteRegistry;
    /** Binds each leaf's `guard` key → the guard component wrapping it. */
    guards: GuardRegistry;
    /**
     * Called when a leaf's `routeName` has no bound component. `assertRouteContext` is
     * the loud boot invariant; this is the soft per-leaf fallback so one unbound name
     * skips its leaf rather than crashing the whole realm (the host can dev-warn).
     */
    onUnbound?: (entry: RouteContextEntry) => void;
}

/**
 * Expand a realm's flat `RouteContext` into router leaves: resolve each `routeName` to
 * its component and, when the leaf carries a `guard`, wrap the element in the guard
 * component. Realm-agnostic — no realm names, no tenancy, no RBAC; the host supplies the
 * concrete entries + registry bindings and slots the result under the realm's routeBase.
 */
export function buildRealmRoutes(
    entries: RouteContextEntry[],
    registries: RealmRouteRegistries,
): RealmRouteObject[] {
    const routes: RealmRouteObject[] = [];

    for (const entry of entries) {
        const Component = registries.routes.resolveRoute(entry.routeName);
        if (!Component) {
            registries.onUnbound?.(entry);
            continue;
        }

        let element: ReactElement = createElement(Component);

        const Guard = entry.guard ? registries.guards.resolveGuard(entry.guard) : undefined;
        if (Guard) {
            element = createElement(Guard, null, element);
        }

        routes.push({ path: entry.path, element });
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
