import {
  EditShellMountProvider,
  WidgetShell,
  WidgetSurface,
  useEditShellMount,
  useEditShellMountController
} from "./chunk-3EXZAMGQ.js";
import "./chunk-IKCPLVQZ.js";
import "./chunk-CWIDJYHN.js";
import "./chunk-X75EBNAR.js";

// src/FiveRegionEditShell.tsx
import { useEffect as useEffect2, useId, useRef as useRef3, useState as useState2 } from "react";
import { WidgetRegistryContext } from "@schemastud/seam";

// src/responsive.ts
var CANVAS_MIN = 360;
var INSPECTOR_MIN = 280;
var PALETTE_MIN = 180;
function deriveCollapseLevel(width) {
  if (width >= CANVAS_MIN + INSPECTOR_MIN + PALETTE_MIN) {
    return 0;
  }
  if (width >= CANVAS_MIN + INSPECTOR_MIN) {
    return 1;
  }
  return 2;
}
function collapseModes(level) {
  switch (level) {
    case 0:
      return { palette: "pane", inspector: "pane", canvasFullBleed: false };
    case 1:
      return { palette: "rail", inspector: "pane", canvasFullBleed: false };
    default:
      return { palette: "drawer", inspector: "drawer", canvasFullBleed: true };
  }
}

// src/Inspector.tsx
import { SchemaForm } from "@schemastud/seam";
import { jsx } from "react/jsx-runtime";
var EMPTY_STYLE = { padding: 16, color: "var(--stud-ink-muted)", fontSize: 13 };
function Inspector() {
  const mount = useEditShellMount();
  const selectedNodeId = mount.selectedNodeId;
  const node = selectedNodeId !== null ? mount.getNode(selectedNodeId) : null;
  if (selectedNodeId === null || node === null) {
    return /* @__PURE__ */ jsx("div", { "data-frame-region": "inspector", "data-frame-inspector-empty": "", style: EMPTY_STYLE, children: "Select a block to edit" });
  }
  return /* @__PURE__ */ jsx("div", { "data-frame-region": "inspector", "data-node-type": node.type, children: /* @__PURE__ */ jsx(
    SchemaForm,
    {
      schema: node.attrsSchema ?? { type: "object", properties: {} },
      formData: node.attrs ?? {},
      uiSchema: { "ui:submitButtonOptions": { norender: true } },
      onChange: (event) => mount.setNodeAttrs(selectedNodeId, event.formData ?? {})
    },
    selectedNodeId
  ) });
}

// src/MissingSlots.tsx
import { jsx as jsx2, jsxs } from "react/jsx-runtime";
var CARD = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 10px",
  margin: "4px 0",
  border: "1px dashed var(--stud-line-strong)",
  borderRadius: 6,
  background: "var(--stud-surface-subtle)",
  color: "var(--stud-ink-muted)",
  fontSize: 12
};
function MissingSlots() {
  const mount = useEditShellMount();
  const slots = mount.conformance?.requiredSlots ?? [];
  if (slots.length === 0) {
    return null;
  }
  return /* @__PURE__ */ jsx2("div", { "data-frame-missing-slots": "", children: slots.map((slot) => {
    const missing = Math.max(0, slot.min - slot.filled);
    return /* @__PURE__ */ jsxs(
      "div",
      {
        "data-missing-slot": "",
        "data-parent-id": slot.parentId,
        "data-category": slot.category,
        style: CARD,
        children: [
          /* @__PURE__ */ jsxs("span", { children: [
            "Missing: ",
            missing,
            " ",
            slot.category
          ] }),
          /* @__PURE__ */ jsx2(
            "button",
            {
              type: "button",
              "data-missing-add": "",
              onClick: () => mount.insert({ category: slot.category, parentId: slot.parentId, scoped: true }),
              children: "+ Add"
            }
          )
        ]
      },
      `${slot.parentId}:${slot.category}`
    );
  }) });
}

