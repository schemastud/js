import * as react from 'react';
import { ComponentType } from 'react';
import { Node } from '@tiptap/pm/model';
import { EditorView } from '@tiptap/pm/view';
import { ReactNodeViewProps } from '@tiptap/react';
import { SchemaNode } from '@schemastud/seam';
import { J as JsonSchema, N as NodeManifestEntry, B as BlockdocManifest } from './types-Cir_z1Em.js';

/**
 * The commit/rebuild brain of the editor island, factored out of React so the
 * decisions are exhaustively testable without a live EditorView:
 *
 * - Commits (doc.toJSON()) fire on trailing debounce, blur, and flush().
 * - A last-committed guard absorbs the RJSF onChange echo: an external value
 *   equal to the last-committed JSON is ignored; a differing one asks the
 *   island to rebuild EditorState (which must NOT fire a commit).
 */
/** A serialized ProseMirror document (doc.toJSON()). */
type DocJson = Record<string, unknown>;
interface CommitPolicy {
    /** Trailing debounce for transaction-driven commits. Default 400. */
    debounceMs?: number;
    /** Whether blur commits immediately. Default true. */
    onBlur?: boolean;
}
type ExternalValueDecision = 'ignore' | 'rebuild';
declare class CommitController {
    private readonly getDoc;
    private readonly deliver;
    private readonly debounceMs;
    private readonly commitOnBlur;
    private lastCommitted;
    private dirty;
    private timer;
    constructor(getDoc: () => DocJson, deliver: (doc: DocJson) => void, policy?: CommitPolicy, initialValue?: DocJson | null);
    /** A doc-changing transaction landed: restart the trailing debounce. */
    noteChange(): void;
    /** Blur commits immediately (unless the policy opts out). */
    noteBlur(): void;
    /** Commit synchronously when dirty; a clean flush is a no-op. */
    flush(): void;
    /**
     * The last-committed guard: equal to what we last committed (the RJSF
     * onChange echo) ⇒ ignore; different ⇒ the island must rebuild.
     */
    receiveExternalValue(value: DocJson | null | undefined): ExternalValueDecision;
    /**
     * The island rebuilt EditorState from an external value. Resets dirt and
     * any pending debounce — a rebuild never fires a commit — and re-seeds the
     * guard so the rebuilt value's own echo is absorbed.
     */
    noteRebuilt(value: DocJson | null | undefined): void;
    get isDirty(): boolean;
    dispose(): void;
    private clearTimer;
}

/** A block node a skin renders — its node-type plus resting attribute values. */
interface SkinNode {
    type: string;
    attrs?: Record<string, unknown>;
}
/**
 * Per-render context threaded to a skin. `attrsSchema` is the node-type's
 * attribute schema (the fallback enumerates field anchors from it); any
 * per-editor rich props ride alongside without the registry knowing them —
 * that's what keeps the seam context-free.
 */
interface SkinContext {
    attrsSchema?: SchemaNode;
    [key: string]: unknown;
}
/**
 * A skin is a minimal `(node, ctx) => ReactNode`. It owns only a node-type's
 * resting look; it has no frame context and no ProseMirror knowledge (the shell
 * owns selection chrome and editing). Per-editor rich props thread through `ctx`
 * so the shared registry never has to know them.
 */
type SkinComponent = (node: SkinNode, ctx?: SkinContext) => React.ReactNode;
/**
 * One skin a later `registerSkin` of the same key displaced: the skin that was registered, who registered
 * it, and who registered the one that took its place. `null` where a registration named nobody. History
 * only: a displaced skin is never resolved.
 */
interface SupersededSkin {
    readonly skin: SkinComponent;
    readonly by: string | null;
    readonly supersededBy: string | null;
}
/**
 * `skinRegistrant` and `supersededSkins` are optional so a hand-written `SkinRegistry` keeps compiling;
 * every registry `createSkinRegistry()` returns has both.
 */
interface SkinRegistry {
    /**
     * Register a skin for a node-type. A later registration replaces an earlier one (the declared
     * `Supersede` policy) and the displaced skin is recorded. `by` names who is registering (a package
     * name, say); left out, the registrant reads back as `null`.
     */
    registerSkin: (nodeType: string, skin: SkinComponent, by?: string) => void;
    /** Resolve the skin for a node-type; falls back to the block-chrome skin. */
    resolveSkin: (nodeType: string) => SkinComponent;
    /** Whether a node-type has an explicitly registered skin (vs. the fallback). */
    hasSkin: (nodeType: string) => boolean;
    /** The fallback skin this registry resolves to when nothing is registered. */
    fallback: SkinComponent;
    /** Who registered the skin this key resolves to, or `null` when nothing is registered or it named nobody. */
    skinRegistrant?: (nodeType: string) => string | null;
    /** What later registrations of this key displaced, oldest first. Empty when it was registered at most once. */
    supersededSkins?: (nodeType: string) => SupersededSkin[];
}

/**
 * Props every blockdoc NodeView component receives. This is the PUBLIC
 * contract hosts register components against — it survived the Tiptap swap
 * unchanged (the Tiptap-side plumbing is absorbed by {@link tiptapNodeView}).
 */
