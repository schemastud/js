import { D as DocManifest, N as NodeManifestEntry, M as MarkManifestEntry, C as ChildConstraint, B as BlockdocManifest, J as JsonSchema, A as AttrEditable, a as AttrWidgetOptions, b as NodeEditable } from './types-Dqvs7mU8.js';
export { P as PastePolicy } from './types-Dqvs7mU8.js';
import { Schema, AttributeSpec, Node } from '@tiptap/pm/model';

/**
 * Derive a PM attrs spec from a manifest attrsSchema (rule 5): one attr per
 * `properties` key, each `{ default: schema.default ?? null }`. When `forceId`
 * is set (nodes, not marks), `id` is present even if the schema omits it.
 *
 * Exported as a derivation piece: the Tiptap extension generator consumes the
 * same rule so the manifest compilation lives exactly once.
 */
declare function attrsFromSchema(attrsSchema: JsonSchema | undefined, forceId: boolean): Record<string, AttributeSpec>;
/** The containment subset of a manifest entry {@link contentExpressionFor} reads. */
interface ContainmentDeclaration {
    admitsChildCategories: string[] | null;
    admitsText?: boolean;
    contentExpression?: string | null;
    childConstraints?: Record<string, ChildConstraint>;
}
/**
 * Compile one {@link ChildConstraint} into a PM repetition operator for a
 * category term (B1). Returns null when the category is capped at zero (`max:0`)
 * — the caller omits the term entirely. `required` is sugar for `min: 1`.
 *
 *   undefined constraint            → '*'   (zero-or-more; the pre-B1 default)
 *   { required } / { min: 1 }       → '+'
 *   { min: 2 }                      → '{2,}'
 *   { max: 1 }                      → '?'
 *   { min: 1, max: 1 } / {req,max:1}→ '{1}'
 *   { min: 1, max: 3 }              → '{1,3}'
 *   { max: 3 }                      → '{0,3}'
 *   { max: 0 }                      → null  (excluded)
 *
 * Exported as a derivation piece (shared with the Tiptap extension generator).
 */
declare function quantifierFor(constraint: ChildConstraint | undefined): string | null;
/**
 * Derive a node's content expression (rules 1-3, extended by B1). Returns
 * undefined for leaves.
 *
 * 1. `contentExpression` set → verbatim.
 * 2. `admitsChildCategories` list → a quantified *sequence* over the categories
 *    (in declaration order) when `childConstraints` is present — each category
 *    carries its {@link quantifierFor} operator (`section+`, `heading{1}`); a
 *    `max:0` category is dropped. Without `childConstraints` the list stays the
 *    pre-B1 union `(catA | catB)*` (no regression). Empty list → leaf.
 * 3. null → `admitsText` ? 'inline*' : UNCONSTRAINED — the server's
 *    `admitsChildCategories() === null` means "admits anything"
 *    (Block::withContent enforces nothing), so the faithful compilation is the
 *    union of every block category the composed manifests declare. With no
 *    categories at all it degrades to a leaf.
 *
 * Exported as a derivation piece (shared with the Tiptap extension generator).
 */
declare function contentExpressionFor(entry: ContainmentDeclaration, allCategories: readonly string[]): string | undefined;
/**
 * Rule 4: the PM groups a node joins — its category (that is how content
 * expressions target nodes), and 'inline' first for inline nodes so the
 * rule-3 'inline*' expression (and PM's inline-content machinery) sees them.
 *
 * Exported as a derivation piece (shared with the Tiptap extension generator).
 */
declare function groupsFor(entry: NodeManifestEntry): string[];
/** The merged declarations of an ordered manifest composition. */
interface CollectedManifestEntries {
    doc: DocManifest;
    nodeEntries: NodeManifestEntry[];
    markEntries: MarkManifestEntry[];
}
/**
 * Merge an ordered manifest composition (e.g. `[base, profile]`): nodes and
 * marks concatenate — a later manifest may NOT redeclare an existing name
 * (throws); the last manifest with a non-null `doc` wins. Exactly one manifest
 * must provide a `doc`.
 *
 * Exported as a derivation piece (shared with the Tiptap extension generator).
 */
