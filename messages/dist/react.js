import {
  createMessages
} from "./chunk-DNDHOKPA.js";

// src/react.tsx
import { createContext, createElement, useContext, useMemo, version } from "react";
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
  const options = useMemo(() => ({ catalog: value, pseudo }), [value, pseudo]);
  return createElement(shared.context.Provider, { value: options }, children);
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
  useMessageLocale,
  useMessages
};
//# sourceMappingURL=react.js.map