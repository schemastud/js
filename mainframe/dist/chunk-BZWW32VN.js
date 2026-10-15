// src/contract.ts
var SLOT_FILL_TYPES = {
  // Core
  brand: "single-node",
  rail: "single-node",
  "topBar.lead": "single-node",
  "topBar.actions": "ordered-multi-source",
  main: "render-prop",
  overlay: "ordered-multi-source",
  // Optional
  railFooter: "single-node",
  command: "single-node",
  status: "ordered-multi-source",
  footer: "single-node"
};
var CORE_SLOTS = [
  "brand",
  "rail",
  "topBar.lead",
  "topBar.actions",
  "main",
  "overlay"
];
var OPTIONAL_SLOTS = [
  "railFooter",
  "command",
  "status",
  "footer"
];
var SLOT_ZONES = {
  "topBar.actions": ["start", "end"],
  overlay: ["corner", "edge", "center"],
  status: ["start", "end"]
};
var DEFAULT_ORDER = 50;
var DEFAULT_ZONE = "start";

// src/slot-registry.ts
function createSlotRegistry() {
  const entries = [];
  const listeners = /* @__PURE__ */ new Set();
  let nextIndex = 0;
  let ver = 0;
  function notify() {
    ver++;
    for (const l of listeners) l();
  }
  function contribute(input) {
    const entry = { ...input, registrationIndex: nextIndex++ };
    entries.push(entry);
    notify();
    return () => {
      const at = entries.indexOf(entry);
      if (at !== -1) {
        entries.splice(at, 1);
        notify();
      }
    };
  }
  return {
    contribute,
    contributions: () => entries,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    version: () => ver
  };
}

// src/mainframe-registry.ts
function createMainframeRegistry() {
  const byMode = /* @__PURE__ */ new Map();
  function register(mode, component, options) {
    byMode.set(mode, {
      mode,
      component,
      customSlots: options?.slots ?? []
    });
  }
  return {
    register,
    get: (mode) => byMode.get(mode),
    modes: () => [...byMode.keys()],
    all: () => [...byMode.values()]
  };
}

// src/resolve.ts
import { cloneElement, isValidElement } from "react";

// src/dev.ts
var isDev = typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
function devWarn(message) {
  if (isDev) {
    console.warn(`[mainframe] ${message}`);
  }
}

// src/resolve.ts
function buildSlotMeta(registrations) {
  const fillTypes = new Map(Object.entries(SLOT_FILL_TYPES));
  const zones = new Map(Object.entries(SLOT_ZONES));
  for (const reg of registrations) {
    for (const spec of reg.customSlots) {
      fillTypes.set(spec.name, spec.fillType);
      if (spec.zones) zones.set(spec.name, spec.zones);
    }
  }
  return { fillTypes, zones };
}
function isEntitled(contribution, can) {
  if (contribution.can == null) return true;
  const caps = Array.isArray(contribution.can) ? contribution.can : [contribution.can];
  if (caps.length === 0) return true;
  if (!can) return false;
  return caps.some((cap) => can(cap));
}
function resolveSlots({ contributions, registrations, can }) {
  const { fillTypes, zones } = buildSlotMeta(registrations);
  const known = /* @__PURE__ */ new Set([...CORE_SLOTS, ...OPTIONAL_SLOTS, ...fillTypes.keys()]);
  const bySlot = /* @__PURE__ */ new Map();
  const warnedUnknown = /* @__PURE__ */ new Set();
  for (const c of contributions) {
    if (!known.has(c.slot)) {
      if (!warnedUnknown.has(c.slot)) {
        warnedUnknown.add(c.slot);
        devWarn(
          `contribution "${c.key}" targets unknown slot "${c.slot}" (defined by no registered mainframe) \u2014 ignored. Typo, or a missing custom-slot declaration?`
        );
      }
      continue;
    }
    if (!isEntitled(c, can)) continue;
    const list = bySlot.get(c.slot) ?? [];
    list.push(c);
    bySlot.set(c.slot, list);
  }
  function zoneIndex(slot, zone) {
    const declared = zones.get(slot);
    if (!declared) return 0;
    const at = declared.indexOf(zone ?? declared[0] ?? DEFAULT_ZONE);
    return at === -1 ? declared.length : at;
  }
  function sortedOrdered(slot) {
    const list = bySlot.get(slot) ?? [];
    return [...list].sort((a, b) => {
      const zi = zoneIndex(slot, a.zone) - zoneIndex(slot, b.zone);
      if (zi !== 0) return zi;
      const oi = (a.order ?? DEFAULT_ORDER) - (b.order ?? DEFAULT_ORDER);
      if (oi !== 0) return oi;
      return a.registrationIndex - b.registrationIndex;
    });
  }
  function winner(slot) {
    const list = bySlot.get(slot) ?? [];
    if (list.length === 0) return void 0;
    if (list.length > 1) {
      devWarn(
        `single-node slot "${slot}" filled ${list.length} times (${list.map((c) => c.key).join(", ")}) \u2014 last writer wins.`
      );
    }
    return list.reduce((a, b) => b.registrationIndex > a.registrationIndex ? b : a);
  }
  return {
    node(slot) {
      if (fillTypes.get(slot) === "ordered-multi-source") {
        devWarn(`node("${slot}") called on an ordered slot \u2014 use items("${slot}").`);
      }
      return winner(slot)?.node;
    },
    items(slot, zone) {
      const sorted = sortedOrdered(slot);
      const filtered = zone == null ? sorted : sorted.filter((c) => (c.zone ?? DEFAULT_ZONE) === zone);
      return filtered.map(
        (c) => isValidElement(c.node) && c.node.key == null ? cloneElement(c.node, { key: c.key }) : c.node
      );
    },
    main(payload) {
      return winner("main")?.render?.(payload);
    },
    has(slot) {
      return (bySlot.get(slot)?.length ?? 0) > 0;
    },
    keys(slot) {
      const type = fillTypes.get(slot);
      const list = type === "ordered-multi-source" ? sortedOrdered(slot) : bySlot.get(slot) ?? [];
      return list.map((c) => c.key);
    }
  };
}

