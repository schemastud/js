import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMountDispatcher } from '../src/mountDispatcher';
import {
    assertRouteContext,
    buildRealmRoutes,
    createGuardRegistry,
    createRouteRegistry,
} from '../src/routes';
import type { RouteContextEntry } from '../src/types';

afterEach(cleanup);

// The `mounts` fallback dispatcher. `mounts` has been a declared verb on every RouteContextEntry since
// the router face landed, and until now only `'widget'` had a runtime consumer — every other leaf reached
// its component through a host `registerRoute()` call, so the declaration said what a route renders and
// something else decided it.
//
// Two properties are asserted harder than the happy path, because they are what make this safe to add to
// a live host: a bound component ALWAYS wins, and a decline is byte-identical to having no fallback.

const entry = (
    over: Partial<RouteContextEntry> & Pick<RouteContextEntry, 'routeName' | 'path'>,
): RouteContextEntry => ({
    shell: null,
    lazy: false,
    guard: null,
    mounts: 'list',
    resource: 'tenants',
    ...over,
});

describe('createMountDispatcher — what it renders', () => {
    it('dispatches a widget mount, the one verb that already had a consumer', () => {
        const dispatch = createMountDispatcher({ resolveId: () => 'abc' });

        expect(
            dispatch(entry({ routeName: 'x.edit', path: 'x/:id', mounts: 'widget', widget: 'circuit-canvas' })),
        ).toBeTypeOf('function');
    });

    it('dispatches edit and detail, and detail is the read-only one', () => {
        const dispatch = createMountDispatcher({ resolveId: () => 'abc' });

        expect(dispatch(entry({ routeName: 'x.edit', path: 'x/:id', mounts: 'edit' }))).toBeTypeOf('function');
        expect(dispatch(entry({ routeName: 'x.show', path: 'x/:id', mounts: 'detail' }))).toBeTypeOf('function');
    });

    it('dispatches a list once the host wires EITHER lookup, and declines with neither', () => {
        const withColumns = createMountDispatcher({ columnsFor: () => [{ field: 'name', header: 'Name' }] });
        // The manifest alone is enough — its `list-column` participation IS the column set. This
        // arm used to decline, on the belief that only a host can know a list's columns; see
        // `manifest-driven-list.test.tsx` for the full contract.
        const withManifest = createMountDispatcher({ manifestFor: () => undefined });
        const without = createMountDispatcher({});

        expect(withColumns(entry({ routeName: 'x.index', path: 'x', mounts: 'list' }))).toBeTypeOf('function');
        expect(withManifest(entry({ routeName: 'x.index', path: 'x', mounts: 'list' }))).toBeTypeOf('function');
        // Neither lookup wired = no path to a column set at any future point, so decline once.
        expect(without(entry({ routeName: 'x.index', path: 'x', mounts: 'list' }))).toBeUndefined();
    });
});

describe('createMountDispatcher — what it declines, and why that is the point', () => {
    const reasons = (e: RouteContextEntry, options = {}) => {
        const seen: string[] = [];
        createMountDispatcher({ ...options, onDecline: (_, reason) => seen.push(reason) })(e);

        return seen;
    };

    it("never dispatches 'redirect', because nothing can carry a destination", () => {
        // Structural, not unimplemented: the PHP RouteContextEntry declares eight constructor parameters
        // and the TS interface mirrors them; neither has a `redirect` field. An entry can say THAT it
        // redirects and never WHERE. This is also the origin of a documented wrong premise — that class's
        // docblock describes a `{ redirect: path }` form and points at a `$redirect` parameter which has
        // never existed.
        expect(reasons(entry({ routeName: 'x', path: 'x', mounts: 'redirect' }))[0]).toContain(
            'carries no destination',
        );
    });

    it('declines edit without resolveId rather than rendering a create form on an edit route', () => {
        expect(reasons(entry({ routeName: 'x.edit', path: 'x/:id', mounts: 'edit' }))[0]).toContain('resolveId');
    });

    it('declines a resource-less standalone page, which is a legal entry it simply cannot render', () => {
        expect(reasons(entry({ routeName: 'x', path: 'x', mounts: 'list', resource: null }))[0]).toContain(
            'declares none',
        );
    });

    it('declines a widget mount that names no widget', () => {
        expect(
            reasons(entry({ routeName: 'x', path: 'x', mounts: 'widget', widget: null }), { resolveId: () => null })[0],
        ).toContain('no widget name');
    });

    it('declines a verb outside the union, which the PHP side can emit because it declares a bare string', () => {
        // `mounts` is a closed union in TypeScript and an UNCONSTRAINED `string` in the PHP declaration
        // (`public string $mounts = 'list'`). A value outside the union is unreachable in the type system
        // and perfectly reachable at runtime, so it is named rather than crashed on.
        const e = entry({ routeName: 'x', path: 'x' });
        (e as { mounts: string }).mounts = 'teleport';

        expect(reasons(e)[0]).toContain('teleport');
    });
});

