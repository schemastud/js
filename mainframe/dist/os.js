import {
  MainframeOutlet,
  MainframeProvider,
  createMainframeRegistry,
  createSlotRegistry,
  useResolvedSlots
} from "./chunk-BZWW32VN.js";

// src/os/windowManager.ts
var DEFAULT_BOUNDS = { width: 1280, height: 800 };
var initialWindowManagerState = {
  windows: {},
  zOrder: [],
  focused: null,
  snap: null,
  workspace: { bounds: DEFAULT_BOUNDS }
};
var ANCHOR_RANK = { floor: 0, normal: 1, top: 2 };
function anchorOf(windows, key) {
  return windows[key]?.role.zAnchor ?? "normal";
}
function normalizeZOrder(zOrder, windows) {
  return [...zOrder].sort((a, b) => ANCHOR_RANK[anchorOf(windows, a)] - ANCHOR_RANK[anchorOf(windows, b)]);
}
function raiseWithinBand(zOrder, windows, key) {
  const without = zOrder.filter((k) => k !== key);
  const band = ANCHOR_RANK[anchorOf(windows, key)];
  let insertAt = without.length;
  for (let i = 0; i < without.length; i++) {
    if (ANCHOR_RANK[anchorOf(windows, without[i])] > band) {
      insertAt = i;
      break;
    }
  }
  return [...without.slice(0, insertAt), key, ...without.slice(insertAt)];
}
function topmostVisible(state) {
  for (let i = state.zOrder.length - 1; i >= 0; i--) {
    const w = state.windows[state.zOrder[i]];
    if (w && !w.minimized) return w.key;
  }
  return null;
}
function topmostFloat(state) {
  for (let i = state.zOrder.length - 1; i >= 0; i--) {
    const w = state.windows[state.zOrder[i]];
    if (w && !w.minimized && w.presentation !== "stage") return w.key;
  }
  return null;
}
var DEFAULT_WINDOW = { x: 64, y: 64, width: 720, height: 480 };
var CASCADE_STEP = 28;
function cascadeGeometry(count, override) {
  const base = {
    x: DEFAULT_WINDOW.x + count * CASCADE_STEP,
    y: DEFAULT_WINDOW.y + count * CASCADE_STEP,
    width: DEFAULT_WINDOW.width,
    height: DEFAULT_WINDOW.height
  };
  return { ...base, ...override };
}
function snapRect(zone, bounds) {
  const { width: W, height: H } = bounds;
  const halfW = Math.round(W / 2);
  const halfH = Math.round(H / 2);
  switch (zone) {
    case "maximized":
      return { x: 0, y: 0, width: W, height: H };
    case "left":
      return { x: 0, y: 0, width: halfW, height: H };
    case "right":
      return { x: W - halfW, y: 0, width: halfW, height: H };
    case "top":
      return { x: 0, y: 0, width: W, height: halfH };
    case "bottom":
      return { x: 0, y: H - halfH, width: W, height: halfH };
    case "top-left":
      return { x: 0, y: 0, width: halfW, height: halfH };
    case "top-right":
      return { x: W - halfW, y: 0, width: halfW, height: halfH };
    case "bottom-left":
      return { x: 0, y: H - halfH, width: halfW, height: halfH };
    case "bottom-right":
      return { x: W - halfW, y: H - halfH, width: halfW, height: halfH };
  }
}
function dockRect(edge, size, bounds) {
  const { width: W, height: H } = bounds;
  switch (edge) {
    case "left":
      return { x: 0, y: 0, width: size ?? Math.round(W / 4), height: H };
    case "right": {
      const w = size ?? Math.round(W / 4);
      return { x: W - w, y: 0, width: w, height: H };
    }
    case "top":
      return { x: 0, y: 0, width: W, height: size ?? Math.round(H / 4) };
    case "bottom": {
      const h = size ?? Math.round(H / 4);
      return { x: 0, y: H - h, width: W, height: h };
    }
  }
}
function reproject(win, bounds) {
  if (win.presentation === "stage") return { ...win, geometry: snapRect("maximized", bounds) };
  if (win.maximized) return { ...win, geometry: snapRect("maximized", bounds) };
  if (win.snap) return { ...win, geometry: snapRect(win.snap, bounds) };
  return win;
}
function applyStage(windows, key, bounds) {
  const win = windows[key];
  if (!win) return windows;
  const next = { ...windows };
  for (const [k, w] of Object.entries(next)) {
    if (w.presentation === "stage" && k !== key) {
      next[k] = { ...w, presentation: "float", geometry: w.restore ?? w.geometry, restore: null, maximized: false, snap: null };
    }
  }
  next[key] = {
    ...win,
    presentation: "stage",
    restore: win.presentation === "stage" ? win.restore : win.restore ?? win.geometry,
    geometry: snapRect("maximized", bounds),
    maximized: false,
    snap: null,
    minimized: false
  };
  return next;
}
function windowManagerReducer(state, action) {
  switch (action.type) {
    case "open": {
      const existing = state.windows[action.key];
      if (existing) {
        const merged = { ...existing, minimized: false, role: { ...existing.role, ...action.role } };
        let windows2 = { ...state.windows, [action.key]: merged };
        if (action.presentation === "stage") windows2 = applyStage(windows2, action.key, state.workspace.bounds);
        const zOrder2 = raiseWithinBand(state.zOrder, windows2, action.key);
        return { ...state, windows: windows2, zOrder: zOrder2, focused: action.key, snap: null };
      }
      const role = action.role ?? {};
      const count = Object.keys(state.windows).length;
      const win = {
        key: action.key,
        geometry: cascadeGeometry(count, action.geometry),
        minimized: false,
        maximized: false,
        snap: null,
        restore: null,
        role,
        presentation: "float"
      };
      let windows = { ...state.windows, [action.key]: win };
      if (action.presentation === "stage") windows = applyStage(windows, action.key, state.workspace.bounds);
      const zOrder = raiseWithinBand([...state.zOrder, action.key], windows, action.key);
      return { ...state, windows, zOrder, focused: action.key, snap: null };
    }
    case "stage": {
      if (!state.windows[action.key]) return state;
      const windows = applyStage(state.windows, action.key, state.workspace.bounds);
      return { ...state, windows, focused: topmostFloat({ zOrder: state.zOrder, windows }) ?? action.key };
    }
    case "unstage": {
      const win = state.windows[action.key];
      if (!win || win.presentation !== "stage") return state;
      const windows = {
        ...state.windows,
        [action.key]: { ...win, presentation: "float", geometry: win.restore ?? win.geometry, restore: null }
      };
      return { ...state, windows };
    }
    case "close": {
      const win = state.windows[action.key];
      if (!win) return state;
      if (win.role.persistent || win.role.closable === false) return state;
      const windows = { ...state.windows };
      delete windows[action.key];
      const zOrder = state.zOrder.filter((k) => k !== action.key);
      return { ...state, windows, zOrder, focused: topmostVisible({ zOrder, windows }) };
    }
    case "focus": {
      const win = state.windows[action.key];
      if (!win) return state;
      const windows = win.minimized ? { ...state.windows, [action.key]: { ...win, minimized: false } } : state.windows;
      const zOrder = raiseWithinBand(state.zOrder, windows, action.key);
      return { ...state, windows, zOrder, focused: action.key };
    }
    case "move": {
      const win = state.windows[action.key];
      if (!win) return state;
      const geometry = { ...win.geometry, x: action.x, y: action.y };
      const windows = {
        ...state.windows,
        [action.key]: { ...win, geometry, maximized: false, snap: null, restore: null }
      };
      return { ...state, windows, snap: null };
    }
    case "resize": {
      const win = state.windows[action.key];
      if (!win) return state;
      const geometry = {
        x: action.x ?? win.geometry.x,
        y: action.y ?? win.geometry.y,
        width: action.width,
        height: action.height
      };
      const windows = {
        ...state.windows,
        [action.key]: { ...win, geometry, maximized: false, snap: null, restore: null }
      };
      return { ...state, windows };
    }
    case "minimize": {
      const win = state.windows[action.key];
      if (!win) return state;
      const windows = { ...state.windows, [action.key]: { ...win, minimized: true } };
      return { ...state, windows, focused: topmostVisible({ zOrder: state.zOrder, windows }) };
    }
    case "maximize": {
      const win = state.windows[action.key];
      if (!win) return state;
      const restore = win.restore ?? win.geometry;
      const windows = {
        ...state.windows,
        [action.key]: {
          ...win,
          maximized: true,
          snap: null,
          minimized: false,
          restore,
          geometry: snapRect("maximized", state.workspace.bounds)
        }
      };
      const zOrder = raiseWithinBand(state.zOrder, windows, action.key);
      return { ...state, windows, zOrder, focused: action.key };
    }
    case "restore": {
      const win = state.windows[action.key];
      if (!win) return state;
      const geometry = win.restore ?? win.geometry;
      const windows = {
        ...state.windows,
        [action.key]: { ...win, maximized: false, snap: null, restore: null, geometry }
      };
      return { ...state, windows };
    }
    case "snap": {
      const win = state.windows[action.key];
      if (!win) return state;
      const restore = win.restore ?? win.geometry;
      const windows = {
        ...state.windows,
        [action.key]: {
          ...win,
          snap: action.zone,
          maximized: action.zone === "maximized",
          minimized: false,
          restore,
          geometry: snapRect(action.zone, state.workspace.bounds)
        }
      };
      const zOrder = raiseWithinBand(state.zOrder, windows, action.key);
      return { ...state, windows, zOrder, focused: action.key, snap: null };
    }
    case "dock": {
      const win = state.windows[action.key];
      if (!win) return state;
      const restore = win.restore ?? win.geometry;
      const windows = {
        ...state.windows,
        [action.key]: {
          ...win,
          snap: null,
          maximized: false,
          minimized: false,
          restore,
          geometry: dockRect(action.edge, action.size, state.workspace.bounds)
        }
      };
      const zOrder = raiseWithinBand(state.zOrder, windows, action.key);
      return { ...state, windows, zOrder, focused: action.key };
    }
    case "tile": {
      const keys = (action.keys ?? state.zOrder).filter(
        (k) => state.windows[k] && !state.windows[k].minimized
      );
      if (keys.length === 0) return state;
      const tiled = tileRects(keys.length, state.workspace.bounds);
      const windows = { ...state.windows };
      keys.forEach((k, i) => {
        const win = windows[k];
        windows[k] = { ...win, maximized: false, snap: null, restore: null, geometry: tiled[i] };
      });
      return { ...state, windows, snap: null };
    }
    case "bounds": {
      const workspace = { bounds: action.bounds };
      const windows = {};
      for (const [k, w] of Object.entries(state.windows)) windows[k] = reproject(w, action.bounds);
      return { ...state, windows, workspace };
    }
    case "snapPreview":
      return { ...state, snap: action.zone };
    default:
      return state;
  }
}
function tileRects(count, bounds) {
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const cellW = Math.floor(bounds.width / cols);
  const cellH = Math.floor(bounds.height / rows);
  const rects = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    rects.push({ x: col * cellW, y: row * cellH, width: cellW, height: cellH });
  }
  return rects;
}
function visibleWindows(state) {
  return state.zOrder.map((k) => state.windows[k]).filter((w) => !!w && !w.minimized);
}
function isTaskOpen(state, key) {
  return key in state.windows;
}
function zIndexOf(state, key) {
  return state.zOrder.indexOf(key);
}
function stageKey(state) {
  for (const k of state.zOrder) if (state.windows[k]?.presentation === "stage") return k;
  return null;
}
function floatingWindows(state) {
  return visibleWindows(state).filter((w) => w.presentation !== "stage");
}
var WORKSPACE_VERSION = 1;
function serializeWorkspace(state) {
  const floats = state.zOrder.map((k) => state.windows[k]).filter((w) => !!w && w.presentation !== "stage");
  const floatKeys = new Set(floats.map((w) => w.key));
  return {
    version: WORKSPACE_VERSION,
    windows: floats.map((w) => ({
      key: w.key,
      geometry: w.geometry,
      minimized: w.minimized,
      maximized: w.maximized,
      snap: w.snap,
      restore: w.restore,
      role: w.role,
      presentation: w.presentation
    })),
    zOrder: state.zOrder.filter((k) => floatKeys.has(k)),
    focused: state.focused && floatKeys.has(state.focused) ? state.focused : null
  };
}
function deserializeWorkspace(persisted, bounds = DEFAULT_BOUNDS) {
  if (!persisted || persisted.version !== WORKSPACE_VERSION) {
    return { ...initialWindowManagerState, workspace: { bounds } };
  }
  const windows = {};
  for (const p of persisted.windows) {
    const win = {
      key: p.key,
      geometry: p.geometry,
      minimized: p.minimized,
      maximized: p.maximized,
      snap: p.snap,
      // Prefer the persisted pre-max/pre-snap rect; fall back for legacy snapshots without it.
      restore: p.restore ?? (p.maximized || p.snap ? p.geometry : null),
      role: p.role,
      // Legacy snapshots (pre-stage) default to a floating window.
      presentation: p.presentation ?? "float"
    };
    windows[p.key] = reproject(win, bounds);
  }
  const zOrder = normalizeZOrder(
    persisted.zOrder.filter((k) => windows[k]),
    windows
  );
  const persistedFocusVisible = persisted.focused && windows[persisted.focused] && !windows[persisted.focused].minimized;
  return {
    windows,
    zOrder,
    focused: persistedFocusVisible ? persisted.focused : topmostVisible({ zOrder, windows }),
    snap: null,
    workspace: { bounds }
  };
}

