import * as react from 'react';
import { Editor, Extensions } from '@tiptap/core';
import { Schema, Node } from '@tiptap/pm/model';
import { Plugin, Selection, EditorState } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { B as BlockdocManifest, J as JsonSchema } from './types-Dqvs7mU8.js';
import { D as DocJson, C as CommitPolicy, N as NodeViewRegistry } from './node-views-C49i_GSm.js';
export { B as BASE_PROSE_NODE_NAMES, a as CommitController, E as ExternalValueDecision, G as GenericNodeView, b as NodeViewComponentProps, R as ResolvedNodeView, c as createNodeViewRegistry, n as needsGenericNodeView, r as resolveNodeViewComponents, t as tiptapNodeView } from './node-views-C49i_GSm.js';
import { SkinRegistry } from '@schemastud/seam';
export { BlockChromeFallback, RemoteSelection, SelectionChrome, SelectionChromeProps, SkinComponent, SkinContext, SkinNode, SkinRegistry, createSkinRegistry, defaultSkinRegistry, resolveSkin } from '@schemastud/seam';
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

export { ANNOTATION_MARK_NAME, type AnnotationRange, BlockdocEditor, type BlockdocEditorHandle, type BlockdocEditorProps, type CommitBus, CommitPolicy, DocJson, type DocSource, type ManifestExtensionsOptions, type NodeAttrsView, NodeViewRegistry, annotationIds, annotationIntegrityPlugin, annotationRanges, createManifestExtensions, findNodeById, nodeIdPlugin, selectionForNodeId, selectionNodeId, valueDocSource };
