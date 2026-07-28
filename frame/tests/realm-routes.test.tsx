import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    buildRealmRoutes,
    createGuardRegistry,
    createRouteRegistry,
    createShellRegistry,
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

    it('nests shelled leaves under their layout (real relative paths), flat leaves stay top-level', () => {
        const routes = createRouteRegistry();
        routes.registerRoute('fragments.index', () => <div>fragments</div>);
        routes.registerRoute('context-scopes.index', () => <div>scopes</div>);
        routes.registerRoute('concepts.index', () => <div>concepts</div>);
        routes.registerRoute('circuits.index', () => <div>circuits</div>);

        const KnowledgeLayout = () => <div data-testid="knowledge-shell">shell</div>;
        const shells = createShellRegistry();
        shells.registerShell('knowledge', KnowledgeLayout);

        const built = buildRealmRoutes(
            [
                // A flat 'app' leaf stays top-level.
                entry({ routeName: 'circuits.index', path: 'circuits', shell: 'app' }),
                // Knowledge leaves nest under the 'knowledge' shell at real relative paths.
                entry({ routeName: 'fragments.index', path: 'fragments', shell: 'knowledge' }),
                entry({ routeName: 'context-scopes.index', path: 'scopes', shell: 'knowledge' }),
                entry({ routeName: 'concepts.index', path: 'graph/concepts', shell: 'knowledge' }),
            ],
            { routes, guards: createGuardRegistry(), shells },
        );

        // Two top-level entries: the flat circuits leaf + the single knowledge shell parent.
        expect(built.map((r) => r.path)).toEqual(['circuits', 'knowledge']);

        const knowledge = built.find((r) => r.path === 'knowledge')!;
        expect(knowledge.children?.map((c) => c.path)).toEqual(['fragments', 'scopes', 'graph/concepts']);

        // The shell parent renders the layout, not a leaf component.
        render(knowledge.element);
        expect(screen.getByTestId('knowledge-shell')).toBeTruthy();
    });

    it('appends hand-written shellChildren inside the shell layout (bespoke + record-nested)', () => {
        const routes = createRouteRegistry();
        routes.registerRoute('fragments.index', () => <div>fragments</div>);

        const shells = createShellRegistry();
        shells.registerShell('knowledge', () => <div>shell</div>);

        const overview = { path: '', element: <div>overview</div> } as const;
        const record = { path: 'fragments/:id', element: <div>detail</div> } as const;

        const built = buildRealmRoutes(
            [entry({ routeName: 'fragments.index', path: 'fragments', shell: 'knowledge' })],
            {
                routes,
                guards: createGuardRegistry(),
                shells,
                shellChildren: { knowledge: [overview, record] },
            },
        );

        const knowledge = built.find((r) => r.path === 'knowledge')!;
        // Bespoke/record-nested children present alongside the generated leaf.
        expect(knowledge.children?.map((c) => c.path)).toEqual(['', 'fragments/:id', 'fragments']);
    });

    it('leaves a shelled leaf flat when its shell is not registered', () => {
        const routes = createRouteRegistry();
        routes.registerRoute('fragments.index', () => <div>fragments</div>);

        // No shell registry passed — the leaf falls back to top-level (operator-console behaviour).
        const built = buildRealmRoutes(
            [entry({ routeName: 'fragments.index', path: 'fragments', shell: 'knowledge' })],
            { routes, guards: createGuardRegistry() },
        );

        expect(built.map((r) => r.path)).toEqual(['fragments']);
        expect(built[0].children).toBeUndefined();
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
