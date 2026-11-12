// src/host/receiver.ts
import { RemoteReceiver } from "@remote-dom/core/receivers";

// src/protocol.ts
function eventRef(handlerId) {
  return { __frameRemoteHandler: handlerId };
}
function isEventRef(value) {
  return typeof value === "object" && value !== null && typeof value.__frameRemoteHandler === "string";
}

// src/host/receiver.ts
var MUTATION_INSERT_CHILD = 0;
var MUTATION_UPDATE_PROPERTY = 3;
var UPDATE_PROPERTY_TYPE_EVENT = 3;
var HostReceiver = class {
  constructor(options) {
    this.options = options;
    this.receiver = new RemoteReceiver();
  }
  options;
  receiver;
  /** One listener per handler id, so a re-render keeps each listener's identity. */
  listeners = /* @__PURE__ */ new Map();
  listenerFor(handlerId) {
    let listener2 = this.listeners.get(handlerId);
    if (!listener2) {
      listener2 = (payload) => this.options.dispatchToGuest(handlerId, payload);
      this.listeners.set(handlerId, listener2);
    }
    return listener2;
  }
  /** A listener value as the receiver may hold it: a guest ref becomes a host listener; anything else is dropped. */
  hostListenerValue(value) {
    return isEventRef(value) ? this.listenerFor(value.__frameRemoteHandler) : void 0;
  }
  /** A serialized node with every element's guest refs turned into host listeners, its children included. */
  hostNode(node) {
    if (!node || typeof node !== "object") return node;
    const serialized = node;
    const eventListeners = serialized.eventListeners ? Object.fromEntries(
      Object.entries(serialized.eventListeners).flatMap(([name, value]) => {
        const listener2 = this.hostListenerValue(value);
        return listener2 ? [[name, listener2]] : [];
      })
    ) : void 0;
    return {
      ...serialized,
      ...eventListeners ? { eventListeners } : {},
      ...Array.isArray(serialized.children) ? { children: serialized.children.map((child) => this.hostNode(child)) } : {}
    };
  }
  /** A guest record as the receiver may take it: listener refs in an inserted subtree or an event update become functions. */
  hostRecord(record) {
    const [type] = record;
    if (type === MUTATION_INSERT_CHILD) {
      const [, parentId, child, index] = record;
      return [type, parentId, this.hostNode(child), index];
    }
    if (type === MUTATION_UPDATE_PROPERTY) {
      const [, id, name, value, updateType] = record;
      if (updateType === UPDATE_PROPERTY_TYPE_EVENT) {
        return [type, id, name, this.hostListenerValue(value), updateType];
      }
    }
    return record;
  }
  /** The plain-JS root of the reconciled remote tree. */
  get root() {
    return this.receiver.root;
  }
  /**
   * Apply a batch of guest mutation records. This is the single inbound seam from
   * the isolated guest — wire it to the VM's `onMutate`.
   */
  applyMutations(records) {
    try {
      this.receiver.connection.mutate(records.map((record) => this.hostRecord(record)));
    } finally {
      this.releaseUnmountedListeners();
    }
  }
  /**
   * Keep in the cache only listeners a node in the live tree still holds. The cache is host memory outside the
   * guest VM's cap, so a removed subtree, a replaced listener and a cleared one must release their ids. It is
   * derived from the tree after the whole batch, so an id removed and reinserted within one batch keeps its function.
   */
  releaseUnmountedListeners() {
    if (this.listeners.size === 0) return;
    const live = /* @__PURE__ */ new Set();
    const visit = (node) => {
      if (!node || typeof node !== "object") return;
      const element = node;
      for (const listener2 of Object.values(element.eventListeners ?? {})) live.add(listener2);
      for (const child of element.children ?? []) visit(child);
    };
    visit(this.receiver.root);
    for (const [handlerId, listener2] of this.listeners) {
      if (!live.has(listener2)) this.listeners.delete(handlerId);
    }
  }
  /**
   * Subscribe to changes on the root's children (top-level tree). Returns an
   * unsubscribe function.
   */
  subscribeRoot(onChange) {
    const controller = new AbortController();
    this.receiver.subscribe(this.receiver.root, onChange, { signal: controller.signal });
    return () => controller.abort();
  }
  subscribeNode(node, onChange) {
    const controller = new AbortController();
    this.receiver.subscribe(node, onChange, { signal: controller.signal });
    return () => controller.abort();
  }
  /**
   * Fire an event back to the guest. `listenerValue` is the element's stored listener: the host listener
   * `applyMutations` made from the guest's `{ __frameRemoteHandler }` ref, which dispatches by that handler id. A
   * bare ref still dispatches; anything else is inert (a guest that sent a non-ref never had a listener stored).
   */
  fire(listenerValue, payload) {
    if (typeof listenerValue === "function") {
      listenerValue(payload);
      return;
    }
    if (isEventRef(listenerValue)) this.options.dispatchToGuest(listenerValue.__frameRemoteHandler, payload);
  }
};

