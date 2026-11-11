import {
  shadcnEditSlots
} from "./chunk-IWOVMPWG.js";
import {
  shadcnListSlots,
  useFrameInjection
} from "./chunk-GKULI3UQ.js";
import "./chunk-CWIDJYHN.js";
import "./chunk-X75EBNAR.js";

// src/shadcn/enrich-textarea.tsx
import { jsx, jsxs } from "react/jsx-runtime";
function ShadcnEnrichTextarea(props) {
  const { primitives } = useFrameInjection();
  const { Button } = primitives;
  return /* @__PURE__ */ jsxs("div", { "data-frame-widget": "splicewire-enrich", className: "space-y-2", children: [
    /* @__PURE__ */ jsx(
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
    !props.readOnly ? /* @__PURE__ */ jsx(
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
  ShadcnEnrichTextarea,
  shadcnEditSlots,
  shadcnListSlots
};
//# sourceMappingURL=shadcn.js.map