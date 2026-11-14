import * as react from 'react';
import { ReactNode } from 'react';
import { Editor, Extensions } from '@tiptap/core';
import { Schema, Node } from '@tiptap/pm/model';
import { Plugin, Selection, EditorState } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { B as BlockdocManifest, J as JsonSchema } from './types-Cir_z1Em.js';
import { D as DocJson, C as CommitPolicy, N as NodeViewRegistry, S as SkinRegistry, a as SkinNode, b as SkinContext, c as SkinComponent } from './node-views-BLa_xINq.js';
export { B as BASE_PROSE_NODE_NAMES, d as CommitController, E as ExternalValueDecision, G as GenericNodeView, e as NodeViewComponentProps, R as ResolvedNodeView, f as createNodeViewRegistry, n as needsGenericNodeView, r as resolveNodeViewComponents, t as tiptapNodeView } from './node-views-BLa_xINq.js';
import { SchemaNode } from '@schemastud/seam';
import '@tiptap/react';

/**
 * The collaboration seam, deliberately empty of implementation: the island
 * consumes a DocSource internally, so a collab-backed source (pushing remote
 * docs through `subscribe`) can replace the default without touching the
 * island. The default simply wraps the `value` prop.
 */
interface DocSource {
    get(): DocJson | null;
    subscribe?(listener: (doc: DocJson | null) => void): () => void;
}
/** The default DocSource: a snapshot of the island's `value` prop. */
declare function valueDocSource(value: DocJson | null | undefined): DocSource;

/**
 * The flush-before-intent hook: hosts hand the island a bus; the island
 * registers its flush and the host calls every registered flush before
 * dispatching an intent or submitting.
 */
interface CommitBus {
    register(flush: () => void): () => void;
}
/** The inspector's view of a node: its type + id-stripped attrs schema + attrs. */
interface NodeAttrsView {
    type: string;
    attrsSchema?: JsonSchema;
    attrs: Record<string, unknown>;
}
interface BlockdocEditorHandle {
    /** Commit synchronously when dirty (no-op when clean). */
    flushCommits(): void;
    /** The live EditorView (null before mount). */
    view: EditorView | null;
    /** The live Tiptap Editor (null before mount). */
    editor: Editor | null;
    /**
     * Node-attrs channel — pull (ED-07). Resolve a node by id against the live
     * PM doc + manifest, with the identity attr stripped so the inspector never
     * sees it. Returns null when the node is gone (selection raced a delete).
     */
    getNode(nodeId: string): NodeAttrsView | null;
    /**
     * Node-attrs channel — push (ED-07). Apply attr edits as a PM transaction
     * that rides the SAME commit pipe as typing (onUpdate → CommitController →
     * onChange). No second save path. The identity attr is preserved.
     */
    setNodeAttrs(nodeId: string, attrs: Record<string, unknown>): void;
}
interface BlockdocEditorProps {
    /** False when the owning editor supplies the sole undo history (e.g. Beam Local Session). */
    history?: boolean;
    /** Ordered manifests (e.g. [base, profile]) compiled into Tiptap extensions. */
    manifests: BlockdocManifest | BlockdocManifest[];
    /** PM doc JSON; null/undefined initializes an empty doc valid per schema. */
    value?: DocJson | null;
    /** Receives doc.toJSON() at every commit boundary. */
    onChange?: (doc: DocJson) => void;
    commitPolicy?: CommitPolicy;
    commitBus?: CommitBus;
    /** Fires with {@link selectionNodeId} whenever the selection's node id changes. */
    onSelectionChange?: (nodeId: string | null) => void;
    nodeViews?: NodeViewRegistry;
    /** Collab seam: extra PM plugins appended to the island's list. */
    extraPlugins?: (context: {
        schema: Schema;
    }) => Plugin[];
    /** Collab seam: replaces the default value-prop-wrapping source. */
    docSource?: DocSource;
    /**
     * Collab seam (B4, 10): swap the id-stamping plugin. Defaults to
     * {@link nodeIdPlugin} (single-user, content-similarity rematch). A
     * collaborative build replaces it with a CRDT-aware plugin that guarantees
     * stable ids survive a merge — the named debt: `NodeIdRematcher` does NOT
     * cover concurrency, and id-merge-safety is the collab effort's to own.
     */
    idPlugin?: () => Plugin;
    /** Show the insert palette (manifest block node types). Default true. */
    palette?: boolean;
    className?: string;
}
/**
 * The editor island, on Tiptap (ADR-0072, amended): owns the Editor for its
 * lifetime, initializes from `value`, commits doc.toJSON() through onChange
 * on trailing debounce, blur, and flush (ref or commitBus). The
 * last-committed guard absorbs the RJSF onChange echo; a genuinely external
 * value rebuilds the document via a commit-suppressed, history-free
 * setContent with the selection remapped by node id. Our integrity plugins
 * (node id, annotation) stay raw PM plugins registered through
 * `addProseMirrorPlugins`, as does the `extraPlugins` collab seam.
 */
