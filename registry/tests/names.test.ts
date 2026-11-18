import { describe, expect, it } from 'vitest';
import { AmbiguousRegistryMatch, Key, OnKeyDuplicate, DuplicateRegistryKey, createRegistry, createRegistryIndex, type Registry } from '../src/index';

const displays = (keys: readonly { display: string }[]): string[] => keys.map((key) => key.display);

/** What a wrapper with a `Map.get` contract writes: any string in, the entry or undefined out, never a throw. */
function get<T>(registry: Registry<T>, name: string): T | undefined {
    const key = registry.keyFor(name);

    return registry.has(key) ? registry.resolve(key) : undefined;
}

describe('keyFor', () => {
    const registry = createRegistry<string>({ root: 'beam.ux.chrome.layouts' });

    it('parses a legal name and joins it to the root, as register does', () => {
        expect(registry.keyFor('docs')).toBeInstanceOf(Key);
        expect(registry.keyFor('docs').segments).toEqual(['beam', 'ux', 'chrome', 'layouts', 'docs']);
        expect(registry.keyFor('tenants.index').segments).toEqual(['beam', 'ux', 'chrome', 'layouts', 'tenants', 'index']);
        expect(registry.keyFor('beam.ux.chrome.layouts.docs').display).toBe('beam.ux.chrome.layouts.docs');
    });

    it.each(['DocsLayout', 'contentSection', 'Admin/Users', 'Admin.Users', 'two words', ' docs', 'a..b', '.', ''])(
        'carries %j as one segment under the root, and never throws',
        (name) => {
            const key = registry.keyFor(name);

            expect(key.segments).toEqual(['beam', 'ux', 'chrome', 'layouts', name]);
            expect(key.display).toBe(`beam.ux.chrome.layouts.${name}`);
        },
    );
});

describe('names', () => {
    it.each(['docs', 'tenants.index', 'sub:tirzepatide', 'DocsLayout', 'Admin/Users', 'Admin.Users', 'two words', ''])('round-trips %j', (name) => {
        const registry = createRegistry<string>({ root: 'beam.ux.chrome.layouts' });

        registry.register(registry.keyFor(name), 'entry', 'pkg/a');

        expect(registry.names()).toEqual([name]);
        expect(get(registry, name)).toBe('entry');
        expect(registry.registrantOf(registry.keyFor(name))).toBe('pkg/a');
        expect(registry.matches('beam.ux.chrome.layouts')).toEqual(['entry']);
    });

    it('lists names in registration order, each once, whatever the policy', () => {
        const registry = createRegistry<string>({ root: 'frame.routes', onKeyDuplicate: OnKeyDuplicate.Admit });

        for (const name of ['Home', 'tenants.index', 'Home', 'about']) {
            registry.register(registry.keyFor(name), name, 'pkg/a');
        }

        expect(registry.names()).toEqual(['Home', 'tenants.index', 'about']);
    });

    it('does not round-trip a legal name that spells the root: it is read as already absolute', () => {
        const registry = createRegistry<string>({ root: 'frame.routes' });

        registry.register(registry.keyFor('frame.routes.home'), 'a', 'pkg/a').register(registry.keyFor('frame.routes'), 'b', 'pkg/a');

        expect(registry.names()).toEqual(['home', '']);
    });

    it('names a carried key outside the root by its display string', () => {
        const registry = createRegistry<string>({ root: 'frame.routes' });

        registry.register({ segments: ['Elsewhere'], display: 'Elsewhere!' }, 'a', 'pkg/a');

        expect(registry.names()).toEqual(['Elsewhere!']);
    });

    it('lists an index\'s roots', () => {
        const index = createRegistryIndex().describe(createRegistry({ root: 'frame.routes' }), 'pkg/a');

        expect(index.names()).toEqual(['', 'frame.routes']);
        expect(index.keyFor('frame.routes').display).toBe('frame.routes');
        expect(index.keyFor('Frame').segments).toEqual(['Frame']);
    });
});

