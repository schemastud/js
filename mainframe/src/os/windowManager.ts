/**
 * The capability-complete window-manager reducer (Frame OS ticket 03, ADR-0011 §1 + ADR-0012 §B2).
 *
 * A pure, framework-neutral, exhaustively unit-testable reducer that owns the desktop window model:
 * the open set, z-order, focus, min/max state, and the snap/tile/dock geometry logic. It supersedes
 * the shipped open/focus/minimize/close-only reducer (`@splicewire/beam-ux/shell`), which was
 * geometry-free.
 *
 * **The geometry wheel stays out of here.** This module computes geometry *values* (rects) but never
 * imports a geometry library: `react-rnd` is imported at exactly one place — the `WindowFrame`
 * component — and a guard test fails if it leaks anywhere else (keeping `dockview` reachable as the
 * deferred second wheel behind the same seam). No React, no Inertia, no DOM.
 *
 * **No privileged root window.** Every window is an equal peer carrying `role` metadata the
 * implementation sets (`persistent?`, `closable?`, `zAnchor?`); the reducer merely honors those
 * fields when it computes z-order and handles close.
 */

/** A desktop viewport size — the frame within which snap/tile/dock/maximize geometry is computed. */
export type Bounds = { width: number; height: number };

/** An absolute window rectangle in desktop coordinates. */
export type Geometry = { x: number; y: number; width: number; height: number };

/** The snap targets: screen halves, quadrants, and full-screen. */
export type SnapZone =
    | 'left'
    | 'right'
    | 'top'
    | 'bottom'
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'maximized';

/** A dock edge — the window pins to a fixed strip along one screen edge. */
export type DockEdge = 'left' | 'right' | 'top' | 'bottom';

/**
 * The z-order bucket a window sits in. `floor` windows always stack below `normal`, `top` always
 * above — focus raises a window only within its own bucket, so a pinned floor (e.g. a desktop
 * backdrop) or a pinned top (e.g. a persistent HUD) keeps its band. Default `normal`.
 */
export type ZAnchor = 'floor' | 'normal' | 'top';

/**
 * A window's presentation role (the "site sits inside the OS" model):
 * - `stage` — the PRIMARY surface. It fills the desktop as the backdrop (floor-anchored,
 *   viewport-sized, non-draggable), and the OS chrome wraps it — the current site/realm feels like
 *   it's just running inside the OS. **At most one window is the stage at a time.**
 * - `float` — a normal floating window that sits ON TOP of the stage (the default).
 * A floating window can be promoted with the `stage` op ("send to stage"), which demotes the prior
 * stage back to a float. Promoting is a form of "take over as the main thing".
 */
export type Presentation = 'stage' | 'float';

/** Role metadata the implementation sets on a window; the reducer honors it, never invents it. */
export type WindowRole = {
    /** A persistent window is never removed by `close` (the op is a no-op). Default false. */
    persistent?: boolean;
    /** A non-closable window ignores `close` (the op is a no-op). Default true (closable). */
    closable?: boolean;
    /** Which z-order band this window lives in. Default `normal`. */
    zAnchor?: ZAnchor;
};

/** One managed window: its geometry, lifecycle flags, snap state, and role. */
export type ManagedWindow = {
    /** The app/page key this window frames — its stable identity and z-order token. */
    key: string;
    /** The current floating rectangle. When maximized/snapped, this holds the derived rect. */
    geometry: Geometry;
    /** Minimized windows stay in the manager (dock task lit) but are not painted on the desktop. */
    minimized: boolean;
    /** Maximized fills the workspace bounds; `restore` remembers the pre-maximize rect. */
    maximized: boolean;
    /** The active snap zone, or null when free-floating / maximized. */
    snap: SnapZone | null;
    /** The rectangle to restore to after un-maximize / un-snap. Null when the window is free. */
    restore: Geometry | null;
    /** Role metadata (persistence, closability, z-anchor). */
    role: WindowRole;
    /** Presentation role — `stage` (the primary backdrop surface) or `float` (a floating window). Default `float`. */
    presentation: Presentation;
};

