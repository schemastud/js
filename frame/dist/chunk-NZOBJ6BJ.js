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

// src/ResourceRefWidget.tsx
import { useEffect, useMemo as useMemo2, useState } from "react";
import { widgetFormContext } from "@schemastud/seam";

// src/context.tsx
import { createContext, useContext, useMemo } from "react";
import { FacetsProvider } from "@schemastud/facets";
import { WidgetRegistryContext } from "@schemastud/seam";
import { jsx } from "react/jsx-runtime";
var FrameContext = createContext(null);
var installedRegistries = /* @__PURE__ */ new WeakSet();
function ensureBuiltinWidgets(registry) {
  if (!registry || typeof registry !== "object" || typeof registry.registerWidget !== "function") {
    return;
  }
  if (installedRegistries.has(registry)) return;
  registerResourceRefWidget(registry);
  installedRegistries.add(registry);
}
function FrameProvider({ value, children }) {
  useMemo(() => ensureBuiltinWidgets(value.registry), [value.registry]);
  const facetsValue = useMemo(
    () => ({
      transport: value.transport,
      primitives: value.primitives,
      useUrlState: value.useUrlState,
      can: value.can
    }),
    [value.transport, value.primitives, value.useUrlState, value.can]
  );
  return /* @__PURE__ */ jsx(FrameContext.Provider, { value, children: /* @__PURE__ */ jsx(FacetsProvider, { value: facetsValue, children: /* @__PURE__ */ jsx(WidgetRegistryContext.Provider, { value: value.registry, children }) }) });
}
function useFrameInjection() {
  const injection = useContext(FrameContext);
  if (!injection) {
    throw new Error(
      "@schemastud/frame: no FrameProvider found. Wrap your app in <FrameProvider value={{ transport, primitives, useUrlState, registry, schemaFetcher, can }}>."
    );
  }
  return injection;
}

