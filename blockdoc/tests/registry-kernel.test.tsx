/**
 * The skin and node-view registries sit on `@schemastud/registry` and keep the interfaces they had as
 * `Map` wrappers. These pin what a caller sees: every name answers as a reference `Map` answered it, a
 * duplicate replaces and is recorded, a registrant can be read back, and each miss is the one it was
 * (the block-chrome fallback skin, `hasSkin` false, `undefined` from `resolveNodeView`, the generic NodeView).
 */
import { describe, expect, it } from 'vitest';
import type { BlockdocManifest } from '../src/core';
import {
    BlockChromeFallback,
    createNodeViewRegistry,
    createSkinRegistry,
    defaultSkinRegistry,
    GenericNodeView,
    resolveNodeViewComponents,
    resolveSkin,
    resolveSkinFor,
} from '../src/react';
import type { NodeViewComponentProps, SkinComponent } from '../src/react';
import base from './fixtures/base.manifest.json';
import contentArticle from './fixtures/content-article.manifest.json';

type NodeView = (props: NodeViewComponentProps) => null;

const skin = (): SkinComponent => () => null;
const view = (): NodeView => () => null;

/**
 * Real names and the edges: node-types and authored `x-skin` overrides (`product`, `fancy-product`,
 * `My Fancy Skin!`), PascalCase JSX tags and their legacy snake_case names, camelCase manifest names, the
 * base prose names, the empty string, `/`, a dotted legal key, and names beginning with each root.
 */
const NAMES = [
    'product',
    'citation',
    'fancy-product',
    'My Fancy Skin!',
    'ContentSection',
    'ContentOutline',
    'content_section',
    'content_outline',
    'contentSection',
    'p',
    'h2',
    '',
    '/',
    'a/b',
    'callout.warning',
    'callout.warning.dismissible',
    'blockdoc',
    'blockdoc.skins',
    'blockdoc.skins.product',
    'blockdoc.node-views',
    'blockdoc.node-views.p',
    'with space',
    'UPPER',
    '-leading',
    'trailing.',
    '..',
    'ünïcode',
];

describe('the skin registry against a reference Map', () => {
    it('registers and resolves every name as the Map did, with the fallback for a miss', () => {
        const registry = createSkinRegistry();
        const map = new Map<string, SkinComponent>();
        const skins = NAMES.map(skin);

        NAMES.forEach((name, i) => {
            expect(() => registry.registerSkin(name, skins[i]!)).not.toThrow();
            map.set(name, skins[i]!);
        });

        for (const name of NAMES) {
            expect(registry.hasSkin(name), name).toBe(map.has(name));
            expect(registry.resolveSkin(name), name).toBe(map.get(name) ?? BlockChromeFallback);
            expect(registry.resolveSkin(name), name).not.toBe(BlockChromeFallback);
        }
    });

    it('misses with the fallback for a branch name, an unregistered name and a near miss, as the Map did', () => {
        const registry = createSkinRegistry();
        registry.registerSkin('callout.warning', skin());
        registry.registerSkin('callout.info', skin());
        registry.registerSkin('product', skin());

        for (const name of ['callout', 'callout.warning.x', 'Product', ' product', 'products', 'blockdoc.skins', 'blockdoc.skins.product']) {
            expect(registry.hasSkin(name), name).toBe(false);
            expect(registry.resolveSkin(name), name).toBe(BlockChromeFallback);
        }
    });

    it('keeps a name beginning with the root apart from the name under it', () => {
        const registry = createSkinRegistry();
        const product = skin();
        const rooted = skin();
        registry.registerSkin('product', product);
        registry.registerSkin('blockdoc.skins.product', rooted);

        expect(registry.resolveSkin('product')).toBe(product);
        expect(registry.resolveSkin('blockdoc.skins.product')).toBe(rooted);
    });

    it('resolves a miss to the fallback it was created with', () => {
        const fallback = skin();
        const registry = createSkinRegistry(fallback);

        expect(registry.fallback).toBe(fallback);
        expect(registry.resolveSkin('nothing')).toBe(fallback);
        expect(registry.resolveSkin('')).toBe(fallback);
    });

    it('falls back for a skin registered as undefined, while hasSkin is true, as `get(…) ?? fallback` did', () => {
        const registry = createSkinRegistry();
        registry.registerSkin('ghost', undefined as unknown as SkinComponent);

        expect(registry.hasSkin('ghost')).toBe(true);
        expect(registry.resolveSkin('ghost')).toBe(BlockChromeFallback);
    });
});

