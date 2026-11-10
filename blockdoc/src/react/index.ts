export { BlockdocEditor } from './BlockdocEditor';
export type { BlockdocEditorHandle, BlockdocEditorProps, CommitBus, NodeAttrsView } from './BlockdocEditor';
export { findNodeById } from './selection';
export { CommitController } from './commit-controller';
export type { CommitPolicy, DocJson, ExternalValueDecision } from './commit-controller';
export { createManifestExtensions } from './manifest-extensions';
export type { ManifestExtensionsOptions } from './manifest-extensions';
export { valueDocSource } from './doc-source';
export type { DocSource } from './doc-source';
export {
    ANNOTATION_MARK_NAME,
    annotationIds,
    annotationIntegrityPlugin,
    annotationRanges,
    type AnnotationRange,
} from './annotation-plugin';
export { nodeIdPlugin } from './node-id-plugin';
export {
    BASE_PROSE_NODE_NAMES,
    createNodeViewRegistry,
    GenericNodeView,
    needsGenericNodeView,
    resolveNodeViewComponents,
    tiptapNodeView,
} from './node-views';
export type { NodeViewComponentProps, NodeViewRegistry, ResolvedNodeView } from './node-views';
export { selectionForNodeId, selectionNodeId } from './selection';
// Selection chrome and the skin socket the generic node-view composes (ED-06) live here, beside the editor that
// draws them (ruling 02 slice 7): one import for a blockdoc consumer that wires skins.
export { SelectionChrome } from './selection-chrome';
export type { RemoteSelection, SelectionChromeProps } from './selection-chrome';
export { BlockChromeFallback } from './block-chrome';
export { createSkinRegistry, defaultSkinRegistry, resolveSkin } from './skin-registry';
export type { SkinComponent, SkinContext, SkinNode, SkinRegistry } from './skin-types';
export { resolveSkinFor, type ResolvedSkin } from './resolveSkinFor';
