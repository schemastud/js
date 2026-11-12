import {
  resolveWidgetFor,
  useFormSchema,
  useFrameInjection,
  useRowRecord,
  useRowSave
} from "./chunk-IKCPLVQZ.js";

// src/EditShellMount.tsx
import { createContext, useContext, useMemo, useRef, useState } from "react";
import { jsx } from "react/jsx-runtime";
var EditShellMountContext = createContext(null);
function useEditShellMountController() {
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [conformance, setConformance] = useState(null);
  const flushes = useRef(/* @__PURE__ */ new Set());
  const revealHandler = useRef(null);
  const insertHandler = useRef(null);
  const nodeAccess = useRef(null);
  return useMemo(
    () => ({
      selectedNodeId,
      selectNode: setSelectedNodeId,
      revealNode: (nodeId) => revealHandler.current?.(nodeId),
      registerRevealHandler: (handler) => {
        revealHandler.current = handler;
        return () => {
          if (revealHandler.current === handler) revealHandler.current = null;
        };
      },
      dirty,
      markDirty: setDirty,
      saving,
      markSaving: setSaving,
      registerFlush: (flush) => {
        flushes.current.add(flush);
        return () => {
          flushes.current.delete(flush);
        };
      },
      flush: async () => {
        for (const flush of flushes.current) {
          await flush();
        }
      },
      candidates,
      publishCandidates: setCandidates,
      registerInsertHandler: (handler) => {
        insertHandler.current = handler;
        return () => {
          if (insertHandler.current === handler) insertHandler.current = null;
        };
      },
      insert: (candidate) => insertHandler.current?.(candidate),
      registerNodeAccess: (access) => {
        nodeAccess.current = access;
        return () => {
          if (nodeAccess.current === access) nodeAccess.current = null;
        };
      },
      getNode: (nodeId) => nodeAccess.current?.getNode(nodeId) ?? null,
      setNodeAttrs: (nodeId, attrs) => nodeAccess.current?.setNodeAttrs(nodeId, attrs),
      conformance,
      publishConformance: setConformance
    }),
    [selectedNodeId, dirty, saving, candidates, conformance]
  );
}
function EditShellMountProvider({
  value,
  children
}) {
  return /* @__PURE__ */ jsx(EditShellMountContext.Provider, { value, children });
}
function useEditShellMount() {
  const value = useContext(EditShellMountContext);
  if (!value) {
    throw new Error(
      '@schemastud/frame: useEditShellMount() outside an EditShellMount \u2014 a mounts:"widget" route (WidgetSurface) provides it.'
    );
  }
  return value;
}

// src/WidgetShell.tsx
import { useContext as useContext2, useEffect, useState as useState2 } from "react";
import { UnboundWidget, WidgetRegistryContext } from "@schemastud/seam";
import { jsx as jsx2, jsxs } from "react/jsx-runtime";
function WidgetSurface({
  schema,
  record,
  widget,
  registry: registryProp,
  readOnly = false,
  onChange,
  onSubmit,
  mount: mountProp
}) {
  const contextRegistry = useContext2(WidgetRegistryContext);
  const registry = registryProp ?? contextRegistry;
  const ownMount = useEditShellMountController();
  const mount = mountProp ?? ownMount;
  if (!registry) {
    return /* @__PURE__ */ jsx2("div", { "data-frame-shell": "widget-unbound", children: "No widget registry." });
  }
  const resolved = resolveWidgetFor(
    schema,
    "edit",
    { participates: true, widget, heavyweight: true },
    void 0,
    registry
  );
  if (resolved.bound === false) {
    return /* @__PURE__ */ jsx2(UnboundWidget, { context: "widget-route", name: widget });
  }
  if (typeof resolved.widget !== "function") {
    return /* @__PURE__ */ jsxs("div", { "data-frame-shell": "widget-unbound", "data-widget": widget, children: [
      "Widget \u201C",
      widget,
      "\u201D is not mounted (no registry match)."
    ] });
  }
  const Widget = resolved.widget;
  return /* @__PURE__ */ jsx2(EditShellMountProvider, { value: mount, children: /* @__PURE__ */ jsx2("div", { "data-frame-shell": "widget", "data-widget": widget, children: /* @__PURE__ */ jsx2(
    Widget,
    {
      schema,
      formData: record ?? {},
      value: record ?? {},
      onChange,
      onSubmit,
      readonly: readOnly,
      editShellMount: mount
    }
  ) }) });
}
function WidgetShell(typed) {
  const { resource, id, widget, readOnly = false, onSaved } = typed;
  const { can } = useFrameInjection();
  const [formData, setFormData] = useState2({});
  const mount = useEditShellMountController();
  const schemaQuery = useFormSchema(resource, "enriched");
  const recordQuery = useRowRecord(resource, id);
  const saveMutation = useRowSave(resource);
  useEffect(() => {
    if (recordQuery.data) setFormData(recordQuery.data);
  }, [recordQuery.data]);
  const effectiveReadOnly = readOnly || !can(id === null ? "create" : "update", resource);
  if (schemaQuery.isLoading || id !== null && recordQuery.isLoading) {
    return /* @__PURE__ */ jsx2("div", { "data-frame-shell": "widget-loading", children: "Loading\u2026" });
  }
  const schema = schemaQuery.data ?? { type: "object", properties: {} };
  const submit = async (data) => {
    if (effectiveReadOnly) return;
    await mount.flush();
    saveMutation.mutate({ id, data }, { onSuccess: (saved) => onSaved?.(saved) });
  };
  return /* @__PURE__ */ jsx2(
    WidgetSurface,
    {
      schema,
      record: formData,
      widget,
      readOnly: effectiveReadOnly,
      onChange: setFormData,
      onSubmit: submit,
      mount
    }
  );
}

export {
  useEditShellMountController,
  EditShellMountProvider,
  useEditShellMount,
  WidgetSurface,
  WidgetShell
};
//# sourceMappingURL=chunk-3EXZAMGQ.js.map