/**
 * The full window-manager state (ticket 03 contract).
 * - `windows` — open windows keyed by app key (minimized ones included).
 * - `zOrder` — every window key back-to-front; invariant: `floor` keys precede `normal` precede
 *   `top`, so paint order and focus both honor the anchor bands.
 * - `focused` — the focused window key (the highest-z non-minimized window), or null.
 * - `snap` — a transient snap-preview zone a drag-to-snap UI can set/clear; null when idle.
 * - `workspace` — the desktop bounds snap/tile/dock/maximize geometry is computed against.
 */
export type WindowManagerState = {
    windows: Record<string, ManagedWindow>;
    zOrder: string[];
    focused: string | null;
    snap: SnapZone | null;
    workspace: { bounds: Bounds };
};

/** The op set (ticket 03): `open close focus move resize minimize maximize restore snap tile dock`. */
export type WindowManagerAction =
    | { type: 'open'; key: string; geometry?: Partial<Geometry>; role?: WindowRole; presentation?: Presentation }
    | { type: 'close'; key: string }
    | { type: 'focus'; key: string }
    // Promote a window to the stage (the primary backdrop). Demotes the prior stage to a float.
    | { type: 'stage'; key: string }
    // Demote a window from the stage back to a floating window (its `restore` geometry).
    | { type: 'unstage'; key: string }
    | { type: 'move'; key: string; x: number; y: number }
    | { type: 'resize'; key: string; width: number; height: number; x?: number; y?: number }
    | { type: 'minimize'; key: string }
    | { type: 'maximize'; key: string }
    | { type: 'restore'; key: string }
    | { type: 'snap'; key: string; zone: SnapZone }
    | { type: 'tile'; keys?: string[] }
    | { type: 'dock'; key: string; edge: DockEdge; size?: number }
    // Infra ops (not user window ops): re-project geometry when the viewport changes, and set the
    // transient snap-preview a drag UI shows. Kept explicit so the reducer stays the single source.
    | { type: 'bounds'; bounds: Bounds }
    | { type: 'snapPreview'; zone: SnapZone | null };

export const DEFAULT_BOUNDS: Bounds = { width: 1280, height: 800 };

export const initialWindowManagerState: WindowManagerState = {
    windows: {},
    zOrder: [],
    focused: null,
    snap: null,
    workspace: { bounds: DEFAULT_BOUNDS },
};

// ── z-order helpers ──────────────────────────────────────────────────────────────────────────────

const ANCHOR_RANK: Record<ZAnchor, number> = { floor: 0, normal: 1, top: 2 };

function anchorOf(windows: Record<string, ManagedWindow>, key: string): ZAnchor {
    return windows[key]?.role.zAnchor ?? 'normal';
}

/**
 * Re-sort `zOrder` so the band invariant holds (`floor` < `normal` < `top`) while preserving the
 * relative order within each band. A stable partition — the single place the invariant is enforced.
 */
function normalizeZOrder(zOrder: string[], windows: Record<string, ManagedWindow>): string[] {
    return [...zOrder].sort((a, b) => ANCHOR_RANK[anchorOf(windows, a)] - ANCHOR_RANK[anchorOf(windows, b)]);
}

/** Raise `key` to the front of its own anchor band (highest z within the band), keeping the invariant. */
function raiseWithinBand(zOrder: string[], windows: Record<string, ManagedWindow>, key: string): string[] {
    const without = zOrder.filter((k) => k !== key);
    const band = ANCHOR_RANK[anchorOf(windows, key)];
    // Insert after the last key whose band <= this band (i.e. at the top of this band, below higher bands).
    let insertAt = without.length;
    for (let i = 0; i < without.length; i++) {
        if (ANCHOR_RANK[anchorOf(windows, without[i])] > band) {
            insertAt = i;
            break;
        }
    }
    return [...without.slice(0, insertAt), key, ...without.slice(insertAt)];
}

