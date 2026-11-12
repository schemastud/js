import {
  shadcnEditSlots
} from "./chunk-5TFMHJNN.js";
import {
  WidgetShell
} from "./chunk-3EXZAMGQ.js";
import {
  DefaultContainer,
  DefaultFormBody,
  DefaultNotFound,
  DefaultSaveBar,
  DefaultToggle,
  FrameProvider,
  ListShell,
  RecordActionButtons,
  registerCardWidgets,
  registerFrameWidgets,
  shadcnListSlots,
  useFormSchema,
  useFrameInjection,
  useInlineNotice,
  useOptionalFrameInjection,
  useRowRecord,
  useRowSave
} from "./chunk-IKCPLVQZ.js";
import {
  actionUrl,
  createMemoryUrlState,
  resolveActions
} from "./chunk-CWIDJYHN.js";
import {
  FrameActionError,
  createSessionRequest
} from "./chunk-X75EBNAR.js";

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

// src/httpTransport.ts
function createHttpTransport(options = {}) {
  const prefix = (options.prefix ?? "/frame").replace(/\/+$/, "");
  const manifestUrl = options.manifestUrl ?? `${prefix}/manifest`;
  const session = createSessionRequest({ fetch: options.fetch, headers: options.headers });
  const request = async (method, url, params, body) => (await session(method, url, params, body)).data;
  const resourceUrl = (resource) => `${prefix}/resources/${encodeURIComponent(resource)}`;
  const recordUrl = (resource, id) => `${resourceUrl(resource)}/records/${encodeURIComponent(id)}`;
  const transport = createResourceTransport(
    {
      async list(resource, params) {
        return parseResourcePage(await request("GET", resourceUrl(resource), params));
      },
      async get(resource, id, params) {
        return (await request("GET", recordUrl(resource, id), params)).data;
      },
      async getFormSchema(resource, _form, purpose, params) {
        const query = { ...purpose === "read" ? { purpose: "read" } : {}, ...params };
        return request("GET", `${resourceUrl(resource)}/schema`, query);
      },
      async create(resource, data, params) {
        return (await request("POST", resourceUrl(resource), params, data)).data;
      },
      async save(resource, id, data, params) {
        return (await request("PUT", recordUrl(resource, id), params, data)).data;
      },
      async remove(resource, id, params) {
        await request("DELETE", recordUrl(resource, id), params);
      }
    },
    {
      resourceUrl,
      read: (url, params) => request("GET", url, params),
      write: (method, url, body) => request(method, url, void 0, body)
    },
    options
  );
  return {
    ...transport,
    async getManifest() {
      const body = await request("GET", manifestUrl) ?? {};
      return { ...body, resources: body.resources ?? [], contexts: body.contexts ?? {} };
    }
  };
}

// src/kit.tsx
import { QueryClient, QueryClientContext, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { transportScope, useBrowserUrlState } from "@schemastud/facets";
import { RjsfThemeContext, createWidgetRegistry } from "@schemastud/seam";
import { createContext, useContext, useMemo } from "react";

// src/primitives.tsx
import { useState } from "react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SimpleSelect,
  Skeleton
} from "@schemastud/ui";
import { jsx, jsxs } from "react/jsx-runtime";
function useOverlayOpen(open, onOpenChange) {
  const [own, setOwn] = useState(true);
  const controlled = open !== void 0;
  return [
    controlled ? open : own,
    (next) => {
      if (!controlled) setOwn(next);
      onOpenChange?.(next);
    }
  ];
}
function DefaultSidePanel({ open, onOpenChange, title, children, ...rest }) {
  const [shown, setShown] = useOverlayOpen(open, onOpenChange);
  return /* @__PURE__ */ jsx(Sheet, { open: shown, onOpenChange: setShown, children: /* @__PURE__ */ jsxs(SheetContent, { side: "right", className: "w-full overflow-y-auto sm:max-w-lg", ...rest, children: [
    /* @__PURE__ */ jsx(SheetHeader, { className: title ? void 0 : "sr-only", children: /* @__PURE__ */ jsx(SheetTitle, { children: title ?? "Panel" }) }),
    children
  ] }) });
}
function DefaultDialog({ open, onOpenChange, title, children }) {
  const [shown, setShown] = useOverlayOpen(open, onOpenChange);
  return /* @__PURE__ */ jsx(Dialog, { open: shown, onOpenChange: setShown, children: /* @__PURE__ */ jsxs(DialogContent, { children: [
    /* @__PURE__ */ jsx(DialogHeader, { className: title ? void 0 : "sr-only", children: /* @__PURE__ */ jsx(DialogTitle, { children: title ?? "Dialog" }) }),
    children
  ] }) });
}
var defaultPrimitives = {
  Button,
  Input,
  Label,
  Badge,
  Popover,
  PopoverTrigger,
  PopoverContent,
  SimpleSelect,
  Skeleton,
  SidePanel: DefaultSidePanel,
  Dialog: DefaultDialog
};

