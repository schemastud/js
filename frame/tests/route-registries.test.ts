import { describe, expect, it } from 'vitest';
import { createGuardRegistry, createRouteRegistry, createShellRegistry } from '../src/routes';

/**
 * The route, guard and shell registries sit on `@schemastud/registry` and keep the interface they had as
 * `Map` wrappers. These pin what a caller sees: a duplicate replaces in place and is recorded, a registrant
 * can be read back, a miss is `undefined`, and any string is a name.
 */

const First = () => null;
const Second = () => null;
const Third = () => null;
const Wrap = ({ children }: { children: React.ReactNode }) => children as never;
const OtherWrap = ({ children }: { children: React.ReactNode }) => children as never;

// One row per registry, so every claim below is made of all three through their own method names.
const registries = [
    {
        label: 'route',
        make() {
            const registry = createRouteRegistry();

            return {
                register: registry.registerRoute,
                has: registry.hasRoute,
                resolve: registry.resolveRoute as (name: string) => unknown,
                registrant: registry.routeRegistrant!,
                superseded: registry.supersededRoutes! as (name: string) => { component: unknown; by: string | null; supersededBy: string | null }[],
            };
        },
        a: First,
        b: Second,
    },
    {
        label: 'guard',
        make() {
            const registry = createGuardRegistry();

            return {
                register: registry.registerGuard as never,
                has: registry.hasGuard,
                resolve: registry.resolveGuard as (name: string) => unknown,
                registrant: registry.guardRegistrant!,
                superseded: registry.supersededGuards! as (name: string) => { component: unknown; by: string | null; supersededBy: string | null }[],
            };
        },
        a: Wrap,
        b: OtherWrap,
    },
    {
        label: 'shell',
        make() {
            const registry = createShellRegistry();

            return {
                register: registry.registerShell,
                has: registry.hasShell,
                resolve: registry.resolveShell as (name: string) => unknown,
                registrant: registry.shellRegistrant!,
                superseded: registry.supersededShells! as (name: string) => { component: unknown; by: string | null; supersededBy: string | null }[],
            };
        },
        a: First,
        b: Second,
    },
] as const;

describe.each(registries)('the $label registry', ({ make, a, b }) => {
    type Register = (name: string, component: unknown, by?: string) => void;

    it('reads back who registered an entry', () => {
        const registry = make();
        const register = registry.register as Register;

        register('tenants.index', a, '@splicewire/tower-ux');

        expect(registry.registrant('tenants.index')).toBe('@splicewire/tower-ux');
    });

    it('answers null for the registrant of a name bound without one, and of a name nothing bound', () => {
        const registry = make();
        const register = registry.register as Register;

        register('tenants.index', a);

        expect(registry.registrant('tenants.index')).toBeNull();
        expect(registry.registrant('missing')).toBeNull();
    });

    it('replaces on a duplicate without throwing, and records what was displaced and by whom', () => {
        const registry = make();
        const register = registry.register as Register;

        register('tenants.index', a, '@splicewire/tower-ux');
        expect(registry.superseded('tenants.index')).toEqual([]);

        expect(() => register('tenants.index', b, 'app/host')).not.toThrow();

        expect(registry.resolve('tenants.index')).toBe(b);
        expect(registry.registrant('tenants.index')).toBe('app/host');
        expect(registry.superseded('tenants.index')).toEqual([
            { component: a, by: '@splicewire/tower-ux', supersededBy: 'app/host' },
        ]);
    });

    it('answers undefined for a branch name: a name that only prefixes bound names is not bound', () => {
        const registry = make();
        const register = registry.register as Register;

        register('tenants.index', a);
        register('tenants.edit', b);

        expect(registry.has('tenants')).toBe(false);
        expect(registry.resolve('tenants')).toBeUndefined();
        expect(registry.registrant('tenants')).toBeNull();
    });

    it('answers undefined for a name nothing bound, in an empty registry and a populated one', () => {
        const registry = make();
        const register = registry.register as Register;

        expect(registry.resolve('missing')).toBeUndefined();

        register('tenants.index', a);

        expect(registry.resolve('missing')).toBeUndefined();
        expect(registry.has('missing')).toBe(false);
    });

    it.each([['Admin/Users'], ['DocsLayout'], ['tenants index'], ['Tenants.Index'], ['']])(
        'binds and resolves %j, a name that is not a legal registry key, without throwing',
        (name) => {
            const registry = make();
            const register = registry.register as Register;

            expect(registry.has(name)).toBe(false);
            expect(registry.resolve(name)).toBeUndefined();

            expect(() => register(name, a, 'app/host')).not.toThrow();

            expect(registry.has(name)).toBe(true);
            expect(registry.resolve(name)).toBe(a);
            expect(registry.registrant(name)).toBe('app/host');
        },
    );

    it('keeps names that differ only by case or separator apart', () => {
        const registry = make();
        const register = registry.register as Register;

        register('tenants.index', a);
        register('Tenants.Index', b);

        expect(registry.resolve('tenants.index')).toBe(a);
        expect(registry.resolve('Tenants.Index')).toBe(b);
        expect(registry.has('tenants/index')).toBe(false);
    });

    it('ignores a registrant that is not a string, as when the method is handed to an iterator', () => {
        const registry = make();
        const register = registry.register as (name: string, component: unknown, by?: unknown) => void;

        register('tenants.index', a, 0);

        expect(registry.registrant('tenants.index')).toBeNull();
    });
});

