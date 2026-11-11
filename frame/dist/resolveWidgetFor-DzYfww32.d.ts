import { ResolvedWidget, SchemaNode, WidgetRegistry } from '@schemastud/seam';
import { f as FrameContext, N as NodeParticipation } from './types-C1zrU238.js';

/**
 * The schema keyword the resolver stamps the CONTEXT NAME onto before handing the
 * node to the seam registry. A declared `x-widget` name still wins (a name predicate
 * fires first for a bound node); the stamp exists so a registry can carry a
 * context-DEFAULT widget on a predicate (`s['x-frame-context'] === 'summary'`) for
 * nodes that participate without naming a widget. Stamped on the schema only — the
 * resolved-widget shape returned to callers is unchanged.
 */
declare const FRAME_CONTEXT_KEYWORD = "x-frame-context";
/** `name` (from `ResolvedWidget`) is the per-context name: the entry's, else the lender's, else the node's own. */
interface ResolvedForContext extends ResolvedWidget {
    /** Whether the node participates in this context at all. */
    participates: boolean;
    /** A widget NAME was bound but the registry resolved no component. */
    unbound?: boolean;
    /**
     * The options the widget gets in this context: the registry entry's config, the node's
     * declared `x-widget-options` merged over it, then the context entry's options (its
     * lender's first) merged over both.
     */
    options?: Record<string, unknown>;
}
declare function resolveWidgetFor(node: SchemaNode, ctx: FrameContext, cm: NodeParticipation | undefined, // byNode[ptr][ctx]
parent: NodeParticipation | undefined, // the inherited entry (INHERITS[ctx]: edit for row-cell, summary for overview), when cascading
registry: WidgetRegistry): ResolvedForContext;

export { FRAME_CONTEXT_KEYWORD as F, type ResolvedForContext as R, resolveWidgetFor as r };