interface NodeViewComponentProps {
    node: Node;
    view: EditorView;
    getPos: () => number | undefined;
    /** Patch node attrs (merged over the current ones; id is preserved). */
    updateAttrs: (attrs: Record<string, unknown>) => void;
    /** The manifest's attrsSchema for this node type, when known. */
    attrsSchema?: JsonSchema;
    /**
     * Where PM-managed child content goes: render `<div ref={contentRef} />`
     * at the passthrough spot. Null for leaf nodes.
     */
    contentRef: ((element: HTMLElement | null) => void) | null;
    /** Whether PM currently selects this node (Tiptap-provided; drives chrome). */
    selected?: boolean;
    /** The resolved skin (resting body). Only the generic node-view reads it. */
    skin?: SkinComponent;
}
/**
 * The base prose set renders natively — PM's own DOM, no NodeView chrome.
 * Everything else in a manifest is a typed block whose attrs (beyond id) are
 * only editable through chrome, so it gets the generic NodeView unless a host
 * registers a richer component.
 */
declare const BASE_PROSE_NODE_NAMES: ReadonlySet<string>;
/**
 * One component a later `registerNodeView` of the same name displaced: the component that was
 * registered, who registered it, and who registered the one that took its place. `null` where a
 * registration named nobody. History only: a displaced component is never resolved.
 */
interface SupersededNodeView {
    readonly component: ComponentType<NodeViewComponentProps>;
    readonly by: string | null;
    readonly supersededBy: string | null;
}
/**
 * Registering a name that is already registered REPLACES the component (the kernel's `Supersede`
 * policy, declared in `createNodeViewRegistry`), and the displaced one is recorded. It never throws.
 * `by` names who is registering (a package name, say); left out, the registrant reads back as `null`.
 *
 * `nodeViewRegistrant` and `supersededNodeViews` are optional so a hand-written `NodeViewRegistry`
 * keeps compiling; every registry `createNodeViewRegistry()` returns has both.
 */
interface NodeViewRegistry {
    registerNodeView(nodeTypeName: string, component: ComponentType<NodeViewComponentProps>, by?: string): void;
    resolveNodeView(nodeTypeName: string): ComponentType<NodeViewComponentProps> | undefined;
    /** Who registered the component this name resolves to, or `null` when nothing is registered or it named nobody. */
    nodeViewRegistrant?(nodeTypeName: string): string | null;
    /** What later registrations of this name displaced, oldest first. Empty when it was registered at most once. */
    supersededNodeViews?(nodeTypeName: string): SupersededNodeView[];
}
/**
 * A registry over an `@schemastud/registry` registry rooted at `blockdoc.node-views` that declares
 * `Supersede`; later registrations replace earlier ones. Any string is a node name (`ContentSection`,
 * `contentSection`, `content_section`, `p`); a name nothing is registered under, and a name that is
 * not a string, resolves `undefined`, so `resolveNodeViewComponents` falls to the generic NodeView.
 */
declare function createNodeViewRegistry(): NodeViewRegistry;
/**
 * Whether a manifest node needs the generic NodeView when nothing is
 * registered: any node outside the base prose set (it either carries attrs
 * beyond id or is a typed block with no native rendering — both need chrome).
 */
declare function needsGenericNodeView(entry: NodeManifestEntry): boolean;
interface ResolvedNodeView {
    component: ComponentType<NodeViewComponentProps>;
    attrsSchema?: JsonSchema;
    /** The skin the generic node-view composes as its resting body. */
    skin?: SkinComponent;
}
/**
 * The resolution the manifest→extensions generator binds NodeViews from: a
 * registered component wins; unregistered non-base nodes fall back to the
 * generic NodeView; base prose nodes are absent (native rendering).
 */
declare function resolveNodeViewComponents(manifests: readonly BlockdocManifest[], registry?: NodeViewRegistry, skins?: SkinRegistry): Map<string, ResolvedNodeView>;
/**
 * Adapt a blockdoc NodeView component to Tiptap's ReactNodeViewRenderer: the
 * wrapper element rides NodeViewWrapper, the contentDOM passthrough rides the
 * React NodeView context's contentRef (equivalent to rendering
 * NodeViewContent), and updateAttrs keeps the merge-and-preserve-id contract.
 */
declare function tiptapNodeView(resolved: ResolvedNodeView): ComponentType<ReactNodeViewProps>;
/**
 * The generic NodeView (ED-06) — **editor chrome only**. It draws PM-specific
 * chrome (selection ring / drag handle via seam's SelectionChrome), composes the
 * resolved **skin** as its resting body (a pure presenter that tags each attr
 * with `data-attr`), and passes PM-managed content through `contentRef`. There is
 * **no inline form** — attr-editing has moved to the inspector (ED-08). An
 * unregistered node-type composes seam's block-chrome fallback skin.
 */
declare function GenericNodeView({ node, attrsSchema, contentRef, skin, selected }: NodeViewComponentProps): react.JSX.Element;

export { BASE_PROSE_NODE_NAMES as B, type CommitPolicy as C, type DocJson as D, type ExternalValueDecision as E, GenericNodeView as G, type NodeViewRegistry as N, type ResolvedNodeView as R, type SkinRegistry as S, type SkinNode as a, type SkinContext as b, type SkinComponent as c, CommitController as d, type NodeViewComponentProps as e, createNodeViewRegistry as f, needsGenericNodeView as n, resolveNodeViewComponents as r, tiptapNodeView as t };