/** The focused window = the topmost (last in zOrder) non-minimized window, or null. */
function topmostVisible(state: { zOrder: string[]; windows: Record<string, ManagedWindow> }): string | null {
    for (let i = state.zOrder.length - 1; i >= 0; i--) {
        const w = state.windows[state.zOrder[i]];
        if (w && !w.minimized) return w.key;
    }
    return null;
}

/** The topmost non-minimized FLOATING window (skips the stage backdrop), or null. */
function topmostFloat(state: { zOrder: string[]; windows: Record<string, ManagedWindow> }): string | null {
    for (let i = state.zOrder.length - 1; i >= 0; i--) {
        const w = state.windows[state.zOrder[i]];
        if (w && !w.minimized && w.presentation !== 'stage') return w.key;
    }
    return null;
}

// ── geometry helpers ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_WINDOW: Geometry = { x: 64, y: 64, width: 720, height: 480 };
const CASCADE_STEP = 28;

/** A fresh window's default geometry, cascaded by how many windows are already open. */
function cascadeGeometry(count: number, override?: Partial<Geometry>): Geometry {
    const base: Geometry = {
        x: DEFAULT_WINDOW.x + count * CASCADE_STEP,
        y: DEFAULT_WINDOW.y + count * CASCADE_STEP,
        width: DEFAULT_WINDOW.width,
        height: DEFAULT_WINDOW.height,
    };
    return { ...base, ...override };
}

/** The absolute rect for a snap zone within `bounds`. */
export function snapRect(zone: SnapZone, bounds: Bounds): Geometry {
    const { width: W, height: H } = bounds;
    const halfW = Math.round(W / 2);
    const halfH = Math.round(H / 2);
    switch (zone) {
        case 'maximized':
            return { x: 0, y: 0, width: W, height: H };
        case 'left':
            return { x: 0, y: 0, width: halfW, height: H };
        case 'right':
            return { x: W - halfW, y: 0, width: halfW, height: H };
        case 'top':
            return { x: 0, y: 0, width: W, height: halfH };
        case 'bottom':
            return { x: 0, y: H - halfH, width: W, height: halfH };
        case 'top-left':
            return { x: 0, y: 0, width: halfW, height: halfH };
        case 'top-right':
            return { x: W - halfW, y: 0, width: halfW, height: halfH };
        case 'bottom-left':
            return { x: 0, y: H - halfH, width: halfW, height: halfH };
        case 'bottom-right':
            return { x: W - halfW, y: H - halfH, width: halfW, height: halfH };
    }
}

/** The rect for a docked strip along `edge`, occupying `size` px (default 1/4 of the relevant axis). */
function dockRect(edge: DockEdge, size: number | undefined, bounds: Bounds): Geometry {
    const { width: W, height: H } = bounds;
    switch (edge) {
        case 'left':
            return { x: 0, y: 0, width: size ?? Math.round(W / 4), height: H };
        case 'right': {
            const w = size ?? Math.round(W / 4);
            return { x: W - w, y: 0, width: w, height: H };
        }
        case 'top':
            return { x: 0, y: 0, width: W, height: size ?? Math.round(H / 4) };
        case 'bottom': {
            const h = size ?? Math.round(H / 4);
            return { x: 0, y: H - h, width: W, height: h };
        }
    }
}

/** Re-derive a window's geometry from its stage/maximized/snap state against the current bounds. */
function reproject(win: ManagedWindow, bounds: Bounds): ManagedWindow {
    // The stage always fills the viewport (it's the backdrop the OS wraps).
    if (win.presentation === 'stage') return { ...win, geometry: snapRect('maximized', bounds) };
    if (win.maximized) return { ...win, geometry: snapRect('maximized', bounds) };
    if (win.snap) return { ...win, geometry: snapRect(win.snap, bounds) };
    return win;
}

/**
 * Promote `key` to the stage (the primary backdrop): fill the viewport, and demote any prior stage
 * back to a floating window at its saved float geometry. Returns a new windows map (pure).
 */
