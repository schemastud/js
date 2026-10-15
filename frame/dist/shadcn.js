import {
  DefaultCell,
  createNoun,
  getPath,
  useFrameInjection
} from "./chunk-NZOBJ6BJ.js";

// src/shadcn/list-slots.tsx
import { useId } from "react";
import { parseSort, serializeSort, sortStateFor, toggleSortKey } from "@schemastud/facets";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useIsMobile } from "@schemastud/ui";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
function ShadcnTable(props) {
  const { columns, rows, onOpen, Cell, RowActions, sort } = props;
  const isMobile = useIsMobile();
  const uid = useId();
  if (isMobile) {
    const [first, ...rest] = columns;
    return /* @__PURE__ */ jsx("ul", { "data-frame-slot": "Table", "data-frame-stacked": true, className: "space-y-2", children: rows.map((row, i) => /* @__PURE__ */ jsxs(
      "li",
      {
        "data-frame-row": true,
        onClick: () => onOpen?.(row),
        className: `min-w-0 space-y-2.5 rounded-lg border border-border bg-card p-3 text-sm ${onOpen ? "cursor-pointer hover:bg-muted/40" : ""}`,
        children: [
          first ? /* @__PURE__ */ jsx("div", { id: `${uid}-row-${i}`, className: "min-w-0 font-medium text-foreground", children: /* @__PURE__ */ jsx(Cell, { column: first, record: row }) }) : null,
          rest.length > 0 ? /* @__PURE__ */ jsx("dl", { className: "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 text-[12.5px]", children: rest.map((c) => /* @__PURE__ */ jsxs("div", { className: "contents", children: [
            /* @__PURE__ */ jsx("dt", { className: "text-muted-foreground", children: c.header ?? c.field }),
            /* @__PURE__ */ jsx("dd", { className: "min-w-0 text-foreground/90", children: /* @__PURE__ */ jsx(Cell, { column: c, record: row }) })
          ] }, c.field)) }) : null,
          onOpen || RowActions ? /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-end gap-1.5 border-t border-border pt-2", children: [
            onOpen ? (
              // The record's own open control (review-r1 recheck): a native button named "Open
              // <heading>", a sibling of the row actions. A pointer may still open from anywhere.
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  id: `${uid}-open-${i}`,
                  "aria-labelledby": `${uid}-open-${i} ${uid}-row-${i}`,
                  className: "mr-auto rounded px-2 py-1 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  onClick: (e) => {
                    e.stopPropagation();
                    onOpen(row);
                  },
                  children: "Open"
                }
              )
            ) : null,
            RowActions ? /* @__PURE__ */ jsx("div", { className: "flex flex-wrap items-center gap-1.5", onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ jsx(RowActions, { record: row }) }) : null
          ] }) : null
        ]
      },
      row.id ?? i
    )) });
  }
  return /* @__PURE__ */ jsx(
    "div",
    {
      "data-frame-slot": "Table",
      className: "overflow-x-auto rounded-lg border border-border bg-card",
      children: /* @__PURE__ */ jsxs("table", { className: "w-full border-collapse text-left text-sm", children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "border-b border-border bg-muted/40 text-[11px] tracking-[0.12em] text-muted-foreground uppercase", children: [
          columns.map((c) => /* @__PURE__ */ jsx(ShadcnHeaderCell, { column: c, sort }, c.field)),
          RowActions ? /* @__PURE__ */ jsx("th", { className: "px-4 py-3" }) : null
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { children: rows.map((row, i) => /* @__PURE__ */ jsxs(
          "tr",
          {
            "data-frame-row": true,
            onClick: () => onOpen?.(row),
            className: `border-b border-border/60 last:border-0 ${onOpen ? "cursor-pointer hover:bg-muted/40" : ""}`,
            children: [
              columns.map((c) => /* @__PURE__ */ jsx(
                "td",
                {
                  className: "px-4 py-3 align-middle text-foreground/90",
                  children: /* @__PURE__ */ jsx(Cell, { column: c, record: row })
                },
                c.field
              )),
              RowActions ? /* @__PURE__ */ jsx(
                "td",
                {
                  className: "px-4 py-3 text-right",
                  onClick: (e) => e.stopPropagation(),
                  children: /* @__PURE__ */ jsx(RowActions, { record: row })
                }
              ) : null
            ]
          },
          row.id ?? i
        )) })
      ] })
    }
  );
}
function ShadcnHeaderCell(props) {
  const { column, sort } = props;
  const label = column.header ?? column.field;
  const sortable = Boolean(sort) && Boolean(column.sortField) && sort.sortableFields.has(column.sortField);
  if (!sortable) {
    return /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: label });
  }
  const keys = parseSort(sort.sort);
  const state = sortStateFor(keys, column.sortField);
  const multi = keys.length > 1;
  const onClick = (event) => {
    sort.onSortChange(serializeSort(toggleSortKey(keys, column.sortField, event.shiftKey)));
  };
  return /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      onClick,
      "aria-sort": state.active ? state.desc ? "descending" : "ascending" : "none",
      title: "Click to sort; shift-click to add a secondary sort",
      className: `group -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 uppercase hover:bg-muted ${state.active ? "text-foreground" : ""}`,
      children: [
        /* @__PURE__ */ jsx("span", { children: label }),
        state.active ? state.desc ? /* @__PURE__ */ jsx(ArrowDown, { className: "size-3" }) : /* @__PURE__ */ jsx(ArrowUp, { className: "size-3" }) : /* @__PURE__ */ jsx(ChevronsUpDown, { className: "size-3 opacity-0 transition-opacity group-hover:opacity-60" }),
        state.active && multi ? /* @__PURE__ */ jsx("span", { className: "rounded bg-muted px-1 text-[10px] leading-4 tabular-nums text-muted-foreground", children: state.index + 1 }) : null
      ]
    }
  ) });
}
function ShadcnCell(props) {
  if (props.column.cell) return /* @__PURE__ */ jsx(Fragment, { children: props.column.cell(props.record) });
  const value = getPath(props.record, props.column.field);
  if (value === null || value === void 0 || value === "") {
    return /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "\u2014" });
  }
  if (typeof value === "boolean") {
    return /* @__PURE__ */ jsx("span", { className: value ? "text-primary" : "text-muted-foreground", children: value ? "Yes" : "No" });
  }
  return /* @__PURE__ */ jsx(DefaultCell, { ...props });
}
function ShadcnEmpty() {
  return /* @__PURE__ */ jsx(
    "div",
    {
      "data-frame-slot": "Empty",
      className: "rounded-lg border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground",
      children: "No records."
    }
  );
}
function ShadcnErrorState({ error, retry }) {
  const { primitives } = useFrameInjection();
  const { Button } = primitives;
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : null;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      "data-frame-slot": "ErrorState",
      role: "alert",
      className: "rounded-lg border border-destructive/40 bg-destructive/5 px-6 py-12 text-center text-sm",
      children: [
        /* @__PURE__ */ jsx("div", { className: "font-medium text-destructive", children: "Could not load this list." }),
        message ? /* @__PURE__ */ jsx("div", { className: "mt-2 text-muted-foreground", children: message }) : null,
        /* @__PURE__ */ jsx(Button, { type: "button", size: "sm", variant: "outline", className: "mt-4", onClick: retry, children: "Retry" })
      ]
    }
  );
}
function ShadcnToolbar({
  resource,
  onNew,
  canCreate,
  framesCreate,
  singularLabel
}) {
  const { primitives } = useFrameInjection();
  const { Button } = primitives;
  if (!canCreate || !framesCreate) return null;
  return /* @__PURE__ */ jsx("div", { "data-frame-slot": "Toolbar", className: "flex justify-end", children: /* @__PURE__ */ jsxs(Button, { type: "button", size: "sm", onClick: onNew, "data-frame-action": "new", children: [
    "New ",
    createNoun(resource, singularLabel)
  ] }) });
}
function ShadcnPagination(props) {
  const {
    primitives: { Button, SimpleSelect }
  } = useFrameInjection();
  const lastPage = props.mode === "offset" ? Math.max(1, Math.ceil(props.total / props.perPage)) : 1;
  const options = props.perPageOptions ?? [10, 25, 50, 100];
  return /* @__PURE__ */ jsxs(
    "div",
    {
      "data-frame-slot": "Pagination",
      className: "mt-3 flex flex-wrap items-center justify-between gap-2 text-sm",
      children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-muted-foreground", children: [
          props.mode === "offset" && /* @__PURE__ */ jsxs("span", { children: [
            "Page ",
            props.page,
            " of ",
            lastPage,
            " \xB7 ",
            props.total,
            " total"
          ] }),
          props.onPerPageChange && SimpleSelect && /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5", children: [
            props.mode === "offset" && /* @__PURE__ */ jsx("span", { "aria-hidden": true, children: "\xB7" }),
            /* @__PURE__ */ jsx("span", { children: "Rows" }),
            /* @__PURE__ */ jsx(
              SimpleSelect,
              {
                value: String(props.perPage),
                disabled: props.disabled,
                onValueChange: (value) => props.onPerPageChange?.(Number(value)),
                options: options.map((n) => ({
                  value: String(n),
                  label: String(n)
                })),
                "aria-label": "Rows per page",
                className: "h-7 w-[4.75rem]"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          props.mode === "cursor" && /* @__PURE__ */ jsx(
            Button,
            {
              type: "button",
              size: "sm",
              variant: "outline",
              disabled: props.disabled || props.isFirst,
              onClick: props.onFirst,
              children: "First"
            }
          ),
          /* @__PURE__ */ jsx(
            Button,
            {
              type: "button",
              size: "sm",
              variant: "outline",
              disabled: props.disabled || (props.mode === "offset" ? props.page <= 1 : !props.hasPrevious),
              onClick: () => props.mode === "offset" ? props.onPageChange(props.page - 1) : props.onPrevious(),
              children: "\u2039 Prev"
            }
          ),
          /* @__PURE__ */ jsx(
            Button,
            {
              type: "button",
              size: "sm",
              variant: "outline",
              disabled: props.disabled || (props.mode === "offset" ? props.page >= lastPage : !props.hasNext),
              onClick: () => props.mode === "offset" ? props.onPageChange(props.page + 1) : props.onNext(),
              children: "Next \u203A"
            }
          )
        ] })
      ]
    }
  );
}
var shadcnListSlots = {
  Table: ShadcnTable,
  Cell: ShadcnCell,
  Empty: ShadcnEmpty,
  ErrorState: ShadcnErrorState,
  Toolbar: ShadcnToolbar,
  Pagination: ShadcnPagination
};

