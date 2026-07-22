import { beforeEach, describe, expect, it } from 'vitest';

import {
    buildNavTree,
    clearNavSources,
    getNavSources,
    navTrail,
    registerNavSource,
    resolveNavNodes,
    type NavNode,
} from './registry';

beforeEach(() => {
    clearNavSources();
});

describe('registry — compose-many resolution', () => {
    it('concatenates nodes from every registered source (additive)', async () => {
        registerNavSource({
            id: 'a',
            load: async () => [{ title: 'A1', href: '/a/1' }],
        });
        registerNavSource({
            id: 'b',
            load: async () => [
                { title: 'B1', href: '/b/1' },
                { title: 'B2', href: '/b/2' },
            ],
        });

        const nodes = await resolveNavNodes();

        expect(nodes.map((n) => n.title)).toEqual(['A1', 'B1', 'B2']);
    });

    it('orders sources by `order` (unset last), stable for ties', () => {
        registerNavSource({ id: 'first-seen', load: async () => [] });
        registerNavSource({ id: 'ordered', order: 1, load: async () => [] });

        expect(getNavSources().map((s) => s.id)).toEqual([
            'ordered',
            'first-seen',
        ]);
    });

    it('skips a source that throws rather than blanking the sidebar', async () => {
        registerNavSource({
            id: 'ok',
            load: async () => [{ title: 'Ok', href: '/ok' }],
        });
        registerNavSource({
            id: 'broken',
            load: async () => {
                throw new Error('boom');
            },
        });

        const nodes = await resolveNavNodes();

        expect(nodes.map((n) => n.title)).toEqual(['Ok']);
    });
});

const NODES: NavNode[] = [
    {
        title: 'Getting started',
        href: '/docs/build/getting-started',
        track: 'build',
        group: 'Guides',
    },
    {
        title: 'Setup',
        href: '/docs/build/setup',
        track: 'build',
        group: 'Onboarding',
        groupOrder: 1,
        order: 1,
    },
    {
        title: 'Config',
        href: '/docs/build/config',
        track: 'build',
        group: 'Onboarding',
        parent: 'setup',
        order: 2,
    },
    {
        title: 'API keys',
        href: '/docs/using/api-keys',
        track: 'using',
        group: 'Keys',
    },
];

describe('buildNavTree — grouping, nesting, ordering', () => {
    it('partitions by track and honours the given track order', () => {
        const tree = buildNavTree(NODES, ['using', 'build', 'built']);
        expect(tree.map((t) => t.track)).toEqual(['using', 'build']);
    });

    it('sorts groups by groupOrder (declared leads first-seen)', () => {
        const tree = buildNavTree(NODES, ['using', 'build']);
        const build = tree.find((t) => t.track === 'build')!;
        expect(build.groups.map((g) => g.group)).toEqual([
            'Onboarding',
            'Guides',
        ]);
    });

    it('nests one level via parent leaf slug and sorts children by order', () => {
        const tree = buildNavTree(NODES, ['build']);
        const onboarding = tree[0].groups.find((g) => g.group === 'Onboarding')!;
        expect(onboarding.items).toHaveLength(1);
        expect(onboarding.items[0].title).toBe('Setup');
        expect(onboarding.items[0].children?.map((c) => c.title)).toEqual([
            'Config',
        ]);
    });

    it('omits tracks with no nodes', () => {
        const tree = buildNavTree(NODES, ['using', 'build', 'built']);
        expect(tree.some((t) => t.track === 'built')).toBe(false);
    });
});

describe('navTrail — breadcrumb derivation', () => {
    const tree = buildNavTree(NODES, ['using', 'build']);

    it('finds the track/group/page for a root guide', () => {
        const trail = navTrail(tree, '/docs/build/getting-started');
        expect(trail?.trackKey).toBe('build');
        expect(trail?.group?.label).toBe('Guides');
        expect(trail?.page?.label).toBe('Getting started');
    });

    it('finds a nested child guide and its group', () => {
        const trail = navTrail(tree, '/docs/build/config');
        expect(trail?.group?.label).toBe('Onboarding');
        expect(trail?.page?.label).toBe('Config');
    });

    it('offers sibling groups (by lead href) and sibling pages for switchers', () => {
        const trail = navTrail(tree, '/docs/build/config');
        // Sibling groups in the build track, each pointing at its lead guide.
        expect(trail?.group?.siblings).toEqual([
            { label: 'Onboarding', href: '/docs/build/setup' },
            { label: 'Guides', href: '/docs/build/getting-started' },
        ]);
        // Sibling pages = guides in the active group (root + child).
        expect(trail?.page?.siblings.map((s) => s.label)).toEqual([
            'Setup',
            'Config',
        ]);
    });

    it('returns null for an href not in the tree (e.g. a landing page)', () => {
        expect(navTrail(tree, '/docs/build')).toBeNull();
        expect(navTrail(tree, undefined)).toBeNull();
    });
});
