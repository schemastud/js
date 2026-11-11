import {
  EMPTY_SELECTION,
  KIND_PLACEMENTS,
  KIND_VARIANT_FOR,
  RECORD_PLACEMENTS,
  ResourcePickerWidget,
  ResourceRecordPicker,
  ResourceRefWidget,
  followFilters,
  isEmptySelection,
  isPicked,
  isResourceRefNode,
  pageState,
  readResourceRefConfig,
  resolveKindPlacement,
  resolveRecordPlacement,
  selectAllMatching,
  selectionCount,
  selectionFromValue,
  selectionToSearch,
  selectionToValue,
  setPagePicked,
  togglePick,
  useListSelection
} from "./chunk-GKULI3UQ.js";
import "./chunk-CWIDJYHN.js";
import "./chunk-X75EBNAR.js";

// src/resource-picker/KindPicker.tsx
import { useMemo, useState } from "react";
import {
  Activity,
  BookOpen,
  Box,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Layers,
  MessagesSquare,
  PenLine,
  Scale,
  Search,
  Server,
  Workflow,
  X
} from "lucide-react";
import {
  Badge,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  cn,
  useIsMobile
} from "@schemastud/ui";
import { jsx, jsxs } from "react/jsx-runtime";
var BUILTIN_ICONS = {
  activity: Activity,
  "book-open": BookOpen,
  box: Box,
  calendar: Calendar,
  layers: Layers,
  "messages-square": MessagesSquare,
  "pen-line": PenLine,
  scale: Scale,
  server: Server,
  workflow: Workflow
};
function iconOf(icon) {
  if (!icon) return Box;
  return typeof icon === "string" ? BUILTIN_ICONS[icon] ?? Box : icon;
}
var SCOPE_PREDICATE = {
  all: () => true,
  framed: (k) => k.facts?.framed === true,
  writable: (k) => k.facts?.writable === true,
  filterable: (k) => k.facts?.filterable === true
};
function kindsInScope(kinds, scope) {
  const predicate = typeof scope === "function" ? scope : SCOPE_PREDICATE[scope];
  return kinds.filter(predicate);
}
var OTHER = "__other";
function groupKinds(kinds, sections) {
  const known = new Set(sections.map((s) => s.key));
  const groups = sections.map((s) => ({
    key: s.key,
    label: s.label,
    Icon: iconOf(s.icon),
    items: kinds.filter((k) => k.section === s.key)
  })).filter((g) => g.items.length > 0);
  const rest = kinds.filter((k) => !k.section || !known.has(k.section));
  if (rest.length > 0) {
    const byGroup = /* @__PURE__ */ new Map();
    for (const k of [...rest].sort((a, b) => (a.group ?? "").localeCompare(b.group ?? ""))) {
      const g = k.group ?? "";
      byGroup.set(g, [...byGroup.get(g) ?? [], k]);
    }
    groups.push({ key: OTHER, label: "Other", Icon: Box, items: rest, sub: [...byGroup.entries()] });
  }
  return groups;
}
function matches(kind, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return kind.key.toLowerCase().includes(q) || kind.label.toLowerCase().includes(q) || (kind.section ?? "").toLowerCase().includes(q) || (kind.group ?? "").toLowerCase().includes(q) || (kind.detail ?? "").toLowerCase().includes(q);
}
function ResourceKindPicker(props) {
  const resolved = resolveKindPlacement(props.placement, {
    ...typeof props.scope === "string" ? { scope: props.scope } : {},
    ...props.density ? { density: props.density } : {},
    ...props.select ? { select: props.select } : {},
    ...props.variant ? { variant: props.variant } : {},
    ...props.orientation ? { orientation: props.orientation } : {}
  });
  const scope = typeof props.scope === "function" ? props.scope : resolved.scope;
  const inScope = useMemo(() => kindsInScope(props.kinds, scope), [props.kinds, scope]);
  const sections = props.sections ?? [];
  const groups = useMemo(() => groupKinds(inScope, sections), [inScope, sections]);
  const picked = new Set(props.value);
  const onPick = (key) => {
    if (props.disabled) return;
    if (resolved.select === "single") props.onChange(picked.has(key) ? [] : [key]);
    else props.onChange(picked.has(key) ? props.value.filter((k) => k !== key) : [...props.value, key]);
  };
  const body = {
    groups,
    kinds: inScope,
    resolved,
    picked,
    onPick,
    label: props.label ?? "Resource",
    id: props.id,
    disabled: props.disabled,
    total: inScope.length
  };
  return /* @__PURE__ */ jsx(
    "div",
    {
      "data-resource-picker": "kinds",
      "data-variant": resolved.variant,
      "data-density": resolved.density,
      className: "min-w-0",
      children: resolved.variant === "palette" ? /* @__PURE__ */ jsx(PaletteBody, { ...body }) : resolved.variant === "catalog" ? /* @__PURE__ */ jsx(CatalogBody, { ...body }) : /* @__PURE__ */ jsx(RailBody, { ...body })
    }
  );
}
function pickedNames(kinds, picked) {
  return kinds.filter((k) => picked.has(k.key)).map((k) => k.label).join(", ");
}
function Picked({ picked, kinds, select, sections }) {
  const chosen = kinds.filter((k) => picked.has(k.key));
  if (chosen.length === 0) return null;
  if (select === "single" || chosen.length === 1) {
    const k = chosen[0];
    const Icon = k.icon ? iconOf(k.icon) : sections.find((g) => g.items.includes(k))?.Icon ?? Box;
    return /* @__PURE__ */ jsxs("span", { className: "inline-flex min-w-0 items-center gap-1.5", children: [
      /* @__PURE__ */ jsx(Icon, { className: "size-3.5 shrink-0 text-muted-foreground" }),
      /* @__PURE__ */ jsx("span", { className: "truncate", children: k.label })
    ] });
  }
  return /* @__PURE__ */ jsxs("span", { children: [
    chosen.length,
    " resources"
  ] });
}
function PaletteList({ groups, picked, onPick, resolved, query, disabled }) {
  const expanded = resolved.density === "expanded";
  const visible = groups.map((g) => ({ ...g, items: g.items.filter((k) => matches(k, query)) })).filter((g) => g.items.length > 0);
  if (visible.length === 0) {
    return /* @__PURE__ */ jsx("p", { className: "px-2 py-6 text-center text-sm text-muted-foreground", children: query ? `No resources match \u201C${query}\u201D.` : "No resources are available here." });
  }
  return /* @__PURE__ */ jsx("div", { className: cn("overflow-y-auto overscroll-contain p-1", expanded ? "max-h-[32rem]" : "max-h-80"), children: visible.map((g) => /* @__PURE__ */ jsxs("div", { role: "group", "aria-label": g.label, className: "py-1", children: [
    /* @__PURE__ */ jsxs("div", { className: "px-2 pt-1.5 pb-1 text-xs font-medium text-muted-foreground", children: [
      g.label,
      " ",
      /* @__PURE__ */ jsxs("span", { className: "font-normal tabular-nums", children: [
        "\xB7 ",
        g.items.length
      ] })
    ] }),
    g.items.map((k, i, xs) => {
      const on = picked.has(k.key);
      const Icon = k.icon ? iconOf(k.icon) : g.Icon;
      const subHead = g.key === OTHER && k.group && (i === 0 || xs[i - 1].group !== k.group);
      return /* @__PURE__ */ jsxs("div", { className: "contents", children: [
        subHead ? /* @__PURE__ */ jsx("div", { className: "px-2 pt-2 pb-0.5 text-[11px] font-medium text-muted-foreground", children: k.group }) : null,
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            disabled,
            "aria-pressed": on,
            onClick: () => onPick(k.key),
            className: cn(
              "flex w-full min-w-0 items-center gap-2 rounded-sm px-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              expanded ? "py-2" : "py-1.5",
              on && "bg-accent text-accent-foreground"
            ),
            children: [
              /* @__PURE__ */ jsx(Icon, { className: "size-4 shrink-0 text-muted-foreground" }),
              /* @__PURE__ */ jsxs("span", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ jsxs("span", { className: "flex min-w-0 items-baseline gap-2", children: [
                  /* @__PURE__ */ jsx("span", { className: "truncate font-medium", children: k.label }),
                  /* @__PURE__ */ jsx("span", { className: "hidden truncate font-mono text-xs text-muted-foreground sm:inline", children: k.key })
                ] }),
                expanded && (k.detail || k.badges?.length) ? /* @__PURE__ */ jsxs("span", { className: "mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground", children: [
                  k.detail ? /* @__PURE__ */ jsx("span", { className: "truncate font-mono", children: k.detail }) : null,
                  k.badges?.map((b) => /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "h-4 px-1 text-[11px] font-normal", children: b }, b))
                ] }) : null
              ] }),
              /* @__PURE__ */ jsx(Check, { className: cn("size-4 shrink-0 text-primary", on ? "opacity-100" : "opacity-0") })
            ]
          }
        )
      ] }, k.key);
    })
  ] }, g.key)) });
}
function SearchBox({ value, onChange, label, autoFocus }) {
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 border-b border-border px-2.5", children: [
    /* @__PURE__ */ jsx(Search, { className: "size-4 shrink-0 text-muted-foreground" }),
    /* @__PURE__ */ jsx(
      "input",
      {
        type: "search",
        autoFocus,
        value,
        onChange: (e) => onChange(e.target.value),
        "aria-label": label,
        placeholder: `${label}\u2026`,
        className: "h-9 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      }
    )
  ] });
}
function PaletteBody(props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  if (props.resolved.density === "expanded") {
    return /* @__PURE__ */ jsxs("div", { id: props.id, role: "region", "aria-label": props.label, className: "w-full max-w-xl rounded-md border border-border bg-card text-card-foreground", children: [
      /* @__PURE__ */ jsx(SearchBox, { value: query, onChange: setQuery, label: "Search resources" }),
      /* @__PURE__ */ jsx(PaletteList, { ...props, query }),
      /* @__PURE__ */ jsx("div", { className: "border-t border-border px-2.5 py-1.5 text-xs text-muted-foreground tabular-nums", children: props.picked.size > 0 && props.resolved.select === "multi" ? `${props.picked.size} of ${props.total} picked` : `${props.total} resources` })
    ] });
  }
  return /* @__PURE__ */ jsxs(Popover, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(
      Button,
      {
        id: props.id,
        type: "button",
        variant: "outline",
        disabled: props.disabled,
        "aria-label": `${props.label}: ${pickedNames(props.kinds, props.picked) || "none chosen"}`,
        className: "w-full min-w-0 justify-between font-normal sm:w-72",
        children: [
          /* @__PURE__ */ jsx(Picked, { picked: props.picked, kinds: props.kinds, select: props.resolved.select, sections: props.groups }),
          props.picked.size === 0 ? /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Choose a resource\u2026" }) : null,
          /* @__PURE__ */ jsx(ChevronsUpDown, { className: "size-4 shrink-0 text-muted-foreground" })
        ]
      }
    ) }),
    /* @__PURE__ */ jsxs(PopoverContent, { className: "w-[min(20rem,calc(100vw-2rem))] p-0", children: [
      /* @__PURE__ */ jsx(SearchBox, { value: query, onChange: setQuery, label: "Search resources", autoFocus: true }),
      /* @__PURE__ */ jsx(
        PaletteList,
        {
          ...props,
          query,
          onPick: (k) => {
            props.onPick(k);
            if (props.resolved.select === "single") setOpen(false);
          }
        }
      )
    ] })
  ] });
}
function RailFlyout({ g, picked, onPick, close, select, disabled }) {
  const sub = g.sub ?? [["", g.items]];
  return /* @__PURE__ */ jsxs("div", { className: "max-h-[min(24rem,70vh)] overflow-y-auto overscroll-contain p-1", children: [
    /* @__PURE__ */ jsxs("div", { className: "px-2 py-1 text-xs font-medium text-muted-foreground", children: [
      g.label,
      " \xB7 ",
      g.items.length
    ] }),
    sub.map(([name, items]) => /* @__PURE__ */ jsxs("div", { children: [
      name ? /* @__PURE__ */ jsx("div", { className: "px-2 pt-1.5 pb-0.5 text-[11px] font-medium text-muted-foreground", children: name }) : null,
      items.map((k) => {
        const on = picked.has(k.key);
        return /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            disabled,
            "aria-pressed": on,
            onClick: () => {
              onPick(k.key);
              if (select === "single") close();
            },
            className: cn(
              "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              on && "bg-accent font-medium text-accent-foreground"
            ),
            children: [
              /* @__PURE__ */ jsx("span", { className: "truncate", children: k.label }),
              /* @__PURE__ */ jsx(Check, { className: cn("size-3.5 shrink-0 text-primary", on ? "opacity-100" : "opacity-0") })
            ]
          },
          k.key
        );
      })
    ] }, name || "_"))
  ] });
}
function RailBody(props) {
  const { groups, picked, onPick, resolved } = props;
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState(null);
  const [collapsed, setCollapsed] = useState(() => /* @__PURE__ */ new Set());
  const isMobile = useIsMobile();
  if (resolved.density === "compact") {
    const horizontal = resolved.orientation === "horizontal";
    if (groups.length === 0) {
      return /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "No resources are available here." });
    }
    const sheetGroup = isMobile ? groups.find((g) => g.key === openKey) : void 0;
    return /* @__PURE__ */ jsx(TooltipProvider, { children: /* @__PURE__ */ jsxs("div", { className: cn("flex min-w-0 gap-2", horizontal ? "flex-wrap items-center" : "items-start"), children: [
      /* @__PURE__ */ jsx(
        "div",
        {
          id: props.id,
          role: "toolbar",
          "aria-label": `${props.label} sections`,
          "aria-orientation": resolved.orientation,
          className: cn(
            "flex max-w-full gap-0.5 rounded-md border border-border bg-card p-1",
            horizontal ? "flex-row flex-wrap" : "w-11 flex-col items-center"
          ),
          children: groups.map((g, i) => {
            const has = g.items.some((k) => picked.has(k.key));
            const open = openKey === g.key;
            const align = horizontal && i >= groups.length / 2 ? "end" : "start";
            return (
              // Phone: the flyout is a bottom sheet (rendered once, below) — an anchored panel off a
              // 40px icon cannot stay inside a 390px viewport from every position in the strip.
              /* @__PURE__ */ jsxs(Popover, { open: open && !isMobile, onOpenChange: (o) => setOpenKey(o ? g.key : null), children: [
                /* @__PURE__ */ jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(
                  "button",
                  {
                    type: "button",
                    disabled: props.disabled,
                    "aria-label": `${g.label}, ${g.items.length} resources${has ? ", has a pick" : ""}`,
                    className: cn(
                      "relative flex size-10 items-center justify-center sm:size-8 rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      (open || has) && "bg-accent text-foreground"
                    ),
                    children: [
                      /* @__PURE__ */ jsxs(Tooltip, { children: [
                        /* @__PURE__ */ jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsx("span", { className: "flex size-full items-center justify-center", children: /* @__PURE__ */ jsx(g.Icon, { className: "size-4" }) }) }),
                        /* @__PURE__ */ jsxs(TooltipContent, { children: [
                          g.label,
                          " \xB7 ",
                          g.items.length
                        ] })
                      ] }),
                      has ? /* @__PURE__ */ jsx("span", { "aria-hidden": true, className: "absolute top-1 right-1 size-1.5 rounded-full bg-primary" }) : null
                    ]
                  }
                ) }),
                /* @__PURE__ */ jsx(PopoverContent, { align, className: "w-[min(16rem,calc(100vw-2rem))] p-0", children: /* @__PURE__ */ jsx(
                  RailFlyout,
                  {
                    g,
                    picked,
                    onPick,
                    select: resolved.select,
                    disabled: props.disabled,
                    close: () => setOpenKey(null)
                  }
                ) })
              ] }, g.key)
            );
          })
        }
      ),
      /* @__PURE__ */ jsx(Sheet, { open: Boolean(sheetGroup), onOpenChange: (o) => !o && setOpenKey(null), children: /* @__PURE__ */ jsxs(SheetContent, { side: "bottom", className: "max-h-[80dvh] gap-0 rounded-t-xl p-0", children: [
        /* @__PURE__ */ jsxs(SheetHeader, { className: "border-b border-border px-4 py-3", children: [
          /* @__PURE__ */ jsx(SheetTitle, { children: sheetGroup?.label ?? props.label }),
          /* @__PURE__ */ jsx(SheetDescription, { className: "sr-only", children: "Choose a resource from this section." })
        ] }),
        sheetGroup ? /* @__PURE__ */ jsx(
          RailFlyout,
          {
            g: sheetGroup,
            picked,
            onPick,
            select: resolved.select,
            disabled: props.disabled,
            close: () => setOpenKey(null)
          }
        ) : null
      ] }) }),
      /* @__PURE__ */ jsx("div", { className: cn("min-w-0 truncate text-sm", !horizontal && "pt-1.5"), "aria-live": "polite", children: picked.size === 0 ? /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Choose a section, then a resource" }) : /* @__PURE__ */ jsx("span", { className: "font-medium", children: /* @__PURE__ */ jsx(Picked, { picked, kinds: props.kinds, select: resolved.select, sections: groups }) }) })
    ] }) });
  }
  const visible = groups.map((g) => ({ ...g, items: g.items.filter((k) => matches(k, query)) })).filter((g) => g.items.length > 0);
  return /* @__PURE__ */ jsxs("div", { id: props.id, role: "region", "aria-label": props.label, className: "w-full max-w-xs rounded-md border border-border bg-card text-card-foreground", children: [
    /* @__PURE__ */ jsx(SearchBox, { value: query, onChange: setQuery, label: "Filter resources" }),
    /* @__PURE__ */ jsx("div", { className: "max-h-[32rem] overflow-y-auto overscroll-contain p-1", children: visible.map((g) => {
      const isCollapsed = collapsed.has(g.key) && !query;
      return /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            "aria-expanded": !isCollapsed,
            onClick: () => setCollapsed((prev) => {
              const next = new Set(prev);
              if (next.has(g.key)) next.delete(g.key);
              else next.add(g.key);
              return next;
            }),
            className: "flex w-full items-center gap-1.5 rounded-sm px-1.5 py-1.5 text-xs font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            children: [
              isCollapsed ? /* @__PURE__ */ jsx(ChevronRight, { className: "size-3.5 text-muted-foreground" }) : /* @__PURE__ */ jsx(ChevronDown, { className: "size-3.5 text-muted-foreground" }),
              /* @__PURE__ */ jsx(g.Icon, { className: "size-3.5 text-muted-foreground" }),
              g.label,
              /* @__PURE__ */ jsx("span", { className: "ml-auto font-normal text-muted-foreground tabular-nums", children: g.items.length })
            ]
          }
        ),
        !isCollapsed && g.items.map((k) => {
          const on = picked.has(k.key);
          return /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              disabled: props.disabled,
              "aria-pressed": on,
              onClick: () => onPick(k.key),
              className: cn(
                "ml-4 flex w-[calc(100%-1rem)] items-center gap-2 rounded-sm border-l py-1 pr-2 pl-3 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                on ? "border-primary bg-accent font-medium" : "border-border"
              ),
              children: [
                /* @__PURE__ */ jsx("span", { className: "truncate", children: k.label }),
                /* @__PURE__ */ jsx(Check, { className: cn("ml-auto size-3.5 shrink-0 text-primary", on ? "opacity-100" : "opacity-0") })
              ]
            },
            k.key
          );
        })
      ] }, g.key);
    }) })
  ] });
}
function CatalogBody({ groups, picked, onPick, resolved, label, id, disabled }) {
  if (resolved.density === "compact") {
    return /* @__PURE__ */ jsx("div", { id, role: "group", "aria-label": label, className: "flex flex-wrap items-center gap-1.5", children: groups.map((g) => /* @__PURE__ */ jsxs("div", { className: "contents", children: [
      /* @__PURE__ */ jsx("span", { className: "mr-0.5 ml-1 text-[11px] font-medium text-muted-foreground uppercase first:ml-0", children: g.label }),
      g.items.map((k) => {
        const on = picked.has(k.key);
        return /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            disabled,
            "aria-pressed": on,
            onClick: () => onPick(k.key),
            className: cn(
              "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent"
            ),
            children: [
              /* @__PURE__ */ jsx(g.Icon, { className: "size-3" }),
              k.label,
              on && resolved.select === "multi" ? /* @__PURE__ */ jsx(X, { className: "size-3" }) : null
            ]
          },
          k.key
        );
      })
    ] }, g.key)) });
  }
  return /* @__PURE__ */ jsx("div", { id, role: "group", "aria-label": label, className: "space-y-6", children: groups.map((g) => /* @__PURE__ */ jsxs("section", { className: "space-y-2", children: [
    /* @__PURE__ */ jsxs("h3", { className: "flex items-center gap-2 text-sm font-medium", children: [
      /* @__PURE__ */ jsx(g.Icon, { className: "size-4 text-muted-foreground" }),
      g.label,
      /* @__PURE__ */ jsx("span", { className: "text-xs font-normal text-muted-foreground tabular-nums", children: g.items.length })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "grid gap-2 sm:grid-cols-2 xl:grid-cols-3", children: g.items.map((k) => {
      const on = picked.has(k.key);
      return /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          disabled,
          "aria-pressed": on,
          onClick: () => onPick(k.key),
          className: cn(
            "min-w-0 rounded-md border border-border bg-card p-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            on && "border-primary ring-1 ring-primary"
          ),
          children: [
            /* @__PURE__ */ jsxs("span", { className: "flex items-start justify-between gap-2", children: [
              /* @__PURE__ */ jsxs("span", { className: "min-w-0", children: [
                /* @__PURE__ */ jsx("span", { className: "block truncate text-sm font-medium", children: k.label }),
                /* @__PURE__ */ jsx("span", { className: "block truncate font-mono text-xs text-muted-foreground", children: k.key })
              ] }),
              /* @__PURE__ */ jsx(
                "span",
                {
                  "aria-hidden": true,
                  className: cn(
                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  ),
                  children: on ? /* @__PURE__ */ jsx(Check, { className: "size-3" }) : null
                }
              )
            ] }),
            k.detail || k.badges?.length ? /* @__PURE__ */ jsxs("span", { className: "mt-2 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground", children: [
              k.detail ? /* @__PURE__ */ jsx("span", { className: "truncate font-mono", children: k.detail }) : null,
              k.badges?.map((b) => /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "h-4 px-1 text-[11px] font-normal", children: b }, b))
            ] }) : null
          ]
        },
        k.key
      );
    }) })
  ] }, g.key)) });
}

// src/resource-picker/ResourcePicker.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
function ResourcePicker(props) {
  if ("kinds" in props && Array.isArray(props.kinds)) {
    return /* @__PURE__ */ jsx2(ResourceKindPicker, { ...props });
  }
  return /* @__PURE__ */ jsx2(ResourceRecordPicker, { ...props });
}
export {
  EMPTY_SELECTION,
  KIND_PLACEMENTS,
  KIND_VARIANT_FOR,
  RECORD_PLACEMENTS,
  ResourceKindPicker,
  ResourcePicker,
  ResourcePickerWidget,
  ResourceRecordPicker,
  ResourceRefWidget,
  followFilters,
  isEmptySelection,
  isPicked,
  isResourceRefNode,
  kindsInScope,
  pageState,
  readResourceRefConfig,
  resolveKindPlacement,
  resolveRecordPlacement,
  selectAllMatching,
  selectionCount,
  selectionFromValue,
  selectionToSearch,
  selectionToValue,
  setPagePicked,
  togglePick,
  useListSelection
};
//# sourceMappingURL=picker.js.map