import type { SchemaNode, SkinComponent, SkinRegistry } from '@schemastud/seam';

// ED-12 — the **resting-skin face** of the shared layered binding primitive, the
// sibling of resolveWidgetFor's edit-widget face (designed jointly, ADR-0082's
// layering flag; no new ADR). It resolves a node's resting skin against the seam
// skin registry **by specificity**:
//
//   1. an authored, override-only `x-skin` key on the (already layer-composed,
//      flat) node schema — the most specific;
//   2. otherwise the node-type default (a `product` node → the `product` skin,
//      zero manifest involvement).
//
// Manifest-layer composition happens UPSTREAM (blockdoc assembles base+profile
// into one flat schema); this resolver reads the flat `x-skin`, so **seam stays
// flat and context-free** — the registry only ever maps a key → component, with
// its own block-chrome fallback for an unknown key.
//
// Wire shape (ADR-0082, pinned with the server emitters DO-07 / ED-15): `x-skin`
// is a plain string skin name on the node schema.

export interface ResolvedSkin {
    /** The skin component to render (never null — the registry falls back). */
    skin: SkinComponent;
    /** The registry key that resolved it (the override name, or the node-type). */
    key: string;
    /** Whether an authored `x-skin` override won, or the node-type default. */
    source: 'override' | 'node-type';
    /** True when `key` had no registered skin — the block-chrome fallback rendered. */
    fallback: boolean;
}

export function resolveSkinFor(
    nodeType: string,
    schema: SchemaNode | undefined,
    registry: SkinRegistry,
): ResolvedSkin {
    const raw = schema?.['x-skin'];
    const override = typeof raw === 'string' && raw !== '' ? raw : undefined;
    const key = override ?? nodeType;

    return {
        skin: registry.resolveSkin(key),
        key,
        source: override !== undefined ? 'override' : 'node-type',
        fallback: !registry.hasSkin(key),
    };
}
