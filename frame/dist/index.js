import {
  EditShell,
  assertRouteContext,
  buildRealmRoutes,
  createFrameKit,
  createFrameRegistry,
  createGuardRegistry,
  createHttpTransport,
  createMountDispatcher,
  createResourceTransport,
  createRouteRegistry,
  createShellRegistry,
  isNotFound,
  parseResourcePage,
  useEditShell
} from "./chunk-PCI75PEG.js";
import "./chunk-5TFMHJNN.js";
import "./chunk-3EXZAMGQ.js";
import {
  DefaultFormBody,
  DefaultNotFound,
  DefaultPagination,
  DefaultRowActions,
  FrameProvider,
  KNOWN_CONTEXTS,
  ListShell,
  SchemaView,
  registerCardWidgets,
  registerFrameWidgets,
  registerResourceRefWidget,
  resolveColumns,
  resolveRowActions,
  resourceQueryKey,
  useFormSchema,
  useFrameInjection,
  useListShell,
  useRemoveResource,
  useResourceList,
  useResourceRecord,
  useSaveResource
} from "./chunk-IKCPLVQZ.js";
import {
  resolveActions
} from "./chunk-CWIDJYHN.js";
import {
  FrameActionError
} from "./chunk-X75EBNAR.js";

// src/useResourceAction.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { transportScope } from "@schemastud/facets";
function useResourceAction(resource, action, options = {}) {
  const { transport, manifestFor } = useFrameInjection();
  const queryClient = useQueryClient();
  const manifest = options.manifest ?? manifestFor?.(resource);
  const definition = typeof transport.invoke === "function" ? [...resolveActions(manifest, "record"), ...resolveActions(manifest, "resource")].find(
    (declared) => declared.key === action
  ) : void 0;
  const mutation = useMutation({
    // The key frame's own action button uses, so `useIsMutating` sees both.
    mutationKey: resourceQueryKey(transport, resource, "action", action),
    mutationFn: (target) => {
      if (!definition || !transport.invoke) {
        return Promise.reject(new Error(`The action "${action}" is not available here.`));
      }
      if (definition.scope === "record" && (target.id === void 0 || target.id === null || target.id === "")) {
        return Promise.reject(new Error(`The record action "${action}" needs the record's id.`));
      }
      return transport.invoke(definition, { id: target.id ?? null, data: target.data });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["frame", resource],
        predicate: (query) => query.queryKey.at(-1) === transportScope(transport)
      });
    }
  });
  return {
    definition,
    available: definition !== void 0,
    // Never rejects: the refusal is on `error`, so a host form keeps no error state of its own.
    invoke: (target) => mutation.mutateAsync(target).catch(() => void 0),
    pending: mutation.isPending,
    error: mutation.error ?? null,
    result: mutation.data,
    reset: mutation.reset
  };
}

// src/FrameLayout.tsx
import {
  useEffect,
  useState
} from "react";
import {
  cn,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@schemastud/ui";
import { jsx, jsxs } from "react/jsx-runtime";
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
  return /* @__PURE__ */ jsx(
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
  return /* @__PURE__ */ jsx(FrameLayoutShell, { width, className, children: /* @__PURE__ */ jsx("div", { className: "space-y-6", "data-grammar": "single", children }) });
}
function SubNavColumn({
  nav,
  active,
  onSelect,
  children,
  width = "5xl",
  className
}) {
  return /* @__PURE__ */ jsx(FrameLayoutShell, { width, className, children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-6 md:flex-row", "data-grammar": "subnav", children: [
    /* @__PURE__ */ jsx("nav", { className: "flex gap-1 overflow-x-auto md:w-44 md:flex-none md:flex-col", children: nav.map((item) => /* @__PURE__ */ jsx(
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
    /* @__PURE__ */ jsx("div", { className: "min-w-0 flex-1", children })
  ] }) });
}
function useIsAtLeast(breakpoint) {
  const query = breakpoint === "lg" ? "(min-width: 1024px)" : "(min-width: 768px)";
  const [matches, setMatches] = useState(true);
  useEffect(() => {
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
    return /* @__PURE__ */ jsx(SidePanel, { open, onOpenChange, title, children });
  }
  return /* @__PURE__ */ jsx(Sheet, { open, onOpenChange, children: /* @__PURE__ */ jsxs(SheetContent, { side: "right", className: "sm:max-w-md", children: [
    (title || description) && /* @__PURE__ */ jsxs(SheetHeader, { children: [
      title ? /* @__PURE__ */ jsx(SheetTitle, { children: title }) : null,
      description ? /* @__PURE__ */ jsx(SheetDescription, { children: description }) : null
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
  const [selfOpen, setSelfOpen] = useState(false);
  const open = sheetOpen ?? (selfOpen && detail != null);
  const setOpen = (next) => {
    setSelfOpen(next);
    onSheetOpenChange?.(next);
  };
  useEffect(() => {
    if (sheetOpen === void 0 && overlayDetail && detail != null) setSelfOpen(true);
  }, [sheetOpen, overlayDetail, detail]);
  const twoCol = breakpoint === "lg" ? "lg:grid-cols-[1.35fr_1fr]" : "md:grid-cols-[300px_1fr]";
  const detailSticky = presentation === "panel" ? "" : "lg:sticky lg:top-2";
  if (overlayDetail) {
    return /* @__PURE__ */ jsxs(FrameLayoutShell, { width, canvas, className, children: [
      /* @__PURE__ */ jsx(
        "section",
        {
          className: "min-w-0 space-y-3",
          "data-grammar": "master-detail",
          "data-detail": "sheet",
          children: master
        }
      ),
      /* @__PURE__ */ jsx(
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
  return /* @__PURE__ */ jsx(FrameLayoutShell, { width, canvas, className, children: /* @__PURE__ */ jsxs(
    "div",
    {
      className: cn("grid grid-cols-1 gap-6", twoCol),
      "data-grammar": "master-detail",
      "data-detail": presentation,
      "data-collapse": collapse,
      children: [
        /* @__PURE__ */ jsx("section", { className: "min-w-0 space-y-3", children: master }),
        /* @__PURE__ */ jsx("section", { className: cn("space-y-3", detailSticky), children: detail })
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
  return /* @__PURE__ */ jsx(Plug, { ...rest });
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

// src/index.ts
import {
  createWidgetRegistry,
  createFormIntentBus
} from "@schemastud/seam";
import { useBrowserUrlState } from "@schemastud/facets";
export {
  DefaultFormBody,
  DefaultNotFound,
  DefaultPagination,
  DefaultRowActions,
  EditShell,
  FrameActionError,
  FrameLayout,
  FrameProvider,
  KNOWN_CONTEXTS,
  ListShell,
  SchemaView,
  assertRouteContext,
  buildRealmRoutes,
  createFormIntentBus,
  createFormResolver,
  createFrameHooks,
  createFrameKit,
  createFrameRegistry,
  createGuardRegistry,
  createHttpTransport,
  createMountDispatcher,
  createResourceTransport,
  createRouteRegistry,
  createShellRegistry,
  createWidgetRegistry,
  isNotFound,
  parseResourcePage,
  registerCardWidgets,
  registerFrameWidgets,
  registerResourceRefWidget,
  resolveColumns,
  resolveRowActions,
  resourceQueryKey,
  useBrowserUrlState,
  useEditShell,
  useFormSchema,
  useFrameInjection,
  useFrameSidePanelStore,
  useListShell,
  useRemoveResource,
  useResourceAction,
  useResourceList,
  useResourceRecord,
  useSaveResource
};
//# sourceMappingURL=index.js.map