describe('the node-view registry against a reference Map', () => {
    it('registers and resolves every name as the Map did', () => {
        const registry = createNodeViewRegistry();
        const map = new Map<string, NodeView>();
        const views = NAMES.map(view);

        NAMES.forEach((name, i) => {
            expect(() => registry.registerNodeView(name, views[i]!)).not.toThrow();
            map.set(name, views[i]!);
        });

        for (const name of NAMES) {
            expect(registry.resolveNodeView(name), name).toBe(map.get(name));
        }
    });

    it('resolves undefined for a branch name, an unregistered name and a near miss', () => {
        const registry = createNodeViewRegistry();
        registry.registerNodeView('callout.warning', view());
        registry.registerNodeView('ContentSection', view());

        for (const name of ['callout', 'callout.warning.x', 'contentsection', 'Content_Section', 'blockdoc.node-views', '']) {
            expect(registry.resolveNodeView(name), name).toBeUndefined();
        }
    });

    it('resolves the PascalCase tags and the legacy snake names a host registers at load, each to its own component', () => {
        // The shape of beam-content's registerContentNodeViews.
        const registry = createNodeViewRegistry();
        const section = view();
        const outline = view();
        registry.registerNodeView('ContentSection', section);
        registry.registerNodeView('ContentOutline', outline);
        registry.registerNodeView('content_section', section);
        registry.registerNodeView('content_outline', outline);

        expect(registry.resolveNodeView('ContentSection')).toBe(section);
        expect(registry.resolveNodeView('content_section')).toBe(section);
        expect(registry.resolveNodeView('ContentOutline')).toBe(outline);
        expect(registry.resolveNodeView('content_outline')).toBe(outline);
        expect(registry.supersededNodeViews?.('content_section')).toEqual([]);
    });
});

describe('a duplicate (Supersede)', () => {
    it('replaces a skin, never throws, and records each displaced skin oldest first with both registrants', () => {
        const registry = createSkinRegistry();
        const [first, second, third] = [skin(), skin(), skin()];
        registry.registerSkin('product', first, '@schemastud/blockdoc');
        registry.registerSkin('citation', skin());
        expect(() => registry.registerSkin('product', second, '@splicewire/beam-content')).not.toThrow();
        registry.registerSkin('product', third, 'app/host');

        expect(registry.resolveSkin('product')).toBe(third);
        expect(registry.hasSkin('product')).toBe(true);
        expect(registry.supersededSkins?.('product')).toEqual([
            { skin: first, by: '@schemastud/blockdoc', supersededBy: '@splicewire/beam-content' },
            { skin: second, by: '@splicewire/beam-content', supersededBy: 'app/host' },
        ]);
        expect(registry.supersededSkins?.('citation')).toEqual([]);
        expect(registry.supersededSkins?.('never')).toEqual([]);
    });

    it('replaces a node view and records what it displaced', () => {
        const registry = createNodeViewRegistry();
        const [packaged, host] = [view(), view()];
        registry.registerNodeView('ContentSection', packaged, '@splicewire/beam-content');
        registry.registerNodeView('ContentSection', host, 'app/host');

        expect(registry.resolveNodeView('ContentSection')).toBe(host);
        expect(registry.supersededNodeViews?.('ContentSection')).toEqual([
            { component: packaged, by: '@splicewire/beam-content', supersededBy: 'app/host' },
        ]);
    });
});

describe('the registrant', () => {
    it('reads back who registered the skin a key resolves to, and follows the override', () => {
        const registry = createSkinRegistry();
        registry.registerSkin('product', skin(), '@schemastud/blockdoc');
        registry.registerSkin('citation', skin());

        expect(registry.skinRegistrant?.('product')).toBe('@schemastud/blockdoc');
        expect(registry.skinRegistrant?.('citation')).toBeNull();
        expect(registry.skinRegistrant?.('never')).toBeNull();

        registry.registerSkin('product', skin(), 'app/host');
        expect(registry.skinRegistrant?.('product')).toBe('app/host');
    });

    it('reads back who registered the node view a name resolves to, and follows the override', () => {
        const registry = createNodeViewRegistry();
        registry.registerNodeView('ContentSection', view(), '@splicewire/beam-content');
        registry.registerNodeView('p', view());

        expect(registry.nodeViewRegistrant?.('ContentSection')).toBe('@splicewire/beam-content');
        expect(registry.nodeViewRegistrant?.('p')).toBeNull();
        expect(registry.nodeViewRegistrant?.('never')).toBeNull();

        registry.registerNodeView('ContentSection', view(), 'app/host');
        expect(registry.nodeViewRegistrant?.('ContentSection')).toBe('app/host');
    });

    it('is read defensively: a by that is not a string names nobody', () => {
        const skins = createSkinRegistry();
        const views = createNodeViewRegistry();
        skins.registerSkin('product', skin(), 3 as unknown as string);
        views.registerNodeView('p', view(), {} as unknown as string);

        expect(skins.skinRegistrant?.('product')).toBeNull();
        expect(views.nodeViewRegistrant?.('p')).toBeNull();
    });
});

