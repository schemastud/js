// src/raw-mode.ts
var STUD_WIDGET_KEYWORD = "x-stud-widget";
var STUD_WIDGET_OPTIONS_KEYWORD = "x-stud-widget-options";
var STUD_RESOURCE_REF_KEYWORD = "x-stud-resource-ref";
function stripHostWidgets(schema) {
  if (!schema || typeof schema !== "object") {
    return schema;
  }
  const next = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === STUD_WIDGET_KEYWORD) {
      continue;
    }
    next[key] = stripSchemaValue(value);
  }
  return next;
}
function stripSchemaValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => stripSchemaValue(item));
  }
  if (value && typeof value === "object") {
    return stripHostWidgets(value);
  }
  return value;
}
function bridgeHostWidgets(schema) {
  if (!schema || typeof schema !== "object") {
    return schema;
  }
  const next = {};
  for (const [key, value] of Object.entries(schema)) {
    next[key] = bridgeSchemaValue(value);
  }
  if (typeof next[STUD_WIDGET_KEYWORD] === "string") {
    next["x-widget"] = next[STUD_WIDGET_KEYWORD];
  }
  const options = next[STUD_WIDGET_OPTIONS_KEYWORD];
  if (options && typeof options === "object" && !Array.isArray(options)) {
    next["x-widget-options"] = options;
  }
  return next;
}
function bridgeSchemaValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => bridgeSchemaValue(item));
  }
  if (value && typeof value === "object") {
    return bridgeHostWidgets(value);
  }
  return value;
}

// src/getPath.ts
function getPath(record, field) {
  if (!field.includes(".")) {
    return record?.[field];
  }
  let cursor = record;
  for (const segment of field.split(".")) {
    if (cursor === null || cursor === void 0 || typeof cursor !== "object") {
      return void 0;
    }
    cursor = cursor[segment];
  }
  return cursor;
}

// src/context.tsx
import { createContext as createContext2, useContext as useContext4, useMemo as useMemo6 } from "react";
import { FacetsProvider } from "@schemastud/facets";
import { WidgetRegistryContext as WidgetRegistryContext3, defaultRegistry } from "@schemastud/seam";

// src/ResourceRefWidget.tsx
import { useMemo as useMemo5 } from "react";
import { widgetFormContext } from "@schemastud/seam";

// src/resource-picker/RecordPicker.tsx
import {
  createContext,
  useCallback as useCallback2,
  useContext as useContext3,
  useEffect as useEffect3,
  useId as useId4,
  useMemo as useMemo4,
  useRef as useRef4,
  useState as useState4,
  useSyncExternalStore
} from "react";
import { QueryClient, QueryClientContext, QueryClientProvider } from "@tanstack/react-query";
import { useListFilters as useListFilters2 } from "@schemastud/facets";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  cn,
  useIsMobile as useIsMobile2
} from "@schemastud/ui";
import { Check, ChevronsUpDown as ChevronsUpDown2, ListFilter, Loader2, Search, X } from "lucide-react";

// src/ListShell.tsx
import { useEffect as useEffect2, useLayoutEffect, useMemo as useMemo3, useRef as useRef3, useState as useState3 } from "react";
import { ListFilters, useListFilters } from "@schemastud/facets";

// src/resolveColumns.ts
import { displayLabel } from "@schemastud/seam";
var isDev = () => Boolean(import.meta.env?.DEV);
var resolveColumns = (_resource, _schema, hostColumns, manifest) => {
  if (!manifest) return hostColumns;
  const participation = listColumnParticipation(manifest);
  if (isDev()) {
    for (const col of hostColumns) {
      if (!participation.has(col.field)) {
        throw new Error(
          `[frame] resolveColumns: host column "${col.field}" has no list-column participation in the manifest.`
        );
      }
    }
  }
  const hostByField = new Map(hostColumns.map((c) => [c.field, c]));
  const fields = [...participation.entries()].sort(sortEntries).map(([field]) => field);
  return fields.map((field) => {
    const cm = participation.get(field);
    const host = hostByField.get(field);
    const declared = host?.cell ? void 0 : resolveDeclaredCell(field, cm);
    const column = {
      field,
      header: host?.header ?? displayLabel({ title: cm.label }, field, { property: true }),
      ...host?.sortField ? { sortField: host.sortField } : {},
      ...host?.headerControl ? { headerControl: host.headerControl } : {},
      ...host?.cell ? { cell: host.cell, cellSource: "host" } : {},
      ...declared ? { cell: declared, cellSource: "declared" } : {}
    };
    return column;
  });
};
function listColumnParticipation(manifest) {
  const out = /* @__PURE__ */ new Map();
  for (const [key, byCtx] of Object.entries(manifest.byNode)) {
    if (key === "") continue;
    const cm = byCtx["list-column"];
    if (cm?.participates) out.set(key, cm);
  }
  return out;
}
function sortEntries([, a], [, b]) {
  const av = a.sort ?? Number.POSITIVE_INFINITY;
  const bv = b.sort ?? Number.POSITIVE_INFINITY;
  return av - bv;
}

// src/EditableCell.tsx
import { useContext, useState } from "react";
import { WidgetRegistryContext } from "@schemastud/seam";

// src/resolveWidgetFor.ts
import { mergeUiSchema } from "@schemastud/seam";

// src/contexts.ts
var KNOWN_CONTEXTS = [
  "edit",
  "detail",
  "list-column",
  "list-item",
  "row-cell",
  "summary",
  "overview"
];
var INHERITS = {
  "row-cell": "edit",
  overview: "summary"
};

// src/resolveWidgetFor.ts
var FRAME_CONTEXT_KEYWORD = "x-frame-context";
function mergeOptions(a, b) {
  if (!a) return b;
  if (!b) return a;
  return mergeUiSchema(a, b);
}
var isWidgetComponent = (widget) => widget !== void 0 && typeof widget !== "string";
function resolveWidgetFor(node, ctx, cm, parent, registry) {
  if (!cm?.participates) return { widget: void 0, participates: false };
  const lender = parent?.participates ? parent : void 0;
  const cascades = ctx !== "edit" && cm.inheritsBinding !== false && Boolean(INHERITS[ctx]);
  const suppressed = ctx === "row-cell" && cascades && lender?.heavyweight === true;
  const name = cm.widget ?? (cascades && !suppressed ? lender?.widget : void 0);
  const folded = cascades && !suppressed ? mergeOptions(lender?.options, cm.options) : cm.options;
  const schema = {
    ...node,
    ...name ? { "x-widget": name } : {},
    "x-widget-options": folded,
    [FRAME_CONTEXT_KEYWORD]: ctx
  };
  const resolved = registry.resolveEntry(schema);
  const unbound = Boolean(name) && resolved.widget === void 0;
  return { ...resolved, participates: true, unbound };
}

// src/EditableCell.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var isDev2 = () => Boolean(import.meta.env?.DEV);
function scalar(value) {
  if (value === null || value === void 0) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
function ReadProjection({ value }) {
  return /* @__PURE__ */ jsx("span", { "data-frame-cell-value": true, children: scalar(value) });
}
function EditableCell({
  node,
  rowCell,
  edit,
  value,
  onCommit,
  registry: registryProp
}) {
  const ctxRegistry = useContext(WidgetRegistryContext);
  const registry = registryProp ?? ctxRegistry;
  if (!registry) {
    throw new Error("[frame] EditableCell requires a WidgetRegistry (prop or WidgetRegistryContext).");
  }
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const resolved = resolveWidgetFor(node, "row-cell", rowCell, edit, registry);
  if (resolved.participates && resolved.unbound && edit?.heavyweight) {
    if (isDev2()) {
      throw new Error(
        `[frame] EditableCell: heavyweight widget "${edit.widget}" is unbound (no registry match) for context "row-cell".`
      );
    }
    return /* @__PURE__ */ jsx("div", { "data-frame-cell": "unbound-heavyweight", children: /* @__PURE__ */ jsxs("span", { "data-frame-cell-error": true, children: [
      "[unbound widget: ",
      String(edit?.widget),
      "]"
    ] }) });
  }
  const Widget = resolved.participates && typeof resolved.widget !== "string" ? resolved.widget : void 0;
  if (!Widget) {
    return /* @__PURE__ */ jsx("div", { "data-frame-cell": "readonly", children: /* @__PURE__ */ jsx(ReadProjection, { value }) });
  }
  const activate = () => {
    setDraft(value);
    setEditing(true);
  };
  const commit = (next) => {
    setEditing(false);
    if (next !== value) onCommit(next);
  };
  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };
  if (!editing) {
    return /* @__PURE__ */ jsx(
      "div",
      {
        "data-frame-cell": "editable",
        role: "button",
        tabIndex: 0,
        onClick: activate,
        onFocus: activate,
        children: /* @__PURE__ */ jsx(ReadProjection, { value })
      }
    );
  }
  return /* @__PURE__ */ jsx(
    "div",
    {
      "data-frame-cell": "editing",
      onBlur: () => commit(draft),
      onKeyDown: (e) => {
        if (e.key === "Escape") cancel();
      },
      children: /* @__PURE__ */ jsx(
        Widget,
        {
          value: draft,
          formData: draft,
          schema: node,
          options: resolved.config ?? {},
          autofocus: true,
          onChange: (next) => setDraft(next)
        }
      )
    }
  );
}

// src/SchemaView.tsx
import { useContext as useContext2 } from "react";
import { WidgetRegistryContext as WidgetRegistryContext2 } from "@schemastud/seam";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var isDev3 = () => Boolean(import.meta.env?.DEV);
function labelize(key, cm) {
  if (cm?.label) return cm.label;
  return key.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^\w/, (c) => c.toUpperCase());
}
function scalar2(value) {
  if (value === null || value === void 0) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
function widgetMountProps(value, schema, options) {
  return { value, formData: value, schema, readOnly: true, disabled: true, options: options ?? {} };
}
function UnboundWidget({
  label,
  widget,
  kind = "unbound-heavyweight"
}) {
  return /* @__PURE__ */ jsxs2("div", { "data-frame-view": kind, "data-frame-view-widget": String(widget), children: [
    /* @__PURE__ */ jsx2("span", { "data-frame-view-label": true, children: label }),
    /* @__PURE__ */ jsx2("span", { "data-frame-view-error": true, children: "Unable to display this field" })
  ] });
}
function FallbackValue({ value, node }) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return /* @__PURE__ */ jsx2("span", { "data-frame-view-value": true, children: scalar2(value) });
  }
  const properties = node?.properties ?? {};
  const declaredOr = (key) => {
    const title = properties[key]?.title;
    return typeof title === "string" && title.trim() ? title : labelize(key);
  };
  const entries = Object.entries(value);
  return /* @__PURE__ */ jsxs2("div", { "data-frame-view-structured": true, children: [
    /* @__PURE__ */ jsx2("dl", { children: entries.map(([key, entry]) => /* @__PURE__ */ jsxs2("div", { children: [
      /* @__PURE__ */ jsx2("dt", { "data-frame-view-label": true, children: declaredOr(key) }),
      /* @__PURE__ */ jsx2("dd", { "data-frame-view-value": true, children: scalar2(entry) })
    ] }, key)) }),
    /* @__PURE__ */ jsxs2("details", { children: [
      /* @__PURE__ */ jsx2("summary", { children: "Source JSON" }),
      /* @__PURE__ */ jsx2("pre", { "data-frame-view-json": true, children: JSON.stringify(value, null, 2) })
    ] })
  ] });
}
function ViewNode({
  node,
  ctx,
  cm,
  label,
  value,
  registry
}) {
  const resolved = resolveWidgetFor(node, ctx, cm, void 0, registry);
  if (resolved.participates && resolved.unbound && cm?.heavyweight) {
    if (isDev3()) {
      throw new Error(
        `[frame] SchemaView: heavyweight widget "${cm.widget}" is unbound (no registry match) for context "${ctx}".`
      );
    }
    return /* @__PURE__ */ jsx2(UnboundWidget, { label, widget: cm?.widget });
  }
  const Widget = resolved.participates && typeof resolved.widget !== "string" ? resolved.widget : void 0;
  return /* @__PURE__ */ jsxs2("div", { "data-frame-view": "field", children: [
    /* @__PURE__ */ jsx2("span", { "data-frame-view-label": true, children: label }),
    Widget ? /* @__PURE__ */ jsx2(Widget, { ...widgetMountProps(value, node, resolved.config) }) : /* @__PURE__ */ jsx2(FallbackValue, { value, node })
  ] });
}
function SchemaView({ schema, record, manifest, context, registry: registryProp }) {
  const ctxRegistry = useContext2(WidgetRegistryContext2);
  const registry = registryProp ?? ctxRegistry;
  if (!registry) {
    throw new Error("[frame] SchemaView requires a WidgetRegistry (prop or WidgetRegistryContext).");
  }
  if (context === "list-item") {
    const rootNode = schema;
    const cm = manifest.byNode[""]?.["list-item"];
    return /* @__PURE__ */ jsx2("div", { "data-frame-view": "list-item", children: /* @__PURE__ */ jsx2(
      ViewNode,
      {
        node: rootNode,
        ctx: "list-item",
        cm,
        label: labelize("", cm),
        value: record,
        registry
      }
    ) });
  }
  const properties = schema.properties ?? {};
  return /* @__PURE__ */ jsx2("div", { "data-frame-view": "detail", children: Object.keys(properties).map((key) => {
    const cm = manifest.byNode[key]?.detail;
    return /* @__PURE__ */ jsx2(
      ViewNode,
      {
        node: properties[key],
        ctx: "detail",
        cm,
        label: labelize(key, cm),
        value: record[key],
        registry
      },
      key
    );
  }) });
}

// src/listItemRendersCards.ts
function listItemRendersCards(manifest, schema, registry) {
  const cm = manifest.byNode[""]?.["list-item"];
  if (!cm?.participates) return false;
  return isWidgetComponent(resolveWidgetFor(schema, "list-item", cm, void 0, registry).widget);
}

// src/slots/defaults.tsx
import { SchemaForm } from "@schemastud/seam";
import { useEffect, useId as useId2, useRef } from "react";
import { Trash2 } from "lucide-react";

// src/cards/StatRow.tsx
import { StatTile } from "@schemastud/ui";

