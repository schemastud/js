// src/context.tsx
import { createContext, useContext } from "react";
import { jsx } from "react/jsx-runtime";
var FacetsContext = createContext(null);
function FacetsProvider({
  value,
  children
}) {
  return /* @__PURE__ */ jsx(FacetsContext.Provider, { value, children });
}
var FacetsResourceContext = createContext(null);
function FacetsResourceProvider({
  resource,
  children
}) {
  return /* @__PURE__ */ jsx(FacetsResourceContext.Provider, { value: resource, children });
}
function useFacetsResource() {
  return useContext(FacetsResourceContext);
}
function useFacetsInjection() {
  const injection = useContext(FacetsContext);
  if (!injection) {
    throw new Error(
      "@schemastud/facets: no FacetsProvider found. Wrap your app in <FacetsProvider value={{ transport, primitives, useUrlState }}>."
    );
  }
  return injection;
}

// src/FacetsBar.tsx
import { ArrowDownAZ, ArrowUpAZ, ListFilter, Plus, Search, X as X2 } from "lucide-react";
import { useCallback, useEffect as useEffect2, useMemo as useMemo2, useState as useState2 } from "react";

// src/data.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// src/transportScope.ts
var scopes = /* @__PURE__ */ new WeakMap();
function transportScope(transport) {
  let scope = scopes.get(transport);
  if (!scope) {
    scope = Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) => n.toString(16)).join(
      "-"
    );
    scopes.set(transport, scope);
  }
  return scope;
}

// src/data.ts
function filterSchemaOptions(transport, resource, variant) {
  return {
    queryKey: ["filter-schema", resource, variant ?? null, transportScope(transport)],
    // A host's list-wide keepPreviousData default must not carry another
    // resource or variant's vocabulary and permissions into this one.
    placeholderData: void 0,
    staleTime: 5 * 6e4,
    queryFn: () => variant ? transport.getFilterSchema(resource, variant) : transport.getFilterSchema(resource)
  };
}
function useFilterSchema(resource, variant) {
  const { transport } = useFacetsInjection();
  return useQuery(filterSchemaOptions(transport, resource, variant));
}
function useFilterVariants(resource) {
  const { transport } = useFacetsInjection();
  return useQuery({
    queryKey: ["filter-variants", resource, transportScope(transport)],
    placeholderData: void 0,
    staleTime: 5 * 6e4,
    queryFn: () => transport.getFilterVariants(resource)
  });
}
function useFilterOptions(ref, search, resource) {
  const { transport } = useFacetsInjection();
  const contextResource = useFacetsResource();
  const target = resource ?? contextResource;
  return useQuery({
    queryKey: ["filter-options", target, ref, search, transportScope(transport)],
    placeholderData: void 0,
    enabled: Boolean(ref) && Boolean(target),
    staleTime: 6e4,
    queryFn: () => transport.getFilterOptions(target, ref, search)
  });
}
function useSavedFilters(resource, enabled = true, variant) {
  const { transport } = useFacetsInjection();
  return useQuery({
    queryKey: ["saved-filters", resource, variant ?? null, transportScope(transport)],
    placeholderData: void 0,
    enabled,
    queryFn: () => variant ? transport.getSavedFilters(resource, variant) : transport.getSavedFilters(resource)
  });
}
function useSaveFilter(resource) {
  const { transport } = useFacetsInjection();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["saved-filters", resource, transportScope(transport), "save"],
    mutationFn: (payload) => transport.saveFilter(resource, payload),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: ["saved-filters", resource],
      predicate: (query) => query.queryKey.at(-1) === transportScope(transport)
    })
  });
}
function useDeleteSavedFilter(resource, variant) {
  const { transport } = useFacetsInjection();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [
      "saved-filters",
      resource,
      transportScope(transport),
      "delete",
      variant ?? null
    ],
    mutationFn: (id) => variant ? transport.deleteSavedFilter(resource, id, variant) : transport.deleteSavedFilter(resource, id),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: ["saved-filters", resource],
      predicate: (query) => query.queryKey.at(-1) === transportScope(transport)
    })
  });
}

