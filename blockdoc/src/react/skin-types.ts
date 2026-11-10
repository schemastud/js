import type { SchemaNode } from '@schemastud/seam';

// The skin socket's types: a node-type's resting look, rendered by blockdoc's generic node-view (ED-06).
// Moved from seam with the skin registry (frame-foundation 16; ruling 02 slice 7).

/** A block node a skin renders — its node-type plus resting attribute values. */
export interface SkinNode {
    type: string;
    attrs?: Record<string, unknown>;
}

/**
 * Per-render context threaded to a skin. `attrsSchema` is the node-type's
 * attribute schema (the fallback enumerates field anchors from it); any
 * per-editor rich props ride alongside without the registry knowing them —
 * that's what keeps the seam context-free.
 */
export interface SkinContext {
    attrsSchema?: SchemaNode;
    [key: string]: unknown;
}

/**
 * A skin is a minimal `(node, ctx) => ReactNode`. It owns only a node-type's
 * resting look; it has no frame context and no ProseMirror knowledge (the shell
 * owns selection chrome and editing). Per-editor rich props thread through `ctx`
 * so the shared registry never has to know them.
 */
export type SkinComponent = (node: SkinNode, ctx?: SkinContext) => React.ReactNode;

export interface SkinRegistry {
    /** Register a skin for a node-type. A later registration replaces an earlier one. */
    registerSkin: (nodeType: string, skin: SkinComponent) => void;
    /** Resolve the skin for a node-type; falls back to the block-chrome skin. */
    resolveSkin: (nodeType: string) => SkinComponent;
    /** Whether a node-type has an explicitly registered skin (vs. the fallback). */
    hasSkin: (nodeType: string) => boolean;
    /** The fallback skin this registry resolves to when nothing is registered. */
    fallback: SkinComponent;
}