// src/cards/chrome.tsx
import { Card, CardContent, CardDescription, CardHeader } from "@schemastud/ui";
import { Fragment, jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var ROOT_NODE = { type: "object" };
function CardLink({
  href,
  className,
  children,
  ariaLabel,
  marker,
  options
}) {
  const render = options?.renderLink;
  if (render) {
    return render({ href, className, children, ...ariaLabel ? { "aria-label": ariaLabel } : {} });
  }
  return /* @__PURE__ */ jsx3("a", { href, className, "aria-label": ariaLabel, ...marker ?? {}, children });
}
function CardHeading({
  label,
  href,
  Icon,
  options
}) {
  const body = /* @__PURE__ */ jsxs3(Fragment, { children: [
    Icon ? /* @__PURE__ */ jsx3(Icon, { className: "size-3.5" }) : null,
    /* @__PURE__ */ jsx3("span", { className: "truncate", children: label })
  ] });
  const className = "flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground";
  if (!href) {
    return /* @__PURE__ */ jsx3("h3", { "data-frame-card-heading": true, className, children: body });
  }
  return /* @__PURE__ */ jsx3(
    CardLink,
    {
      href,
      className: `${className} hover:text-foreground`,
      marker: { "data-frame-card-heading": "" },
      options,
      children: body
    }
  );
}
function ViewAllLink({ href, options }) {
  if (!href) return null;
  return /* @__PURE__ */ jsx3(
    CardLink,
    {
      href,
      className: "inline-flex items-center gap-1 text-sm text-primary hover:underline",
      marker: { "data-frame-card-link": "" },
      options,
      children: "View all \u2192"
    }
  );
}
function EmptyState({ children }) {
  return /* @__PURE__ */ jsx3(
    "div",
    {
      "data-frame-card-empty": true,
      className: "rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground",
      children
    }
  );
}
function OverviewFrame({
  card,
  label,
  Icon,
  href,
  period,
  note,
  headline,
  fallback,
  options,
  children
}) {
  return /* @__PURE__ */ jsxs3(Card, { "data-frame-card": card, children: [
    /* @__PURE__ */ jsxs3(CardHeader, { className: "p-4 pb-2", children: [
      /* @__PURE__ */ jsx3(CardHeading, { label, href, Icon, options }),
      period ? /* @__PURE__ */ jsx3(CardDescription, { children: period }) : null
    ] }),
    /* @__PURE__ */ jsxs3(CardContent, { className: "space-y-4 p-4 pt-0", children: [
      headline ? /* @__PURE__ */ jsxs3("div", { children: [
        /* @__PURE__ */ jsx3("div", { className: "text-3xl font-semibold tabular-nums", "data-frame-figure": headline.key, children: headline.value }),
        /* @__PURE__ */ jsx3("div", { className: "text-xs text-muted-foreground", children: headline.label })
      ] }) : fallback ?? null,
      children,
      note ? /* @__PURE__ */ jsx3("p", { "data-frame-card-note": true, className: "text-xs text-muted-foreground", children: note }) : null,
      /* @__PURE__ */ jsx3(ViewAllLink, { href, options })
    ] })
  ] });
}

// src/cards/StatRow.tsx
import { displayLabel as displayLabel2 } from "@schemastud/seam";
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
function StatRow({ value, options, row }) {
  const figures = value?.figures ?? [];
  const label = displayLabel2({ title: value?.label ?? row?.label }, value?.key);
  const Icon = options?.iconFor?.(value?.icon ?? row?.icon);
  return /* @__PURE__ */ jsxs4("section", { "data-frame-card": "stat-row", className: "space-y-2", children: [
    /* @__PURE__ */ jsx4(CardHeading, { label, href: row?.href, Icon, options }),
    figures.length === 0 ? /* @__PURE__ */ jsx4(EmptyState, { children: "No figures." }) : /* @__PURE__ */ jsx4(
      "div",
      {
        className: "grid gap-3",
        style: { gridTemplateColumns: "repeat(auto-fill, minmax(9rem, 1fr))" },
        children: figures.map((figure) => /* @__PURE__ */ jsx4(
          StatTile,
          {
            label: figure.label,
            value: figure.value,
            tone: figure.tone ?? "default"
          },
          figure.key
        ))
      }
    )
  ] });
}

// src/cards/FigureCard.tsx
import { displayLabel as displayLabel3 } from "@schemastud/seam";
import { jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
function FigureCard({ value, options, row }) {
  const figures = value?.figures ?? [];
  const headline = value?.overview?.headline ?? void 0;
  const lead = headline ?? figures[0];
  const rest = headline ? figures : figures.slice(1);
  return /* @__PURE__ */ jsx5(
    OverviewFrame,
    {
      card: "figure-card",
      label: displayLabel3({ title: value?.label ?? row?.label }, value?.key),
      Icon: options?.iconFor?.(value?.icon ?? row?.icon),
      href: row?.href,
      period: value?.overview?.period ?? row?.description ?? void 0,
      note: value?.overview?.note ?? void 0,
      headline: lead,
      fallback: /* @__PURE__ */ jsx5(EmptyState, { children: "No figures." }),
      options,
      children: rest.length > 0 ? /* @__PURE__ */ jsx5(
        "div",
        {
          className: "grid gap-2 text-center",
          style: { gridTemplateColumns: `repeat(${Math.min(rest.length, 4)}, minmax(0, 1fr))` },
          children: rest.map((figure) => /* @__PURE__ */ jsxs5("div", { className: "rounded-md border p-2", "data-frame-figure": figure.key, children: [
            /* @__PURE__ */ jsx5("div", { className: "text-lg font-semibold tabular-nums", children: figure.value }),
            /* @__PURE__ */ jsx5("div", { className: "text-[11px] text-muted-foreground", children: figure.label })
          ] }, figure.key))
        }
      ) : null
    }
  );
}

// src/cards/RecentList.tsx
import { Card as Card2, CardContent as CardContent2, CardHeader as CardHeader2 } from "@schemastud/ui";

// src/cards/RecordLine.tsx
import { Badge } from "@schemastud/ui";
import { jsx as jsx6, jsxs as jsxs6 } from "react/jsx-runtime";
function RecordLine({ value }) {
  const record = value ?? {};
  const text = firstString(record, TEXT_FIELDS) ?? String(record.id ?? "");
  const badge = firstString(record, BADGE_FIELDS);
  const time = firstString(record, TIME_FIELDS);
  const parsed = time ? new Date(time) : void 0;
  const parses = parsed !== void 0 && !Number.isNaN(parsed.getTime());
  return /* @__PURE__ */ jsxs6("div", { "data-frame-record-line": true, className: "flex items-center gap-2 text-sm", children: [
    /* @__PURE__ */ jsx6("span", { "data-frame-record-line-text": true, className: "min-w-0 flex-1 truncate", children: text }),
    badge ? /* @__PURE__ */ jsx6(Badge, { variant: "secondary", "data-frame-record-line-badge": true, className: "shrink-0 font-normal", children: badge }) : null,
    time ? /* @__PURE__ */ jsx6(
      "time",
      {
        "data-frame-record-line-time": true,
        dateTime: time,
        title: parses ? parsed.toLocaleString() : void 0,
        className: "shrink-0 text-xs tabular-nums text-muted-foreground",
        children: formatRecordTime(time)
      }
    ) : null
  ] });
}
var TEXT_FIELDS = ["title", "label", "name", "description", "summary"];
var BADGE_FIELDS = ["event", "status"];
var TIME_FIELDS = ["created_at", "createdAt", "occurred_at", "occurredAt", "updated_at", "updatedAt"];
function firstString(record, fields) {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return void 0;
}
var MINUTE = 6e4;
var HOUR = 60 * MINUTE;
var DAY = 24 * HOUR;
var WEEK = 7 * DAY;
function formatRecordTime(raw, now = Date.now()) {
  const parsed = new Date(raw);
  const at = parsed.getTime();
  if (Number.isNaN(at)) return raw;
  const delta = at - now;
  const distance = Math.abs(delta);
  if (distance >= WEEK) return parsed.toLocaleDateString();
  const relative = new Intl.RelativeTimeFormat(void 0, { numeric: "auto", style: "narrow" });
  if (distance < MINUTE) return relative.format(0, "second");
  if (distance < HOUR) return relative.format(Math.trunc(delta / MINUTE), "minute");
  if (distance < DAY) return relative.format(Math.trunc(delta / HOUR), "hour");
  return relative.format(Math.trunc(delta / DAY), "day");
}

// src/cards/RecentList.tsx
import { jsx as jsx7, jsxs as jsxs7 } from "react/jsx-runtime";
function RecentList({ value, options, row }) {
  const { manifestFor, registry } = useFrameInjection();
  const resource = row?.resource ?? value?.key;
  const items = value?.overview?.items ?? [];
  const label = value?.label ?? row?.label ?? resource ?? "";
  const Icon = options?.iconFor?.(value?.icon ?? row?.icon);
  const target = resource ? manifestFor?.(resource) : void 0;
  const entry = target?.byNode[""]?.["list-item"];
  const bound = target ? listItemRendersCards(target, ROOT_NODE, registry) : false;
  const misdeclared = !bound && entry?.participates ? entry.widget : void 0;
  const line = recordLineFor(registry);
  return /* @__PURE__ */ jsxs7(Card2, { "data-frame-card": "recent-list", children: [
    /* @__PURE__ */ jsx7(CardHeader2, { className: "p-4 pb-2", children: /* @__PURE__ */ jsx7(CardHeading, { label, href: row?.href, Icon, options }) }),
    /* @__PURE__ */ jsxs7(CardContent2, { className: "space-y-3 p-4 pt-0", children: [
      items.length === 0 ? /* @__PURE__ */ jsx7(EmptyState, { children: "Nothing recent." }) : misdeclared ? /* @__PURE__ */ jsx7(UnboundWidget, { label, widget: misdeclared, kind: "unbound-list-item" }) : /* @__PURE__ */ jsx7("ol", { "data-frame-recent-items": true, className: "divide-y rounded-md border", children: items.map((item, i) => /* @__PURE__ */ jsx7("li", { className: "px-3 py-2 text-sm", children: bound && target ? /* @__PURE__ */ jsx7(
        SchemaView,
        {
          schema: ROOT_NODE,
          record: item,
          manifest: target,
          context: "list-item",
          registry
        }
      ) : /* @__PURE__ */ jsx7(line.Line, { ...widgetMountProps(item, ROOT_NODE, line.config) }) }, item.id ?? i)) }),
      /* @__PURE__ */ jsx7(ViewAllLink, { href: row?.href, options })
    ] })
  ] });
}
function recordLineFor(registry) {
  const { widget, config } = registry.resolveEntry({ "x-widget": "record-line" });
  return isWidgetComponent(widget) ? { Line: widget, config } : { Line: RecordLine };
}

// src/cards/NavTile.tsx
import { jsx as jsx8, jsxs as jsxs8 } from "react/jsx-runtime";
function NavTile({ value, options }) {
  if (!value?.href) return null;
  const Icon = options?.iconFor?.(value.icon);
  return /* @__PURE__ */ jsxs8(
    CardLink,
    {
      href: value.href,
      className: "group flex items-center gap-3 rounded-md border bg-card p-3 text-card-foreground transition-colors hover:border-primary/40 hover:bg-muted/40",
      marker: { "data-frame-card": "nav-tile" },
      options,
      children: [
        /* @__PURE__ */ jsx8(
          "span",
          {
            "aria-hidden": true,
            className: "grid size-8 flex-none place-items-center rounded-md bg-muted/60 text-muted-foreground group-hover:text-foreground",
            children: Icon ? /* @__PURE__ */ jsx8(Icon, { className: "size-4" }) : /* @__PURE__ */ jsx8("span", { className: "text-xs font-semibold uppercase", children: value.label.slice(0, 1) })
          }
        ),
        /* @__PURE__ */ jsxs8("span", { className: "min-w-0", children: [
          /* @__PURE__ */ jsx8("span", { className: "block truncate text-sm font-medium", children: value.label }),
          value.description ? /* @__PURE__ */ jsx8("span", { className: "block truncate text-[11px] text-muted-foreground", children: value.description }) : null
        ] })
      ]
    }
  );
}

// src/cards/WelcomePanel.tsx
import { Inbox, UsersRound } from "lucide-react";
import { Card as Card3, CardContent as CardContent3, buttonVariants } from "@schemastud/ui";
import { jsx as jsx9, jsxs as jsxs9 } from "react/jsx-runtime";
function WelcomePanel({ value, options }) {
  const Icon = value.state === "first-run" ? UsersRound : Inbox;
  return /* @__PURE__ */ jsx9(Card3, { "data-frame-card": "welcome", "data-frame-welcome-state": value.state, className: "py-0", children: /* @__PURE__ */ jsxs9(CardContent3, { className: "flex flex-col items-start gap-4 p-6 sm:flex-row sm:gap-5 sm:p-8", children: [
    /* @__PURE__ */ jsx9(
      "span",
      {
        "aria-hidden": true,
        className: "grid size-10 flex-none place-items-center rounded-full bg-muted text-muted-foreground",
        children: /* @__PURE__ */ jsx9(Icon, { className: "size-5" })
      }
    ),
    /* @__PURE__ */ jsxs9("div", { className: "flex min-w-0 flex-col gap-4", children: [
      /* @__PURE__ */ jsxs9("div", { className: "flex flex-col gap-1.5", children: [
        /* @__PURE__ */ jsx9("h2", { className: "text-lg font-semibold leading-tight text-foreground", children: value.heading }),
        /* @__PURE__ */ jsx9("p", { className: "max-w-prose text-sm text-muted-foreground", children: value.body })
      ] }),
      value.actions.length > 0 ? /* @__PURE__ */ jsx9("div", { className: "flex flex-wrap items-center gap-2", "data-frame-welcome-actions": true, children: value.actions.map((action, i) => /* @__PURE__ */ jsx9(
        CardLink,
        {
          href: action.href,
          className: buttonVariants({ variant: i === 0 ? "default" : "outline", size: "sm" }),
          marker: { "data-frame-welcome-action": action.key },
          options,
          children: action.label
        },
        action.key
      )) }) : null,
      value.hint ? /* @__PURE__ */ jsx9("p", { className: "text-sm text-muted-foreground", children: value.hint }) : null
    ] })
  ] }) });
}

// src/cards/DashboardCard.tsx
import { jsx as jsx10 } from "react/jsx-runtime";
function bindingOf(root, ctx) {
  if (!ctx) return void 0;
  const cm = root[ctx];
  return cm?.participates ? cm : void 0;
}
function resolveDashboardCard(row, manifest, registry) {
  const root = manifest.byNode[""] ?? {};
  const own = row.context === "overview" ? "overview" : "summary";
  const chain = own === "overview" ? ["overview", "summary"] : ["summary"];
  for (const ctx of chain) {
    const cm = bindingOf(root, ctx);
    if (!cm) continue;
    const lender = bindingOf(root, INHERITS[ctx]);
    const resolved = resolveWidgetFor(ROOT_NODE, ctx, cm, lender, registry);
    const inherited = cm.widget === void 0 && cm.inheritsBinding !== false ? lender?.widget : void 0;
    const declared = cm.widget ?? inherited;
    if (resolved.unbound || isWidgetComponent(resolved.widget)) {
      return { ...resolved, tier: inherited !== void 0 ? INHERITS[ctx] : ctx, declared };
    }
  }
  return {
    ...resolveWidgetFor(ROOT_NODE, own, { participates: true }, void 0, registry),
    tier: "default"
  };
}
function dashboardRowRenders(record, manifestFor, registry) {
  const row = record;
  if (row.context === "welcome") return typeof row.welcome === "object" && row.welcome !== null;
  if (typeof row.context !== "string" || typeof row.resource !== "string") return true;
  if (row.context === "nav") return true;
  const manifest = manifestFor?.(row.resource);
  if (!manifest) return false;
  const resolved = resolveDashboardCard(row, manifest, registry);
  return resolved.unbound === true || isWidgetComponent(resolved.widget);
}
function DashboardCard({ value, options }) {
  const { manifestFor, registry } = useFrameInjection();
  const row = value;
  if (!row || typeof row !== "object") return null;
  if (row.context === "nav") {
    return /* @__PURE__ */ jsx10(
      NavTile,
      {
        value: { label: row.label, icon: row.icon, href: row.href, description: row.description },
        options
      }
    );
  }
  if (row.context === "welcome") {
    return row.welcome ? /* @__PURE__ */ jsx10(WelcomePanel, { value: row.welcome, options }) : null;
  }
  const resource = row.resource;
  const manifest = resource ? manifestFor?.(resource) : void 0;
  if (!manifest || !resource) return null;
  const resolved = resolveDashboardCard(row, manifest, registry);
  const cell = (body2) => /* @__PURE__ */ jsx10("div", { "data-frame-card": "dashboard-card", "data-frame-card-resource": resource, "data-frame-card-context": row.context, children: body2 });
  if (resolved.unbound) {
    return cell(/* @__PURE__ */ jsx10(UnboundWidget, { kind: "unbound", label: row.label, widget: resolved.declared }));
  }
  if (!isWidgetComponent(resolved.widget)) return null;
  const Widget = resolved.widget;
  const payload = row.summary ?? {
    key: resource,
    label: row.label,
    icon: row.icon,
    figures: []
  };
  const merged = { ...options ?? {}, ...resolved.config ?? {} };
  const body = /* @__PURE__ */ jsx10(Widget, { ...widgetMountProps(payload, ROOT_NODE, merged), row });
  if (row.context !== "overview" || resolved.tier !== "summary") return cell(body);
  return cell(
    /* @__PURE__ */ jsx10(
      OverviewFrame,
      {
        card: "overview-frame",
        label: payload.label ?? row.label,
        Icon: merged.iconFor?.(payload.icon ?? row.icon),
        href: row.href,
        period: payload.overview?.period ?? void 0,
        note: payload.overview?.note ?? void 0,
        headline: payload.overview?.headline ?? void 0,
        options: merged,
        children: body
      }
    )
  );
}

// src/cards/TrendCard.tsx
import { useId } from "react";
import { displayLabel as displayLabel4 } from "@schemastud/seam";
import { Fragment as Fragment2, jsx as jsx11, jsxs as jsxs10 } from "react/jsx-runtime";
var PLAIN_NUMBER = /^-?\d+(?:\.\d+)?$/;
function plotValue(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && PLAIN_NUMBER.test(value.trim())) return Number(value.trim());
  return null;
}
function trendSeries(figures) {
  return figures.map((figure, index) => ({
    key: figure.key,
    label: figure.label,
    value: plotValue(figure.value),
    display: figure.value,
    forecast: figure.forecast === true,
    index
  }));
}
function trendSegments(points) {
  const segments = [];
  let previous = null;
  for (const point of points) {
    if (point.value === null) {
      previous = null;
      continue;
    }
    if (previous === null) {
      segments.push({ forecast: point.forecast, points: [point] });
      previous = point;
      continue;
    }
    const forecast = previous.forecast || point.forecast;
    const current = segments[segments.length - 1];
    if (current.points.length === 1) {
      current.forecast = forecast;
      current.points.push(point);
    } else if (current.forecast === forecast) {
      current.points.push(point);
    } else {
      segments.push({ forecast, points: [previous, point] });
    }
    previous = point;
  }
  return segments;
}
function forecastBoundary(points) {
  const first = points.findIndex((point) => point.forecast);
  if (first <= 0) return null;
  for (let i = first - 1; i >= 0; i--) {
    if (points[i].value !== null) return points[i];
  }
  return null;
}
function describeTrend(label, points) {
  if (points.length === 0) return `${label}: no periods.`;
  const first = points[0];
  const last = points[points.length - 1];
  const span = points.length === 1 ? `1 period, ${first.label}: ${first.display}${first.forecast ? " (forecast)" : ""}` : `${points.length} periods, ${first.label} to ${last.label}`;
  const forecast = points.filter((point) => point.forecast);
  const forecastFrom = forecast.length > 0 && points.length > 1 ? `; ${forecast.length} forecast from ${forecast[0].label}` : "";
  return `${label}: ${span}${forecastFrom}.`;
}
var WIDTH = 320;
var HEIGHT = 96;
var PAD = 6;
function scale(points) {
  const values = points.map((point) => point.value).filter((value) => value !== null);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const n = points.length;
  const x = (point) => n === 1 ? WIDTH / 2 : PAD + point.index * (WIDTH - 2 * PAD) / (n - 1);
  const y = (point) => max === min ? HEIGHT / 2 : PAD + (max - point.value) * (HEIGHT - 2 * PAD) / (max - min);
  return { x, y };
}
var STROKE = {
  actual: "text-primary",
  forecast: "text-muted-foreground"
};
function TrendCard({ value, options, row }) {
  const titleId = useId();
  const figures = value?.figures ?? [];
  const label = displayLabel4({ title: value?.label ?? row?.label }, value?.key);
  const Icon = options?.iconFor?.(value?.icon ?? row?.icon);
  const points = trendSeries(figures);
  const plotted = points.filter((point) => point.value !== null);
  const hasForecast = points.some((point) => point.forecast);
  const framedHeadline = row?.context === "overview" && value?.overview?.headline;
  const lead = framedHeadline ? void 0 : [...points].reverse().find((point) => !point.forecast);
  return /* @__PURE__ */ jsxs10("section", { "data-frame-card": "trend-card", className: "space-y-2", children: [
    /* @__PURE__ */ jsx11(CardHeading, { label, href: row?.href, Icon, options }),
    points.length === 0 ? /* @__PURE__ */ jsx11(EmptyState, { children: "No periods." }) : /* @__PURE__ */ jsxs10(Fragment2, { children: [
      lead ? /* @__PURE__ */ jsxs10("div", { "data-frame-trend-lead": lead.key, children: [
        /* @__PURE__ */ jsx11("div", { className: "text-2xl font-semibold tabular-nums", children: lead.display }),
        /* @__PURE__ */ jsx11("div", { className: "text-xs text-muted-foreground", children: lead.label })
      ] }) : null,
      plotted.length > 0 ? /* @__PURE__ */ jsx11(TrendChart, { points, titleId, title: describeTrend(label, points) }) : /* @__PURE__ */ jsx11(EmptyState, { children: "No plottable periods." }),
      /* @__PURE__ */ jsxs10(
        "div",
        {
          "aria-hidden": "true",
          className: "flex justify-between gap-2 text-[11px] text-muted-foreground",
          "data-frame-trend-axis": true,
          children: [
            /* @__PURE__ */ jsx11("span", { className: "truncate", children: points[0].label }),
            points.length > 1 ? /* @__PURE__ */ jsx11("span", { className: "truncate", children: points[points.length - 1].label }) : null
          ]
        }
      ),
      hasForecast ? /* @__PURE__ */ jsxs10("div", { "aria-hidden": "true", className: "flex gap-3 text-[11px] text-muted-foreground", "data-frame-trend-legend": true, children: [
        /* @__PURE__ */ jsxs10("span", { className: "inline-flex items-center gap-1", children: [
          /* @__PURE__ */ jsx11("svg", { viewBox: "0 0 16 4", className: `h-1 w-4 ${STROKE.actual}`, children: /* @__PURE__ */ jsx11("line", { x1: "0", y1: "2", x2: "16", y2: "2", stroke: "currentColor", strokeWidth: "2" }) }),
          "Actual"
        ] }),
        /* @__PURE__ */ jsxs10("span", { className: "inline-flex items-center gap-1", children: [
          /* @__PURE__ */ jsx11("svg", { viewBox: "0 0 16 4", className: `h-1 w-4 ${STROKE.forecast}`, children: /* @__PURE__ */ jsx11("line", { x1: "0", y1: "2", x2: "16", y2: "2", stroke: "currentColor", strokeWidth: "2", strokeDasharray: "4 3" }) }),
          "Forecast"
        ] })
      ] }) : null,
      /* @__PURE__ */ jsxs10("table", { className: "sr-only", "data-frame-trend-table": true, children: [
        /* @__PURE__ */ jsx11("caption", { children: label }),
        /* @__PURE__ */ jsx11("thead", { children: /* @__PURE__ */ jsxs10("tr", { children: [
          /* @__PURE__ */ jsx11("th", { scope: "col", children: "Period" }),
          /* @__PURE__ */ jsx11("th", { scope: "col", children: "Value" }),
          /* @__PURE__ */ jsx11("th", { scope: "col", children: "Basis" })
        ] }) }),
        /* @__PURE__ */ jsx11("tbody", { children: points.map((point) => /* @__PURE__ */ jsxs10("tr", { "data-frame-trend-period": point.key, children: [
          /* @__PURE__ */ jsx11("th", { scope: "row", children: point.label }),
          /* @__PURE__ */ jsx11("td", { children: point.display }),
          /* @__PURE__ */ jsx11("td", { children: point.forecast ? "Forecast" : "Actual" })
        ] }, point.key)) })
      ] })
    ] })
  ] });
}
function TrendChart({ points, titleId, title }) {
  const { x, y } = scale(points);
  const segments = trendSegments(points);
  const boundary = forecastBoundary(points);
  const lastPlotted = [...points].reverse().find((point) => point.value !== null);
  return /* @__PURE__ */ jsxs10(
    "svg",
    {
      viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
      role: "img",
      "aria-labelledby": titleId,
      className: "h-auto w-full overflow-visible",
      "data-frame-trend-chart": true,
      children: [
        /* @__PURE__ */ jsx11("title", { id: titleId, children: title }),
        boundary ? /* @__PURE__ */ jsx11(
          "line",
          {
            x1: x(boundary),
            x2: x(boundary),
            y1: 0,
            y2: HEIGHT,
            stroke: "currentColor",
            strokeWidth: 1,
            strokeDasharray: "2 3",
            vectorEffect: "non-scaling-stroke",
            className: "text-border",
            "data-frame-trend-boundary": boundary.key
          }
        ) : null,
        segments.map(
          (segment) => segment.points.length === 1 ? null : /* @__PURE__ */ jsx11(
            "polyline",
            {
              points: segment.points.map((point) => `${x(point)},${y(point)}`).join(" "),
              fill: "none",
              stroke: "currentColor",
              strokeWidth: 2,
              strokeLinejoin: "round",
              strokeLinecap: "round",
              strokeDasharray: segment.forecast ? "5 4" : void 0,
              vectorEffect: "non-scaling-stroke",
              className: segment.forecast ? STROKE.forecast : STROKE.actual,
              "data-frame-trend-segment": segment.forecast ? "forecast" : "actual"
            },
            `${segment.points[0].key}-${segment.forecast ? "f" : "a"}`
          )
        ),
        points.map((point) => {
          if (point.value === null) return null;
          const isolated = segments.some((s) => s.points.length === 1 && s.points[0] === point);
          if (!isolated && point !== lastPlotted) return null;
          return /* @__PURE__ */ jsx11(
            "circle",
            {
              cx: x(point),
              cy: y(point),
              r: 3,
              stroke: "currentColor",
              strokeWidth: 2,
              vectorEffect: "non-scaling-stroke",
              className: `${point.forecast ? `${STROKE.forecast} fill-background` : `${STROKE.actual} fill-current`}`,
              "data-frame-trend-point": point.key
            },
            point.key
          );
        })
      ]
    }
  );
}

// src/cards/index.ts
var CARD_WIDGETS = {
  "stat-row": StatRow,
  "figure-card": FigureCard,
  "recent-list": RecentList,
  "record-line": RecordLine,
  "nav-tile": NavTile,
  "dashboard-card": DashboardCard,
  "trend-card": TrendCard
};
var installed = /* @__PURE__ */ new WeakSet();
function registerCardWidgets(registry, options = {}) {
  if (installed.has(registry)) return;
  const config = { iconFor: options.iconFor, renderLink: options.renderLink };
  registry.registerWidget(
    (s) => s[FRAME_CONTEXT_KEYWORD] === "summary" && !s["x-widget"],
    StatRow,
    config
  );
  registry.registerWidget(
    (s) => s[FRAME_CONTEXT_KEYWORD] === "overview" && !s["x-widget"],
    FigureCard,
    config
  );
  for (const [name, widget] of Object.entries(CARD_WIDGETS)) {
    registry.registerWidget((s) => s["x-widget"] === name, widget, config);
  }
  installed.add(registry);
}

// src/data.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { transportScope } from "@schemastud/facets";
function resourceQueryKey(transport, resource, ...parts) {
  return ["frame", resource, ...parts, transportScope(transport)];
}
function useResourceQuery(transport, resource, options) {
  const client = useQueryClient();
  const effective = client.defaultQueryOptions(options);
  const placeholder = effective.placeholderData;
  const scope = transportScope(transport);
  return useQuery({
    ...effective,
    // Preserve host pagination placeholders only within the same authority
    // and resource, including defaults installed on the shared QueryClient.
    placeholderData: (previous, previousQuery) => {
      if (previousQuery && (previousQuery.queryKey[0] !== "frame" || previousQuery.queryKey[1] !== resource || previousQuery.queryKey.at(-1) !== scope)) {
        return void 0;
      }
      return typeof placeholder === "function" ? placeholder(previous, previousQuery) : placeholder;
    }
  });
}
function useSelectedCollection() {
  const { useUrlState } = useFrameInjection();
  const [params] = useUrlState();
  return params.get("collection") ?? void 0;
}
function useResourceList(resource, params, options) {
  const { transport } = useFrameInjection();
  return useResourceQuery(transport, resource, {
    queryKey: resourceQueryKey(transport, resource, "list", params),
    queryFn: () => transport.list(resource, params),
    ...options
  });
}
function useResourceRecord(resource, id, options) {
  const { transport } = useFrameInjection();
  const collection = useSelectedCollection();
  return useResourceQuery(transport, resource, {
    queryKey: resourceQueryKey(transport, resource, "record", id, collection ?? null),
    queryFn: () => collection ? transport.get(resource, id, { collection }) : transport.get(resource, id),
    enabled: id !== null,
    ...options
  });
}
function useFormSchema(resource, form, purpose = "write") {
  const { transport } = useFrameInjection();
  const collection = useSelectedCollection();
  return useQuery({
    queryKey: resourceQueryKey(transport, resource, "form-schema", form, purpose, collection ?? null),
    placeholderData: void 0,
    queryFn: () => collection ? transport.getFormSchema(resource, form, purpose, { collection }) : transport.getFormSchema(resource, form, purpose),
    staleTime: 5 * 60 * 1e3
  });
}
function useSaveResource(resource) {
  const { transport } = useFrameInjection();
  const collection = useSelectedCollection();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: resourceQueryKey(transport, resource, "save", collection ?? null),
    mutationFn: ({ id, data }) => id === null ? collection ? transport.create(resource, data, { collection }) : transport.create(resource, data) : collection ? transport.save(resource, id, data, { collection }) : transport.save(resource, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["frame", resource],
        predicate: (query) => query.queryKey.at(-1) === transportScope(transport)
      });
    }
  });
}
function useRemoveResource(resource) {
  const { transport } = useFrameInjection();
  const collection = useSelectedCollection();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: resourceQueryKey(transport, resource, "remove", collection ?? null),
    mutationFn: (id) => collection ? transport.remove(resource, id, { collection }) : transport.remove(resource, id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["frame", resource],
        predicate: (query) => query.queryKey.at(-1) === transportScope(transport)
      });
    }
  });
}