declare const BlockdocEditor: react.ForwardRefExoticComponent<BlockdocEditorProps & react.RefAttributes<BlockdocEditorHandle>>;

/**
 * The id of the node the selection lives in: the selected node itself for a
 * NodeSelection, otherwise the nearest ancestor of $from carrying a string id.
 */
declare function selectionNodeId(state: EditorState): string | null;
/**
 * Remap a selection into a (rebuilt) doc by node id: place it at the start of
 * the node carrying `id`, falling back to the doc start when the node did not
 * survive.
 */
declare function selectionForNodeId(doc: Node, id: string | null): Selection;
/**
 * Find the node carrying `id` in `doc`, with its position. Returns null when no
 * node has that id (e.g. a selection raced a delete) — callers must tolerate it.
 */
declare function findNodeById(doc: Node, id: string): {
    node: Node;
    pos: number;
} | null;

/**
 * The manifest → Tiptap compilation. GUARDRAIL (ADR-0072): the manifest stays
 * the source of truth — every Node/Mark extension here is GENERATED, never
 * hand-authored per node type, and the structural rules (content expressions,
 * groups, attrs, doc admission, merge semantics) are the exact derivation
 * pieces exported by `core/assemble` — `assemblePMSchema` remains the
 * conformance oracle and the schema-parity test pins both compilations
 * together. What this module ADDS over the oracle is presentation only: the
 * editing DOM (parseHTML/renderHTML mirroring the retired `withEditingDOM` —
 * semantic tags for the base prose set, generic `div[data-node-type]` for
 * typed blocks) and NodeView bindings.
 */
interface ManifestExtensionsOptions {
    /**
     * Slot-level doc admission override (category slugs) — replaces the
     * merged manifests' doc admission, mirroring the server's write-path
     * check (the same declaration `x-widget-options.docAdmits` carries).
     */
    docAdmits?: string[];
    /** NodeView registry; resolution rules are {@link resolveNodeViewComponents}. */
    nodeViews?: NodeViewRegistry;
    /**
     * Skin registry the generic node-view composes resting bodies from (ED-06).
     * Defaults to seam's default skin registry; unregistered node-types fall
     * back to seam's block-chrome skin.
     */
    skins?: SkinRegistry;
}
/**
 * Compile one manifest or an ordered composition (e.g. `[base, profile]`)
 * into Tiptap extensions: a Document whose content derives from the doc
 * admission, the implicit Text node, one generated Node per manifest node
 * (with editing DOM and, where resolution says so, a React NodeView), and one
 * generated Mark per manifest mark.
 */
declare function createManifestExtensions(manifests: BlockdocManifest | BlockdocManifest[], options?: ManifestExtensionsOptions): Extensions;

/**
 * Annotation-mark id integrity (splicewire-editor issue 09). The `annotation`
 * mark (base manifest; `excludes: ''` so distinct annotations may overlap)
 * carries an `id` attr addressing span-level bindings — the SQL graph is
 * authoritative, mark ids are a location index. Distinct ids already prevent
 * ProseMirror's adjacent-mark merging; an id legitimately becomes multi-range
 * after a split, so resolvers return ALL ranges for an id. What integrity has
 * to enforce is existence: an annotation mark must never live without an id
 * (paste from external sources, programmatic marks) — this plugin assigns one
 * in an appendTransaction.
 */
declare const ANNOTATION_MARK_NAME = "annotation";
declare function annotationIntegrityPlugin(): Plugin;
interface AnnotationRange {
    from: number;
    to: number;
}
/**
 * Every range the annotation id covers, in document order. A split annotation
 * (an id spanning discontiguous text after edits) yields multiple ranges;
 * adjacent same-id leaves coalesce into one.
 */
declare function annotationRanges(doc: Node, id: string): AnnotationRange[];
/** Every annotation id present in the document. */
declare function annotationIds(doc: Node): Set<string>;

/**
 * Identity integrity: after any doc-changing transaction, every node carrying
 * the id attr must hold a unique string id. Assigns generateNodeId() to nodes
 * whose id is null/empty and to later duplicates (paste duplicates ids!).
 * Attr-only patches, so positions stay stable while we walk.
 */
declare function nodeIdPlugin(): Plugin;