// src/host/allowlist.tsx
import { createElement } from "react";
var card = {
  border: "1px solid var(--stud-line-strong)",
  borderRadius: 12,
  padding: 20,
  background: "var(--stud-surface)",
  boxShadow: "0 1px 3px rgba(16,24,40,.06)",
  maxWidth: 420
};
var btn = {
  cursor: "pointer",
  border: "none",
  borderRadius: 8,
  padding: "9px 16px",
  fontWeight: 600,
  fontSize: 14,
  background: "var(--stud-accent)",
  color: "var(--stud-surface)"
};
var badge = {
  display: "inline-block",
  fontSize: 12,
  fontWeight: 700,
  padding: "2px 10px",
  borderRadius: 999,
  background: "var(--stud-accent-tint)",
  color: "var(--stud-accent-deep)"
};
var input = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  fontSize: 14,
  border: "1px solid var(--stud-line-strong)",
  borderRadius: 8
};
function prop(el, name) {
  return el.properties[name];
}
function listener(el, name) {
  return el.eventListeners[name];
}
var DEFAULT_ALLOWLIST = {
  Stack: (el, { children }) => createElement(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: prop(el, "gap") ?? 12 } },
    children()
  ),
  Card: (_el, { children }) => createElement("div", { style: card }, children()),
  Heading: (el) => createElement("h2", { style: { margin: 0, fontSize: 20, color: "var(--stud-ink-strong)" } }, prop(el, "text")),
  Text: (el) => createElement("p", { style: { margin: 0, color: "var(--stud-ink-muted)", lineHeight: 1.5 } }, prop(el, "text")),
  Badge: (el) => createElement("span", { style: badge }, prop(el, "text")),
  Button: (el, { fire }) => createElement(
    "button",
    { style: btn, onClick: () => fire(listener(el, "onClick"), {}) },
    prop(el, "text")
  ),
  TextInput: (el, { fire }) => createElement("input", {
    style: input,
    placeholder: prop(el, "placeholder"),
    value: prop(el, "value") ?? "",
    onChange: (e) => fire(listener(el, "onInput"), { value: e.target.value })
  })
};

// src/host/vocabulary.ts
import { createWidgetRegistry } from "@schemastud/seam";
function blockNode(type) {
  return { type };
}
function asBlockVocabulary(registry) {
  return {
    ...registry,
    resolveBlock(type) {
      const { widget } = registry.resolveEntry(blockNode(type));
      return typeof widget === "function" ? widget : void 0;
    }
  };
}
function registerBlock(registry, type, component) {
  registry.registerWidget(
    (node) => node.type === type,
    component
  );
}
function createBlockVocabulary(allowlist = DEFAULT_ALLOWLIST) {
  const registry = createWidgetRegistry();
  for (const [type, component] of Object.entries(allowlist)) {
    registerBlock(registry, type, component);
  }
  return asBlockVocabulary(registry);
}
var DEFAULT_BLOCK_VOCABULARY = createBlockVocabulary();

// src/host/vocabulary-spec.ts
var BLOCK_TYPES = [
  "Stack",
  "Card",
  "Heading",
  "Text",
  "Badge",
  "Button",
  "TextInput"
];

