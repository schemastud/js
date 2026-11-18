import { describe, expect, it } from 'vitest';
import {
    AmbiguousRegistryMatch,
    InvalidRegistryKey,
    Key,
    OnKeyDuplicate,
    PopulationRequirement,
    RegistryMiss,
    UnregisteredRegistry,
    createRegistry,
    createRegistryIndex,
} from '../src/index';

const displays = (keys: readonly { display: string }[]): string[] => keys.map((key) => key.display);

describe('a new index', () => {
    it('holds itself at the zero-segment root', () => {
        const index = createRegistryIndex();

        expect(index.declaration.root.segments).toEqual([]);
        expect(index.declaration.onKeyDuplicate).toBe(OnKeyDuplicate.Supersede);
        expect(index.declaration.populationRequirement).toBe(PopulationRequirement.Required);
        expect(displays(index.keys())).toEqual(['']);
        expect(index.resolve(Key.root())).toBe(index);
        expect(index.routeTo(Key.root())).toBe(index);
        expect(index.owner(Key.root())).toBe(index);
        expect(index.registrantOf(Key.root())).toBe('@schemastud/registry');
    });
});

describe('describe', () => {
    it('takes a registry at the root it declares, with who described it', () => {
        const index = createRegistryIndex();
        const routes = createRegistry<string>({ root: 'frame.routes' });
        const guards = createRegistry<string>({ root: 'frame.guards' });

        expect(index.describe(routes, '@schemastud/frame').describe(guards, 'app/host')).toBe(index);

        expect(displays(index.keys())).toEqual(['', 'frame.routes', 'frame.guards']);
        expect(index.has('frame.routes')).toBe(true);
        expect(index.resolve('frame.routes')).toBe(routes);
        expect(index.registrantOf('frame.routes')).toBe('@schemastud/frame');
        expect(index.registrantOf('frame.guards')).toBe('app/host');
        expect(index.registrantOf('frame.shells')).toBeNull();
    });

    it('records the registry a second describe of the same root displaced, with both registrants', () => {
        const index = createRegistryIndex();
        const first = createRegistry<string>({ root: 'frame.routes' });
        const second = createRegistry<string>({ root: 'frame.routes' });

        index.describe(first, 'pkg/a').describe(second, 'pkg/b');

        expect(index.routeTo('frame.routes.home')).toBe(second);
        expect(index.registrantOf('frame.routes')).toBe('pkg/b');
        expect(index.superseded('frame.routes').map(({ entry, by, supersededBy }) => ({ entry, by, supersededBy }))).toEqual([
            { entry: first, by: 'pkg/a', supersededBy: 'pkg/b' },
        ]);
    });

    it('refuses a second index: only the index owns the zero-segment root', () => {
        const index = createRegistryIndex();

        expect(() => index.describe(createRegistryIndex(), 'pkg/a')).toThrow(InvalidRegistryKey);
        expect(index.routeTo(Key.root())).toBe(index);
    });
});

describe('routeTo', () => {
    it('routes to the longest matching root, by segment', () => {
        const index = createRegistryIndex();
        const realm = createRegistry<string>({ root: 'beam.realm' });
        const overlays = createRegistry<string>({ root: 'beam.realm.overlays' });
        const realms = createRegistry<string>({ root: 'beam.realms' });

        index.describe(realm, 'pkg/a').describe(overlays, 'pkg/a').describe(realms, 'pkg/a');

        expect(index.routeTo('beam.realm.overlays.article')).toBe(overlays);
        expect(index.routeTo('beam.realm.tenant')).toBe(realm);
        expect(index.routeTo('beam.realms.article')).toBe(realms);
    });

    it('does not depend on the order roots were described in', () => {
        const index = createRegistryIndex();
        const overlays = createRegistry<string>({ root: 'beam.realm.overlays' });
        const realm = createRegistry<string>({ root: 'beam.realm' });

        index.describe(overlays, 'pkg/a').describe(realm, 'pkg/a');

        expect(index.routeTo('beam.realm.overlays.article')).toBe(overlays);
    });

    it('hands the key to a registry that then answers by its own rules', () => {
        const index = createRegistryIndex();
        const resources = createRegistry<string>({ root: 'beam.particle.resources' }).register('invoices', 'a', 'pkg/a').register('orders', 'b', 'pkg/a');

        index.describe(resources, 'pkg/a');

        expect(index.routeTo('beam.particle.resources.invoices')?.resolve('beam.particle.resources.invoices')).toBe('a');
        expect(index.routeTo('beam.particle.resources')).toBe(resources);
        expect(() => resources.resolve('beam.particle.resources')).toThrow(AmbiguousRegistryMatch);
    });

    it('never lets its own root swallow a key nothing claims', () => {
        const index = createRegistryIndex();

        index.describe(createRegistry<string>({ root: 'beam.particle.resources' }), 'pkg/a');

        expect(index.routeTo('nothing.claims.this')).toBeNull();
        expect(index.routeTo('beam.particle')).toBeNull();
    });
});

describe('ownerOf', () => {
    it('is routeTo that throws, naming the key and the described roots', () => {
        const index = createRegistryIndex();
        const resources = createRegistry<string>({ root: 'beam.particle.resources' });

        index.describe(resources, 'pkg/a');

        expect(index.ownerOf('beam.particle.resources.invoices')).toBe(resources);

        let thrown: unknown;

        try {
            index.ownerOf('graph.stores.neo4j');
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(UnregisteredRegistry);
        expect(thrown).not.toBeInstanceOf(RegistryMiss);

        const unregistered = thrown as UnregisteredRegistry;

        expect(unregistered.key.display).toBe('graph.stores.neo4j');
        expect(displays(unregistered.roots)).toEqual(['', 'beam.particle.resources']);
        expect(unregistered.message).toContain('`graph.stores.neo4j`');
        expect(unregistered.message).toContain('`beam.particle.resources`');
    });
});

describe('owner', () => {
    it('is the owner object a describe named, otherwise the registry, otherwise null', () => {
        const index = createRegistryIndex();
        const routes = createRegistry<string>({ root: 'frame.routes' });
        const guards = createRegistry<string>({ root: 'frame.guards' });
        const wrapper = { registerRoute: () => undefined };

        index.describe(routes, 'pkg/frame', wrapper).describe(guards, 'pkg/frame');

        expect(index.owner('frame.routes')).toBe(wrapper);
        expect(index.owner('frame.guards')).toBe(guards);
        expect(index.owner('frame.shells')).toBeNull();
        expect(index.resolve('frame.routes')).toBe(routes);
    });

    it('answers for an exact root only', () => {
        const index = createRegistryIndex();

        index.describe(createRegistry<string>({ root: 'frame.routes' }), 'pkg/frame');

        expect(index.owner('frame.routes.home')).toBeNull();
        expect(() => index.owner('frame')).toThrow(AmbiguousRegistryMatch);
    });

    it('does not answer with the owner of a registry that was displaced', () => {
        const index = createRegistryIndex();
        const wrapper = { name: 'the first wrapper' };
        const second = createRegistry<string>({ root: 'frame.routes' });

        index.describe(createRegistry<string>({ root: 'frame.routes' }), 'pkg/a', wrapper).describe(second, 'pkg/b');

        expect(index.owner('frame.routes')).toBe(second);
    });
});
