import {
  BlockdocEditor
} from "./chunk-WPHK3SXJ.js";
import "./chunk-NWTDXSWH.js";

// src/rjsf/create-rich-content-widget.tsx
import { getUiOptions } from "@rjsf/utils";
import { defaultValidator } from "@schemastud/seam";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
function isRealDocSchema(schema) {
  return schema !== void 0 && typeof schema === "object" && Object.keys(schema).length > 0;
}
function createRichContentWidget(nodeViewRegistry, defaults = {}) {
  function RichContentWidget(props) {
    const value = props.formData !== void 0 ? props.formData : props.value;
    const options = {
      ...props.options ?? {},
      ...props.uiSchema !== void 0 ? getUiOptions(props.uiSchema) : {}
    };
    const formContext = props.formContext ?? props.registry?.formContext ?? {};
    const inlineManifest = options.manifest;
    const manifestRef = typeof options.manifestRef === "string" ? options.manifestRef : void 0;
    const schemaFetcher = formContext.schemaFetcher ?? defaults.schemaFetcher;
    const [fetchedManifest, setFetchedManifest] = useState(null);
    useEffect(() => {
      if (inlineManifest !== void 0 || manifestRef === void 0) {
        return;
      }
      if (schemaFetcher === void 0) {
        console.warn(`blockdoc: no schema fetcher available to resolve manifestRef "${manifestRef}".`);
        return;
      }
      let cancelled = false;
      Promise.resolve(schemaFetcher(manifestRef)).then((manifest) => {
        if (!cancelled) {
          setFetchedManifest(manifest);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [inlineManifest, manifestRef, schemaFetcher]);
    const profileManifest = inlineManifest ?? fetchedManifest;
    const docAdmits = Array.isArray(options.docAdmits) ? options.docAdmits : void 0;
    const docAdmitsKey = docAdmits?.join("|");
    const manifests = useMemo(() => {
      if (profileManifest === null || profileManifest === void 0) {
        return null;
      }
      const profile = docAdmits !== void 0 ? { ...profileManifest, doc: { admitsChildCategories: docAdmits } } : profileManifest;
      return defaults.baseManifest !== void 0 ? [defaults.baseManifest, profile] : [profile];
    }, [profileManifest, docAdmitsKey]);
    const rawIntentBus = formContext.intentBus;
    const intentBus = rawIntentBus !== void 0 && typeof rawIntentBus.registerFlush === "function" && typeof rawIntentBus.dispatch === "function" ? rawIntentBus : void 0;
    const editorRef = useRef(null);
    useEffect(() => {
      if (intentBus === void 0) {
        return;
      }
      return intentBus.registerFlush(() => editorRef.current?.flushCommits());
    }, [intentBus]);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [instruction, setInstruction] = useState("");
    const [dispatching, setDispatching] = useState(false);
    const intentFieldPath = (props.fieldPathId?.path ?? []).join(".");
    const dispatchRevise = useCallback(async () => {
      if (intentBus === void 0) {
        return;
      }
      setDispatching(true);
      try {
        await intentBus.dispatch({
          type: "sw:revise",
          fieldPath: intentFieldPath,
          target: { nodeId: selectedNodeId ?? void 0 },
          payload: { instruction: instruction || void 0 }
        });
      } finally {
        setDispatching(false);
      }
    }, [intentBus, intentFieldPath, selectedNodeId, instruction]);
    const [advisoryErrors, setAdvisoryErrors] = useState([]);
    const fieldSchema = props.schema;
    const onChangeRef = useRef(props.onChange);
    onChangeRef.current = props.onChange;
    const fieldPathRef = useRef(props.fieldPathId?.path);
    fieldPathRef.current = props.fieldPathId?.path;
    const handleChange = useCallback(
      (doc) => {
        if (isRealDocSchema(fieldSchema)) {
          const result = defaultValidator.rawValidation(
            fieldSchema,
            doc
          );
          setAdvisoryErrors(
            (result.errors ?? []).map(
              (error) => `${error.instancePath ?? ""} ${error.message ?? ""}`.trim()
            )
          );
        }
        onChangeRef.current?.(doc, fieldPathRef.current);
      },
      [fieldSchema]
    );
    if (manifests === null) {
      return null;
    }
    return /* @__PURE__ */ jsxs("div", { "data-blockdoc-rich-content": "", children: [
      advisoryErrors.length > 0 && /* @__PURE__ */ jsx(
        "ul",
        {
          "data-blockdoc-advisory-errors": "",
          style: { color: "var(--stud-danger)", fontSize: 12, margin: "4px 0", paddingLeft: 18 },
          children: advisoryErrors.map((error, index) => /* @__PURE__ */ jsx("li", { children: error }, index))
        }
      ),
      /* @__PURE__ */ jsx(
        BlockdocEditor,
        {
          ref: editorRef,
          manifests,
          value: value ?? null,
          onChange: handleChange,
          commitPolicy: options.commit ?? defaults.commit,
          palette: options.palette ?? defaults.palette ?? true,
          nodeViews: nodeViewRegistry,
          commitBus: formContext.commitBus,
          onSelectionChange: intentBus !== void 0 ? setSelectedNodeId : void 0
        }
      ),
      intentBus !== void 0 && /* @__PURE__ */ jsxs(
        "div",
        {
          "data-blockdoc-intent-chrome": "",
          style: {
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 0",
            marginTop: 4,
            borderTop: "1px solid var(--stud-line)",
            fontSize: 12
          },
          children: [
            /* @__PURE__ */ jsx("span", { "data-blockdoc-selected-node": "", style: { color: "var(--stud-ink-muted)", fontFamily: "monospace" }, children: selectedNodeId ?? "no block selected" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                "data-blockdoc-revise-instruction": "",
                value: instruction,
                onChange: (event) => setInstruction(event.target.value),
                placeholder: "Revise instruction\u2026",
                style: {
                  flex: 1,
                  font: "inherit",
                  fontSize: 12,
                  padding: "2px 6px",
                  border: "1px solid var(--stud-line-strong)",
                  borderRadius: 4
                }
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                "data-blockdoc-revise": "",
                disabled: dispatching,
                onClick: () => void dispatchRevise(),
                style: {
                  font: "inherit",
                  fontSize: 12,
                  padding: "2px 8px",
                  border: "1px solid var(--stud-line-strong)",
                  borderRadius: 4,
                  background: "var(--stud-surface)",
                  cursor: dispatching ? "default" : "pointer",
                  opacity: dispatching ? 0.5 : 1
                },
                children: "Revise"
              }
            )
          ]
        }
      )
    ] });
  }
  return RichContentWidget;
}
export {
  createRichContentWidget
};
//# sourceMappingURL=rjsf.js.map