function applyStage(
    windows: Record<string, ManagedWindow>,
    key: string,
    bounds: Bounds,
): Record<string, ManagedWindow> {
    const win = windows[key];
    if (!win) return windows;
    const next = { ...windows };
    // Demote the incumbent stage (if any, and not the target itself).
    for (const [k, w] of Object.entries(next)) {
        if (w.presentation === 'stage' && k !== key) {
            next[k] = { ...w, presentation: 'float', geometry: w.restore ?? w.geometry, restore: null, maximized: false, snap: null };
        }
    }
    // Promote the target — save its float geometry so unstage can restore it.
    next[key] = {
        ...win,
        presentation: 'stage',
        restore: win.presentation === 'stage' ? win.restore : (win.restore ?? win.geometry),
        geometry: snapRect('maximized', bounds),
        maximized: false,
        snap: null,
        minimized: false,
    };
    return next;
}

// ── the reducer ──────────────────────────────────────────────────────────────────────────────────

export function windowManagerReducer(
    state: WindowManagerState,
    action: WindowManagerAction,
): WindowManagerState {
    switch (action.type) {
        case 'open': {
            const existing = state.windows[action.key];
            if (existing) {
                // Idempotent: re-opening focuses + un-minimizes, keeps geometry — BUT honors an explicit
                // `role`/`presentation` on the re-open (merges the role, and if asked to stage, promotes
                // this window to the stage even if it was persisted as a float). This is what lets the
                // current route re-stage its realm over a restored workspace (host re-opens the stage
                // window with `{ role: { persistent: true }, presentation: 'stage' }` each mount).
                const merged = { ...existing, minimized: false, role: { ...existing.role, ...action.role } };
                let windows = { ...state.windows, [action.key]: merged };
                if (action.presentation === 'stage') windows = applyStage(windows, action.key, state.workspace.bounds);
                const zOrder = raiseWithinBand(state.zOrder, windows, action.key);
                return { ...state, windows, zOrder, focused: action.key, snap: null };
            }
            const role = action.role ?? {};
            const count = Object.keys(state.windows).length;
            const win: ManagedWindow = {
                key: action.key,
                geometry: cascadeGeometry(count, action.geometry),
                minimized: false,
                maximized: false,
                snap: null,
                restore: null,
                role,
                presentation: 'float',
            };
            let windows = { ...state.windows, [action.key]: win };
            // Open directly onto the stage when asked (e.g. the current route's realm is the stage).
            if (action.presentation === 'stage') windows = applyStage(windows, action.key, state.workspace.bounds);
            const zOrder = raiseWithinBand([...state.zOrder, action.key], windows, action.key);
            return { ...state, windows, zOrder, focused: action.key, snap: null };
        }
        case 'stage': {
            if (!state.windows[action.key]) return state;
            const windows = applyStage(state.windows, action.key, state.workspace.bounds);
            // Keep the newly-staged window in the manager; focus stays on the topmost visible float.
            return { ...state, windows, focused: topmostFloat({ zOrder: state.zOrder, windows }) ?? action.key };
        }
        case 'unstage': {
            const win = state.windows[action.key];
            if (!win || win.presentation !== 'stage') return state;
            const windows = {
                ...state.windows,
                [action.key]: { ...win, presentation: 'float' as const, geometry: win.restore ?? win.geometry, restore: null },
            };
            return { ...state, windows };
        }
        case 'close': {
            const win = state.windows[action.key];
            if (!win) return state;
            // Honor the role fields: a persistent or non-closable window ignores close.
            if (win.role.persistent || win.role.closable === false) return state;
            const windows = { ...state.windows };
            delete windows[action.key];
            const zOrder = state.zOrder.filter((k) => k !== action.key);
            return { ...state, windows, zOrder, focused: topmostVisible({ zOrder, windows }) };
        }
        case 'focus': {
            const win = state.windows[action.key];
            if (!win) return state;
            const windows = win.minimized
                ? { ...state.windows, [action.key]: { ...win, minimized: false } }
                : state.windows;
            const zOrder = raiseWithinBand(state.zOrder, windows, action.key);
            return { ...state, windows, zOrder, focused: action.key };
        }
        case 'move': {
            const win = state.windows[action.key];
            if (!win) return state;
            // Moving frees the window from maximize/snap (it becomes floating at the dropped point).
            const geometry: Geometry = { ...win.geometry, x: action.x, y: action.y };
            const windows = {
                ...state.windows,
                [action.key]: { ...win, geometry, maximized: false, snap: null, restore: null },
            };
            return { ...state, windows, snap: null };
        }
        case 'resize': {
            const win = state.windows[action.key];
            if (!win) return state;
            const geometry: Geometry = {
                x: action.x ?? win.geometry.x,
                y: action.y ?? win.geometry.y,
                width: action.width,
                height: action.height,
            };
            const windows = {
                ...state.windows,
                [action.key]: { ...win, geometry, maximized: false, snap: null, restore: null },
            };
            return { ...state, windows };
        }
        case 'minimize': {
            const win = state.windows[action.key];
            if (!win) return state;
            const windows = { ...state.windows, [action.key]: { ...win, minimized: true } };
            return { ...state, windows, focused: topmostVisible({ zOrder: state.zOrder, windows }) };
        }
        case 'maximize': {
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
                    geometry: snapRect('maximized', state.workspace.bounds),
                },
            };
            const zOrder = raiseWithinBand(state.zOrder, windows, action.key);
            return { ...state, windows, zOrder, focused: action.key };
        }
        case 'restore': {
            const win = state.windows[action.key];
            if (!win) return state;
            const geometry = win.restore ?? win.geometry;
            const windows = {
                ...state.windows,
                [action.key]: { ...win, maximized: false, snap: null, restore: null, geometry },
            };
            return { ...state, windows };
        }
        case 'snap': {
            const win = state.windows[action.key];
            if (!win) return state;
            const restore = win.restore ?? win.geometry;
            const windows = {
                ...state.windows,
                [action.key]: {
                    ...win,
                    snap: action.zone,
                    maximized: action.zone === 'maximized',
                    minimized: false,
                    restore,
                    geometry: snapRect(action.zone, state.workspace.bounds),
                },
            };
            const zOrder = raiseWithinBand(state.zOrder, windows, action.key);
            return { ...state, windows, zOrder, focused: action.key, snap: null };
        }
        case 'dock': {
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
                    geometry: dockRect(action.edge, action.size, state.workspace.bounds),
                },
            };
            const zOrder = raiseWithinBand(state.zOrder, windows, action.key);
            return { ...state, windows, zOrder, focused: action.key };
        }
        case 'tile': {
            const keys = (action.keys ?? state.zOrder).filter(
                (k) => state.windows[k] && !state.windows[k].minimized,
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
        case 'bounds': {
            const workspace = { bounds: action.bounds };
            const windows: Record<string, ManagedWindow> = {};
            for (const [k, w] of Object.entries(state.windows)) windows[k] = reproject(w, action.bounds);
            return { ...state, windows, workspace };
        }
        case 'snapPreview':
            return { ...state, snap: action.zone };
        default:
            return state;
    }
}

