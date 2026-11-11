import {
  ANNOTATION_MARK_NAME,
  BASE_PROSE_NODE_NAMES,
  BlockChromeFallback,
  BlockdocEditor,
  CommitController,
  GenericNodeView,
  SelectionChrome,
  annotationIds,
  annotationIntegrityPlugin,
  annotationRanges,
  createManifestExtensions,
  createNodeViewRegistry,
  createSkinRegistry,
  defaultSkinRegistry,
  findNodeById,
  needsGenericNodeView,
  nodeIdPlugin,
  resolveNodeViewComponents,
  resolveSkin,
  selectionForNodeId,
  selectionNodeId,
  tiptapNodeView,
  valueDocSource
} from "./chunk-X5KATD6J.js";
import "./chunk-7BARHMIH.js";

// src/react/resolveSkinFor.ts
function resolveSkinFor(nodeType, schema, registry) {
  const raw = schema?.["x-skin"];
  const override = typeof raw === "string" && raw !== "" ? raw : void 0;
  const key = override ?? nodeType;
  return {
    skin: registry.resolveSkin(key),
    key,
    source: override !== void 0 ? "override" : "node-type",
    fallback: !registry.hasSkin(key)
  };
}
export {
  ANNOTATION_MARK_NAME,
  BASE_PROSE_NODE_NAMES,
  BlockChromeFallback,
  BlockdocEditor,
  CommitController,
  GenericNodeView,
  SelectionChrome,
  annotationIds,
  annotationIntegrityPlugin,
  annotationRanges,
  createManifestExtensions,
  createNodeViewRegistry,
  createSkinRegistry,
  defaultSkinRegistry,
  findNodeById,
  needsGenericNodeView,
  nodeIdPlugin,
  resolveNodeViewComponents,
  resolveSkin,
  resolveSkinFor,
  selectionForNodeId,
  selectionNodeId,
  tiptapNodeView,
  valueDocSource
};
//# sourceMappingURL=react.js.map