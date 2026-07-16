// =============================================================================
// frame runtime contexts — the WidgetContextRegistry wire contract (JS half).
//
// Five render contexts a resource participates in, and the per-node participation
// entries emitted by the PHP side. These types MUST match the PHP wire contract
// exactly; the client folds un-merged options at resolve time. See resolveWidgetFor.
// =============================================================================

/**
 * The five render contexts. `list-item` lives at pointer "" (whole-record card
 * body); the other four are per-property.
 */
export type FrameContext = 'edit' | 'detail' | 'list-column' | 'list-item' | 'row-cell';

/**
 * Per-node participation entry. `widget` is a NAME only (never a component) —
 * component resolution happens client-side through the seam registry.
 */
export interface NodeParticipation {
    participates: boolean;
    widget?: string;
    options?: Record<string, unknown>;
    sort?: number;
    label?: string;
    inheritsBinding?: boolean | string;
    heavyweight?: boolean;
}

/**
 * The per-resource contexts manifest. `byNode` keys: "" = resource root (only
 * `list-item` lives there); any other key = a property key. `inherits` is the
 * cascade graph on the wire; `known` echoes the enabled contexts.
 */
export interface ContextManifest {
    byNode: Record<string, Partial<Record<FrameContext, NodeParticipation>>>;
    inherits: Partial<Record<FrameContext, FrameContext[]>>;
    known: FrameContext[];
}

/** The full context vocabulary, in wire order. */
export const KNOWN_CONTEXTS: FrameContext[] = ['edit', 'detail', 'list-column', 'list-item', 'row-cell'];

/**
 * The single cascade edge, in the single-parent form the resolver consumes:
 * `row-cell` inherits `edit`'s binding unless the node opts out (inheritsBinding:false)
 * or the parent binding is heavyweight (suppressed). The wire `inherits` block carries
 * the same edge as an array; this is the resolver-facing projection.
 */
export const INHERITS: Partial<Record<FrameContext, FrameContext>> = { 'row-cell': 'edit' };