// src/PalettePane.tsx
import { jsx as jsx3, jsxs as jsxs2 } from "react/jsx-runtime";
function affordances(candidate) {
  const out = [];
  if (candidate.arity && candidate.arity.max === 1) {
    out.push("max 1");
  }
  if (candidate.edgeTarget) {
    out.push(
      candidate.edgeTarget.pickMany ? `pick-many \u2192 ${candidate.edgeTarget.target}` : `\u2192 ${candidate.edgeTarget.target}`
    );
  }
  return out;
}
var PANE_STYLE = { padding: 8, display: "flex", flexDirection: "column", gap: 4 };
var ITEM_STYLE = {
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  padding: "6px 8px",
  border: "1px solid var(--stud-line)",
  borderRadius: 4,
  background: "var(--stud-surface)",
  cursor: "pointer",
  textAlign: "left",
  font: "inherit"
};
var AFFORDANCE_STYLE = { fontSize: 11, color: "var(--stud-ink-faint)" };
var EMPTY_STYLE2 = { padding: 12, fontSize: 12, color: "var(--stud-ink-faint)" };
function PalettePane() {
  const mount = useEditShellMount();
  const candidates = mount.candidates;
  if (candidates.length === 0) {
    return /* @__PURE__ */ jsx3("div", { "data-frame-region-stub": "palette", style: EMPTY_STYLE2, children: "Nothing insertable here" });
  }
  return /* @__PURE__ */ jsx3("div", { "data-frame-palette": "", style: PANE_STYLE, children: candidates.map((candidate, index) => /* @__PURE__ */ jsxs2(
    "button",
    {
      type: "button",
      "data-node-type": candidate.nodeType,
      onClick: () => mount.insert(candidate),
      style: ITEM_STYLE,
      children: [
        /* @__PURE__ */ jsx3("span", { children: candidate.label ?? candidate.category ?? candidate.nodeType }),
        affordances(candidate).map((label) => /* @__PURE__ */ jsx3("span", { "data-affordance": "", style: AFFORDANCE_STYLE, children: label }, label))
      ]
    },
    `${candidate.nodeType}:${index}`
  )) });
}

// src/SavePill.tsx
import { useEffect, useRef, useState } from "react";
import { jsx as jsx4, jsxs as jsxs3 } from "react/jsx-runtime";
var BASE = {
  display: "inline-flex",
  alignItems: "center",
  justifySelf: "end",
  gap: 6,
  padding: "2px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 500,
  whiteSpace: "nowrap"
};
var SR_ONLY = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0
};
var FRESH_MS = 1400;
var FACES = {
  saved: { label: "Saved", style: { background: "var(--stud-success-tint)", color: "var(--stud-success)" } },
  rest: {
    label: "Saved",
    style: { background: "var(--stud-muted, var(--muted))", color: "var(--stud-muted-foreground, var(--muted-foreground))" }
  },
  saving: { label: "Saving\u2026", style: { background: "var(--stud-warning-tint)", color: "var(--stud-warning)" } },
  unsaved: { label: "Unsaved", style: { background: "var(--stud-danger-tint)", color: "var(--stud-danger)" } }
};
var ORDER = ["saved", "rest", "saving", "unsaved"];
function SavePill() {
  const mount = useEditShellMount();
  const state = mount.saving ? "saving" : mount.dirty ? "unsaved" : "saved";
  const [fresh, setFresh] = useState(false);
  const previous = useRef(state);
  useEffect(() => {
    const was = previous.current;
    previous.current = state;
    if (state !== "saved") {
      setFresh(false);
      return;
    }
    if (was !== "saving") return;
    setFresh(true);
    const timer = window.setTimeout(() => setFresh(false), FRESH_MS);
    return () => window.clearTimeout(timer);
  }, [state]);
  const face = state === "saved" ? fresh ? "saved" : "rest" : state;
  return /* @__PURE__ */ jsxs3("span", { "data-frame-save-pill": state, className: "motion-faces", style: { display: "inline-grid", position: "relative" }, children: [
    ORDER.map((f) => /* @__PURE__ */ jsx4(
      "span",
      {
        className: "motion-face",
        "data-face": f,
        "data-on": f === face,
        "aria-hidden": true,
        style: {
          ...BASE,
          ...FACES[f].style,
          gridArea: "1 / 1",
          ...f === face ? null : { opacity: 0, pointerEvents: "none" }
        },
        children: FACES[f].label
      },
      f
    )),
    /* @__PURE__ */ jsx4("span", { role: "status", "aria-live": "polite", style: SR_ONLY, children: FACES[face].label })
  ] });
}

