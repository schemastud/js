import { mergeUiSchema, type SchemaNode, type WidgetRegistry, type ResolvedWidget } from '@schemastud/seam';
import { INHERITS, type FrameContext, type NodeParticipation } from './contexts';

// =============================================================================
// The ONE context-aware resolver. Every render surface (SchemaView, EditShell,
// resolveColumns) folds a node's per-context participation into a schema the seam
// registry can resolve — including the row-cell←edit and overview←summary binding
// cascades (the edges live in INHERITS; only row-cell has the heavyweight guard).
// =============================================================================

/**
 * The schema keyword the resolver stamps the CONTEXT NAME onto before handing the
 * node to the seam registry. A declared `x-widget` name still wins (a name predicate
 * fires first for a bound node); the stamp exists so a registry can carry a
 * context-DEFAULT widget on a predicate (`s['x-frame-context'] === 'summary'`) for
 * nodes that participate without naming a widget. Stamped on the schema only — the
 * resolved-widget shape returned to callers is unchanged.
 */
export const FRAME_CONTEXT_KEYWORD = 'x-frame-context';

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
    parent: NodeParticipation | undefined, // the inherited entry (INHERITS[ctx]: edit for row-cell, summary for overview), when cascading
    registry: WidgetRegistry,
): ResolvedForContext {
    if (!cm?.participates) return { widget: undefined, participates: false };
    const cascades = ctx !== 'edit' && cm.inheritsBinding !== false && Boolean(INHERITS[ctx]);
    const suppressed = ctx === 'row-cell' && cascades && parent?.heavyweight === true; // heavyweight-in-a-cell
    const name = cm.widget ?? (cascades && !suppressed ? parent?.widget : undefined);
    const folded = cascades && !suppressed ? mergeOptions(parent?.options, cm.options) : cm.options;
    const schema: SchemaNode = {
        ...node,
        ...(name ? { 'x-widget': name } : {}),
        'x-widget-options': folded,
        [FRAME_CONTEXT_KEYWORD]: ctx,
    };
    const resolved = registry.resolveEntry(schema);
    const unbound = Boolean(name) && resolved.widget === undefined;
    return { ...resolved, participates: true, unbound };
}