// src/MultiSelectFilter.tsx
import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { jsx as jsx2, jsxs } from "react/jsx-runtime";
function MultiSelectFilter({
  descriptor,
  value,
  onChange,
  onLabelsResolved
}) {
  const { Badge, Input } = useFacetsInjection().primitives;
  const single = descriptor.control === "select";
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const options = useFilterOptions(descriptor.options === void 0 ? descriptor.optionsRef : void 0, search);
  const inlineOptions = useMemo(() => descriptor.options?.map((option) => ({
    value: String(option.value),
    label: option.label
  })), [descriptor.options]);
  const optionsData = inlineOptions ?? options.data;
  const selected = value ? value.split(",") : [];
  const labels = useRef({});
  for (const option of optionsData ?? []) {
    labels.current[option.value] = option.label;
  }
  useEffect(() => {
    if (onLabelsResolved && (optionsData?.length ?? 0) > 0) {
      onLabelsResolved({ ...labels.current });
    }
  }, [optionsData, onLabelsResolved]);
  const add = (val) => {
    if (single) {
      onChange(val);
      setSearch("");
      setOpen(false);
      return;
    }
    if (selected.includes(val)) return;
    onChange([...selected, val].join(","));
    setSearch("");
  };
  const remove = (val) => {
    const next = selected.filter((entry) => entry !== val);
    onChange(next.length ? next.join(",") : null);
  };
  const available = (optionsData ?? []).filter(
    (option) => !selected.includes(option.value) && (inlineOptions === void 0 || option.label.toLowerCase().includes(search.toLowerCase()))
  );
  return /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
    selected.length > 0 && /* @__PURE__ */ jsx2("div", { className: "flex flex-wrap gap-1", children: selected.map((val) => /* @__PURE__ */ jsxs(Badge, { variant: "secondary", className: "gap-1", children: [
      labels.current[val] ?? val,
      /* @__PURE__ */ jsx2(
        "button",
        {
          type: "button",
          "aria-label": `Remove ${labels.current[val] ?? val}`,
          onClick: () => remove(val),
          children: /* @__PURE__ */ jsx2(X, { className: "size-3" })
        }
      )
    ] }, val)) }),
    /* @__PURE__ */ jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsx2(
        Input,
        {
          value: search,
          placeholder: "Search\u2026",
          onChange: (e) => {
            setSearch(e.target.value);
            setOpen(true);
          },
          onFocus: () => setOpen(true),
          onBlur: () => setTimeout(() => setOpen(false), 150)
        }
      ),
      open && available.length > 0 && /* @__PURE__ */ jsx2("ul", { className: "absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-background p-1 shadow-md", children: available.map((option) => /* @__PURE__ */ jsx2("li", { children: /* @__PURE__ */ jsx2(
        "button",
        {
          type: "button",
          className: "w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted",
          onMouseDown: (e) => {
            e.preventDefault();
            add(option.value);
          },
          children: option.label
        }
      ) }, option.value)) })
    ] })
  ] });
}

// src/sort.ts
function parseSort(sort) {
  if (!sort) return [];
  return sort.split(",").map((raw) => raw.trim()).filter(Boolean).map(
    (raw) => raw.startsWith("-") ? { field: raw.slice(1), desc: true } : { field: raw, desc: false }
  );
}
function serializeSort(keys) {
  if (keys.length === 0) return null;
  return keys.map((k) => k.desc ? `-${k.field}` : k.field).join(",");
}
function toggleSortKey(keys, field, append) {
  const existing = keys.find((k) => k.field === field);
  if (!append) {
    if (keys.length === 1 && existing) {
      return existing.desc ? [] : [{ field, desc: true }];
    }
    return [{ field, desc: false }];
  }
  if (!existing) {
    return [...keys, { field, desc: false }];
  }
  if (!existing.desc) {
    return keys.map((k) => k.field === field ? { field, desc: true } : k);
  }
  return keys.filter((k) => k.field !== field);
}
function sortStateFor(keys, field) {
  const index = keys.findIndex((k) => k.field === field);
  if (index === -1) return { active: false, desc: false, index: -1 };
  return { active: true, desc: keys[index].desc, index };
}

// src/FacetsBar.tsx
import { Fragment, jsx as jsx3, jsxs as jsxs2 } from "react/jsx-runtime";
function humanize(key) {
  return key.replace(/(?:(.)Id|[_-]id)$/, "$1").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_:]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