// src/host/render.tsx
import { createElement as createElement2, Fragment, useEffect, useState } from "react";
import { NODE_TYPE_TEXT, NODE_TYPE_ELEMENT } from "@remote-dom/core";
function isDev() {
  return typeof process === "undefined" || process.env?.NODE_ENV !== "production";
}
function renderNode(node, opts, key) {
  if (node.type === NODE_TYPE_TEXT) {
    return createElement2(Fragment, { key }, node.data);
  }
  if (node.type === NODE_TYPE_ELEMENT) {
    const Comp = opts.vocabulary.resolveBlock(node.element);
    if (!Comp) {
      if (!isDev()) return null;
      return createElement2(
        "div",
        { key, "data-frame-remote-blocked": node.element, style: { color: "var(--stud-danger)", fontSize: 12 } },
        `\u26D4 unknown block <${String(node.element)}> \u2014 not in host vocabulary`
      );
    }
    const children = () => renderChildren(node, opts);
    return createElement2(Fragment, { key }, Comp(node, { fire: opts.fire, children }));
  }
  return null;
}
function renderChildren(parent, opts) {
  return parent.children.map((child, i) => renderNode(child, opts, i));
}
function renderRemoteTree(root, opts) {
  return renderChildren(root, opts);
}
function RemoteSurface({ host, vocabulary = DEFAULT_BLOCK_VOCABULARY }) {
  const [version, setVersion] = useState(0);
  useEffect(() => host.subscribeRoot(() => setVersion((v) => v + 1)), [host]);
  void version;
  return renderRemoteTree(host.root, { vocabulary, fire: (l, p) => host.fire(l, p) });
}

// src/host/version.ts
var VOCABULARY_VERSION = "1.0.0";
var VOCABULARY_MAJOR = Number(VOCABULARY_VERSION.split(".")[0]);

// src/host/tiers.ts
var CAPABILITY_NAMES = ["resolve", "read_scoped", "request_save"];
var TIER_CAPABILITIES = {
  first_party: ["resolve", "read_scoped", "request_save"],
  untrusted_publisher: ["resolve", "read_scoped"]
};
function isKnownCapability(name) {
  return CAPABILITY_NAMES.includes(name);
}
function tierGrants(tier, name) {
  return TIER_CAPABILITIES[tier].includes(name);
}

// src/host/manifest.ts
function evaluateManifest(manifest, options) {
  const hostMajor = options.hostMajor ?? VOCABULARY_MAJOR;
  const componentMajor = manifest.vocabularyMajor;
  const allowShim = options.allowShim ?? true;
  for (const cap of manifest.capabilities) {
    if (!isKnownCapability(cap)) {
      return {
        kind: "refuse",
        reason: "capability_unknown",
        message: `component requests unknown capability "${String(cap)}" \u2014 not a host capability`,
        hostMajor,
        componentMajor
      };
    }
    if (!tierGrants(options.tier, cap)) {
      return {
        kind: "refuse",
        reason: "capability_over_ask",
        message: `component (tier "${options.tier}") requests capability "${cap}" beyond its tier \u2014 refused at load before render`,
        hostMajor,
        componentMajor
      };
    }
  }
  if (componentMajor !== hostMajor) {
    const message = `component built for vocabulary major v${componentMajor}, host is on v${hostMajor} \u2014 ` + (allowShim ? "painting a host-owned shim instead of the guest tree" : "refused (shim disabled)");
    return {
      kind: allowShim ? "shim" : "refuse",
      reason: "vocabulary_major_mismatch",
      message,
      hostMajor,
      componentMajor
    };
  }
  return { kind: "grant", hostMajor, componentMajor };
}
function readManifest(raw) {
  if (raw == null || typeof raw !== "object") {
    return { ok: false, reason: "manifest_missing", message: "no component manifest supplied" };
  }
  const obj = raw;
  if (typeof obj.vocabularyMajor !== "number" || !Number.isInteger(obj.vocabularyMajor)) {
    return {
      ok: false,
      reason: "manifest_no_major",
      message: "manifest.vocabularyMajor must be an integer"
    };
  }
  if (!Array.isArray(obj.capabilities) || !obj.capabilities.every((c) => typeof c === "string")) {
    return {
      ok: false,
      reason: "manifest_bad_capabilities",
      message: "manifest.capabilities must be an array of capability-name strings"
    };
  }
  const tier = obj.tier;
  const manifest = {
    vocabularyMajor: obj.vocabularyMajor,
    capabilities: obj.capabilities,
    ...tier === "first_party" || tier === "untrusted_publisher" ? { tier } : {}
  };
  return { ok: true, manifest };
}

export {
  eventRef,
  isEventRef,
  HostReceiver,
  DEFAULT_ALLOWLIST,
  registerBlock,
  createBlockVocabulary,
  DEFAULT_BLOCK_VOCABULARY,
  BLOCK_TYPES,
  renderRemoteTree,
  RemoteSurface,
  VOCABULARY_VERSION,
  VOCABULARY_MAJOR,
  CAPABILITY_NAMES,
  TIER_CAPABILITIES,
  isKnownCapability,
  tierGrants,
  evaluateManifest,
  readManifest
};
//# sourceMappingURL=chunk-M2IBPBGR.js.map