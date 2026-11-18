import { BlockChromeFallback } from './block-chrome';
import { createNamedRegistry } from './named-registry';
import type { SkinComponent, SkinRegistry } from './skin-types';

/**
 * A peer of `createWidgetRegistry()` for **skins** — a node-type's resting look.
 * Context-free and per-consumer: each call yields a fresh, isolated instance
 * keyed by node-type (register / resolve / fallback). When a node-type has no
 * registered skin, `resolveSkin` returns the block-chrome fallback skin, so a
 * caller can always render *something* for any node.
 *
 * The registry knows nothing of frame context or ProseMirror; a skin is just a
 * minimal `(node, ctx) => ReactNode`, so per-editor rich props thread through
 * `ctx` without the shared registry knowing them.
 *
 * Each call makes its own `@schemastud/registry` registry rooted at `blockdoc.skins`
 * that declares `Supersede`: a later `registerSkin` of the same key replaces the
 * earlier one, which is recorded with its registrant. Any string is a skin key (a
 * node-type, or an authored `x-skin` name); a key that is not a string misses.
 */
export function createSkinRegistry(fallback: SkinComponent = BlockChromeFallback): SkinRegistry {
    const skins = createNamedRegistry<SkinComponent>(
        'blockdoc.skins',
        'Node-type or x-skin name to the skin that draws its resting look.',
    );

    function registerSkin(nodeType: string, skin: SkinComponent, by?: string): void {
        skins.register(nodeType, skin, by);
    }

    function hasSkin(nodeType: string): boolean {
        return skins.has(nodeType);
    }

    function resolveSkin(nodeType: string): SkinComponent {
        // `?? fallback` as the map's `get(…) ?? fallback` had it: a skin registered as undefined still falls back.
        return skins.resolve(nodeType) ?? fallback;
    }

    function skinRegistrant(nodeType: string): string | null {
        return skins.registrant(nodeType);
    }

    function supersededSkins(nodeType: string) {
        return skins.superseded(nodeType).map(({ entry, by, supersededBy }) => ({ skin: entry, by, supersededBy }));
    }

    return { registerSkin, resolveSkin, hasSkin, fallback, skinRegistrant, supersededSkins };
}

/**
 * Default singleton — a shared registry for callers that don't create their own.
 * Extended by `registerSkin` calls; isolated from any `createSkinRegistry()`.
 */
export const defaultSkinRegistry = createSkinRegistry();
export const resolveSkin = defaultSkinRegistry.resolveSkin;