// src/kit.tsx
import { Fragment, jsx as jsx2 } from "react/jsx-runtime";
function createFrameRegistry(options = {}) {
  const registry = createWidgetRegistry();
  registerFrameWidgets(registry);
  registerCardWidgets(registry, { renderLink: options.renderLink, iconFor: options.iconFor });
  options.widgets?.(registry);
  return registry;
}
var EMPTY_MANIFEST = { resources: [], contexts: {} };
var READS = /* @__PURE__ */ new Set(["viewAny", "view"]);
var MountedKit = createContext(null);
function sameOriginSchemaFetcher() {
  return async (ref) => {
    const origin = typeof location === "undefined" ? void 0 : location.origin;
    const url = new URL(ref, origin);
    if (origin !== void 0 && url.origin !== origin) {
      throw new FrameActionError(0, null, `Refused to fetch the schema reference ${ref}: it is on another origin.`);
    }
    const res = await fetch(url, { credentials: "same-origin", headers: { Accept: "application/json" } });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new FrameActionError(res.status, body, `GET ${url.pathname} failed (${res.status}).`);
    return body;
  };
}
function createFrameKit(options = {}) {
  const prefix = (options.prefix ?? "/frame").replace(/\/+$/, "");
  const manifestUrl = options.manifestUrl ?? `${prefix}/manifest`;
  const transport = options.transport ?? createHttpTransport({ prefix, manifestUrl });
  const endpoint = options.transport ? null : manifestUrl;
  const registry = createFrameRegistry(options);
  const primitives = { ...defaultPrimitives, ...options.primitives };
  const listSlots = { ...shadcnListSlots, ...options.listSlots };
  const editSlots = { ...shadcnEditSlots, ...options.editSlots };
  const useUrlState = options.urlState === "memory" ? createMemoryUrlState() : typeof options.urlState === "function" ? options.urlState : useBrowserUrlState;
  const schemaFetcher = options.schemaFetcher ?? sameOriginSchemaFetcher();
  const queryKey = ["frame", "manifest", endpoint, transportScope(transport)];
  let ownClient;
  const clientFor = (nearest) => options.queryClient ?? nearest ?? (ownClient ??= new QueryClient());
  function useManifest() {
    const client = clientFor(useContext(QueryClientContext));
    return useQuery(
      {
        queryKey,
        queryFn: async () => await transport.getManifest?.() ?? EMPTY_MANIFEST,
        staleTime: 6e4
      },
      client
    );
  }
  function Injected({ children }) {
    const manifest = useManifest().data;
    const injection = useMemo(() => {
      const can = options.can ?? ((action, resource) => READS.has(action) || manifest?.contexts[resource]?.can?.[action] === true);
      return {
        transport,
        primitives,
        useUrlState,
        registry,
        schemaFetcher,
        can,
        manifestFor: (resource) => manifest?.contexts[resource],
        listSlots,
        editSlots,
        ...options.notify ? { notify: options.notify } : {},
        ...options.formResolver ? { formResolver: options.formResolver } : {},
        ...options.hooks ? { hooks: options.hooks } : {}
      };
    }, [manifest]);
    const body = /* @__PURE__ */ jsx2(FrameProvider, { value: injection, children });
    return options.theme ? /* @__PURE__ */ jsx2(RjsfThemeContext.Provider, { value: options.theme, children: body }) : body;
  }
  function Provider({ children }) {
    const mounted = useContext(MountedKit);
    const nearest = useContext(QueryClientContext);
    if (mounted === kit) return /* @__PURE__ */ jsx2(Fragment, { children });
    return /* @__PURE__ */ jsx2(QueryClientProvider, { client: clientFor(nearest), children: /* @__PURE__ */ jsx2(MountedKit.Provider, { value: kit, children: /* @__PURE__ */ jsx2(Injected, { children }) }) });
  }
  const kit = { Provider, transport, registry, useManifest };
  return kit;
}

