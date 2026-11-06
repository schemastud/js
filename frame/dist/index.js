import {
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
  EMPTY_SELECTION,
  EditableCell,
  FRAME_CONTEXT_KEYWORD,
  FigureCard,
  FrameActionError,
  FrameProvider,
  INHERITS,
  KIND_PLACEMENTS,
  KIND_VARIANT_FOR,
  KNOWN_CONTEXTS,
  KNOWN_ROW_ACTIONS,
  ListShell,
  NavTile,
  RECORD_PLACEMENTS,
  RecentList,
  RecordActionButtons,
  RecordLine,
  ResourceActionBar,
  ResourcePickerWidget,
  ResourceRecordPicker,
  ResourceRefWidget,
  STUD_RESOURCE_REF_KEYWORD,
  STUD_WIDGET_KEYWORD,
  STUD_WIDGET_OPTIONS_KEYWORD,
  SchemaView,
  StatRow,
  TrendCard,
  WelcomePanel,
  actionUrl,
  bridgeHostWidgets,
  createMemoryUrlState,
  createNoun,
  dashboardRowRenders,
  describeTrend,
  followFilters,
  forecastBoundary,
  formatRecordTime,
  getPath,
  isEmptySelection,
  isPicked,
  isResourceRefNode,
  listItemRendersCards,
  navigateTarget,
  pageState,
  readResourceRefConfig,
  registerCardWidgets,
  registerFrameWidgets,
  registerResourceRefWidget,
  resolveActions,
  resolveColumns,
  resolveDashboardCard,
  resolveDeclaredCell,
  resolveKindPlacement,
  resolveRecordPlacement,
  resolveRowActions,
  resolveWidgetFor,
  resourceQueryKey,
  selectAllMatching,
  selectionCount,
  selectionFromValue,
  selectionToSearch,
  selectionToValue,
  setPagePicked,
  stripHostWidgets,
  togglePick,
  trendSegments,
  trendSeries,
  useFormSchema,
  useFrameInjection,
  useInlineNotice,
  useOptionalFrameInjection,
  useRemoveResource,
  useResourceList,
  useResourceRecord,
  useSaveResource
} from "./chunk-Z4PKLMYX.js";

// src/EditShell.tsx
import { createFormIntentBus } from "@schemastud/seam";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

// src/errors.ts
function isNotFound(error) {
  return typeof error === "object" && error !== null && "status" in error && error.status === 404;
}