declare function collectManifestEntries(manifests: readonly BlockdocManifest[]): CollectedManifestEntries;
/**
 * Every block category the composed manifests declare, in declaration order —
 * the compilation target for unconstrained (null) admits.
 *
 * Exported as a derivation piece (shared with the Tiptap extension generator).
 */
declare function allBlockCategories(nodeEntries: readonly NodeManifestEntry[]): string[];
/**
 * Assemble a ProseMirror Schema from one manifest or an ordered array of them
 * (e.g. `[base, profile]`). Merging per {@link collectManifestEntries}. This
 * stays the conformance ORACLE: the Tiptap extension generator derives from
 * the same exported pieces, and the schema-parity test pins both compilations
 * to the same acceptance behavior.
 */
declare function assemblePMSchema(manifest: BlockdocManifest | BlockdocManifest[]): Schema;

/**
 * Readers for the manifest extension keywords landed in B1. The manifest keeps
 * attrsSchema deliberately loose (`Record<string, unknown>`) so the assembler
 * never has to understand attr semantics; these accessors are the *typed door*
 * the editor surface (B2 legality, B8 affordances, B12 array widget) reads
 * through instead of reaching into raw JSON. Every reader is total and
 * defensive: a malformed or absent key yields the neutral default, never throws.
 */

/** A single attrsSchema `properties` entry, kept loose like the schema itself. */
type PropertySchema = Record<string, unknown>;
/** The `x-editable` object on a node manifest entry (node-level: reorderable). */
declare function nodeEditable(entry: NodeManifestEntry): NodeEditable;
/** Whether a node's instances may be reordered among siblings (`x-editable.reorderable`). */
declare function isReorderable(entry: NodeManifestEntry): boolean;
/**
 * The reason string a negative affordance should display for a required child
 * of `category` under `entry`: the constraint's own `reason` wins, else the
 * child node type's `x-required-reason` (looked up via `childEntry`), else null.
 */
declare function requiredReason(constraint: ChildConstraint | undefined, childEntry?: NodeManifestEntry): string | null;
/** The `x-editable` object inside a single attrsSchema property (attr-level). */
declare function attrEditable(property: PropertySchema | undefined): AttrEditable;
/**
 * The `x-dereference-target` on an attr property — the category/type name whose
 * instances scope a picker's candidate set (a reference edge, 02/09). Null when
 * the attr is not a scoped reference.
 */
declare function attrDereferenceTarget(property: PropertySchema | undefined): string | null;
/**
 * Whether an attr is a `pick-many` multi-reference (array of edges, 09 G1) —
 * true when the property declares `pick-many: true`, or is an array whose items
 * carry an `x-dereference-target`.
 */
declare function attrIsPickMany(property: PropertySchema | undefined): boolean;
/** The `x-widget-options` presentation hints on an attr property. */
declare function attrWidgetOptions(property: PropertySchema | undefined): AttrWidgetOptions;

/**
 * The grammar-legality read API (B2) — a headless reader over an assembled
 * schema + its manifests that answers every "is this move legal, and if not
 * why?" question the prevent-first surface (B8) needs, plus the shell-owned
 * structural `completeness` read (08 §2). It computes against the ProseMirror
 * model only (no view, no DOM), so it is fully unit-testable and medium-agnostic.
 *
 * Position convention: every `pos` argument is the position *directly before*
 * the target node — exactly what `doc.descendants((node, pos) => …)` yields and
 * what a `NodeSelection` resolves from, so `doc.resolve(pos).nodeAfter` is the
 * node and `doc.resolve(pos).index()` its index in its parent.
 *
 * The structural checks (can this be deleted / duplicated / dropped here) ride
 * ProseMirror's own content-match machinery (`Node.canReplace*`), which already
 * enforces the richer content expressions B1 compiles from `childConstraints`.
 * The manifest index adds only what PM does not carry: the *reason* strings and
 * the required-minimums / required-attrs that drive `completeness`.
 */