// src/os/useWindowManager.ts
import { useCallback, useMemo, useReducer } from "react";
function useWindowManager(options = {}) {
  const { persisted, bounds } = options;
  const initial = useMemo(
    () => persisted ? deserializeWorkspace(persisted, bounds) : { ...initialWindowManagerState, workspace: { bounds: bounds ?? initialWindowManagerState.workspace.bounds } },
    // Seed once; subsequent persistence is written out via serialize(), not re-seeded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [state, dispatch] = useReducer(windowManagerReducer, initial);
  const open = useCallback((key, opts) => dispatch({ type: "open", key, geometry: opts?.geometry, role: opts?.role, presentation: opts?.presentation }), []);
  const close = useCallback((key) => dispatch({ type: "close", key }), []);
  const focus = useCallback((key) => dispatch({ type: "focus", key }), []);
  const stage = useCallback((key) => dispatch({ type: "stage", key }), []);
  const unstage = useCallback((key) => dispatch({ type: "unstage", key }), []);
  const move = useCallback((key, x, y) => dispatch({ type: "move", key, x, y }), []);
  const resize = useCallback((key, width, height, x, y) => dispatch({ type: "resize", key, width, height, x, y }), []);
  const minimize = useCallback((key) => dispatch({ type: "minimize", key }), []);
  const maximize = useCallback((key) => dispatch({ type: "maximize", key }), []);
  const restore = useCallback((key) => dispatch({ type: "restore", key }), []);
  const snap = useCallback((key, zone) => dispatch({ type: "snap", key, zone }), []);
  const tile = useCallback((keys) => dispatch({ type: "tile", keys }), []);
  const dock = useCallback((key, edge, size) => dispatch({ type: "dock", key, edge, size }), []);
  const setBounds = useCallback((b) => dispatch({ type: "bounds", bounds: b }), []);
  const snapPreview = useCallback((zone) => dispatch({ type: "snapPreview", zone }), []);
  const serialize = useCallback(() => serializeWorkspace(state), [state]);
  return { state, open, close, focus, stage, unstage, move, resize, minimize, maximize, restore, snap, tile, dock, setBounds, snapPreview, serialize };
}

// src/os/WindowFrame.tsx
import "react";
import { Rnd } from "react-rnd";
import { jsx } from "react/jsx-runtime";
function WindowFrame({
  geometry,
  zIndex,
  dragHandleClassName,
  bounds = "parent",
  minWidth = 240,
  minHeight = 160,
  disableDragging,
  enableResizing = true,
  className,
  style,
  onMove,
  onResize,
  onFocus,
  children
}) {
  return /* @__PURE__ */ jsx(
    Rnd,
    {
      size: { width: geometry.width, height: geometry.height },
      position: { x: geometry.x, y: geometry.y },
      bounds: bounds === false ? void 0 : bounds,
      minWidth,
      minHeight,
      dragHandleClassName,
      disableDragging,
      enableResizing,
      style: { zIndex, ...style },
      className,
      onMouseDown: onFocus,
      onDragStop: (_e, d) => onMove(Math.round(d.x), Math.round(d.y)),
      onResizeStop: (_e, _dir, ref, _delta, position) => onResize(ref.offsetWidth, ref.offsetHeight, Math.round(position.x), Math.round(position.y)),
      children
    }
  );
}

// src/os/OsMainframe.tsx
import { createContext, useContext, useEffect, useMemo as useMemo2, useRef } from "react";
import { RemoteSurface } from "@schemastud/frame-remote/host";

// src/os/windowHost.ts
var IframeFillModeNotShippedError = class extends Error {
  constructor(windowKey) {
    super(
      `The 'iframe' window fill mode is descriptor-only and ships no code path (Frame OS ADR-0012 \xA7B1)` + (windowKey ? ` \u2014 window "${windowKey}" selected it.` : ".") + " Use 'nested' (trusted) or 'remote' (untrusted/metered) instead."
    );
    this.name = "IframeFillModeNotShippedError";
  }
};
function isRemoteHost(host) {
  return host.kind === "remote";
}
function fillModeForTier(tier) {
  return tier === "trusted" ? "nested" : "remote";
}

// src/os/OsMainframe.tsx
import { Fragment, jsx as jsx2, jsxs } from "react/jsx-runtime";
var OS_WINDOW_SLOTS = [
  { name: "window.chrome", fillType: "ordered-multi-source", zones: ["start", "end"] },
  { name: "window.toolbar", fillType: "ordered-multi-source", zones: ["start", "end"] }
];
var OS_WINDOW_DRAG_HANDLE = "os-window-titlebar";
var OsCtx = createContext(null);
function useOs() {
  const ctx = useContext(OsCtx);
  if (!ctx) throw new Error("useOs must be used within the `os` Mainframe mode.");
  return ctx;
}
function osHostContext(ctx) {
  const os = ctx.os;
  return { apps: os?.apps ?? [], initialStage: os?.initialStage, initialOpen: os?.initialOpen, persisted: os?.persisted, bounds: os?.bounds };
}
function resolveWindowHost(spec) {
  if (spec.host) return spec.host;
  if (spec.mode == null || spec.injection == null) {
    throw new Error(
      `OsWindowSpec "${spec.key}" has no fill mode: set \`host\`, or the flat \`mode\`+\`injection\` (nested default).`
    );
  }
  return { kind: "nested", mode: spec.mode, injection: spec.injection, ctx: spec.ctx };
}
function WindowChrome({
  spec,
  focused,
  chromeStart,
  toolbar,
  chromeEnd
}) {
  const { wm } = useOs();
  const win = wm.state.windows[spec.key];
  return /* @__PURE__ */ jsxs("div", { className: `os-window-titlebar${focused ? " is-focused" : ""}`, "data-window": spec.key, children: [
    /* @__PURE__ */ jsxs("div", { className: "os-window-chrome-start", children: [
      chromeStart,
      /* @__PURE__ */ jsx2("span", { className: "os-window-title", children: spec.title })
    ] }),
    /* @__PURE__ */ jsx2("div", { className: "os-window-toolbar", children: toolbar }),
    /* @__PURE__ */ jsxs("div", { className: "os-window-controls os-window-chrome-end", children: [
      chromeEnd,
      win?.presentation === "stage" ? /* @__PURE__ */ jsx2("button", { type: "button", className: "os-window-btn", "aria-label": "Pop out", title: "Pop out of the stage", onClick: () => wm.unstage(spec.key), children: "\u2FF4" }) : /* @__PURE__ */ jsx2("button", { type: "button", className: "os-window-btn", "aria-label": "Send to stage", title: "Send to the stage", onClick: () => wm.stage(spec.key), children: "\u2922" }),
      /* @__PURE__ */ jsx2("button", { type: "button", className: "os-window-btn", "aria-label": "Minimize", onClick: () => wm.minimize(spec.key), children: "\u2013" }),
      win?.presentation !== "stage" && /* @__PURE__ */ jsx2(
        "button",
        {
          type: "button",
          className: "os-window-btn",
          "aria-label": win?.maximized ? "Restore" : "Maximize",
          onClick: () => win?.maximized ? wm.restore(spec.key) : wm.maximize(spec.key),
          children: "\u25A2"
        }
      ),
      spec.role?.closable === false || spec.role?.persistent ? null : /* @__PURE__ */ jsx2("button", { type: "button", className: "os-window-btn", "aria-label": "Close", onClick: () => wm.close(spec.key), children: "\u2715" })
    ] })
  ] });
}
function WindowContentScope({ spec, children }) {
  return /* @__PURE__ */ jsx2(
    "div",
    {
      className: "os-window-content",
      "data-frame-scope": "content",
      ...spec.inheritsShellTheme ? { "data-inherits-shell-theme": "" } : {},
      children
    }
  );
}
function NestedWindowBody({ spec, host, focused }) {
  return /* @__PURE__ */ jsx2(MainframeProvider, { injection: host.injection, children: /* @__PURE__ */ jsx2(NestedWindowInner, { spec, host, focused }) });
}
function isPinnedStage(win) {
  return !!win && win.presentation === "stage" && (win.role?.persistent === true || win.role?.closable === false);
}
function NestedWindowInner({ spec, host, focused }) {
  const { wm } = useOs();
  const slots = useResolvedSlots(host.mode);
  const pinned = isPinnedStage(wm.state.windows[spec.key]);
  return /* @__PURE__ */ jsxs("div", { className: "os-window-body", children: [
    !pinned && /* @__PURE__ */ jsx2(
      WindowChrome,
      {
        spec,
        focused,
        chromeStart: slots.items("window.chrome", "start"),
        toolbar: slots.items("window.toolbar"),
        chromeEnd: slots.items("window.chrome", "end")
      }
    ),
    /* @__PURE__ */ jsx2(WindowContentScope, { spec, children: /* @__PURE__ */ jsx2(MainframeOutlet, { mode: host.mode, ctx: host.ctx }) })
  ] });
}
function RemoteWindowBody({
  spec,
  focused,
  surfaceProps
}) {
  const { wm } = useOs();
  const pinned = isPinnedStage(wm.state.windows[spec.key]);
  return /* @__PURE__ */ jsxs("div", { className: "os-window-body", children: [
    !pinned && /* @__PURE__ */ jsx2(WindowChrome, { spec, focused }),
    /* @__PURE__ */ jsx2(WindowContentScope, { spec, children: /* @__PURE__ */ jsx2("div", { className: "os-window-remote", "data-frame-remote": true, "data-window": spec.key, children: /* @__PURE__ */ jsx2(RemoteSurface, { ...surfaceProps }) }) })
  ] });
}
function WindowBody({ spec, focused }) {
  const host = useMemo2(() => resolveWindowHost(spec), [spec]);
  const remoteSurfaceProps = useMemo2(
    () => host.kind === "remote" ? host.mount(host.capabilityToken) : null,
    [host]
  );
  switch (host.kind) {
    case "nested":
      return /* @__PURE__ */ jsx2(NestedWindowBody, { spec, host, focused });
    case "remote":
      return /* @__PURE__ */ jsx2(RemoteWindowBody, { spec, focused, surfaceProps: remoteSurfaceProps });
    case "iframe":
      throw new IframeFillModeNotShippedError(spec.key);
  }
}
function OsWindow({ spec }) {
  const { wm } = useOs();
  const win = wm.state.windows[spec.key];
  if (!win) return null;
  const focused = wm.state.focused === spec.key;
  return /* @__PURE__ */ jsx2(
    WindowFrame,
    {
      geometry: win.geometry,
      zIndex: zIndexOf(wm.state, spec.key) + 1,
      dragHandleClassName: OS_WINDOW_DRAG_HANDLE,
      disableDragging: win.maximized,
      className: `os-window${focused ? " is-focused" : ""}`,
      onMove: (x, y) => wm.move(spec.key, x, y),
      onResize: (w, h, x, y) => wm.resize(spec.key, w, h, x, y),
      onFocus: () => wm.focus(spec.key),
      children: /* @__PURE__ */ jsx2(WindowBody, { spec, focused })
    }
  );
}
function StageWindow({ spec }) {
  const { wm } = useOs();
  const win = wm.state.windows[spec.key];
  if (!win) return null;
  const focused = wm.state.focused === spec.key;
  return /* @__PURE__ */ jsx2("div", { className: "os-stage", "data-window": spec.key, onMouseDownCapture: () => wm.focus(spec.key), children: /* @__PURE__ */ jsx2(WindowBody, { spec, focused }) });
}
function DesktopLayer({ host }) {
  const wm = useWindowManager({ persisted: host.persisted, bounds: host.bounds });
  const desktopRef = useRef(null);
  useEffect(() => {
    const el = desktopRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width > 0 && height > 0) wm.setBounds({ width, height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (host.initialStage) {
      const spec = host.apps.find((a) => a.key === host.initialStage);
      wm.open(host.initialStage, { geometry: spec?.geometry, role: { ...spec?.role, persistent: true }, presentation: "stage" });
    }
    for (const key of host.initialOpen ?? []) {
      if (key === host.initialStage) continue;
      const spec = host.apps.find((a) => a.key === key);
      wm.open(key, { geometry: spec?.geometry, role: spec?.role });
    }
  }, []);
  const value = useMemo2(
    () => ({
      wm,
      apps: host.apps,
      openApp: (key) => {
        const spec = host.apps.find((a) => a.key === key);
        wm.open(key, { geometry: spec?.geometry, role: spec?.role });
      },
      stageApp: (key) => {
        const spec = host.apps.find((a) => a.key === key);
        wm.open(key, { geometry: spec?.geometry, role: spec?.role, presentation: "stage" });
      }
    }),
    [wm, host.apps]
  );
  const specByKey = useMemo2(() => new Map(host.apps.map((a) => [a.key, a])), [host.apps]);
  const stage = stageKey(wm.state);
  const stageSpec = stage ? specByKey.get(stage) : void 0;
  const floats = floatingWindows(wm.state);
  return /* @__PURE__ */ jsxs(OsCtx.Provider, { value, children: [
    /* @__PURE__ */ jsxs("div", { className: "os-desktop-windows", ref: desktopRef, children: [
      stageSpec ? /* @__PURE__ */ jsx2(StageWindow, { spec: stageSpec }, stageSpec.key) : null,
      floats.map((w) => {
        const spec = specByKey.get(w.key);
        return spec ? /* @__PURE__ */ jsx2(OsWindow, { spec }, w.key) : null;
      })
    ] }),
    /* @__PURE__ */ jsx2(OsChromeInDesktop, {})
  ] });
}
var OsChromeInDesktopCtx = createContext({});
function OsChromeInDesktop() {
  const { dock, launcher } = useContext(OsChromeInDesktopCtx);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    dock != null && /* @__PURE__ */ jsx2("div", { className: "os-dock", role: "toolbar", "aria-label": "Dock", children: dock }),
    launcher != null && /* @__PURE__ */ jsx2("div", { className: "os-launcher", children: launcher })
  ] });
}
var OsMainframe = ({ slots, ctx }) => {
  const host = osHostContext(ctx);
  const dock = slots.has("rail") ? slots.node("rail") : null;
  const launcher = slots.has("overlay") ? slots.items("overlay") : null;
  return /* @__PURE__ */ jsxs("div", { className: "os-root", "data-shell-root": true, children: [
    /* @__PURE__ */ jsxs("div", { className: "os-menubar", role: "menubar", children: [
      /* @__PURE__ */ jsxs("div", { className: "os-menubar-start", children: [
        slots.node("brand"),
        slots.node("topBar.lead")
      ] }),
      /* @__PURE__ */ jsx2("div", { className: "os-menubar-actions", children: slots.items("topBar.actions") })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "os-desktop", children: [
      slots.has("main") && /* @__PURE__ */ jsx2("div", { className: "os-desktop-backdrop", children: slots.main(ctx.payload) }),
      /* @__PURE__ */ jsx2(OsChromeInDesktopCtx.Provider, { value: { dock, launcher: launcher && launcher.length ? launcher : null }, children: /* @__PURE__ */ jsx2(DesktopLayer, { host }) })
    ] }),
    slots.has("status") && /* @__PURE__ */ jsx2("div", { className: "os-statusbus", role: "status", children: slots.items("status") })
  ] });
};
function registerOsMode(registry) {
  registry.register("os", OsMainframe, { slots: OS_WINDOW_SLOTS });
}

// src/os/desktopChrome.tsx
import { useEffect as useEffect2, useRef as useRef2, useState } from "react";
import { Fragment as Fragment2, jsx as jsx3, jsxs as jsxs2 } from "react/jsx-runtime";
function Glyph({ app, className = "glyph" }) {
  if (app.icon) {
    return /* @__PURE__ */ jsx3("span", { className, children: app.icon });
  }
  return /* @__PURE__ */ jsx3("span", { className, style: app.accent ? { background: app.accent } : void 0 });
}
function upsellText(a) {
  return {
    title: a.upsell?.title || `Unlock ${a.title}`,
    cta: a.upsell?.cta || "Upgrade"
  };
}
function Clock() {
  const [now, setNow] = useState("\u2014");
  useEffect2(() => {
    const tick = () => setNow((/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = setInterval(tick, 1e3);
    return () => clearInterval(id);
  }, []);
  return /* @__PURE__ */ jsx3("span", { className: "clock", children: now });
}
function UpsellPopover({ app, onClose }) {
  const { title, cta } = upsellText(app);
  return /* @__PURE__ */ jsxs2(Fragment2, { children: [
    /* @__PURE__ */ jsx3("div", { className: "launcher-scrim", onClick: onClose }),
    /* @__PURE__ */ jsxs2("div", { className: "upsell-pop", role: "dialog", "aria-label": `Unlock ${app.title}`, children: [
      /* @__PURE__ */ jsx3("div", { className: "upsell-lock", style: { background: app.accent }, children: "\u{1F512}" }),
      /* @__PURE__ */ jsx3("div", { className: "upsell-title", children: title }),
      /* @__PURE__ */ jsxs2("p", { className: "upsell-copy", children: [
        "The ",
        /* @__PURE__ */ jsx3("b", { children: app.title }),
        " app is available on a higher plan. Upgrade to launch it."
      ] }),
      /* @__PURE__ */ jsx3("button", { type: "button", className: "upsell-cta", children: cta })
    ] })
  ] });
}
function Launcher({
  apps,
  heading = "Apps",
  onClose,
  onUpsell
}) {
  const { openApp } = useOs();
  return /* @__PURE__ */ jsxs2(Fragment2, { children: [
    /* @__PURE__ */ jsx3("div", { className: "launcher-scrim", onClick: onClose }),
    /* @__PURE__ */ jsxs2("div", { className: "launcher-pop", role: "menu", children: [
      /* @__PURE__ */ jsx3("div", { className: "launcher-heading", children: heading }),
      /* @__PURE__ */ jsx3("div", { className: "launcher-grid", children: apps.map((a) => /* @__PURE__ */ jsxs2(
        "button",
        {
          type: "button",
          className: `launcher-app${a.locked ? " is-locked" : ""}`,
          onClick: () => {
            if (a.locked) {
              onUpsell(a);
            } else {
              openApp(a.key);
            }
            onClose();
          },
          children: [
            /* @__PURE__ */ jsx3(Glyph, { app: a }),
            /* @__PURE__ */ jsxs2("span", { children: [
              /* @__PURE__ */ jsxs2("span", { className: "name", children: [
                a.title,
                a.locked ? /* @__PURE__ */ jsx3("span", { className: "lock-badge", children: " \u{1F512}" }) : null
              ] }),
              /* @__PURE__ */ jsxs2("span", { className: "realm", children: [
                a.realm,
                " \xB7 ",
                a.locked ? upsellText(a).title : a.subtitle
              ] })
            ] })
          ]
        },
        a.key
      )) })
    ] })
  ] });
}
function Dock({
  apps,
  activeKey,
  launchLabel = "Launch",
  launcherHeading,
  onNavigate
}) {
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [upsell, setUpsell] = useState(null);
  return /* @__PURE__ */ jsxs2(Fragment2, { children: [
    /* @__PURE__ */ jsxs2("button", { type: "button", className: "dock-launch", onClick: () => setLauncherOpen((v) => !v), children: [
      /* @__PURE__ */ jsx3("span", { children: "\u25A6" }),
      " ",
      launchLabel
    ] }),
    /* @__PURE__ */ jsx3("span", { className: "dock-div" }),
    apps.map(
      (a) => a.locked ? /* @__PURE__ */ jsxs2(
        "button",
        {
          type: "button",
          className: "dock-app is-locked",
          title: upsellText(a).title,
          onClick: () => setUpsell(a),
          children: [
            /* @__PURE__ */ jsx3(Glyph, { app: a }),
            a.title,
            /* @__PURE__ */ jsx3("span", { className: "lock-badge", "aria-label": "locked", children: "\u{1F512}" })
          ]
        },
        a.key
      ) : /* @__PURE__ */ jsxs2(
        "button",
        {
          type: "button",
          className: `dock-app${a.key === activeKey ? " open" : ""}`,
          onClick: () => onNavigate(a),
          children: [
            /* @__PURE__ */ jsx3(Glyph, { app: a }),
            a.title
          ]
        },
        a.key
      )
    ),
    launcherOpen && /* @__PURE__ */ jsx3(Launcher, { apps, heading: launcherHeading, onClose: () => setLauncherOpen(false), onUpsell: setUpsell }),
    upsell && /* @__PURE__ */ jsx3(UpsellPopover, { app: upsell, onClose: () => setUpsell(null) })
  ] });
}
function WorkspacePersistence({ persist }) {
  const { wm } = useOs();
  useEffect2(() => {
    try {
      persist(wm.serialize());
    } catch {
    }
  }, [wm.state]);
  return null;
}
function buildDesktopChrome(config) {
  const slots = createSlotRegistry();
  const mainframes = createMainframeRegistry();
  registerOsMode(mainframes);
  if (config.brand != null) {
    slots.contribute({ slot: "brand", key: "os-brand", node: config.brand });
  }
  if (config.status != null) {
    slots.contribute({ slot: "topBar.actions", key: "os-status", zone: "end", node: config.status });
  }
  if (config.backdrop != null) {
    slots.contribute({ slot: "main", key: "os-backdrop", render: () => config.backdrop });
  }
  slots.contribute({
    slot: "rail",
    key: "os-dock",
    node: /* @__PURE__ */ jsx3(
      Dock,
      {
        apps: config.apps,
        activeKey: config.activeKey,
        launchLabel: config.launchLabel,
        launcherHeading: config.launcherHeading,
        onNavigate: config.onNavigate
      }
    )
  });
  if (config.persist) {
    slots.contribute({
      slot: "overlay",
      key: "os-persist",
      zone: "corner",
      node: /* @__PURE__ */ jsx3(WorkspacePersistence, { persist: config.persist })
    });
  }
  if (config.statusLine != null) {
    slots.contribute({ slot: "status", key: "os-bus", zone: "start", node: config.statusLine });
  }
  return { slots, mainframes };
}
function OperatorOverlay({
  stableKeys,
  resolveWindow,
  renderLauncher,
  orbLabel = "Operator",
  orbIcon,
  onWindowManager,
  onWindowBodyClickCapture
}) {
  const overlayRef = useRef2(null);
  const wm = useWindowManager();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect2(() => {
    if (!onWindowManager) {
      return;
    }
    return onWindowManager(wm);
  }, [onWindowManager]);
  const { setBounds } = wm;
  const lastBounds = useRef2({ width: 0, height: 0 });
  useEffect2(() => {
    const el = overlayRef.current;
    if (!el || typeof ResizeObserver === "undefined") {
      return;
    }
    const sync = () => {
      const r = el.getBoundingClientRect();
      const width = Math.round(r.width);
      const height = Math.round(r.height);
      if (width === lastBounds.current.width && height === lastBounds.current.height) {
        return;
      }
      lastBounds.current = { width, height };
      setBounds({ width, height });
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [setBounds]);
  const surface = (key) => {
    if (wm.state.windows[key]?.minimized) {
      wm.restore(key);
    }
    wm.focus(key);
  };
  const wins = floatingWindows(wm.state);
  const orderedKeys = typeof stableKeys === "function" ? stableKeys(wm) : stableKeys;
  const taskbar = orderedKeys.map((k) => wm.state.windows[k]).filter((w) => !!w);
  return /* @__PURE__ */ jsxs2("div", { ref: overlayRef, className: "op-desk-overlay", children: [
    wins.map((w) => {
      const win = resolveWindow(w.key, wm);
      if (!win) {
        return null;
      }
      return /* @__PURE__ */ jsx3(
        WindowFrame,
        {
          geometry: w.geometry,
          zIndex: zIndexOf(wm.state, w.key),
          dragHandleClassName: "op-win-bar",
          bounds: "parent",
          disableDragging: w.maximized,
          enableResizing: !w.maximized,
          onMove: (x, y) => wm.move(w.key, x, y),
          onResize: (width, height, x, y) => wm.resize(w.key, width, height, x, y),
          onFocus: () => wm.focus(w.key),
          children: /* @__PURE__ */ jsxs2("div", { className: "op-win-inner", children: [
            /* @__PURE__ */ jsxs2(
              "div",
              {
                className: "op-win-bar",
                onDoubleClick: () => w.maximized ? wm.restore(w.key) : wm.maximize(w.key),
                children: [
                  /* @__PURE__ */ jsx3("span", { className: "op-win-dot", style: { background: win.accent } }),
                  /* @__PURE__ */ jsx3("span", { className: "op-win-title", children: win.title }),
                  /* @__PURE__ */ jsxs2("div", { className: "op-win-ctrls", children: [
                    /* @__PURE__ */ jsx3(
                      "button",
                      {
                        type: "button",
                        className: "op-win-x",
                        onClick: () => wm.minimize(w.key),
                        "aria-label": "Minimize",
                        title: "Minimize",
                        children: "\u2013"
                      }
                    ),
                    /* @__PURE__ */ jsx3(
                      "button",
                      {
                        type: "button",
                        className: "op-win-x",
                        onClick: () => w.maximized ? wm.restore(w.key) : wm.maximize(w.key),
                        "aria-label": w.maximized ? "Restore" : "Maximize",
                        title: w.maximized ? "Restore" : "Maximize",
                        children: w.maximized ? "\u2750" : "\u25A2"
                      }
                    ),
                    /* @__PURE__ */ jsx3(
                      "button",
                      {
                        type: "button",
                        className: "op-win-x",
                        onClick: () => wm.close(w.key),
                        "aria-label": "Close",
                        title: "Close",
                        children: "\xD7"
                      }
                    )
                  ] })
                ]
              }
            ),
            /* @__PURE__ */ jsx3("div", { className: "op-win-body", onClickCapture: onWindowBodyClickCapture, children: win.render() })
          ] })
        },
        w.key
      );
    }),
    taskbar.length > 0 && /* @__PURE__ */ jsx3("div", { className: "op-taskbar", children: taskbar.map((w) => {
      const win = resolveWindow(w.key, wm);
      if (!win) {
        return null;
      }
      const cls = [
        wm.state.focused === w.key && !w.minimized ? "focused" : "",
        w.minimized ? "minned" : ""
      ].filter(Boolean).join(" ");
      return /* @__PURE__ */ jsxs2("button", { type: "button", className: cls, onClick: () => surface(w.key), children: [
        /* @__PURE__ */ jsx3("span", { className: "glyph", style: { background: win.accent } }),
        win.title
      ] }, w.key);
    }) }),
    menuOpen && renderLauncher({ wm, onClose: () => setMenuOpen(false) }),
    /* @__PURE__ */ jsxs2(
      "button",
      {
        type: "button",
        className: `op-orb${menuOpen ? " is-open" : ""}`,
        onClick: () => setMenuOpen((v) => !v),
        "aria-haspopup": "menu",
        "aria-expanded": menuOpen,
        children: [
          orbIcon ?? /* @__PURE__ */ jsx3("span", { className: "mark" }),
          orbLabel
        ]
      }
    )
  ] });
}
export {
  Clock,
  DEFAULT_BOUNDS,
  Dock,
  IframeFillModeNotShippedError,
  Launcher,
  OS_WINDOW_DRAG_HANDLE,
  OS_WINDOW_SLOTS,
  OperatorOverlay,
  OsMainframe,
  UpsellPopover,
  WORKSPACE_VERSION,
  WindowFrame,
  WorkspacePersistence,
  buildDesktopChrome,
  deserializeWorkspace,
  fillModeForTier,
  floatingWindows,
  initialWindowManagerState,
  isRemoteHost,
  isTaskOpen,
  registerOsMode,
  serializeWorkspace,
  snapRect,
  stageKey,
  tileRects,
  useOs,
  useWindowManager,
  visibleWindows,
  windowManagerReducer,
  zIndexOf
};
//# sourceMappingURL=os.js.map