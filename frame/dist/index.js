import {
  CARD_WIDGETS,
  DashboardCard,
  DefaultCards,
  DefaultCell,
  DefaultContainer,
  DefaultEmpty,
  DefaultErrorState,
  DefaultFormBody,
  DefaultLoading,
  DefaultNotFound,
  DefaultPagination,
  DefaultRowActions,
  DefaultSaveBar,
  DefaultTable,
  DefaultToggle,
  DefaultToolbar,
  FRAME_CONTEXT_KEYWORD,
  FigureCard,
  FrameProvider,
  INHERITS,
  KNOWN_CONTEXTS,
  NavTile,
  RecentList,
  RecordLine,
  ResourceRefWidget,
  STUD_RESOURCE_REF_KEYWORD,
  STUD_WIDGET_KEYWORD,
  STUD_WIDGET_OPTIONS_KEYWORD,
  SchemaView,
  StatRow,
  WelcomePanel,
  bridgeHostWidgets,
  createNoun,
  dashboardRowRenders,
  formatRecordTime,
  getPath,
  listItemRendersCards,
  readResourceRefConfig,
  registerCardWidgets,
  registerResourceRefWidget,
  resolveDashboardCard,
  resolveWidgetFor,
  resourceQueryKey,
  stripHostWidgets,
  useFormSchema,
  useFrameInjection,
  useRemoveResource,
  useResourceList,
  useResourceRecord,
  useSaveResource
} from "./chunk-NZOBJ6BJ.js";

// src/ListShell.tsx
import { useLayoutEffect, useMemo as useMemo3, useRef as useRef2, useState as useState3 } from "react";
import { ListFilters, useListFilters } from "@schemastud/facets";