// src/errors.ts
function isNotFound(error) {
  return typeof error === "object" && error !== null && "status" in error && error.status === 404;
}

// src/useEditShell.tsx
import { createFormIntentBus } from "@schemastud/seam";
import { useCallback, useEffect, useMemo as useMemo2, useRef, useState as useState2 } from "react";
import { flushSync } from "react-dom";
import { jsx as jsx3 } from "react/jsx-runtime";
function useEditShell(options) {
  return useEditShellOf(options);
}
function useEditShellOf(options) {
  const {
    resource,
    id,
    readOnly = false,
    schemaPurpose = "write",
    form: formOption = "enriched",
    manifest: manifestOption,
    onSaved,
    onNavigate,
    slots
  } = options;
  const { can, hooks, editSlots, manifestFor, transport, notify } = useFrameInjection();
  const manifest = manifestOption ?? manifestFor?.(resource);
  const inline = useInlineNotice();
  const onNotice = useCallback(
    (n) => notify ? notify(n) : inline.onNotice?.(n),
    [notify, inline.onNotice]
  );
  const [form, setForm] = useState2(formOption);
  const [draft, setDraftState] = useState2({});
  const submitHandler = useRef(null);
  const [canSubmit, setCanSubmit] = useState2(false);
  const registerSubmit = useCallback((handler) => {
    submitHandler.current = handler;
    setCanSubmit(handler !== null);
  }, []);
  const dirty = useRef(false);
  const setDraft = useCallback((data) => {
    dirty.current = true;
    setDraftState(data);
  }, []);
  const intentBus = useMemo2(() => createFormIntentBus(), []);
  const schemaQuery = useFormSchema(resource, form, id === null ? "write" : schemaPurpose);
  const recordQuery = useRowRecord(resource, id);
  const saveMutation = useRowSave(resource);
  const record = recordQuery.isPlaceholderData ? void 0 : recordQuery.data;
  const servedSchema = schemaQuery.isPlaceholderData ? void 0 : schemaQuery.data;
  const recordKey = JSON.stringify([resource, id, schemaPurpose]);
  const currentKey = useRef(recordKey);
  const [seenKey, setSeenKey] = useState2(recordKey);
  if (seenKey !== recordKey) {
    setSeenKey(recordKey);
    setDraftState({});
    setCanSubmit(false);
    dirty.current = false;
    submitHandler.current = null;
    currentKey.current = recordKey;
  }
  const resetSave = saveMutation.reset;
  useEffect(() => {
    resetSave();
  }, [recordKey, resetSave]);
  const schema = useMemo2(() => servedSchema ?? { type: "object", properties: {} }, [servedSchema]);
  useEffect(() => {
    if (record && !dirty.current) setDraftState(record);
  }, [record, recordKey]);
  const resolvedSlots = {
    FormBody: slots?.FormBody ?? editSlots?.FormBody ?? DefaultFormBody,
    Toggle: slots?.Toggle ?? editSlots?.Toggle ?? DefaultToggle,
    SaveBar: slots?.SaveBar ?? editSlots?.SaveBar ?? DefaultSaveBar
  };
  const readFailed = schemaQuery.isError || id !== null && recordQuery.isError;
  const effectiveReadOnly = readOnly || !can(id === null ? "create" : "update", resource) || readFailed;
  const ready = servedSchema !== void 0 && (id === null || record !== void 0);
  const recordNotFound = id !== null && recordQuery.isError && isNotFound(recordQuery.error);
  const singularLabel = manifest?.singularLabel ?? resource;
  const heading = id === null ? `New ${singularLabel}` : singularLabel;
  const loading = schemaQuery.isLoading || schemaQuery.isPlaceholderData || id !== null && (recordQuery.isLoading || recordQuery.isPlaceholderData);
  const status = loading ? "loading" : recordNotFound ? "not-found" : ready ? "ready" : readFailed ? "error" : "loading";
  const submit = (data) => {
    if (effectiveReadOnly || !ready) return;
    const issuedFor = recordKey;
    saveMutation.mutate(
      { id, data },
      {
        onSuccess: (saved) => {
          if (currentKey.current !== issuedFor) return;
          dirty.current = false;
          setDraftState(saved);
          hooks?.fireSubmitted(resource, saved, {
            resource,
            mode: id == null ? "create" : "edit"
          });
          onSaved?.(saved);
        }
      }
    );
  };
  const request = () => {
    if (!submitHandler.current || effectiveReadOnly || !ready) return;
    flushSync(() => intentBus.flushCommits());
    submitHandler.current?.();
  };
  const readFailure = readFailed && !recordNotFound ? {
    message: schemaQuery.isError ? "Could not load this form." : "Could not load this record.",
    retry: () => {
      if (schemaQuery.isError) void schemaQuery.refetch();
      if (id !== null && recordQuery.isError) void recordQuery.refetch();
    }
  } : void 0;
  const recordActions = resolveActions(manifest, "record", transport);
  const recordRef = useRef({});
  recordRef.current = { ...record ?? {}, id };
  const manifestRef = useRef(manifest);
  manifestRef.current = manifest;
  const actionKeys = recordActions.map((action) => action.key).join(",");
  const RecordActions = useMemo2(
    () => id === null || actionKeys === "" ? void 0 : ({ compact }) => /* @__PURE__ */ jsx3(
      RecordActionButtons,
      {
        resource,
        manifest: manifestRef.current,
        record: recordRef.current,
        compact,
        onNavigate,
        onNotice
      }
    ),
    [id, actionKeys, resource, onNavigate, onNotice]
  );
  return {
    resource,
    id,
    manifest,
    status,
    readFailure,
    schema,
    record,
    draft,
    setDraft,
    form,
    setForm,
    readOnly: effectiveReadOnly,
    heading,
    singularLabel,
    intentBus,
    save: {
      submit,
      request,
      registerSubmit,
      canSubmit,
      saving: saveMutation.isPending,
      error: saveMutation.error ?? null
    },
    notice: { element: inline.element, onNotice },
    actions: { record: recordActions, RecordActions },
    slots: resolvedSlots
  };
}