describe('a name that is not a string', () => {
    const notStrings = [undefined, null, 5, {}] as unknown as string[];

    it.each(notStrings)('misses on every read of %j, empty and populated', (name) => {
        const skins = createSkinRegistry();
        const views = createNodeViewRegistry();

        for (const populated of [false, true]) {
            if (populated) {
                skins.registerSkin('5', skin());
                skins.registerSkin('product', skin());
                views.registerNodeView('5', view());
                views.registerNodeView('p', view());
            }

            expect(skins.hasSkin(name)).toBe(false);
            expect(skins.resolveSkin(name)).toBe(BlockChromeFallback);
            expect(skins.skinRegistrant?.(name)).toBeNull();
            expect(skins.supersededSkins?.(name)).toEqual([]);
            expect(views.resolveNodeView(name)).toBeUndefined();
            expect(views.nodeViewRegistrant?.(name)).toBeNull();
            expect(views.supersededNodeViews?.(name)).toEqual([]);
        }
    });

    it('is registered under its string form', () => {
        const skins = createSkinRegistry();
        const views = createNodeViewRegistry();
        const five = skin();
        const fiveView = view();

        expect(() => skins.registerSkin(5 as unknown as string, five)).not.toThrow();
        expect(() => views.registerNodeView(5 as unknown as string, fiveView)).not.toThrow();
        expect(skins.resolveSkin('5')).toBe(five);
        expect(views.resolveNodeView('5')).toBe(fiveView);
    });
});

describe('the misses downstream are unchanged', () => {
    const manifests = [base, contentArticle] as BlockdocManifest[];

    it('gives an unregistered non-base node the generic NodeView composing the registry fallback skin', () => {
        const skins = createSkinRegistry();
        const resolved = resolveNodeViewComponents(manifests, createNodeViewRegistry(), skins);

        expect(resolved.get('contentSection')?.component).toBe(GenericNodeView);
        expect(resolved.get('contentSection')?.skin).toBe(BlockChromeFallback);
        expect(resolved.has('p')).toBe(false);
    });

    it('composes a registered skin, and lets a registered node view win', () => {
        const skins = createSkinRegistry();
        const sectionSkin = skin();
        const outlineView = view();
        skins.registerSkin('contentSection', sectionSkin);
        const views = createNodeViewRegistry();
        views.registerNodeView('contentOutline', outlineView);

        const resolved = resolveNodeViewComponents(manifests, views, skins);

        expect(resolved.get('contentSection')?.skin).toBe(sectionSkin);
        expect(resolved.get('contentOutline')?.component).toBe(outlineView);
    });

    it('resolveSkinFor reports an authored x-skin override and its fallback as before', () => {
        const registry = createSkinRegistry();
        const fancy = skin();
        registry.registerSkin('My Fancy Skin!', fancy);

        expect(resolveSkinFor('product', { 'x-skin': 'My Fancy Skin!' }, registry)).toEqual({
            skin: fancy,
            key: 'My Fancy Skin!',
            source: 'override',
            fallback: false,
        });
        expect(resolveSkinFor('product', { 'x-skin': 'blockdoc.skins.missing' }, registry)).toEqual({
            skin: BlockChromeFallback,
            key: 'blockdoc.skins.missing',
            source: 'override',
            fallback: true,
        });
    });
});

describe('lifetimes', () => {
    it('makes an isolated registry per factory call', () => {
        const a = createSkinRegistry();
        const b = createSkinRegistry();
        const c = createNodeViewRegistry();
        const d = createNodeViewRegistry();
        a.registerSkin('product', skin());
        c.registerNodeView('p', view());

        expect(b.hasSkin('product')).toBe(false);
        expect(d.resolveNodeView('p')).toBeUndefined();
        expect(defaultSkinRegistry.hasSkin('product')).toBe(false);
    });

    it('keeps the module default: the exported resolveSkin reads defaultSkinRegistry without its receiver', () => {
        expect(resolveSkin).toBe(defaultSkinRegistry.resolveSkin);
        expect(resolveSkin('nothing-registered-here')).toBe(BlockChromeFallback);
    });
});
