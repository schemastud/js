/**
 * `useWindowManager` — the React binding over the pure {@link windowManagerReducer} (Frame OS ticket
 * 03). Stable callbacks for every op, plus optional per-user workspace persistence: seed the initial
 * state from a persisted snapshot, and read `serialize()` to write one back on change.
 *
 * This module imports React but NOT react-rnd — geometry stays in `WindowFrame` alone.
 */
import { useCallback, useMemo, useReducer } from 'react';

import {
    type Bounds,
    type DockEdge,
    type Geometry,
    type PersistedWorkspace,
    type SnapZone,
    type WindowManagerState,
    type WindowRole,
    deserializeWorkspace,
    initialWindowManagerState,
    serializeWorkspace,
    windowManagerReducer,
} from './windowManager';

export interface WindowManager {
    state: WindowManagerState;
    open: (key: string, opts?: { geometry?: Partial<Geometry>; role?: WindowRole }) => void;
    close: (key: string) => void;
    focus: (key: string) => void;
    move: (key: string, x: number, y: number) => void;
    resize: (key: string, width: number, height: number, x?: number, y?: number) => void;
    minimize: (key: string) => void;
    maximize: (key: string) => void;
    restore: (key: string) => void;
    snap: (key: string, zone: SnapZone) => void;
    tile: (keys?: string[]) => void;
    dock: (key: string, edge: DockEdge, size?: number) => void;
    /** Update the desktop viewport bounds (re-projects maximized/snapped windows). */
    setBounds: (bounds: Bounds) => void;
    /** Set/clear the transient snap-preview zone a drag-to-snap UI shows. */
    snapPreview: (zone: SnapZone | null) => void;
    /** The durable slice for persistence — write this to per-user storage on change. */
    serialize: () => PersistedWorkspace;
}

export interface UseWindowManagerOptions {
    /** A previously-persisted workspace to seed from (per-user restore). */
    persisted?: PersistedWorkspace | null;
    /** The initial desktop bounds. */
    bounds?: Bounds;
}

export function useWindowManager(options: UseWindowManagerOptions = {}): WindowManager {
    const { persisted, bounds } = options;
    const initial = useMemo<WindowManagerState>(
        () => (persisted ? deserializeWorkspace(persisted, bounds) : { ...initialWindowManagerState, workspace: { bounds: bounds ?? initialWindowManagerState.workspace.bounds } }),
        // Seed once; subsequent persistence is written out via serialize(), not re-seeded.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );
    const [state, dispatch] = useReducer(windowManagerReducer, initial);

    const open = useCallback<WindowManager['open']>((key, opts) => dispatch({ type: 'open', key, geometry: opts?.geometry, role: opts?.role }), []);
    const close = useCallback((key: string) => dispatch({ type: 'close', key }), []);
    const focus = useCallback((key: string) => dispatch({ type: 'focus', key }), []);
    const move = useCallback((key: string, x: number, y: number) => dispatch({ type: 'move', key, x, y }), []);
    const resize = useCallback<WindowManager['resize']>((key, width, height, x, y) => dispatch({ type: 'resize', key, width, height, x, y }), []);
    const minimize = useCallback((key: string) => dispatch({ type: 'minimize', key }), []);
    const maximize = useCallback((key: string) => dispatch({ type: 'maximize', key }), []);
    const restore = useCallback((key: string) => dispatch({ type: 'restore', key }), []);
    const snap = useCallback((key: string, zone: SnapZone) => dispatch({ type: 'snap', key, zone }), []);
    const tile = useCallback((keys?: string[]) => dispatch({ type: 'tile', keys }), []);
    const dock = useCallback<WindowManager['dock']>((key, edge, size) => dispatch({ type: 'dock', key, edge, size }), []);
    const setBounds = useCallback((b: Bounds) => dispatch({ type: 'bounds', bounds: b }), []);
    const snapPreview = useCallback((zone: SnapZone | null) => dispatch({ type: 'snapPreview', zone }), []);
    const serialize = useCallback(() => serializeWorkspace(state), [state]);

    return { state, open, close, focus, move, resize, minimize, maximize, restore, snap, tile, dock, setBounds, snapPreview, serialize };
}
