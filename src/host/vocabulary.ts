/**
 * The host-owned remote-block vocabulary — expressed as the SAME registry shape the
 * frame editor uses (`@schemastud/seam`'s `WidgetRegistry`), NOT a parallel one-off.
 *
 * The alignment (RCP-03's whole point): frame paints "the columns/forms the host
 * declared" by resolving a schema node → a first-party widget through a host-mutable
 * `WidgetRegistry`. This module paints "the arbitrary blocks the host declared" by
 * resolving a remote block's *type key* → a first-party React renderer through the
 * SAME seam registry, using the SAME `registerWidget` seam. A remote block only ever
 * *names* an allowlisted `type` (a vocabulary key) with serializable props; the host
 * resolves that name to a real component. A `type` no one registered resolves to
 * nothing (`{ widget: undefined }`, total by construction) → the block is refused.
 *
 * Concretely we treat a block type `"Card"` as a schema node `{ type: 'Card' }` and
 * register it with `registerWidget('Card', renderer)`. Seam's built-in key predicate
 * (`s.type === key`) then routes `resolveEntry({ type: 'Card' })` to that renderer.
 * Seam's RJSF-flavoured default entries (`x-widget` / `enum` / `format`) never match a
 * bare `{ type }` node, so an unregistered block falls straight through to `undefined`
 * — the drop-the-unknown property we want, inherited from seam rather than re-coded.
 */
import { createWidgetRegistry } from '@schemastud/seam';
import type { WidgetRegistry } from '@schemastud/seam';
import { DEFAULT_ALLOWLIST, type HostComponent } from './allowlist.js';

/**
 * A frame-aligned block registry. Its public shape is exactly seam's `WidgetRegistry`
 * (`registerWidget` / `resolveWidget` / `resolveEntry`), plus a `resolveBlock`
 * convenience that maps a bare block-type key to its host renderer (or `undefined`).
 */
export interface BlockVocabulary extends WidgetRegistry {
    /** Resolve a remote block's element type-name to its host renderer, or `undefined`. */
    resolveBlock: (type: string) => HostComponent | undefined;
}

/**
 * The schema-node shape a block type is expressed as when routed through the seam
 * registry. Kept tiny on purpose — the block names a `type`, nothing more crosses.
 */
function blockNode(type: string): { type: string } {
    return { type };
}

/** Wrap a seam `WidgetRegistry` with the block-type resolution convenience. */
function asBlockVocabulary(registry: WidgetRegistry): BlockVocabulary {
    return {
        ...registry,
        resolveBlock(type: string): HostComponent | undefined {
            const { widget } = registry.resolveEntry(blockNode(type));
            // Seam types `widget` loosely (string | Component | undefined). Our
            // vocabulary stores a `HostComponent` render fn as the widget value; a
            // miss (or any non-fn) means "not in the vocabulary" → refuse.
            return typeof widget === 'function' ? (widget as HostComponent) : undefined;
        },
    };
}

/**
 * Register a block component into a frame-aligned vocabulary. This is the SAME
 * mechanism frame uses to register a widget — the block's `type` is the vocabulary
 * key, exactly as a widget's key is its schema type / `x-widget` name.
 */
export function registerBlock(
    registry: WidgetRegistry,
    type: string,
    component: HostComponent,
): void {
    // Seam's `widget` slot carries our render fn; the cast is the seam-boundary
    // adaptation (seam types `widget` as string | Component | undefined), not a
    // bypass — registration + resolution stay entirely inside seam's registry.
    registry.registerWidget(type, component as unknown as Parameters<WidgetRegistry['registerWidget']>[1]);
}

/**
 * Build a fresh frame-aligned block vocabulary seeded with the default allowlist.
 * The seven RCP-01 host components are registered through seam's `registerWidget`
 * seam, so behaviour is preserved but the mechanism is now the frame vocabulary.
 */
export function createBlockVocabulary(
    allowlist: Record<string, HostComponent> = DEFAULT_ALLOWLIST,
): BlockVocabulary {
    const registry = createWidgetRegistry();
    for (const [type, component] of Object.entries(allowlist)) {
        registerBlock(registry, type, component);
    }
    return asBlockVocabulary(registry);
}

/**
 * The default frame-aligned vocabulary: the seven first-party blocks, resolved
 * through seam. A host extends it with `registerBlock(vocab, ...)` exactly as it
 * extends the frame widget registry.
 */
export const DEFAULT_BLOCK_VOCABULARY: BlockVocabulary = createBlockVocabulary();