/** A legality answer: whether the gesture is allowed and, if not, why (opaque). */
interface Verdict {
    allowed: boolean;
    reason: string | null;
}
/** The shell-owned structural completeness read (08 §2) — medium-agnostic. */
interface Completeness {
    /** Sum of every required-child minimum across the document. */
    requiredTotal: number;
    /** How many of those required slots are satisfied by a present, non-empty child. */
    requiredFilled: number;
    /** Ids of nodes that are structurally incomplete (missing a required child,
     * or present-but-empty while occupying a required slot). */
    incompleteNodeIds: string[];
}
/** The min/max the candidate's category must satisfy in the parent at `pos`. */
interface InsertableArity {
    min: number;
    /** null = unbounded. `max: 1` is the "max 1" affordance. */
    max: number | null;
}
/** A reference edge a candidate node-type declares on one of its attrs. */
interface InsertableEdgeTarget {
    /** The attr that carries the reference. */
    attr: string;
    /** The category/type whose instances scope the picker (`x-dereference-target`). */
    target: string;
    /** True → an array of edges (the `pick-many → catalog` affordance). */
    pickMany: boolean;
}
/**
 * An enriched insert candidate (B1). Everything here is derived from manifest +
 * legality data the reader already holds — no new source of truth, no PM change.
 * Affordance labels (`text·inline`, `product·attrs`, `pick-many → catalog`,
 * `max 1`) are derivable by a renderer from these fields.
 */
interface InsertableCandidate {
    nodeType: string;
    /** null when the node-type has no category (untargetable via category). */
    category: string | null;
    /** A short display label (category, else the node-type name — parity with `insertableAt`). */
    label: string;
    /** The category arity in the parent at this position, or null when categoryless. */
    arity: InsertableArity | null;
    /** The first reference edge this node-type declares, or null. */
    edgeTarget: InsertableEdgeTarget | null;
}
/**
 * A required-child deficit (ED-13 B7): a parent node that has fewer than `min`
 * children of a required `category`. The shell paints a "Missing: N ⟨category⟩"
 * card at the parent from these (F6). Additive read — no PM change.
 */
interface RequiredSlot {
    parentId: string;
    category: string;
    min: number;
    filled: number;
}
interface LegalityReader {
    /** Categories that may be inserted at `pos` (the palette's candidate set). */
    insertableAt(doc: Node, pos: number): string[];
    /** Enriched, per-node-type candidates at `pos` (category/arity/edge metadata). */
    insertableCandidatesAt(doc: Node, pos: number): InsertableCandidate[];
    /** May the node before `pos` be removed without violating its parent? */
    canDelete(doc: Node, pos: number): Verdict;
    /** May a copy of the node before `pos` be inserted after it (ceiling check)? */
    canDuplicate(doc: Node, pos: number): Verdict;
    /** May the node before `pos` be lifted one level out of its parent? */
    canUnnest(doc: Node, pos: number): Verdict;
    /** May the node before `from` move to the gap at `targetPos`? Guards BOTH
     * the target (does it accept?) and the SOURCE floor (does removing it keep
     * the source valid?) — a move is delete-here + insert-there (08). */
    canDragTo(doc: Node, from: number, targetPos: number): Verdict;
    /** The nearest insert position to `targetPos` that legally accepts the node
     * before `from`, or null if none (e.g. the source floor forbids the move). */
    nearestValidSlot(doc: Node, from: number, targetPos: number): number | null;
    /** Structural completeness of the whole document (shell-owned). */
    completeness(doc: Node): Completeness;
    /** Per-parent required-category deficits (ED-13 B7) — `filled < min` entries. */
    requiredBreakdown(doc: Node): RequiredSlot[];
    /** Q7: is this node content-empty? Textblock/container → no content; leaf →
     * an unset required attr; plain atomic leaf → never empty. */
    isContentEmpty(node: Node): boolean;
    /** Does this node itself lack a required child (self-computable shortfall)? */
    isIncomplete(node: Node): boolean;
}
/**
 * Build a legality reader bound to a manifest composition (e.g. `[base,
 * profile]`). The reader is stateless per call — pass whichever `doc` you are
 * asking about.
 */
