import { mergeUiSchema, type SchemaNode, type WidgetRegistry, type ResolvedWidget } from '@schemastud/seam';
import { INHERITS, type FrameContext, type NodeParticipation } from './contexts';

// =============================================================================
// The ONE context-aware resolver. Every render surface (SchemaView, EditShell,
// resolveColumns) folds a node's per-context participation into a schema the seam
// registry can resolve — including the row-cell←edit binding cascade.
// =============================================================================

/**
 * Local fold helper. seam does NOT export its internal `mergeOptions`; delegate the
 * DEEP merge to the exported `mergeUiSchema` and guard undefined here. seam stays a
 * leaf — this helper lives in frame.
 */
function mergeOptions(a?: Record<string, unknown>, b?: Record<string, unknown>) {
    if (!a) return b;
    if (!b) return a;
    return mergeUiSchema(a as any, b as any) as Record<string, unknown>;
}

export interface ResolvedForContext extends ResolvedWidget {
    /** Whether the node participates in this context at all. */
    participates: boolean;
    /** A widget NAME was bound but the registry resolved no component. */
    unbound?: boolean;
}

export function resolveWidgetFor(
    node: SchemaNode,
    ctx: FrameContext,
    cm: NodeParticipation | undefined, // byNode[ptr][ctx]
    parent: NodeParticipation | undefined, // the inherited (edit) entry, when cascading
    registry: WidgetRegistry,
): ResolvedForContext {
    if (!cm?.participates) return { widget: undefined, participates: false };
    const cascades = ctx !== 'edit' && cm.inheritsBinding !== false && Boolean(INHERITS[ctx]);
    const suppressed = ctx === 'row-cell' && cascades && parent?.heavyweight === true; // heavyweight-in-a-cell
    const name = cm.widget ?? (cascades && !suppressed ? parent?.widget : undefined);
    const folded = cascades && !suppressed ? mergeOptions(parent?.options, cm.options) : cm.options;
    const schema: SchemaNode = { ...node, ...(name ? { 'x-widget': name } : {}), 'x-widget-options': folded };
    const resolved = registry.resolveEntry(schema);
    const unbound = Boolean(name) && resolved.widget === undefined;
    return { ...resolved, participates: true, unbound };
}
