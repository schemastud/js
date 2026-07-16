import type { ComponentType } from 'react';
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