function LabelWarmer({
  optionsRef,
  onLabelsResolved
}) {
  const options = useFilterOptions(optionsRef, "");
  const optionsData = options.data;
  useEffect2(() => {
    if ((optionsData?.length ?? 0) > 0) {
      const map = {};
      for (const o of optionsData) map[o.value] = o.label;
      onLabelsResolved(map);
    }
  }, [optionsData, onLabelsResolved]);
  return null;
}
function chipSummary(value, labels) {
  const parts = value.split(",").filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return labels[parts[0]] ?? parts[0];
  return `${parts.length} selected`;
}
function FacetControl({
  descriptor,
  value,
  onChange,
  onLabelsResolved
}) {
  const { Input } = useFacetsInjection().primitives;
  if (descriptor.control === "multiselect" || descriptor.control === "select") {
    return /* @__PURE__ */ jsx3(
      MultiSelectFilter,
      {
        descriptor,
        value,
        onChange,
        onLabelsResolved
      }
    );
  }
  return /* @__PURE__ */ jsx3(
    Input,
    {
      autoFocus: true,
      value,
      placeholder: descriptor.control === "search" ? "Search\u2026" : "Value\u2026",
      onChange: (e) => onChange(e.target.value || null)
    }
  );
}
function FacetsBar({
  resource,
  schema,
  values,
  sort,
  onFilterChange,
  onSortChange
}) {
  const { Button, Input, Label, Popover, PopoverContent, PopoverTrigger, SimpleSelect } = useFacetsInjection().primitives;
  const [openChip, setOpenChip] = useState2(null);
  const [addOpen, setAddOpen] = useState2(false);
  const [labelCache, setLabelCache] = useState2({});
  const mergeLabels = useCallback((labels) => {
    setLabelCache((prev) => {
      let changed2 = false;
      for (const [k, v] of Object.entries(labels)) {
        if (prev[k] !== v) changed2 = true;
      }
      return changed2 ? { ...prev, ...labels } : prev;
    });
  }, []);
  const properties = Object.entries(schema.properties ?? {});
  const allFacets = useMemo2(
    () => properties.filter(([, prop]) => prop["x-filter"]).map(([key, prop]) => ({
      key,
      label: prop.title ?? humanize(key),
      descriptor: prop["x-filter"]
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schema]
  );
  const searchFacet = allFacets.find((f) => f.descriptor.control === "search");
  const chipFacets = allFacets.filter((f) => f !== searchFacet);
  const isActive = (facet) => Boolean(values[facet.descriptor.name]);
  const activeFacets = chipFacets.filter(isActive);
  const inactiveFacets = chipFacets.filter((f) => !isActive(f));
  const sorts = properties.filter(([, prop]) => prop["x-sort"]);
  const sortKeys = parseSort(sort);
  const primary = sortKeys[0];
  const sortField = primary?.field ?? "";
  const sortDesc = Boolean(primary?.desc);
  const setPrimarySort = (field, desc) => {
    const rest = sortKeys.filter((k) => k.field !== field);
    onSortChange(serializeSort([{ field, desc }, ...rest]));
  };
  const clearPrimarySort = () => {
    onSortChange(serializeSort(sortKeys.filter((k) => k.field !== sortField)));
  };
  const addFacet = (facet) => {
    setAddOpen(false);
    setOpenChip(facet.key);
  };
  return /* @__PURE__ */ jsx3(FacetsResourceProvider, { resource, children: /* @__PURE__ */ jsxs2("div", { className: "flex flex-wrap items-center gap-2 rounded-md border bg-card p-2", children: [
    activeFacets.filter((f) => f.descriptor.optionsRef).map((f) => /* @__PURE__ */ jsx3(
      LabelWarmer,
      {
        optionsRef: f.descriptor.optionsRef,
        onLabelsResolved: mergeLabels
      },
      `warm-${f.key}`
    )),
    searchFacet && /* @__PURE__ */ jsxs2("div", { className: "relative", children: [
      /* @__PURE__ */ jsx3(Search, { className: "pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" }),
      /* @__PURE__ */ jsx3(
        Input,
        {
          className: "h-8 w-56 !pl-9",
          value: values[searchFacet.descriptor.name] ?? "",
          placeholder: "Search\u2026",
          "aria-label": "Search",
          onChange: (e) => onFilterChange(searchFacet.descriptor.name, e.target.value || null)
        }
      )
    ] }),
    activeFacets.map((facet) => {
      const value = values[facet.descriptor.name] ?? "";
      return /* @__PURE__ */ jsxs2(
        Popover,
        {
          open: openChip === facet.key,
          onOpenChange: (open) => setOpenChip(open ? facet.key : null),
          children: [
            /* @__PURE__ */ jsxs2("div", { className: "inline-flex items-center overflow-hidden rounded-full border bg-secondary text-xs", children: [
              /* @__PURE__ */ jsx3(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxs2(
                "button",
                {
                  type: "button",
                  className: "flex items-center gap-1 py-1 pr-1.5 pl-2.5 font-medium hover:bg-accent",
                  children: [
                    /* @__PURE__ */ jsxs2("span", { className: "text-muted-foreground", children: [
                      facet.label,
                      ":"
                    ] }),
                    " ",
                    /* @__PURE__ */ jsx3("span", { children: chipSummary(value, facet.descriptor.options === void 0 ? labelCache : Object.fromEntries(facet.descriptor.options.map((option) => [String(option.value), option.label]))) || "\u2026" })
                  ]
                }
              ) }),
              /* @__PURE__ */ jsx3(
                "button",
                {
                  type: "button",
                  "aria-label": `Clear ${facet.label}`,
                  className: "flex h-full items-center px-1.5 text-muted-foreground hover:bg-accent hover:text-destructive",
                  onClick: () => onFilterChange(facet.descriptor.name, null),
                  children: /* @__PURE__ */ jsx3(X2, { className: "size-3" })
                }
              )
            ] }),
            /* @__PURE__ */ jsxs2(PopoverContent, { children: [
              /* @__PURE__ */ jsx3(Label, { className: "mb-1.5 block", children: facet.label }),
              /* @__PURE__ */ jsx3(
                FacetControl,
                {
                  descriptor: facet.descriptor,
                  value,
                  onChange: (v) => onFilterChange(facet.descriptor.name, v),
                  onLabelsResolved: mergeLabels
                }
              )
            ] })
          ]
        },
        facet.key
      );
    }),
    inactiveFacets.length > 0 && /* @__PURE__ */ jsxs2(Popover, { open: addOpen, onOpenChange: setAddOpen, children: [
      /* @__PURE__ */ jsx3(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxs2(Button, { variant: "outline", size: "sm", className: "h-8 gap-1 border-dashed", children: [
        /* @__PURE__ */ jsx3(Plus, { className: "size-3.5" }),
        " Filter"
      ] }) }),
      /* @__PURE__ */ jsx3(PopoverContent, { children: /* @__PURE__ */ jsx3("div", { className: "flex flex-col gap-0.5", children: inactiveFacets.map((facet) => /* @__PURE__ */ jsxs2(
        "button",
        {
          type: "button",
          className: "flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent",
          onClick: () => addFacet(facet),
          children: [
            /* @__PURE__ */ jsx3(ListFilter, { className: "size-3.5 text-muted-foreground" }),
            facet.label
          ]
        },
        facet.key
      )) }) })
    ] }),
    openChip && !activeFacets.some((f) => f.key === openChip) && (() => {
      const facet = chipFacets.find((f) => f.key === openChip);
      if (!facet) return null;
      return /* @__PURE__ */ jsxs2(
        Popover,
        {
          open: true,
          onOpenChange: (open) => !open && setOpenChip(null),
          children: [
            /* @__PURE__ */ jsx3("div", { className: "inline-flex items-center rounded-full border border-dashed bg-secondary/60 py-1 pr-2 pl-2.5 text-xs", children: /* @__PURE__ */ jsx3(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsxs2("button", { type: "button", className: "font-medium", children: [
              facet.label,
              ": ",
              /* @__PURE__ */ jsx3("span", { className: "text-muted-foreground", children: "\u2026" })
            ] }) }) }),
            /* @__PURE__ */ jsxs2(PopoverContent, { children: [
              /* @__PURE__ */ jsx3(Label, { className: "mb-1.5 block", children: facet.label }),
              /* @__PURE__ */ jsx3(
                FacetControl,
                {
                  descriptor: facet.descriptor,
                  value: "",
                  onChange: (v) => {
                    onFilterChange(facet.descriptor.name, v);
                    if (v) setOpenChip(null);
                  },
                  onLabelsResolved: mergeLabels
                }
              )
            ] })
          ]
        },
        `new-${facet.key}`
      );
    })(),
    /* @__PURE__ */ jsx3("div", { className: "ml-auto flex items-center gap-1.5", children: sorts.length > 0 && /* @__PURE__ */ jsxs2(Fragment, { children: [
      /* @__PURE__ */ jsx3(
        SimpleSelect,
        {
          className: "h-8 w-40",
          "aria-label": "Sort by",
          value: sortField,
          onValueChange: (field) => field ? setPrimarySort(field, sortDesc) : clearPrimarySort(),
          placeholder: "Sort by\u2026",
          options: sorts.map(([key, prop]) => ({
            value: prop["x-sort"].name,
            label: humanize(key)
          }))
        }
      ),
      sortField && /* @__PURE__ */ jsx3(
        Button,
        {
          variant: "outline",
          size: "icon",
          className: "size-8",
          "aria-label": sortDesc ? "Descending" : "Ascending",
          onClick: () => setPrimarySort(sortField, !sortDesc),
          children: sortDesc ? /* @__PURE__ */ jsx3(ArrowDownAZ, {}) : /* @__PURE__ */ jsx3(ArrowUpAZ, {})
        }
      )
    ] }) })
  ] }) });
}

