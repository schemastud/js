// src/memoryUrlState.ts
import { useSyncExternalStore } from "react";
function createMemoryUrlState(initial = "", fixed = {}) {
  const enforce = (params) => {
    for (const [key, value] of Object.entries(fixed)) params.set(key, value);
    return params;
  };
  let current = enforce(new URLSearchParams(initial));
  const listeners = /* @__PURE__ */ new Set();
  const snapshot = () => current;
  const subscribe = (notify) => {
    listeners.add(notify);
    return () => {
      listeners.delete(notify);
    };
  };
  return function useMemoryUrlState() {
    const params = useSyncExternalStore(subscribe, snapshot, snapshot);
    return [
      params,
      (updater) => {
        current = enforce(updater(new URLSearchParams(current)));
        listeners.forEach((notify) => notify());
      }
    ];
  };
}

// src/actions.ts
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

export {
  createMemoryUrlState,
  resolveActions,
  actionUrl,
  navigateTarget
};
//# sourceMappingURL=chunk-CWIDJYHN.js.map