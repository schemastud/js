// src/vocabulary.ts
var FORM_KEYWORDS = ["x-widget", "x-placeholder", "x-widget-options", "x-group"];
function createKeywordVocabulary(config = {}) {
  const keywords = [...FORM_KEYWORDS, ...config.keywords ?? []];
  const patterns = [...config.patterns ?? []];
  function isKnownKeyword(keyword) {
    return keywords.includes(keyword) || patterns.some((pattern) => pattern.test(keyword));
  }
  return { isKnownKeyword, keywords, patterns };
}

// src/intent-bus.ts
function widgetFormContext(props) {
  const fromProp = props.formContext;
  if (fromProp && typeof fromProp === "object" && Object.keys(fromProp).length > 0) {
    return fromProp;
  }
  const fromRegistry = props.registry?.formContext;
  if (fromRegistry && typeof fromRegistry === "object") {
    return fromRegistry;
  }
  return fromProp ?? {};
}
function createFormIntentBus() {
  const handlers = /* @__PURE__ */ new Set();
  const flushers = /* @__PURE__ */ new Set();
  function flushCommits() {
    for (const flush2 of flushers) {
      flush2();
    }
  }
  async function dispatch(intent) {
    flushCommits();
    for (const handler of handlers) {
      await handler(intent);
    }
  }
  return {
    dispatch,
    flushCommits,
    onIntent(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    registerFlush(flush2) {
      flushers.add(flush2);
      return () => flushers.delete(flush2);
    }
  };
}

// src/UnboundWidget.tsx
import { useEffect } from "react";

// src/development.ts
function isDevelopment() {
  const nodeEnv = typeof process !== "undefined" ? process.env?.NODE_ENV : void 0;
  if (nodeEnv !== void 0) return nodeEnv !== "production";
  return Boolean(import.meta.env?.DEV);
}

// src/UnboundWidget.tsx
import { jsx, jsxs } from "react/jsx-runtime";
function UnboundWidget({ context, name, label, resource, pointer }) {
  useEffect(() => {
    if (!isDevelopment()) return;
    const where = [resource !== void 0 ? `resource "${resource}"` : "", pointer !== void 0 ? `pointer "${pointer}"` : ""].filter(Boolean).join(", ");
    console.error(`[schemastud] unbound widget "${name}" in context "${context}"${where ? ` (${where})` : ""}.`);
  }, [context, name, resource, pointer]);
  return /* @__PURE__ */ jsxs("div", { "data-frame-unbound": context, "data-frame-unbound-widget": name, children: [
    label !== void 0 && label !== null && label !== "" ? /* @__PURE__ */ jsx("span", { "data-frame-unbound-label": true, children: label }) : null,
    /* @__PURE__ */ jsx("span", { "data-frame-unbound-message": true, children: "Unable to display this field" })
  ] });
}

// src/unbound-form-control.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
var controls = /* @__PURE__ */ new Map();
function unboundFormControl(name, context) {
  const key = `${context}\0${name}`;
  let control = controls.get(key);
  if (!control) {
    const UnboundControl = (props) => /* @__PURE__ */ jsx2(
      UnboundWidget,
      {
        context,
        name,
        pointer: props.id ?? props.fieldPathId?.$id
      }
    );
    UnboundControl.displayName = `UnboundControl(${name})`;
    control = UnboundControl;
    controls.set(key, control);
  }
  return control;
}

// src/ui-schema.ts
function buildUiSchema(schema, registry, options = {}) {
  return walkUiSchema(schema, registry, schema, /* @__PURE__ */ new Set(), options, true);
}
function isCompositeNode(schema, rootSchema) {
  const nodeType = schema.type ?? compositeTypeOf(schema, rootSchema);
  return nodeType === "object" || nodeType === "array" || Array.isArray(nodeType) && (nodeType.includes("object") || nodeType.includes("array"));
}
function compositeTypeOf(node, root) {
  const resolved = resolveLocalRef(node, root);
  if (resolved.type !== void 0) {
    return resolved.type;
  }
  const branches = node.anyOf ?? node.oneOf;
  if (Array.isArray(branches)) {
    for (const branch of branches) {
      if (branch && typeof branch === "object" && branch.type !== "null") {
        const branchType = resolveLocalRef(branch, root).type;
        if (branchType !== void 0) return branchType;
      }
    }
  }
  return void 0;
}
function resolveLocalRef(node, root) {
  const ref = node.$ref;
  if (typeof ref !== "string" || !ref.startsWith("#/")) {
    return node;
  }
  let target = root;
  for (const segment of ref.slice(2).split("/")) {
    if (!target || typeof target !== "object") return node;
    target = target[segment];
  }
  return target && typeof target === "object" ? target : node;
}
function enumCarrier(schema, root) {
  const own = resolveLocalRef(schema, root);
  if (Array.isArray(own.enum)) return own;
  if (!Array.isArray(own.anyOf)) return void 0;
  for (const branch of own.anyOf) {
    if (!branch || typeof branch !== "object" || branch.type === "null") continue;
    const resolved = resolveLocalRef(branch, root);
    if (Array.isArray(resolved.enum)) return resolved;
  }
  return void 0;
}
function walkUiSchema(schema, registry, root, seen, walk, isRoot = false) {
  const ui = {};
  const node = walk.plainData && !isRoot ? withoutDeclaredName(schema) : schema;
  const resolved = registry.resolveEntry(node, walk.context);
  let { widget, config } = resolved;
  if (resolved.bound === false && resolved.name !== void 0) {
    widget = unboundFormControl(resolved.name, walk.context ?? "edit");
    config = void 0;
  }
  if (widget === void 0 && !node["x-widget"] && schema.type === "object" && !schema.$ref && !schema.anyOf && !schema.oneOf && !schema.allOf && Object.keys(schema.properties ?? {}).length === 0 && schema.additionalProperties !== false) {
    ({ widget, config } = registry.resolveEntry({ ...schema, "x-widget": "json" }));
  }
  let fieldReplacesAnyOrOneOf = false;
  if (widget !== void 0) {
    if (typeof widget !== "string" && isCompositeNode(schema, root)) {
      ui["ui:field"] = widget;
      fieldReplacesAnyOrOneOf = Array.isArray(schema.anyOf) || Array.isArray(schema.oneOf);
    } else {
      ui["ui:widget"] = widget;
    }
  }
  if (typeof schema["x-placeholder"] === "string") {
    ui["ui:placeholder"] = schema["x-placeholder"];
  }
  const declaredOptions = schema["x-widget-options"];
  const options = mergeOptions(
    mergeOptions(
      config,
      fieldReplacesAnyOrOneOf ? { fieldReplacesAnyOrOneOf: true } : void 0
    ),
    declaredOptions && typeof declaredOptions === "object" && !Array.isArray(declaredOptions) ? declaredOptions : void 0
  );
  if (options && Object.keys(options).length > 0) {
    ui["ui:options"] = options;
  }
  const enumNode = enumCarrier(schema, root);
  if (enumNode) Object.assign(ui, liftEnumNames(enumNode, ui));
  const type = schema.type;
  const isArray = type === "array" || Array.isArray(type) && type.includes("array");
  if (isArray && (!schema.items || typeof schema.items !== "object")) {
    ui["ui:widget"] = "hidden";
  }
  let target = schema;
  const ref = schema.$ref;
  if (typeof ref === "string" && ref.startsWith("#/")) {
    if (seen.has(ref)) return ui;
    seen = new Set(seen).add(ref);
    target = resolveLocalRef(schema, root);
  }
  const properties = target.properties;
  if (properties) {
    for (const [key, child] of Object.entries(properties)) {
      const childUi = walkUiSchema(child, registry, root, seen, walk);
      if (Object.keys(childUi).length > 0) {
        ui[key] = childUi;
      }
    }
  }
  const items = target.items;
  if (items && typeof items === "object" && !Array.isArray(items)) {
    const itemsUi = walkUiSchema(items, registry, root, seen, walk);
    if (Object.keys(itemsUi).length > 0) {
      ui.items = itemsUi;
    }
  }
  return ui;
}
function mergeOptions(a, b) {
  if (!a) return b;
  if (!b) return a;
  return mergeUiSchema(a, b);
}
function mergeUiSchema(generated, overrides) {
  if (!overrides) return generated;
  const merged = { ...generated };
  for (const [key, value] of Object.entries(overrides)) {
    const existing = merged[key];
    if (existing && typeof existing === "object" && !Array.isArray(existing) && value && typeof value === "object" && !Array.isArray(value)) {
      merged[key] = mergeUiSchema(existing, value);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}
function liftEnumNames(node, uiSchema) {
  const names = node.enumNames;
  const values = node.enum;
  if (!Array.isArray(names) || !Array.isArray(values) || names.length !== values.length) return uiSchema;
  if (uiSchema["ui:enumNames"] !== void 0) return uiSchema;
  return { ...uiSchema, "ui:enumNames": names };
}
function withoutDeclaredName(node) {
  if (node["x-widget"] === void 0) return node;
  const { "x-widget": _name, ...rest } = node;
  return rest;
}

// src/widgets/button-group.tsx
import { jsx as jsx3 } from "react/jsx-runtime";
var ROW_STYLE = { display: "inline-flex", gap: 4, flexWrap: "wrap" };
var BUTTON_STYLE = {
  padding: "4px 12px",
  borderRadius: 999,
  border: "1px solid var(--stud-line-strong)",
  background: "var(--stud-surface)",
  color: "var(--stud-ink)",
  fontSize: 13,
  cursor: "pointer"
};
var SELECTED_STYLE = {
  ...BUTTON_STYLE,
  background: "var(--stud-accent)",
  borderColor: "var(--stud-accent)",
  color: "var(--stud-surface)"
};
function enumOptions(props) {
  if (props.options?.enumOptions?.length) {
    return props.options.enumOptions;
  }
  const values = props.schema?.enum;
  return Array.isArray(values) ? values.map((value) => ({ value, label: String(value) })) : [];
}
function ButtonGroupWidget(props) {
  const { id, value, disabled, readonly, onChange } = props;
  const locked = Boolean(disabled || readonly);
  return /* @__PURE__ */ jsx3("div", { id, role: "group", "data-widget": "button-group", style: ROW_STYLE, children: enumOptions(props).map((option) => {
    const selected = value === option.value;
    return /* @__PURE__ */ jsx3(
      "button",
      {
        type: "button",
        "data-value": String(option.value),
        "aria-pressed": selected,
        disabled: locked,
        onClick: () => onChange(option.value),
        style: selected ? SELECTED_STYLE : BUTTON_STYLE,
        children: option.label
      },
      String(option.value)
    );
  }) });
}

// src/widgets/field-tokens.ts
var FIELD_BORDER = "var(--input, var(--stud-line-strong, oklch(0.87 0.01 248)))";
var FIELD_SURFACE = "var(--background, var(--stud-surface, oklch(1 0 0)))";
var FIELD_INK = "var(--foreground, var(--stud-ink, oklch(0.21 0.04 265)))";

// src/widgets/combobox.tsx
import { Fragment, jsx as jsx4, jsxs as jsxs2 } from "react/jsx-runtime";
var INPUT_STYLE = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: `1px solid ${FIELD_BORDER}`,
  background: FIELD_SURFACE,
  color: FIELD_INK,
  fontSize: 13
};
function suggestions(props) {
  const list = props.options?.suggestions;
  return Array.isArray(list) ? list.map(String) : [];
}
function ComboboxWidget(props) {
  const { id, value, disabled, readonly, onChange } = props;
  const locked = Boolean(disabled || readonly);
  const listId = id ? `${id}-suggestions` : void 0;
  const opts = suggestions(props);
  return /* @__PURE__ */ jsxs2(Fragment, { children: [
    /* @__PURE__ */ jsx4(
      "input",
      {
        id,
        type: "text",
        "data-widget": "combobox",
        list: listId,
        value: value == null ? "" : String(value),
        disabled: locked,
        onChange: (e) => onChange(e.target.value === "" ? void 0 : e.target.value),
        style: INPUT_STYLE
      }
    ),
    listId && opts.length > 0 && /* @__PURE__ */ jsx4("datalist", { id: listId, children: opts.map((opt) => /* @__PURE__ */ jsx4("option", { value: opt }, opt)) })
  ] });
}

// src/widgets/star-rating.tsx
import { jsx as jsx5 } from "react/jsx-runtime";
var ROW_STYLE2 = { display: "inline-flex", gap: 2, fontSize: 20, lineHeight: 1 };
var STAR_STYLE = {
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer"
};
function maxStars(props) {
  const schema = props.schema;
  if (typeof schema?.maximum === "number") {
    return schema.maximum;
  }
  if (Array.isArray(schema?.enum)) {
    return schema.enum.length;
  }
  if (props.options?.enumOptions?.length) {
    return props.options.enumOptions.length;
  }
  return 5;
}
function StarRatingWidget(props) {
  const { id, value, disabled, readonly, onChange } = props;
  const locked = Boolean(disabled || readonly);
  const current = Number(value) || 0;
  const max = maxStars(props);
  return /* @__PURE__ */ jsx5("div", { id, role: "radiogroup", "data-widget": "star-rating", style: ROW_STYLE2, children: Array.from({ length: max }, (_, index) => index + 1).map((star) => {
    const filled = star <= current;
    return /* @__PURE__ */ jsx5(
      "button",
      {
        type: "button",
        "data-star": star,
        role: "radio",
        "aria-checked": star === current,
        "aria-label": `${star} star${star > 1 ? "s" : ""}`,
        disabled: locked,
        onClick: () => onChange(star),
        style: { ...STAR_STYLE, color: filled ? "var(--stud-star)" : "var(--stud-line-strong)" },
        children: "\u2605"
      },
      star
    );
  }) });
}

// src/widgets/json.tsx
import { useEffect as useEffect2, useRef, useState } from "react";

// src/display-label.ts
function displayLabel(schema, key, options = {}) {
  const title = schema?.title;
  if (typeof title === "string" && title.trim() !== "") return title;
  return options.property && key ? humanizeKey(key) : "";
}
function humanizeKey(key) {
  const words = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(/[\s_\-.]+/).filter(Boolean).map((word) => word.toLowerCase());
  if (words.length > 1 && words[words.length - 1] === "id") words.pop();
  const sentence = words.join(" ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

// src/widgets/json.tsx
import { jsx as jsx6, jsxs as jsxs3 } from "react/jsx-runtime";
var invalidObjectMessage = "Enter a valid JSON object.";
function parseObject(draft) {
  const value = JSON.parse(draft);
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new Error(invalidObjectMessage);
  }
  return value;
}
function JsonField({
  formData,
  onChange,
  fieldPathId,
  schema,
  name,
  disabled,
  readonly
}) {
  const display = (value) => typeof value === "string" ? value : JSON.stringify(value ?? {}, null, 2);
  const [text, setText] = useState(() => display(formData));
  let error;
  try {
    parseObject(text);
  } catch {
    error = invalidObjectMessage;
  }
  const lastValue = useRef(formData);
  useEffect2(() => {
    if (formData !== lastValue.current) {
      lastValue.current = formData;
      setText(display(formData));
    }
  }, [formData]);
  const id = fieldPathId.$id;
  return /* @__PURE__ */ jsxs3("div", { children: [
    /* @__PURE__ */ jsx6("label", { htmlFor: id, children: displayLabel(schema, name, { property: true }) }),
    /* @__PURE__ */ jsx6(
      "textarea",
      {
        id,
        "data-widget": "json",
        value: text,
        disabled,
        readOnly: readonly,
        "aria-invalid": Boolean(error),
        "aria-describedby": error ? `${id}-error` : void 0,
        rows: 12,
        style: {
          width: "100%",
          padding: 10,
          border: `1px solid ${FIELD_BORDER}`,
          borderRadius: 8,
          background: FIELD_SURFACE,
          color: FIELD_INK,
          fontFamily: "monospace"
        },
        onChange: (event) => {
          const draft = event.target.value;
          setText(draft);
          let value;
          try {
            value = parseObject(draft);
          } catch {
            lastValue.current = draft;
            onChange(draft, fieldPathId.path, { __errors: [invalidObjectMessage] });
            return;
          }
          lastValue.current = value;
          onChange(value, fieldPathId.path);
        }
      }
    ),
    error && /* @__PURE__ */ jsx6("p", { id: `${id}-error`, role: "alert", children: error })
  ] });
}

// src/registry.ts
var FORMAT_INPUTS = ["date", "date-time", "email", "uri"];
var RJSF_STOCK_NAMES = [
  "alt-date",
  "alt-datetime",
  "checkbox",
  "checkboxes",
  "color",
  "data-url",
  "date",
  "date-time",
  "datetime",
  "email",
  "file",
  "files",
  "hidden",
  "hostname",
  "ipv4",
  "ipv6",
  "password",
  "radio",
  "range",
  "select",
  "text",
  "textarea",
  "time",
  "updown",
  "uri"
];
var BUILTIN_NAMES = [
  // RJSF's 25 stock names (the keys of `@rjsf/utils` getWidget's widget map), each resolving to itself, so a
  // declaration can name any of them (ruling 04 §5). Valid only on the node types RJSF lists each under.
  ...RJSF_STOCK_NAMES.map((name) => [name, name]),
  ["combobox", ComboboxWidget],
  ["json", JsonField],
  ["button-group", ButtonGroupWidget],
  ["star-rating", StarRatingWidget]
];
var INFERENCE = [
  // enum → radio for small sets (≤4); RJSF's default select covers the rest
  {
    predicate: (s) => Array.isArray(s.enum) && s.enum.length <= 4,
    widget: "radio"
  },
  { predicate: (s) => Array.isArray(s.enum), widget: void 0 },
  // format-based
  { predicate: (s) => s.format === "file", widget: "file" },
  {
    predicate: (s) => FORMAT_INPUTS.includes(s.format),
    widget: void 0
  }
  // type-based and string fallback: RJSF defaults are the contract
];
function nameEntry(name, widget, config, scope) {
  return {
    predicate: (s) => s["x-widget"] === name,
    widget,
    config,
    name,
    ...scope?.contexts ? { contexts: [...scope.contexts] } : {}
  };
}
function inScope(entry, context) {
  return entry.contexts === void 0 || context !== void 0 && entry.contexts.includes(context);
}
function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
function mergeOptions2(a, b) {
  if (!a) return b;
  if (!b) return a;
  return mergeUiSchema(a, b);
}
function createWidgetRegistry() {
  const entries = [...BUILTIN_NAMES.map(([name, widget]) => nameEntry(name, widget)), ...INFERENCE];
  function registerWidget2(nameOrPredicate, widget, config, scope) {
    const entry = typeof nameOrPredicate === "function" ? { predicate: nameOrPredicate, widget, config } : nameEntry(nameOrPredicate, widget, config, scope);
    entries.unshift(entry);
  }
  function binding(name, context) {
    const named = entries.filter((e) => e.name === name);
    return named.find((e) => e.contexts !== void 0 && inScope(e, context)) ?? named.find((e) => e.contexts === void 0);
  }
  function resolveEntry(schema, context) {
    const declared = typeof schema["x-widget"] === "string" ? schema["x-widget"] : void 0;
    const bound = declared === void 0 ? void 0 : binding(declared, context);
    const declaredOptions = plainObject(schema["x-widget-options"]);
    const result = (entry) => {
      const config = entry === void 0 ? void 0 : typeof entry.config === "function" ? entry.config(schema) : entry.config;
      const options = mergeOptions2(config, declaredOptions);
      return {
        widget: entry?.widget,
        ...config !== void 0 ? { config } : {},
        ...options !== void 0 ? { options } : {},
        ...declared !== void 0 ? { bound: bound !== void 0, name: declared } : {}
      };
    };
    if (declared !== void 0 && bound === void 0) return result(void 0);
    for (const entry of entries) {
      if (entry.name !== void 0) {
        if (entry.name === declared && inScope(entry, context)) return result(bound);
        continue;
      }
      if (entry.predicate(schema)) return result(entry);
    }
    return result(void 0);
  }
  function resolveWidget2(schema, context) {
    return resolveEntry(schema, context).widget;
  }
  function names() {
    const named = [...new Set(entries.flatMap((e) => e.name === void 0 ? [] : [e.name]))];
    return named.map((name) => {
      const own = entries.filter((e) => e.name === name);
      const answering = [
        ...own.filter((e) => e.contexts !== void 0),
        ...own.filter((e) => e.contexts === void 0).slice(0, 1)
      ];
      return {
        name,
        registrations: answering.map((e) => ({
          contexts: e.contexts ? [...e.contexts].sort() : null,
          widget: e.widget
        }))
      };
    }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  }
  return { registerWidget: registerWidget2, resolveWidget: resolveWidget2, resolveEntry, names };
}
var defaultRegistry = createWidgetRegistry();
var registerWidget = defaultRegistry.registerWidget;
var resolveWidget = defaultRegistry.resolveWidget;

// src/refs.ts
var cacheByFetcher = /* @__PURE__ */ new WeakMap();
function fetchRef(ref, fetcher) {
  let cache = cacheByFetcher.get(fetcher);
  if (!cache) {
    cache = /* @__PURE__ */ new Map();
    cacheByFetcher.set(fetcher, cache);
  }
  let pending = cache.get(ref);
  if (!pending) {
    pending = fetcher(ref);
    cache.set(ref, pending);
  }
  return pending;
}
async function resolveExternalRefs(schema, fetcher) {
  if (!fetcher) return schema;
  async function walk(node, ancestry) {
    if (Array.isArray(node)) {
      return Promise.all(node.map((item) => walk(item, ancestry)));
    }
    if (!node || typeof node !== "object") {
      return node;
    }
    const record = node;
    const ref = record.$ref;
    if (typeof ref === "string" && !ref.startsWith("#")) {
      if (ancestry.has(ref)) {
        return record;
      }
      const fetched = await fetchRef(ref, fetcher);
      const { $ref: _dropped, ...siblings } = record;
      const resolved = await walk(fetched, /* @__PURE__ */ new Set([...ancestry, ref]));
      return { ...resolved, ...siblings };
    }
    const out = {};
    for (const [key, value] of Object.entries(record)) {
      out[key] = await walk(value, ancestry);
    }
    return out;
  }
  return await walk(schema, /* @__PURE__ */ new Set());
}

// src/nullable-refs.ts
function normalizeNullableRefs(schema) {
  function walk(node) {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== "object") return node;
    let record = { ...node };
    if (typeof record.$ref === "string" && record.nullable === true) {
      const { $ref, nullable: _nullable, ...siblings } = record;
      record = { anyOf: [{ $ref }, { type: "null" }], ...siblings };
    }
    for (const [key, value] of Object.entries(record)) {
      record[key] = walk(value);
    }
    return record;
  }
  return walk(schema);
}

// src/SchemaForm.tsx
import { createContext as createContext2, useContext as useContext2, useEffect as useEffect3, useMemo, useState as useState3 } from "react";

// src/theme.tsx
import { getDefaultRegistry, withTheme } from "@rjsf/core";
import { Theme as RjsfShadcnTheme } from "@rjsf/shadcn";
import { createContext, useContext } from "react";

// src/GroupedObjectFieldTemplate.tsx
import { Theme as ShadcnTheme } from "@rjsf/shadcn";
import { useState as useState2 } from "react";
import { Fragment as Fragment2, jsx as jsx7, jsxs as jsxs4 } from "react/jsx-runtime";
var ShadcnObjectFieldTemplate = ShadcnTheme.templates?.ObjectFieldTemplate;
var GroupedObjectFieldTemplate = groupedObjectFieldTemplate(ShadcnObjectFieldTemplate);
function groupedObjectFieldTemplate(Fallback) {
  function SeamGroupedObjectFieldTemplate(props) {
    return /* @__PURE__ */ jsx7(Grouped, { ...props, Fallback });
  }
  return SeamGroupedObjectFieldTemplate;
}
function Grouped({ Fallback: DefaultObjectFieldTemplate, ...props }) {
  const { properties, schema, title, description } = props;
  const propSchemas = schema.properties;
  const groupOf = (name) => {
    const group = propSchemas?.[name]?.["x-group"];
    return typeof group === "string" && group.length > 0 ? group : null;
  };
  const tabOf = (name) => {
    const tab = propSchemas?.[name]?.["x-tab"];
    return typeof tab === "string" && tab.length > 0 ? tab : null;
  };
  if (!properties.some((element) => groupOf(element.name))) {
    return DefaultObjectFieldTemplate ? /* @__PURE__ */ jsx7(DefaultObjectFieldTemplate, { ...props }) : /* @__PURE__ */ jsx7("div", { className: "flex flex-col gap-4", children: properties.map((element) => /* @__PURE__ */ jsx7("div", { className: element.hidden ? "hidden" : void 0, children: element.content }, element.name)) });
  }
  const order = [];
  const buckets = /* @__PURE__ */ new Map();
  const ungrouped = [];
  for (const element of properties) {
    const group = groupOf(element.name);
    if (!group) {
      ungrouped.push(element);
      continue;
    }
    if (!buckets.has(group)) {
      buckets.set(group, []);
      order.push(group);
    }
    buckets.get(group).push(element);
  }
  const renderField = (element) => /* @__PURE__ */ jsx7("div", { className: element.hidden ? "hidden" : void 0, children: element.content }, element.name);
  const renderGroup = (group) => (
    // `<fieldset>` carries a UA-stylesheet `min-width: min-content` that `flex`/`flex-col`
    // alone don't reset — inside a narrow panel (e.g. a fixed-width Inspector), that intrinsic
    // minimum forces wide children (a two-input key/value row) to overflow instead of shrink.
    // `min-w-0` on the fieldset itself is the actual fix (verified: without it, a 415px-wide
    // row blew out a 268px content box).
    /* @__PURE__ */ jsxs4("fieldset", { className: "flex min-w-0 flex-col gap-4", children: [
      /* @__PURE__ */ jsx7("legend", { className: "mb-1 w-full border-b border-border pb-1 text-sm font-semibold text-foreground", children: group }),
      buckets.get(group).map(renderField)
    ] }, group)
  );
  const header = /* @__PURE__ */ jsxs4(Fragment2, { children: [
    title ? /* @__PURE__ */ jsx7("div", { className: "text-base font-semibold text-foreground", children: title }) : null,
    description ? /* @__PURE__ */ jsx7("p", { className: "text-sm text-muted-foreground", children: description }) : null,
    ungrouped.length > 0 ? /* @__PURE__ */ jsx7("div", { className: "flex flex-col gap-4", children: ungrouped.map(renderField) }) : null
  ] });
  const tabOfGroup = /* @__PURE__ */ new Map();
  for (const group of order) tabOfGroup.set(group, tabOf(buckets.get(group)[0].name));
  const hasTabs = order.some((group) => tabOfGroup.get(group));
  if (!hasTabs) {
    return /* @__PURE__ */ jsxs4("div", { className: "flex flex-col gap-6", children: [
      header,
      order.map(renderGroup)
    ] });
  }
  return /* @__PURE__ */ jsx7(
    TabbedGroups,
    {
      header,
      order,
      tabOfGroup,
      renderGroup
    }
  );
}
function TabbedGroups({
  header,
  order,
  tabOfGroup,
  renderGroup
}) {
  const untabbed = order.filter((group) => !tabOfGroup.get(group));
  const tabOrder = [];
  const tabbedGroups = /* @__PURE__ */ new Map();
  for (const group of order) {
    const tab = tabOfGroup.get(group);
    if (!tab) continue;
    if (!tabbedGroups.has(tab)) {
      tabbedGroups.set(tab, []);
      tabOrder.push(tab);
    }
    tabbedGroups.get(tab).push(group);
  }
  const [active, setActive] = useState2(tabOrder[0]);
  return /* @__PURE__ */ jsxs4("div", { className: "flex flex-col gap-6", children: [
    header,
    untabbed.map(renderGroup),
    /* @__PURE__ */ jsx7("div", { role: "tablist", className: "flex gap-1 border-b border-border", children: tabOrder.map((tab) => /* @__PURE__ */ jsx7(
      "button",
      {
        type: "button",
        role: "tab",
        "aria-selected": active === tab,
        "data-state": active === tab ? "active" : "inactive",
        className: active === tab ? "border-b-2 border-primary px-3 py-2 text-sm font-medium text-foreground" : "border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground",
        onClick: () => setActive(tab),
        children: tab
      },
      tab
    )) }),
    tabOrder.map((tab) => /* @__PURE__ */ jsx7("div", { role: "tabpanel", hidden: active !== tab, className: "flex flex-col gap-6", children: tabbedGroups.get(tab).map(renderGroup) }, tab))
  ] });
}

// src/theme-overrides.tsx
import { Theme as ShadcnTheme2 } from "@rjsf/shadcn";
import { getSubmitButtonOptions } from "@rjsf/utils";
import { jsx as jsx8 } from "react/jsx-runtime";
var DISABLED_PRIMARY = "disabled:opacity-100 disabled:bg-foreground/10 disabled:text-foreground/55 disabled:shadow-none";
var FLUSH_FIELD = "-mx-0.5";
function flush(Inner, name) {
  const Flush = (props) => /* @__PURE__ */ jsx8("div", { className: FLUSH_FIELD, "data-seam-flush": "", children: /* @__PURE__ */ jsx8(Inner, { ...props }) });
  Flush.displayName = name;
  return Flush;
}
var theme = ShadcnTheme2.templates;
var BaseInputTemplate = flush(
  theme.BaseInputTemplate,
  "SeamBaseInputTemplate"
);
var SelectWidget = flush(
  ShadcnTheme2.widgets.SelectWidget,
  "SeamSelectWidget"
);
var TextareaWidget = flush(
  ShadcnTheme2.widgets.TextareaWidget,
  "SeamTextareaWidget"
);
var ThemeSubmitButton = theme.ButtonTemplates.SubmitButton;
function SubmitButton(props) {
  const options = getSubmitButtonOptions(props.uiSchema);
  const className = [DISABLED_PRIMARY, options.props?.className].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsx8(
    ThemeSubmitButton,
    {
      ...props,
      uiSchema: {
        "ui:options": { submitButtonOptions: { ...options, props: { ...options.props, className } } }
      }
    }
  );
}
function fieldLabel(label, schema, uiSchema) {
  const ui = uiSchema ?? {};
  const declared = [ui["ui:title"], ui["ui:options"]?.title, schema?.title].find(
    (t) => typeof t === "string" && t.trim() !== ""
  );
  return declared ?? (label ? humanizeKey(label) : label);
}
function labelledFieldTemplate(Inner) {
  function SeamFieldTemplate(props) {
    return /* @__PURE__ */ jsx8(Inner, { ...props, label: fieldLabel(props.label, props.schema, props.uiSchema) ?? "" });
  }
  return SeamFieldTemplate;
}
function labelledCheckboxWidget(Inner) {
  function SeamCheckboxWidget(props) {
    return /* @__PURE__ */ jsx8(Inner, { ...props, label: fieldLabel(props.label, props.schema, props.uiSchema) ?? "" });
  }
  return SeamCheckboxWidget;
}

// src/widgets/radio.tsx
import { Theme as ShadcnTheme3 } from "@rjsf/shadcn";
import { useRef as useRef2 } from "react";
import { jsx as jsx9 } from "react/jsx-runtime";
var ThemeRadioWidget = ShadcnTheme3.widgets?.RadioWidget;
var NOT_EMITTED = /* @__PURE__ */ Symbol("not-emitted");
function RadioWidget(props) {
  const emitted = useRef2(NOT_EMITTED);
  const seen = useRef2(props.value);
  const generation = useRef2(0);
  if (!Object.is(props.value, seen.current)) {
    seen.current = props.value;
    if (!Object.is(props.value, emitted.current)) {
      generation.current += 1;
    }
    emitted.current = NOT_EMITTED;
  }
  return /* @__PURE__ */ jsx9(
    ThemeRadioWidget,
    {
      ...props,
      options: { ...props.options, optionValueFormat: "realValue" },
      onChange: (value) => {
        emitted.current = value;
        props.onChange(value);
      }
    },
    generation.current
  );
}

// src/theme.tsx
var shadcnTheme = {
  ...RjsfShadcnTheme,
  templates: {
    ...RjsfShadcnTheme.templates,
    BaseInputTemplate,
    ButtonTemplates: { ...RjsfShadcnTheme.templates?.ButtonTemplates, SubmitButton }
  },
  widgets: { ...RjsfShadcnTheme.widgets, RadioWidget, SelectWidget, TextareaWidget }
};
var RjsfThemeContext = createContext(null);
function useRjsfTheme(theme2) {
  const fromContext = useContext(RjsfThemeContext);
  return theme2 ?? fromContext ?? shadcnTheme;
}
function withNeutralRules(theme2) {
  const core = getDefaultRegistry();
  const templates = { ...core.templates, ...theme2.templates };
  const widgets = { ...core.widgets, ...theme2.widgets };
  return {
    ...theme2,
    templates: {
      ...theme2.templates,
      FieldTemplate: labelledFieldTemplate(templates.FieldTemplate),
      ObjectFieldTemplate: groupedObjectFieldTemplate(
        templates.ObjectFieldTemplate
      )
    },
    widgets: {
      ...theme2.widgets,
      CheckboxWidget: labelledCheckboxWidget(widgets.CheckboxWidget)
    }
  };
}
var themedForms = /* @__PURE__ */ new WeakMap();
function themedForm(theme2) {
  let form = themedForms.get(theme2);
  if (!form) {
    form = withTheme(withNeutralRules(theme2));
    themedForms.set(theme2, form);
  }
  return form;
}

// src/validator.ts
import { customizeValidator } from "@rjsf/validator-ajv8";
import Ajv2020 from "ajv/dist/2020.js";

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-draft-07.json
var json_schema_draft_07_default = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "http://json-schema.org/draft-07/schema#",
  title: "Core schema meta-schema",
  definitions: {
    schemaArray: {
      type: "array",
      minItems: 1,
      items: { $ref: "#" }
    },
    nonNegativeInteger: {
      type: "integer",
      minimum: 0
    },
    nonNegativeIntegerDefault0: {
      allOf: [{ $ref: "#/definitions/nonNegativeInteger" }, { default: 0 }]
    },
    simpleTypes: {
      enum: ["array", "boolean", "integer", "null", "number", "object", "string"]
    },
    stringArray: {
      type: "array",
      items: { type: "string" },
      uniqueItems: true,
      default: []
    }
  },
  type: ["object", "boolean"],
  properties: {
    $id: {
      type: "string",
      format: "uri-reference"
    },
    $schema: {
      type: "string",
      format: "uri"
    },
    $ref: {
      type: "string",
      format: "uri-reference"
    },
    $comment: {
      type: "string"
    },
    title: {
      type: "string"
    },
    description: {
      type: "string"
    },
    default: true,
    readOnly: {
      type: "boolean",
      default: false
    },
    examples: {
      type: "array",
      items: true
    },
    multipleOf: {
      type: "number",
      exclusiveMinimum: 0
    },
    maximum: {
      type: "number"
    },
    exclusiveMaximum: {
      type: "number"
    },
    minimum: {
      type: "number"
    },
    exclusiveMinimum: {
      type: "number"
    },
    maxLength: { $ref: "#/definitions/nonNegativeInteger" },
    minLength: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
    pattern: {
      type: "string",
      format: "regex"
    },
    additionalItems: { $ref: "#" },
    items: {
      anyOf: [{ $ref: "#" }, { $ref: "#/definitions/schemaArray" }],
      default: true
    },
    maxItems: { $ref: "#/definitions/nonNegativeInteger" },
    minItems: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
    uniqueItems: {
      type: "boolean",
      default: false
    },
    contains: { $ref: "#" },
    maxProperties: { $ref: "#/definitions/nonNegativeInteger" },
    minProperties: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
    required: { $ref: "#/definitions/stringArray" },
    additionalProperties: { $ref: "#" },
    definitions: {
      type: "object",
      additionalProperties: { $ref: "#" },
      default: {}
    },
    properties: {
      type: "object",
      additionalProperties: { $ref: "#" },
      default: {}
    },
    patternProperties: {
      type: "object",
      additionalProperties: { $ref: "#" },
      propertyNames: { format: "regex" },
      default: {}
    },
    dependencies: {
      type: "object",
      additionalProperties: {
        anyOf: [{ $ref: "#" }, { $ref: "#/definitions/stringArray" }]
      }
    },
    propertyNames: { $ref: "#" },
    const: true,
    enum: {
      type: "array",
      items: true,
      minItems: 1,
      uniqueItems: true
    },
    type: {
      anyOf: [
        { $ref: "#/definitions/simpleTypes" },
        {
          type: "array",
          items: { $ref: "#/definitions/simpleTypes" },
          minItems: 1,
          uniqueItems: true
        }
      ]
    },
    format: { type: "string" },
    contentMediaType: { type: "string" },
    contentEncoding: { type: "string" },
    if: { $ref: "#" },
    then: { $ref: "#" },
    else: { $ref: "#" },
    allOf: { $ref: "#/definitions/schemaArray" },
    anyOf: { $ref: "#/definitions/schemaArray" },
    oneOf: { $ref: "#/definitions/schemaArray" },
    not: { $ref: "#" }
  },
  default: true
};

// src/validator.ts
function createFormValidator(options) {
  return customizeValidator({
    AjvClass: Ajv2020,
    ...options,
    additionalMetaSchemas: [
      json_schema_draft_07_default,
      ...options?.additionalMetaSchemas ?? []
    ],
    ajvOptionsOverrides: {
      strict: false,
      allErrors: true,
      ...options?.ajvOptionsOverrides
    }
  });
}
var defaultValidator = createFormValidator();

// src/SchemaForm.tsx
import { jsx as jsx10 } from "react/jsx-runtime";
var WidgetRegistryContext = createContext2(null);
function SchemaForm({
  schema,
  uiSchema,
  registry,
  schemaFetcher,
  validator,
  formData,
  formContext,
  templates,
  widgets,
  theme: theme2,
  plainData = false,
  ...rest
}) {
  const ThemedForm = themedForm(useRjsfTheme(theme2));
  const contextRegistry = useContext2(WidgetRegistryContext);
  const activeRegistry = registry ?? contextRegistry ?? defaultRegistry;
  const isObjectSchema = schema.type === "object" || Array.isArray(schema.type) && schema.type.includes("object");
  const safeFormData = isObjectSchema && Array.isArray(formData) ? {} : formData;
  const [resolvedSchema, setResolvedSchema] = useState3(
    schemaFetcher ? null : schema
  );
  useEffect3(() => {
    let cancelled = false;
    if (!schemaFetcher) {
      setResolvedSchema(schema);
      return;
    }
    setResolvedSchema(null);
    resolveExternalRefs(schema, schemaFetcher).then((resolved) => {
      if (!cancelled) setResolvedSchema(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [schema, schemaFetcher]);
  const formSchema = useMemo(
    () => resolvedSchema ? normalizeNullableRefs(resolvedSchema) : null,
    [resolvedSchema]
  );
  const generatedUiSchema = useMemo(
    // The form is the `edit` context: a name scoped to `edit` binds here, a `list-column` kind never does.
    () => formSchema ? buildUiSchema(formSchema, activeRegistry, { context: "edit", plainData }) : {},
    [formSchema, activeRegistry, plainData]
  );
  if (!formSchema) {
    return null;
  }
  return /* @__PURE__ */ jsx10(
    ThemedForm,
    {
      schema: formSchema,
      uiSchema: mergeUiSchema(generatedUiSchema, uiSchema),
      validator: validator ?? defaultValidator,
      templates,
      widgets,
      formData: safeFormData,
      formContext: schemaFetcher ? { ...formContext, schemaFetcher } : formContext,
      ...rest
    }
  );
}

// src/widget-props.ts
import Form from "@rjsf/core";
import {
  TranslatableString,
  createSchemaUtils,
  getSchemaType,
  getUiOptions,
  isObject,
  optionsList
} from "@rjsf/utils";
import { useMemo as useMemo2 } from "react";
function createRjsfRegistry({ rootSchema, theme: theme2 = shadcnTheme, validator, formContext }) {
  const themed = withNeutralRules(theme2);
  const schemaUtils = createSchemaUtils(validator ?? defaultValidator, rootSchema);
  return Form.getRegistry(
    { schema: rootSchema, validator: validator ?? defaultValidator, fields: themed.fields, widgets: themed.widgets, templates: themed.templates, formContext },
    rootSchema,
    schemaUtils
  );
}
function useRjsfRegistry(rootSchema, formContext) {
  const theme2 = useRjsfTheme();
  return useMemo2(() => createRjsfRegistry({ rootSchema, theme: theme2, formContext }), [rootSchema, theme2, formContext]);
}
var noop = () => {
};
function choicesFor(schema, uiSchema, registry) {
  const type = getSchemaType(schema);
  const types = Array.isArray(type) ? type.filter((t) => t !== "null") : [type];
  if (types.length !== 1) return void 0;
  if (types[0] === "boolean") {
    const yes = registry.translateString(TranslatableString.YesLabel);
    const no = registry.translateString(TranslatableString.NoLabel);
    if (Array.isArray(schema.oneOf)) {
      return optionsList(
        {
          oneOf: schema.oneOf.filter((option) => isObject(option)).map((option) => ({ ...option, title: option.title || (option.const === true ? yes : no) }))
        },
        uiSchema
      );
    }
    const enums = schema.enum ?? [true, false];
    const { enumNames } = getUiOptions(uiSchema, registry.globalUiOptions);
    if (!enumNames && enums.length === 2 && enums.every((v) => typeof v === "boolean")) {
      return enums.map((value) => ({ value, label: value ? yes : no }));
    }
    return optionsList({ enum: enums }, uiSchema);
  }
  if (types[0] === "string" || types[0] === "number" || types[0] === "integer") {
    return registry.schemaUtils.isSelect(schema) ? optionsList(schema, uiSchema) : void 0;
  }
  return void 0;
}
function widgetProps(input) {
  const { registry, value, name, id } = input;
  const schema = registry.schemaUtils.retrieveSchema(input.schema, value);
  const uiSchema = liftEnumNames(schema, input.uiSchema ?? {});
  const enumOptions2 = choicesFor(schema, uiSchema, registry);
  const readonly = input.readonly ?? true;
  const disabled = input.disabled ?? false;
  const options = {
    ...input.options,
    ...enumOptions2 ? { enumOptions: enumOptions2 } : {},
    // A locked widget offers no action that writes. RJSF's alt-date widgets draw their Now and Clear buttons
    // whatever `readonly` says, and hide them only through these two options of their own.
    ...readonly || disabled ? { hideNowButton: true, hideClearButton: true } : {}
  };
  return {
    id,
    name,
    value,
    schema,
    uiSchema,
    registry,
    options,
    label: input.label ?? fieldLabel(name, schema, uiSchema) ?? "",
    hideLabel: true,
    readonly,
    disabled,
    required: input.required ?? false,
    autofocus: input.autofocus ?? false,
    placeholder: input.placeholder ?? "",
    rawErrors: [],
    onChange: input.onChange ?? noop,
    onBlur: input.onBlur ?? noop,
    onFocus: input.onFocus ?? noop
  };
}
function asWidget(resolved) {
  return resolved === void 0 || typeof resolved === "string" ? void 0 : resolved;
}
export {
  ButtonGroupWidget,
  ComboboxWidget,
  FORM_KEYWORDS,
  GroupedObjectFieldTemplate,
  RjsfThemeContext,
  SchemaForm,
  StarRatingWidget,
  UnboundWidget,
  WidgetRegistryContext,
  asWidget,
  buildUiSchema,
  createFormIntentBus,
  createFormValidator,
  createKeywordVocabulary,
  createRjsfRegistry,
  createWidgetRegistry,
  defaultRegistry,
  defaultValidator,
  displayLabel,
  humanizeKey,
  isCompositeNode,
  mergeUiSchema,
  normalizeNullableRefs,
  registerWidget,
  resolveExternalRefs,
  resolveWidget,
  shadcnTheme,
  useRjsfRegistry,
  widgetFormContext,
  widgetProps
};
//# sourceMappingURL=index.js.map