describe('two sibling registries holding the same name', () => {
    const layouts = createRegistry<string>({ root: 'beam.ux.chrome.layouts', onKeyDuplicate: OnKeyDuplicate.Reject });
    const templates = createRegistry<string>({ root: 'beam.ux.chrome.templates' });
    const index = createRegistryIndex().describe(layouts, 'pkg/beam-ux').describe(templates, 'pkg/beam-ux');

    layouts.register(layouts.keyFor('DocsLayout'), 'a layout', 'pkg/beam-ux');
    templates.register(templates.keyFor('DocsLayout'), 'a template', 'pkg/beam-ux');
    layouts.register(layouts.keyFor('WideLayout'), 'only a layout', 'app/host');

    it('have different keys for it', () => {
        expect(displays(layouts.keys())).toEqual(['beam.ux.chrome.layouts.DocsLayout', 'beam.ux.chrome.layouts.WideLayout']);
        expect(displays(templates.keys())).toEqual(['beam.ux.chrome.templates.DocsLayout']);
        expect(layouts.keyFor('DocsLayout').segments).not.toEqual(templates.keyFor('DocsLayout').segments);
    });

    it('are each reached by the index for their own key', () => {
        expect(index.routeTo(layouts.keyFor('DocsLayout'))).toBe(layouts);
        expect(index.routeTo(templates.keyFor('DocsLayout'))).toBe(templates);
        expect(index.ownerOf(templates.keyFor('DocsLayout')).resolve(templates.keyFor('DocsLayout'))).toBe('a template');
    });

    it('miss in one what is registered only in the other', () => {
        expect(get(layouts, 'WideLayout')).toBe('only a layout');
        expect(get(templates, 'WideLayout')).toBeUndefined();
        expect(templates.has(layouts.keyFor('WideLayout'))).toBe(false);
        expect(templates.tryResolve(templates.keyFor('WideLayout'))).toBeNull();
    });

    it('apply the declared policy, and keep the registrant and the history, for a carried name', () => {
        expect(() => layouts.register(layouts.keyFor('DocsLayout'), 'again', 'app/host')).toThrow(DuplicateRegistryKey);

        templates.register(templates.keyFor('DocsLayout'), 'a host template', 'app/host');

        expect(templates.registrantOf(templates.keyFor('DocsLayout'))).toBe('app/host');
        expect(templates.superseded(templates.keyFor('DocsLayout')).map(({ by, supersededBy }) => [by, supersededBy])).toEqual([['pkg/beam-ux', 'app/host']]);
    });
});

describe('tryResolve is not Map.get', () => {
    const routes = createRegistry<string>({ root: 'frame.routes' }).register('tenants.index', 'index', 'pkg/a').register('tenants.edit', 'edit', 'pkg/a');

    it('throws for a name that is a branch of registered names, where a Map answered undefined', () => {
        expect(routes.has('tenants')).toBe(false);
        expect(() => routes.tryResolve('tenants')).toThrow(AmbiguousRegistryMatch);
        expect(() => routes.tryResolve(routes.keyFor('tenants'))).toThrow(AmbiguousRegistryMatch);
    });

    it('so a wrapper asks has first, and that never throws', () => {
        expect(get(routes, 'tenants')).toBeUndefined();
        expect(get(routes, 'tenants.index')).toBe('index');
        expect(get(routes, 'Tenants/Index')).toBeUndefined();
        expect(get(routes, '')).toBeUndefined();
    });
});

describe('a canonical key from another copy of this package', () => {
    // What a `Key` built by a second copy in the same bundle looks like to this one: the same
    // shape and the same registered symbol, and not an instance of this copy's class.
    const fromAnotherCopy = (segments: string[]) => ({ segments, display: segments.join('.'), [Symbol.for('@schemastud/registry/canonical-key')]: true as const });

    it('is still joined to the root', () => {
        const registry = createRegistry<string>({ root: 'frame.routes' });
        const key = fromAnotherCopy(['home']);

        expect(key).not.toBeInstanceOf(Key);

        registry.register(key, 'home page', 'pkg/a');

        expect(displays(registry.keys())).toEqual(['frame.routes.home']);
        expect(registry.resolve('home')).toBe('home page');
        expect(registry.resolve(fromAnotherCopy(['frame', 'routes', 'home']))).toBe('home page');
        expect(registry.matches('frame.routes')).toEqual(['home page']);
    });

    it('is not what a plain carried key is taken for', () => {
        const registry = createRegistry<string>({ root: 'frame.routes' });

        registry.register({ segments: ['home'], display: 'home' }, 'carried', 'pkg/a');

        expect(displays(registry.keys())).toEqual(['home']);
        expect(registry.has('home')).toBe(false);
    });
});