/**
 * The uniform selection-chrome primitive (B3) — row 2 of the four-part render
 * model (06). It draws the *same* ring / handle / badge / outline around ANY
 * skin (a registered NodeView or the neutral fallback), so a skin ships **zero
 * chrome code**: the shell owns selection, the skin owns only its resting look.
 * It is grammar-blind and medium-agnostic (it rides `selectedNodeId` + B2's
 * completeness flags, never the document model), which is what lets rows 2 + 4
 * generalize across media while rows 1 + 3 stay PM-specific.
 *
 * The contract is **plural from day one** so it doubles as the collaboration
 * presence reservation (10, = 06's chrome extraction): `remoteSelections` and
 * `advisory` are rendered but wired to nothing — no transport exists yet. When
 * collab lands, the realtime channel (never the document — see
 * `lock-and-presence-state-lives-in-transport`) fills these props.
 */
interface RemoteSelection {
    /** Stable id of the participant holding this remote selection. */
    ownerId: string;
    /** Human label to show on the cursor (falls back to `ownerId`). */
    ownerLabel?: string;
    /** Presentation color for the cursor/ring (host-assigned per participant). */
    color?: string;
}
interface SelectionChromeProps {
    /** Stable id of the node this chrome wraps (the `selectedNodeId` currency). */
    nodeId: string;
    /** Is this node the local user's current selection? Draws the ring + handle. */
    localSelected?: boolean;
    /** Remote participants selecting this node (reserved; renders N cursors). */
    remoteSelections?: RemoteSelection[];
    /** Advisory soft-lock presence (reserved; decoration only, never a gate). */
    advisory?: boolean;
    /** Grammar-required node (08) — draws the required badge. */
    required?: boolean;
    /** Structurally incomplete per B2 completeness — draws the incomplete outline. */
    incomplete?: boolean;
    /** The skin (row 1) or fallback card this chrome is drawn around. */
    children: ReactNode;
}
/**
 * Draw the shell selection chrome around a skin. All decoration is
 * `pointer-events: none` and absolutely positioned so the wrapped skin keeps
 * its own layout and interaction untouched.
 */
declare function SelectionChrome({ nodeId, localSelected, remoteSelections, advisory, required, incomplete, children, }: SelectionChromeProps): react.JSX.Element;

declare function BlockChromeFallback(node: SkinNode, ctx?: SkinContext): react.JSX.Element;

/**
 * A peer of `createWidgetRegistry()` for **skins** — a node-type's resting look.
 * Context-free and per-consumer: each call yields a fresh, isolated instance
 * keyed by node-type (register / resolve / fallback). When a node-type has no
 * registered skin, `resolveSkin` returns the block-chrome fallback skin, so a
 * caller can always render *something* for any node.
 *
 * The registry knows nothing of frame context or ProseMirror; a skin is just a
 * minimal `(node, ctx) => ReactNode`, so per-editor rich props thread through
 * `ctx` without the shared registry knowing them.
 */
declare function createSkinRegistry(fallback?: SkinComponent): SkinRegistry;
/**
 * Default singleton — a shared registry for callers that don't create their own.
 * Extended by `registerSkin` calls; isolated from any `createSkinRegistry()`.
 */
declare const defaultSkinRegistry: SkinRegistry;
declare const resolveSkin: (nodeType: string) => SkinComponent;

interface ResolvedSkin {
    /** The skin component to render (never null — the registry falls back). */
    skin: SkinComponent;
    /** The registry key that resolved it (the override name, or the node-type). */
    key: string;
    /** Whether an authored `x-skin` override won, or the node-type default. */
    source: 'override' | 'node-type';
    /** True when `key` had no registered skin — the block-chrome fallback rendered. */
    fallback: boolean;
}
declare function resolveSkinFor(nodeType: string, schema: SchemaNode | undefined, registry: SkinRegistry): ResolvedSkin;

export { ANNOTATION_MARK_NAME, type AnnotationRange, BlockChromeFallback, BlockdocEditor, type BlockdocEditorHandle, type BlockdocEditorProps, type CommitBus, CommitPolicy, DocJson, type DocSource, type ManifestExtensionsOptions, type NodeAttrsView, NodeViewRegistry, type RemoteSelection, type ResolvedSkin, SelectionChrome, type SelectionChromeProps, SkinComponent, SkinContext, SkinNode, SkinRegistry, annotationIds, annotationIntegrityPlugin, annotationRanges, createManifestExtensions, createSkinRegistry, defaultSkinRegistry, findNodeById, nodeIdPlugin, resolveSkin, resolveSkinFor, selectionForNodeId, selectionNodeId, valueDocSource };