/** A near-square grid of `count` rects filling `bounds`, row-major. */
export function tileRects(count: number, bounds: Bounds): Geometry[] {
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const cellW = Math.floor(bounds.width / cols);
    const cellH = Math.floor(bounds.height / rows);
    const rects: Geometry[] = [];
    for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        rects.push({ x: col * cellW, y: row * cellH, width: cellW, height: cellH });
    }
    return rects;
}

// ── selectors ────────────────────────────────────────────────────────────────────────────────────

/** Open (non-minimized) windows, back-to-front (zOrder order), each carrying its full record. */
export function visibleWindows(state: WindowManagerState): ManagedWindow[] {
    return state.zOrder.map((k) => state.windows[k]).filter((w): w is ManagedWindow => !!w && !w.minimized);
}

/** True when a window for `key` exists (open or minimized). */
export function isTaskOpen(state: WindowManagerState, key: string): boolean {
    return key in state.windows;
}

/** The paint z-index for a window key (its index in zOrder; higher = nearer front). */
export function zIndexOf(state: WindowManagerState, key: string): number {
    return state.zOrder.indexOf(key);
}

/** The current stage (primary backdrop) window key, or null if the desktop is pure-floating. */
export function stageKey(state: WindowManagerState): string | null {
    for (const k of state.zOrder) if (state.windows[k]?.presentation === 'stage') return k;
    return null;
}