// src/slots/defaults.tsx
import { Fragment as Fragment3, jsx as jsx12, jsxs as jsxs11 } from "react/jsx-runtime";
function DefaultToolbar({
  resource,
  onNew,
  canCreate,
  framesCreate,
  singularLabel
}) {
  const { primitives } = useFrameInjection();
  const { Button: Button2 } = primitives;
  if (!canCreate || !framesCreate) return null;
  return /* @__PURE__ */ jsx12("div", { "data-frame-slot": "Toolbar", style: { display: "flex", justifyContent: "flex-end" }, children: /* @__PURE__ */ jsxs11(Button2, { type: "button", onClick: onNew, "data-frame-action": "new", children: [
    "New ",
    createNoun(resource, singularLabel)
  ] }) });
}
function createNoun(resource, singularLabel) {
  return singularLabel ? singularLabel.toLocaleLowerCase() : resource;
}
function DefaultRowActions({
  record,
  resource,
  actions,
  singularLabel
}) {
  const { primitives, can } = useFrameInjection();
  const { Button: Button2 } = primitives;
  const remove = useRemoveResource(resource);
  if (!actions.includes("delete") || !can("delete", resource)) return null;
  const noun = createNoun(resource, singularLabel);
  const id = String(record.id ?? "");
  return /* @__PURE__ */ jsx12(
    "div",
    {
      "data-frame-slot": "RowActions",
      style: { display: "flex", gap: "0.25rem", justifyContent: "flex-end" },
      children: /* @__PURE__ */ jsx12(
        Button2,
        {
          type: "button",
          "data-frame-action": "delete",
          "aria-label": `Delete ${noun}`,
          title: `Delete ${noun}`,
          disabled: remove.isPending || id === "",
          style: {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "1.75rem",
            height: "1.75rem",
            padding: 0,
            background: "transparent",
            border: "none",
            boxShadow: "none",
            cursor: "pointer",
            color: "var(--destructive, #dc2626)",
            opacity: remove.isPending ? 0.5 : 1
          },
          onClick: (event) => {
            event.stopPropagation();
            if (window.confirm(`Delete ${noun} "${recordName(record)}"?`)) {
              remove.mutate(id);
            }
          },
          children: /* @__PURE__ */ jsx12(Trash2, { "aria-hidden": true, style: { width: "1rem", height: "1rem" } })
        }
      )
    }
  );
}
function recordName(record) {
  for (const field of ["name", "title", "label"]) {
    const value = record[field];
    if (typeof value === "string" && value !== "") return value;
  }
  return String(record.id ?? "");
}
function DefaultCell({ column, record }) {
  if (column.cell) return /* @__PURE__ */ jsx12(Fragment3, { children: column.cell(record) });
  const value = getPath(record, column.field);
  return /* @__PURE__ */ jsx12(Fragment3, { children: value === null || value === void 0 ? "" : String(value) });
}
function DefaultEmpty() {
  return /* @__PURE__ */ jsx12("div", { "data-frame-slot": "Empty", style: { padding: "2rem", textAlign: "center", opacity: 0.6 }, children: "No records." });
}
function DefaultErrorState({ error, retry }) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : null;
  return /* @__PURE__ */ jsxs11(
    "div",
    {
      "data-frame-slot": "ErrorState",
      role: "alert",
      style: { padding: "2rem", textAlign: "center" },
      children: [
        /* @__PURE__ */ jsx12("div", { children: "Could not load this list." }),
        message ? /* @__PURE__ */ jsx12("div", { style: { marginTop: "0.5rem", opacity: 0.7, fontSize: "0.875em" }, children: message }) : null,
        /* @__PURE__ */ jsx12("button", { type: "button", onClick: retry, style: { marginTop: "0.75rem" }, children: "Retry" })
      ]
    }
  );
}
function DefaultNotFound({ message }) {
  return /* @__PURE__ */ jsx12(
    "div",
    {
      "data-frame-slot": "NotFound",
      role: "alert",
      style: { padding: "2rem", textAlign: "center", opacity: 0.7 },
      children: message ?? "This record was not found."
    }
  );
}
function DefaultLoading() {
  const { primitives } = useFrameInjection();
  const { Skeleton } = primitives;
  return (
    // Sized and busy: an unsized Skeleton has no height, so a loading list looked EMPTY, and nothing
    // told a waiting reader (or a settle-before-capture helper) that it was still loading.
    /* @__PURE__ */ jsx12("div", { "data-frame-slot": "Loading", "aria-busy": "true", children: /* @__PURE__ */ jsx12(Skeleton, { className: "h-24 w-full" }) })
  );
}
function DefaultPagination(props) {
  const {
    primitives: { Button: Button2 }
  } = useFrameInjection();
  const lastPage = props.mode === "offset" ? Math.max(1, Math.ceil(props.total / props.perPage)) : 1;
  return /* @__PURE__ */ jsxs11(
    "div",
    {
      "data-frame-slot": "Pagination",
      style: { display: "flex", gap: "0.5rem", alignItems: "center" },
      children: [
        props.mode === "cursor" && /* @__PURE__ */ jsx12(
          Button2,
          {
            type: "button",
            disabled: props.disabled || props.isFirst,
            onClick: props.onFirst,
            children: "First"
          }
        ),
        /* @__PURE__ */ jsx12(
          Button2,
          {
            type: "button",
            disabled: props.disabled || (props.mode === "offset" ? props.page <= 1 : !props.hasPrevious),
            onClick: () => props.mode === "offset" ? props.onPageChange(props.page - 1) : props.onPrevious(),
            children: "Prev"
          }
        ),
        props.mode === "offset" && /* @__PURE__ */ jsxs11("span", { "data-frame-page": true, children: [
          props.page,
          " / ",
          lastPage
        ] }),
        /* @__PURE__ */ jsx12(
          Button2,
          {
            type: "button",
            disabled: props.disabled || (props.mode === "offset" ? props.page >= lastPage : !props.hasNext),
            onClick: () => props.mode === "offset" ? props.onPageChange(props.page + 1) : props.onNext(),
            children: "Next"
          }
        )
      ]
    }
  );
}
function DefaultTable(props) {
  const { columns, rows, onOpen, Cell, RowActions } = props;
  const cellStyle = {
    paddingBlock: "var(--density-row-py, 0.5rem)",
    paddingInline: "0.5rem"
  };
  return /* @__PURE__ */ jsxs11("table", { "data-frame-slot": "Table", style: { width: "100%", borderCollapse: "collapse" }, children: [
    /* @__PURE__ */ jsx12("thead", { children: /* @__PURE__ */ jsxs11("tr", { children: [
      columns.map((c) => /* @__PURE__ */ jsx12("th", { style: { textAlign: "left", ...cellStyle }, children: c.header ?? c.field }, c.field)),
      RowActions ? /* @__PURE__ */ jsx12("th", {}) : null
    ] }) }),
    /* @__PURE__ */ jsx12("tbody", { children: rows.map((row, i) => /* @__PURE__ */ jsxs11(
      "tr",
      {
        "data-frame-row": true,
        onClick: () => onOpen?.(row),
        style: { cursor: onOpen ? "pointer" : void 0 },
        children: [
          columns.map((c) => /* @__PURE__ */ jsx12("td", { style: cellStyle, children: /* @__PURE__ */ jsx12(Cell, { column: c, record: row }) }, c.field)),
          RowActions ? /* @__PURE__ */ jsx12("td", { onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ jsx12(RowActions, { record: row }) }) : null
        ]
      },
      row.id ?? i
    )) })
  ] });
}
function DefaultCards({ rows, onOpen, Card: Card4 }) {
  const { manifestFor, registry } = useFrameInjection();
  const visible = rows.filter((row) => dashboardRowRenders(row, manifestFor, registry));
  return /* @__PURE__ */ jsx12(
    "div",
    {
      "data-frame-slot": "Cards",
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(18rem, 1fr))",
        gap: "var(--density-gap, 1rem)"
      },
      children: visible.map((row, i) => /* @__PURE__ */ jsx12(
        "div",
        {
          "data-frame-card-cell": true,
          onClick: onOpen ? () => onOpen(row) : void 0,
          style: {
            minWidth: 0,
            cursor: onOpen ? "pointer" : void 0,
            // A dashboard's welcome panel is its only row and reads as a page, not a card:
            // it spans every track instead of sitting in one 18rem cell.
            gridColumn: row.context === "welcome" ? "1 / -1" : void 0
          },
          children: /* @__PURE__ */ jsx12(Card4, { record: row })
        },
        row.id ?? i
      ))
    }
  );
}
function DefaultFormBody(props) {
  const { schema, readOnly } = props;
  const { formResolver } = useFrameInjection();
  const CanonicalForm = formResolver?.resolveFormForSchema(schema).form ?? null;
  if (CanonicalForm) {
    return /* @__PURE__ */ jsx12("div", { "data-frame-slot": "FormBody", "data-frame-readonly": readOnly ? "" : void 0, children: /* @__PURE__ */ jsx12(CanonicalForm, { ...props }) });
  }
  return /* @__PURE__ */ jsx12(SchemaFormBody, { ...props });
}
function SchemaFormBody({
  schema,
  formData,
  intentBus,
  readOnly,
  onChange,
  onSubmit,
  registerSubmit
}) {
  const { schemaFetcher, registry } = useFrameInjection();
  const idPrefix = useId2();
  const root = useRef(null);
  useEffect(() => {
    registerSubmit(() => root.current?.querySelector("form")?.requestSubmit());
    return () => registerSubmit(null);
  }, [registerSubmit]);
  return /* @__PURE__ */ jsx12("div", { ref: root, "data-frame-slot": "FormBody", "data-frame-readonly": readOnly ? "" : void 0, children: /* @__PURE__ */ jsx12(
    SchemaForm,
    {
      idPrefix,
      schema,
      formData,
      registry,
      schemaFetcher,
      disabled: readOnly,
      formContext: { intentBus, readOnly },
      uiSchema: { "ui:submitButtonOptions": { norender: true } },
      onChange: (e) => onChange(e.formData ?? {}),
      onSubmit: (e) => onSubmit(e.formData ?? {})
    }
  ) });
}
function DefaultToggle({
  value,
  onChange
}) {
  return /* @__PURE__ */ jsx12("div", { "data-frame-slot": "Toggle", role: "radiogroup", "aria-label": "Form mode", children: ["enriched", "bare"].map((mode) => /* @__PURE__ */ jsxs11("label", { style: { marginRight: "0.5rem" }, children: [
    /* @__PURE__ */ jsx12(
      "input",
      {
        type: "radio",
        name: "frame-form-mode",
        checked: value === mode,
        onChange: () => onChange(mode)
      }
    ),
    mode
  ] }, mode)) });
}
var FACES = { display: "inline-grid" };
var FACE_ON = { gridArea: "1 / 1" };
var FACE_OFF = { gridArea: "1 / 1", opacity: 0, pointerEvents: "none" };
function DefaultSaveBar({
  saving,
  canSubmit,
  readOnly,
  onSave,
  onCancel
}) {
  const { primitives } = useFrameInjection();
  const { Button: Button2 } = primitives;
  return /* @__PURE__ */ jsxs11(
    "div",
    {
      "data-frame-slot": "SaveBar",
      "data-frame-sticky": "save",
      style: {
        // C17 create-chrome: the Save control sticks to the bottom of the scroll area so it
        // stays reachable on a long form; EditShell pairs this with a bottom spacer so the
        // sticky bar cannot cover the last field (UX13/UX14).
        position: "sticky",
        bottom: 0,
        display: "flex",
        gap: "0.5rem",
        background: "var(--background, #fff)",
        borderTop: "1px solid var(--border, rgba(0,0,0,0.1))",
        paddingTop: "0.75rem",
        marginTop: "0.5rem"
      },
      children: [
        onCancel ? /* @__PURE__ */ jsx12(Button2, { type: "button", onClick: onCancel, "data-frame-action": "cancel", children: "Cancel" }) : null,
        !readOnly ? /* @__PURE__ */ jsx12(
          Button2,
          {
            type: "button",
            disabled: saving || !canSubmit,
            onClick: onSave,
            "data-frame-action": "save",
            children: /* @__PURE__ */ jsxs11("span", { className: "motion-faces", style: FACES, children: [
              /* @__PURE__ */ jsx12(
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
              /* @__PURE__ */ jsx12(
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
function DefaultContainer({ children }) {
  const { primitives } = useFrameInjection();
  const { SidePanel } = primitives;
  return /* @__PURE__ */ jsx12(SidePanel, { "data-frame-slot": "Container", children });
}

// src/rowActions.ts
var KNOWN_ROW_ACTIONS = ["delete"];
function resolveRowActions(manifest) {
  const root = manifest?.byNode?.[""]?.["list-column"];
  if (!root?.participates || root.widget !== "row-actions") return [];
  const declared = root.options?.actions;
  if (!Array.isArray(declared)) return [];
  return KNOWN_ROW_ACTIONS.filter((known) => declared.includes(known));
}

// src/actions.ts
var FrameActionError = class extends Error {
  status;
  errors;
  body;
  constructor(status, body, fallback = `The request failed (${status}).`) {
    const envelope = body && typeof body === "object" ? body : {};
    super(typeof envelope.message === "string" && envelope.message !== "" ? envelope.message : fallback);
    this.name = "FrameActionError";
    this.status = status;
    this.body = body;
    this.errors = envelope.errors && typeof envelope.errors === "object" ? envelope.errors : {};
  }
};
function resolveActions(manifest, scope, transport) {
  const declared = manifest?.actions ?? [];
  const allowed = manifest?.can?.actions ?? {};
  return declared.filter(
    (action) => action.scope === scope && allowed[action.key] === true && (!transport || typeof transport.invoke === "function" && (action.input === null || typeof transport.getActionSchema === "function"))
  );
}
function actionUrl(action, id) {
  if (action.scope !== "record") return action.url;
  return action.url.replace("{id}", encodeURIComponent(String(id ?? "")));
}
function navigateTarget(result, record) {
  const data = result?.data;
  const id = data && typeof data === "object" && data.id != null ? data.id : record?.id;
  return id == null || id === "" ? null : String(id);
}

// src/ResourceActions.tsx
import { createFormIntentBus } from "@schemastud/seam";
import { useMutation as useMutation2, useQuery as useQuery2, useQueryClient as useQueryClient2 } from "@tanstack/react-query";
import { transportScope as transportScope2 } from "@schemastud/facets";
import { useCallback, useMemo, useRef as useRef2, useState as useState2 } from "react";
import { flushSync } from "react-dom";
import { Fragment as Fragment4, jsx as jsx13, jsxs as jsxs12 } from "react/jsx-runtime";
function ResourceActionBar({
  resource,
  manifest,
  ...handlers
}) {
  const { transport } = useFrameInjection();
  const actions = resolveActions(manifest, "resource", transport);
  if (actions.length === 0) return null;
  return /* @__PURE__ */ jsx13(
    "div",
    {
      "data-frame-slot": "ResourceActions",
      style: { display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexShrink: 0 },
      children: actions.map((action) => /* @__PURE__ */ jsx13(ActionButton, { resource, action, ...handlers }, action.key))
    }
  );
}
function RecordActionButtons({
  resource,
  manifest,
  record,
  compact = false,
  ...handlers
}) {
  const { transport } = useFrameInjection();
  const actions = resolveActions(manifest, "record", transport);
  if (actions.length === 0 || record.id == null || record.id === "") return null;
  return /* @__PURE__ */ jsx13(
    "div",
    {
      "data-frame-slot": "RecordActions",
      style: { display: "flex", gap: compact ? "0.25rem" : "0.5rem", justifyContent: "flex-end" },
      children: actions.map((action) => /* @__PURE__ */ jsx13(
        ActionButton,
        {
          resource,
          action,
          record,
          compact,
          ...handlers
        },
        action.key
      ))
    }
  );
}
function ActionButton({
  resource,
  action,
  record,
  compact = false,
  onNavigate,
  onNotice
}) {
  const { primitives, transport, notify } = useFrameInjection();
  const { Button: Button2 } = primitives;
  const queryClient = useQueryClient2();
  const [open, setOpen] = useState2(false);
  const trigger = useRef2(null);
  const close = useCallback(() => {
    setOpen(false);
    queueMicrotask(() => trigger.current?.focus());
  }, []);
  const notice = useCallback(
    (n) => notify ? notify(n) : onNotice?.(n),
    [notify, onNotice]
  );
  const invoke = useMutation2({
    mutationKey: resourceQueryKey(transport, resource, "action", action.key),
    mutationFn: (data) => {
      if (!transport.invoke) throw new Error("This host cannot send actions.");
      return transport.invoke(action, {
        id: record?.id == null ? null : String(record.id),
        data
      });
    },
    onSuccess: (result) => {
      close();
      notice({ tone: "success", message: result.message || `${action.label} done.` });
      const target = action.result === "navigate" ? navigateTarget(result, record) : null;
      if (target !== null && onNavigate) {
        onNavigate({ id: target });
        return;
      }
      void queryClient.invalidateQueries({
        queryKey: ["frame", resource],
        predicate: (query) => query.queryKey.at(-1) === transportScope2(transport)
      });
    },
    onError: (error) => {
      if (!(error instanceof FrameActionError && error.status === 422 && action.input !== null)) {
        notice({ tone: "error", message: error.message || `${action.label} failed.` });
      }
    }
  });
  return /* @__PURE__ */ jsxs12(Fragment4, { children: [
    /* @__PURE__ */ jsx13(
      Button2,
      {
        type: "button",
        "data-frame-action": action.key,
        "data-frame-action-scope": action.scope,
        disabled: invoke.isPending,
        variant: compact ? "outline" : action.destructive ? "destructive" : void 0,
        size: compact ? "sm" : void 0,
        style: compact && action.destructive ? { color: "var(--destructive, #dc2626)" } : void 0,
        onClick: (event) => {
          event?.stopPropagation?.();
          trigger.current = event.currentTarget ?? null;
          invoke.reset();
          setOpen(true);
        },
        children: action.label
      }
    ),
    open ? /* @__PURE__ */ jsx13(
      ActionDialog,
      {
        resource,
        action,
        pending: invoke.isPending,
        error: invoke.error,
        onCancel: close,
        onSubmit: (data) => invoke.mutate(data)
      }
    ) : null
  ] });
}
function ActionDialog({
  resource,
  action,
  pending,
  error,
  onCancel,
  onSubmit
}) {
  const { primitives, editSlots } = useFrameInjection();
  const { Button: Button2 } = primitives;
  const Dialog = primitives.Dialog;
  const FormBody = editSlots?.FormBody ?? DefaultFormBody;
  const [formData, setFormData] = useState2({});
  const submitHandler = useRef2(null);
  const [canSubmit, setCanSubmit] = useState2(false);
  const registerSubmit = useCallback((handler) => {
    submitHandler.current = handler;
    setCanSubmit(handler !== null);
  }, []);
  const intentBus = useMemo(() => createFormIntentBus(), []);
  const schemaQuery = useActionSchema(resource, action);
  const fieldErrors = error instanceof FrameActionError && error.status === 422 ? error.errors : {};
  const fieldErrorLines = Object.entries(fieldErrors).flatMap(([, messages]) => messages);
  const formSchema = useMemo(() => {
    if (!schemaQuery.data) return void 0;
    const { title: _title, ...rest } = schemaQuery.data;
    return rest;
  }, [schemaQuery.data]);
  const hasForm = action.input !== null;
  const ready = !hasForm || schemaQuery.data !== void 0;
  const body = /* @__PURE__ */ jsxs12(
    "div",
    {
      "data-frame-action-dialog": action.key,
      role: Dialog ? void 0 : "dialog",
      "aria-label": action.label,
      style: { display: "flex", flexDirection: "column", gap: "0.75rem" },
      children: [
        Dialog ? null : /* @__PURE__ */ jsx13("strong", { children: action.label }),
        hasForm ? schemaQuery.isError ? /* @__PURE__ */ jsx13("div", { role: "alert", children: "Could not load this form." }) : schemaQuery.data === void 0 ? /* @__PURE__ */ jsx13("div", { "data-frame-shell": "action-loading", children: "Loading\u2026" }) : /* @__PURE__ */ jsx13(
          FormBody,
          {
            schema: formSchema ?? schemaQuery.data,
            formData,
            intentBus,
            readOnly: pending,
            form: "bare",
            onChange: setFormData,
            onSubmit: (data) => onSubmit(data),
            registerSubmit
          }
        ) : /* @__PURE__ */ jsx13("p", { style: { margin: 0 }, children: action.destructive ? `${action.label}? This cannot be undone.` : `${action.label}?` }),
        error ? /* @__PURE__ */ jsx13("div", { role: "alert", "data-frame-action-error": "", children: fieldErrorLines.length > 0 ? fieldErrorLines.join(" ") : error.message }) : null,
        /* @__PURE__ */ jsxs12("div", { style: { display: "flex", gap: "0.5rem", justifyContent: "flex-end" }, children: [
          /* @__PURE__ */ jsx13(Button2, { type: "button", variant: "outline", onClick: onCancel, "data-frame-action": "cancel", children: "Cancel" }),
          /* @__PURE__ */ jsx13(
            Button2,
            {
              type: "button",
              "data-frame-action": "confirm",
              variant: action.destructive ? "destructive" : void 0,
              disabled: pending || !ready || hasForm && !canSubmit,
              onClick: () => {
                if (!hasForm) {
                  onSubmit(void 0);
                  return;
                }
                flushSync(() => intentBus.flushCommits());
                submitHandler.current?.();
              },
              children: pending ? "Working\u2026" : action.label
            }
          )
        ] })
      ]
    }
  );
  if (Dialog) {
    return /* @__PURE__ */ jsx13(
      Dialog,
      {
        open: true,
        title: action.label,
        onOpenChange: (next) => {
          if (!next) onCancel();
        },
        children: body
      }
    );
  }
  return body;
}
function useActionSchema(resource, action) {
  const { transport } = useFrameInjection();
  return useQuery2({
    queryKey: resourceQueryKey(transport, resource, "action-schema", action.key),
    enabled: action.input !== null && typeof transport.getActionSchema === "function",
    placeholderData: void 0,
    queryFn: () => transport.getActionSchema(resource, action.key),
    staleTime: 5 * 60 * 1e3
  });
}
function useInlineNotice() {
  const { notify } = useFrameInjection();
  const [notice, setNotice] = useState2(null);
  return {
    onNotice: notify ? void 0 : setNotice,
    element: !notify && notice ? /* @__PURE__ */ jsxs12(
      "div",
      {
        role: notice.tone === "error" ? "alert" : "status",
        "data-frame-notice": notice.tone,
        style: {
          display: "flex",
          justifyContent: "space-between",
          gap: "0.5rem",
          padding: "0.5rem 0.75rem",
          marginBottom: "0.75rem",
          borderRadius: "0.375rem",
          border: "1px solid currentColor",
          color: notice.tone === "error" ? "var(--destructive, #dc2626)" : "inherit"
        },
        children: [
          /* @__PURE__ */ jsx13("span", { children: notice.message }),
          /* @__PURE__ */ jsx13(
            "button",
            {
              type: "button",
              "aria-label": "Dismiss",
              onClick: () => setNotice(null),
              style: { background: "none", border: "none", cursor: "pointer", color: "inherit" },
              children: "\xD7"
            }
          )
        ]
      }
    ) : null
  };
}

// src/useListPagination.ts
import { useMemo as useMemo2 } from "react";
function useListPagination(resource, data, pending) {
  const { transport, useUrlState } = useFrameInjection();
  const [params, setParams] = useUrlState();
  const query = new URLSearchParams(params);
  query.delete("page");
  query.delete("cursor");
  query.sort();
  const fingerprint = query.toString();
  const predecessors = useMemo2(
    () => /* @__PURE__ */ new Map(),
    [transport, resource, fingerprint]
  );
  const cursor = params.get("cursor");
  const navigate = (next) => setParams(
    (previous) => {
      previous.delete("page");
      if (next === null) previous.delete("cursor");
      else previous.set("cursor", next);
      return previous;
    },
    { replace: false }
  );
  const onPerPageChange = (size) => setParams((previous) => {
    previous.delete("page");
    previous.delete("cursor");
    previous.set("per_page", String(size));
    return previous;
  });
  if (!data) return { props: void 0, visible: false };
  const common = { perPage: data.perPage, disabled: pending, onPerPageChange };
  if ("nextCursor" in data) {
    const next = data.nextCursor;
    return {
      visible: cursor !== null || next !== null,
      props: {
        ...common,
        mode: "cursor",
        isFirst: cursor === null,
        hasNext: next !== null && next !== cursor,
        hasPrevious: cursor !== null && predecessors.has(cursor),
        onNext: () => {
          if (pending || next === null || next === cursor) return;
          predecessors.set(next, cursor);
          navigate(next);
        },
        onPrevious: () => {
          if (pending || cursor === null || !predecessors.has(cursor)) return;
          navigate(predecessors.get(cursor) ?? null);
        },
        onFirst: () => {
          if (!pending) navigate(null);
        }
      }
    };
  }
  return {
    visible: data.page > 1 || data.total > data.perPage,
    props: {
      ...common,
      mode: "offset",
      page: data.page,
      total: data.total,
      onPageChange: (page) => {
        if (pending) return;
        setParams(
          (previous) => {
            previous.delete("cursor");
            previous.set("page", String(page));
            return previous;
          },
          { replace: false }
        );
      }
    }
  };
}

// src/ListShell.tsx
import { Fragment as Fragment5, jsx as jsx14, jsxs as jsxs13 } from "react/jsx-runtime";
function ListShell({
  resource,
  columns,
  onOpen,
  slots,
  manifest,
  onCellCommit,
  paginationPlacement = "both"
}) {
  const { can, registry, listSlots, transport, useUrlState } = useFrameInjection();
  const [searchParams, setSearchParams] = useUrlState();
  const collections = manifest?.collections ?? [];
  const requestedCollection = searchParams.get("collection");
  const selectedCollection = collections.find((choice) => choice.stem === requestedCollection)?.stem ?? collections[0]?.stem;
  const filters = useListFilters(
    resource,
    selectedCollection
  );
  const requestParams = selectedCollection ? { ...filters.requestParams, collection: selectedCollection } : filters.requestParams;
  useEffect2(() => {
    if (!selectedCollection || requestedCollection === selectedCollection) return;
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("collection", selectedCollection);
      next.delete("page");
      next.delete("cursor");
      return next;
    });
  }, [requestedCollection, selectedCollection, setSearchParams]);
  const query = useResourceList(resource, requestParams);
  const resolvedColumns = withEditableCells(
    resolveColumns(resource, filters.schema, columns, manifest),
    manifest,
    filters.schema,
    registry,
    onCellCommit
  );
  const canCreate = can("create", resource);
  const framesCreate = (manifest?.createAffordance ?? "frame") === "frame";
  const Toolbar = slots?.Toolbar ?? listSlots?.Toolbar ?? DefaultToolbar;
  const { SimpleSelect } = useFrameInjection().primitives;
  const FiltersSlot = slots?.Filters ?? listSlots?.Filters;
  const Table = slots?.Table ?? listSlots?.Table ?? DefaultTable;
  const Cards = slots?.Cards ?? listSlots?.Cards ?? DefaultCards;
  const Cell = slots?.Cell ?? listSlots?.Cell ?? DefaultCell;
  const rootSchema = useMemo3(
    () => filters.schema ?? { type: "object" },
    [filters.schema]
  );
  const cardsPath = manifest ? listItemRendersCards(manifest, rootSchema, registry) : false;
  const BoundCard = useMemo3(
    () => manifest ? ({ record }) => /* @__PURE__ */ jsx14(
      SchemaView,
      {
        schema: rootSchema,
        record,
        manifest,
        context: "list-item",
        registry
      }
    ) : () => null,
    [manifest, rootSchema, registry]
  );
  const declaredRowActions = resolveRowActions(manifest);
  const RowActions = slots?.RowActions ?? listSlots?.RowActions ?? (declaredRowActions.length > 0 ? DefaultRowActions : void 0);
  const recordActions = resolveActions(manifest, "record", transport);
  const notice = useInlineNotice();
  const navigate = onOpen ? (record) => onOpen(record) : void 0;
  const BoundRowActions = useMemo3(
    () => RowActions && recordActions.length === 0 ? ({ record }) => (
      // Byte-identical to the pre-action row for a resource that declares none.
      /* @__PURE__ */ jsx14(
        RowActions,
        {
          record,
          resource,
          actions: declaredRowActions,
          singularLabel: manifest?.singularLabel || void 0
        }
      )
    ) : recordActions.length > 0 ? ({ record }) => /* @__PURE__ */ jsxs13("div", { style: { display: "flex", gap: "0.25rem", justifyContent: "flex-end" }, children: [
      recordActions.length > 0 ? /* @__PURE__ */ jsx14(
        RecordActionButtons,
        {
          resource,
          manifest,
          record,
          compact: true,
          onNavigate: navigate,
          onNotice: notice.onNotice
        }
      ) : null,
      RowActions ? /* @__PURE__ */ jsx14(
        RowActions,
        {
          record,
          resource,
          actions: declaredRowActions,
          singularLabel: manifest?.singularLabel || void 0
        }
      ) : null
    ] }) : void 0,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      RowActions,
      resource,
      declaredRowActions.join(","),
      manifest?.singularLabel,
      recordActions.map((a) => a.key).join(","),
      notice.onNotice,
      onOpen,
      manifest
    ]
  );
  const Empty = slots?.Empty ?? listSlots?.Empty ?? DefaultEmpty;
  const ErrorState = slots?.ErrorState ?? listSlots?.ErrorState ?? DefaultErrorState;
  const Loading = slots?.Loading ?? listSlots?.Loading ?? DefaultLoading;
  const Pagination = slots?.Pagination ?? listSlots?.Pagination ?? DefaultPagination;
  const controlsRef = useRef3(null);
  const [controlsShown, setControlsShown] = useState3(true);
  useLayoutEffect(() => {
    const el = controlsRef.current;
    if (!el) return;
    const measure = () => setControlsShown(el.offsetHeight > 0);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const rows = query.data?.data ?? [];
  const pagination = useListPagination(
    resource,
    query.data,
    query.isFetching || query.isPlaceholderData
  );
  const showTopPagination = pagination.visible && (paginationPlacement === "top" || paginationPlacement === "both");
  const showBottomPagination = pagination.visible && (paginationPlacement === "bottom" || paginationPlacement === "both");
  const paginationBar = pagination.props ? /* @__PURE__ */ jsx14(Pagination, { ...pagination.props }) : null;
  return /* @__PURE__ */ jsxs13("div", { "data-frame-shell": "list", children: [
    /* @__PURE__ */ jsxs13(
      "div",
      {
        ref: controlsRef,
        "data-frame-list-controls": "",
        style: {
          display: "flex",
          alignItems: "flex-start",
          gap: "1rem",
          marginBottom: controlsShown ? "0.75rem" : 0
        },
        children: [
          collections.length > 1 && SimpleSelect && /* @__PURE__ */ jsx14(
            SimpleSelect,
            {
              "aria-label": "Collection",
              value: selectedCollection,
              options: collections.map(({ stem, label }) => ({ value: stem, label })),
              onValueChange: (stem) => setSearchParams((previous) => {
                const next = new URLSearchParams(previous);
                next.set("collection", stem);
                for (const key of [...next.keys()]) {
                  if (key === "page" || key === "cursor" || key === "sort" || key === "filterVariant" || key.startsWith("filter[")) {
                    next.delete(key);
                  }
                }
                return next;
              })
            }
          ),
          /* @__PURE__ */ jsx14("div", { style: { flex: 1, minWidth: 0 }, children: FiltersSlot ? /* @__PURE__ */ jsx14(FiltersSlot, {}) : /* @__PURE__ */ jsx14(ListFilters, { ...filters }) }),
          /* @__PURE__ */ jsx14(
            ResourceActionBar,
            {
              resource,
              manifest,
              onNavigate: navigate,
              onNotice: notice.onNotice
            }
          ),
          /* @__PURE__ */ jsx14(
            Toolbar,
            {
              resource,
              canCreate,
              framesCreate,
              singularLabel: manifest?.singularLabel || void 0,
              onNew: onOpen ? () => onOpen({ id: null }) : void 0
            }
          )
        ]
      }
    ),
    notice.element,
    query.isLoading ? /* @__PURE__ */ jsx14(Loading, {}) : query.isError ? (
      // BEFORE `rows.length === 0`, not after: a failed read also has zero rows, so
      // ordering these the other way is exactly the bug this branch exists to end —
      // every 5xx on every Frame list rendered as "No records." (api-surface-coherence 107).
      /* @__PURE__ */ jsx14(ErrorState, { error: query.error, retry: () => void query.refetch() })
    ) : /* @__PURE__ */ jsxs13(Fragment5, { children: [
      (showTopPagination || rows.length === 0 && showBottomPagination) && /* @__PURE__ */ jsx14("div", { className: "mb-3", children: paginationBar }),
      rows.length === 0 ? /* @__PURE__ */ jsx14(Empty, {}) : cardsPath && manifest ? /* @__PURE__ */ jsx14(
        Cards,
        {
          resource,
          rows,
          manifest,
          schema: rootSchema,
          onOpen,
          Card: BoundCard
        }
      ) : /* @__PURE__ */ jsx14(
        Table,
        {
          columns: resolvedColumns,
          rows,
          onOpen,
          Cell,
          RowActions: BoundRowActions,
          sort: {
            // Column headers and the facets-bar Sort control share ONE
            // `sort` param — the shadcn Table slot renders click-to-sort
            // headers for any column whose `sortField` the resource lists.
            sort: filters.sort,
            onSortChange: filters.onSortChange,
            sortableFields: filters.sortableFields
          }
        }
      ),
      showBottomPagination && rows.length > 0 && paginationBar
    ] })
  ] });
}
function withEditableCells(resolved, manifest, schema, registry, onCellCommit) {
  if (!manifest) return resolved;
  const properties = schema?.properties ?? {};
  return resolved.map((col) => {
    if (col.cell && col.cellSource !== "declared") return col;
    const byCtx = manifest.byNode[col.field];
    const rowCell = byCtx?.["row-cell"];
    if (!rowCell?.participates) return col;
    const edit = byCtx?.edit;
    const node = properties[col.field] ?? { type: "string" };
    return {
      ...col,
      cell: (record) => /* @__PURE__ */ jsx14(
        EditableCell,
        {
          node,
          rowCell,
          edit,
          value: getPath(record, col.field),
          registry,
          onCommit: (value) => onCellCommit?.(record, col.field, value)
        }
      )
    };
  });
}

// src/shadcn/list-slots.tsx
import { useId as useId3 } from "react";
import { parseSort, serializeSort, sortStateFor, toggleSortKey } from "@schemastud/facets";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useIsMobile } from "@schemastud/ui";
import { Fragment as Fragment6, jsx as jsx15, jsxs as jsxs14 } from "react/jsx-runtime";
function ShadcnTable(props) {
  const { columns, rows, onOpen, Cell, RowActions, sort, rowSelected } = props;
  const isMobile = useIsMobile();
  const uid = useId3();
  if (isMobile) {
    const [first, ...rest] = columns;
    const showOpen = Boolean(onOpen) && !rowSelected;
    return /* @__PURE__ */ jsx15("ul", { "data-frame-slot": "Table", "data-frame-stacked": true, className: "space-y-2", children: rows.map((row, i) => {
      const selected = rowSelected?.(row);
      return /* @__PURE__ */ jsxs14(
        "li",
        {
          "data-frame-row": true,
          ...selectedAttrs(selected, "card"),
          onClick: () => onOpen?.(row),
          className: `min-w-0 space-y-2.5 rounded-lg border p-3 text-sm ${selected ? SELECTED_CARD : "border-border bg-card"} ${onOpen ? "cursor-pointer hover:bg-muted/40" : ""}`,
          children: [
            first ? /* @__PURE__ */ jsx15("div", { id: `${uid}-row-${i}`, className: "min-w-0 font-medium text-foreground", children: /* @__PURE__ */ jsx15(Cell, { column: first, record: row }) }) : null,
            rest.length > 0 ? /* @__PURE__ */ jsx15("dl", { className: "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 text-[12.5px]", children: rest.map((c) => /* @__PURE__ */ jsxs14("div", { className: "contents", children: [
              /* @__PURE__ */ jsx15("dt", { className: "text-muted-foreground", children: c.header ?? c.field }),
              /* @__PURE__ */ jsx15("dd", { className: "min-w-0 text-foreground/90", children: /* @__PURE__ */ jsx15(Cell, { column: c, record: row }) })
            ] }, c.field)) }) : null,
            showOpen || RowActions ? /* @__PURE__ */ jsxs14("div", { className: "flex flex-wrap items-center justify-end gap-1.5 border-t border-border pt-2", children: [
              showOpen ? (
                // The record's own open control (review-r1 recheck): a native button named "Open
                // <heading>", a sibling of the row actions. A pointer may still open from anywhere.
                /* @__PURE__ */ jsx15(
                  "button",
                  {
                    type: "button",
                    id: `${uid}-open-${i}`,
                    "aria-labelledby": `${uid}-open-${i} ${uid}-row-${i}`,
                    className: "mr-auto rounded px-2 py-1 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    onClick: (e) => {
                      e.stopPropagation();
                      onOpen?.(row);
                    },
                    children: "Open"
                  }
                )
              ) : null,
              RowActions ? /* @__PURE__ */ jsx15("div", { className: "flex flex-wrap items-center gap-1.5", onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ jsx15(RowActions, { record: row }) }) : null
            ] }) : null
          ]
        },
        row.id ?? i
      );
    }) });
  }
  return /* @__PURE__ */ jsx15(
    "div",
    {
      "data-frame-slot": "Table",
      className: "overflow-x-auto rounded-lg border border-border bg-card",
      children: /* @__PURE__ */ jsxs14("table", { className: "w-full border-collapse text-left text-sm", children: [
        /* @__PURE__ */ jsx15("thead", { children: /* @__PURE__ */ jsxs14("tr", { className: "border-b border-border bg-muted/40 text-[11px] tracking-[0.12em] text-muted-foreground uppercase", children: [
          columns.map((c) => /* @__PURE__ */ jsx15(ShadcnHeaderCell, { column: c, sort }, c.field)),
          RowActions ? /* @__PURE__ */ jsx15("th", { className: "px-4 py-3" }) : null
        ] }) }),
        /* @__PURE__ */ jsx15("tbody", { children: rows.map((row, i) => {
          const selected = rowSelected?.(row);
          return /* @__PURE__ */ jsxs14(
            "tr",
            {
              "data-frame-row": true,
              ...selectedAttrs(selected),
              onClick: () => onOpen?.(row),
              className: `border-b border-border/60 last:border-0 ${selected ? SELECTED_ROW : ""} ${onOpen ? "cursor-pointer hover:bg-muted/40" : ""}`,
              children: [
                columns.map((c) => /* @__PURE__ */ jsx15(
                  "td",
                  {
                    className: "px-4 py-3 align-middle text-foreground/90",
                    children: /* @__PURE__ */ jsx15(Cell, { column: c, record: row })
                  },
                  c.field
                )),
                RowActions ? /* @__PURE__ */ jsx15(
                  "td",
                  {
                    className: "px-4 py-3 text-right",
                    onClick: (e) => e.stopPropagation(),
                    children: /* @__PURE__ */ jsx15(RowActions, { record: row })
                  }
                ) : null
              ]
            },
            row.id ?? i
          );
        }) })
      ] })
    }
  );
}
var SELECTED_ROW = "bg-primary/[0.07] hover:bg-primary/[0.1]";
var SELECTED_CARD = "border-primary/40 bg-primary/[0.07]";
function selectedAttrs(selected, element = "row") {
  if (selected === void 0) return {};
  return {
    ...element === "row" ? { "aria-selected": selected } : {},
    ...selected ? { "data-selected": "" } : {}
  };
}
function ShadcnHeaderCell(props) {
  const { column, sort } = props;
  const label = column.header ?? column.field;
  const sortable = Boolean(sort) && Boolean(column.sortField) && sort.sortableFields.has(column.sortField);
  const control = column.headerControl?.();
  if (!sortable) {
    return /* @__PURE__ */ jsx15("th", { className: "px-4 py-3 font-medium", children: control ? /* @__PURE__ */ jsxs14("span", { className: "inline-flex items-center gap-3", children: [
      control,
      /* @__PURE__ */ jsx15("span", { children: label })
    ] }) : label });
  }
  const keys = parseSort(sort.sort);
  const state = sortStateFor(keys, column.sortField);
  const multi = keys.length > 1;
  const onClick = (event) => {
    sort.onSortChange(serializeSort(toggleSortKey(keys, column.sortField, event.shiftKey)));
  };
  return /* @__PURE__ */ jsxs14("th", { className: "px-4 py-3 font-medium", children: [
    control ? /* @__PURE__ */ jsx15("span", { className: "mr-3 inline-flex align-middle", children: control }) : null,
    /* @__PURE__ */ jsxs14(
      "button",
      {
        type: "button",
        onClick,
        "aria-sort": state.active ? state.desc ? "descending" : "ascending" : "none",
        title: "Click to sort; shift-click to add a secondary sort",
        className: `group -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 uppercase hover:bg-muted ${state.active ? "text-foreground" : ""}`,
        children: [
          /* @__PURE__ */ jsx15("span", { children: label }),
          state.active ? state.desc ? /* @__PURE__ */ jsx15(ArrowDown, { className: "size-3" }) : /* @__PURE__ */ jsx15(ArrowUp, { className: "size-3" }) : /* @__PURE__ */ jsx15(ChevronsUpDown, { className: "size-3 opacity-0 transition-opacity group-hover:opacity-60" }),
          state.active && multi ? /* @__PURE__ */ jsx15("span", { className: "rounded bg-muted px-1 text-[10px] leading-4 tabular-nums text-muted-foreground", children: state.index + 1 }) : null
        ]
      }
    )
  ] });
}
function ShadcnCell(props) {
  if (props.column.cell) return /* @__PURE__ */ jsx15(Fragment6, { children: props.column.cell(props.record) });
  const value = getPath(props.record, props.column.field);
  if (value === null || value === void 0 || value === "") {
    return /* @__PURE__ */ jsx15("span", { className: "text-muted-foreground", children: "\u2014" });
  }
  if (typeof value === "boolean") {
    return /* @__PURE__ */ jsx15("span", { className: value ? "text-primary" : "text-muted-foreground", children: value ? "Yes" : "No" });
  }
  return /* @__PURE__ */ jsx15(DefaultCell, { ...props });
}
function ShadcnEmpty() {
  return /* @__PURE__ */ jsx15(
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
  const { Button: Button2 } = primitives;
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : null;
  return /* @__PURE__ */ jsxs14(
    "div",
    {
      "data-frame-slot": "ErrorState",
      role: "alert",
      className: "rounded-lg border border-destructive/40 bg-destructive/5 px-6 py-12 text-center text-sm",
      children: [
        /* @__PURE__ */ jsx15("div", { className: "font-medium text-destructive", children: "Could not load this list." }),
        message ? /* @__PURE__ */ jsx15("div", { className: "mt-2 text-muted-foreground", children: message }) : null,
        /* @__PURE__ */ jsx15(Button2, { type: "button", size: "sm", variant: "outline", className: "mt-4", onClick: retry, children: "Retry" })
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
  const { Button: Button2 } = primitives;
  if (!canCreate || !framesCreate) return null;
  return /* @__PURE__ */ jsx15("div", { "data-frame-slot": "Toolbar", className: "flex justify-end", children: /* @__PURE__ */ jsxs14(Button2, { type: "button", size: "sm", onClick: onNew, "data-frame-action": "new", children: [
    "New ",
    createNoun(resource, singularLabel)
  ] }) });
}
function ShadcnPagination(props) {
  const {
    primitives: { Button: Button2, SimpleSelect }
  } = useFrameInjection();
  const lastPage = props.mode === "offset" ? Math.max(1, Math.ceil(props.total / props.perPage)) : 1;
  const options = props.perPageOptions ?? [10, 25, 50, 100];
  return /* @__PURE__ */ jsxs14(
    "div",
    {
      "data-frame-slot": "Pagination",
      className: "mt-3 flex flex-wrap items-center justify-between gap-2 text-sm",
      children: [
        /* @__PURE__ */ jsxs14("div", { className: "flex items-center gap-2 text-muted-foreground", children: [
          props.mode === "offset" && /* @__PURE__ */ jsxs14("span", { children: [
            "Page ",
            props.page,
            " of ",
            lastPage,
            " \xB7 ",
            props.total,
            " total"
          ] }),
          props.onPerPageChange && SimpleSelect && /* @__PURE__ */ jsxs14("span", { className: "flex items-center gap-1.5", children: [
            props.mode === "offset" && /* @__PURE__ */ jsx15("span", { "aria-hidden": true, children: "\xB7" }),
            /* @__PURE__ */ jsx15("span", { children: "Rows" }),
            /* @__PURE__ */ jsx15(
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
        /* @__PURE__ */ jsxs14("div", { className: "flex gap-2", children: [
          props.mode === "cursor" && /* @__PURE__ */ jsx15(
            Button2,
            {
              type: "button",
              size: "sm",
              variant: "outline",
              disabled: props.disabled || props.isFirst,
              onClick: props.onFirst,
              children: "First"
            }
          ),
          /* @__PURE__ */ jsx15(
            Button2,
            {
              type: "button",
              size: "sm",
              variant: "outline",
              disabled: props.disabled || (props.mode === "offset" ? props.page <= 1 : !props.hasPrevious),
              onClick: () => props.mode === "offset" ? props.onPageChange(props.page - 1) : props.onPrevious(),
              children: "\u2039 Prev"
            }
          ),
          /* @__PURE__ */ jsx15(
            Button2,
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

// src/resource-picker/placement.ts
var KIND_PLACEMENTS = {
  nav: { scope: "framed", density: "compact", select: "single", orientation: "horizontal" },
  field: { scope: "all", density: "compact", select: "single", orientation: "horizontal" },
  filters: { scope: "filterable", density: "compact", select: "single", orientation: "vertical" },
  seeder: { scope: "writable", density: "expanded", select: "multi", orientation: "vertical" },
  catalog: { scope: "all", density: "expanded", select: "single", orientation: "vertical" }
};
var RECORD_PLACEMENTS = {
  field: { density: "compact", select: "single" },
  attach: { density: "compact", select: "multi" },
  bulk: { density: "expanded", select: "multi" },
  dynamic: { density: "expanded", select: "set" }
};
var KIND_VARIANT_FOR = {
  expanded: "palette",
  compact: "rail"
};
function resolveKindPlacement(placement = "field", overrides = {}) {
  const preset = KIND_PLACEMENTS[placement] ?? KIND_PLACEMENTS.field;
  const density = overrides.density ?? preset.density;
  return {
    scope: overrides.scope ?? preset.scope,
    density,
    select: overrides.select ?? preset.select,
    orientation: overrides.orientation ?? preset.orientation,
    variant: overrides.variant ?? KIND_VARIANT_FOR[density]
  };
}
function resolveRecordPlacement(placement = "field", overrides = {}) {
  const preset = RECORD_PLACEMENTS[placement] ?? RECORD_PLACEMENTS.field;
  return { density: overrides.density ?? preset.density, select: overrides.select ?? preset.select };
}

// src/resource-picker/selection.ts
function addressOf(address = {}) {
  return {
    ...address.collection ? { collection: address.collection } : {},
    ...address.filterVariant ? { filterVariant: address.filterVariant } : {}
  };
}
var EMPTY_SELECTION = Object.freeze({ mode: "ids", ids: [] });
function selectAllMatching(filter, sort, address) {
  return { mode: "set", filter: { ...filter }, sort, exclude: [], ...addressOf(address) };
}
function isPicked(selection, id) {
  return selection.mode === "set" ? !selection.exclude.includes(id) : selection.ids.includes(id);
}
function togglePick(selection, id, select) {
  if (selection.mode === "set") {
    return {
      ...selection,
      exclude: selection.exclude.includes(id) ? selection.exclude.filter((x) => x !== id) : [...selection.exclude, id]
    };
  }
  if (select === "single") return { mode: "ids", ids: selection.ids[0] === id ? [] : [id] };
  return {
    mode: "ids",
    ids: selection.ids.includes(id) ? selection.ids.filter((x) => x !== id) : [...selection.ids, id]
  };
}
function pageState(selection, pageIds) {
  if (pageIds.length === 0) return "none";
  const on = pageIds.filter((id) => isPicked(selection, id)).length;
  return on === 0 ? "none" : on === pageIds.length ? "all" : "some";
}
function setPagePicked(selection, pageIds, picked) {
  const page = new Set(pageIds);
  if (selection.mode === "set") {
    const rest2 = selection.exclude.filter((id) => !page.has(id));
    return { ...selection, exclude: picked ? rest2 : [...rest2, ...pageIds] };
  }
  const rest = selection.ids.filter((id) => !page.has(id));
  return { mode: "ids", ids: picked ? [...rest, ...pageIds] : rest };
}
function followFilters(selection, filter, sort, address) {
  if (selection.mode !== "set") return selection;
  const next = addressOf(address);
  if (sameFilter(selection.filter, filter) && selection.sort === sort && (address === void 0 || selection.collection === next.collection && selection.filterVariant === next.filterVariant)) {
    return selection;
  }
  const { collection: _c, filterVariant: _v, ...rest } = selection;
  return { ...address === void 0 ? selection : rest, filter: { ...filter }, sort, ...address === void 0 ? {} : next };
}
function sameFilter(a, b) {
  const ka = Object.keys(a).filter((k) => a[k] !== "");
  const kb = Object.keys(b).filter((k) => b[k] !== "");
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
}
function isEmptySelection(selection) {
  return selection.mode === "ids" && selection.ids.length === 0;
}
function selectionCount(selection, total, liveExcluded = 0) {
  if (selection.mode === "ids") return { count: selection.ids.length, exact: true };
  if (total === null) return { count: null, exact: false };
  return {
    count: Math.max(0, total - liveExcluded),
    exact: liveExcluded >= selection.exclude.length
  };
}
function selectionToSearch(selection) {
  if (selection.mode !== "set") return "";
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(selection.filter)) {
    if (value !== "") params.set(`filter[${name}]`, value);
  }
  if (selection.sort) params.set("sort", selection.sort);
  if (selection.collection) params.set("collection", selection.collection);
  if (selection.filterVariant) params.set("filterVariant", selection.filterVariant);
  return params.toString();
}
function selectionFromValue(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const bag = value;
    if (bag.mode === "set") {
      return {
        mode: "set",
        filter: { ...bag.filter ?? {} },
        sort: bag.sort ?? null,
        exclude: Array.isArray(bag.exclude) ? bag.exclude.map(String) : [],
        ...addressOf({ collection: bag.collection, filterVariant: bag.filterVariant })
      };
    }
    if (bag.mode === "ids") return { mode: "ids", ids: Array.isArray(bag.ids) ? bag.ids.map(String) : [] };
  }
  if (Array.isArray(value)) return { mode: "ids", ids: value.map(String) };
  if (value === null || value === void 0 || value === "") return EMPTY_SELECTION;
  return { mode: "ids", ids: [String(value)] };
}
function selectionToValue(selection, select) {
  if (select === "set") return selection;
  if (selection.mode === "set") return selection;
  if (select === "single") return selection.ids[0];
  return selection.ids;
}

// src/resource-picker/RecordPicker.tsx
import { Fragment as Fragment7, jsx as jsx16, jsxs as jsxs15 } from "react/jsx-runtime";
var nf = new Intl.NumberFormat("en-US");
var fmt = (n) => nf.format(n);
function nounFor(props, manifest) {
  if (props.noun) return props.noun;
  const one = manifest?.singularLabel || props.resource.replace(/[-_]/g, " ").replace(/s$/, "");
  const many = props.resource.replace(/[-_]/g, " ");
  return [one.toLowerCase(), many.toLowerCase()];
}
function createMemoryUrlState(initial = "", fixed = {}) {
  const enforce = (params) => {
    for (const [key, value] of Object.entries(fixed)) params.set(key, value);
    return params;
  };
  let current = enforce(new URLSearchParams(initial));
  const listeners = /* @__PURE__ */ new Set();
  const snapshot = () => current;
  const subscribe = (notify) => {
    listeners.add(notify);
    return () => {
      listeners.delete(notify);
    };
  };
  return function useMemoryUrlState() {
    const params = useSyncExternalStore(subscribe, snapshot, snapshot);
    return [
      params,
      (updater) => {
        current = enforce(updater(new URLSearchParams(current)));
        listeners.forEach((notify) => notify());
      }
    ];
  };
}
function pickerManifest(manifest) {
  if (!manifest) return void 0;
  const byNode = {};
  for (const [key, byCtx] of Object.entries(manifest.byNode)) {
    const { "row-cell": _rowCell, "list-item": _listItem, ...rest } = byCtx;
    byNode[key] = rest;
  }
  return { ...manifest, byNode, actions: [], createAffordance: "host" };
}
function EnsureQueryClient({ children }) {
  const existing = useContext3(QueryClientContext);
  const [own] = useState4(
    () => existing ? null : new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } })
  );
  if (existing || !own) return /* @__PURE__ */ jsx16(Fragment7, { children });
  return /* @__PURE__ */ jsx16(QueryClientProvider, { client: own, children });
}
function PickerScope({ children, initialSearch, fixed }) {
  const outer = useFrameInjection();
  const [useUrlState] = useState4(() => createMemoryUrlState(initialSearch, fixed));
  const injection = useMemo4(
    () => ({
      ...outer,
      useUrlState,
      can: (action, resource, record) => (action === "viewAny" || action === "view") && outer.can(action, resource, record),
      listSlots: { ...shadcnListSlots, ...outer.listSlots, Table: PickTable, RowActions: void 0 }
    }),
    [outer, useUrlState]
  );
  return /* @__PURE__ */ jsx16(EnsureQueryClient, { children: /* @__PURE__ */ jsx16(FrameProvider, { value: injection, children }) });
}
var PickContext = createContext(null);
function usePick() {
  const ctx = useContext3(PickContext);
  if (!ctx) throw new Error("@schemastud/frame: a pick cell rendered outside a ResourcePicker.");
  return ctx;
}
var idOf = (row, valueField) => String(row[valueField] ?? row.id);
function PickTable(props) {
  const isMobile = useIsMobile2();
  const pick = usePick();
  const columns = isMobile ? props.columns.slice(0, 3) : props.columns;
  return /* @__PURE__ */ jsx16(
    ShadcnTable,
    {
      ...props,
      columns,
      RowActions: void 0,
      onOpen: pick.disabled ? void 0 : pick.onToggle,
      rowSelected: (row) => isPicked(pick.selection, idOf(row, pick.valueField))
    }
  );
}
function PickCell({ row, field }) {
  const { select, selection, onToggle, valueField, labelField, disabled } = usePick();
  const id = idOf(row, valueField);
  const on = isPicked(selection, id);
  const name = String(row[labelField] ?? row[field] ?? id);
  return /* @__PURE__ */ jsxs15(
    "label",
    {
      className: "flex min-w-0 cursor-pointer items-center gap-3",
      onClick: (e) => e.stopPropagation(),
      children: [
        /* @__PURE__ */ jsx16(
          "input",
          {
            type: select === "single" ? "radio" : "checkbox",
            checked: on,
            disabled,
            onChange: () => onToggle(row),
            "aria-label": `${on ? "Deselect" : "Select"} ${name}`,
            className: "size-5 shrink-0 accent-[var(--primary)] sm:size-4"
          }
        ),
        /* @__PURE__ */ jsx16("span", { className: cn("min-w-0 truncate", on ? "font-medium text-foreground" : "text-foreground"), children: String(row[field] ?? "\u2014") })
      ]
    }
  );
}
function PageCheckbox() {
  const { selection, rows, valueField, onPage, disabled, noun } = usePick();
  const state = pageState(selection, rows.map((r) => idOf(r, valueField)));
  const ref = useRef4(null);
  useEffect3(() => {
    if (ref.current) ref.current.indeterminate = state === "some";
  }, [state]);
  return /* @__PURE__ */ jsx16(
    "input",
    {
      ref,
      type: "checkbox",
      checked: state === "all",
      disabled: disabled || rows.length === 0,
      onChange: () => onPage(rows, state !== "all"),
      "aria-checked": state === "some" ? "mixed" : state === "all",
      "aria-label": state === "all" ? `Deselect all ${noun[1]} on this page` : `Select all ${noun[1]} on this page`,
      className: "size-4 shrink-0 accent-[var(--primary)]"
    }
  );
}
function pickColumns(manifest, labelField, select, host = []) {
  const listed = manifest ? Object.entries(manifest.byNode).filter(([key, byCtx]) => key !== "" && byCtx["list-column"]?.participates).sort(([, a], [, b]) => (a["list-column"]?.sort ?? Infinity) - (b["list-column"]?.sort ?? Infinity)).map(([key]) => key) : [labelField];
  const field = listed.includes(labelField) ? labelField : listed[0] ?? labelField;
  const others = host.filter((c) => c.field !== field);
  const own = host.find((c) => c.field === field);
  return [
    {
      ...own,
      field,
      ...manifest ? {} : { header: own?.header ?? "Name" },
      cell: (row) => /* @__PURE__ */ jsx16(PickCell, { row, field }),
      ...select === "single" ? {} : { headerControl: () => /* @__PURE__ */ jsx16(PageCheckbox, {}) }
    },
    ...others
  ];
}
function filterKeyOf(filter) {
  return JSON.stringify(Object.entries(filter).filter(([, v]) => v !== "").sort());
}
function SelectionBar({
  select,
  selection,
  onChange,
  noun,
  rows,
  total,
  liveExcluded,
  filterValues,
  sort,
  isLoading,
  isError,
  retry,
  describeFilter,
  disabled,
  address,
  allowSet
}) {
  const [undo, setUndo] = useState4(null);
  const isSet = selection.mode === "set";
  const { count, exact } = selectionCount(selection, total, liveExcluded);
  const n = count ?? 0;
  const plural = (k) => k === 1 ? noun[0] : noun[1];
  if (isError) {
    return /* @__PURE__ */ jsxs15("div", { role: "alert", className: "flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm", children: [
      /* @__PURE__ */ jsxs15("span", { className: "min-w-0 flex-1", children: [
        "Couldn\u2019t load ",
        noun[1],
        ". Your selection is kept."
      ] }),
      /* @__PURE__ */ jsx16(Button, { type: "button", variant: "outline", size: "sm", onClick: retry, children: "Try again" })
    ] });
  }
  const clear = () => {
    setUndo(selection);
    onChange(EMPTY_SELECTION);
  };
  const excluded = isSet ? selection.exclude.length : 0;
  return /* @__PURE__ */ jsxs15(
    "div",
    {
      role: "status",
      "aria-live": "polite",
      "data-picker-bar": true,
      className: cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2 text-sm",
        isSet || n > 0 ? "border-primary/30 bg-primary/[0.06]" : "border-border bg-card"
      ),
      children: [
        /* @__PURE__ */ jsx16("span", { className: "min-w-0 flex-1 basis-full sm:basis-auto", children: isSet ? /* @__PURE__ */ jsxs15(Fragment7, { children: [
          /* @__PURE__ */ jsx16("span", { className: "mr-1.5 inline-flex h-5 items-center rounded bg-primary px-1.5 align-[1px] text-xs font-medium text-primary-foreground", children: select === "set" ? "Dynamic" : "All matching" }),
          /* @__PURE__ */ jsxs15("b", { children: [
            "Every ",
            noun[0],
            describeFilter ? " matching these filters" : ""
          ] }),
          excluded > 0 ? /* @__PURE__ */ jsxs15(Fragment7, { children: [
            " except ",
            fmt(excluded)
          ] }) : null,
          count !== null ? /* @__PURE__ */ jsxs15("span", { className: "text-muted-foreground tabular-nums", children: [
            " ",
            "\xB7 ",
            exact ? "" : "up to ",
            fmt(n),
            " today"
          ] }) : null,
          /* @__PURE__ */ jsxs15("span", { className: "block text-xs text-muted-foreground", children: [
            describeFilter || `All ${noun[1]}`,
            select === "set" ? " \u2014 new matches join when it runs." : " \u2014 counted again when the action runs."
          ] })
        ] }) : n > 0 ? /* @__PURE__ */ jsxs15(Fragment7, { children: [
          /* @__PURE__ */ jsx16("b", { className: "tabular-nums", children: fmt(n) }),
          " ",
          plural(n),
          " selected",
          total !== null ? /* @__PURE__ */ jsxs15("span", { className: "text-muted-foreground tabular-nums", children: [
            " \xB7 ",
            fmt(total),
            " matching"
          ] }) : null
        ] }) : undo ? /* @__PURE__ */ jsxs15("span", { children: [
          "Selection cleared.",
          " ",
          /* @__PURE__ */ jsx16(
            "button",
            {
              type: "button",
              disabled,
              className: "font-medium text-primary underline-offset-2 hover:underline",
              onClick: () => {
                if (disabled) return;
                onChange(undo);
                setUndo(null);
              },
              children: "Undo"
            }
          )
        ] }) : /* @__PURE__ */ jsx16("span", { className: "text-muted-foreground", children: isLoading ? "Loading\u2026" : `${total !== null ? `${fmt(total)} ` : ""}${plural(total ?? 2)} match. ${select === "single" ? "Choose one." : "Tick rows, or take the whole result."}` }) }),
        allowSet && select !== "single" && !isSet && total !== null && total > rows.length ? /* @__PURE__ */ jsxs15(
          Button,
          {
            type: "button",
            variant: "outline",
            size: "sm",
            disabled,
            onClick: () => {
              setUndo(null);
              onChange(selectAllMatching(filterValues, sort, address));
            },
            children: [
              "Select all ",
              fmt(total),
              " matching"
            ]
          }
        ) : null,
        select !== "set" && (isSet || n > 0) ? /* @__PURE__ */ jsx16(Button, { type: "button", variant: "ghost", size: "sm", disabled, onClick: clear, children: "Clear" }) : null
      ]
    }
  );
}
function Tray({
  selection,
  onChange,
  labels,
  select,
  noun,
  disabled
}) {
  const isMobile = useIsMobile2();
  const [expanded, setExpanded] = useState4(false);
  const ids = selection.mode === "set" ? selection.exclude : selection.ids;
  if (ids.length === 0 || select === "single") return null;
  const cap = expanded ? ids.length : isMobile ? 2 : 8;
  const isSet = selection.mode === "set";
  return /* @__PURE__ */ jsxs15("div", { className: "flex min-w-0 flex-wrap items-center gap-1.5 text-xs", "aria-label": isSet ? `Excluded ${noun[1]}` : `Picked ${noun[1]}`, role: "group", children: [
    /* @__PURE__ */ jsx16("span", { className: "text-muted-foreground", children: isSet ? "Excluded:" : "Picked:" }),
    ids.slice(0, cap).map((id) => {
      const name = labels.get(id) ?? id;
      return /* @__PURE__ */ jsxs15(
        "span",
        {
          className: cn(
            "inline-flex h-6 max-w-56 min-w-0 items-center gap-1 rounded-md border border-border bg-card pr-0.5 pl-2",
            isSet && "line-through decoration-foreground/40"
          ),
          children: [
            /* @__PURE__ */ jsx16("span", { className: "truncate", children: name }),
            /* @__PURE__ */ jsx16(
              "button",
              {
                type: "button",
                disabled,
                "aria-label": isSet ? `Include ${name} again` : `Remove ${name}`,
                onClick: () => {
                  if (!disabled) onChange(togglePick(selection, id, "multi"));
                },
                className: "grid size-7 place-items-center rounded sm:size-5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                children: /* @__PURE__ */ jsx16(X, { className: "size-3" })
              }
            )
          ]
        },
        id
      );
    }),
    ids.length > cap ? /* @__PURE__ */ jsxs15("button", { type: "button", className: "text-muted-foreground underline-offset-2 hover:underline", onClick: () => setExpanded(true), children: [
      "+",
      ids.length - cap,
      " more"
    ] }) : null
  ] });
}
function BrowseBody(body) {
  const { props, select, selection, onChange, labels, manifest, noun, valueField, labelField } = body;
  const { useUrlState } = useFrameInjection();
  const [urlParams] = useUrlState();
  const collections = manifest?.collections ?? [];
  const requested = urlParams.get("collection");
  const collection = collections.find((c) => c.stem === requested)?.stem ?? collections[0]?.stem;
  const filters = useListFilters2(
    props.resource,
    collection
  );
  const requestParams = collection ? { ...filters.requestParams, collection } : filters.requestParams;
  const page = useResourceList(props.resource, requestParams);
  const data = page.data;
  const rows = data?.data ?? [];
  const total = data && "total" in data ? data.total : null;
  const address = { collection: collection ?? null, filterVariant: filters.filterVariant };
  const filterKey = `${filterKeyOf(filters.filterValues)}|${collection ?? ""}|${filters.filterVariant ?? ""}`;
  const seen = useRef4(/* @__PURE__ */ new Map());
  if (rows.length > 0 && !page.isPlaceholderData) {
    const bucket = seen.current.get(filterKey) ?? /* @__PURE__ */ new Set();
    rows.forEach((r) => bucket.add(idOf(r, valueField)));
    seen.current.set(filterKey, bucket);
  }
  rows.forEach((r) => labels.set(idOf(r, valueField), String(r[labelField] ?? idOf(r, valueField))));
  const liveExcluded = selection.mode === "set" ? selection.exclude.filter((id) => seen.current.get(filterKey)?.has(id)).length : 0;
  const named = selectionCount(selection, total, liveExcluded).count;
  useEffect3(() => {
    body.onCount?.(named);
  }, [named]);
  useEffect3(() => {
    const next = followFilters(selection, filters.filterValues, filters.sort, address);
    if (next !== selection) onChange(next);
  }, [filterKey, filters.sort]);
  const onToggle = useCallback2(
    (row) => {
      if (props.disabled) return;
      const id = idOf(row, valueField);
      labels.set(id, String(row[labelField] ?? id));
      onChange(togglePick(selection, id, select));
    },
    [props.disabled, valueField, labelField, labels, onChange, selection, select]
  );
  const onPage = useCallback2(
    (pageRows, picked) => {
      if (props.disabled) return;
      const ids = pageRows.map((r) => idOf(r, valueField));
      onChange(setPagePicked(selection, ids, picked));
    },
    [props.disabled, valueField, onChange, selection]
  );
  const columns = useMemo4(
    () => pickColumns(manifest, labelField, select, props.columns),
    [manifest, labelField, select, props.columns]
  );
  const shellManifest = useMemo4(() => pickerManifest(manifest), [manifest]);
  const describeFilter = describeFilters(filters.filterValues, filters.schema);
  const ctx = {
    select,
    selection,
    valueField,
    labelField,
    onToggle,
    onPage,
    rows,
    noun,
    disabled: props.disabled
  };
  return /* @__PURE__ */ jsx16(PickContext.Provider, { value: ctx, children: /* @__PURE__ */ jsxs15("div", { className: "min-w-0 space-y-3", "data-resource-picker-browse": "", children: [
    /* @__PURE__ */ jsx16(
      SelectionBar,
      {
        select,
        selection,
        onChange,
        noun,
        rows,
        total,
        liveExcluded,
        filterValues: filters.filterValues,
        sort: filters.sort,
        isLoading: page.isLoading,
        isError: page.isError,
        retry: () => void page.refetch(),
        describeFilter,
        disabled: props.disabled,
        address,
        allowSet: select === "set" || props.allowSet !== false
      }
    ),
    /* @__PURE__ */ jsx16(Tray, { selection, onChange, labels, select, noun, disabled: props.disabled }),
    /* @__PURE__ */ jsx16(ListShell, { resource: props.resource, manifest: shellManifest, columns, paginationPlacement: "bottom" })
  ] }) });
}
function describeFilters(values, schema) {
  const props = Object.values(schema?.properties ?? {});
  return Object.entries(values).filter(([, v]) => v).map(([name, v]) => {
    const prop = props.find((p) => p["x-filter"]?.name === name);
    const title = prop?.title ?? name;
    const options = prop?.["x-filter"]?.options;
    const shown = options ? v.split(",").map((x) => options.find((o) => String(o.value) === x)?.label ?? x).join(", ") : `\u201C${v}\u201D`;
    return `${title}: ${shown}`;
  }).join(" \xB7 ");
}
function confirmText(selection, select, noun, count, label) {
  if (label) return label;
  if (selection.mode === "set") {
    if (select === "set") return "Save dynamic set";
    return count === null ? `Use all matching ${noun[1]}` : `Use ${fmt(count)} ${count === 1 ? noun[0] : noun[1]} (all matching)`;
  }
  const n = selection.ids.length;
  return n === 0 ? "Use none" : `Use ${fmt(n)} ${n === 1 ? noun[0] : noun[1]}`;
}
function useDebounced(value, ms = 160) {
  const [v, setV] = useState4(value);
  useEffect3(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
function useTypeahead(resource, params) {
  const { transport } = useFrameInjection();
  const key = JSON.stringify(params);
  const [state, setState] = useState4(
    { rows: [], total: null, loading: true, error: false, key: "" }
  );
  const [attempt, setAttempt] = useState4(0);
  useEffect3(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: false }));
    transport.list(resource, params).then((page) => {
      if (cancelled) return;
      const rows = page?.data ?? [];
      setState({ rows, total: page && "total" in page ? page.total : null, loading: false, error: false, key });
    }).catch(() => {
      if (!cancelled) setState((s) => ({ ...s, loading: false, error: true }));
    });
    return () => {
      cancelled = true;
    };
  }, [transport, resource, key, attempt]);
  return { ...state, retry: () => setAttempt((a) => a + 1) };
}
function TypeaheadResults({
  body,
  onBrowse,
  onPicked,
  autoFocus
}) {
  const { props, select, selection, onChange, labels, noun, valueField, labelField } = body;
  const [q, setQ] = useState4("");
  const dq = useDebounced(q.trim());
  const searchFacet = props.searchFacet ?? "keywords";
  const perPage = props.perPage ?? 8;
  const params = useMemo4(
    () => ({
      ...props.scope ?? {},
      ...dq ? { [`filter[${searchFacet}]`]: dq } : {},
      ...props.defaultSort ? { sort: props.defaultSort } : {},
      per_page: String(perPage)
    }),
    [dq, searchFacet, perPage, props.scope, props.defaultSort]
  );
  const res = useTypeahead(props.resource, params);
  const [active, setActive] = useState4(0);
  const listId = useId4();
  useEffect3(() => setActive(0), [dq]);
  res.rows.forEach((r) => labels.set(idOf(r, valueField), String(r[labelField] ?? idOf(r, valueField))));
  const choose = (row) => {
    if (props.disabled) return;
    const id = idOf(row, valueField);
    labels.set(id, String(row[labelField] ?? id));
    onChange(togglePick(selection, id, select));
    if (select === "single") onPicked();
  };
  const total = res.total;
  const optionId = (row) => `${listId}-${idOf(row, valueField).replace(/[^\w-]/g, "_")}`;
  return /* @__PURE__ */ jsxs15("div", { className: "flex min-h-0 flex-1 flex-col", children: [
    /* @__PURE__ */ jsxs15("div", { className: "flex items-center gap-2 border-b border-border px-3", children: [
      res.loading ? /* @__PURE__ */ jsx16(Loader2, { "aria-hidden": true, className: "size-4 shrink-0 animate-spin text-muted-foreground" }) : /* @__PURE__ */ jsx16(Search, { "aria-hidden": true, className: "size-4 shrink-0 text-muted-foreground" }),
      /* @__PURE__ */ jsx16(
        "input",
        {
          type: "search",
          autoFocus,
          value: q,
          onChange: (e) => setQ(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, res.rows.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && res.rows[active]) {
              e.preventDefault();
              choose(res.rows[active]);
            }
          },
          role: "combobox",
          "aria-label": `Search ${noun[1]}`,
          "aria-expanded": true,
          "aria-controls": listId,
          "aria-autocomplete": "list",
          "aria-activedescendant": res.rows[active] ? optionId(res.rows[active]) : void 0,
          placeholder: `Search ${total !== null && !dq ? `${fmt(total)} ` : ""}${noun[1]}\u2026`,
          className: "h-10 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        }
      )
    ] }),
    /* @__PURE__ */ jsx16(
      "ul",
      {
        id: listId,
        role: "listbox",
        "aria-label": noun[1],
        "aria-multiselectable": select !== "single",
        "aria-busy": res.loading || void 0,
        className: "max-h-72 min-h-0 flex-1 overflow-y-auto overscroll-contain p-1 max-sm:max-h-none",
        children: res.error ? /* @__PURE__ */ jsxs15("li", { role: "presentation", className: "flex items-center justify-between gap-2 px-2 py-4 text-sm", children: [
          "Search failed.",
          /* @__PURE__ */ jsx16(Button, { type: "button", variant: "outline", size: "sm", onClick: res.retry, children: "Try again" })
        ] }) : res.rows.length === 0 && !res.loading ? /* @__PURE__ */ jsx16("li", { role: "presentation", className: "px-2 py-6 text-center text-sm text-muted-foreground", children: dq ? `No ${noun[1]} match \u201C${dq}\u201D. Try fewer words, or browse with filters.` : `No ${noun[1]} yet.` }) : res.rows.map((row, i) => {
          const id = idOf(row, valueField);
          const on = isPicked(selection, id);
          const second = props.describe?.(row);
          return /* @__PURE__ */ jsxs15(
            "li",
            {
              id: optionId(row),
              role: "option",
              "aria-selected": on,
              onMouseEnter: () => setActive(i),
              onClick: () => choose(row),
              className: cn(
                "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                i === active && "bg-muted",
                on && "font-medium"
              ),
              children: [
                /* @__PURE__ */ jsxs15("span", { className: "min-w-0 flex-1", children: [
                  /* @__PURE__ */ jsx16("span", { className: "block truncate", children: String(row[labelField] ?? id) }),
                  second ? /* @__PURE__ */ jsx16("span", { className: "block truncate text-xs text-muted-foreground", children: second }) : null
                ] }),
                /* @__PURE__ */ jsx16(Check, { "aria-hidden": true, className: cn("size-4 shrink-0 text-primary", on ? "opacity-100" : "opacity-0") })
              ]
            },
            id
          );
        })
      }
    ),
    /* @__PURE__ */ jsxs15("div", { className: "flex flex-wrap items-center gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground", children: [
      /* @__PURE__ */ jsxs15("span", { className: "tabular-nums", "aria-live": "polite", children: [
        total === null ? `${res.rows.length} shown` : total > res.rows.length ? `${res.rows.length} of ${fmt(total)}` : `${fmt(total)}`,
        " ",
        dq ? "matching" : "shown"
      ] }),
      /* @__PURE__ */ jsxs15(Button, { type: "button", variant: "ghost", size: "sm", className: "ml-auto gap-1.5", onClick: onBrowse, children: [
        /* @__PURE__ */ jsx16(ListFilter, { "aria-hidden": true, className: "size-3.5" }),
        "Browse all",
        total !== null ? ` ${fmt(total)}` : "",
        " with filters"
      ] })
    ] })
  ] });
}
function BrowseSheet({ body, open, onOpenChange }) {
  const [draft, setDraft] = useState4(body.selection);
  useEffect3(() => {
    if (open) setDraft(body.selection);
  }, [open]);
  const contentRef = useRef4(null);
  const [count, setCount] = useState4(null);
  const { noun, select } = body;
  return /* @__PURE__ */ jsx16(Sheet, { open, onOpenChange, children: /* @__PURE__ */ jsxs15(
    SheetContent,
    {
      side: "right",
      className: "flex w-full flex-col gap-0 p-0 sm:max-w-3xl",
      onOpenAutoFocus: (e) => {
        e.preventDefault();
        const focus = () => contentRef.current?.querySelector("[data-resource-picker-browse] input")?.focus();
        setTimeout(focus, 120);
      },
      children: [
        /* @__PURE__ */ jsxs15(SheetHeader, { className: "border-b border-border px-4 py-3 sm:px-6", children: [
          /* @__PURE__ */ jsx16(SheetTitle, { children: select === "single" ? `Choose a ${noun[0]}` : `Choose ${noun[1]}` }),
          /* @__PURE__ */ jsxs15(SheetDescription, { children: [
            "Filter and sort with the ",
            noun[1],
            " list\u2019s own columns and facets."
          ] })
        ] }),
        /* @__PURE__ */ jsx16("div", { ref: contentRef, className: "min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6", children: /* @__PURE__ */ jsx16(PickerScope, { initialSearch: selectionToSearch(draft), fixed: body.props.scope, children: /* @__PURE__ */ jsx16(BrowseBody, { ...body, selection: draft, onChange: setDraft, onCount: setCount }) }) }),
        /* @__PURE__ */ jsxs15(SheetFooter, { className: "flex-row justify-end gap-2 border-t border-border px-4 py-3 sm:px-6", children: [
          /* @__PURE__ */ jsx16(Button, { type: "button", variant: "ghost", onClick: () => onOpenChange(false), children: "Cancel" }),
          /* @__PURE__ */ jsx16(
            Button,
            {
              type: "button",
              onClick: () => {
                body.onChange(draft);
                onOpenChange(false);
              },
              children: confirmText(draft, select, noun, count)
            }
          )
        ] })
      ]
    }
  ) });
}
function useWarmLabels(resource, ids, valueField, labelField, labels) {
  const { transport } = useFrameInjection();
  const [, force] = useState4(0);
  const missing = valueField === "id" ? ids.filter((id) => !labels.has(id)).slice(0, 8) : [];
  const key = missing.join(",");
  useEffect3(() => {
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(
      missing.map(
        (id) => transport.get(resource, id).then((row) => {
          if (row && row[labelField] != null) labels.set(id, String(row[labelField]));
        }).catch(() => void 0)
      )
    ).then(() => {
      if (!cancelled) force((n) => n + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [transport, resource, key, labelField]);
}
function CompactPicker(body) {
  const { props, select, selection, onChange, labels, noun } = body;
  const isMobile = useIsMobile2();
  const [open, setOpen] = useState4(Boolean(props.defaultOpen));
  const [browse, setBrowse] = useState4(Boolean(props.defaultBrowseOpen));
  useWarmLabels(props.resource, selection.mode === "ids" ? selection.ids : [], body.valueField, body.labelField, labels);
  const n = selection.mode === "ids" ? selection.ids.length : null;
  const summary = selection.mode === "set" ? `Every ${noun[0]} by filter${selection.exclude.length ? `, except ${fmt(selection.exclude.length)}` : ""}` : n === 0 ? null : n === 1 ? labels.get(selection.ids[0]) ?? selection.ids[0] : `${fmt(n)} ${noun[1]}`;
  const placeholder = select === "set" ? `Define a set of ${noun[1]}\u2026` : select === "single" ? `Choose a ${noun[0]}\u2026` : `Add ${noun[1]}\u2026`;
  const openBrowse = () => {
    setOpen(false);
    setBrowse(true);
  };
  const valueId = useId4();
  const trigger = /* @__PURE__ */ jsxs15(
    Button,
    {
      id: props.id,
      type: "button",
      variant: "outline",
      disabled: props.disabled,
      "aria-labelledby": props["aria-labelledby"] ? `${props["aria-labelledby"]} ${valueId}` : void 0,
      "aria-haspopup": "dialog",
      className: "w-full min-w-0 justify-between font-normal sm:w-80",
      onClick: select === "set" ? () => setBrowse(true) : isMobile ? () => setOpen(true) : void 0,
      children: [
        /* @__PURE__ */ jsx16("span", { id: valueId, className: cn("min-w-0 truncate", !summary && "text-muted-foreground"), children: summary ?? placeholder }),
        /* @__PURE__ */ jsx16(ChevronsUpDown2, { "aria-hidden": true, className: "size-4 shrink-0 text-muted-foreground" })
      ]
    }
  );
  return /* @__PURE__ */ jsxs15("div", { className: "min-w-0 space-y-2", "data-resource-picker": "records", "data-density": "compact", children: [
    select === "set" ? trigger : isMobile ? (
      // Phone: a popover under the trigger fits ~3 results and pushes "Browse all" off-screen.
      /* @__PURE__ */ jsxs15(Fragment7, { children: [
        trigger,
        /* @__PURE__ */ jsx16(Sheet, { open, onOpenChange: setOpen, children: /* @__PURE__ */ jsxs15(SheetContent, { side: "bottom", className: "flex h-[85dvh] flex-col gap-0 rounded-t-xl p-0", children: [
          /* @__PURE__ */ jsxs15(SheetHeader, { className: "border-b border-border px-4 py-3", children: [
            /* @__PURE__ */ jsx16(SheetTitle, { children: select === "single" ? `Choose a ${noun[0]}` : `Add ${noun[1]}` }),
            /* @__PURE__ */ jsxs15(SheetDescription, { className: "sr-only", children: [
              "Search ",
              noun[1],
              ", or browse all with filters."
            ] })
          ] }),
          /* @__PURE__ */ jsx16(TypeaheadResults, { body, onPicked: () => setOpen(false), onBrowse: openBrowse })
        ] }) })
      ] })
    ) : /* @__PURE__ */ jsxs15(Popover, { open, onOpenChange: setOpen, children: [
      /* @__PURE__ */ jsx16(PopoverTrigger, { asChild: true, children: trigger }),
      /* @__PURE__ */ jsx16(PopoverContent, { className: "w-[min(26rem,calc(100vw-2rem))] p-0", children: /* @__PURE__ */ jsx16(TypeaheadResults, { body, onPicked: () => setOpen(false), onBrowse: openBrowse, autoFocus: true }) })
    ] }),
    select !== "single" && selection.mode === "ids" && selection.ids.length > 0 ? /* @__PURE__ */ jsx16(Tray, { selection, onChange, labels, select, noun, disabled: props.disabled }) : null,
    /* @__PURE__ */ jsx16(BrowseSheet, { body, open: browse, onOpenChange: setBrowse })
  ] });
}
function ExpandedPicker(body) {
  const { props, select, selection, noun } = body;
  const initial = useMemo4(
    () => selectionToSearch(selection),
    // Seeded once: afterwards the picker's own facets are the source of truth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const empty = isEmptySelection(selection);
  const [count, setCount] = useState4(null);
  return /* @__PURE__ */ jsxs15("div", { className: "min-w-0 space-y-3", "data-resource-picker": "records", "data-density": "expanded", id: props.id, children: [
    /* @__PURE__ */ jsx16(PickerScope, { initialSearch: initial, fixed: props.scope, children: /* @__PURE__ */ jsx16(BrowseBody, { ...body, onCount: setCount }) }),
    props.onConfirm ? /* @__PURE__ */ jsxs15("div", { className: "sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80", children: [
      /* @__PURE__ */ jsx16("span", { className: "mr-auto hidden text-xs text-muted-foreground sm:inline", children: "Picks are kept across pages, filters and sorts." }),
      /* @__PURE__ */ jsx16(Button, { type: "button", disabled: empty || props.disabled, onClick: () => props.onConfirm?.(selection), children: confirmText(selection, select, noun, count, props.confirmLabel) })
    ] }) : null
  ] });
}
function ResourceRecordPicker(props) {
  const injection = useFrameInjection();
  const resolved = resolveRecordPlacement(props.placement, {
    ...props.density ? { density: props.density } : {},
    ...props.select ? { select: props.select } : {}
  });
  const manifest = props.manifest ?? injection.manifestFor?.(props.resource);
  const noun = nounFor(props, manifest);
  const [labels] = useState4(() => /* @__PURE__ */ new Map());
  const selection = resolved.select === "set" && props.value.mode === "ids" ? selectAllMatching({}, null) : props.value;
  const body = {
    props,
    select: resolved.select,
    selection,
    onChange: props.onChange,
    labels,
    manifest,
    noun,
    valueField: props.valueField ?? "id",
    labelField: props.labelField ?? "name"
  };
  return resolved.density === "expanded" ? /* @__PURE__ */ jsx16(ExpandedPicker, { ...body }) : /* @__PURE__ */ jsx16(CompactPicker, { ...body });
}

// src/ResourceRefWidget.tsx
import { jsx as jsx17 } from "react/jsx-runtime";
var SELECT_MODES = ["single", "multi", "set"];
function readResourceRefConfig(schema) {
  const cfg = schema?.[STUD_RESOURCE_REF_KEYWORD];
  if (cfg == null || typeof cfg !== "object") return void 0;
  const bag = cfg;
  if (typeof bag.resource !== "string") return void 0;
  const multiple = bag.multiple === true;
  const select = SELECT_MODES.includes(bag.select) ? bag.select : multiple ? "multi" : "single";
  return {
    resource: bag.resource,
    value: typeof bag.value === "string" ? bag.value : "id",
    label: typeof bag.label === "string" ? bag.label : "name",
    multiple: select !== "single",
    scope: bag.scope ?? void 0,
    select,
    ...typeof bag.searchFacet === "string" ? { searchFacet: bag.searchFacet } : {}
  };
}
function stringifyScope(scope) {
  const out = {};
  if (!scope) return out;
  for (const [k, v] of Object.entries(scope)) {
    out[k] = String(v);
  }
  return out;
}
function ResourceRefWidget(props) {
  widgetFormContext(props);
  const injection = useOptionalFrameInjection();
  const cfg = useMemo5(() => readResourceRefConfig(props.schema), [props.schema]);
  const scopeKey = JSON.stringify(cfg?.scope ?? {});
  const scope = useMemo5(() => stringifyScope(cfg?.scope), [scopeKey]);
  if (!cfg) return null;
  const select = cfg.select ?? "single";
  if (!injection) {
    const isSet = typeof props.value === "object" && props.value !== null && !Array.isArray(props.value);
    const shown = isSet ? "A dynamic set" : Array.isArray(props.value) ? props.value.join(", ") : props.value == null ? "" : String(props.value);
    return /* @__PURE__ */ jsx17(
      "input",
      {
        id: props.id,
        "data-frame-widget": "resource-ref",
        readOnly: true,
        disabled: true,
        value: shown,
        title: "Resource search needs a FrameProvider",
        className: "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
      }
    );
  }
  return /* @__PURE__ */ jsx17("div", { "data-frame-widget": "resource-ref", className: "min-w-0", children: /* @__PURE__ */ jsx17(
    ResourceRecordPicker,
    {
      id: props.id,
      resource: cfg.resource,
      density: "compact",
      select,
      allowSet: select === "set",
      valueField: cfg.value,
      labelField: cfg.label,
      searchFacet: cfg.searchFacet,
      scope,
      disabled: props.disabled || props.readonly,
      value: selectionFromValue(props.value),
      onChange: (next) => props.onChange(selectionToValue(next, select))
    }
  ) });
}
var ResourcePickerWidget = ResourceRefWidget;
function isResourceRefNode(schema) {
  return schema[STUD_RESOURCE_REF_KEYWORD] != null && schema["x-widget"] == null;
}
function registerResourceRefWidget(registry) {
  registry.registerWidget(isResourceRefNode, ResourceRefWidget);
}

// src/context.tsx
import { jsx as jsx18 } from "react/jsx-runtime";
var FrameContext = createContext2(null);
var installedRegistries = /* @__PURE__ */ new WeakSet();
function registerFrameWidgets(registry) {
  ensureBuiltinWidgets(registry);
}
function ensureBuiltinWidgets(registry) {
  if (!registry || typeof registry !== "object" || typeof registry.registerWidget !== "function") {
    return;
  }
  if (installedRegistries.has(registry)) return;
  registerResourceRefWidget(registry);
  installedRegistries.add(registry);
}
function FrameProvider({ value, children }) {
  useMemo6(() => {
    ensureBuiltinWidgets(value.registry);
    ensureBuiltinWidgets(defaultRegistry);
  }, [value.registry]);
  const facetsValue = useMemo6(
    () => ({
      transport: value.transport,
      primitives: value.primitives,
      useUrlState: value.useUrlState,
      can: value.can
    }),
    [value.transport, value.primitives, value.useUrlState, value.can]
  );
  return /* @__PURE__ */ jsx18(FrameContext.Provider, { value, children: /* @__PURE__ */ jsx18(FacetsProvider, { value: facetsValue, children: /* @__PURE__ */ jsx18(WidgetRegistryContext3.Provider, { value: value.registry, children }) }) });
}
function useOptionalFrameInjection() {
  return useContext4(FrameContext);
}
function useFrameInjection() {
  const injection = useContext4(FrameContext);
  if (!injection) {
    throw new Error(
      "@schemastud/frame: no FrameProvider found. Wrap your app in <FrameProvider value={{ transport, primitives, useUrlState, registry, schemaFetcher, can }}>."
    );
  }
  return injection;
}

// src/columnKinds.tsx
import { displayLabel as displayLabel5 } from "@schemastud/seam";
import { jsx as jsx19, jsxs as jsxs16 } from "react/jsx-runtime";
var COLUMN_KINDS = ["text", "badge", "badges", "number", "date"];
var MUTED = "var(--muted-foreground, inherit)";
var MONO = "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)";
var SIZES = { xs: "0.75rem", sm: "0.875rem", base: "1rem" };
var isEmpty = (value) => value === null || value === void 0 || value === "";
function resolveDeclaredCell(field, participation) {
  const kind = participation.widget;
  if (!kind || !COLUMN_KINDS.includes(kind)) return void 0;
  const options = participation.options ?? {};
  return (record) => /* @__PURE__ */ jsx19(DeclaredCell, { kind, options, value: getPath(record, field) });
}
function DeclaredCell({
  kind,
  options,
  value
}) {
  switch (kind) {
    case "badge":
      return /* @__PURE__ */ jsx19(BadgeCell, { value, options });
    case "badges":
      return /* @__PURE__ */ jsx19(BadgesCell, { value, options });
    case "number":
      return /* @__PURE__ */ jsx19(NumberCell, { value, options });
    case "date":
      return /* @__PURE__ */ jsx19(DateCell, { value, options });
    case "text":
    default:
      return /* @__PURE__ */ jsx19(TextCell, { value, options });
  }
}
function TextCell({ value, options }) {
  const style = {};
  if (options.mono) style.fontFamily = MONO;
  if (options.weight === "medium") style.fontWeight = 500;
  if (options.tone === "muted") style.color = MUTED;
  if (options.size) style.fontSize = SIZES[options.size];
  if (options.tabular) style.fontVariantNumeric = "tabular-nums";
  if (options.breakAll) style.wordBreak = "break-all";
  if (options.clamp) {
    style.display = "-webkit-box";
    style.WebkitBoxOrient = "vertical";
    style.WebkitLineClamp = options.clamp;
    style.overflow = "hidden";
  }
  if (isEmpty(value)) {
    return /* @__PURE__ */ jsx19(
      Placeholder,
      {
        text: options.placeholder ?? "\u2014",
        italic: options.placeholderStyle === "italic"
      }
    );
  }
  return /* @__PURE__ */ jsx19("span", { "data-frame-cell": "text", style, children: String(value) });
}
function Placeholder({ text, italic }) {
  return /* @__PURE__ */ jsx19(
    "span",
    {
      "data-frame-cell": "placeholder",
      style: { color: MUTED, ...italic ? { fontStyle: "italic" } : {} },
      children: text
    }
  );
}
function BadgeCell({ value, options }) {
  const { primitives } = useFrameInjection();
  const Badge2 = primitives.Badge;
  if (isEmpty(value)) {
    return options.placeholder !== void 0 ? /* @__PURE__ */ jsx19(Placeholder, { text: options.placeholder }) : null;
  }
  const key = String(value);
  const label = displayLabel5({ title: options.labels?.[key] }, key, { property: true });
  const variant = options.variants?.[key] ?? options.variant ?? "outline";
  return /* @__PURE__ */ jsx19(
    Badge2,
    {
      "data-frame-cell": "badge",
      variant,
      ...options.mono ? { style: { fontFamily: MONO } } : {},
      children: label
    }
  );
}
function BadgesCell({ value, options }) {
  const { primitives } = useFrameInjection();
  const Badge2 = primitives.Badge;
  const items = Array.isArray(value) ? value : [];
  if (items.length === 0) {
    return options.placeholder !== void 0 ? /* @__PURE__ */ jsx19(Placeholder, { text: options.placeholder }) : null;
  }
  const limit = options.limit ?? 3;
  const shown = items.slice(0, limit);
  const rest = items.length - shown.length;
  const variant = options.variant ?? "outline";
  return /* @__PURE__ */ jsxs16(
    "div",
    {
      "data-frame-cell": "badges",
      style: { display: "flex", flexWrap: "wrap", gap: "0.25rem", alignItems: "center" },
      children: [
        shown.map((item, index) => {
          const raw = badgeLabel(item, options);
          const text = typeof item === "object" && item !== null ? options.labels?.[raw] ?? raw : displayLabel5({ title: options.labels?.[raw] }, raw, { property: true });
          return /* @__PURE__ */ jsx19(
            Badge2,
            {
              variant: options.variants?.[raw] ?? variant,
              ...options.mono ? { style: { fontFamily: MONO } } : {},
              children: text
            },
            `${raw}-${index}`
          );
        }),
        options.overflow !== false && rest > 0 ? /* @__PURE__ */ jsxs16("span", { style: { color: MUTED, fontSize: SIZES.xs }, children: [
          "+",
          rest,
          " more"
        ] }) : null
      ]
    }
  );
}
function badgeLabel(item, options) {
  if (item === null || item === void 0) return "";
  if (typeof item !== "object") return String(item);
  const record = item;
  const primary = options.labelKey ? record[options.labelKey] : void 0;
  const fallback = options.labelFallbackKey ? record[options.labelFallbackKey] : void 0;
  return String(primary ?? fallback ?? "");
}
function NumberCell({ value, options }) {
  const placeholder = options.placeholder ?? "\u2014";
  if (isEmpty(value)) return /* @__PURE__ */ jsx19(Placeholder, { text: placeholder });
  const n = Number(value);
  if (Number.isNaN(n)) return /* @__PURE__ */ jsx19(Placeholder, { text: placeholder });
  if (n === 0 && options.zeroAsDash) return /* @__PURE__ */ jsx19(Placeholder, { text: placeholder });
  return /* @__PURE__ */ jsx19(
    "span",
    {
      "data-frame-cell": "number",
      style: {
        fontVariantNumeric: "tabular-nums",
        ...options.tone === "muted" ? { color: MUTED } : {}
      },
      children: n
    }
  );
}
function DateCell({ value, options }) {
  const placeholder = options.placeholder ?? "\u2014";
  if (isEmpty(value)) return /* @__PURE__ */ jsx19(Placeholder, { text: placeholder });
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return /* @__PURE__ */ jsx19("span", { "data-frame-cell": "date", children: String(value) });
  }
  return /* @__PURE__ */ jsx19(
    "span",
    {
      "data-frame-cell": "date",
      style: options.tone === "muted" ? { color: MUTED } : void 0,
      children: options.time ? parsed.toLocaleString() : parsed.toLocaleDateString()
    }
  );
}

export {
  STUD_WIDGET_KEYWORD,
  STUD_WIDGET_OPTIONS_KEYWORD,
  STUD_RESOURCE_REF_KEYWORD,
  stripHostWidgets,
  bridgeHostWidgets,
  getPath,
  COLUMN_KINDS,
  resolveDeclaredCell,
  DeclaredCell,
  resolveColumns,
  KNOWN_CONTEXTS,
  INHERITS,
  FRAME_CONTEXT_KEYWORD,
  resolveWidgetFor,
  EditableCell,
  SchemaView,
  listItemRendersCards,
  StatRow,
  FigureCard,
  RecordLine,
  formatRecordTime,
  RecentList,
  NavTile,
  WelcomePanel,
  resolveDashboardCard,
  dashboardRowRenders,
  DashboardCard,
  trendSeries,
  trendSegments,
  forecastBoundary,
  describeTrend,
  TrendCard,
  CARD_WIDGETS,
  registerCardWidgets,
  resourceQueryKey,
  useResourceList,
  useResourceRecord,
  useFormSchema,
  useSaveResource,
  useRemoveResource,
  DefaultToolbar,
  createNoun,
  DefaultRowActions,
  DefaultCell,
  DefaultEmpty,
  DefaultErrorState,
  DefaultNotFound,
  DefaultLoading,
  DefaultPagination,
  DefaultTable,
  DefaultCards,
  DefaultFormBody,
  DefaultToggle,
  DefaultSaveBar,
  DefaultContainer,
  KNOWN_ROW_ACTIONS,
  resolveRowActions,
  FrameActionError,
  resolveActions,
  actionUrl,
  navigateTarget,
  ResourceActionBar,
  RecordActionButtons,
  ActionButton,
  useInlineNotice,
  ListShell,
  ShadcnTable,
  ShadcnCell,
  ShadcnEmpty,
  ShadcnToolbar,
  ShadcnPagination,
  shadcnListSlots,
  KIND_PLACEMENTS,
  RECORD_PLACEMENTS,
  KIND_VARIANT_FOR,
  resolveKindPlacement,
  resolveRecordPlacement,
  EMPTY_SELECTION,
  selectAllMatching,
  isPicked,
  togglePick,
  pageState,
  setPagePicked,
  followFilters,
  isEmptySelection,
  selectionCount,
  selectionToSearch,
  selectionFromValue,
  selectionToValue,
  createMemoryUrlState,
  ResourceRecordPicker,
  readResourceRefConfig,
  ResourceRefWidget,
  ResourcePickerWidget,
  isResourceRefNode,
  registerResourceRefWidget,
  registerFrameWidgets,
  FrameProvider,
  useOptionalFrameInjection,
  useFrameInjection
};
//# sourceMappingURL=chunk-Z4PKLMYX.js.map