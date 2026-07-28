import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    buildRealmRoutes,
    createGuardRegistry,
    createRouteRegistry,
} from '../src/routes';
import type { RouteContextEntry } from '../src/types';

afterEach(cleanup);

// realm-architecture ticket 02 — the manifest→router-leaf generator lifted out of the
// app-local AdminManifestRoutes. Exercised over a fixture RouteContext (list + `:id` +
// guard) with no Laravel / no app / no react-router deps: the generator returns plain
// `{ path, element }` leaves the frame renders directly (the host owns the router call).

const entry = (
    over: Partial<RouteContextEntry> & Pick<RouteContextEntry, 'routeName' | 'path'>,
): RouteContextEntry => ({
    shell: null,
    lazy: false,
    guard: null,
    mounts: 'list',
    ...over,
});

describe('buildRealmRoutes', () => {
    it('binds each leaf routeName to its component and preserves the flat path (list + :id)', () => {
        const routes = createRouteRegistry();
        routes.registerRoute('tenants.index', () => <div>tenants list</div>);
        routes.registerRoute('tenants.edit', () => <div>tenant editor</div>);

        const built = buildRealmRoutes(
            [
                entry({ routeName: 'tenants.index', path: 'tenants', mounts: 'list' }),
                entry({ routeName: 'tenants.edit', path: 'tenants/:id', mounts: 'edit' }),
            ],
            { routes, guards: createGuardRegistry() },
        );

        // The flat `:id` path is preserved verbatim — the host slots it under the realm base.
        expect(built.map((r) => r.path)).toEqual(['tenants', 'tenants/:id']);

        // Each leaf's element is the component bound under its routeName.
        render(built[0].element);
        expect(screen.getByText('tenants list')).toBeTruthy();
        cleanup();
        render(built[1].element);
        expect(screen.getByText('tenant editor')).toBeTruthy();
    });

    it('wraps a guarded leaf in its guard component from the guard registry', () => {
        const routes = createRouteRegistry();
        routes.registerRoute('plans.index', () => <div>plans</div>);

        const guards = createGuardRegistry();
        const guardSpy = vi.fn();
        guards.registerGuard('root', ({ children }) => {
            guardSpy();
            return <div data-testid="root-guard">{children}</div>;
        });

        const built = buildRealmRoutes(
            [entry({ routeName: 'plans.index', path: 'plans', guard: 'root' })],
            { routes, guards },
        );

        render(built[0].element);

        // The leaf renders inside the resolved guard, not bare.
        expect(screen.getByTestId('root-guard')).toBeTruthy();
        expect(screen.getByText('plans')).toBeTruthy();
        expect(guardSpy).toHaveBeenCalled();
    });

    it('leaves an unguarded leaf unwrapped', () => {
        const routes = createRouteRegistry();
        routes.registerRoute('tenants.index', () => <div>tenants</div>);
        const guards = createGuardRegistry();
        guards.registerGuard('root', ({ children }) => <div data-testid="root-guard">{children}</div>);

        const built = buildRealmRoutes(
            [entry({ routeName: 'tenants.index', path: 'tenants', guard: null })],
            { routes, guards },
        );

        render(built[0].element);
        expect(screen.queryByTestId('root-guard')).toBeNull();
        expect(screen.getByText('tenants')).toBeTruthy();
    });

    it('skips an unbound routeName via onUnbound rather than crashing the realm', () => {
        const routes = createRouteRegistry();
        routes.registerRoute('tenants.index', () => <div>tenants</div>);

        const unbound = vi.fn();
        const built = buildRealmRoutes(
            [
                entry({ routeName: 'tenants.index', path: 'tenants' }),
                entry({ routeName: 'ghost.index', path: 'ghost' }),
            ],
            { routes, guards: createGuardRegistry(), onUnbound: unbound },
        );

        expect(built.map((r) => r.path)).toEqual(['tenants']);
        expect(unbound).toHaveBeenCalledOnce();
        expect(unbound.mock.calls[0][0].routeName).toBe('ghost.index');
    });
});