// src/SavedViews.tsx
import { Bookmark, Check, Trash2, X as X3 } from "lucide-react";
import { useState as useState3 } from "react";
import { jsx as jsx4, jsxs as jsxs3 } from "react/jsx-runtime";
function firstValidationMessage(error) {
  const err = error;
  if (err.response?.status !== 422) return null;
  const errors = err.response.data?.errors;
  const first = errors ? Object.values(errors)[0]?.[0] : void 0;
  return first ?? err.response.data?.message ?? "That view could not be saved.";
}
function SavedViews({
  resource,
  current,
  onApply
}) {
  const {
    primitives: { Button, Input },
    can
  } = useFacetsInjection();
  const schema = useFilterSchema(resource, current.filterVariant).data;
  const savedResource = schema?.savedViewsResource;
  const views = useSavedFilters(resource, Boolean(savedResource), current.filterVariant);
  const save = useSaveFilter(resource);
  const remove = useDeleteSavedFilter(resource, current.filterVariant);
  const [naming, setNaming] = useState3(false);
  const [name, setName] = useState3("");
  const [error, setError] = useState3(null);
  const canCreate = Boolean(
    savedResource && schema?.savedViewsCan?.create === true && (!can || can("create", savedResource))
  );
  const submit = async () => {
    if (!canCreate) return;
    setError(null);
    try {
      await save.mutateAsync({ name, queryParameters: current });
      setName("");
      setNaming(false);
    } catch (e) {
      setError(firstValidationMessage(e) ?? "That view could not be saved.");
    }
  };
  const apply = async (params) => {
    setError(null);
    try {
      await onApply(params);
    } catch {
      setError("That view could not be applied.");
    }
  };
  if (!savedResource) return null;
  return /* @__PURE__ */ jsxs3("div", { className: "flex flex-wrap items-center gap-2", children: [
    /* @__PURE__ */ jsxs3("span", { className: "flex items-center gap-1 text-xs font-medium text-muted-foreground", children: [
      /* @__PURE__ */ jsx4(Bookmark, { className: "size-3.5" }),
      " Saved views"
    ] }),
    (views.data ?? []).map((view) => /* @__PURE__ */ jsxs3(
      "span",
      {
        className: "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
        children: [
          /* @__PURE__ */ jsx4(
            "button",
            {
              type: "button",
              className: "font-medium hover:underline",
              onClick: () => void apply(view.queryParameters ?? {}),
              children: view.name
            }
          ),
          view.can?.delete === true && (!can || can("delete", savedResource, view)) && /* @__PURE__ */ jsx4(
            "button",
            {
              type: "button",
              "aria-label": `Delete ${view.name}`,
              disabled: remove.isPending,
              onClick: () => remove.mutate(view.id),
              children: /* @__PURE__ */ jsx4(Trash2, { className: "size-3 text-destructive" })
            }
          )
        ]
      },
      view.id
    )),
    (views.data ?? []).length === 0 && /* @__PURE__ */ jsx4("span", { className: "text-xs text-muted-foreground", children: "None yet." }),
    canCreate && (naming ? /* @__PURE__ */ jsxs3("div", { className: "flex items-center gap-1", children: [
      /* @__PURE__ */ jsx4(
        Input,
        {
          value: name,
          autoFocus: true,
          placeholder: "View name",
          className: "h-7 w-40 text-xs",
          onChange: (e) => setName(e.target.value),
          onKeyDown: (e) => e.key === "Enter" && name && submit()
        }
      ),
      /* @__PURE__ */ jsx4(
        Button,
        {
          size: "icon",
          variant: "outline",
          className: "size-7",
          "aria-label": "Confirm save",
          disabled: !name || save.isPending,
          onClick: submit,
          children: /* @__PURE__ */ jsx4(Check, {})
        }
      ),
      /* @__PURE__ */ jsx4(
        Button,
        {
          size: "icon",
          variant: "ghost",
          className: "size-7",
          "aria-label": "Cancel save",
          onClick: () => {
            setNaming(false);
            setError(null);
          },
          children: /* @__PURE__ */ jsx4(X3, {})
        }
      )
    ] }) : /* @__PURE__ */ jsx4(Button, { size: "sm", variant: "outline", onClick: () => setNaming(true), children: "Save current view" })),
    error && /* @__PURE__ */ jsx4("span", { className: "text-xs text-destructive", children: error })
  ] });
}

