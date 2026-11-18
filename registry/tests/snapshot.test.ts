import { describe, expect, it } from 'vitest';
import { Key, OnKeyDuplicate, PopulationRequirement, createRegistry, createRegistryIndex, foreignKey, snapshotRegistryIndex } from '../src/index';

describe('snapshotRegistryIndex', () => {
    it('holds no registry for an index that describes none', () => {
        expect(snapshotRegistryIndex(createRegistryIndex())).toEqual({ version: 1, registries: [] });
    });

    it('carries each described root, declaration, key and registrant, in order, and never an entry', () => {
        const layouts = createRegistry<() => null>({
            root: 'beam.ux.chrome.layouts',
            onKeyDuplicate: OnKeyDuplicate.Reject,
            populationRequirement: PopulationRequirement.Required,
            description: 'Layouts.',
        });
        const routes = createRegistry<object>({ root: 'frame.routes' });
        const DocsLayout = (): null => null;

        layouts.register(layouts.keyFor('DocsLayout'), DocsLayout, '@splicewire/beam-docs');
        layouts.register(layouts.keyFor('site.shell'), () => null, null);
        routes.register('home', { component: 'Home' }, 'app/host');

        const index = createRegistryIndex().describe(layouts, '@splicewire/beam-ux').describe(routes, '@schemastud/frame');

        expect(snapshotRegistryIndex(index)).toEqual({
            version: 1,
            registries: [
                {
                    root: { segments: ['beam', 'ux', 'chrome', 'layouts'], display: 'beam.ux.chrome.layouts' },
                    describedBy: '@splicewire/beam-ux',
                    declaration: { onKeyDuplicate: 'reject', populationRequirement: 'required', description: 'Layouts.' },
                    keys: [
                        {
                            key: { segments: ['beam', 'ux', 'chrome', 'layouts', 'DocsLayout'], display: 'beam.ux.chrome.layouts.DocsLayout' },
                            name: 'DocsLayout',
                            registrant: '@splicewire/beam-docs',
                        },
                        {
                            key: { segments: ['beam', 'ux', 'chrome', 'layouts', 'site', 'shell'], display: 'beam.ux.chrome.layouts.site.shell' },
                            name: 'site.shell',
                            registrant: null,
                        },
                    ],
                },
                {
                    root: { segments: ['frame', 'routes'], display: 'frame.routes' },
                    describedBy: '@schemastud/frame',
                    declaration: { onKeyDuplicate: 'supersede', populationRequirement: 'optional', description: null },
                    keys: [{ key: { segments: ['frame', 'routes', 'home'], display: 'frame.routes.home' }, name: 'home', registrant: 'app/host' }],
                },
            ],
        });
    });

    it('is plain data: a JSON round trip gives the same value, and no entry is in the text', () => {
        const chrome = createRegistry<{ secret: string }>({ root: 'beam.ux.chrome.templates' });
        chrome.register(chrome.keyFor('ProseTemplate'), { secret: 'component-body' }, 'pkg/a');

        const snapshot = snapshotRegistryIndex(createRegistryIndex().describe(chrome, 'pkg/a'));
        const text = JSON.stringify(snapshot);

        expect(JSON.parse(text)).toEqual(snapshot);
        expect(text).not.toContain('component-body');
        // The segments are a plain array, not the key's frozen one, and the key object itself is not carried.
        expect(Object.isFrozen(snapshot.registries[0]!.root.segments)).toBe(false);
        expect(Object.keys(snapshot.registries[0]!.keys[0]!.key)).toEqual(['segments', 'display']);
    });

    it('keeps a superseded key once, in its first place, with the later registrant', () => {
        const registry = createRegistry<string>({ root: 'frame.modes' });
        registry.register('edit', 'a', 'pkg/a').register('view', 'b', 'pkg/b').register('edit', 'c', 'pkg/c');

        const [only] = snapshotRegistryIndex(createRegistryIndex().describe(registry, 'pkg/a')).registries;

        expect(only!.keys.map(({ name, registrant }) => [name, registrant])).toEqual([
            ['edit', 'pkg/c'],
            ['view', 'pkg/b'],
        ]);
    });

    it('names an admitted key once, with its first registrant', () => {
        const registry = createRegistry<string>({ root: 'frame.slots', onKeyDuplicate: OnKeyDuplicate.Admit });
        registry.register('aside', 'a', 'pkg/a').register('aside', 'b', 'pkg/b');

        const [only] = snapshotRegistryIndex(createRegistryIndex().describe(registry, 'pkg/a')).registries;

        expect(only!.keys).toEqual([{ key: { segments: ['frame', 'slots', 'aside'], display: 'frame.slots.aside' }, name: 'aside', registrant: 'pkg/a' }]);
    });

    it('carries a foreign key outside the root by its segments, named by its display', () => {
        const registry = createRegistry<string>({ root: 'frame.links' });
        registry.register(foreignKey(['https:', 'example.test', 'a'], 'https://example.test/a'), 'x', 'pkg/a');

        const [only] = snapshotRegistryIndex(createRegistryIndex().describe(registry, 'pkg/a')).registries;

        expect(only!.keys).toEqual([
            { key: { segments: ['https:', 'example.test', 'a'], display: 'https://example.test/a' }, name: 'https://example.test/a', registrant: 'pkg/a' },
        ]);
    });

    it('reads the registry that holds a root now, with who described it last', () => {
        const first = createRegistry<string>({ root: 'frame.routes' });
        const second = createRegistry<string>({ root: 'frame.routes' });
        first.register('old', 'x', 'pkg/a');
        second.register('new', 'y', 'pkg/b');

        const snapshot = snapshotRegistryIndex(createRegistryIndex().describe(first, 'pkg/a').describe(second, 'pkg/b'));

        expect(snapshot.registries).toHaveLength(1);
        expect(snapshot.registries[0]!.describedBy).toBe('pkg/b');
        expect(snapshot.registries[0]!.keys.map(({ name }) => name)).toEqual(['new']);
    });

    it('leaves out the index itself at the zero-segment root', () => {
        const index = createRegistryIndex();

        expect(index.keys().map((key) => key.segments.length)).toEqual([0]);
        expect(snapshotRegistryIndex(index).registries.some((registry) => registry.root.segments.length === 0)).toBe(false);
        expect(Key.root().display).toBe('');
    });
});
