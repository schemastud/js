import { mergeUiSchema, type SchemaNode, type WidgetRegistry, type ResolvedWidget } from '@schemastud/seam';
import { frameContexts, type FrameContextLookup } from './contextRegistry';
import type { FrameContext, NodeParticipation } from './contexts';

// =============================================================================
// The ONE context-aware resolver. Every render surface (SchemaView, EditShell,
// resolveColumns) folds a node's per-context participation into a schema the seam
// registry can resolve — including the binding cascades. Which contexts cascade is the
// kit's context registry's answer (an entry with a non-empty fallback; frame's own two
// are row-cell←edit and overview←summary), and which entry lends is `lenderFor`'s
// (frame-foundation 91). Only row-cell has the heavyweight guard, and edit never
// cascades: both are shell knowledge, not registry data (decision 86 Q1).
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

/**
 * Did the registry answer with a mountable COMPONENT? The one shape of this question: a
 * resolution is either a component, a bare RJSF widget NAME (a string the seam registry
 * passes through to RJSF, which no read surface can mount), or a miss.
 */
export const isWidgetComponent = (
    widget: ResolvedWidget['widget'],
): widget is Exclude<ResolvedWidget['widget'], string | undefined> =>
    widget !== undefined && typeof widget !== 'string';

/**
 * `name` (from `ResolvedWidget`) is the per-context name: the entry's, else the lender's, else the node's own; and
 * `bound === false` says nothing binds it here, which every surface draws as seam's `UnboundWidget` (ruling 01 §3).
 */
export interface ResolvedForContext extends ResolvedWidget {
    /** Whether the node participates in this context at all. */
    participates: boolean;
    /**
     * The options the widget gets in this context: the registry entry's config, the node's
     * declared `x-widget-options` merged over it, then the context entry's options (its
     * lender's first) merged over both.
     */
    options?: Record<string, unknown>;
}

export function resolveWidgetFor(
    node: SchemaNode,
    ctx: FrameContext,
    cm: NodeParticipation | undefined, // byNode[ptr][ctx]
    parent: NodeParticipation | undefined, // the lending entry (`lenderFor(byNode[ptr], ctx, contexts)?.entry`), when cascading
    registry: WidgetRegistry,
    /** The kit's context registry: whether `ctx` cascades at all. Absent, frame's own seven. */
    contexts: FrameContextLookup = frameContexts(),
): ResolvedForContext {
    if (!cm?.participates) return { widget: undefined, participates: false };
    // An OPTED-OUT parent lends nothing. A `participates: false` entry is a declaration that
    // the node does not render in that context at all, so neither its widget name nor its
    // options may travel down the cascade edge — an absent parent and a refusing one are the
    // same thing to the child.
    const lender = parent?.participates ? parent : undefined;
    const cascades = ctx !== 'edit' && cm.inheritsBinding !== false && (contexts.get(ctx)?.fallback.length ?? 0) > 0;
    const suppressed = ctx === 'row-cell' && cascades && lender?.heavyweight === true; // heavyweight-in-a-cell
    const name = cm.widget ?? (cascades && !suppressed ? lender?.widget : undefined);
    const folded = cascades && !suppressed ? mergeOptions(lender?.options, cm.options) : cm.options;
    const schema: SchemaNode = {
        ...node,
        ...(name ? { 'x-widget': name } : {}),
        'x-widget-options': folded,
        [FRAME_CONTEXT_KEYWORD]: ctx,
    };
    const resolved = registry.resolveEntry(schema, ctx);
    const declared = node['x-widget-options'];
    const options = mergeOptions(
        mergeOptions(
            resolved.config,
            declared && typeof declared === 'object' && !Array.isArray(declared)
                ? (declared as Record<string, unknown>)
                : undefined,
        ),
        folded,
    );
    const { options: _, ...rest } = resolved;
    return { ...rest, ...(options !== undefined ? { options } : {}), participates: true };
}