// src/ListFilters.tsx
import { jsx as jsx5, jsxs as jsxs4 } from "react/jsx-runtime";
function ListFilters(state) {
  const {
    resource,
    schema,
    variants,
    filterVariant,
    onVariantChange,
    filterValues,
    sort,
    onFilterChange,
    onSortChange,
    applyView
  } = state;
  const { SimpleSelect } = useFacetsInjection().primitives;
  const hasVariants = variants.some((variant) => !variant.canonical);
  const choices = variants.some((variant) => variant.canonical) ? variants : [{ key: resource, resource, canonical: true, sameAsCanonical: true }, ...variants];
  const canonical = choices.find((variant) => variant.canonical)?.key ?? resource;
  const hasVocabulary = Object.values(schema?.properties ?? {}).some(
    (property) => property["x-filter"] || property["x-sort"]
  );
  if (!hasVariants && !hasVocabulary && !schema?.savedViewsResource) return null;
  return /* @__PURE__ */ jsxs4("div", { className: "space-y-3", children: [
    hasVariants && /* @__PURE__ */ jsx5(
      SimpleSelect,
      {
        "aria-label": "Filter variant",
        value: filterVariant ?? canonical,
        onValueChange: (key) => onVariantChange(key === canonical ? null : key),
        options: choices.map((variant) => ({
          value: variant.key,
          label: variant.canonical ? "Default" : variant.key
        }))
      }
    ),
    schema && hasVocabulary && /* @__PURE__ */ jsx5(
      FacetsBar,
      {
        resource,
        schema,
        values: filterValues,
        sort,
        onFilterChange,
        onSortChange
      },
      `${resource}:${filterVariant ?? ""}`
    ),
    schema?.savedViewsResource && /* @__PURE__ */ jsx5(
      SavedViews,
      {
        resource,
        current: {
          filter: filterValues,
          sort: sort ?? void 0,
          filterVariant: filterVariant ?? void 0
        },
        onApply: applyView
      }
    )
  ] });
}

