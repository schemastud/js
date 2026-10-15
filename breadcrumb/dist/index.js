// src/Breadcrumb.tsx
import { Fragment } from "react";
import { Combobox } from "@schemastud/combobox";
import { jsx, jsxs } from "react/jsx-runtime";
function Breadcrumb({
  crumbs,
  onNavigate,
  primitives,
  separator,
  switcherAffordance,
  className,
  crumbLinkClassName,
  crumbCurrentClassName,
  switcherTriggerClassName,
  comboboxContentClassName
}) {
  const sep = separator ?? /* @__PURE__ */ jsx("span", { className: "text-muted-foreground/60", children: "/" });
  return /* @__PURE__ */ jsx("nav", { className: className ?? "flex items-center gap-1 text-sm", "aria-label": "Breadcrumb", children: crumbs.map((crumb, index) => /* @__PURE__ */ jsxs(Fragment, { children: [
    index > 0 && /* @__PURE__ */ jsx("span", { className: "mx-0.5 flex items-center", children: sep }),
    crumb.switcher ? /* @__PURE__ */ jsx(
      Combobox,
      {
        primitives,
        search: crumb.switcher.search,
        currentValue: crumb.switcher.currentValue,
        placeholder: crumb.switcher.placeholder,
        emptyText: crumb.switcher.emptyText,
        onSelect: (option) => onNavigate(option.value),
        contentClassName: comboboxContentClassName ?? "w-72 p-0",
        trigger: /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            className: switcherTriggerClassName ?? "inline-flex max-w-[16rem] items-center gap-1 rounded-md px-1.5 py-0.5 text-sm font-medium text-foreground transition-colors hover:bg-accent",
            children: [
              /* @__PURE__ */ jsx("span", { className: "truncate", children: crumb.label }),
              switcherAffordance
            ]
          }
        )
      }
    ) : crumb.path ? /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: () => onNavigate(crumb.path),
        className: crumbLinkClassName ?? "max-w-[16rem] truncate rounded-md px-1.5 py-0.5 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        children: crumb.label
      }
    ) : /* @__PURE__ */ jsx(
      "span",
      {
        className: crumbCurrentClassName ?? "max-w-[16rem] truncate px-1.5 py-0.5 font-medium text-foreground",
        children: crumb.label
      }
    )
  ] }, index)) });
}
export {
  Breadcrumb
};
//# sourceMappingURL=index.js.map