// src/EditShell.tsx
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
function EditShell(props) {
  return /* @__PURE__ */ jsx(EditShellRecord, { ...props }, JSON.stringify([props.resource, props.id, props.schemaPurpose ?? "write"]));
}
function EditShellRecord({
  resource,
  id,
  readOnly = false,
  schemaPurpose = "write",
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
  const [form, setForm] = useState(formProp);
  const [formData, setFormData] = useState({});
  const submitHandler = useRef(null);
  const [canSubmit, setCanSubmit] = useState(false);
  const registerSubmit = useCallback((handler) => {
    submitHandler.current = handler;
    setCanSubmit(handler !== null);
  }, []);
  const dirty = useRef(false);
  const intentBus = useMemo(() => createFormIntentBus(), []);
  const schemaQuery = useFormSchema(resource, form, id === null ? "write" : schemaPurpose);
  const recordQuery = useResourceRecord(resource, id);
  const saveMutation = useSaveResource(resource);
  const schema = useMemo(() => {
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
    return /* @__PURE__ */ jsx("div", { "data-frame-shell": "edit-loading", children: "Loading\u2026" });
  }
  const RetryButton = primitives.Button;
  const terminal = recordNotFound ? /* @__PURE__ */ jsx(DefaultNotFound, { message: `This ${singularLabel.toLowerCase()} was not found.` }) : readFailed ? /* @__PURE__ */ jsxs("div", { role: "alert", "data-frame-shell": "edit-error", children: [
    /* @__PURE__ */ jsx("p", { children: schemaQuery.isError ? "Could not load this form." : "Could not load this record." }),
    /* @__PURE__ */ jsx(
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
  if (!ready) return /* @__PURE__ */ jsx(Container, { children: terminal });
  return /* @__PURE__ */ jsx(Container, { children: /* @__PURE__ */ jsxs("div", { "data-frame-shell": "edit", children: [
    /* @__PURE__ */ jsx("h1", { "data-frame-shell": "edit-heading", children: heading }),
    terminal,
    id !== null ? /* @__PURE__ */ jsxs(Fragment, { children: [
      notice.element,
      /* @__PURE__ */ jsx(
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
    showModeToggle && !effectiveReadOnly ? /* @__PURE__ */ jsx(Toggle, { value: form, onChange: setForm }) : null,
    /* @__PURE__ */ jsx(
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
    saveMutation.isError && /* @__PURE__ */ jsx("div", { role: "alert", "data-frame-shell": "save-error", children: saveMutation.error?.message || "Could not save changes." }),
    /* @__PURE__ */ jsx(
      "div",
      {
        "data-frame-shell": "edit-bottom-spacer",
        "aria-hidden": "true",
        style: { height: "4rem", flex: "none" }
      }
    ),
    /* @__PURE__ */ jsx(
      SaveBar,
      {
        saving: saveMutation.isPending,
        canSubmit,
        readOnly: effectiveReadOnly || readFailed,
        onSave: () => {
          if (!submitHandler.current || effectiveReadOnly || readFailed || !ready)
            return;
          flushSync(() => intentBus.flushCommits());
          submitHandler.current?.();
        },
        onCancel
      }
    )
  ] }) });
}
function BareContainer({ children }) {
  return /* @__PURE__ */ jsx(Fragment, { children });
}
function PageContainer({ children }) {
  const { primitives } = useFrameInjection();
  const Page = primitives.Page;
  if (Page) {
    return /* @__PURE__ */ jsx(Page, { "data-frame-slot": "Container", children });
  }
  return /* @__PURE__ */ jsx("div", { "data-frame-slot": "Container", "data-frame-container": "page", children });
}

// src/WidgetShell.tsx
import { useContext as useContext2, useEffect as useEffect2, useState as useState3 } from "react";
import { WidgetRegistryContext } from "@schemastud/seam";

// src/EditShellMount.tsx
import { createContext, useContext, useMemo as useMemo2, useRef as useRef2, useState as useState2 } from "react";
import { jsx as jsx2 } from "react/jsx-runtime";
var EditShellMountContext = createContext(null);
function useEditShellMountController() {
  const [selectedNodeId, setSelectedNodeId] = useState2(null);
  const [dirty, setDirty] = useState2(false);
  const [saving, setSaving] = useState2(false);
  const [candidates, setCandidates] = useState2([]);
  const [conformance, setConformance] = useState2(null);
  const flushes = useRef2(/* @__PURE__ */ new Set());
  const revealHandler = useRef2(null);
  const insertHandler = useRef2(null);
  const nodeAccess = useRef2(null);
  return useMemo2(
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
  return /* @__PURE__ */ jsx2(EditShellMountContext.Provider, { value, children });
}
function useEditShellMount() {
  const value = useContext(EditShellMountContext);
  if (!value) {
    throw new Error(
      '@schemastud/frame: useEditShellMount() outside an EditShellMount \u2014 a mounts:"widget" route (WidgetSurface) provides it.'
    );
  }
  return value;
}

// src/WidgetShell.tsx
import { jsx as jsx3, jsxs as jsxs2 } from "react/jsx-runtime";
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
  const contextRegistry = useContext2(WidgetRegistryContext);
  const registry = registryProp ?? contextRegistry;
  const ownMount = useEditShellMountController();
  const mount = mountProp ?? ownMount;
  if (!registry) {
    return /* @__PURE__ */ jsx3("div", { "data-frame-shell": "widget-unbound", children: "No widget registry." });
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
    return /* @__PURE__ */ jsxs2("div", { "data-frame-shell": "widget-unbound", "data-widget": widget, children: [
      "Widget \u201C",
      widget,
      "\u201D is not mounted (no registry match)."
    ] });
  }
  return /* @__PURE__ */ jsx3(EditShellMountProvider, { value: mount, children: /* @__PURE__ */ jsx3("div", { "data-frame-shell": "widget", "data-widget": widget, children: /* @__PURE__ */ jsx3(
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
  const [formData, setFormData] = useState3({});
  const mount = useEditShellMountController();
  const schemaQuery = useFormSchema(resource, "enriched");
  const recordQuery = useResourceRecord(resource, id);
  const saveMutation = useSaveResource(resource);
  useEffect2(() => {
    if (recordQuery.data) setFormData(recordQuery.data);
  }, [recordQuery.data]);
  const effectiveReadOnly = readOnly || !can(id === null ? "create" : "update", resource);
  if (schemaQuery.isLoading || id !== null && recordQuery.isLoading) {
    return /* @__PURE__ */ jsx3("div", { "data-frame-shell": "widget-loading", children: "Loading\u2026" });
  }
  const schema = schemaQuery.data ?? { type: "object", properties: {} };
  const submit = async (data) => {
    if (effectiveReadOnly) return;
    await mount.flush();
    saveMutation.mutate({ id, data }, { onSuccess: (saved) => onSaved?.(saved) });
  };
  return /* @__PURE__ */ jsx3(
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
var isDev = () => Boolean(import.meta.env?.DEV);
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
            if (isDev()) {
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
  useState as useState4
} from "react";
import {
  cn,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@schemastud/ui";
import { jsx as jsx4, jsxs as jsxs3 } from "react/jsx-runtime";
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
  return /* @__PURE__ */ jsx4(
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
  return /* @__PURE__ */ jsx4(FrameLayoutShell, { width, className, children: /* @__PURE__ */ jsx4("div", { className: "space-y-6", "data-grammar": "single", children }) });
}
function SubNavColumn({
  nav,
  active,
  onSelect,
  children,
  width = "5xl",
  className
}) {
  return /* @__PURE__ */ jsx4(FrameLayoutShell, { width, className, children: /* @__PURE__ */ jsxs3("div", { className: "flex flex-col gap-6 md:flex-row", "data-grammar": "subnav", children: [
    /* @__PURE__ */ jsx4("nav", { className: "flex gap-1 overflow-x-auto md:w-44 md:flex-none md:flex-col", children: nav.map((item) => /* @__PURE__ */ jsx4(
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
    /* @__PURE__ */ jsx4("div", { className: "min-w-0 flex-1", children })
  ] }) });
}
function useIsAtLeast(breakpoint) {
  const query = breakpoint === "lg" ? "(min-width: 1024px)" : "(min-width: 768px)";
  const [matches2, setMatches] = useState4(true);
  useEffect3(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const sync = () => setMatches(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, [query]);
  return matches2;
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
    return /* @__PURE__ */ jsx4(SidePanel, { open, onOpenChange, title, children });
  }
  return /* @__PURE__ */ jsx4(Sheet, { open, onOpenChange, children: /* @__PURE__ */ jsxs3(SheetContent, { side: "right", className: "sm:max-w-md", children: [
    (title || description) && /* @__PURE__ */ jsxs3(SheetHeader, { children: [
      title ? /* @__PURE__ */ jsx4(SheetTitle, { children: title }) : null,
      description ? /* @__PURE__ */ jsx4(SheetDescription, { children: description }) : null
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
  const [selfOpen, setSelfOpen] = useState4(false);
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
    return /* @__PURE__ */ jsxs3(FrameLayoutShell, { width, canvas, className, children: [
      /* @__PURE__ */ jsx4(
        "section",
        {
          className: "min-w-0 space-y-3",
          "data-grammar": "master-detail",
          "data-detail": "sheet",
          children: master
        }
      ),
      /* @__PURE__ */ jsx4(
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
  return /* @__PURE__ */ jsx4(FrameLayoutShell, { width, canvas, className, children: /* @__PURE__ */ jsxs3(
    "div",
    {
      className: cn("grid grid-cols-1 gap-6", twoCol),
      "data-grammar": "master-detail",
      "data-detail": presentation,
      "data-collapse": collapse,
      children: [
        /* @__PURE__ */ jsx4("section", { className: "min-w-0 space-y-3", children: master }),
        /* @__PURE__ */ jsx4("section", { className: cn("space-y-3", detailSticky), children: detail })
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
  return /* @__PURE__ */ jsx4(Plug, { ...rest });
}

// src/FiveRegionEditShell.tsx
import { useEffect as useEffect5, useRef as useRef5, useState as useState6 } from "react";
import { WidgetRegistryContext as WidgetRegistryContext2 } from "@schemastud/seam";

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
import { jsx as jsx5 } from "react/jsx-runtime";
var EMPTY_STYLE = { padding: 16, color: "var(--stud-ink-muted)", fontSize: 13 };
function Inspector() {
  const mount = useEditShellMount();
  const selectedNodeId = mount.selectedNodeId;
  const node = selectedNodeId !== null ? mount.getNode(selectedNodeId) : null;
  if (selectedNodeId === null || node === null) {
    return /* @__PURE__ */ jsx5("div", { "data-frame-region": "inspector", "data-frame-inspector-empty": "", style: EMPTY_STYLE, children: "Select a block to edit" });
  }
  return /* @__PURE__ */ jsx5("div", { "data-frame-region": "inspector", "data-node-type": node.type, children: /* @__PURE__ */ jsx5(
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
import { jsx as jsx6, jsxs as jsxs4 } from "react/jsx-runtime";
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
  return /* @__PURE__ */ jsx6("div", { "data-frame-missing-slots": "", children: slots.map((slot) => {
    const missing = Math.max(0, slot.min - slot.filled);
    return /* @__PURE__ */ jsxs4(
      "div",
      {
        "data-missing-slot": "",
        "data-parent-id": slot.parentId,
        "data-category": slot.category,
        style: CARD,
        children: [
          /* @__PURE__ */ jsxs4("span", { children: [
            "Missing: ",
            missing,
            " ",
            slot.category
          ] }),
          /* @__PURE__ */ jsx6(
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
import { jsx as jsx7, jsxs as jsxs5 } from "react/jsx-runtime";
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
    return /* @__PURE__ */ jsx7("div", { "data-frame-region-stub": "palette", style: EMPTY_STYLE2, children: "Nothing insertable here" });
  }
  return /* @__PURE__ */ jsx7("div", { "data-frame-palette": "", style: PANE_STYLE, children: candidates.map((candidate, index) => /* @__PURE__ */ jsxs5(
    "button",
    {
      type: "button",
      "data-node-type": candidate.nodeType,
      onClick: () => mount.insert(candidate),
      style: ITEM_STYLE,
      children: [
        /* @__PURE__ */ jsx7("span", { children: candidate.label ?? candidate.category ?? candidate.nodeType }),
        affordances(candidate).map((label) => /* @__PURE__ */ jsx7("span", { "data-affordance": "", style: AFFORDANCE_STYLE, children: label }, label))
      ]
    },
    `${candidate.nodeType}:${index}`
  )) });
}

// src/SavePill.tsx
import { useEffect as useEffect4, useRef as useRef3, useState as useState5 } from "react";
import { jsx as jsx8, jsxs as jsxs6 } from "react/jsx-runtime";
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
  const [fresh, setFresh] = useState5(false);
  const previous = useRef3(state);
  useEffect4(() => {
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
  return /* @__PURE__ */ jsxs6("span", { "data-frame-save-pill": state, className: "motion-faces", style: { display: "inline-grid", position: "relative" }, children: [
    ORDER.map((f) => /* @__PURE__ */ jsx8(
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
    /* @__PURE__ */ jsx8("span", { role: "status", "aria-live": "polite", style: SR_ONLY, children: FACES[face].label })
  ] });
}

// src/StatusBar.tsx
import { useRef as useRef4 } from "react";
import { jsx as jsx9, jsxs as jsxs7 } from "react/jsx-runtime";
var BAR = { display: "flex", alignItems: "center", gap: 12 };
var SEG = { display: "inline-flex", gap: 4 };
var CONTROL = { ...SEG, cursor: "pointer", textDecoration: "underline dotted", border: "none", background: "none", font: "inherit", color: "inherit", padding: 0 };
function StatusBar() {
  const mount = useEditShellMount();
  const c = mount.conformance;
  const cursor = useRef4(0);
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
  return /* @__PURE__ */ jsxs7("div", { "data-frame-status-bar": "", style: BAR, children: [
    /* @__PURE__ */ jsxs7("span", { "data-status-seg": "nodes", style: SEG, children: [
      nodes,
      " nodes"
    ] }),
    /* @__PURE__ */ jsxs7("span", { "data-status-seg": "required", style: SEG, children: [
      requiredTotal,
      " required (",
      requiredFilled,
      " of ",
      requiredTotal,
      ")"
    ] }),
    complete ? /* @__PURE__ */ jsx9("span", { "data-status-seg": "complete", style: SEG, children: "complete" }) : /* @__PURE__ */ jsx9("button", { type: "button", "data-status-seg": "incomplete", onClick: cycleIncomplete, style: CONTROL, children: "incomplete" }),
    /* @__PURE__ */ jsxs7("span", { "data-status-seg": "grammar", "data-grammar": grammarValid ? "valid" : "invalid", style: SEG, children: [
      "grammar ",
      grammarValid ? "\u2713 valid" : "\u2717"
    ] })
  ] });
}

// src/FiveRegionEditShell.tsx
import { Fragment as Fragment2, jsx as jsx10, jsxs as jsxs8 } from "react/jsx-runtime";
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
  inspector,
  status,
  autosave = true,
  onSave,
  sourceToggle = true,
  collapseLevel
}) {
  const mount = useEditShellMountController();
  const [mode, setMode] = useState6("rich");
  const shellRef = useRef5(null);
  const [autoLevel, setAutoLevel] = useState6(0);
  useEffect5(() => {
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
  const shell = /* @__PURE__ */ jsx10(EditShellMountProvider, { value: mount, children: /* @__PURE__ */ jsxs8(
    "div",
    {
      ref: shellRef,
      "data-frame-shell": "edit-five",
      "data-collapse-level": collapseLevel ?? autoLevel,
      style: { display: "flex", flexDirection: "column", minHeight: 0 },
      children: [
        /* @__PURE__ */ jsxs8(
          "div",
          {
            "data-frame-region": "top-bar",
            style: { ...BAR_STYLE, display: "flex", alignItems: "center", gap: 8 },
            children: [
              /* @__PURE__ */ jsx10(SavePill, {}),
              !autosave && /* @__PURE__ */ jsx10("button", { type: "button", "data-frame-save-action": "", onClick: () => onSave?.(), children: "Save" }),
              sourceToggle && /* @__PURE__ */ jsxs8("span", { "data-frame-mode-toggle": "", role: "group", style: { marginLeft: "auto" }, children: [
                /* @__PURE__ */ jsx10(
                  "button",
                  {
                    type: "button",
                    "data-mode": "rich",
                    "aria-pressed": mode === "rich",
                    onClick: () => setMode("rich"),
                    children: "Rich"
                  }
                ),
                /* @__PURE__ */ jsx10(
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
        /* @__PURE__ */ jsxs8("div", { "data-frame-region": "body", style: REGION_BODY, children: [
          /* @__PURE__ */ jsx10("div", { "data-frame-region": "palette", "data-palette-mode": regions.palette, style: PALETTE_STYLE, children: palette ?? /* @__PURE__ */ jsx10(PalettePane, {}) }),
          /* @__PURE__ */ jsx10(
            "div",
            {
              "data-frame-region": "canvas",
              "data-full-bleed": regions.canvasFullBleed ? "" : void 0,
              style: CANVAS_STYLE,
              children: mode === "source" ? /* @__PURE__ */ jsx10("pre", { "data-frame-source-view": "", style: { margin: 0, padding: 12, fontSize: 12 }, children: JSON.stringify(record ?? {}, null, 2) }) : /* @__PURE__ */ jsxs8(Fragment2, { children: [
                /* @__PURE__ */ jsx10(MissingSlots, {}),
                /* @__PURE__ */ jsx10(
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
          /* @__PURE__ */ jsx10(
            "div",
            {
              "data-frame-region": "inspector-region",
              "data-inspector-mode": regions.inspector,
              style: INSPECTOR_STYLE,
              children: inspector ?? /* @__PURE__ */ jsx10(Inspector, {})
            }
          )
        ] }),
        /* @__PURE__ */ jsx10("div", { "data-frame-region": "status", style: STATUS_STYLE, children: status ?? /* @__PURE__ */ jsx10(StatusBar, {}) })
      ]
    }
  ) });
  return registry ? /* @__PURE__ */ jsx10(WidgetRegistryContext2.Provider, { value: registry, children: shell }) : shell;
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

// src/resource-picker/KindPicker.tsx
import { useMemo as useMemo3, useState as useState7 } from "react";
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
  Sheet as Sheet2,
  SheetContent as SheetContent2,
  SheetDescription as SheetDescription2,
  SheetHeader as SheetHeader2,
  SheetTitle as SheetTitle2,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  cn as cn2,
  useIsMobile
} from "@schemastud/ui";
import { jsx as jsx11, jsxs as jsxs9 } from "react/jsx-runtime";
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
  const inScope = useMemo3(() => kindsInScope(props.kinds, scope), [props.kinds, scope]);
  const sections = props.sections ?? [];
  const groups = useMemo3(() => groupKinds(inScope, sections), [inScope, sections]);
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
  return /* @__PURE__ */ jsx11(
    "div",
    {
      "data-resource-picker": "kinds",
      "data-variant": resolved.variant,
      "data-density": resolved.density,
      className: "min-w-0",
      children: resolved.variant === "palette" ? /* @__PURE__ */ jsx11(PaletteBody, { ...body }) : resolved.variant === "catalog" ? /* @__PURE__ */ jsx11(CatalogBody, { ...body }) : /* @__PURE__ */ jsx11(RailBody, { ...body })
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
    return /* @__PURE__ */ jsxs9("span", { className: "inline-flex min-w-0 items-center gap-1.5", children: [
      /* @__PURE__ */ jsx11(Icon, { className: "size-3.5 shrink-0 text-muted-foreground" }),
      /* @__PURE__ */ jsx11("span", { className: "truncate", children: k.label })
    ] });
  }
  return /* @__PURE__ */ jsxs9("span", { children: [
    chosen.length,
    " resources"
  ] });
}
function PaletteList({ groups, picked, onPick, resolved, query, disabled }) {
  const expanded = resolved.density === "expanded";
  const visible = groups.map((g) => ({ ...g, items: g.items.filter((k) => matches(k, query)) })).filter((g) => g.items.length > 0);
  if (visible.length === 0) {
    return /* @__PURE__ */ jsx11("p", { className: "px-2 py-6 text-center text-sm text-muted-foreground", children: query ? `No resources match \u201C${query}\u201D.` : "No resources are available here." });
  }
  return /* @__PURE__ */ jsx11("div", { className: cn2("overflow-y-auto overscroll-contain p-1", expanded ? "max-h-[32rem]" : "max-h-80"), children: visible.map((g) => /* @__PURE__ */ jsxs9("div", { role: "group", "aria-label": g.label, className: "py-1", children: [
    /* @__PURE__ */ jsxs9("div", { className: "px-2 pt-1.5 pb-1 text-xs font-medium text-muted-foreground", children: [
      g.label,
      " ",
      /* @__PURE__ */ jsxs9("span", { className: "font-normal tabular-nums", children: [
        "\xB7 ",
        g.items.length
      ] })
    ] }),
    g.items.map((k, i, xs) => {
      const on = picked.has(k.key);
      const Icon = k.icon ? iconOf(k.icon) : g.Icon;
      const subHead = g.key === OTHER && k.group && (i === 0 || xs[i - 1].group !== k.group);
      return /* @__PURE__ */ jsxs9("div", { className: "contents", children: [
        subHead ? /* @__PURE__ */ jsx11("div", { className: "px-2 pt-2 pb-0.5 text-[11px] font-medium text-muted-foreground", children: k.group }) : null,
        /* @__PURE__ */ jsxs9(
          "button",
          {
            type: "button",
            disabled,
            "aria-pressed": on,
            onClick: () => onPick(k.key),
            className: cn2(
              "flex w-full min-w-0 items-center gap-2 rounded-sm px-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              expanded ? "py-2" : "py-1.5",
              on && "bg-accent text-accent-foreground"
            ),
            children: [
              /* @__PURE__ */ jsx11(Icon, { className: "size-4 shrink-0 text-muted-foreground" }),
              /* @__PURE__ */ jsxs9("span", { className: "min-w-0 flex-1", children: [
                /* @__PURE__ */ jsxs9("span", { className: "flex min-w-0 items-baseline gap-2", children: [
                  /* @__PURE__ */ jsx11("span", { className: "truncate font-medium", children: k.label }),
                  /* @__PURE__ */ jsx11("span", { className: "hidden truncate font-mono text-xs text-muted-foreground sm:inline", children: k.key })
                ] }),
                expanded && (k.detail || k.badges?.length) ? /* @__PURE__ */ jsxs9("span", { className: "mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground", children: [
                  k.detail ? /* @__PURE__ */ jsx11("span", { className: "truncate font-mono", children: k.detail }) : null,
                  k.badges?.map((b) => /* @__PURE__ */ jsx11(Badge, { variant: "outline", className: "h-4 px-1 text-[11px] font-normal", children: b }, b))
                ] }) : null
              ] }),
              /* @__PURE__ */ jsx11(Check, { className: cn2("size-4 shrink-0 text-primary", on ? "opacity-100" : "opacity-0") })
            ]
          }
        )
      ] }, k.key);
    })
  ] }, g.key)) });
}
function SearchBox({ value, onChange, label, autoFocus }) {
  return /* @__PURE__ */ jsxs9("div", { className: "flex items-center gap-2 border-b border-border px-2.5", children: [
    /* @__PURE__ */ jsx11(Search, { className: "size-4 shrink-0 text-muted-foreground" }),
    /* @__PURE__ */ jsx11(
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
  const [query, setQuery] = useState7("");
  const [open, setOpen] = useState7(false);
  if (props.resolved.density === "expanded") {
    return /* @__PURE__ */ jsxs9("div", { id: props.id, role: "region", "aria-label": props.label, className: "w-full max-w-xl rounded-md border border-border bg-card text-card-foreground", children: [
      /* @__PURE__ */ jsx11(SearchBox, { value: query, onChange: setQuery, label: "Search resources" }),
      /* @__PURE__ */ jsx11(PaletteList, { ...props, query }),
      /* @__PURE__ */ jsx11("div", { className: "border-t border-border px-2.5 py-1.5 text-xs text-muted-foreground tabular-nums", children: props.picked.size > 0 && props.resolved.select === "multi" ? `${props.picked.size} of ${props.total} picked` : `${props.total} resources` })
    ] });
  }
  return /* @__PURE__ */ jsxs9(Popover, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx11(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxs9(
      Button,
      {
        id: props.id,
        type: "button",
        variant: "outline",
        disabled: props.disabled,
        "aria-label": `${props.label}: ${pickedNames(props.kinds, props.picked) || "none chosen"}`,
        className: "w-full min-w-0 justify-between font-normal sm:w-72",
        children: [
          /* @__PURE__ */ jsx11(Picked, { picked: props.picked, kinds: props.kinds, select: props.resolved.select, sections: props.groups }),
          props.picked.size === 0 ? /* @__PURE__ */ jsx11("span", { className: "text-muted-foreground", children: "Choose a resource\u2026" }) : null,
          /* @__PURE__ */ jsx11(ChevronsUpDown, { className: "size-4 shrink-0 text-muted-foreground" })
        ]
      }
    ) }),
    /* @__PURE__ */ jsxs9(PopoverContent, { className: "w-[min(20rem,calc(100vw-2rem))] p-0", children: [
      /* @__PURE__ */ jsx11(SearchBox, { value: query, onChange: setQuery, label: "Search resources", autoFocus: true }),
      /* @__PURE__ */ jsx11(
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
  return /* @__PURE__ */ jsxs9("div", { className: "max-h-[min(24rem,70vh)] overflow-y-auto overscroll-contain p-1", children: [
    /* @__PURE__ */ jsxs9("div", { className: "px-2 py-1 text-xs font-medium text-muted-foreground", children: [
      g.label,
      " \xB7 ",
      g.items.length
    ] }),
    sub.map(([name, items]) => /* @__PURE__ */ jsxs9("div", { children: [
      name ? /* @__PURE__ */ jsx11("div", { className: "px-2 pt-1.5 pb-0.5 text-[11px] font-medium text-muted-foreground", children: name }) : null,
      items.map((k) => {
        const on = picked.has(k.key);
        return /* @__PURE__ */ jsxs9(
          "button",
          {
            type: "button",
            disabled,
            "aria-pressed": on,
            onClick: () => {
              onPick(k.key);
              if (select === "single") close();
            },
            className: cn2(
              "flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              on && "bg-accent font-medium text-accent-foreground"
            ),
            children: [
              /* @__PURE__ */ jsx11("span", { className: "truncate", children: k.label }),
              /* @__PURE__ */ jsx11(Check, { className: cn2("size-3.5 shrink-0 text-primary", on ? "opacity-100" : "opacity-0") })
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
  const [query, setQuery] = useState7("");
  const [openKey, setOpenKey] = useState7(null);
  const [collapsed, setCollapsed] = useState7(() => /* @__PURE__ */ new Set());
  const isMobile = useIsMobile();
  if (resolved.density === "compact") {
    const horizontal = resolved.orientation === "horizontal";
    if (groups.length === 0) {
      return /* @__PURE__ */ jsx11("p", { className: "text-sm text-muted-foreground", children: "No resources are available here." });
    }
    const sheetGroup = isMobile ? groups.find((g) => g.key === openKey) : void 0;
    return /* @__PURE__ */ jsx11(TooltipProvider, { children: /* @__PURE__ */ jsxs9("div", { className: cn2("flex min-w-0 gap-2", horizontal ? "flex-wrap items-center" : "items-start"), children: [
      /* @__PURE__ */ jsx11(
        "div",
        {
          id: props.id,
          role: "toolbar",
          "aria-label": `${props.label} sections`,
          "aria-orientation": resolved.orientation,
          className: cn2(
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
              /* @__PURE__ */ jsxs9(Popover, { open: open && !isMobile, onOpenChange: (o) => setOpenKey(o ? g.key : null), children: [
                /* @__PURE__ */ jsx11(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxs9(
                  "button",
                  {
                    type: "button",
                    disabled: props.disabled,
                    "aria-label": `${g.label}, ${g.items.length} resources${has ? ", has a pick" : ""}`,
                    className: cn2(
                      "relative flex size-10 items-center justify-center sm:size-8 rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      (open || has) && "bg-accent text-foreground"
                    ),
                    children: [
                      /* @__PURE__ */ jsxs9(Tooltip, { children: [
                        /* @__PURE__ */ jsx11(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsx11("span", { className: "flex size-full items-center justify-center", children: /* @__PURE__ */ jsx11(g.Icon, { className: "size-4" }) }) }),
                        /* @__PURE__ */ jsxs9(TooltipContent, { children: [
                          g.label,
                          " \xB7 ",
                          g.items.length
                        ] })
                      ] }),
                      has ? /* @__PURE__ */ jsx11("span", { "aria-hidden": true, className: "absolute top-1 right-1 size-1.5 rounded-full bg-primary" }) : null
                    ]
                  }
                ) }),
                /* @__PURE__ */ jsx11(PopoverContent, { align, className: "w-[min(16rem,calc(100vw-2rem))] p-0", children: /* @__PURE__ */ jsx11(
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
      /* @__PURE__ */ jsx11(Sheet2, { open: Boolean(sheetGroup), onOpenChange: (o) => !o && setOpenKey(null), children: /* @__PURE__ */ jsxs9(SheetContent2, { side: "bottom", className: "max-h-[80dvh] gap-0 rounded-t-xl p-0", children: [
        /* @__PURE__ */ jsxs9(SheetHeader2, { className: "border-b border-border px-4 py-3", children: [
          /* @__PURE__ */ jsx11(SheetTitle2, { children: sheetGroup?.label ?? props.label }),
          /* @__PURE__ */ jsx11(SheetDescription2, { className: "sr-only", children: "Choose a resource from this section." })
        ] }),
        sheetGroup ? /* @__PURE__ */ jsx11(
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
      /* @__PURE__ */ jsx11("div", { className: cn2("min-w-0 truncate text-sm", !horizontal && "pt-1.5"), "aria-live": "polite", children: picked.size === 0 ? /* @__PURE__ */ jsx11("span", { className: "text-muted-foreground", children: "Choose a section, then a resource" }) : /* @__PURE__ */ jsx11("span", { className: "font-medium", children: /* @__PURE__ */ jsx11(Picked, { picked, kinds: props.kinds, select: resolved.select, sections: groups }) }) })
    ] }) });
  }
  const visible = groups.map((g) => ({ ...g, items: g.items.filter((k) => matches(k, query)) })).filter((g) => g.items.length > 0);
  return /* @__PURE__ */ jsxs9("div", { id: props.id, role: "region", "aria-label": props.label, className: "w-full max-w-xs rounded-md border border-border bg-card text-card-foreground", children: [
    /* @__PURE__ */ jsx11(SearchBox, { value: query, onChange: setQuery, label: "Filter resources" }),
    /* @__PURE__ */ jsx11("div", { className: "max-h-[32rem] overflow-y-auto overscroll-contain p-1", children: visible.map((g) => {
      const isCollapsed = collapsed.has(g.key) && !query;
      return /* @__PURE__ */ jsxs9("div", { children: [
        /* @__PURE__ */ jsxs9(
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
              isCollapsed ? /* @__PURE__ */ jsx11(ChevronRight, { className: "size-3.5 text-muted-foreground" }) : /* @__PURE__ */ jsx11(ChevronDown, { className: "size-3.5 text-muted-foreground" }),
              /* @__PURE__ */ jsx11(g.Icon, { className: "size-3.5 text-muted-foreground" }),
              g.label,
              /* @__PURE__ */ jsx11("span", { className: "ml-auto font-normal text-muted-foreground tabular-nums", children: g.items.length })
            ]
          }
        ),
        !isCollapsed && g.items.map((k) => {
          const on = picked.has(k.key);
          return /* @__PURE__ */ jsxs9(
            "button",
            {
              type: "button",
              disabled: props.disabled,
              "aria-pressed": on,
              onClick: () => onPick(k.key),
              className: cn2(
                "ml-4 flex w-[calc(100%-1rem)] items-center gap-2 rounded-sm border-l py-1 pr-2 pl-3 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                on ? "border-primary bg-accent font-medium" : "border-border"
              ),
              children: [
                /* @__PURE__ */ jsx11("span", { className: "truncate", children: k.label }),
                /* @__PURE__ */ jsx11(Check, { className: cn2("ml-auto size-3.5 shrink-0 text-primary", on ? "opacity-100" : "opacity-0") })
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
    return /* @__PURE__ */ jsx11("div", { id, role: "group", "aria-label": label, className: "flex flex-wrap items-center gap-1.5", children: groups.map((g) => /* @__PURE__ */ jsxs9("div", { className: "contents", children: [
      /* @__PURE__ */ jsx11("span", { className: "mr-0.5 ml-1 text-[11px] font-medium text-muted-foreground uppercase first:ml-0", children: g.label }),
      g.items.map((k) => {
        const on = picked.has(k.key);
        return /* @__PURE__ */ jsxs9(
          "button",
          {
            type: "button",
            disabled,
            "aria-pressed": on,
            onClick: () => onPick(k.key),
            className: cn2(
              "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent"
            ),
            children: [
              /* @__PURE__ */ jsx11(g.Icon, { className: "size-3" }),
              k.label,
              on && resolved.select === "multi" ? /* @__PURE__ */ jsx11(X, { className: "size-3" }) : null
            ]
          },
          k.key
        );
      })
    ] }, g.key)) });
  }
  return /* @__PURE__ */ jsx11("div", { id, role: "group", "aria-label": label, className: "space-y-6", children: groups.map((g) => /* @__PURE__ */ jsxs9("section", { className: "space-y-2", children: [
    /* @__PURE__ */ jsxs9("h3", { className: "flex items-center gap-2 text-sm font-medium", children: [
      /* @__PURE__ */ jsx11(g.Icon, { className: "size-4 text-muted-foreground" }),
      g.label,
      /* @__PURE__ */ jsx11("span", { className: "text-xs font-normal text-muted-foreground tabular-nums", children: g.items.length })
    ] }),
    /* @__PURE__ */ jsx11("div", { className: "grid gap-2 sm:grid-cols-2 xl:grid-cols-3", children: g.items.map((k) => {
      const on = picked.has(k.key);
      return /* @__PURE__ */ jsxs9(
        "button",
        {
          type: "button",
          disabled,
          "aria-pressed": on,
          onClick: () => onPick(k.key),
          className: cn2(
            "min-w-0 rounded-md border border-border bg-card p-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            on && "border-primary ring-1 ring-primary"
          ),
          children: [
            /* @__PURE__ */ jsxs9("span", { className: "flex items-start justify-between gap-2", children: [
              /* @__PURE__ */ jsxs9("span", { className: "min-w-0", children: [
                /* @__PURE__ */ jsx11("span", { className: "block truncate text-sm font-medium", children: k.label }),
                /* @__PURE__ */ jsx11("span", { className: "block truncate font-mono text-xs text-muted-foreground", children: k.key })
              ] }),
              /* @__PURE__ */ jsx11(
                "span",
                {
                  "aria-hidden": true,
                  className: cn2(
                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  ),
                  children: on ? /* @__PURE__ */ jsx11(Check, { className: "size-3" }) : null
                }
              )
            ] }),
            k.detail || k.badges?.length ? /* @__PURE__ */ jsxs9("span", { className: "mt-2 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground", children: [
              k.detail ? /* @__PURE__ */ jsx11("span", { className: "truncate font-mono", children: k.detail }) : null,
              k.badges?.map((b) => /* @__PURE__ */ jsx11(Badge, { variant: "outline", className: "h-4 px-1 text-[11px] font-normal", children: b }, b))
            ] }) : null
          ]
        },
        k.key
      );
    }) })
  ] }, g.key)) });
}

// src/resource-picker/ResourcePicker.tsx
import { jsx as jsx12 } from "react/jsx-runtime";
function ResourcePicker(props) {
  if ("kinds" in props && Array.isArray(props.kinds)) {
    return /* @__PURE__ */ jsx12(ResourceKindPicker, { ...props });
  }
  return /* @__PURE__ */ jsx12(ResourceRecordPicker, { ...props });
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
function UnguardedRefusal() {
  return createElement2(
    "div",
    { role: "alert", "data-page-state": "forbidden", className: "p-6 text-sm" },
    createElement2("p", { className: "font-medium" }, "This page is not available.")
  );
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
    if (entry.guard) {
      const Guard = registries.guards.resolveGuard(entry.guard);
      if (!Guard) {
        if (registries.onUnguarded) {
          registries.onUnguarded(entry);
        } else {
          console.error(
            `[frame] guard "${entry.guard}" is not registered; leaf "${entry.routeName}" (${entry.path}) is refused.`
          );
        }
        return createElement2(UnguardedRefusal);
      }
      return createElement2(Guard, null, createElement2(Component));
    }
    return createElement2(Component);
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
  createFormIntentBus as createFormIntentBus2,
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
function createResourceTransport(crud, http, options = {}) {
  const collectionByResource = Object.freeze({ ...options.collectionByResource });
  const collectionParams = (resource, selected) => {
    const address = collectionByResource[resource] ?? selected;
    return address === void 0 ? void 0 : { collection: address };
  };
  const addressed = (resource, params, selected) => {
    const collection = collectionParams(resource, selected);
    return collection ? { ...params, ...collection } : params;
  };
  async function getFilterSchema(resource, variant, selected) {
    const response = await http.read(
      `${http.resourceUrl(resource)}/filters/${variant ? `${encodeURIComponent(variant)}/` : ""}schema`,
      collectionParams(resource, selected)
    );
    return {
      ...response.data,
      savedViewsResource: response.savedViewsResource ?? void 0,
      savedViewsCan: response.savedViewsCan ?? void 0
    };
  }
  async function savedResource(resource, variant, selected) {
    const schema = await getFilterSchema(resource, variant, selected);
    if (!schema.savedViewsResource) {
      throw new Error(`Saved views are unavailable for resource "${resource}".`);
    }
    return schema.savedViewsResource;
  }
  const write = http.write;
  return {
    list: (resource, params) => crud.list(resource, addressed(resource, params) ?? params),
    get: (resource, id, params) => crud.get(resource, id, addressed(resource, params)),
    getFormSchema: (resource, form, purpose, params) => crud.getFormSchema(resource, form, purpose, addressed(resource, params)),
    create: (resource, data, params) => crud.create(resource, data, addressed(resource, params)),
    save: (resource, id, data, params) => crud.save(resource, id, data, addressed(resource, params)),
    remove: (resource, id, params) => crud.remove(resource, id, addressed(resource, params)),
    // An action's form schema rides the resource root like every other frame read.
    getActionSchema: (resource, action) => {
      const params = collectionParams(resource);
      return params ? http.read(`${http.resourceUrl(resource)}/actions/${encodeURIComponent(action)}/schema`, params) : http.read(`${http.resourceUrl(resource)}/actions/${encodeURIComponent(action)}/schema`);
    },
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
    summary: (resource, params) => http.read(`${http.resourceUrl(resource)}/summary`, addressed(resource, params)),
    getFilterSchema,
    async getFilterVariants(resource, selected) {
      const response = await http.read(
        `${http.resourceUrl(resource)}/filters/variants`,
        collectionParams(resource, selected)
      );
      return response.data;
    },
    async getFilterOptions(resource, ref, search, selected) {
      const response = await http.read(
        `${http.resourceUrl(resource)}/filters/options/${encodeURIComponent(ref)}`,
        addressed(resource, { search }, selected)
      );
      return response.data;
    },
    async getSavedFilters(resource, variant, selected) {
      const schema = await getFilterSchema(resource, variant, selected);
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
    async saveFilter(resource, payload, selected) {
      return crud.create(
        await savedResource(resource, payload.queryParameters.filterVariant, selected),
        {
          ...payload,
          resource
        }
      );
    },
    async deleteSavedFilter(resource, id, variant, selected) {
      await crud.remove(await savedResource(resource, variant, selected), id);
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
  EMPTY_SELECTION,
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
  KIND_PLACEMENTS,
  KIND_VARIANT_FOR,
  KNOWN_CONTEXTS,
  KNOWN_ROW_ACTIONS,
  ListShell,
  MasterDetail,
  MissingSlots,
  NavTile,
  PalettePane,
  RECORD_PLACEMENTS,
  RecentList,
  RecordActionButtons,
  RecordLine,
  ResourceActionBar,
  ResourceKindPicker,
  ResourcePicker,
  ResourcePickerWidget,
  ResourceRecordPicker,
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
  TrendCard,
  WelcomePanel,
  WidgetShell,
  WidgetSurface,
  actionUrl,
  assertRouteContext,
  bridgeHostWidgets,
  buildRealmRoutes,
  collapseModes,
  createFormIntentBus2 as createFormIntentBus,
  createFormResolver,
  createFrameHooks,
  createGuardRegistry,
  createMemoryUrlState,
  createMountDispatcher,
  createNoun,
  createResourceTransport,
  createRouteRegistry,
  createShellRegistry,
  createWidgetRegistry,
  dashboardRowRenders,
  deriveCollapseLevel,
  describeTrend,
  followFilters,
  forecastBoundary,
  formatRecordTime,
  getPath,
  isEmptySelection,
  isNotFound,
  isPicked,
  isResourceRefNode,
  kindOfSchema,
  kindsInScope,
  listItemRendersCards,
  navigateTarget,
  pageState,
  parseResourcePage,
  readResourceRefConfig,
  registerCardWidgets,
  registerFrameWidgets,
  registerResourceRefWidget,
  resolveActions,
  resolveColumns,
  resolveDashboardCard,
  resolveDeclaredCell,
  resolveKindPlacement,
  resolveRecordPlacement,
  resolveRowActions,
  resolveSkinFor,
  resolveWidgetFor,
  resourceQueryKey,
  selectAllMatching,
  selectionCount,
  selectionFromValue,
  selectionToSearch,
  selectionToValue,
  setPagePicked,
  stripHostWidgets,
  togglePick,
  trendSegments,
  trendSeries,
  useBrowserUrlState,
  useEditShellMount,
  useEditShellMountController,
  useFormSchema,
  useFrameInjection,
  useFrameSidePanelStore,
  useInlineNotice,
  useOptionalFrameInjection,
  useRemoveResource,
  useResourceList,
  useResourceRecord,
  useSaveResource,
  widgetFormContext
};
//# sourceMappingURL=index.js.map