import {
  ShadcnCell,
  ShadcnEmpty,
  ShadcnPagination,
  ShadcnTable,
  ShadcnToolbar,
  shadcnListSlots,
  useFrameInjection
} from "./chunk-Z4PKLMYX.js";

// src/shadcn/edit-slots.tsx
import { jsx, jsxs } from "react/jsx-runtime";
function ShadcnToggle({
  value,
  onChange
}) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      "data-frame-slot": "Toggle",
      role: "radiogroup",
      "aria-label": "Form mode",
      className: "mb-4 inline-flex rounded-md border border-border bg-muted p-0.5 text-sm",
      children: ["enriched", "bare"].map((mode) => /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          role: "radio",
          "aria-checked": value === mode,
          onClick: () => onChange(mode),
          className: `rounded px-3 py-1 capitalize transition-colors ${value === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`,
          children: mode
        },
        mode
      ))
    }
  );
}
var FACES = { display: "inline-grid" };
var FACE_ON = { gridArea: "1 / 1" };
var FACE_OFF = { gridArea: "1 / 1", opacity: 0, pointerEvents: "none" };
function ShadcnSaveBar({ saving, canSubmit, readOnly, onSave, onCancel }) {
  const { primitives } = useFrameInjection();
  const { Button } = primitives;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      "data-frame-slot": "SaveBar",
      className: "sticky bottom-0 z-10 -mx-1 mt-6 flex justify-end gap-2 border-t border-border bg-background/95 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80",
      children: [
        onCancel ? /* @__PURE__ */ jsx(Button, { type: "button", variant: "ghost", onClick: onCancel, "data-frame-action": "cancel", children: "Cancel" }) : null,
        !readOnly ? /* @__PURE__ */ jsx(
          Button,
          {
            type: "button",
            disabled: saving || !canSubmit,
            onClick: onSave,
            "data-frame-action": "save",
            children: /* @__PURE__ */ jsxs("span", { className: "motion-faces", style: FACES, children: [
              /* @__PURE__ */ jsx(
                "span",
                {
                  className: "motion-face",
                  style: saving ? FACE_OFF : FACE_ON,
                  "data-face": "idle",
                  "data-on": !saving,
                  "aria-hidden": saving || void 0,
                  children: "Save"
                }
              ),
              /* @__PURE__ */ jsx(
                "span",
                {
                  className: "motion-face",
                  style: saving ? FACE_ON : FACE_OFF,
                  "data-face": "saving",
                  "data-on": saving,
                  "aria-hidden": !saving || void 0,
                  children: "Saving\u2026"
                }
              )
            ] })
          }
        ) : null
      ]
    }
  );
}
var shadcnEditSlots = {
  Toggle: ShadcnToggle,
  SaveBar: ShadcnSaveBar
};

// src/shadcn/enrich-textarea.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function ShadcnEnrichTextarea(props) {
  const { primitives } = useFrameInjection();
  const { Button } = primitives;
  return /* @__PURE__ */ jsxs2("div", { "data-frame-widget": "splicewire-enrich", className: "space-y-2", children: [
    /* @__PURE__ */ jsx2(
      "textarea",
      {
        id: props.id,
        value: props.value ?? "",
        disabled: props.disabled || props.readOnly,
        onChange: (e) => props.onChange(e.target.value),
        rows: props.rows ?? 6,
        className: "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      }
    ),
    !props.readOnly ? /* @__PURE__ */ jsx2(
      Button,
      {
        type: "button",
        size: "sm",
        variant: "outline",
        "data-frame-action": "enrich",
        disabled: props.disabled || props.busy,
        onClick: props.onEnrich,
        children: props.busy ? "Enriching\u2026" : props.label ?? "\u2728 Enrich with Splicewire"
      }
    ) : null
  ] });
}
export {
  ShadcnCell,
  ShadcnEmpty,
  ShadcnEnrichTextarea,
  ShadcnPagination,
  ShadcnSaveBar,
  ShadcnTable,
  ShadcnToggle,
  ShadcnToolbar,
  shadcnEditSlots,
  shadcnListSlots
};
//# sourceMappingURL=shadcn.js.map