// src/columnKinds.tsx
import { displayLabel } from "@schemastud/seam";
import { jsx, jsxs } from "react/jsx-runtime";
var COLUMN_KINDS = ["text", "badge", "badges", "number", "date"];
var MUTED = "var(--muted-foreground, inherit)";
var MONO = "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)";
var SIZES = { xs: "0.75rem", sm: "0.875rem", base: "1rem" };
var isEmpty = (value) => value === null || value === void 0 || value === "";
function resolveDeclaredCell(field, participation) {
  const kind = participation.widget;
  if (!kind || !COLUMN_KINDS.includes(kind)) return void 0;
  const options = participation.options ?? {};
  return (record) => /* @__PURE__ */ jsx(DeclaredCell, { kind, options, value: getPath(record, field) });
}
function DeclaredCell({
  kind,
  options,
  value
}) {
  switch (kind) {
    case "badge":
      return /* @__PURE__ */ jsx(BadgeCell, { value, options });
    case "badges":
      return /* @__PURE__ */ jsx(BadgesCell, { value, options });
    case "number":
      return /* @__PURE__ */ jsx(NumberCell, { value, options });
    case "date":
      return /* @__PURE__ */ jsx(DateCell, { value, options });
    case "text":
    default:
      return /* @__PURE__ */ jsx(TextCell, { value, options });
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
    return /* @__PURE__ */ jsx(
      Placeholder,
      {
        text: options.placeholder ?? "\u2014",
        italic: options.placeholderStyle === "italic"
      }
    );
  }
  return /* @__PURE__ */ jsx("span", { "data-frame-cell": "text", style, children: String(value) });
}
function Placeholder({ text, italic }) {
  return /* @__PURE__ */ jsx(
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
  const Badge = primitives.Badge;
  if (isEmpty(value)) {
    return options.placeholder !== void 0 ? /* @__PURE__ */ jsx(Placeholder, { text: options.placeholder }) : null;
  }
  const key = String(value);
  const label = displayLabel({ title: options.labels?.[key] }, key, { property: true });
  const variant = options.variants?.[key] ?? options.variant ?? "outline";
  return /* @__PURE__ */ jsx(
    Badge,
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
  const Badge = primitives.Badge;
  const items = Array.isArray(value) ? value : [];
  if (items.length === 0) {
    return options.placeholder !== void 0 ? /* @__PURE__ */ jsx(Placeholder, { text: options.placeholder }) : null;
  }
  const limit = options.limit ?? 3;
  const shown = items.slice(0, limit);
  const rest = items.length - shown.length;
  const variant = options.variant ?? "outline";
  return /* @__PURE__ */ jsxs(
    "div",
    {
      "data-frame-cell": "badges",
      style: { display: "flex", flexWrap: "wrap", gap: "0.25rem", alignItems: "center" },
      children: [
        shown.map((item, index) => {
          const raw = badgeLabel(item, options);
          const text = typeof item === "object" && item !== null ? options.labels?.[raw] ?? raw : displayLabel({ title: options.labels?.[raw] }, raw, { property: true });
          return /* @__PURE__ */ jsx(
            Badge,
            {
              variant: options.variants?.[raw] ?? variant,
              ...options.mono ? { style: { fontFamily: MONO } } : {},
              children: text
            },
            `${raw}-${index}`
          );
        }),
        options.overflow !== false && rest > 0 ? /* @__PURE__ */ jsxs("span", { style: { color: MUTED, fontSize: SIZES.xs }, children: [
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
  if (isEmpty(value)) return /* @__PURE__ */ jsx(Placeholder, { text: placeholder });
  const n = Number(value);
  if (Number.isNaN(n)) return /* @__PURE__ */ jsx(Placeholder, { text: placeholder });
  if (n === 0 && options.zeroAsDash) return /* @__PURE__ */ jsx(Placeholder, { text: placeholder });
  return /* @__PURE__ */ jsx(
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
  if (isEmpty(value)) return /* @__PURE__ */ jsx(Placeholder, { text: placeholder });
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return /* @__PURE__ */ jsx("span", { "data-frame-cell": "date", children: String(value) });
  }
  return /* @__PURE__ */ jsx(
    "span",
    {
      "data-frame-cell": "date",
      style: options.tone === "muted" ? { color: MUTED } : void 0,
      children: options.time ? parsed.toLocaleString() : parsed.toLocaleDateString()
    }
  );
}

// src/resolveColumns.ts
import { displayLabel as displayLabel2 } from "@schemastud/seam";
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
      header: host?.header ?? displayLabel2({ title: cm.label }, field, { property: true }),
      ...host?.sortField ? { sortField: host.sortField } : {},
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
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var isDev2 = () => Boolean(import.meta.env?.DEV);
function scalar(value) {
  if (value === null || value === void 0) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
function ReadProjection({ value }) {
  return /* @__PURE__ */ jsx2("span", { "data-frame-cell-value": true, children: scalar(value) });
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
    return /* @__PURE__ */ jsx2("div", { "data-frame-cell": "unbound-heavyweight", children: /* @__PURE__ */ jsxs2("span", { "data-frame-cell-error": true, children: [
      "[unbound widget: ",
      String(edit?.widget),
      "]"
    ] }) });
  }
  const Widget = resolved.participates && typeof resolved.widget !== "string" ? resolved.widget : void 0;
  if (!Widget) {
    return /* @__PURE__ */ jsx2("div", { "data-frame-cell": "readonly", children: /* @__PURE__ */ jsx2(ReadProjection, { value }) });
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
    return /* @__PURE__ */ jsx2(
      "div",
      {
        "data-frame-cell": "editable",
        role: "button",
        tabIndex: 0,
        onClick: activate,
        onFocus: activate,
        children: /* @__PURE__ */ jsx2(ReadProjection, { value })
      }
    );
  }
  return /* @__PURE__ */ jsx2(
    "div",
    {
      "data-frame-cell": "editing",
      onBlur: () => commit(draft),
      onKeyDown: (e) => {
        if (e.key === "Escape") cancel();
      },
      children: /* @__PURE__ */ jsx2(
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { transportScope } from "@schemastud/facets";
import { useCallback, useMemo, useRef, useState as useState2 } from "react";
import { flushSync } from "react-dom";
import { Fragment, jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
function ResourceActionBar({
  resource,
  manifest,
  ...handlers
}) {
  const { transport } = useFrameInjection();
  const actions = resolveActions(manifest, "resource", transport);
  if (actions.length === 0) return null;
  return /* @__PURE__ */ jsx3(
    "div",
    {
      "data-frame-slot": "ResourceActions",
      style: { display: "flex", gap: "0.5rem", justifyContent: "flex-end", flexShrink: 0 },
      children: actions.map((action) => /* @__PURE__ */ jsx3(ActionButton, { resource, action, ...handlers }, action.key))
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
  return /* @__PURE__ */ jsx3(
    "div",
    {
      "data-frame-slot": "RecordActions",
      style: { display: "flex", gap: compact ? "0.25rem" : "0.5rem", justifyContent: "flex-end" },
      children: actions.map((action) => /* @__PURE__ */ jsx3(
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
  const { Button } = primitives;
  const queryClient = useQueryClient();
  const [open, setOpen] = useState2(false);
  const notice = useCallback(
    (n) => notify ? notify(n) : onNotice?.(n),
    [notify, onNotice]
  );
  const invoke = useMutation({
    mutationKey: resourceQueryKey(transport, resource, "action", action.key),
    mutationFn: (data) => {
      if (!transport.invoke) throw new Error("This host cannot send actions.");
      return transport.invoke(action, {
        id: record?.id == null ? null : String(record.id),
        data
      });
    },
    onSuccess: (result) => {
      setOpen(false);
      notice({ tone: "success", message: result.message || `${action.label} done.` });
      const target = action.result === "navigate" ? navigateTarget(result, record) : null;
      if (target !== null && onNavigate) {
        onNavigate({ id: target });
        return;
      }
      void queryClient.invalidateQueries({
        queryKey: ["frame", resource],
        predicate: (query) => query.queryKey.at(-1) === transportScope(transport)
      });
    },
    onError: (error) => {
      if (!(error instanceof FrameActionError && error.status === 422 && action.input !== null)) {
        notice({ tone: "error", message: error.message || `${action.label} failed.` });
      }
    }
  });
  return /* @__PURE__ */ jsxs3(Fragment, { children: [
    /* @__PURE__ */ jsx3(
      Button,
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
          invoke.reset();
          setOpen(true);
        },
        children: action.label
      }
    ),
    open ? /* @__PURE__ */ jsx3(
      ActionDialog,
      {
        resource,
        action,
        pending: invoke.isPending,
        error: invoke.error,
        onCancel: () => setOpen(false),
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
  const { Button } = primitives;
  const Dialog = primitives.Dialog;
  const FormBody = editSlots?.FormBody ?? DefaultFormBody;
  const [formData, setFormData] = useState2({});
  const submitHandler = useRef(null);
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
  const body = /* @__PURE__ */ jsxs3(
    "div",
    {
      "data-frame-action-dialog": action.key,
      role: Dialog ? void 0 : "dialog",
      "aria-label": action.label,
      style: { display: "flex", flexDirection: "column", gap: "0.75rem" },
      children: [
        Dialog ? null : /* @__PURE__ */ jsx3("strong", { children: action.label }),
        hasForm ? schemaQuery.isError ? /* @__PURE__ */ jsx3("div", { role: "alert", children: "Could not load this form." }) : schemaQuery.data === void 0 ? /* @__PURE__ */ jsx3("div", { "data-frame-shell": "action-loading", children: "Loading\u2026" }) : /* @__PURE__ */ jsx3(
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
        ) : /* @__PURE__ */ jsx3("p", { style: { margin: 0 }, children: action.destructive ? `${action.label}? This cannot be undone.` : `${action.label}?` }),
        error ? /* @__PURE__ */ jsx3("div", { role: "alert", "data-frame-action-error": "", children: fieldErrorLines.length > 0 ? fieldErrorLines.join(" ") : error.message }) : null,
        /* @__PURE__ */ jsxs3("div", { style: { display: "flex", gap: "0.5rem", justifyContent: "flex-end" }, children: [
          /* @__PURE__ */ jsx3(Button, { type: "button", variant: "outline", onClick: onCancel, "data-frame-action": "cancel", children: "Cancel" }),
          /* @__PURE__ */ jsx3(
            Button,
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
    return /* @__PURE__ */ jsx3(
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
  return useQuery({
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
    element: !notify && notice ? /* @__PURE__ */ jsxs3(
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
          /* @__PURE__ */ jsx3("span", { children: notice.message }),
          /* @__PURE__ */ jsx3(
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
import { Fragment as Fragment2, jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
function ListShell({
  resource,
  columns,
  onOpen,
  slots,
  manifest,
  onCellCommit,
  paginationPlacement = "both"
}) {
  const { can, registry, listSlots, transport } = useFrameInjection();
  const filters = useListFilters(resource);
  const query = useResourceList(resource, filters.requestParams);
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
    () => manifest ? ({ record }) => /* @__PURE__ */ jsx4(
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
      /* @__PURE__ */ jsx4(
        RowActions,
        {
          record,
          resource,
          actions: declaredRowActions,
          singularLabel: manifest?.singularLabel || void 0
        }
      )
    ) : recordActions.length > 0 ? ({ record }) => /* @__PURE__ */ jsxs4("div", { style: { display: "flex", gap: "0.25rem", justifyContent: "flex-end" }, children: [
      recordActions.length > 0 ? /* @__PURE__ */ jsx4(
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
      RowActions ? /* @__PURE__ */ jsx4(
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
  const controlsRef = useRef2(null);
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
  const paginationBar = pagination.props ? /* @__PURE__ */ jsx4(Pagination, { ...pagination.props }) : null;
  return /* @__PURE__ */ jsxs4("div", { "data-frame-shell": "list", children: [
    /* @__PURE__ */ jsxs4(
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
          /* @__PURE__ */ jsx4("div", { style: { flex: 1, minWidth: 0 }, children: FiltersSlot ? /* @__PURE__ */ jsx4(FiltersSlot, {}) : /* @__PURE__ */ jsx4(ListFilters, { ...filters }) }),
          /* @__PURE__ */ jsx4(
            ResourceActionBar,
            {
              resource,
              manifest,
              onNavigate: navigate,
              onNotice: notice.onNotice
            }
          ),
          /* @__PURE__ */ jsx4(
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
    query.isLoading ? /* @__PURE__ */ jsx4(Loading, {}) : query.isError ? (
      // BEFORE `rows.length === 0`, not after: a failed read also has zero rows, so
      // ordering these the other way is exactly the bug this branch exists to end —
      // every 5xx on every Frame list rendered as "No records." (api-surface-coherence 107).
      /* @__PURE__ */ jsx4(ErrorState, { error: query.error, retry: () => void query.refetch() })
    ) : /* @__PURE__ */ jsxs4(Fragment2, { children: [
      (showTopPagination || rows.length === 0 && showBottomPagination) && /* @__PURE__ */ jsx4("div", { className: "mb-3", children: paginationBar }),
      rows.length === 0 ? /* @__PURE__ */ jsx4(Empty, {}) : cardsPath && manifest ? /* @__PURE__ */ jsx4(
        Cards,
        {
          resource,
          rows,
          manifest,
          schema: rootSchema,
          onOpen,
          Card: BoundCard
        }
      ) : /* @__PURE__ */ jsx4(
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
      cell: (record) => /* @__PURE__ */ jsx4(
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

// src/EditShell.tsx
import { createFormIntentBus as createFormIntentBus2 } from "@schemastud/seam";
import { useCallback as useCallback2, useEffect, useMemo as useMemo4, useRef as useRef3, useState as useState4 } from "react";
import { flushSync as flushSync2 } from "react-dom";

// src/errors.ts
function isNotFound(error) {
  return typeof error === "object" && error !== null && "status" in error && error.status === 404;
}

// src/EditShell.tsx
import { Fragment as Fragment3, jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
function EditShell(props) {
  return /* @__PURE__ */ jsx5(EditShellRecord, { ...props }, JSON.stringify([props.resource, props.id]));
}
function EditShellRecord({
  resource,
  id,
  readOnly = false,
  container = "panel",
  form: formProp = "bare",
  showModeToggle = false,
  onSaved,
  onCancel,
  slots,
  manifest: manifestProp,
  onNavigate
}) {
  const { can, hooks, editSlots, primitives, manifestFor } = useFrameInjection();
  const manifest = manifestProp ?? manifestFor?.(resource);
  const notice = useInlineNotice();
  const [form, setForm] = useState4(formProp);
  const [formData, setFormData] = useState4({});
  const submitHandler = useRef3(null);
  const [canSubmit, setCanSubmit] = useState4(false);
  const registerSubmit = useCallback2((handler) => {
    submitHandler.current = handler;
    setCanSubmit(handler !== null);
  }, []);
  const dirty = useRef3(false);
  const intentBus = useMemo4(() => createFormIntentBus2(), []);
  const schemaQuery = useFormSchema(resource, form);
  const recordQuery = useResourceRecord(resource, id);
  const saveMutation = useSaveResource(resource);
  const schema = useMemo4(() => {
    const served = schemaQuery.data ?? { type: "object", properties: {} };
    return form === "bare" ? stripHostWidgets(served) : bridgeHostWidgets(served);
  }, [schemaQuery.data, form]);
  useEffect(() => {
    if (recordQuery.data && !dirty.current) setFormData(recordQuery.data);
  }, [recordQuery.data]);
  const FormBody = slots?.FormBody ?? editSlots?.FormBody ?? DefaultFormBody;
  const Toggle = slots?.Toggle ?? editSlots?.Toggle ?? DefaultToggle;
  const SaveBar = slots?.SaveBar ?? editSlots?.SaveBar ?? DefaultSaveBar;
  const Container = slots?.Container ?? (container === "page" ? PageContainer : container === "bare" ? BareContainer : editSlots?.Container ?? DefaultContainer);
  const effectiveReadOnly = readOnly || !can(id === null ? "create" : "update", resource);
  const readFailed = schemaQuery.isError || id !== null && recordQuery.isError;
  const ready = schemaQuery.data !== void 0 && (id === null || recordQuery.data !== void 0);
  const recordNotFound = id !== null && recordQuery.isError && isNotFound(recordQuery.error);
  const singularLabel = manifest?.singularLabel ?? resource;
  const heading = id === null ? `New ${singularLabel}` : singularLabel;
  const submit = (data) => {
    if (effectiveReadOnly || readFailed || !ready) return;
    saveMutation.mutate(
      { id, data },
      {
        onSuccess: (saved) => {
          dirty.current = false;
          setFormData(saved);
          hooks?.fireSubmitted(resource, saved, {
            resource,
            mode: id == null ? "create" : "edit"
          });
          onSaved?.(saved);
        }
      }
    );
  };
  if (schemaQuery.isLoading || id !== null && recordQuery.isLoading) {
    return /* @__PURE__ */ jsx5("div", { "data-frame-shell": "edit-loading", children: "Loading\u2026" });
  }
  const RetryButton = primitives.Button;
  const terminal = recordNotFound ? /* @__PURE__ */ jsx5(DefaultNotFound, { message: `This ${singularLabel.toLowerCase()} was not found.` }) : readFailed ? /* @__PURE__ */ jsxs5("div", { role: "alert", "data-frame-shell": "edit-error", children: [
    /* @__PURE__ */ jsx5("p", { children: schemaQuery.isError ? "Could not load this form." : "Could not load this record." }),
    /* @__PURE__ */ jsx5(
      RetryButton,
      {
        type: "button",
        onClick: () => {
          if (schemaQuery.isError) void schemaQuery.refetch();
          if (id !== null && recordQuery.isError) void recordQuery.refetch();
        },
        children: "Retry"
      }
    )
  ] }) : null;
  if (!ready) return /* @__PURE__ */ jsx5(Container, { children: terminal });
  return /* @__PURE__ */ jsx5(Container, { children: /* @__PURE__ */ jsxs5("div", { "data-frame-shell": "edit", children: [
    /* @__PURE__ */ jsx5("h1", { "data-frame-shell": "edit-heading", children: heading }),
    terminal,
    id !== null ? /* @__PURE__ */ jsxs5(Fragment3, { children: [
      notice.element,
      /* @__PURE__ */ jsx5(
        RecordActionButtons,
        {
          resource,
          manifest,
          record: { ...recordQuery.data ?? {}, id },
          onNavigate,
          onNotice: notice.onNotice
        }
      )
    ] }) : null,
    showModeToggle && !effectiveReadOnly ? /* @__PURE__ */ jsx5(Toggle, { value: form, onChange: setForm }) : null,
    /* @__PURE__ */ jsx5(
      FormBody,
      {
        schema,
        formData,
        intentBus,
        readOnly: effectiveReadOnly || readFailed,
        form,
        onChange: (data) => {
          dirty.current = true;
          setFormData(data);
        },
        onSubmit: submit,
        registerSubmit
      }
    ),
    saveMutation.isError && /* @__PURE__ */ jsx5("div", { role: "alert", "data-frame-shell": "save-error", children: saveMutation.error?.message || "Could not save changes." }),
    /* @__PURE__ */ jsx5(
      "div",
      {
        "data-frame-shell": "edit-bottom-spacer",
        "aria-hidden": "true",
        style: { height: "4rem", flex: "none" }
      }
    ),
    /* @__PURE__ */ jsx5(
      SaveBar,
      {
        saving: saveMutation.isPending,
        canSubmit,
        readOnly: effectiveReadOnly || readFailed,
        onSave: () => {
          if (!submitHandler.current || effectiveReadOnly || readFailed || !ready)
            return;
          flushSync2(() => intentBus.flushCommits());
          submitHandler.current?.();
        },
        onCancel
      }
    )
  ] }) });
}
function BareContainer({ children }) {
  return /* @__PURE__ */ jsx5(Fragment3, { children });
}
function PageContainer({ children }) {
  const { primitives } = useFrameInjection();
  const Page = primitives.Page;
  if (Page) {
    return /* @__PURE__ */ jsx5(Page, { "data-frame-slot": "Container", children });
  }
  return /* @__PURE__ */ jsx5("div", { "data-frame-slot": "Container", "data-frame-container": "page", children });
}

// src/WidgetShell.tsx
import { useContext as useContext3, useEffect as useEffect2, useState as useState6 } from "react";
import { WidgetRegistryContext as WidgetRegistryContext2 } from "@schemastud/seam";

// src/EditShellMount.tsx
import { createContext, useContext as useContext2, useMemo as useMemo5, useRef as useRef4, useState as useState5 } from "react";
import { jsx as jsx6 } from "react/jsx-runtime";
var EditShellMountContext = createContext(null);
function useEditShellMountController() {
  const [selectedNodeId, setSelectedNodeId] = useState5(null);
  const [dirty, setDirty] = useState5(false);
  const [saving, setSaving] = useState5(false);
  const [candidates, setCandidates] = useState5([]);
  const [conformance, setConformance] = useState5(null);
  const flushes = useRef4(/* @__PURE__ */ new Set());
  const revealHandler = useRef4(null);
  const insertHandler = useRef4(null);
  const nodeAccess = useRef4(null);
  return useMemo5(
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
  return /* @__PURE__ */ jsx6(EditShellMountContext.Provider, { value, children });
}
function useEditShellMount() {
  const value = useContext2(EditShellMountContext);
  if (!value) {
    throw new Error(
      '@schemastud/frame: useEditShellMount() outside an EditShellMount \u2014 a mounts:"widget" route (WidgetSurface) provides it.'
    );
  }
  return value;
}

// src/WidgetShell.tsx
import { jsx as jsx7, jsxs as jsxs6 } from "react/jsx-runtime";
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
  const contextRegistry = useContext3(WidgetRegistryContext2);
  const registry = registryProp ?? contextRegistry;
  const ownMount = useEditShellMountController();
  const mount = mountProp ?? ownMount;
  if (!registry) {
    return /* @__PURE__ */ jsx7("div", { "data-frame-shell": "widget-unbound", children: "No widget registry." });
  }
  const resolved = resolveWidgetFor(
    schema,
    "edit",
    { participates: true, widget, heavyweight: true },
    void 0,
    registry
  );
  const Widget = resolved.widget;
  if (typeof Widget !== "function") {
    return /* @__PURE__ */ jsxs6("div", { "data-frame-shell": "widget-unbound", "data-widget": widget, children: [
      "Widget \u201C",
      widget,
      "\u201D is not mounted (no registry match)."
    ] });
  }
  return /* @__PURE__ */ jsx7(EditShellMountProvider, { value: mount, children: /* @__PURE__ */ jsx7("div", { "data-frame-shell": "widget", "data-widget": widget, children: /* @__PURE__ */ jsx7(
    Widget,
    {
      schema,
      formData: record ?? {},
      value: record ?? {},
      onChange,
      onSubmit,
      readOnly,
      editShellMount: mount
    }
  ) }) });
}
function WidgetShell({ resource, id, widget, readOnly = false, onSaved }) {
  const { can } = useFrameInjection();
  const [formData, setFormData] = useState6({});
  const mount = useEditShellMountController();
  const schemaQuery = useFormSchema(resource, "enriched");
  const recordQuery = useResourceRecord(resource, id);
  const saveMutation = useSaveResource(resource);
  useEffect2(() => {
    if (recordQuery.data) setFormData(recordQuery.data);
  }, [recordQuery.data]);
  const effectiveReadOnly = readOnly || !can(id === null ? "create" : "update", resource);
  if (schemaQuery.isLoading || id !== null && recordQuery.isLoading) {
    return /* @__PURE__ */ jsx7("div", { "data-frame-shell": "widget-loading", children: "Loading\u2026" });
  }
  const schema = schemaQuery.data ?? { type: "object", properties: {} };
  const submit = async (data) => {
    if (effectiveReadOnly) return;
    await mount.flush();
    saveMutation.mutate({ id, data }, { onSuccess: (saved) => onSaved?.(saved) });
  };
  return /* @__PURE__ */ jsx7(
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

// src/mountDispatcher.tsx
import { createElement } from "react";
var isDev3 = () => Boolean(import.meta.env?.DEV);
function createMountDispatcher(options = {}) {
  const decline = (entry, reason) => {
    options.onDecline?.(entry, reason);
    return void 0;
  };
  return (entry) => {
    if (entry.mounts !== "redirect" && !entry.resource) {
      return decline(
        entry,
        `mounts: '${entry.mounts}' needs a resource, and this entry declares none`
      );
    }
    const resource = entry.resource;
    const idOf = () => options.resolveId ? options.resolveId(entry) : null;
    switch (entry.mounts) {
      case "widget": {
        if (!entry.widget) {
          return decline(entry, "mounts: 'widget' declares no widget name");
        }
        const widget = entry.widget;
        return () => createElement(WidgetShell, { resource, id: idOf(), widget });
      }
      case "edit":
      case "detail": {
        if (!options.resolveId) {
          return decline(
            entry,
            `mounts: '${entry.mounts}' needs resolveId \u2014 without it an edit route renders a create form`
          );
        }
        const readOnly = entry.mounts === "detail";
        return () => createElement(EditShell, {
          resource,
          id: idOf(),
          readOnly,
          // Full-page, not a drawer. See EditShell's PageContainer for why this used to be
          // a silent lie.
          container: "page",
          // The DECLARED form mode. Read at render, and omitted entirely when the
          // host wired no lookup or the resource is unknown — `undefined` lets
          // EditShell's own `'bare'` default stand rather than this dispatcher
          // restating it, so there is one place the default lives.
          form: options.formFor?.(resource)
        });
      }
      case "list": {
        if (!options.manifestFor && !options.columnsFor) {
          return decline(
            entry,
            "mounts: 'list' needs manifestFor (whose list-column participation IS the column set) or columnsFor"
          );
        }
        return () => {
          const onOpen = options.onOpenFor?.(entry);
          const manifest = options.manifestFor?.(resource);
          const columns = options.columnsFor?.(resource) ?? [];
          if (!manifest && columns.length === 0) {
            if (isDev3()) {
              console.warn(
                `[frame] mounts: 'list' for "${resource}" has no context manifest and no host columns yet \u2014 rendering nothing.`
              );
            }
            return null;
          }
          return createElement(ListShell, {
            resource,
            columns,
            manifest,
            onOpen
          });
        };
      }
      case "redirect":
        return decline(
          entry,
          "mounts: 'redirect' carries no destination \u2014 no DTO field exists for one, on either side of the seam"
        );
      default:
        return decline(
          entry,
          `mounts: '${String(entry.mounts)}' is not a verb this dispatcher renders`
        );
    }
  };
}

// src/FrameLayout.tsx
import {
  useEffect as useEffect3,
  useState as useState7
} from "react";
import {
  cn,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@schemastud/ui";
import { jsx as jsx8, jsxs as jsxs7 } from "react/jsx-runtime";
var WIDTH = {
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl"
};
function FrameLayoutShell({
  width = "5xl",
  canvas,
  className,
  children
}) {
  return /* @__PURE__ */ jsx8(
    "div",
    {
      className: cn("mx-auto space-y-6", WIDTH[width], canvas && "canvas-surface", className),
      "data-frame-layout-shell": true,
      "data-canvas": canvas,
      children
    }
  );
}
function SingleColumn({ width = "3xl", className, children }) {
  return /* @__PURE__ */ jsx8(FrameLayoutShell, { width, className, children: /* @__PURE__ */ jsx8("div", { className: "space-y-6", "data-grammar": "single", children }) });
}
function SubNavColumn({
  nav,
  active,
  onSelect,
  children,
  width = "5xl",
  className
}) {
  return /* @__PURE__ */ jsx8(FrameLayoutShell, { width, className, children: /* @__PURE__ */ jsxs7("div", { className: "flex flex-col gap-6 md:flex-row", "data-grammar": "subnav", children: [
    /* @__PURE__ */ jsx8("nav", { className: "flex gap-1 overflow-x-auto md:w-44 md:flex-none md:flex-col", children: nav.map((item) => /* @__PURE__ */ jsx8(
      "button",
      {
        type: "button",
        onClick: () => onSelect(item.key),
        "aria-current": item.key === active ? "page" : void 0,
        className: cn(
          "whitespace-nowrap rounded-md px-3 py-1.5 text-left text-[13px] font-medium transition-colors",
          item.key === active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        ),
        children: item.label
      },
      item.key
    )) }),
    /* @__PURE__ */ jsx8("div", { className: "min-w-0 flex-1", children })
  ] }) });
}
function useIsAtLeast(breakpoint) {
  const query = breakpoint === "lg" ? "(min-width: 1024px)" : "(min-width: 768px)";
  const [matches, setMatches] = useState7(true);
  useEffect3(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const sync = () => setMatches(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, [query]);
  return matches;
}
function DetailSheet({
  open,
  onOpenChange,
  title,
  description,
  SidePanel,
  children
}) {
  if (SidePanel) {
    return /* @__PURE__ */ jsx8(SidePanel, { open, onOpenChange, title, children });
  }
  return /* @__PURE__ */ jsx8(Sheet, { open, onOpenChange, children: /* @__PURE__ */ jsxs7(SheetContent, { side: "right", className: "sm:max-w-md", children: [
    (title || description) && /* @__PURE__ */ jsxs7(SheetHeader, { children: [
      title ? /* @__PURE__ */ jsx8(SheetTitle, { children: title }) : null,
      description ? /* @__PURE__ */ jsx8(SheetDescription, { children: description }) : null
    ] }),
    children
  ] }) });
}
function MasterDetail({
  master,
  detail,
  presentation = "inline",
  collapse = "stack",
  breakpoint = "md",
  width = "6xl",
  canvas = "dotted",
  className,
  sheetOpen,
  onSheetOpenChange,
  sheetTitle,
  sheetDescription,
  SidePanel
}) {
  const wide = useIsAtLeast(breakpoint);
  const sheetByPresentation = presentation === "sheet";
  const sheetByCollapse = collapse === "sheet" && !wide;
  const overlayDetail = sheetByPresentation || sheetByCollapse;
  const [selfOpen, setSelfOpen] = useState7(false);
  const open = sheetOpen ?? (selfOpen && detail != null);
  const setOpen = (next) => {
    setSelfOpen(next);
    onSheetOpenChange?.(next);
  };
  useEffect3(() => {
    if (sheetOpen === void 0 && overlayDetail && detail != null) setSelfOpen(true);
  }, [sheetOpen, overlayDetail, detail]);
  const twoCol = breakpoint === "lg" ? "lg:grid-cols-[1.35fr_1fr]" : "md:grid-cols-[300px_1fr]";
  const detailSticky = presentation === "panel" ? "" : "lg:sticky lg:top-2";
  if (overlayDetail) {
    return /* @__PURE__ */ jsxs7(FrameLayoutShell, { width, canvas, className, children: [
      /* @__PURE__ */ jsx8(
        "section",
        {
          className: "min-w-0 space-y-3",
          "data-grammar": "master-detail",
          "data-detail": "sheet",
          children: master
        }
      ),
      /* @__PURE__ */ jsx8(
        DetailSheet,
        {
          open,
          onOpenChange: setOpen,
          title: sheetTitle,
          description: sheetDescription,
          SidePanel,
          children: detail
        }
      )
    ] });
  }
  return /* @__PURE__ */ jsx8(FrameLayoutShell, { width, canvas, className, children: /* @__PURE__ */ jsxs7(
    "div",
    {
      className: cn("grid grid-cols-1 gap-6", twoCol),
      "data-grammar": "master-detail",
      "data-detail": presentation,
      "data-collapse": collapse,
      children: [
        /* @__PURE__ */ jsx8("section", { className: "min-w-0 space-y-3", children: master }),
        /* @__PURE__ */ jsx8("section", { className: cn("space-y-3", detailSticky), children: detail })
      ]
    }
  ) });
}
var LAYOUT_REGISTRY = {
  single: SingleColumn,
  subnav: SubNavColumn,
  "master-detail": MasterDetail
};
function FrameLayout({ variant, ...rest }) {
  const Plug = LAYOUT_REGISTRY[variant] ?? SingleColumn;
  return /* @__PURE__ */ jsx8(Plug, { ...rest });
}

// src/FiveRegionEditShell.tsx
import { useEffect as useEffect4, useRef as useRef6, useState as useState8 } from "react";
import { WidgetRegistryContext as WidgetRegistryContext3 } from "@schemastud/seam";

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
import { jsx as jsx9 } from "react/jsx-runtime";
var EMPTY_STYLE = { padding: 16, color: "var(--stud-ink-muted)", fontSize: 13 };
function Inspector() {
  const mount = useEditShellMount();
  const selectedNodeId = mount.selectedNodeId;
  const node = selectedNodeId !== null ? mount.getNode(selectedNodeId) : null;
  if (selectedNodeId === null || node === null) {
    return /* @__PURE__ */ jsx9("div", { "data-frame-region": "inspector", "data-frame-inspector-empty": "", style: EMPTY_STYLE, children: "Select a block to edit" });
  }
  return /* @__PURE__ */ jsx9("div", { "data-frame-region": "inspector", "data-node-type": node.type, children: /* @__PURE__ */ jsx9(
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
import { jsx as jsx10, jsxs as jsxs8 } from "react/jsx-runtime";
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
  return /* @__PURE__ */ jsx10("div", { "data-frame-missing-slots": "", children: slots.map((slot) => {
    const missing = Math.max(0, slot.min - slot.filled);
    return /* @__PURE__ */ jsxs8(
      "div",
      {
        "data-missing-slot": "",
        "data-parent-id": slot.parentId,
        "data-category": slot.category,
        style: CARD,
        children: [
          /* @__PURE__ */ jsxs8("span", { children: [
            "Missing: ",
            missing,
            " ",
            slot.category
          ] }),
          /* @__PURE__ */ jsx10(
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
import { jsx as jsx11, jsxs as jsxs9 } from "react/jsx-runtime";
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
    return /* @__PURE__ */ jsx11("div", { "data-frame-region-stub": "palette", style: EMPTY_STYLE2, children: "Nothing insertable here" });
  }
  return /* @__PURE__ */ jsx11("div", { "data-frame-palette": "", style: PANE_STYLE, children: candidates.map((candidate, index) => /* @__PURE__ */ jsxs9(
    "button",
    {
      type: "button",
      "data-node-type": candidate.nodeType,
      onClick: () => mount.insert(candidate),
      style: ITEM_STYLE,
      children: [
        /* @__PURE__ */ jsx11("span", { children: candidate.label ?? candidate.category ?? candidate.nodeType }),
        affordances(candidate).map((label) => /* @__PURE__ */ jsx11("span", { "data-affordance": "", style: AFFORDANCE_STYLE, children: label }, label))
      ]
    },
    `${candidate.nodeType}:${index}`
  )) });
}

// src/SavePill.tsx
import { jsx as jsx12 } from "react/jsx-runtime";
var BASE = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "2px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 500
};
var BY_STATE = {
  saved: { label: "Saved", style: { background: "var(--stud-success-tint)", color: "var(--stud-success)" } },
  saving: { label: "Saving\u2026", style: { background: "var(--stud-warning-tint)", color: "var(--stud-warning)" } },
  unsaved: { label: "Unsaved", style: { background: "var(--stud-danger-tint)", color: "var(--stud-danger)" } }
};
function SavePill() {
  const mount = useEditShellMount();
  const state = mount.saving ? "saving" : mount.dirty ? "unsaved" : "saved";
  const { label, style } = BY_STATE[state];
  return /* @__PURE__ */ jsx12("span", { "data-frame-save-pill": state, style: { ...BASE, ...style }, children: label });
}

// src/StatusBar.tsx
import { useRef as useRef5 } from "react";
import { jsx as jsx13, jsxs as jsxs10 } from "react/jsx-runtime";
var BAR = { display: "flex", alignItems: "center", gap: 12 };
var SEG = { display: "inline-flex", gap: 4 };
var CONTROL = { ...SEG, cursor: "pointer", textDecoration: "underline dotted", border: "none", background: "none", font: "inherit", color: "inherit", padding: 0 };
function StatusBar() {
  const mount = useEditShellMount();
  const c = mount.conformance;
  const cursor = useRef5(0);
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
  return /* @__PURE__ */ jsxs10("div", { "data-frame-status-bar": "", style: BAR, children: [
    /* @__PURE__ */ jsxs10("span", { "data-status-seg": "nodes", style: SEG, children: [
      nodes,
      " nodes"
    ] }),
    /* @__PURE__ */ jsxs10("span", { "data-status-seg": "required", style: SEG, children: [
      requiredTotal,
      " required (",
      requiredFilled,
      " of ",
      requiredTotal,
      ")"
    ] }),
    complete ? /* @__PURE__ */ jsx13("span", { "data-status-seg": "complete", style: SEG, children: "complete" }) : /* @__PURE__ */ jsx13("button", { type: "button", "data-status-seg": "incomplete", onClick: cycleIncomplete, style: CONTROL, children: "incomplete" }),
    /* @__PURE__ */ jsxs10("span", { "data-status-seg": "grammar", "data-grammar": grammarValid ? "valid" : "invalid", style: SEG, children: [
      "grammar ",
      grammarValid ? "\u2713 valid" : "\u2717"
    ] })
  ] });
}

// src/FiveRegionEditShell.tsx
import { Fragment as Fragment4, jsx as jsx14, jsxs as jsxs11 } from "react/jsx-runtime";
var REGION_BODY = { display: "flex", alignItems: "stretch", minHeight: 0 };
var PALETTE_STYLE = { flex: "0 0 200px", borderRight: "1px solid var(--stud-line)" };
var CANVAS_STYLE = { flex: "1 1 auto", minWidth: 0, overflow: "auto" };
var INSPECTOR_STYLE = { flex: "0 0 300px", borderLeft: "1px solid var(--stud-line)" };
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
  status,
  autosave = true,
  onSave,
  sourceToggle = true,
  collapseLevel
}) {
  const mount = useEditShellMountController();
  const [mode, setMode] = useState8("rich");
  const shellRef = useRef6(null);
  const [autoLevel, setAutoLevel] = useState8(0);
  useEffect4(() => {
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
  const shell = /* @__PURE__ */ jsx14(EditShellMountProvider, { value: mount, children: /* @__PURE__ */ jsxs11(
    "div",
    {
      ref: shellRef,
      "data-frame-shell": "edit-five",
      "data-collapse-level": collapseLevel ?? autoLevel,
      style: { display: "flex", flexDirection: "column", minHeight: 0 },
      children: [
        /* @__PURE__ */ jsxs11(
          "div",
          {
            "data-frame-region": "top-bar",
            style: { ...BAR_STYLE, display: "flex", alignItems: "center", gap: 8 },
            children: [
              /* @__PURE__ */ jsx14(SavePill, {}),
              !autosave && /* @__PURE__ */ jsx14("button", { type: "button", "data-frame-save-action": "", onClick: () => onSave?.(), children: "Save" }),
              sourceToggle && /* @__PURE__ */ jsxs11("span", { "data-frame-mode-toggle": "", role: "group", style: { marginLeft: "auto" }, children: [
                /* @__PURE__ */ jsx14(
                  "button",
                  {
                    type: "button",
                    "data-mode": "rich",
                    "aria-pressed": mode === "rich",
                    onClick: () => setMode("rich"),
                    children: "Rich"
                  }
                ),
                /* @__PURE__ */ jsx14(
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
              topBar ?? null
            ]
          }
        ),
        /* @__PURE__ */ jsxs11("div", { "data-frame-region": "body", style: REGION_BODY, children: [
          /* @__PURE__ */ jsx14("div", { "data-frame-region": "palette", "data-palette-mode": regions.palette, style: PALETTE_STYLE, children: palette ?? /* @__PURE__ */ jsx14(PalettePane, {}) }),
          /* @__PURE__ */ jsx14(
            "div",
            {
              "data-frame-region": "canvas",
              "data-full-bleed": regions.canvasFullBleed ? "" : void 0,
              style: CANVAS_STYLE,
              children: mode === "source" ? /* @__PURE__ */ jsx14("pre", { "data-frame-source-view": "", style: { margin: 0, padding: 12, fontSize: 12 }, children: JSON.stringify(record ?? {}, null, 2) }) : /* @__PURE__ */ jsxs11(Fragment4, { children: [
                /* @__PURE__ */ jsx14(MissingSlots, {}),
                /* @__PURE__ */ jsx14(
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
          /* @__PURE__ */ jsx14(
            "div",
            {
              "data-frame-region": "inspector-region",
              "data-inspector-mode": regions.inspector,
              style: INSPECTOR_STYLE,
              children: /* @__PURE__ */ jsx14(Inspector, {})
            }
          )
        ] }),
        /* @__PURE__ */ jsx14("div", { "data-frame-region": "status", style: STATUS_STYLE, children: status ?? /* @__PURE__ */ jsx14(StatusBar, {}) })
      ]
    }
  ) });
  return registry ? /* @__PURE__ */ jsx14(WidgetRegistryContext3.Provider, { value: registry, children: shell }) : shell;
}

// src/FormResolver.ts
function kindOfSchema(schema) {
  const id = typeof schema.$id === "string" ? schema.$id : "";
  return id.split("/").pop() ?? "";
}
function createFormResolver() {
  const byKind = /* @__PURE__ */ new Map();
  const predicates = [];
  return {
    registerFormForSchema(match, form) {
      if (typeof match === "string") {
        byKind.set(match, form);
      } else {
        predicates.unshift([match, form]);
      }
    },
    resolveFormForSchema(schema) {
      if (typeof schema["x-widget"] === "string") {
        return { form: null, reason: "x-widget" };
      }
      const kind = kindOfSchema(schema);
      if (kind !== "") {
        const hit = byKind.get(kind);
        if (hit) return { form: hit, reason: "by-kind" };
      }
      for (const [predicate, form] of predicates) {
        if (predicate(schema)) return { form, reason: "by-predicate" };
      }
      return { form: null, reason: "generic" };
    }
  };
}

// src/resolveSkinFor.ts
function resolveSkinFor(nodeType, schema, registry) {
  const raw = schema?.["x-skin"];
  const override = typeof raw === "string" && raw !== "" ? raw : void 0;
  const key = override ?? nodeType;
  return {
    skin: registry.resolveSkin(key),
    key,
    source: override !== void 0 ? "override" : "node-type",
    fallback: !registry.hasSkin(key)
  };
}

// src/hooks.ts
function createFrameHooks() {
  const handlers = /* @__PURE__ */ new Map();
  return {
    onSubmitted(resource, handler) {
      let set = handlers.get(resource);
      if (!set) {
        set = /* @__PURE__ */ new Set();
        handlers.set(resource, set);
      }
      set.add(handler);
      return () => {
        const current = handlers.get(resource);
        if (!current) return;
        current.delete(handler);
        if (current.size === 0) handlers.delete(resource);
      };
    },
    fireSubmitted(resource, record, ctx) {
      const set = handlers.get(resource);
      if (!set) return;
      for (const handler of [...set]) {
        handler(record, ctx);
      }
    }
  };
}

// src/frameSidePanel.ts
import { create } from "zustand";
var useFrameSidePanelStore = create((set) => ({
  panels: [],
  publish: (entry) => set((s) => {
    const idx = s.panels.findIndex((p) => p.id === entry.id);
    if (idx === -1) return { panels: [...s.panels, entry] };
    const next = s.panels.slice();
    next[idx] = entry;
    return { panels: next };
  }),
  remove: (id) => set((s) => ({ panels: s.panels.filter((p) => p.id !== id) }))
}));

// src/routes.ts
import { createElement as createElement2 } from "react";
function createRouteRegistry() {
  const routes = /* @__PURE__ */ new Map();
  return {
    registerRoute(routeName, component) {
      routes.set(routeName, component);
    },
    hasRoute(routeName) {
      return routes.has(routeName);
    },
    resolveRoute(routeName) {
      return routes.get(routeName);
    },
    routeNames() {
      return [...routes.keys()];
    }
  };
}
function createGuardRegistry() {
  const guards = /* @__PURE__ */ new Map();
  return {
    registerGuard(key, component) {
      guards.set(key, component);
    },
    hasGuard(key) {
      return guards.has(key);
    },
    resolveGuard(key) {
      return guards.get(key);
    }
  };
}
function createShellRegistry() {
  const shells = /* @__PURE__ */ new Map();
  return {
    registerShell(key, component) {
      shells.set(key, component);
    },
    hasShell(key) {
      return shells.has(key);
    },
    resolveShell(key) {
      return shells.get(key);
    }
  };
}
function assertRouteContext(entries, registry, options = {}) {
  const seen = /* @__PURE__ */ new Set();
  for (const entry of entries) {
    if (seen.has(entry.routeName)) {
      throw new Error(
        `[frame] duplicate routeName "${entry.routeName}" in the RouteContext \u2014 every route identity must be unique.`
      );
    }
    seen.add(entry.routeName);
    if (typeof entry.path !== "string") {
      throw new Error(
        `[frame] RouteContext entry "${entry.routeName}" has a non-string path \u2014 RouteContext is flat; nesting is hand-written.`
      );
    }
    if (!registry.hasRoute(entry.routeName)) {
      if (options.unbound === "report") {
        options.onUnbound?.(entry);
        continue;
      }
      throw new Error(
        `[frame] RouteContext entry "${entry.routeName}" (${entry.path}) has no component bound in the RouteRegistry.`
      );
    }
  }
}
function buildRealmRoutes(entries, registries) {
  const routes = [];
  const shellGroups = /* @__PURE__ */ new Map();
  const leafElement = (entry) => {
    const Component = registries.routes.resolveRoute(entry.routeName) ?? registries.fallback?.(entry);
    if (!Component) {
      registries.onUnbound?.(entry);
      return null;
    }
    let element = createElement2(Component);
    const Guard = entry.guard ? registries.guards.resolveGuard(entry.guard) : void 0;
    if (Guard) {
      element = createElement2(Guard, null, element);
    }
    return element;
  };
  for (const entry of entries) {
    const Shell = entry.shell && entry.shell !== "app" ? registries.shells?.resolveShell(entry.shell) : void 0;
    if (!Shell || !entry.shell) {
      const element2 = leafElement(entry);
      if (element2) {
        routes.push({ path: entry.path, element: element2 });
      }
      continue;
    }
    let children = shellGroups.get(entry.shell);
    if (!children) {
      children = [...registries.shellChildren?.[entry.shell] ?? []];
      shellGroups.set(entry.shell, children);
      routes.push({ path: entry.shell, element: createElement2(Shell), children });
    }
    const element = leafElement(entry);
    if (element) {
      children.push({ path: entry.path, element });
    }
  }
  return routes;
}

// src/index.ts
import {
  createWidgetRegistry,
  createFormIntentBus as createFormIntentBus3,
  widgetFormContext,
  SchemaForm as SchemaForm2
} from "@schemastud/seam";
import {
} from "@schemastud/facets";

// src/resourcePage.ts
function isRow(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parseResourcePage(value) {
  const invalid = () => new Error("Resource returned invalid pagination.");
  if (!isRow(value) || !Array.isArray(value.data) || !value.data.every(isRow)) throw invalid();
  const { data, perPage } = value;
  if (typeof perPage !== "number" || !Number.isSafeInteger(perPage) || perPage < 1)
    throw invalid();
  if ("nextCursor" in value) {
    const { nextCursor } = value;
    if ("page" in value || "total" in value || !(nextCursor === null || typeof nextCursor === "string" && nextCursor.length > 0))
      throw invalid();
    return { data, perPage, nextCursor };
  }
  const { page, total } = value;
  if (typeof page !== "number" || !Number.isSafeInteger(page) || page < 1 || typeof total !== "number" || !Number.isSafeInteger(total) || total < 0)
    throw invalid();
  return { data, perPage, page, total };
}

// src/resourceTransport.ts
function createResourceTransport(crud, http) {
  async function getFilterSchema(resource, variant) {
    const response = await http.read(
      `${http.resourceUrl(resource)}/filters/${variant ? `${encodeURIComponent(variant)}/` : ""}schema`
    );
    return {
      ...response.data,
      savedViewsResource: response.savedViewsResource ?? void 0,
      savedViewsCan: response.savedViewsCan ?? void 0
    };
  }
  async function savedResource(resource, variant) {
    const schema = await getFilterSchema(resource, variant);
    if (!schema.savedViewsResource) {
      throw new Error(`Saved views are unavailable for resource "${resource}".`);
    }
    return schema.savedViewsResource;
  }
  const write = http.write;
  return {
    ...crud,
    // An action's form schema rides the resource root like every other frame read.
    getActionSchema: (resource, action) => http.read(`${http.resourceUrl(resource)}/actions/${encodeURIComponent(action)}/schema`),
    ...write ? {
      async invoke(action, target) {
        const body = await write(
          action.method,
          actionUrl(action, target.id),
          action.input === null ? void 0 : target.data ?? {}
        );
        return { message: body?.message ?? null, data: body?.data };
      }
    } : {},
    summary: (resource, params) => http.read(`${http.resourceUrl(resource)}/summary`, params),
    getFilterSchema,
    async getFilterVariants(resource) {
      const response = await http.read(
        `${http.resourceUrl(resource)}/filters/variants`
      );
      return response.data;
    },
    async getFilterOptions(resource, ref, search) {
      const response = await http.read(
        `${http.resourceUrl(resource)}/filters/options/${encodeURIComponent(ref)}`,
        { search }
      );
      return response.data;
    },
    async getSavedFilters(resource, variant) {
      const schema = await getFilterSchema(resource, variant);
      if (!schema.savedViewsResource) return [];
      const rows = [];
      let mode;
      let page = 1;
      let cursor;
      const seen = /* @__PURE__ */ new Set();
      for (; ; ) {
        const result = parseResourcePage(
          await crud.list(schema.savedViewsResource, {
            "filter[resource]": resource,
            ...variant ? { filterVariant: variant } : {},
            ...cursor ? { cursor } : { page: String(page) },
            per_page: "25"
          })
        );
        const currentMode = "nextCursor" in result ? "cursor" : "offset";
        if (mode && mode !== currentMode)
          throw new Error("Saved views changed pagination mode.");
        mode = currentMode;
        rows.push(...result.data);
        if ("nextCursor" in result) {
          if (result.nextCursor === null) return rows;
          if (seen.has(result.nextCursor))
            throw new Error("Saved views returned cyclic pagination.");
          if (result.data.length === 0)
            throw new Error("Saved views returned an incomplete page.");
          seen.add(result.nextCursor);
          cursor = result.nextCursor;
        } else {
          if (result.page !== page)
            throw new Error("Saved views returned invalid pagination.");
          if (result.page * result.perPage >= result.total) {
            if (rows.length !== result.total)
              throw new Error("Saved views returned an incomplete page.");
            return rows;
          }
          if (result.data.length !== result.perPage)
            throw new Error("Saved views returned an incomplete page.");
          page++;
        }
      }
    },
    async saveFilter(resource, payload) {
      return crud.create(
        await savedResource(resource, payload.queryParameters.filterVariant),
        {
          ...payload,
          resource
        }
      );
    },
    async deleteSavedFilter(resource, id, variant) {
      await crud.remove(await savedResource(resource, variant), id);
    }
  };
}

// src/index.ts
import { useBrowserUrlState } from "@schemastud/facets";
export {
  ActionButton,
  CARD_WIDGETS,
  COLUMN_KINDS,
  DashboardCard,
  DeclaredCell,
  DefaultCards,
  DefaultCell,
  DefaultContainer,
  DefaultEmpty,
  DefaultErrorState,
  DefaultFormBody,
  DefaultLoading,
  DefaultNotFound,
  DefaultPagination,
  DefaultRowActions,
  DefaultSaveBar,
  DefaultTable,
  DefaultToggle,
  DefaultToolbar,
  EditShell,
  EditShellMountProvider,
  EditableCell,
  FRAME_CONTEXT_KEYWORD,
  FigureCard,
  FiveRegionEditShell,
  FrameActionError,
  FrameLayout,
  FrameLayoutShell,
  FrameProvider,
  INHERITS,
  Inspector,
  KNOWN_CONTEXTS,
  KNOWN_ROW_ACTIONS,
  ListShell,
  MasterDetail,
  MissingSlots,
  NavTile,
  PalettePane,
  RecentList,
  RecordActionButtons,
  RecordLine,
  ResourceActionBar,
  ResourceRefWidget,
  STUD_RESOURCE_REF_KEYWORD,
  STUD_WIDGET_KEYWORD,
  STUD_WIDGET_OPTIONS_KEYWORD,
  SavePill,
  SchemaForm2 as SchemaForm,
  SchemaView,
  SingleColumn,
  StatRow,
  StatusBar,
  SubNavColumn,
  WelcomePanel,
  WidgetShell,
  WidgetSurface,
  actionUrl,
  assertRouteContext,
  bridgeHostWidgets,
  buildRealmRoutes,
  collapseModes,
  createFormIntentBus3 as createFormIntentBus,
  createFormResolver,
  createFrameHooks,
  createGuardRegistry,
  createMountDispatcher,
  createNoun,
  createResourceTransport,
  createRouteRegistry,
  createShellRegistry,
  createWidgetRegistry,
  dashboardRowRenders,
  deriveCollapseLevel,
  formatRecordTime,
  getPath,
  isNotFound,
  kindOfSchema,
  listItemRendersCards,
  navigateTarget,
  parseResourcePage,
  readResourceRefConfig,
  registerCardWidgets,
  registerResourceRefWidget,
  resolveActions,
  resolveColumns,
  resolveDashboardCard,
  resolveDeclaredCell,
  resolveRowActions,
  resolveSkinFor,
  resolveWidgetFor,
  resourceQueryKey,
  stripHostWidgets,
  useBrowserUrlState,
  useEditShellMount,
  useEditShellMountController,
  useFormSchema,
  useFrameInjection,
  useFrameSidePanelStore,
  useInlineNotice,
  useRemoveResource,
  useResourceList,
  useResourceRecord,
  useSaveResource,
  widgetFormContext
};
//# sourceMappingURL=index.js.map