// src/EditShell.tsx
import { Fragment as Fragment2, jsx as jsx4, jsxs as jsxs2 } from "react/jsx-runtime";
function EditShell(typed) {
  const props = typed;
  return /* @__PURE__ */ jsx4(EditShellRecord, { ...props }, JSON.stringify([props.resource, props.id, props.schemaPurpose ?? "write"]));
}
function EditShellRecord({
  container = "panel",
  showModeToggle = false,
  onCancel,
  ...options
}) {
  const edit = useEditShellOf(options);
  const { editSlots, primitives } = useFrameInjection();
  const { FormBody, Toggle, SaveBar } = edit.slots;
  const slots = options.slots;
  const Container = slots?.Container ?? (container === "page" ? PageContainer : container === "bare" ? BareContainer : editSlots?.Container ?? DefaultContainer);
  if (edit.status === "loading") {
    return /* @__PURE__ */ jsx4("div", { "data-frame-shell": "edit-loading", children: "Loading\u2026" });
  }
  const RetryButton = primitives.Button;
  const failure = edit.readFailure;
  const terminal = edit.status === "not-found" ? /* @__PURE__ */ jsx4(DefaultNotFound, { message: `This ${edit.singularLabel.toLowerCase()} was not found.` }) : !failure ? null : /* @__PURE__ */ jsxs2("div", { role: "alert", "data-frame-shell": "edit-error", children: [
    /* @__PURE__ */ jsx4("p", { children: failure.message }),
    /* @__PURE__ */ jsx4(RetryButton, { type: "button", onClick: failure.retry, children: "Retry" })
  ] });
  if (edit.status !== "ready") return /* @__PURE__ */ jsx4(Container, { children: terminal });
  return /* @__PURE__ */ jsx4(Container, { children: /* @__PURE__ */ jsxs2("div", { "data-frame-shell": "edit", children: [
    /* @__PURE__ */ jsx4("h1", { "data-frame-shell": "edit-heading", children: edit.heading }),
    terminal,
    edit.notice.element,
    edit.actions.RecordActions ? /* @__PURE__ */ jsx4(edit.actions.RecordActions, {}) : null,
    showModeToggle && !edit.readOnly ? /* @__PURE__ */ jsx4(Toggle, { value: edit.form, onChange: edit.setForm }) : null,
    /* @__PURE__ */ jsx4(
      FormBody,
      {
        schema: edit.schema,
        formData: edit.draft,
        intentBus: edit.intentBus,
        readOnly: edit.readOnly,
        form: edit.form,
        onChange: edit.setDraft,
        onSubmit: edit.save.submit,
        registerSubmit: edit.save.registerSubmit
      }
    ),
    edit.save.error && /* @__PURE__ */ jsx4("div", { role: "alert", "data-frame-shell": "save-error", children: edit.save.error.message || "Could not save changes." }),
    /* @__PURE__ */ jsx4(
      "div",
      {
        "data-frame-shell": "edit-bottom-spacer",
        "aria-hidden": "true",
        style: { height: "4rem", flex: "none" }
      }
    ),
    /* @__PURE__ */ jsx4(
      SaveBar,
      {
        saving: edit.save.saving,
        canSubmit: edit.save.canSubmit,
        readOnly: edit.readOnly,
        onSave: edit.save.request,
        onCancel
      }
    )
  ] }) });
}
function BareContainer({ children }) {
  return /* @__PURE__ */ jsx4(Fragment2, { children });
}
function PageContainer({ children }) {
  const { primitives } = useFrameInjection();
  const Page = primitives.Page;
  if (Page) {
    return /* @__PURE__ */ jsx4(Page, { "data-frame-slot": "Container", children });
  }
  return /* @__PURE__ */ jsx4("div", { "data-frame-slot": "Container", "data-frame-container": "page", children });
}

