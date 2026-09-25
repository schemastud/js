import type { FrameLayoutVariant } from './FrameLayout';

// =============================================================================
// frame runtime contexts — the WidgetContextRegistry wire contract (JS half).
//
// Seven render contexts a resource participates in, and the per-node participation
// entries emitted by the PHP side. These types MUST match the PHP wire contract
// exactly; the client folds un-merged options at resolve time. See resolveWidgetFor.
// =============================================================================

/**
 * The seven render contexts, in three subject grains:
 *
 *  - property   `edit`, `detail`, `list-column`, `row-cell` — one field of one record;
 *               live under a property pointer.
 *  - record     `list-item` — one whole record (a card body, a row); lives at pointer "".
 *  - collection `summary`, `overview` — the whole collection, compressed to figures
 *               (`summary`) or expanded to a card with a body (`overview`); also at "".
 *
 * "A summary of THIS record" is `list-item`, not a new context. The PHP projector
 * refuses a record or collection context on a property, so the client never sees one
 * under a property pointer.
 */
export type FrameContext =
    | 'edit'
    | 'detail'
    | 'list-column'
    | 'list-item'
    | 'row-cell'
    | 'summary'
    | 'overview';

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
 * The per-resource contexts manifest. `byNode` keys: "" = resource root, carrying
 * every class-level declaration (`list-item`, `summary`, `overview`, and the
 * `#[RowActions]` `list-column` entry); any other key = a property key. `inherits`
 * is the cascade graph on the wire; `known` echoes the enabled contexts.
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
    /**
     * What THIS ACTOR may do to this resource — the axis every other field on this block lacks.
     *
     * `createAffordance`, `creatable`, `deletable` and `editable` all describe the RESOURCE: may
     * this be created at all, whose chrome owns the button. None of them describes who is asking,
     * so a shell driven by them alone renders a "New entry" button and a column of "Delete entry"
     * buttons to a reader holding nothing but `view`. Measured at `~/Herd/beam` on 2026-09-05:
     * exactly that, 13 delete buttons for a member.
     *
     * Resolved SERVER-side (`ResourceAuthorizer::capabilities()`) by the same object the write
     * endpoint asks, so an offered button and the 403 behind it cannot disagree. Already ANDed
     * with the resource flags, so a `deletable: false` resource reports `delete: false` no matter
     * what the actor holds — the shell reads one field per verb and never recombines two.
     *
     * ⚠️ This is **advisory**. It exists to stop offering controls that cannot work; it is not the
     * gate. The gate is the endpoint, which re-checks with the real record and 403s. A host wires
     * this into the injected {@link FrameCan} rather than the shells reading it directly, because
     * `can` is the seam frame already calls and a host may have a richer answer than the manifest's
     * class-level one.
     *
     * Absent (an older server, a hand-built fixture) ⇒ a host's `can` falls back to whatever it did
     * before, so nothing that exists today changes shape.
     */
    can?: {
        create?: boolean;
        update?: boolean;
        delete?: boolean;
        /**
         * Per declared action key: may THIS ACTOR press it (ADR-0005). Answered server-side by the
         * producer with the rule the action's own URL enforces. A shell draws an action only where
         * this is `true` — absent or `false` hides it — and the URL still refuses a wrong answer.
         */
        actions?: Record<string, boolean>;
    };
    /**
     * The resource's declared ACTIONS (ADR-0005), riding this block for the reason `layout` does: a
     * shell is handed its manifest, never the definition. Absent for a resource that declares none.
     */
    actions?: import('./types').ResourceActionDefinition[];
}

/** The full context vocabulary, in wire order. */
export const KNOWN_CONTEXTS: FrameContext[] = [
    'edit',
    'detail',
    'list-column',
    'list-item',
    'row-cell',
    'summary',
    'overview',
];

/**
 * The cascade edges, in the single-parent form the resolver consumes:
 *
 *  - `row-cell` inherits `edit`'s binding unless the node opts out
 *    (inheritsBinding:false) or the parent binding is heavyweight (suppressed).
 *  - `overview` inherits `summary`'s binding unless the node opts out, so a resource
 *    that declares only a summary still renders an honest overview card.
 *
 * The wire `inherits` block carries the same edges as arrays; this is the
 * resolver-facing projection.
 */
export const INHERITS: Partial<Record<FrameContext, FrameContext>> = {
    'row-cell': 'edit',
    overview: 'summary',
};