describe('routeNames()', () => {
    it('lists names in registration order, each once', () => {
        const registry = createRouteRegistry();

        registry.registerRoute('plans.index', First);
        registry.registerRoute('tenants.index', Second);
        registry.registerRoute('Admin/Users', Third);
        registry.registerRoute('', First);

        expect(registry.routeNames()).toEqual(['plans.index', 'tenants.index', 'Admin/Users', '']);
    });

    it('keeps an overridden name in its first place', () => {
        const registry = createRouteRegistry();

        registry.registerRoute('plans.index', First);
        registry.registerRoute('tenants.index', First);
        registry.registerRoute('usage.index', First);
        registry.registerRoute('tenants.index', Second);

        expect(registry.routeNames()).toEqual(['plans.index', 'tenants.index', 'usage.index']);
        expect(registry.resolveRoute('tenants.index')).toBe(Second);
    });

    it('is empty for a new registry', () => {
        expect(createRouteRegistry().routeNames()).toEqual([]);
    });

    // The registries are rooted at `frame.routes`, `frame.guards` and `frame.shells`. A route may be
    // named with those words: it is still its own name, never an absolute spelling of another.
    it('keeps a name that begins with the registry root as its own name', () => {
        const registry = createRouteRegistry();

        registry.registerRoute('home', First);
        registry.registerRoute('frame.routes.home', Second);
        registry.registerRoute('frame.routes', Third);

        expect(registry.routeNames()).toEqual(['home', 'frame.routes.home', 'frame.routes']);
        expect(registry.resolveRoute('home')).toBe(First);
        expect(registry.resolveRoute('frame.routes.home')).toBe(Second);
        expect(registry.resolveRoute('frame.routes')).toBe(Third);
        expect(registry.supersededRoutes?.('home')).toEqual([]);
    });
});

describe('each factory call', () => {
    it('makes its own registry', () => {
        const one = createRouteRegistry();
        const two = createRouteRegistry();

        one.registerRoute('tenants.index', First);

        expect(two.hasRoute('tenants.index')).toBe(false);
        expect(two.routeNames()).toEqual([]);
    });

    it('returns methods that work detached from the object', () => {
        const { registerRoute, resolveRoute, routeNames } = createRouteRegistry();

        registerRoute('tenants.index', First);

        expect(resolveRoute('tenants.index')).toBe(First);
        expect(routeNames()).toEqual(['tenants.index']);
    });
});
