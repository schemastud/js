export { BlockdocEditor } from './BlockdocEditor';
export type { BlockdocEditorHandle, BlockdocEditorProps, CommitBus } from './BlockdocEditor';
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
// SelectionChrome now lives in the medium-neutral seam socket; re-exported here
// for blockdoc consumers that imported it from this entry.
export { SelectionChrome } from '@schemastud/seam';
export type { RemoteSelection, SelectionChromeProps } from '@schemastud/seam';
// The skin socket the generic node-view composes (ED-06): re-exported so a
// blockdoc consumer wires skins against one import.
export { BlockChromeFallback, createSkinRegistry, defaultSkinRegistry, resolveSkin } from '@schemastud/seam';
export type { SkinComponent, SkinContext, SkinNode, SkinRegistry } from '@schemastud/seam';