// src/StatusBar.tsx
import { useRef as useRef2 } from "react";
import { jsx as jsx5, jsxs as jsxs4 } from "react/jsx-runtime";
var BAR = { display: "flex", alignItems: "center", gap: 12 };
var SEG = { display: "inline-flex", gap: 4 };
var CONTROL = { ...SEG, cursor: "pointer", textDecoration: "underline dotted", border: "none", background: "none", font: "inherit", color: "inherit", padding: 0 };
function StatusBar() {
  const mount = useEditShellMount();
  const c = mount.conformance;
  const cursor = useRef2(0);
  const nodes = c?.nodes ?? 0;
  const requiredTotal = c?.requiredTotal ?? 0;
  const requiredFilled = c?.requiredFilled ?? 0;
  const incompleteIds = c?.incompleteNodeIds ?? [];
  const complete = incompleteIds.length === 0 && requiredFilled === requiredTotal;
  const grammarValid = c ? c.grammarValid : true;
  const cycleIncomplete = () => {
    if (incompleteIds.length === 0) {
      return;
    }
    const id = incompleteIds[cursor.current % incompleteIds.length];
    cursor.current += 1;
    mount.selectNode(id);
    mount.revealNode(id);
  };
  return /* @__PURE__ */ jsxs4("div", { "data-frame-status-bar": "", style: BAR, children: [
    /* @__PURE__ */ jsxs4("span", { "data-status-seg": "nodes", style: SEG, children: [
      nodes,
      " nodes"
    ] }),
    /* @__PURE__ */ jsxs4("span", { "data-status-seg": "required", style: SEG, children: [
      requiredTotal,
      " required (",
      requiredFilled,
      " of ",
      requiredTotal,
      ")"
    ] }),
    complete ? /* @__PURE__ */ jsx5("span", { "data-status-seg": "complete", style: SEG, children: "complete" }) : /* @__PURE__ */ jsx5("button", { type: "button", "data-status-seg": "incomplete", onClick: cycleIncomplete, style: CONTROL, children: "incomplete" }),
    /* @__PURE__ */ jsxs4("span", { "data-status-seg": "grammar", "data-grammar": grammarValid ? "valid" : "invalid", style: SEG, children: [
      "grammar ",
      grammarValid ? "\u2713 valid" : "\u2717"
    ] })
  ] });
}