// src/shadcn/edit-slots.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function ShadcnToggle({
  value,
  onChange
}) {
  return /* @__PURE__ */ jsx2(
    "div",
    {
      "data-frame-slot": "Toggle",
      role: "radiogroup",
      "aria-label": "Form mode",
      className: "mb-4 inline-flex rounded-md border border-border bg-muted p-0.5 text-sm",
      children: ["enriched", "bare"].map((mode) => /* @__PURE__ */ jsx2(
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
function ShadcnSaveBar({ saving, canSubmit, readOnly, onSave, onCancel }) {
  const { primitives } = useFrameInjection();
  const { Button } = primitives;
  return /* @__PURE__ */ jsxs2(
    "div",
    {
      "data-frame-slot": "SaveBar",
      className: "sticky bottom-0 z-10 -mx-1 mt-6 flex justify-end gap-2 border-t border-border bg-background/95 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80",
      children: [
        onCancel ? /* @__PURE__ */ jsx2(Button, { type: "button", variant: "ghost", onClick: onCancel, "data-frame-action": "cancel", children: "Cancel" }) : null,
        !readOnly ? /* @__PURE__ */ jsx2(
          Button,
          {
            type: "button",
            disabled: saving || !canSubmit,
            onClick: onSave,
            "data-frame-action": "save",
            children: saving ? "Saving\u2026" : "Save"
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
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
function ShadcnEnrichTextarea(props) {
  const { primitives } = useFrameInjection();
  const { Button } = primitives;
  return /* @__PURE__ */ jsxs3("div", { "data-frame-widget": "splicewire-enrich", className: "space-y-2", children: [
    /* @__PURE__ */ jsx3(
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
    !props.readOnly ? /* @__PURE__ */ jsx3(
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