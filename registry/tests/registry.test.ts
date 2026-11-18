import { describe, expect, it } from 'vitest';
import {
    AmbiguousRegistryMatch,
    DuplicateRegistryKey,
    InvalidRegistryKey,
    Key,
    MissReason,
    OnKeyDuplicate,
    PopulationRequirement,
    RegistryMiss,
    createRegistry,
    foreignKey,
} from '../src/index';

function miss(read: () => unknown): RegistryMiss {
    try {
        read();
    } catch (thrown) {
        if (thrown instanceof RegistryMiss) {
            return thrown;
        }

        throw thrown;
    }

    throw new Error('The read did not miss.');
}

const displays = (keys: readonly { display: string }[]): string[] => keys.map((key) => key.display);

describe('the enums', () => {
    it('carry the PHP kernel\'s backed values', () => {
        expect(OnKeyDuplicate).toEqual({ Supersede: 'supersede', Reject: 'reject', Admit: 'admit' });
        expect(PopulationRequirement).toEqual({ Required: 'required', Optional: 'optional' });
        expect(MissReason).toEqual({ Absent: 'absent', Ambiguous: 'ambiguous', Unpopulated: 'unpopulated' });
    });
});

describe('a declaration', () => {
    it('defaults to supersede, optional and no description', () => {
        const registry = createRegistry<string>({ root: 'frame.routes' });

        expect(registry.declaration.root.display).toBe('frame.routes');
        expect(registry.declaration.onKeyDuplicate).toBe(OnKeyDuplicate.Supersede);
        expect(registry.declaration.populationRequirement).toBe(PopulationRequirement.Optional);
        expect(registry.declaration.description).toBeNull();
    });

    it('carries what it was given', () => {
        const registry = createRegistry<string>({
            root: Key.parse('frame.guards'),
            onKeyDuplicate: OnKeyDuplicate.Reject,
            populationRequirement: PopulationRequirement.Required,
            description: 'guard components by key',
        });

        expect(registry.declaration).toEqual({
            root: Key.parse('frame.guards'),
            onKeyDuplicate: 'reject',
            populationRequirement: 'required',
            description: 'guard components by key',
        });
    });

    it('refuses an illegal root, and the zero-segment root', () => {
        expect(() => createRegistry({ root: 'Frame.Routes' })).toThrow(InvalidRegistryKey);
        expect(() => createRegistry({ root: '' })).toThrow(InvalidRegistryKey);
        expect(() => createRegistry({ root: Key.root() })).toThrow(InvalidRegistryKey);
    });
});

describe('keys go in relative and come out absolute', () => {
    it('joins the root onto a relative key and leaves an absolute one alone', () => {
        const registry = createRegistry<string>({ root: 'beam.resources' });

        registry.register('invoices', 'a', 'pkg/a').register('beam.resources.orders', 'b', 'pkg/a');

        expect(displays(registry.keys())).toEqual(['beam.resources.invoices', 'beam.resources.orders']);
        expect(registry.resolve('invoices')).toBe('a');
        expect(registry.resolve('beam.resources.invoices')).toBe('a');
        expect(registry.resolve(Key.parse('orders'))).toBe('b');
        expect(registry.has('orders')).toBe(true);
        expect(registry.has('beam.resources.orders')).toBe(true);
    });

    it('reads a key under another root as relative', () => {
        const registry = createRegistry<string>({ root: 'beam.resources' });

        registry.register('graph.stores', 'a', 'pkg/a');

        expect(displays(registry.keys())).toEqual(['beam.resources.graph.stores']);
    });

    it('lets an entry sit at the root itself', () => {
        const registry = createRegistry<string>({ root: 'beam.resources' });

        registry.register('beam.resources', 'the root entry', 'pkg/a');

        expect(registry.resolve('beam.resources')).toBe('the root entry');
        expect(registry.resolve(Key.root())).toBe('the root entry');
    });

    it('refuses an illegal key string on every method, before any lookup', () => {
        const registry = createRegistry<string>({ root: 'beam.resources' });

        expect(() => registry.register('Invoices', 'a', 'pkg/a')).toThrow(InvalidRegistryKey);
        expect(() => registry.has('')).toThrow(InvalidRegistryKey);
        expect(() => registry.resolve('a/b')).toThrow(InvalidRegistryKey);
        expect(() => registry.tryResolve(' invoices')).toThrow(InvalidRegistryKey);
        expect(() => registry.matches('a..b')).toThrow(InvalidRegistryKey);
        expect(() => registry.registrantOf('A')).toThrow(InvalidRegistryKey);
        expect(() => registry.superseded('A')).toThrow(InvalidRegistryKey);
    });
});