// src/react.tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore
} from "react";
import { jsx } from "react/jsx-runtime";
var MainframeCtx = createContext(null);
function MainframeProvider({
  injection,
  children
}) {
  return /* @__PURE__ */ jsx(MainframeCtx.Provider, { value: injection, children });
}
function useMainframe() {
  const injection = useContext(MainframeCtx);
  if (!injection) {
    throw new Error("useMainframe must be used within a <MainframeProvider>.");
  }
  return injection;
}
function useSlotRegistry() {
  return useMainframe().slots;
}
function useResolvedSlots(mode) {
  const { slots, mainframes, can } = useMainframe();
  const version = useSyncExternalStore(
    useCallback((cb) => slots.subscribe(cb), [slots]),
    () => slots.version(),
    () => slots.version()
  );
  return useMemo(
    () => resolveSlots({
      contributions: slots.contributions(),
      registrations: mainframes.all(),
      can
    }),
    // `version` is the change signal for the mutable contributions/registrations; mode does not
    // change *which* contributions exist, but different modes place different slots, so re-running
    // is harmless and keeps the memo honest if `can` is mode-derived upstream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slots, mainframes, can, version, mode]
  );
}
function MainframeOutlet({
  mode,
  ctx
}) {
  const { mainframes, can } = useMainframe();
  const slots = useResolvedSlots(mode);
  const registration = mainframes.get(mode);
  const mainframeCtx = useMemo(
    () => ({ mode, can, ...ctx }),
    [mode, can, ctx]
  );
  if (!registration) {
    devWarn(
      `no mainframe registered for mode "${mode}" (registered: ${mainframes.modes().join(", ") || "none"}) \u2014 rendering nothing.`
    );
    return null;
  }
  const Mainframe = registration.component;
  return /* @__PURE__ */ jsx(Mainframe, { slots, ctx: mainframeCtx });
}
function useSlot(contribution) {
  const { slots } = useMainframe();
  const latest = useRef(contribution);
  latest.current = contribution;
  const signature = JSON.stringify({
    slot: contribution.slot,
    key: contribution.key,
    zone: contribution.zone,
    order: contribution.order,
    can: contribution.can
  });
  useEffect(() => {
    const unregister = slots.contribute(latest.current);
    return unregister;
  }, [slots, signature]);
}

export {
  SLOT_FILL_TYPES,
  CORE_SLOTS,
  OPTIONAL_SLOTS,
  SLOT_ZONES,
  DEFAULT_ORDER,
  DEFAULT_ZONE,
  createSlotRegistry,
  createMainframeRegistry,
  isDev,
  devWarn,
  resolveSlots,
  MainframeProvider,
  useMainframe,
  useSlotRegistry,
  useResolvedSlots,
  MainframeOutlet,
  useSlot
};
//# sourceMappingURL=chunk-BZWW32VN.js.map