// src/useListFilters.ts
import { useEffect as useEffect3, useLayoutEffect, useMemo as useMemo3, useRef as useRef2, useState as useState4 } from "react";
import { useQueryClient as useQueryClient2 } from "@tanstack/react-query";
function filterFingerprint(searchParams) {
  const parts = [];
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("filter[") || key === "sort" || key === "filterVariant") {
      parts.push(`${key}=${value}`);
    }
  }
  return parts.sort().join("&");
}
function useListFilters(resource) {
  const { useUrlState, transport } = useFacetsInjection();
  const queryClient = useQueryClient2();
  const [searchParams, setSearchParams] = useUrlState();
  const applySequence = useRef2(0);
  const queryString = searchParams.toString();
  useLayoutEffect(() => {
    applySequence.current++;
    return () => {
      applySequence.current++;
    };
  }, [resource, queryString, transport]);
  const filterVariant = searchParams.get("filterVariant") || null;
  const schemaQuery = useFilterSchema(resource, filterVariant ?? void 0);
  const variantsQuery = useFilterVariants(resource);
  const schema = schemaQuery.data;
  const requestParams = Object.fromEntries(searchParams.entries());
  const filterValues = {};
  for (const [key, value] of searchParams.entries()) {
    const match = key.match(/^filter\[(.+)\]$/);
    if (match) {
      filterValues[match[1]] = value;
    }
  }
  const sort = searchParams.get("sort");
  const sortableFields = useMemo3(
    () => new Set(
      Object.values(schema?.properties ?? {}).map((prop) => prop["x-sort"]?.name).filter((name) => Boolean(name))
    ),
    [schema]
  );
  const setParam = (key, value) => {
    applySequence.current++;
    setSearchParams((prev) => {
      prev.delete("page");
      prev.delete("cursor");
      if (value === null || value === "") {
        prev.delete(key);
      } else {
        prev.set(key, value);
      }
      return prev;
    });
  };
  const clearQuery = (params) => {
    for (const key of [...params.keys()]) {
      if (key.startsWith("filter[") || key === "sort" || key === "filterVariant" || key === "page" || key === "cursor") {
        params.delete(key);
      }
    }
  };
  const onVariantChange = (variant) => {
    applySequence.current++;
    setSearchParams((previous) => {
      clearQuery(previous);
      if (variant) previous.set("filterVariant", variant);
      return previous;
    });
  };
  const applyView = async (params) => {
    const sequence = ++applySequence.current;
    const selectedSchema = await queryClient.fetchQuery(filterSchemaOptions(transport, resource, params.filterVariant)).catch((error) => {
      if (sequence === applySequence.current) throw error;
      return void 0;
    });
    if (!selectedSchema || sequence !== applySequence.current) return;
    const properties = Object.values(selectedSchema.properties ?? {});
    const knownFilters = new Set(properties.map((property) => property["x-filter"]?.name));
    const knownSorts = new Set(properties.map((property) => property["x-sort"]?.name));
    setSearchParams((prev) => {
      clearQuery(prev);
      if (params.filterVariant) prev.set("filterVariant", params.filterVariant);
      for (const [name, value] of Object.entries(params.filter ?? {})) {
        if (knownFilters.has(name)) {
          prev.set(`filter[${name}]`, value);
        }
      }
      const sort2 = serializeSort(
        parseSort(params.sort ?? null).filter((entry) => knownSorts.has(entry.field))
      );
      if (sort2) {
        prev.set("sort", sort2);
      }
      return prev;
    });
  };
  const fingerprint = filterFingerprint(searchParams);
  return {
    resource,
    schema,
    variants: variantsQuery.data?.variants ?? [],
    filterVariant,
    onVariantChange,
    requestParams,
    filterValues,
    sort,
    sortableFields,
    onFilterChange: (name, value) => setParam(`filter[${name}]`, value),
    onSortChange: (value) => setParam("sort", value),
    applyView,
    filterFingerprint: fingerprint
  };
}
function useFilterChangeDim(fingerprint, isFetching) {
  const settled = useRef2(fingerprint);
  const [, force] = useState4(0);
  const changed2 = settled.current !== fingerprint;
  useEffect3(() => {
    if (!isFetching && settled.current !== fingerprint) {
      settled.current = fingerprint;
      force((n) => n + 1);
    }
  }, [fingerprint, isFetching]);
  return changed2 && isFetching;
}