describe('a carried key', () => {
    it('is stored as given, never joined to the root, and found by its segments', () => {
        const registry = createRegistry<string>({ root: 'frame.routes' });
        const name = foreignKey(['Admin/Users.Index'], 'Admin/Users.Index');

        registry.register(name, 'users page', 'pkg/host');

        expect(registry.keys()).toEqual([name]);
        expect(registry.resolve(foreignKey(['Admin/Users.Index'], 'shown another way'))).toBe('users page');
        expect(registry.registrantOf(name)).toBe('pkg/host');
        expect(registry.matches('frame.routes')).toEqual([]);
    });

    it('is under the root when its segments begin with the root\'s, and matches(root) returns it', () => {
        const registry = createRegistry<string>({ root: 'beam.ux.chrome.layouts' });
        const key = foreignKey(['beam', 'ux', 'chrome', 'layouts', 'DocsLayout'], 'beam.ux.chrome.layouts.DocsLayout');

        registry.register(key, 'the docs layout', 'pkg/beam-ux');

        expect(registry.matches('beam.ux.chrome.layouts')).toEqual(['the docs layout']);
        expect(registry.has(key)).toBe(true);
        expect(registry.resolve(key)).toBe('the docs layout');
        expect(displays(registry.keys())).toEqual(['beam.ux.chrome.layouts.DocsLayout']);
    });

    it('is told apart from another key that displays the same', () => {
        const registry = createRegistry<string>({ root: 'frame.routes', onKeyDuplicate: OnKeyDuplicate.Reject });

        registry.register(foreignKey(['beam', 'realm'], 'beam.realm'), 'two segments', 'pkg/a');
        registry.register(foreignKey(['beam.realm'], 'beam.realm'), 'one segment', 'pkg/b');

        expect(registry.resolve(foreignKey(['beam', 'realm'], 'beam.realm'))).toBe('two segments');
        expect(registry.resolve(foreignKey(['beam.realm'], 'beam.realm'))).toBe('one segment');
        expect(registry.keys()).toHaveLength(2);
    });
});

describe('OnKeyDuplicate.Supersede', () => {
    it('lets the later write take the key', () => {
        const registry = createRegistry<string>({ root: 'frame.routes' });

        registry.register('home', 'first', 'pkg/frame').register('home', 'second', 'app/host');

        expect(registry.resolve('home')).toBe('second');
        expect(registry.matches('frame.routes')).toEqual(['second']);
        expect(registry.registrantOf('home')).toBe('app/host');
        expect(displays(registry.keys())).toEqual(['frame.routes.home']);
    });

    it('reads a superseded entry back with both registrants', () => {
        const registry = createRegistry<string>({ root: 'frame.routes' });

        registry.register('home', 'first', 'pkg/frame').register('home', 'second', 'app/host');

        const [displaced, ...rest] = registry.superseded('home');

        expect(rest).toEqual([]);
        expect(displaced?.entry).toBe('first');
        expect(displaced?.by).toBe('pkg/frame');
        expect(displaced?.supersededBy).toBe('app/host');
        expect(displaced?.key.display).toBe('frame.routes.home');
        expect(displaced?.sequence).toBe(0);
    });

    it('records each displacement, oldest first', () => {
        const registry = createRegistry<string>({ root: 'frame.routes' });

        registry.register('other', 'x', 'pkg/x');
        registry.register('home', 'first', 'pkg/a').register('home', 'second', null).register('home', 'third', 'pkg/c');

        expect(registry.superseded('home').map(({ entry, by, supersededBy, sequence }) => ({ entry, by, supersededBy, sequence }))).toEqual([
            { entry: 'first', by: 'pkg/a', supersededBy: null, sequence: 1 },
            { entry: 'second', by: null, supersededBy: 'pkg/c', sequence: 2 },
        ]);
        expect(registry.resolve('home')).toBe('third');
        expect(registry.superseded('other')).toEqual([]);
        expect(registry.superseded('never.registered')).toEqual([]);
    });

    it('keeps the displaced entry\'s place in the order', () => {
        const registry = createRegistry<string>({ root: 'beam.realms' });

        for (const realm of ['operator', 'tenant', 'site', 'user']) {
            registry.register(realm, realm, 'pkg/beam');
        }

        registry.register('operator', 'operator, overridden', 'app/host');

        expect(displays(registry.keys())).toEqual(['beam.realms.operator', 'beam.realms.tenant', 'beam.realms.site', 'beam.realms.user']);
        expect(registry.matches('beam.realms')).toEqual(['operator, overridden', 'tenant', 'site', 'user']);
    });

    it('hands back a copy of the record, not the list it keeps', () => {
        const registry = createRegistry<string>({ root: 'frame.routes' });

        registry.register('home', 'first', 'pkg/a').register('home', 'second', 'pkg/b');
        registry.superseded('home').pop();

        expect(registry.superseded('home')).toHaveLength(1);
    });
});