declare function createLegalityReader(manifest: BlockdocManifest | BlockdocManifest[]): LegalityReader;

/**
 * The attribute name carrying a node's stable identity. Force-present on every
 * assembled node type (default null); the server stamps UUIDv7 ids lazily
 * (Block::id()) and the client mirrors that convention via generateNodeId().
 */
declare const NODE_ID_ATTR = "id";
/**
 * Generate a fresh node id: a UUIDv7, matching the server's `Str::uuid7()` so
 * client-minted and server-minted ids sort together chronologically.
 */
declare function generateNodeId(): string;

/**
 * EP-07c read-compat: normalize a stored document's pre-07c base-prose node names to
 * their post-07c JSX-tag names (ADR-0228 d6) on load, so the editor — whose schema
 * only knows the new names — can render a document saved before EP-07c B's data
 * migration has run. Editing then writes the new names back (the editor's schema emits
 * them), so a save migrates the document on write, consistent with B.
 *
 * This table is the byte-identical mirror of laravel-blockdoc's `LegacyProseNodes`
 * (PHP) and EP-07c B's migration; see that class for the canonical description. The
 * whole read-compat path is removed once every host has migrated (tracked in ticket 00).
 */
/** Pre-07c name → post-07c name, for the level-independent prose nodes. */
declare const LEGACY_PROSE_RENAME: Readonly<Record<string, string>>;
/**
 * EP-07c part C: pre-07c composition COMPONENT node names → their post-07c PascalCase JSX
 * tags (a component's JSX tag is its #[NodeType] name, from Tower's Block classes). A
 * separate set from the prose rename so part B is unchanged; the normalizer applies both.
 * Mirrors laravel-satellite-composition's `SlotNodeRename::COMPONENT_RENAME` byte-for-byte.
 */
declare const LEGACY_COMPONENT_RENAME: Readonly<Record<string, string>>;
/**
 * A pre-07c `heading` carried its level as an attr; post-07c the level IS the tag,
 * clamped to h2..h6 (h2 floor — the page title owns the one h1 — default 3), matching
 * the PHP serializer and B's migration exactly.
 */
declare function legacyHeadingTag(level: unknown): string;
/**
 * Deep-normalize a stored document (or any node subtree) so every pre-07c prose node
 * name becomes its post-07c tag. Pure: returns a new tree, leaving the input untouched.
 * A `heading` becomes h2..h6 by its level and drops the now-meaningless `level` attr;
 * an unknown name (a current name, or a typed component) passes through unchanged.
 */
declare function normalizeLegacyNodeNames<T>(doc: T): T;

export { AttrEditable, AttrWidgetOptions, BlockdocManifest, ChildConstraint, type CollectedManifestEntries, type Completeness, type ContainmentDeclaration, DocManifest, type InsertableArity, type InsertableCandidate, type InsertableEdgeTarget, JsonSchema, LEGACY_COMPONENT_RENAME, LEGACY_PROSE_RENAME, type LegalityReader, MarkManifestEntry, NODE_ID_ATTR, NodeEditable, NodeManifestEntry, type PropertySchema, type RequiredSlot, type Verdict, allBlockCategories, assemblePMSchema, attrDereferenceTarget, attrEditable, attrIsPickMany, attrWidgetOptions, attrsFromSchema, collectManifestEntries, contentExpressionFor, createLegalityReader, generateNodeId, groupsFor, isReorderable, legacyHeadingTag, nodeEditable, normalizeLegacyNodeNames, quantifierFor, requiredReason };
