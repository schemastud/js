/**
 * `@schemastud/mainframe/os` — the Frame OS desktop layer (window manager + geometry seam).
 *
 * Kept a separate entry from the package root so a host that only uses the generic Mainframe engine
 * never pulls `react-rnd` (imported solely by `WindowFrame`). The `os` Mainframe MODE (ticket 04)
 * builds on top of this.
 */

// The pure, framework-neutral reducer + its selectors, geometry helpers, and workspace dialect.
export {
    type Bounds,
    type Geometry,
    type SnapZone,
    type DockEdge,
    type ZAnchor,
    type WindowRole,
    type ManagedWindow,
    type WindowManagerState,
    type WindowManagerAction,
    type PersistedWindow,
    type PersistedWorkspace,
    DEFAULT_BOUNDS,
    WORKSPACE_VERSION,
    initialWindowManagerState,
    windowManagerReducer,
    snapRect,
    tileRects,
    visibleWindows,
    isTaskOpen,
    zIndexOf,
    serializeWorkspace,
    deserializeWorkspace,
} from './windowManager';

// The React binding hook (imports React, not react-rnd).
export { useWindowManager, type WindowManager, type UseWindowManagerOptions } from './useWindowManager';

// The geometry seam — the ONE react-rnd import site.
export { WindowFrame, type WindowFrameProps } from './WindowFrame';

// The `os` Mainframe mode (empty structure): the desktop layout + window layer + the two custom slots.
export {
    OsMainframe,
    registerOsMode,
    useOs,
    OS_WINDOW_SLOTS,
    OS_WINDOW_DRAG_HANDLE,
    type OsWindowSpec,
    type OsHostContext,
    type OsContextValue,
} from './OsMainframe';

// The window FILL-MODE union (Frame OS ticket 16): nested (trusted-default) / remote (isolated
// frame-remote, untrusted/metered) / iframe (descriptor-only, unbuilt).
export {
    type WindowHost,
    type NestedWindowHost,
    type RemoteWindowHost,
    type IframeWindowHost,
    type WindowTrustTier,
    IframeFillModeNotShippedError,
    isRemoteHost,
    fillModeForTier,
} from './windowHost';