/** Open (non-minimized) FLOATING windows (excludes the stage), back-to-front. */
export function floatingWindows(state: WindowManagerState): ManagedWindow[] {
    return visibleWindows(state).filter((w) => w.presentation !== 'stage');
}

// ── the persisted workspace dialect (our own JSON — no cross-tool standard exists) ─────────────────

/** The serialized per-window record — open set + geometry + min/max + snap + role, per ticket 03. */
export type PersistedWindow = {
    key: string;
    geometry: Geometry;
    minimized: boolean;
    maximized: boolean;
    snap: SnapZone | null;
    /** The pre-maximize/pre-snap floating rect, so a restore after reload returns to the true size. */
    restore: Geometry | null;
    role: WindowRole;
    /** Presentation role (`stage`/`float`), so the primary surface survives a reload. */
    presentation: Presentation;
};

/** The serialized workspace — versioned so the dialect can evolve without breaking old snapshots. */
export type PersistedWorkspace = {
    version: 1;
    windows: PersistedWindow[];
    zOrder: string[];
    focused: string | null;
};

export const WORKSPACE_VERSION = 1 as const;

/**
 * Serialize the durable slice of the state for per-user persistence (bounds are viewport-derived).
 * The STAGE window is EXCLUDED: the stage is route-ephemeral (the host re-establishes it from the
 * current route on every mount), so persisting it would let a stale stage haunt a different route.
 * Only FLOATS persist across reloads/navigations.
 */
export function serializeWorkspace(state: WindowManagerState): PersistedWorkspace {
    const floats = state.zOrder
        .map((k) => state.windows[k])
        .filter((w): w is ManagedWindow => !!w && w.presentation !== 'stage');
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
            presentation: w.presentation,
        })),
        zOrder: state.zOrder.filter((k) => floatKeys.has(k)),
        focused: state.focused && floatKeys.has(state.focused) ? state.focused : null,
    };
}

/**
 * Rebuild a full state from a persisted workspace against the current viewport bounds. Unknown /
 * versionless input restores to the initial state (degrade-not-throw). Maximized/snapped windows are
 * re-projected to the given bounds so a restored layout fits the current viewport.
 */
export function deserializeWorkspace(
    persisted: PersistedWorkspace | null | undefined,
    bounds: Bounds = DEFAULT_BOUNDS,
): WindowManagerState {
    if (!persisted || persisted.version !== WORKSPACE_VERSION) {
        return { ...initialWindowManagerState, workspace: { bounds } };
    }
    const windows: Record<string, ManagedWindow> = {};
    for (const p of persisted.windows) {
        const win: ManagedWindow = {
            key: p.key,
            geometry: p.geometry,
            minimized: p.minimized,
            maximized: p.maximized,
            snap: p.snap,
            // Prefer the persisted pre-max/pre-snap rect; fall back for legacy snapshots without it.
            restore: p.restore ?? (p.maximized || p.snap ? p.geometry : null),
            role: p.role,
            // Legacy snapshots (pre-stage) default to a floating window.
            presentation: p.presentation ?? 'float',
        };
        windows[p.key] = reproject(win, bounds);
    }
    const zOrder = normalizeZOrder(
        persisted.zOrder.filter((k) => windows[k]),
        windows,
    );
    // Restore the persisted focus only if that window still exists AND is visible (not minimized);
    // otherwise fall through to the topmost visible — preserving the "focused = topmost visible" invariant.
    const persistedFocusVisible =
        persisted.focused && windows[persisted.focused] && !windows[persisted.focused].minimized;
    return {
        windows,
        zOrder,
        focused: persistedFocusVisible ? persisted.focused : topmostVisible({ zOrder, windows }),
        snap: null,
        workspace: { bounds },
    };
}