// src/FiveRegionEditShell.tsx
import { Fragment, jsx as jsx6, jsxs as jsxs5 } from "react/jsx-runtime";
var REGION_BODY = { display: "flex", alignItems: "stretch", minHeight: 0, position: "relative" };
var PALETTE_STYLE = { flex: "0 0 180px", borderRight: "1px solid var(--stud-line)" };
var CANVAS_STYLE = { flex: "1 1 auto", minWidth: 0, overflow: "auto" };
var INSPECTOR_STYLE = { flex: "0 0 280px", borderLeft: "1px solid var(--stud-line)" };
var BAR_STYLE = { padding: "6px 12px", borderBottom: "1px solid var(--stud-line)" };
var STATUS_STYLE = { padding: "4px 12px", borderTop: "1px solid var(--stud-line)", fontSize: 12, color: "var(--stud-ink-muted)" };
function FiveRegionEditShell({
  schema,
  record,
  widget,
  registry,
  readOnly = false,
  topBar,
  palette,
  inspector,
  status,
  autosave = true,
  onSave,
  sourceToggle = true,
  collapseLevel
}) {
  const mount = useEditShellMountController();
  const [mode, setMode] = useState2("rich");
  const [paletteOpen, setPaletteOpen] = useState2(false);
  const [inspectorOpen, setInspectorOpen] = useState2(false);
  const regionId = useId();
  const paletteRegionId = `${regionId}-palette-region`;
  const inspectorRegionId = `${regionId}-inspector-region`;
  const paletteToggleRef = useRef3(null);
  const inspectorToggleRef = useRef3(null);
  const lastOpenedDrawerRef = useRef3(null);
  const shellRef = useRef3(null);
  const [autoLevel, setAutoLevel] = useState2(0);
  useEffect2(() => {
    if (collapseLevel !== void 0) {
      return;
    }
    const el = shellRef.current;
    if (!el || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      setAutoLevel(deriveCollapseLevel(entries[0]?.contentRect.width ?? el.clientWidth));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [collapseLevel]);
  const regions = collapseModes(collapseLevel ?? autoLevel);
  const narrow = regions.canvasFullBleed;
  const paletteRail = regions.palette === "rail";
  const paletteDrawer = regions.palette === "drawer";
  const inspectorDrawer = regions.inspector === "drawer";
  useEffect2(() => {
    const paletteIsOpen = paletteDrawer && paletteOpen;
    const inspectorIsOpen = inspectorDrawer && inspectorOpen;
    if (!paletteIsOpen && !inspectorIsOpen) {
      return;
    }
    const onKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      setPaletteOpen(false);
      setInspectorOpen(false);
      const activeDrawer = lastOpenedDrawerRef.current ?? (inspectorIsOpen ? "inspector" : "palette");
      (activeDrawer === "palette" ? paletteToggleRef.current : inspectorToggleRef.current)?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [inspectorDrawer, inspectorOpen, paletteDrawer, paletteOpen]);
  const paletteStyle = paletteRail ? {
    position: "absolute",
    insetBlock: 0,
    insetInlineStart: 0,
    zIndex: 20,
    width: 48,
    flex: "0 0 48px",
    background: "var(--stud-surface)",
    borderRight: "1px solid var(--stud-line)"
  } : paletteDrawer ? {
    position: "absolute",
    insetBlock: 0,
    insetInlineStart: 0,
    zIndex: 20,
    width: "min(240px, 85vw)",
    background: "var(--stud-surface)",
    borderRight: "1px solid var(--stud-line)",
    boxShadow: "0 8px 24px rgb(0 0 0 / 18%)"
  } : PALETTE_STYLE;
  const inspectorStyle = inspectorDrawer ? {
    position: "absolute",
    insetBlock: 0,
    insetInlineEnd: 0,
    zIndex: 20,
    width: "min(300px, 85vw)",
    background: "var(--stud-surface)",
    borderLeft: "1px solid var(--stud-line)",
    boxShadow: "0 8px 24px rgb(0 0 0 / 18%)"
  } : INSPECTOR_STYLE;
  const canvasStyle = {
    ...CANVAS_STYLE,
    ...narrow ? { width: "100%" } : {},
    ...paletteRail ? { paddingInlineStart: 48 } : {}
  };
  const togglePalette = () => {
    if (paletteOpen) {
      setPaletteOpen(false);
      lastOpenedDrawerRef.current = inspectorOpen ? "inspector" : null;
    } else {
      lastOpenedDrawerRef.current = "palette";
      setPaletteOpen(true);
    }
  };
  const toggleInspector = () => {
    if (inspectorOpen) {
      setInspectorOpen(false);
      lastOpenedDrawerRef.current = paletteOpen ? "palette" : null;
    } else {
      lastOpenedDrawerRef.current = "inspector";
      setInspectorOpen(true);
    }
  };
  const shell = /* @__PURE__ */ jsx6(EditShellMountProvider, { value: mount, children: /* @__PURE__ */ jsxs5(
    "div",
    {
      ref: shellRef,
      "data-frame-shell": "edit-five",
      "data-collapse-level": collapseLevel ?? autoLevel,
      style: { display: "flex", flexDirection: "column", minHeight: 0 },
      children: [
        /* @__PURE__ */ jsxs5(
          "div",
          {
            "data-frame-region": "top-bar",
            style: { ...BAR_STYLE, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 },
            children: [
              /* @__PURE__ */ jsx6(SavePill, {}),
              !autosave && /* @__PURE__ */ jsx6("button", { type: "button", "data-frame-save-action": "", onClick: () => onSave?.(), children: "Save" }),
              sourceToggle && /* @__PURE__ */ jsxs5("span", { "data-frame-mode-toggle": "", role: "group", style: { marginLeft: "auto" }, children: [
                /* @__PURE__ */ jsx6(
                  "button",
                  {
                    type: "button",
                    "data-mode": "rich",
                    "aria-pressed": mode === "rich",
                    onClick: () => setMode("rich"),
                    children: "Rich"
                  }
                ),
                /* @__PURE__ */ jsx6(
                  "button",
                  {
                    type: "button",
                    "data-mode": "source",
                    "aria-pressed": mode === "source",
                    onClick: () => setMode("source"),
                    children: "Source"
                  }
                )
              ] }),
              narrow && /* @__PURE__ */ jsxs5("span", { "data-frame-region": "drawer-toggles", role: "group", "aria-label": "Editor panels", children: [
                /* @__PURE__ */ jsx6(
                  "button",
                  {
                    type: "button",
                    ref: paletteToggleRef,
                    "aria-controls": paletteRegionId,
                    "aria-expanded": paletteOpen,
                    onClick: togglePalette,
                    children: paletteOpen ? "Close block palette" : "Open block palette"
                  }
                ),
                /* @__PURE__ */ jsx6(
                  "button",
                  {
                    type: "button",
                    ref: inspectorToggleRef,
                    "aria-controls": inspectorRegionId,
                    "aria-expanded": inspectorOpen,
                    onClick: toggleInspector,
                    children: inspectorOpen ? "Close inspector" : "Open inspector"
                  }
                )
              ] }),
              topBar ?? null
            ]
          }
        ),
        /* @__PURE__ */ jsxs5("div", { "data-frame-region": "body", style: REGION_BODY, children: [
          /* @__PURE__ */ jsxs5(
            "div",
            {
              id: paletteRegionId,
              "data-frame-region": "palette",
              "data-palette-mode": regions.palette,
              style: paletteStyle,
              hidden: paletteDrawer && !paletteOpen,
              children: [
                paletteRail && /* @__PURE__ */ jsx6(
                  "button",
                  {
                    type: "button",
                    ref: paletteToggleRef,
                    "aria-label": paletteOpen ? "Close block palette" : "Open block palette",
                    "aria-controls": paletteRegionId,
                    "aria-expanded": paletteOpen,
                    onClick: togglePalette,
                    style: { width: 47, minHeight: 44, zIndex: 1 },
                    children: "\u25A6"
                  }
                ),
                paletteRail && paletteOpen ? /* @__PURE__ */ jsx6(
                  "div",
                  {
                    style: {
                      position: "absolute",
                      insetBlock: 0,
                      insetInlineStart: 48,
                      zIndex: 21,
                      width: 200,
                      background: "var(--stud-surface)",
                      border: "1px solid var(--stud-line)",
                      boxShadow: "0 8px 24px rgb(0 0 0 / 18%)"
                    },
                    children: palette ?? /* @__PURE__ */ jsx6(PalettePane, {})
                  }
                ) : paletteDrawer && paletteOpen ? palette ?? /* @__PURE__ */ jsx6(PalettePane, {}) : !paletteRail && !paletteDrawer ? palette ?? /* @__PURE__ */ jsx6(PalettePane, {}) : null
              ]
            }
          ),
          /* @__PURE__ */ jsx6(
            "div",
            {
              "data-frame-region": "canvas",
              "data-full-bleed": regions.canvasFullBleed ? "" : void 0,
              style: canvasStyle,
              children: mode === "source" ? /* @__PURE__ */ jsx6("pre", { "data-frame-source-view": "", style: { margin: 0, padding: 12, fontSize: 12 }, children: JSON.stringify(record ?? {}, null, 2) }) : /* @__PURE__ */ jsxs5(Fragment, { children: [
                /* @__PURE__ */ jsx6(MissingSlots, {}),
                /* @__PURE__ */ jsx6(
                  WidgetSurface,
                  {
                    schema,
                    record,
                    widget,
                    registry,
                    readOnly,
                    mount
                  }
                )
              ] })
            }
          ),
          /* @__PURE__ */ jsx6(
            "div",
            {
              id: inspectorRegionId,
              "data-frame-region": "inspector-region",
              "data-inspector-mode": regions.inspector,
              style: inspectorStyle,
              hidden: inspectorDrawer && !inspectorOpen,
              children: inspector ?? /* @__PURE__ */ jsx6(Inspector, {})
            }
          )
        ] }),
        /* @__PURE__ */ jsx6("div", { "data-frame-region": "status", style: STATUS_STYLE, children: status ?? /* @__PURE__ */ jsx6(StatusBar, {}) })
      ]
    }
  ) });
  return registry ? /* @__PURE__ */ jsx6(WidgetRegistryContext.Provider, { value: registry, children: shell }) : shell;
}
export {
  EditShellMountProvider,
  FiveRegionEditShell,
  Inspector,
  MissingSlots,
  PalettePane,
  SavePill,
  StatusBar,
  WidgetShell,
  WidgetSurface,
  collapseModes,
  deriveCollapseLevel,
  useEditShellMount,
  useEditShellMountController
};
//# sourceMappingURL=editor.js.map