// src/mountDispatcher.tsx
import { createElement } from "react";
var isDev = () => Boolean(import.meta.env?.DEV);
var UntypedListShell = ListShell;
var UntypedEditShell = EditShell;
var UntypedWidgetShell = WidgetShell;
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
        return () => createElement(UntypedWidgetShell, { resource, id: idOf(), widget });
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
        return () => createElement(UntypedEditShell, {
          resource,
          id: idOf(),
          readOnly,
          // Full-page, not a drawer. See EditShell's PageContainer for why this used to be
          // a silent lie.
          container: "page",
          // The DECLARED form mode. Read at render, and omitted entirely when the
          // host wired no lookup or the resource is unknown — `undefined` lets
          // EditShell's own `'enriched'` default stand rather than this dispatcher
          // restating it, so there is one place the default lives.
          form: options.formFor?.(resource)
        });
      }
      case "list": {
        return function DispatchedList() {
          const injected = useOptionalFrameInjection()?.manifestFor;
          const onOpen = options.onOpenFor?.(entry);
          const manifest = (options.manifestFor ?? injected)?.(resource);
          const columns = options.columnsFor?.(resource) ?? [];
          if (!manifest && columns.length === 0) {
            if (isDev()) {
              console.warn(
                `[frame] mounts: 'list' for "${resource}" has no context manifest and no host columns yet \u2014 rendering nothing.`
              );
            }
            return null;
          }
          return createElement(UntypedListShell, {
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

export {
  parseResourcePage,
  createResourceTransport,
  createHttpTransport,
  createFrameRegistry,
  createFrameKit,
  isNotFound,
  useEditShell,
  EditShell,
  createMountDispatcher,
  createRouteRegistry,
  createGuardRegistry,
  createShellRegistry,
  assertRouteContext,
  buildRealmRoutes
};
//# sourceMappingURL=chunk-PCI75PEG.js.map