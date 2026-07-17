import { BlockChromeFallback } from './block-chrome';
import type { SkinComponent, SkinRegistry } from './types';

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
 */
export function createSkinRegistry(fallback: SkinComponent = BlockChromeFallback): SkinRegistry {
    const skins = new Map<string, SkinComponent>();

    function registerSkin(nodeType: string, skin: SkinComponent): void {
        skins.set(nodeType, skin);
    }

    function hasSkin(nodeType: string): boolean {
        return skins.has(nodeType);
    }

    function resolveSkin(nodeType: string): SkinComponent {
        return skins.get(nodeType) ?? fallback;
    }

    return { registerSkin, resolveSkin, hasSkin, fallback };
}

/**
 * Default singleton — a shared registry for callers that don't create their own.
 * Extended by `registerSkin` calls; isolated from any `createSkinRegistry()`.
 */
export const defaultSkinRegistry = createSkinRegistry();
export const registerSkin = defaultSkinRegistry.registerSkin;
export const resolveSkin = defaultSkinRegistry.resolveSkin;
