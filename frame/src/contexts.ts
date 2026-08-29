import type { FrameLayoutVariant } from './FrameLayout';

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
    /**
     * The resource's declared inner-layout grammar (ticket 31) — the FrameLayout
     * socket's `variant` token, emitted off the PHP `#[AdminResource(layout: …)]`.
     * A host resolves the surface's layout straight from the manifest with
     * `<FrameLayout variant={manifest.layout ?? undefined} …>`. `null`/absent = the
     * resource is layout-agnostic; the socket falls back to `SingleColumn` (ticket 09).
     * Optional so existing manifests (and hand-built fixtures) still typecheck.
     */
    layout?: FrameLayoutVariant | null;
    /**
     * Where this resource's create affordance lives — the RESOLVED value the shells read.
     *
     *  - `'frame'` — frame's list toolbar emits the "New …" button. Today's behaviour, and the
     *    default wherever the field is absent (an older server, a hand-built fixture).
     *  - `'host'` — frame emits none: either the resource is not creatable at all, or its
     *    declaration says the host's own chrome owns the affordance.
     *
     * It rides the per-resource context manifest rather than `AdminResourceDefinition` for the
     * same reason `layout` does: a shell is handed its `ContextManifest` and not the definition,
     * and this is a presentation fact about the surface, not a new capability. Resolving the two
     * inputs SERVER-side (`creatable === false ⇒ 'host'`, else the declared slot) is what keeps
     * the client from carrying a second spelling of `creatable` that could drift from the first.
     *
     * ⚠️ It gates only frame's OWN toolbar. A host Toolbar slot receives it as
     * `ToolbarSlotProps.framesCreate` and is free to ignore it — see that prop's docblock for the
     * two live host toolbars that would have been deleted had this been folded into `canCreate`.
     */
    createAffordance?: 'frame' | 'host';
    /**
     * What this resource calls ONE record — the noun a create affordance puts after "New"
     * ("New scaffold pack"), RESOLVED server-side from the declared `singularLabel` or, absent
     * one, the plural display label inflected.
     *
     * It rides this block rather than the definition for the same reason `layout` and
     * `createAffordance` do — a shell is handed its manifest and never the definition — and it
     * is resolved server-side because the client has neither the label nor an inflector. That
     * is precisely why frame's own toolbar has been offering "New scaffold-packs": the raw
     * resource KEY was the only noun it had.
     *
     * Optional, and absent/empty falls back to the key, so every pre-existing manifest and
     * hand-built fixture renders exactly as before.
     */
    singularLabel?: string;
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