describe('OnKeyDuplicate.Reject', () => {
    it('throws on a taken key, naming both registrants, and keeps the first entry', () => {
        const registry = createRegistry<string>({ root: 'frame.guards', onKeyDuplicate: OnKeyDuplicate.Reject });

        registry.register('root', 'first', 'pkg/frame');

        let thrown: unknown;

        try {
            registry.register('frame.guards.root', 'second', 'app/host');
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(DuplicateRegistryKey);
        expect(thrown).not.toBeInstanceOf(RegistryMiss);

        const duplicate = thrown as DuplicateRegistryKey;

        expect(duplicate.key.display).toBe('frame.guards.root');
        expect(duplicate.existing).toBe('pkg/frame');
        expect(duplicate.incoming).toBe('app/host');
        expect(duplicate.message).toContain('`frame.guards.root`');
        expect(duplicate.message).toContain('pkg/frame');
        expect(duplicate.message).toContain('app/host');

        expect(registry.resolve('root')).toBe('first');
        expect(registry.registrantOf('root')).toBe('pkg/frame');
        expect(registry.superseded('root')).toEqual([]);
    });

    it('takes a different key', () => {
        const registry = createRegistry<string>({ root: 'frame.guards', onKeyDuplicate: OnKeyDuplicate.Reject });

        registry.register('root', 'a', 'pkg/a').register('tenant', 'b', 'pkg/b');

        expect(registry.matches('frame.guards')).toEqual(['a', 'b']);
    });
});

describe('OnKeyDuplicate.Admit', () => {
    const admitted = () =>
        createRegistry<string>({ root: 'mainframe.slots', onKeyDuplicate: OnKeyDuplicate.Admit })
            .register('header', 'first', 'pkg/a')
            .register('footer', 'only', 'pkg/a')
            .register('header', 'second', 'pkg/b');

    it('keeps both entries, each in its own place in the order', () => {
        const registry = admitted();

        expect(registry.matches('header')).toEqual(['first', 'second']);
        expect(registry.matches('mainframe.slots')).toEqual(['first', 'only', 'second']);
        expect(displays(registry.keys())).toEqual(['mainframe.slots.header', 'mainframe.slots.footer']);
        expect(registry.has('header')).toBe(true);
        expect(registry.superseded('header')).toEqual([]);
    });

    it('makes a bare resolve of the shared key ambiguous, and tryResolve throws the same', () => {
        const registry = admitted();
        const ambiguous = miss(() => registry.resolve('header'));

        expect(ambiguous).toBeInstanceOf(AmbiguousRegistryMatch);
        expect(ambiguous.reason).toBe(MissReason.Ambiguous);
        expect(ambiguous.key.display).toBe('mainframe.slots.header');
        expect(ambiguous.candidates.map(({ key, by }) => [key.display, by])).toEqual([
            ['mainframe.slots.header', 'pkg/a'],
            ['mainframe.slots.header', 'pkg/b'],
        ]);
        expect(ambiguous.message).toContain('pkg/a');
        expect(ambiguous.message).toContain('pkg/b');
        expect(() => registry.tryResolve('header')).toThrow(AmbiguousRegistryMatch);
    });

    it('resolves a key that holds one entry', () => {
        expect(admitted().resolve('footer')).toBe('only');
    });

    it('answers registrantOf with the first registrant', () => {
        expect(admitted().registrantOf('header')).toBe('pkg/a');
    });
});

describe('a miss says why', () => {
    it('absent: nothing at the key and nothing under it', () => {
        const registry = createRegistry<string>({ root: 'frame.routes' }).register('home', 'a', 'pkg/a');
        const absent = miss(() => registry.resolve('about'));

        expect(absent.reason).toBe(MissReason.Absent);
        expect(absent).not.toBeInstanceOf(AmbiguousRegistryMatch);
        expect(absent.key.display).toBe('frame.routes.about');
        expect(absent.candidates).toEqual([]);
        expect(absent.message).toContain('`frame.routes.about`');
        expect(registry.tryResolve('about')).toBeNull();
        expect(registry.has('about')).toBe(false);
        expect(registry.registrantOf('about')).toBeNull();
    });

    it('absent on an empty registry that is optional', () => {
        const registry = createRegistry<string>({ root: 'frame.routes' });

        expect(miss(() => registry.resolve('home')).reason).toBe(MissReason.Absent);
        expect(registry.tryResolve('home')).toBeNull();
    });

    it('ambiguous: the key names a branch, under any policy', () => {
        for (const onKeyDuplicate of Object.values(OnKeyDuplicate)) {
            const registry = createRegistry<string>({ root: 'beam.resources', onKeyDuplicate })
                .register('invoices.index', 'a', 'pkg/a')
                .register('invoices.show', 'b', 'pkg/b');
            const ambiguous = miss(() => registry.resolve('invoices'));

            expect(ambiguous, onKeyDuplicate).toBeInstanceOf(AmbiguousRegistryMatch);
            expect(ambiguous.reason, onKeyDuplicate).toBe(MissReason.Ambiguous);
            expect(displays(ambiguous.candidates.map((candidate) => candidate.key))).toEqual(['beam.resources.invoices.index', 'beam.resources.invoices.show']);
            expect(() => registry.tryResolve('invoices'), onKeyDuplicate).toThrow(AmbiguousRegistryMatch);
            expect(registry.has('invoices'), onKeyDuplicate).toBe(false);
        }
    });

    it('ambiguous even with one entry under the branch: resolve never reaches down', () => {
        const registry = createRegistry<string>({ root: 'beam.resources' }).register('invoices.index', 'a', 'pkg/a');

        expect(miss(() => registry.resolve('invoices')).reason).toBe(MissReason.Ambiguous);
        expect(miss(() => registry.resolve('beam.resources')).reason).toBe(MissReason.Ambiguous);
    });

    it('never walks up: an entry at a parent does not answer for a child', () => {
        const registry = createRegistry<string>({ root: 'beam.resources' }).register('invoices', 'a', 'pkg/a');

        expect(miss(() => registry.resolve('invoices.show')).reason).toBe(MissReason.Absent);
    });

    it('unpopulated: a required registry with nothing in it', () => {
        const registry = createRegistry<string>({ root: 'frame.routes', populationRequirement: PopulationRequirement.Required });
        const unpopulated = miss(() => registry.resolve('home'));

        expect(unpopulated.reason).toBe(MissReason.Unpopulated);
        expect(unpopulated).not.toBeInstanceOf(AmbiguousRegistryMatch);
        expect(unpopulated.key.display).toBe('frame.routes.home');
        expect(unpopulated.message).toContain('`frame.routes`');
        expect(registry.tryResolve('home')).toBeNull();
        expect(registry.has('home')).toBe(false);
        expect(registry.matches('frame.routes')).toEqual([]);
        expect(registry.keys()).toEqual([]);
    });

    it('unpopulated stops once anything is registered', () => {
        const registry = createRegistry<string>({ root: 'frame.routes', populationRequirement: PopulationRequirement.Required });

        registry.register('home', 'a', 'pkg/a');

        expect(miss(() => registry.resolve('about')).reason).toBe(MissReason.Absent);
    });
});

describe('matches', () => {
    const registry = createRegistry<string>({ root: 'beam' })
        .register('realm.overlays', 'overlays', 'pkg/a')
        .register('realms', 'realms', 'pkg/a')
        .register('realm', 'realm', 'pkg/a')
        .register('realm.tenant', 'tenant', 'pkg/a');

    it('returns the entry at the key and every entry under it, in registration order', () => {
        expect(registry.matches('realm')).toEqual(['overlays', 'realm', 'tenant']);
        expect(registry.matches('beam')).toEqual(['overlays', 'realms', 'realm', 'tenant']);
        expect(registry.matches(Key.root())).toEqual(['overlays', 'realms', 'realm', 'tenant']);
    });

    it('compares by segment: beam.realms is not under beam.realm', () => {
        expect(registry.matches('realm')).not.toContain('realms');
        expect(registry.matches('realms')).toEqual(['realms']);
    });

    it('is empty for a key nothing is at or under', () => {
        expect(registry.matches('particle')).toEqual([]);
    });
});

describe('an entry that is null or undefined', () => {
    it('is still an entry', () => {
        const registry = createRegistry<string | undefined>({ root: 'frame.routes' }).register('home', undefined, 'pkg/a');

        expect(registry.has('home')).toBe(true);
        expect(registry.resolve('home')).toBeUndefined();
        expect(registry.matches('home')).toEqual([undefined]);
    });
});