describe('buildRealmRoutes — the fallback is a fallback', () => {
    it('a bound component always wins over the dispatcher', () => {
        const routes = createRouteRegistry();
        routes.registerRoute('tenants.edit', () => <div>hand-bound editor</div>);
        const fallback = vi.fn(() => () => <div>dispatched</div>);

        const built = buildRealmRoutes([entry({ routeName: 'tenants.edit', path: 'tenants/:id', mounts: 'edit' })], {
            routes,
            guards: createGuardRegistry(),
            fallback,
        });

        render(built[0].element);
        expect(screen.getByText('hand-bound editor')).toBeTruthy();
        // Not merely outranked — never consulted. `registerRoute` stays an override, so a host that binds
        // everything it binds today cannot be changed by adding a fallback.
        expect(fallback).not.toHaveBeenCalled();
    });

    it('the dispatcher fills in only where nothing is bound', () => {
        const built = buildRealmRoutes([entry({ routeName: 'tenants.edit', path: 'tenants/:id', mounts: 'edit' })], {
            routes: createRouteRegistry(),
            guards: createGuardRegistry(),
            fallback: () => () => <div>dispatched</div>,
        });

        render(built[0].element);
        expect(screen.getByText('dispatched')).toBeTruthy();
    });

    it('a declining fallback is byte-identical to no fallback at all', () => {
        const entries = [entry({ routeName: 'tenants.edit', path: 'tenants/:id', mounts: 'edit' })];
        const onUnboundA = vi.fn();
        const onUnboundB = vi.fn();

        const withDeclining = buildRealmRoutes(entries, {
            routes: createRouteRegistry(),
            guards: createGuardRegistry(),
            fallback: () => undefined,
            onUnbound: onUnboundA,
        });
        const withNone = buildRealmRoutes(entries, {
            routes: createRouteRegistry(),
            guards: createGuardRegistry(),
            onUnbound: onUnboundB,
        });

        expect(withDeclining).toEqual(withNone);
        expect(withDeclining).toHaveLength(0);
        expect(onUnboundA).toHaveBeenCalledTimes(1);
        expect(onUnboundB).toHaveBeenCalledTimes(1);
    });

    it('still wraps a dispatched leaf in its guard, exactly as a bound one', () => {
        const guards = createGuardRegistry();
        guards.registerGuard('root', ({ children }) => <div data-testid="guard">{children}</div>);

        const built = buildRealmRoutes(
            [entry({ routeName: 'tenants.edit', path: 'tenants/:id', mounts: 'edit', guard: 'root' })],
            { routes: createRouteRegistry(), guards, fallback: () => () => <div>dispatched</div> },
        );

        render(built[0].element);
        expect(screen.getByTestId('guard').textContent).toBe('dispatched');
    });
});

describe('assertRouteContext — a typo must stay visible', () => {
    const dup = [
        entry({ routeName: 'a', path: 'a' }),
        entry({ routeName: 'a', path: 'b' }),
    ];

    it('throws on a duplicate routeName at EVERY setting, fallback or not', () => {
        const registry = createRouteRegistry();
        registry.registerRoute('a', () => null);

        expect(() => assertRouteContext(dup, registry)).toThrow(/duplicate routeName/);
        // The relaxation is scoped to the unbound arm only. A duplicated route identity is an author
        // error no dispatcher can rescue, so relaxing it would trade a loud boot failure for a silently
        // missing page.
        expect(() => assertRouteContext(dup, registry, { unbound: 'report' })).toThrow(/duplicate routeName/);
    });

    it('throws on a nested/non-string path at every setting', () => {
        const bad = [entry({ routeName: 'a', path: undefined as unknown as string })];

        expect(() => assertRouteContext(bad, createRouteRegistry(), { unbound: 'report' })).toThrow(/flat/);
    });

    it('still throws on an unbound name by default — the boot invariant is unchanged', () => {
        expect(() => assertRouteContext([entry({ routeName: 'a', path: 'a' })], createRouteRegistry())).toThrow(
            /no component bound/,
        );
    });

    it("reports instead of throwing only when the host opts in, which is what a fallback host wants", () => {
        const onUnbound = vi.fn();

        expect(() =>
            assertRouteContext([entry({ routeName: 'a', path: 'a' })], createRouteRegistry(), {
                unbound: 'report',
                onUnbound,
            }),
        ).not.toThrow();
        expect(onUnbound).toHaveBeenCalledTimes(1);
    });
});
