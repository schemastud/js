import type { Node as PMNode } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import { NodeViewWrapper, useReactNodeView } from '@tiptap/react';
import type { ReactNodeViewProps } from '@tiptap/react';
import { BlockChromeFallback, defaultSkinRegistry, SelectionChrome } from '@schemastud/seam';
import type { SkinComponent, SkinContext, SkinNode, SkinRegistry } from '@schemastud/seam';
import type { ComponentType } from 'react';
import { NODE_ID_ATTR } from '../core';
import type { BlockdocManifest, JsonSchema, NodeManifestEntry } from '../core';

/**
 * Props every blockdoc NodeView component receives. This is the PUBLIC
 * contract hosts register components against — it survived the Tiptap swap
 * unchanged (the Tiptap-side plumbing is absorbed by {@link tiptapNodeView}).
 */
export interface NodeViewComponentProps {
    node: PMNode;
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
export const BASE_PROSE_NODE_NAMES: ReadonlySet<string> = new Set([
    'paragraph',
    'heading',
    'blockquote',
    'bullet_list',
    'ordered_list',
    'list_item',
    'code_block',
    'horizontal_rule',
    'hard_break',
    'text',
]);

export interface NodeViewRegistry {
    registerNodeView(nodeTypeName: string, component: ComponentType<NodeViewComponentProps>): void;
    resolveNodeView(nodeTypeName: string): ComponentType<NodeViewComponentProps> | undefined;
}

/** A plain map-backed registry; later registrations replace earlier ones. */
export function createNodeViewRegistry(): NodeViewRegistry {
    const components = new Map<string, ComponentType<NodeViewComponentProps>>();

    return {
        registerNodeView(nodeTypeName, component) {
            components.set(nodeTypeName, component);
        },
        resolveNodeView(nodeTypeName) {
            return components.get(nodeTypeName);
        },
    };
}

/**
 * Whether a manifest node needs the generic NodeView when nothing is
 * registered: any node outside the base prose set (it either carries attrs
 * beyond id or is a typed block with no native rendering — both need chrome).
 */
export function needsGenericNodeView(entry: NodeManifestEntry): boolean {
    if (BASE_PROSE_NODE_NAMES.has(entry.name)) {
        return false;
    }

    const properties = (entry.attrsSchema?.properties ?? {}) as Record<string, unknown>;

    return Object.keys(properties).some((name) => name !== NODE_ID_ATTR) || !BASE_PROSE_NODE_NAMES.has(entry.name);
}

export interface ResolvedNodeView {
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
export function resolveNodeViewComponents(
    manifests: readonly BlockdocManifest[],
    registry?: NodeViewRegistry,
    skins?: SkinRegistry,
): Map<string, ResolvedNodeView> {
    const skinRegistry = skins ?? defaultSkinRegistry;
    const resolved = new Map<string, ResolvedNodeView>();

    for (const manifest of manifests) {
        for (const entry of manifest.nodes) {
            const registered = registry?.resolveNodeView(entry.name);

            if (registered !== undefined) {
                resolved.set(entry.name, { component: registered, attrsSchema: entry.attrsSchema });
                continue;
            }

            if (needsGenericNodeView(entry)) {
                // The generic node-view composes a skin; an unregistered node-type
                // resolves to seam's block-chrome fallback (via the registry).
                resolved.set(entry.name, {
                    component: GenericNodeView,
                    attrsSchema: entry.attrsSchema,
                    skin: skinRegistry.resolveSkin(entry.name),
                });
            }
        }
    }

    return resolved;
}

/**
 * Adapt a blockdoc NodeView component to Tiptap's ReactNodeViewRenderer: the
 * wrapper element rides NodeViewWrapper, the contentDOM passthrough rides the
 * React NodeView context's contentRef (equivalent to rendering
 * NodeViewContent), and updateAttrs keeps the merge-and-preserve-id contract.
 */
export function tiptapNodeView(resolved: ResolvedNodeView): ComponentType<ReactNodeViewProps> {
    const { component: Component, attrsSchema, skin } = resolved;

    function BlockdocNodeViewAdapter({ node, editor, getPos, updateAttributes, selected }: ReactNodeViewProps) {
        const { nodeViewContentRef } = useReactNodeView();
        const contentRef = node.isLeaf ? null : (nodeViewContentRef ?? null);

        return (
            <NodeViewWrapper as={node.isInline ? 'span' : 'div'} className="blockdoc-node-view">
                <Component
                    node={node}
                    view={editor.view}
                    getPos={getPos}
                    updateAttrs={(attrs) =>
                        updateAttributes({ ...attrs, [NODE_ID_ATTR]: node.attrs[NODE_ID_ATTR] })
                    }
                    attrsSchema={attrsSchema}
                    contentRef={contentRef}
                    skin={skin}
                    selected={selected}
                />
            </NodeViewWrapper>
        );
    }

    BlockdocNodeViewAdapter.displayName = `BlockdocNodeView(${Component.displayName ?? Component.name ?? 'Component'})`;

    return BlockdocNodeViewAdapter;
}

/**
 * The generic NodeView (ED-06) — **editor chrome only**. It draws PM-specific
 * chrome (selection ring / drag handle via seam's SelectionChrome), composes the
 * resolved **skin** as its resting body (a pure presenter that tags each attr
 * with `data-attr`), and passes PM-managed content through `contentRef`. There is
 * **no inline form** — attr-editing has moved to the inspector (ED-08). An
 * unregistered node-type composes seam's block-chrome fallback skin.
 */
export function GenericNodeView({ node, attrsSchema, contentRef, skin, selected }: NodeViewComponentProps) {
    const Skin: SkinComponent = skin ?? BlockChromeFallback;
    const nodeId = String(node.attrs[NODE_ID_ATTR] ?? '');
    const skinNode: SkinNode = { type: node.type.name, attrs: node.attrs };
    const skinContext: SkinContext = { attrsSchema: attrsSchema as SkinContext['attrsSchema'] };

    return (
        <SelectionChrome nodeId={nodeId} localSelected={selected ?? false}>
            <div data-blockdoc-node={node.type.name} contentEditable={false}>
                {Skin(skinNode, skinContext)}
            </div>
            {contentRef !== null && (
                <div ref={contentRef} data-blockdoc-content style={{ padding: '8px 10px' }} />
            )}
        </SelectionChrome>
    );
}
