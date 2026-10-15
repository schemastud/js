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

// src/widgets/button-group.tsx
import { jsx } from "react/jsx-runtime";
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
  return /* @__PURE__ */ jsx("div", { id, role: "group", "data-widget": "button-group", style: ROW_STYLE, children: enumOptions(props).map((option) => {
    const selected = value === option.value;
    return /* @__PURE__ */ jsx(
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
import { Fragment, jsx as jsx2, jsxs } from "react/jsx-runtime";
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
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx2(
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
    listId && opts.length > 0 && /* @__PURE__ */ jsx2("datalist", { id: listId, children: opts.map((opt) => /* @__PURE__ */ jsx2("option", { value: opt }, opt)) })
  ] });
}

// src/widgets/star-rating.tsx
import { jsx as jsx3 } from "react/jsx-runtime";
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
  return /* @__PURE__ */ jsx3("div", { id, role: "radiogroup", "data-widget": "star-rating", style: ROW_STYLE2, children: Array.from({ length: max }, (_, index) => index + 1).map((star) => {
    const filled = star <= current;
    return /* @__PURE__ */ jsx3(
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
import { useEffect, useRef, useState } from "react";

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
import { jsx as jsx4, jsxs as jsxs2 } from "react/jsx-runtime";
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
  useEffect(() => {
    if (formData !== lastValue.current) {
      lastValue.current = formData;
      setText(display(formData));
    }
  }, [formData]);
  const id = fieldPathId.$id;
  return /* @__PURE__ */ jsxs2("div", { children: [
    /* @__PURE__ */ jsx4("label", { htmlFor: id, children: displayLabel(schema, name, { property: true }) }),
    /* @__PURE__ */ jsx4(
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
    error && /* @__PURE__ */ jsx4("p", { id: `${id}-error`, role: "alert", children: error })
  ] });
}

// src/registry.ts
var FORMAT_INPUTS = ["date", "date-time", "email", "uri"];
var defaultEntries = [
  // x-widget explicit overrides (checked first)
  { predicate: (s) => s["x-widget"] === "textarea", widget: "textarea" },
  { predicate: (s) => s["x-widget"] === "radio", widget: "radio" },
  { predicate: (s) => s["x-widget"] === "file", widget: "file" },
  { predicate: (s) => s["x-widget"] === "select", widget: "select" },
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
function createWidgetRegistry() {
  const entries = [
    { predicate: (s) => s["x-widget"] === "combobox", widget: ComboboxWidget },
    { predicate: (s) => s["x-widget"] === "json", widget: JsonField },
    ...defaultEntries
  ];
  function registerWidget2(predicateOrKey, widget, config) {
    const predicate = typeof predicateOrKey === "function" ? predicateOrKey : (s) => s.type === predicateOrKey || s["x-widget"] === predicateOrKey;
    entries.unshift({ predicate, widget, config });
  }
  function resolveEntry(schema) {
    for (const { predicate, widget, config } of entries) {
      if (predicate(schema)) {
        const computed = typeof config === "function" ? config(schema) : config;
        return { widget, config: computed };
      }
    }
    return { widget: void 0 };
  }
  function resolveWidget2(schema) {
    return resolveEntry(schema).widget;
  }
  return { registerWidget: registerWidget2, resolveWidget: resolveWidget2, resolveEntry };
}
var defaultRegistry = createWidgetRegistry();
defaultRegistry.registerWidget((s) => s["x-widget"] === "button-group", ButtonGroupWidget);
defaultRegistry.registerWidget((s) => s["x-widget"] === "star-rating", StarRatingWidget);
var registerWidget = defaultRegistry.registerWidget;
var resolveWidget = defaultRegistry.resolveWidget;

// src/block-chrome.tsx
import { jsx as jsx5, jsxs as jsxs3 } from "react/jsx-runtime";
var CARD_STYLE = {
  position: "relative",
  border: "1px solid var(--stud-line-strong)",
  borderRadius: 6,
  padding: "10px 12px",
  // The "striped" resting look that reads as un-skinned.
  backgroundImage: "repeating-linear-gradient(45deg, var(--stud-surface-subtle), var(--stud-surface-subtle) 8px, var(--stud-surface-muted) 8px, var(--stud-surface-muted) 16px)",
  color: "var(--stud-ink)",
  fontSize: 13
};
var HEADER_STYLE = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  marginBottom: 6,
  fontWeight: 600
};
var HINT_STYLE = { fontWeight: 400, fontSize: 12, color: "var(--stud-accent)" };
var ANCHOR_STYLE = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "3px 0",
  borderTop: "1px dashed var(--stud-line)"
};
var KEY_STYLE = { color: "var(--stud-ink-muted)" };
function attrKeys(node, ctx) {
  const schema = ctx?.attrsSchema;
  const properties = schema?.properties;
  if (properties && typeof properties === "object") {
    return Object.keys(properties);
  }
  return node.attrs ? Object.keys(node.attrs) : [];
}
function formatValue(value) {
  if (value === void 0 || value === null || value === "") {
    return "\u2014";
  }
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}
function BlockChromeFallback(node, ctx) {
  const attrs = node.attrs ?? {};
  return /* @__PURE__ */ jsxs3("div", { "data-blockdoc-skin": "block-chrome", "data-node-type": node.type, style: CARD_STYLE, children: [
    /* @__PURE__ */ jsxs3("div", { style: HEADER_STYLE, children: [
      /* @__PURE__ */ jsx5("span", { children: node.type }),
      /* @__PURE__ */ jsx5("span", { style: HINT_STYLE, children: "Edit via the inspector \u2192" })
    ] }),
    attrKeys(node, ctx).map((key) => /* @__PURE__ */ jsxs3("div", { "data-attr": key, style: ANCHOR_STYLE, children: [
      /* @__PURE__ */ jsx5("span", { style: KEY_STYLE, children: key }),
      /* @__PURE__ */ jsx5("span", { children: formatValue(attrs[key]) })
    ] }, key))
  ] });
}

// src/skin-registry.ts
function createSkinRegistry(fallback = BlockChromeFallback) {
  const skins = /* @__PURE__ */ new Map();
  function registerSkin2(nodeType, skin) {
    skins.set(nodeType, skin);
  }
  function hasSkin(nodeType) {
    return skins.has(nodeType);
  }
  function resolveSkin2(nodeType) {
    return skins.get(nodeType) ?? fallback;
  }
  return { registerSkin: registerSkin2, resolveSkin: resolveSkin2, hasSkin, fallback };
}
var defaultSkinRegistry = createSkinRegistry();
var registerSkin = defaultSkinRegistry.registerSkin;
var resolveSkin = defaultSkinRegistry.resolveSkin;

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
import { withTheme } from "@rjsf/core";
import { Theme as ShadcnTheme4 } from "@rjsf/shadcn";
import { createContext, useContext, useEffect as useEffect2, useMemo, useState as useState3 } from "react";

// src/widgets/radio.tsx
import { Theme as ShadcnTheme } from "@rjsf/shadcn";
import { useRef as useRef2 } from "react";
import { jsx as jsx6 } from "react/jsx-runtime";
var ThemeRadioWidget = ShadcnTheme.widgets?.RadioWidget;
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
  return /* @__PURE__ */ jsx6(
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

// src/theme-overrides.tsx
import { Theme as ShadcnTheme2 } from "@rjsf/shadcn";
import { getSubmitButtonOptions } from "@rjsf/utils";
import { jsx as jsx7 } from "react/jsx-runtime";
var DISABLED_PRIMARY = "disabled:opacity-100 disabled:bg-foreground/10 disabled:text-foreground/55 disabled:shadow-none";
var FLUSH_FIELD = "-mx-0.5";
function flush(Inner, name) {
  const Flush = (props) => /* @__PURE__ */ jsx7("div", { className: FLUSH_FIELD, "data-seam-flush": "", children: /* @__PURE__ */ jsx7(Inner, { ...props }) });
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
  return /* @__PURE__ */ jsx7(
    ThemeSubmitButton,
    {
      ...props,
      uiSchema: {
        "ui:options": { submitButtonOptions: { ...options, props: { ...options.props, className } } }
      }
    }
  );
}
var ThemeFieldTemplate = ShadcnTheme2.templates?.FieldTemplate;
function fieldLabel(label, schema, uiSchema) {
  const ui = uiSchema ?? {};
  const declared = [ui["ui:title"], ui["ui:options"]?.title, schema?.title].find(
    (t) => typeof t === "string" && t.trim() !== ""
  );
  return declared ?? (label ? humanizeKey(label) : label);
}
function FieldTemplate(props) {
  return /* @__PURE__ */ jsx7(ThemeFieldTemplate, { ...props, label: fieldLabel(props.label, props.schema, props.uiSchema) ?? "" });
}
var ThemeCheckboxWidget = ShadcnTheme2.widgets?.CheckboxWidget;
function CheckboxWidget(props) {
  return /* @__PURE__ */ jsx7(ThemeCheckboxWidget, { ...props, label: fieldLabel(props.label, props.schema, props.uiSchema) ?? "" });
}

// src/ui-schema.ts
function buildUiSchema(schema, registry) {
  return walkUiSchema(schema, registry, schema, /* @__PURE__ */ new Set());
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
function walkUiSchema(schema, registry, root, seen) {
  const ui = {};
  let { widget, config } = registry.resolveEntry(schema);
  if (widget === void 0 && !schema["x-widget"] && schema.type === "object" && !schema.$ref && !schema.anyOf && !schema.oneOf && !schema.allOf && Object.keys(schema.properties ?? {}).length === 0 && schema.additionalProperties !== false) {
    ({ widget, config } = registry.resolveEntry({ ...schema, "x-widget": "json" }));
  }
  let fieldReplacesAnyOrOneOf = false;
  if (widget !== void 0) {
    const nodeType = schema.type ?? compositeTypeOf(schema, root);
    const isComposite = nodeType === "object" || nodeType === "array" || Array.isArray(nodeType) && (nodeType.includes("object") || nodeType.includes("array"));
    if (typeof widget !== "string" && isComposite) {
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
      const childUi = walkUiSchema(child, registry, root, seen);
      if (Object.keys(childUi).length > 0) {
        ui[key] = childUi;
      }
    }
  }
  const items = target.items;
  if (items && typeof items === "object" && !Array.isArray(items)) {
    const itemsUi = walkUiSchema(items, registry, root, seen);
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

// src/GroupedObjectFieldTemplate.tsx
import { Theme as ShadcnTheme3 } from "@rjsf/shadcn";
import { useState as useState2 } from "react";
import { Fragment as Fragment2, jsx as jsx8, jsxs as jsxs4 } from "react/jsx-runtime";
var DefaultObjectFieldTemplate = ShadcnTheme3.templates?.ObjectFieldTemplate;
function GroupedObjectFieldTemplate(props) {
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
    return DefaultObjectFieldTemplate ? /* @__PURE__ */ jsx8(DefaultObjectFieldTemplate, { ...props }) : /* @__PURE__ */ jsx8("div", { className: "flex flex-col gap-4", children: properties.map((element) => /* @__PURE__ */ jsx8("div", { className: element.hidden ? "hidden" : void 0, children: element.content }, element.name)) });
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
  const renderField = (element) => /* @__PURE__ */ jsx8("div", { className: element.hidden ? "hidden" : void 0, children: element.content }, element.name);
  const renderGroup = (group) => (
    // `<fieldset>` carries a UA-stylesheet `min-width: min-content` that `flex`/`flex-col`
    // alone don't reset — inside a narrow panel (e.g. a fixed-width Inspector), that intrinsic
    // minimum forces wide children (a two-input key/value row) to overflow instead of shrink.
    // `min-w-0` on the fieldset itself is the actual fix (verified: without it, a 415px-wide
    // row blew out a 268px content box).
    /* @__PURE__ */ jsxs4("fieldset", { className: "flex min-w-0 flex-col gap-4", children: [
      /* @__PURE__ */ jsx8("legend", { className: "mb-1 w-full border-b border-border pb-1 text-sm font-semibold text-foreground", children: group }),
      buckets.get(group).map(renderField)
    ] }, group)
  );
  const header = /* @__PURE__ */ jsxs4(Fragment2, { children: [
    title ? /* @__PURE__ */ jsx8("div", { className: "text-base font-semibold text-foreground", children: title }) : null,
    description ? /* @__PURE__ */ jsx8("p", { className: "text-sm text-muted-foreground", children: description }) : null,
    ungrouped.length > 0 ? /* @__PURE__ */ jsx8("div", { className: "flex flex-col gap-4", children: ungrouped.map(renderField) }) : null
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
  return /* @__PURE__ */ jsx8(
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
    /* @__PURE__ */ jsx8("div", { role: "tablist", className: "flex gap-1 border-b border-border", children: tabOrder.map((tab) => /* @__PURE__ */ jsx8(
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
    tabOrder.map((tab) => /* @__PURE__ */ jsx8("div", { role: "tabpanel", hidden: active !== tab, className: "flex flex-col gap-6", children: tabbedGroups.get(tab).map(renderGroup) }, tab))
  ] });
}

// src/validator.ts
import { customizeValidator } from "@rjsf/validator-ajv8";
import Ajv2020 from "ajv/dist/2020.js";

// ../node_modules/ajv/dist/refs/json-schema-draft-07.json
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
import { jsx as jsx9 } from "react/jsx-runtime";
var ThemedForm = withTheme(ShadcnTheme4);
var WidgetRegistryContext = createContext(null);
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
  ...rest
}) {
  const contextRegistry = useContext(WidgetRegistryContext);
  const activeRegistry = registry ?? contextRegistry ?? defaultRegistry;
  const isObjectSchema = schema.type === "object" || Array.isArray(schema.type) && schema.type.includes("object");
  const safeFormData = isObjectSchema && Array.isArray(formData) ? {} : formData;
  const [resolvedSchema, setResolvedSchema] = useState3(
    schemaFetcher ? null : schema
  );
  useEffect2(() => {
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
    () => formSchema ? buildUiSchema(formSchema, activeRegistry) : {},
    [formSchema, activeRegistry]
  );
  if (!formSchema) {
    return null;
  }
  return /* @__PURE__ */ jsx9(
    ThemedForm,
    {
      schema: formSchema,
      uiSchema: mergeUiSchema(generatedUiSchema, uiSchema),
      validator: validator ?? defaultValidator,
      templates: {
        ObjectFieldTemplate: GroupedObjectFieldTemplate,
        FieldTemplate,
        BaseInputTemplate,
        ...templates,
        ButtonTemplates: { SubmitButton, ...templates?.ButtonTemplates }
      },
      widgets: { RadioWidget, SelectWidget, TextareaWidget, CheckboxWidget, ...widgets },
      formData: safeFormData,
      formContext: schemaFetcher ? { ...formContext, schemaFetcher } : formContext,
      ...rest
    }
  );
}

// src/selection-chrome.tsx
import { Fragment as Fragment3, jsx as jsx10, jsxs as jsxs5 } from "react/jsx-runtime";
var RING_STYLE = {
  position: "absolute",
  inset: -2,
  borderRadius: 6,
  border: "2px solid var(--stud-accent)",
  pointerEvents: "none"
};
var HANDLE_STYLE = {
  position: "absolute",
  top: -2,
  left: -18,
  width: 14,
  height: 14,
  cursor: "grab",
  color: "var(--stud-ink-muted)"
};
var REQUIRED_BADGE_STYLE = {
  position: "absolute",
  top: -8,
  right: -6,
  fontSize: 9,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--stud-danger)",
  background: "var(--stud-danger-tint)",
  borderRadius: 4,
  padding: "1px 4px",
  pointerEvents: "none"
};
var INCOMPLETE_OUTLINE_STYLE = {
  position: "absolute",
  inset: -2,
  borderRadius: 6,
  border: "2px dashed var(--stud-warning-strong)",
  pointerEvents: "none"
};
function SelectionChrome({
  nodeId,
  localSelected = false,
  remoteSelections = [],
  advisory = false,
  required = false,
  incomplete = false,
  children
}) {
  return /* @__PURE__ */ jsxs5(
    "div",
    {
      "data-blockdoc-chrome": "",
      "data-node-id": nodeId,
      "data-selected": localSelected ? "" : void 0,
      "data-advisory": advisory ? "" : void 0,
      "data-required": required ? "" : void 0,
      "data-incomplete": incomplete ? "" : void 0,
      "data-remote-count": remoteSelections.length,
      style: { position: "relative" },
      children: [
        children,
        incomplete && /* @__PURE__ */ jsx10("div", { "data-blockdoc-incomplete-outline": "", style: INCOMPLETE_OUTLINE_STYLE }),
        localSelected && /* @__PURE__ */ jsxs5(Fragment3, { children: [
          /* @__PURE__ */ jsx10("div", { "data-blockdoc-selection-ring": "", style: RING_STYLE }),
          /* @__PURE__ */ jsx10("span", { "data-blockdoc-drag-handle": "", style: HANDLE_STYLE, "aria-label": "Drag to reorder", children: "\u283F" })
        ] }),
        required && /* @__PURE__ */ jsx10("span", { "data-blockdoc-required-badge": "", style: REQUIRED_BADGE_STYLE, children: "required" }),
        remoteSelections.map((selection) => /* @__PURE__ */ jsx10(
          "div",
          {
            "data-blockdoc-remote-cursor": "",
            "data-owner-id": selection.ownerId,
            "aria-label": selection.ownerLabel ?? selection.ownerId,
            style: {
              position: "absolute",
              inset: -2,
              borderRadius: 6,
              border: `2px solid ${selection.color ?? "var(--stud-selection)"}`,
              opacity: 0.5,
              pointerEvents: "none"
            }
          },
          selection.ownerId
        ))
      ]
    }
  );
}
export {
  BlockChromeFallback,
  ButtonGroupWidget,
  ComboboxWidget,
  FORM_KEYWORDS,
  GroupedObjectFieldTemplate,
  SchemaForm,
  SelectionChrome,
  StarRatingWidget,
  WidgetRegistryContext,
  buildUiSchema,
  createFormIntentBus,
  createFormValidator,
  createKeywordVocabulary,
  createSkinRegistry,
  createWidgetRegistry,
  defaultRegistry,
  defaultSkinRegistry,
  defaultValidator,
  displayLabel,
  humanizeKey,
  mergeUiSchema,
  normalizeNullableRefs,
  registerSkin,
  registerWidget,
  resolveExternalRefs,
  resolveSkin,
  resolveWidget,
  widgetFormContext
};
//# sourceMappingURL=index.js.map