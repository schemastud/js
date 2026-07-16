import { describe, expect, it } from 'vitest';
import {
    assertRouteContext,
    createGuardRegistry,
    createRouteRegistry,
    resolveAliasTarget,
} from '../src/routes';
import type { RouteContextEntry } from '../src/types';

/**
 * The RouteRegistry + guard registry are the client name→component half of the
 * router face (FC-22). These exercise the boot invariants (spec §7) and the flat
 * guardrail without a router: bind names, assert every entry resolves, reject a
 * duplicate or an unbound name.
 */

const Noop = () => null;
const Guard = ({ children }: { children: React.ReactNode }) => children as never;

function entry(overrides: Partial<RouteContextEntry> = {}): RouteContextEntry {
    return {
        routeName: 'circuits.index',
        path: 'circuits',
        shell: 'app',
        lazy: false,
        guard: null,
        mounts: 'list',
        widget: null,
        resource: 'circuits',
        ...overrides,
    };
}

describe('RouteRegistry', () => {
    it('binds and resolves a route by name', () => {
        const registry = createRouteRegistry();
        expect(registry.hasRoute('circuits.index')).toBe(false);

        registry.registerRoute('circuits.index', Noop);

        expect(registry.hasRoute('circuits.index')).toBe(true);
        expect(registry.resolveRoute('circuits.index')).toBe(Noop);
        expect(registry.routeNames()).toContain('circuits.index');
    });
});

describe('GuardRegistry', () => {
    it('binds and resolves a guard by key', () => {
        const guards = createGuardRegistry();
        guards.registerGuard('root', Guard);

        expect(guards.hasGuard('root')).toBe(true);
        expect(guards.resolveGuard('root')).toBe(Guard);
        expect(guards.resolveGuard('missing')).toBeUndefined();
    });
});

describe('assertRouteContext', () => {
    it('passes when every entry binds to a registered route', () => {
        const registry = createRouteRegistry();
        registry.registerRoute('circuits.index', Noop);
        registry.registerRoute('threads.index', Noop);

        expect(() =>
            assertRouteContext(
                [entry(), entry({ routeName: 'threads.index', path: 'threads' })],
                registry,
            ),
        ).not.toThrow();
    });

    it('throws on a duplicate routeName across the RouteContext', () => {
        const registry = createRouteRegistry();
        registry.registerRoute('circuits.index', Noop);

        expect(() => assertRouteContext([entry(), entry()], registry)).toThrow(
            /duplicate routeName "circuits.index"/,
        );
    });

    it('throws on an unbound routeName', () => {
        const registry = createRouteRegistry();
        // Nothing registered.

        expect(() => assertRouteContext([entry()], registry)).toThrow(
            /has no component bound in the RouteRegistry/,
        );
    });

    it('rejects a non-string path — the flat guardrail', () => {
        const registry = createRouteRegistry();
        registry.registerRoute('bad.route', Noop);

        const nested = entry({ routeName: 'bad.route', path: undefined as never });

        expect(() => assertRouteContext([nested], registry)).toThrow(/RouteContext is flat/);
    });
});

describe('resolveAliasTarget', () => {
    it('resolves a static path→path alias', () => {
        expect(
            resolveAliasTarget({ from: '/review-queue', to: '/review', preserveQuery: false }, {}, ''),
        ).toBe('/review');
    });

    it('interpolates a :id param present in both from and to', () => {
        expect(
            resolveAliasTarget(
                { from: '/assistants/:id', to: '/threads/assistants/:id', preserveQuery: false },
                { id: 'abc' },
                '',
            ),
        ).toBe('/threads/assistants/abc');
    });

    it('preserves the query string when preserveQuery is set', () => {
        expect(
            resolveAliasTarget(
                { from: '/circuit-runs', to: '/system', preserveQuery: true },
                {},
                '?filter[status]=failed',
            ),
        ).toBe('/system?filter[status]=failed');
    });

    it('drops the query when preserveQuery is false', () => {
        expect(
            resolveAliasTarget({ from: '/circuit-runs', to: '/system', preserveQuery: false }, {}, '?x=1'),
        ).toBe('/system');
    });
});
