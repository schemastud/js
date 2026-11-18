import {
  createMessages
} from "./chunk-HHD2SPSC.js";

// src/react.tsx
import { createContext, createElement as createElement2, useContext, useMemo, version } from "react";

// src/rich-message.ts
import { createElement, Fragment } from "react";
var slot = (index) => `\uFFFC${index}\uFFFC`;
var EMPHASIS_START = "\uFFFC0:\uFFFC";
var EMPHASIS_END = "\uFFFC0/\uFFFC";
function RichMessage({ text, parts, wrapText, emphasis }) {
  if (emphasis) {
    return text.split(/(￼0:￼[\s\S]*?￼0\/￼)/u).map((section, index) => {
      const marked = /^￼0:￼([\s\S]*?)￼0\/￼$/u.exec(section);
      const content = createElement(RichMessage, { text: marked ? marked[1] : section, parts, wrapText });
      return createElement(Fragment, { key: marked ? `emphasis-${index}` : `section-${index}` }, marked ? emphasis(content) : content);
    });
  }
  const occurrences = /* @__PURE__ */ new Map();
  return text.split(/(￼\d+￼)/u).map((part, index) => {
    const match = /^￼(\d+)￼$/u.exec(part);
    const occurrence = match ? occurrences.get(match[1]) ?? 0 : 0;
    if (match) occurrences.set(match[1], occurrence + 1);
    return createElement(
      Fragment,
      { key: match ? `slot-${match[1]}-${occurrence}` : `text-${index}` },
      match ? parts[Number(match[1])] : part && wrapText ? wrapText(part) : part
    );
  });
}
function richMessage(messages, key, parts, options = {}) {
  const names = Object.keys(parts);
  const parameters = Object.fromEntries(names.map((name, index) => [name, slot(index)]));
  if (options.emphasis) Object.assign(parameters, { emphasis_start: EMPHASIS_START, emphasis_end: EMPHASIS_END });
  return createElement(RichMessage, { text: messages.t(key, parameters), parts: Object.values(parts), emphasis: options.emphasis });
}

// src/react.tsx
var identity = /* @__PURE__ */ Symbol.for("schemastud.messages.context.v1");
var existing = Reflect.get(globalThis, identity);
function isShared(value) {
  return typeof value === "object" && value !== null && "abi" in value && value.abi === 1 && "reactVersion" in value && value.reactVersion === version && "context" in value && typeof value.context === "object" && value.context !== null && "Provider" in value.context;
}
if (existing !== void 0 && !isShared(existing)) throw new Error("Incompatible messages context ABI or React version");
var shared = isShared(existing) ? existing : {
  abi: 1,
  reactVersion: version,
  context: createContext(null)
};
if (existing === void 0) Reflect.set(globalThis, identity, shared);
function MessageProvider({ value, pseudo = false, children }) {
  const outer = useContext(shared.context);
  const own = useMemo(() => value === null ? null : { catalog: value, pseudo }, [value, pseudo]);
  return createElement2(shared.context.Provider, { value: value === null ? outer : own }, children);
}
function useMessages(defaults) {
  const options = useContext(shared.context);
  return useMemo(() => createMessages(defaults, options ?? {}), [defaults, options]);
}
function useMessageLocale() {
  return useContext(shared.context)?.catalog?.locale ?? "en-US";
}
export {
  MessageProvider,
  RichMessage,
  richMessage,
  useMessageLocale,
  useMessages
};
//# sourceMappingURL=react.js.map