// src/useBrowserUrlState.ts
import { useMemo as useMemo4, useSyncExternalStore } from "react";
var changed = "schemastud:query-changed";
var subscribe = (notify) => {
  window.addEventListener(changed, notify);
  window.addEventListener("popstate", notify);
  return () => {
    window.removeEventListener(changed, notify);
    window.removeEventListener("popstate", notify);
  };
};
var snapshot = () => window.location.search;
var serverSnapshot = () => "";
var update = (updater, options) => {
  const url = new URL(window.location.href);
  url.search = updater(new URLSearchParams(url.search)).toString();
  window.history[options?.replace === false ? "pushState" : "replaceState"](
    window.history.state,
    "",
    url
  );
  window.dispatchEvent(new Event(changed));
};
var useBrowserUrlState = () => {
  const query = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return [useMemo4(() => new URLSearchParams(query), [query]), update];
};
export {
  FacetsBar,
  FacetsProvider,
  FacetsResourceProvider,
  ListFilters,
  MultiSelectFilter,
  SavedViews,
  parseSort,
  serializeSort,
  sortStateFor,
  toggleSortKey,
  transportScope,
  useBrowserUrlState,
  useDeleteSavedFilter,
  useFacetsInjection,
  useFacetsResource,
  useFilterChangeDim,
  useFilterOptions,
  useFilterSchema,
  useFilterVariants,
  useListFilters,
  useSaveFilter,
  useSavedFilters
};
//# sourceMappingURL=index.js.map