// src/ResourceRefWidget.tsx
import { jsx as jsx2, jsxs } from "react/jsx-runtime";
function readResourceRefConfig(schema) {
  const cfg = schema?.[STUD_RESOURCE_REF_KEYWORD];
  if (cfg == null || typeof cfg !== "object") return void 0;
  const bag = cfg;
  if (typeof bag.resource !== "string") return void 0;
  return {
    resource: bag.resource,
    value: typeof bag.value === "string" ? bag.value : "id",
    label: typeof bag.label === "string" ? bag.label : "name",
    multiple: bag.multiple === true,
    scope: bag.scope ?? void 0
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
  const injection = useFrameInjection();
  const transport = injection.transport;
  const cfg = useMemo2(() => readResourceRefConfig(props.schema), [props.schema]);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(Boolean(cfg));
  useEffect(() => {
    if (!cfg || !transport) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    transport.list(cfg.resource, stringifyScope(cfg.scope)).then((page) => {
      if (cancelled) return;
      const rows = page?.data ?? [];
      setOptions(
        rows.map((row) => ({
          value: String(row[cfg.value]),
          label: String(row[cfg.label])
        }))
      );
    }).catch(() => {
      if (!cancelled) setOptions([]);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [transport, cfg?.resource, cfg?.value, cfg?.label, JSON.stringify(cfg?.scope)]);
  if (!cfg) return null;
  const disabled = props.disabled || props.readonly;
  const multiple = cfg.multiple === true;
  if (multiple) {
    const selected = Array.isArray(props.value) ? props.value.map((v) => String(v)) : [];
    return /* @__PURE__ */ jsx2(
      "select",
      {
        id: props.id,
        "data-frame-widget": "resource-ref",
        multiple: true,
        disabled,
        value: selected,
        "aria-busy": loading || void 0,
        onChange: (e) => {
          const next = Array.from(e.target.selectedOptions).map((o) => o.value);
          props.onChange(next);
        },
        className: "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        children: options.map((o) => /* @__PURE__ */ jsx2("option", { value: o.value, children: o.label }, o.value))
      }
    );
  }
  const single = props.value == null ? "" : String(props.value);
  return /* @__PURE__ */ jsxs(
    "select",
    {
      id: props.id,
      "data-frame-widget": "resource-ref",
      disabled,
      value: single,
      "aria-busy": loading || void 0,
      onChange: (e) => props.onChange(e.target.value === "" ? void 0 : e.target.value),
      className: "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
      children: [
        /* @__PURE__ */ jsx2("option", { value: "", children: loading ? "Loading\u2026" : `Select ${cfg.resource}\u2026` }),
        options.map((o) => /* @__PURE__ */ jsx2("option", { value: o.value, children: o.label }, o.value))
      ]
    }
  );
}
function registerResourceRefWidget(registry) {
  registry.registerWidget((s) => s[STUD_RESOURCE_REF_KEYWORD] != null, ResourceRefWidget);
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
import { mergeUiSchema } from "@schemastud/seam";
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

// src/SchemaView.tsx
import { useContext as useContext2 } from "react";
import { WidgetRegistryContext as WidgetRegistryContext2 } from "@schemastud/seam";
import { jsx as jsx3, jsxs as jsxs2 } from "react/jsx-runtime";
var isDev = () => Boolean(import.meta.env?.DEV);
function labelize(key, cm) {
  if (cm?.label) return cm.label;
  return key.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^\w/, (c) => c.toUpperCase());
}
function scalar(value) {
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
    /* @__PURE__ */ jsx3("span", { "data-frame-view-label": true, children: label }),
    /* @__PURE__ */ jsx3("span", { "data-frame-view-error": true, children: "Unable to display this field" })
  ] });
}
function FallbackValue({ value, node }) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return /* @__PURE__ */ jsx3("span", { "data-frame-view-value": true, children: scalar(value) });
  }
  const properties = node?.properties ?? {};
  const declaredOr = (key) => {
    const title = properties[key]?.title;
    return typeof title === "string" && title.trim() ? title : labelize(key);
  };
  const entries = Object.entries(value);
  return /* @__PURE__ */ jsxs2("div", { "data-frame-view-structured": true, children: [
    /* @__PURE__ */ jsx3("dl", { children: entries.map(([key, entry]) => /* @__PURE__ */ jsxs2("div", { children: [
      /* @__PURE__ */ jsx3("dt", { "data-frame-view-label": true, children: declaredOr(key) }),
      /* @__PURE__ */ jsx3("dd", { "data-frame-view-value": true, children: scalar(entry) })
    ] }, key)) }),
    /* @__PURE__ */ jsxs2("details", { children: [
      /* @__PURE__ */ jsx3("summary", { children: "Source JSON" }),
      /* @__PURE__ */ jsx3("pre", { "data-frame-view-json": true, children: JSON.stringify(value, null, 2) })
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
    if (isDev()) {
      throw new Error(
        `[frame] SchemaView: heavyweight widget "${cm.widget}" is unbound (no registry match) for context "${ctx}".`
      );
    }
    return /* @__PURE__ */ jsx3(UnboundWidget, { label, widget: cm?.widget });
  }
  const Widget = resolved.participates && typeof resolved.widget !== "string" ? resolved.widget : void 0;
  return /* @__PURE__ */ jsxs2("div", { "data-frame-view": "field", children: [
    /* @__PURE__ */ jsx3("span", { "data-frame-view-label": true, children: label }),
    Widget ? /* @__PURE__ */ jsx3(Widget, { ...widgetMountProps(value, node, resolved.config) }) : /* @__PURE__ */ jsx3(FallbackValue, { value, node })
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
    return /* @__PURE__ */ jsx3("div", { "data-frame-view": "list-item", children: /* @__PURE__ */ jsx3(
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
  return /* @__PURE__ */ jsx3("div", { "data-frame-view": "detail", children: Object.keys(properties).map((key) => {
    const cm = manifest.byNode[key]?.detail;
    return /* @__PURE__ */ jsx3(
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

// src/cards/StatRow.tsx
import { StatTile } from "@schemastud/ui";

// src/cards/chrome.tsx
import { Card, CardContent, CardDescription, CardHeader } from "@schemastud/ui";
import { Fragment, jsx as jsx4, jsxs as jsxs3 } from "react/jsx-runtime";
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
  return /* @__PURE__ */ jsx4("a", { href, className, "aria-label": ariaLabel, ...marker ?? {}, children });
}
function CardHeading({
  label,
  href,
  Icon,
  options
}) {
  const body = /* @__PURE__ */ jsxs3(Fragment, { children: [
    Icon ? /* @__PURE__ */ jsx4(Icon, { className: "size-3.5" }) : null,
    /* @__PURE__ */ jsx4("span", { className: "truncate", children: label })
  ] });
  const className = "flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground";
  if (!href) {
    return /* @__PURE__ */ jsx4("h3", { "data-frame-card-heading": true, className, children: body });
  }
  return /* @__PURE__ */ jsx4(
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
  return /* @__PURE__ */ jsx4(
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
  return /* @__PURE__ */ jsx4(
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
      /* @__PURE__ */ jsx4(CardHeading, { label, href, Icon, options }),
      period ? /* @__PURE__ */ jsx4(CardDescription, { children: period }) : null
    ] }),
    /* @__PURE__ */ jsxs3(CardContent, { className: "space-y-4 p-4 pt-0", children: [
      headline ? /* @__PURE__ */ jsxs3("div", { children: [
        /* @__PURE__ */ jsx4("div", { className: "text-3xl font-semibold tabular-nums", "data-frame-figure": headline.key, children: headline.value }),
        /* @__PURE__ */ jsx4("div", { className: "text-xs text-muted-foreground", children: headline.label })
      ] }) : fallback ?? null,
      children,
      note ? /* @__PURE__ */ jsx4("p", { "data-frame-card-note": true, className: "text-xs text-muted-foreground", children: note }) : null,
      /* @__PURE__ */ jsx4(ViewAllLink, { href, options })
    ] })
  ] });
}

// src/cards/StatRow.tsx
import { displayLabel } from "@schemastud/seam";
import { jsx as jsx5, jsxs as jsxs4 } from "react/jsx-runtime";
function StatRow({ value, options, row }) {
  const figures = value?.figures ?? [];
  const label = displayLabel({ title: value?.label ?? row?.label }, value?.key);
  const Icon = options?.iconFor?.(value?.icon ?? row?.icon);
  return /* @__PURE__ */ jsxs4("section", { "data-frame-card": "stat-row", className: "space-y-2", children: [
    /* @__PURE__ */ jsx5(CardHeading, { label, href: row?.href, Icon, options }),
    figures.length === 0 ? /* @__PURE__ */ jsx5(EmptyState, { children: "No figures." }) : /* @__PURE__ */ jsx5(
      "div",
      {
        className: "grid gap-3",
        style: { gridTemplateColumns: "repeat(auto-fill, minmax(9rem, 1fr))" },
        children: figures.map((figure) => /* @__PURE__ */ jsx5(
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
import { displayLabel as displayLabel2 } from "@schemastud/seam";
import { jsx as jsx6, jsxs as jsxs5 } from "react/jsx-runtime";
function FigureCard({ value, options, row }) {
  const figures = value?.figures ?? [];
  const headline = value?.overview?.headline ?? void 0;
  const lead = headline ?? figures[0];
  const rest = headline ? figures : figures.slice(1);
  return /* @__PURE__ */ jsx6(
    OverviewFrame,
    {
      card: "figure-card",
      label: displayLabel2({ title: value?.label ?? row?.label }, value?.key),
      Icon: options?.iconFor?.(value?.icon ?? row?.icon),
      href: row?.href,
      period: value?.overview?.period ?? row?.description ?? void 0,
      note: value?.overview?.note ?? void 0,
      headline: lead,
      fallback: /* @__PURE__ */ jsx6(EmptyState, { children: "No figures." }),
      options,
      children: rest.length > 0 ? /* @__PURE__ */ jsx6(
        "div",
        {
          className: "grid gap-2 text-center",
          style: { gridTemplateColumns: `repeat(${Math.min(rest.length, 4)}, minmax(0, 1fr))` },
          children: rest.map((figure) => /* @__PURE__ */ jsxs5("div", { className: "rounded-md border p-2", "data-frame-figure": figure.key, children: [
            /* @__PURE__ */ jsx6("div", { className: "text-lg font-semibold tabular-nums", children: figure.value }),
            /* @__PURE__ */ jsx6("div", { className: "text-[11px] text-muted-foreground", children: figure.label })
          ] }, figure.key))
        }
      ) : null
    }
  );
}

// src/cards/RecordLine.tsx
import { Badge } from "@schemastud/ui";
import { jsx as jsx7, jsxs as jsxs6 } from "react/jsx-runtime";
function RecordLine({ value }) {
  const record = value ?? {};
  const text = firstString(record, TEXT_FIELDS) ?? String(record.id ?? "");
  const badge = firstString(record, BADGE_FIELDS);
  const time = firstString(record, TIME_FIELDS);
  const parsed = time ? new Date(time) : void 0;
  const parses = parsed !== void 0 && !Number.isNaN(parsed.getTime());
  return /* @__PURE__ */ jsxs6("div", { "data-frame-record-line": true, className: "flex items-center gap-2 text-sm", children: [
    /* @__PURE__ */ jsx7("span", { "data-frame-record-line-text": true, className: "min-w-0 flex-1 truncate", children: text }),
    badge ? /* @__PURE__ */ jsx7(Badge, { variant: "secondary", "data-frame-record-line-badge": true, className: "shrink-0 font-normal", children: badge }) : null,
    time ? /* @__PURE__ */ jsx7(
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
var TIME_FIELDS = ["created_at", "occurred_at", "updated_at"];
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
import { Card as Card2, CardContent as CardContent2, CardHeader as CardHeader2 } from "@schemastud/ui";
import { jsx as jsx8, jsxs as jsxs7 } from "react/jsx-runtime";
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
    /* @__PURE__ */ jsx8(CardHeader2, { className: "p-4 pb-2", children: /* @__PURE__ */ jsx8(CardHeading, { label, href: row?.href, Icon, options }) }),
    /* @__PURE__ */ jsxs7(CardContent2, { className: "space-y-3 p-4 pt-0", children: [
      items.length === 0 ? /* @__PURE__ */ jsx8(EmptyState, { children: "Nothing recent." }) : misdeclared ? /* @__PURE__ */ jsx8(UnboundWidget, { label, widget: misdeclared, kind: "unbound-list-item" }) : /* @__PURE__ */ jsx8("ol", { "data-frame-recent-items": true, className: "divide-y rounded-md border", children: items.map((item, i) => /* @__PURE__ */ jsx8("li", { className: "px-3 py-2 text-sm", children: bound && target ? /* @__PURE__ */ jsx8(
        SchemaView,
        {
          schema: ROOT_NODE,
          record: item,
          manifest: target,
          context: "list-item",
          registry
        }
      ) : /* @__PURE__ */ jsx8(line.Line, { ...widgetMountProps(item, ROOT_NODE, line.config) }) }, item.id ?? i)) }),
      /* @__PURE__ */ jsx8(ViewAllLink, { href: row?.href, options })
    ] })
  ] });
}
function recordLineFor(registry) {
  const { widget, config } = registry.resolveEntry({ "x-widget": "record-line" });
  return isWidgetComponent(widget) ? { Line: widget, config } : { Line: RecordLine };
}

// src/cards/NavTile.tsx
import { jsx as jsx9, jsxs as jsxs8 } from "react/jsx-runtime";
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
        /* @__PURE__ */ jsx9(
          "span",
          {
            "aria-hidden": true,
            className: "grid size-8 flex-none place-items-center rounded-md bg-muted/60 text-muted-foreground group-hover:text-foreground",
            children: Icon ? /* @__PURE__ */ jsx9(Icon, { className: "size-4" }) : /* @__PURE__ */ jsx9("span", { className: "text-xs font-semibold uppercase", children: value.label.slice(0, 1) })
          }
        ),
        /* @__PURE__ */ jsxs8("span", { className: "min-w-0", children: [
          /* @__PURE__ */ jsx9("span", { className: "block truncate text-sm font-medium", children: value.label }),
          value.description ? /* @__PURE__ */ jsx9("span", { className: "block truncate text-[11px] text-muted-foreground", children: value.description }) : null
        ] })
      ]
    }
  );
}

// src/cards/WelcomePanel.tsx
import { Inbox, UsersRound } from "lucide-react";
import { Card as Card3, CardContent as CardContent3, buttonVariants } from "@schemastud/ui";
import { jsx as jsx10, jsxs as jsxs9 } from "react/jsx-runtime";
function WelcomePanel({ value, options }) {
  const Icon = value.state === "first-run" ? UsersRound : Inbox;
  return /* @__PURE__ */ jsx10(Card3, { "data-frame-card": "welcome", "data-frame-welcome-state": value.state, className: "py-0", children: /* @__PURE__ */ jsxs9(CardContent3, { className: "flex flex-col items-start gap-4 p-6 sm:flex-row sm:gap-5 sm:p-8", children: [
    /* @__PURE__ */ jsx10(
      "span",
      {
        "aria-hidden": true,
        className: "grid size-10 flex-none place-items-center rounded-full bg-muted text-muted-foreground",
        children: /* @__PURE__ */ jsx10(Icon, { className: "size-5" })
      }
    ),
    /* @__PURE__ */ jsxs9("div", { className: "flex min-w-0 flex-col gap-4", children: [
      /* @__PURE__ */ jsxs9("div", { className: "flex flex-col gap-1.5", children: [
        /* @__PURE__ */ jsx10("h2", { className: "text-lg font-semibold leading-tight text-foreground", children: value.heading }),
        /* @__PURE__ */ jsx10("p", { className: "max-w-prose text-sm text-muted-foreground", children: value.body })
      ] }),
      value.actions.length > 0 ? /* @__PURE__ */ jsx10("div", { className: "flex flex-wrap items-center gap-2", "data-frame-welcome-actions": true, children: value.actions.map((action, i) => /* @__PURE__ */ jsx10(
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
      value.hint ? /* @__PURE__ */ jsx10("p", { className: "text-sm text-muted-foreground", children: value.hint }) : null
    ] })
  ] }) });
}

// src/cards/DashboardCard.tsx
import { jsx as jsx11 } from "react/jsx-runtime";
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
    return /* @__PURE__ */ jsx11(
      NavTile,
      {
        value: { label: row.label, icon: row.icon, href: row.href, description: row.description },
        options
      }
    );
  }
  if (row.context === "welcome") {
    return row.welcome ? /* @__PURE__ */ jsx11(WelcomePanel, { value: row.welcome, options }) : null;
  }
  const resource = row.resource;
  const manifest = resource ? manifestFor?.(resource) : void 0;
  if (!manifest || !resource) return null;
  const resolved = resolveDashboardCard(row, manifest, registry);
  const cell = (body2) => /* @__PURE__ */ jsx11("div", { "data-frame-card": "dashboard-card", "data-frame-card-resource": resource, "data-frame-card-context": row.context, children: body2 });
  if (resolved.unbound) {
    return cell(/* @__PURE__ */ jsx11(UnboundWidget, { kind: "unbound", label: row.label, widget: resolved.declared }));
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
  const body = /* @__PURE__ */ jsx11(Widget, { ...widgetMountProps(payload, ROOT_NODE, merged), row });
  if (row.context !== "overview" || resolved.tier !== "summary") return cell(body);
  return cell(
    /* @__PURE__ */ jsx11(
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

// src/cards/index.ts
var CARD_WIDGETS = {
  "stat-row": StatRow,
  "figure-card": FigureCard,
  "recent-list": RecentList,
  "record-line": RecordLine,
  "nav-tile": NavTile,
  "dashboard-card": DashboardCard
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
  return useResourceQuery(transport, resource, {
    queryKey: resourceQueryKey(transport, resource, "record", id),
    queryFn: () => transport.get(resource, id),
    enabled: id !== null,
    ...options
  });
}
function useFormSchema(resource, form) {
  const { transport } = useFrameInjection();
  return useQuery({
    queryKey: resourceQueryKey(transport, resource, "form-schema", form),
    placeholderData: void 0,
    queryFn: () => transport.getFormSchema(resource, form),
    staleTime: 5 * 60 * 1e3
  });
}
function useSaveResource(resource) {
  const { transport } = useFrameInjection();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: resourceQueryKey(transport, resource, "save"),
    mutationFn: ({ id, data }) => id === null ? transport.create(resource, data) : transport.save(resource, id, data),
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: resourceQueryKey(transport, resource, "remove"),
    mutationFn: (id) => transport.remove(resource, id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["frame", resource],
        predicate: (query) => query.queryKey.at(-1) === transportScope(transport)
      });
    }
  });
}

// src/slots/defaults.tsx
import { SchemaForm } from "@schemastud/seam";
import { useEffect as useEffect2, useRef } from "react";
import { Trash2 } from "lucide-react";
import { Fragment as Fragment2, jsx as jsx12, jsxs as jsxs10 } from "react/jsx-runtime";
function DefaultToolbar({
  resource,
  onNew,
  canCreate,
  framesCreate,
  singularLabel
}) {
  const { primitives } = useFrameInjection();
  const { Button } = primitives;
  if (!canCreate || !framesCreate) return null;
  return /* @__PURE__ */ jsx12("div", { "data-frame-slot": "Toolbar", style: { display: "flex", justifyContent: "flex-end" }, children: /* @__PURE__ */ jsxs10(Button, { type: "button", onClick: onNew, "data-frame-action": "new", children: [
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
  const { Button } = primitives;
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
        Button,
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
  if (column.cell) return /* @__PURE__ */ jsx12(Fragment2, { children: column.cell(record) });
  const value = getPath(record, column.field);
  return /* @__PURE__ */ jsx12(Fragment2, { children: value === null || value === void 0 ? "" : String(value) });
}
function DefaultEmpty() {
  return /* @__PURE__ */ jsx12("div", { "data-frame-slot": "Empty", style: { padding: "2rem", textAlign: "center", opacity: 0.6 }, children: "No records." });
}
function DefaultErrorState({ error, retry }) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : null;
  return /* @__PURE__ */ jsxs10(
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
    primitives: { Button }
  } = useFrameInjection();
  const lastPage = props.mode === "offset" ? Math.max(1, Math.ceil(props.total / props.perPage)) : 1;
  return /* @__PURE__ */ jsxs10(
    "div",
    {
      "data-frame-slot": "Pagination",
      style: { display: "flex", gap: "0.5rem", alignItems: "center" },
      children: [
        props.mode === "cursor" && /* @__PURE__ */ jsx12(
          Button,
          {
            type: "button",
            disabled: props.disabled || props.isFirst,
            onClick: props.onFirst,
            children: "First"
          }
        ),
        /* @__PURE__ */ jsx12(
          Button,
          {
            type: "button",
            disabled: props.disabled || (props.mode === "offset" ? props.page <= 1 : !props.hasPrevious),
            onClick: () => props.mode === "offset" ? props.onPageChange(props.page - 1) : props.onPrevious(),
            children: "Prev"
          }
        ),
        props.mode === "offset" && /* @__PURE__ */ jsxs10("span", { "data-frame-page": true, children: [
          props.page,
          " / ",
          lastPage
        ] }),
        /* @__PURE__ */ jsx12(
          Button,
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
  return /* @__PURE__ */ jsxs10("table", { "data-frame-slot": "Table", style: { width: "100%", borderCollapse: "collapse" }, children: [
    /* @__PURE__ */ jsx12("thead", { children: /* @__PURE__ */ jsxs10("tr", { children: [
      columns.map((c) => /* @__PURE__ */ jsx12("th", { style: { textAlign: "left", ...cellStyle }, children: c.header ?? c.field }, c.field)),
      RowActions ? /* @__PURE__ */ jsx12("th", {}) : null
    ] }) }),
    /* @__PURE__ */ jsx12("tbody", { children: rows.map((row, i) => /* @__PURE__ */ jsxs10(
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
  const root = useRef(null);
  useEffect2(() => {
    registerSubmit(() => root.current?.querySelector("form")?.requestSubmit());
    return () => registerSubmit(null);
  }, [registerSubmit]);
  return /* @__PURE__ */ jsx12("div", { ref: root, "data-frame-slot": "FormBody", "data-frame-readonly": readOnly ? "" : void 0, children: /* @__PURE__ */ jsx12(
    SchemaForm,
    {
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
  return /* @__PURE__ */ jsx12("div", { "data-frame-slot": "Toggle", role: "radiogroup", "aria-label": "Form mode", children: ["enriched", "bare"].map((mode) => /* @__PURE__ */ jsxs10("label", { style: { marginRight: "0.5rem" }, children: [
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
function DefaultSaveBar({
  saving,
  canSubmit,
  readOnly,
  onSave,
  onCancel
}) {
  const { primitives } = useFrameInjection();
  const { Button } = primitives;
  return /* @__PURE__ */ jsxs10(
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
        onCancel ? /* @__PURE__ */ jsx12(Button, { type: "button", onClick: onCancel, "data-frame-action": "cancel", children: "Cancel" }) : null,
        !readOnly ? /* @__PURE__ */ jsx12(
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
function DefaultContainer({ children }) {
  const { primitives } = useFrameInjection();
  const { SidePanel } = primitives;
  return /* @__PURE__ */ jsx12(SidePanel, { "data-frame-slot": "Container", children });
}

export {
  STUD_WIDGET_KEYWORD,
  STUD_WIDGET_OPTIONS_KEYWORD,
  STUD_RESOURCE_REF_KEYWORD,
  stripHostWidgets,
  bridgeHostWidgets,
  readResourceRefConfig,
  ResourceRefWidget,
  registerResourceRefWidget,
  FrameProvider,
  useFrameInjection,
  getPath,
  KNOWN_CONTEXTS,
  INHERITS,
  FRAME_CONTEXT_KEYWORD,
  resolveWidgetFor,
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
  DefaultContainer
};
//# sourceMappingURL=chunk-NZOBJ6BJ.js.map