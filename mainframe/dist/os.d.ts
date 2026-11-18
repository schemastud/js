import * as react from 'react';
import { CSSProperties, ReactNode } from 'react';
import { h as MainframeInjection, g as MainframeContext, b as CustomSlotSpec, e as Mainframe, m as MainframeRegistry } from './react-CTy_VUZ4.js';
import { RemoteSurfaceProps } from '@schemastud/frame-remote/host';

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
type Bounds = {
    width: number;
    height: number;
};
/** An absolute window rectangle in desktop coordinates. */
type Geometry = {
    x: number;
    y: number;
    width: number;
    height: number;
};
/** The snap targets: screen halves, quadrants, and full-screen. */
type SnapZone = 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'maximized';
/** A dock edge — the window pins to a fixed strip along one screen edge. */
type DockEdge = 'left' | 'right' | 'top' | 'bottom';
/**
 * The z-order bucket a window sits in. `floor` windows always stack below `normal`, `top` always
 * above — focus raises a window only within its own bucket, so a pinned floor (e.g. a desktop
 * backdrop) or a pinned top (e.g. a persistent HUD) keeps its band. Default `normal`.
 */
type ZAnchor = 'floor' | 'normal' | 'top';
/**
 * A window's presentation role (the "site sits inside the OS" model):
 * - `stage` — the PRIMARY surface. It fills the desktop as the backdrop (floor-anchored,
 *   viewport-sized, non-draggable), and the OS chrome wraps it — the current site/realm feels like
 *   it's just running inside the OS. **At most one window is the stage at a time.**
 * - `float` — a normal floating window that sits ON TOP of the stage (the default).
 * A floating window can be promoted with the `stage` op ("send to stage"), which demotes the prior
 * stage back to a float. Promoting is a form of "take over as the main thing".
 */
type Presentation = 'stage' | 'float';
/** Role metadata the implementation sets on a window; the reducer honors it, never invents it. */
type WindowRole = {
    /** A persistent window is never removed by `close` (the op is a no-op). Default false. */
    persistent?: boolean;
    /** A non-closable window ignores `close` (the op is a no-op). Default true (closable). */
    closable?: boolean;
    /** Which z-order band this window lives in. Default `normal`. */
    zAnchor?: ZAnchor;
};
/** One managed window: its geometry, lifecycle flags, snap state, and role. */
type ManagedWindow = {
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
type WindowManagerState = {
    windows: Record<string, ManagedWindow>;
    zOrder: string[];
    focused: string | null;
    snap: SnapZone | null;
    workspace: {
        bounds: Bounds;
    };
};
/** The op set (ticket 03): `open close focus move resize minimize maximize restore snap tile dock`. */
type WindowManagerAction = {
    type: 'open';
    key: string;
    geometry?: Partial<Geometry>;
    role?: WindowRole;
    presentation?: Presentation;
} | {
    type: 'close';
    key: string;
} | {
    type: 'focus';
    key: string;
} | {
    type: 'stage';
    key: string;
} | {
    type: 'unstage';
    key: string;
} | {
    type: 'move';
    key: string;
    x: number;
    y: number;
} | {
    type: 'resize';
    key: string;
    width: number;
    height: number;
    x?: number;
    y?: number;
} | {
    type: 'minimize';
    key: string;
} | {
    type: 'maximize';
    key: string;
} | {
    type: 'restore';
    key: string;
} | {
    type: 'snap';
    key: string;
    zone: SnapZone;
} | {
    type: 'tile';
    keys?: string[];
} | {
    type: 'dock';
    key: string;
    edge: DockEdge;
    size?: number;
} | {
    type: 'bounds';
    bounds: Bounds;
} | {
    type: 'snapPreview';
    zone: SnapZone | null;
};
declare const DEFAULT_BOUNDS: Bounds;
declare const initialWindowManagerState: WindowManagerState;
/** The absolute rect for a snap zone within `bounds`. */
declare function snapRect(zone: SnapZone, bounds: Bounds): Geometry;
declare function windowManagerReducer(state: WindowManagerState, action: WindowManagerAction): WindowManagerState;
/** A near-square grid of `count` rects filling `bounds`, row-major. */
declare function tileRects(count: number, bounds: Bounds): Geometry[];
/** Open (non-minimized) windows, back-to-front (zOrder order), each carrying its full record. */
declare function visibleWindows(state: WindowManagerState): ManagedWindow[];
/** True when a window for `key` exists (open or minimized). */
declare function isTaskOpen(state: WindowManagerState, key: string): boolean;
/** The paint z-index for a window key (its index in zOrder; higher = nearer front). */
declare function zIndexOf(state: WindowManagerState, key: string): number;
/** The current stage (primary backdrop) window key, or null if the desktop is pure-floating. */
declare function stageKey(state: WindowManagerState): string | null;
/** Open (non-minimized) FLOATING windows (excludes the stage), back-to-front. */
declare function floatingWindows(state: WindowManagerState): ManagedWindow[];
/** The serialized per-window record — open set + geometry + min/max + snap + role, per ticket 03. */
type PersistedWindow = {
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
type PersistedWorkspace = {
    version: 1;
    windows: PersistedWindow[];
    zOrder: string[];
    focused: string | null;
};
declare const WORKSPACE_VERSION: 1;
/**
 * Serialize the durable slice of the state for per-user persistence (bounds are viewport-derived).
 * The STAGE window is EXCLUDED: the stage is route-ephemeral (the host re-establishes it from the
 * current route on every mount), so persisting it would let a stale stage haunt a different route.
 * Only FLOATS persist across reloads/navigations.
 */
declare function serializeWorkspace(state: WindowManagerState): PersistedWorkspace;
/**
 * Rebuild a full state from a persisted workspace against the current viewport bounds. Unknown /
 * versionless input restores to the initial state (degrade-not-throw). Maximized/snapped windows are
 * re-projected to the given bounds so a restored layout fits the current viewport.
 */
declare function deserializeWorkspace(persisted: PersistedWorkspace | null | undefined, bounds?: Bounds): WindowManagerState;

interface WindowManager {
    state: WindowManagerState;
    open: (key: string, opts?: {
        geometry?: Partial<Geometry>;
        role?: WindowRole;
        presentation?: Presentation;
    }) => void;
    close: (key: string) => void;
    focus: (key: string) => void;
    /** Promote a window to the stage (the primary backdrop); demotes the prior stage to a float. */
    stage: (key: string) => void;
    /** Demote a window from the stage back to a floating window. */
    unstage: (key: string) => void;
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
interface UseWindowManagerOptions {
    /** A previously-persisted workspace to seed from (per-user restore). */
    persisted?: PersistedWorkspace | null;
    /** The initial desktop bounds. */
    bounds?: Bounds;
}
declare function useWindowManager(options?: UseWindowManagerOptions): WindowManager;

interface WindowFrameProps {
    /** The window's current rectangle (from the reducer). */
    geometry: Geometry;
    /** Paint z-index (from `zIndexOf`). Higher is nearer the front. */
    zIndex: number;
    /** Drag handle selector — only elements with this class initiate a drag (the title bar). */
    dragHandleClassName?: string;
    /** Constrain dragging/resizing to the parent element. Default `'parent'`. */
    bounds?: string | false;
    /** Minimum size guards passed to react-rnd. */
    minWidth?: number;
    minHeight?: number;
    /** Disable interaction (e.g. a maximized/snapped window that should not drag). */
    disableDragging?: boolean;
    enableResizing?: boolean;
    className?: string;
    style?: CSSProperties;
    /** Geometry callbacks — dispatch straight into the reducer's `move`/`resize`/`focus` ops. */
    onMove: (x: number, y: number) => void;
    onResize: (width: number, height: number, x: number, y: number) => void;
    onFocus: () => void;
    /** The window body — the nested Mainframe scope + its chrome (ticket 04). */
    children: ReactNode;
}
declare function WindowFrame({ geometry, zIndex, dragHandleClassName, bounds, minWidth, minHeight, disableDragging, enableResizing, className, style, onMove, onResize, onFocus, children, }: WindowFrameProps): react.JSX.Element;

/**
 * `WindowHost` — the window FILL MODE union (Frame OS ticket 16, ADR-0012 §B1 + ADR-0013).
 *
 * A `WindowHost` says HOW a window's body is filled. It is a discriminated union over three
 * fill modes, and the surface's TRUST TIER selects which one a descriptor carries:
 *
 *   - `nested`  — the TRUSTED DEFAULT (ticket 04). The window body mounts a nested
 *                 `<MainframeProvider><MainframeOutlet/></MainframeProvider>` scope that renders
 *                 the real first-party realm surface, in-process, with full DOM + first-party
 *                 cookie access. This is the shape every ticket-04/05 window already uses.
 *
 *   - `remote`  — UNTRUSTED / FOREIGN / METERED (ticket 16). The window body renders a
 *                 `@schemastud/frame-remote` `RemoteSurface`: an ISOLATED QuickJS-WASM guest whose
 *                 serialized mutation stream is reconciled into a host-owned allowlisted component
 *                 vocabulary. The guest NEVER touches the DOM or first-party cookies — only
 *                 element *names* + serialized props cross the wire. What the isolated surface may
 *                 REACH is gated by a `capabilityToken` MINTED SERVER-SIDE by the entitlement spine
 *                 (ticket 08's CapabilityRegistry / the metered plane). This JS layer CONSUMES the
 *                 token as an opaque string and threads it to the frame-remote host — it never mints,
 *                 inspects, or authorizes it. Isolation is CONSUMED, never re-implemented here.
 *
 *   - `iframe`  — DESCRIPTOR-ONLY, NO CODE PATH SHIPPED (ADR-0012 §B1). A window may DECLARE
 *                 `kind: 'iframe'` in its descriptor so the trust-tier→fill-mode vocabulary is
 *                 complete, but the renderer explicitly does-not-handle it and throws a clear
 *                 "not shipped" error. This is a deliberate hole: the third fill mode is a
 *                 future seam, not a built one.
 *
 * Back-compat: `OsWindowSpec` keeps its flat `mode`/`injection`/`ctx` fields as the `nested`
 * default (no `host` on a spec ⇒ nested), so every existing window and every ticket-04/05 test
 * stays byte-for-byte green. A spec opts into a foreign fill mode by setting `host`.
 */

/** The trust tier a surface is assigned — this selects the fill mode a descriptor carries. */
type WindowTrustTier = 'trusted' | 'untrusted' | 'metered';
/**
 * `nested` — the trusted-default fill mode: an in-process nested Mainframe scope rendering the
 * real realm surface. Carries the same `mode`/`injection`/`ctx` the flat `OsWindowSpec` always did.
 */
interface NestedWindowHost {
    readonly kind: 'nested';
    /** The inner Mainframe mode this window renders (e.g. a realm/`domain` mode). */
    readonly mode: string;
    /** The inner scope's injection — its own slot + mainframe registries and `can`. */
    readonly injection: MainframeInjection;
    /** Extra context threaded to the inner outlet (payload, theme, …). */
    readonly ctx?: Omit<MainframeContext, 'mode'>;
}
/**
 * `remote` — the untrusted/foreign/metered fill mode: an ISOLATED `frame-remote` surface.
 *
 * The descriptor carries the opaque, server-minted `capabilityToken` (what the guest may reach)
 * plus a `mount` factory the HOST supplies. `mount` is where the host boots the QuickJS-WASM VM
 * and builds the `HostReceiver` for the frame-remote `RemoteSurface`, brokering every capability
 * the guest requests against `capabilityToken` — that VM boot + metered brokering is host- /
 * entitlement-spine business; this JS layer only ROUTES to it and threads the token. `mount`
 * returns everything `RemoteSurface` needs (`host` + optional `vocabulary`); the token is passed
 * to `mount` so the host can bind it into the receiver's broker.
 */
interface RemoteWindowHost {
    readonly kind: 'remote';
    /**
     * The opaque capability token minted SERVER-SIDE by the entitlement spine (ticket 08). This
     * layer treats it as an opaque string, threads it to `mount`, and never mints/inspects it.
     */
    readonly capabilityToken: string;
    /**
     * Host factory that boots the isolated guest and yields the `RemoteSurface` props (the
     * `HostReceiver` + optional allowlisted vocabulary). Given the capability token so the host
     * binds it into the receiver's capability broker. Kept as a factory so this package never
     * imports the VM boot / metered plane — it only calls the seam the host provides.
     */
    readonly mount: (capabilityToken: string) => RemoteSurfaceProps;
}
/**
 * `iframe` — DESCRIPTOR-ONLY. Expressible so the fill-mode vocabulary is complete, but the
 * renderer throws {@link IframeFillModeNotShippedError}. No code path ships (ADR-0012 §B1).
 */
interface IframeWindowHost {
    readonly kind: 'iframe';
    /** The foreign document URL a future iframe fill mode would frame. Carried, never rendered. */
    readonly src: string;
}
/** The window fill-mode union. `nested` trusted-default / `remote` untrusted-or-metered / `iframe` descriptor-only. */
type WindowHost = NestedWindowHost | RemoteWindowHost | IframeWindowHost;
/** Thrown when a window descriptor selects the `iframe` fill mode — deliberately unbuilt. */
declare class IframeFillModeNotShippedError extends Error {
    constructor(windowKey?: string);
}
/** True when a host fills its window with an isolated `frame-remote` surface. */
declare function isRemoteHost(host: WindowHost): host is RemoteWindowHost;
/**
 * Map a surface's trust tier to the fill mode it should carry: `trusted` → `nested` (the
 * in-process default), `untrusted`/`metered` → `remote` (the isolated frame-remote surface).
 * `iframe` is never AUTO-selected — it is an explicit descriptor-only opt-in — so this map has
 * no tier that resolves to it. A host that wants a foreign iframe declares `kind:'iframe'` by hand.
 */
declare function fillModeForTier(tier: WindowTrustTier): 'nested' | 'remote';

/** The two genuinely-new `os`-mode regions (the ONLY additions beyond the frozen core/optional set). */
declare const OS_WINDOW_SLOTS: readonly CustomSlotSpec[];
/** The drag-handle class the window title bar carries so react-rnd only drags from the title bar. */
declare const OS_WINDOW_DRAG_HANDLE = "os-window-titlebar";
/**
 * One launchable app / open-able window. The host builds this roster (ticket 06 from the real realm
 * manifest; ticket 04 statically) and threads it via `ctx.os.apps`. `injection` is the window's inner
 * Mainframe scope (its own registries + `can`) and `mode` the inner mode it renders in — the recursion.
 */
interface OsWindowSpec {
    key: string;
    title: string;
    /**
     * The window FILL MODE (Frame OS ticket 16). Optional for back-compat: when omitted, the flat
     * `mode`/`injection`/`ctx` fields below ARE the `nested` (trusted-default) host — every existing
     * window and ticket-04/05 test keeps working unchanged. Set `host` to opt into a foreign fill
     * mode: `remote` (an isolated `frame-remote` surface for untrusted/metered surfaces) or `iframe`
     * (descriptor-only, unbuilt — the renderer throws). See `windowHost.ts`.
     */
    host?: WindowHost;
    /** The inner Mainframe mode this window renders (e.g. a realm/`domain` mode). Nested-default fill. */
    mode?: string;
    /** The inner scope's injection — its own slot + mainframe registries and `can`. Nested-default fill. */
    injection?: MainframeInjection;
    /** Extra context threaded to the inner outlet (payload, theme, …). Nested-default fill. */
    ctx?: Omit<MainframeContext, 'mode'>;
    /** Window role policy honored by the reducer (persistent/closable/zAnchor). */
    role?: WindowRole;
    /** Optional initial geometry override. */
    geometry?: {
        x?: number;
        y?: number;
        width?: number;
        height?: number;
    };
    /**
     * OS-native tool windows (settings/launcher/inspector) opt INTO the chrome `--shell-*` theme by
     * setting this; everything else isolates by construction (its realm surface self-themes). Style
     * isolation ticket 05 (ADR-0012 §C).
     */
    inheritsShellTheme?: boolean;
}
/** The host-threaded `os`-mode context (read off `MainframeContext.os`). */
interface OsHostContext {
    /** The app roster — every launchable app / open-able window. */
    apps: OsWindowSpec[];
    /**
     * The app key to open as the STAGE — the primary backdrop the OS wraps (typically the current
     * route's realm, so a full-page navigation just re-primaries). At most one.
     */
    initialStage?: string;
    /** Keys to open as floating windows on first mount. */
    initialOpen?: string[];
    /** A persisted per-user workspace to restore. */
    persisted?: PersistedWorkspace | null;
    /** The desktop viewport bounds (snap/tile/maximize frame). */
    bounds?: Bounds;
}
/** What the `os` mode exposes to its slot children (dock/launcher/menu contributions). */
interface OsContextValue {
    /** The live window manager (open/close/focus/snap/… + state). */
    wm: WindowManager;
    /** The app roster. */
    apps: OsWindowSpec[];
    /** Open (or focus, if already open) the window for an app key. */
    openApp: (key: string) => void;
    /** Open an app directly ONTO the stage (the primary backdrop) — e.g. the current route's realm. */
    stageApp: (key: string) => void;
}
/** Read the `os` context — for dock/launcher/menu slot contributions to drive the window manager. */
declare function useOs(): OsContextValue;
/**
 * The `os` Mainframe. Places the remapped core slots into the desktop layout and hosts the window
 * layer. Dock/launcher are rendered inside the desktop's OsContext (so their contributions can drive
 * the window manager); the menu bar / status / start-corner are outer chrome.
 */
declare const OsMainframe: Mainframe;
/**
 * Register the `os` mode into a Mainframe registry, declaring its two custom slots. Idempotent-ish:
 * re-registering replaces the mode (registry `register` is last-wins). Override of contributions stays
 * key-based on the slot registry (`{slot,key,node}` replace / `{slot,key,node:null}` suppress) — this
 * helper adds no new override machinery.
 */
declare function registerOsMode(registry: MainframeRegistry): void;

/** Opaque upsell copy for a soft-locked app — the host/beam layer supplies the strings. */
interface DesktopUpsell {
    title?: string;
    cta?: string;
    [k: string]: unknown;
}
/**
 * One launchable desktop app. This is the OS-window spec ({@link OsWindowSpec}) PLUS the flat chrome
 * fields the dock/launcher read. Realm-agnostic by construction: no manifest/entitlement type appears.
 */
type DesktopApp = OsWindowSpec & {
    /** Display realm kicker (e.g. `SITE`) — a plain string, NOT a beam realm type. */
    realm?: string;
    /** Opaque route/href the host navigates to on a dock realm-switch (via `onNavigate`). */
    route?: string;
    /** Dock/launcher tile accent color. */
    accent?: string;
    /** Launcher tile subtitle. */
    subtitle?: string;
    /** Soft-gated: renders a locked tile that opens the upsell instead of the window. */
    locked?: boolean;
    /** Opaque upsell copy for a locked tile. */
    upsell?: DesktopUpsell | null;
    /** Optional glyph node for the dock/launcher tile (else a colored square keyed by `accent`). */
    icon?: ReactNode;
};
/** A live wall-clock for the menu-bar status. */
declare function Clock(): react.JSX.Element;
/** Shown when a locked app's tile is clicked. Never opens the window; surfaces the upsell copy + CTA. */
declare function UpsellPopover({ app, onClose }: {
    app: DesktopApp;
    onClose: () => void;
}): react.JSX.Element;
/** The launcher popover — a grid of apps; a locked app routes to the upsell, an unlocked one opens. */
declare function Launcher({ apps, heading, onClose, onUpsell, }: {
    apps: DesktopApp[];
    heading?: string;
    onClose: () => void;
    onUpsell: (app: DesktopApp) => void;
}): react.JSX.Element;
/**
 * The dock: the realm SWITCHER. An unlocked tile NAVIGATES (via the injected `onNavigate` — the host
 * owns routing), a locked one opens the upsell; the launcher trigger opens the start-menu. `activeKey`
 * highlights the current surface's tile (the host computes it — from its router — and passes it).
 */
declare function Dock({ apps, activeKey, launchLabel, launcherHeading, onNavigate, }: {
    apps: DesktopApp[];
    activeKey?: string;
    launchLabel?: string;
    launcherHeading?: string;
    onNavigate: (app: DesktopApp) => void;
}): react.JSX.Element;
/**
 * Renders nothing; contributed to `overlay` so it lives inside the DesktopLayer's OsContext and can
 * observe `wm.state`. On every change it writes the serialized workspace back through the injected
 * `persist` callback (the host owns WHERE the snapshot lives — localStorage, a server, …).
 */
declare function WorkspacePersistence({ persist }: {
    persist: (workspace: PersistedWorkspace) => void;
}): null;
/** Host-supplied chrome contributions (all realm-agnostic nodes/callbacks). */
interface DesktopChromeConfig {
    /** The launchable app roster. */
    apps: DesktopApp[];
    /** Menu-bar start-corner brand node (wordmark/mark). */
    brand?: ReactNode;
    /** Menu-bar right-side status node (realm pill, meters, clock — host composes). */
    status?: ReactNode;
    /** Desktop backdrop node (wallpaper/watermark/hint), rendered behind the window layer. */
    backdrop?: ReactNode;
    /** System-bus status-line node. */
    statusLine?: ReactNode;
    /** The current surface's app key, to highlight the dock tile. */
    activeKey?: string;
    /** Dock launch-trigger label. */
    launchLabel?: string;
    /** Launcher grid heading. */
    launcherHeading?: string;
    /** Dock realm-switch navigation (host owns routing). */
    onNavigate: (app: DesktopApp) => void;
    /** Persist the serialized workspace (host owns storage). Omit to skip persistence. */
    persist?: (workspace: PersistedWorkspace) => void;
}
/**
 * Build the OUTER `os` Mainframe injection — the desktop chrome contributions (brand, status, backdrop,
 * dock, launcher, workspace persistence, system bus) over the `os` window manager. Realm-agnostic: it
 * reads only the generic {@link DesktopChromeConfig}. The host wraps this with `<MainframeProvider
 * injection><MainframeOutlet mode="os" ctx={{ os: … }}/></MainframeProvider>`.
 */
declare function buildDesktopChrome(config: DesktopChromeConfig): MainframeInjection;
/** One resolvable overlay window: its title-bar chrome + body. The host resolves a key → this. */
interface OverlayWindow {
    title: string;
    accent: string;
    render: () => ReactNode;
}
/** The overlay render props: the WM is threaded in so the host's start-menu can drive it. */
interface OperatorOverlayProps {
    /**
     * The stable taskbar key order (the host owns which windows exist + their order). A static array of
     * fixed keys, OR a function of the live WM state (so the host can APPEND dynamic window keys — e.g.
     * per-page inspector windows keyed at open time — in a stable order that a focus never reshuffles).
     */
    stableKeys: string[] | ((wm: WindowManager) => string[]);
    /**
     * Resolve a window key → its chrome + body (a tool, a per-page inspector, …). The live WM is passed
     * so the body can drive it (e.g. an "edit content" affordance that minimizes its own window).
     */
    resolveWindow: (key: string, wm: WindowManager) => OverlayWindow | null;
    /**
     * Render the start-menu launcher. Receives the live WM (to open tools / inspect open keys) and an
     * `onClose`. The host owns the menu CONTENTS (tool roster, edit-page, sign-out) — all realm-aware.
     */
    renderLauncher: (args: {
        wm: WindowManager;
        onClose: () => void;
    }) => ReactNode;
    /** The launcher trigger (orb) label. */
    orbLabel?: string;
    /** Optional glyph node for the orb (else the plain `.mark` square) — same seam as {@link DesktopApp.icon}. */
    orbIcon?: ReactNode;
    /**
     * Invoked with the WM once, so the host can subscribe to it (e.g. suppress in-window GET
     * navigations). Optional. Returns a cleanup.
     */
    onWindowManager?: (wm: WindowManager) => void | (() => void);
    /** A capture handler armed on each window body click (host uses it to suppress the next nav). */
    onWindowBodyClickCapture?: () => void;
}
/**
 * The operator overlay: the generic geometry of the meta-editor layer. `pointer-events:none` on the
 * root (live page underneath stays interactive), `auto` on the chrome; float windows drag/resize/focus
 * through the shared OS window manager, a taskbar surfaces open windows, and a start-menu orb toggles
 * the host-rendered launcher. The bounds are synced to the overlay viewport so geometry clamps.
 */
declare function OperatorOverlay({ stableKeys, resolveWindow, renderLauncher, orbLabel, orbIcon, onWindowManager, onWindowBodyClickCapture, }: OperatorOverlayProps): react.JSX.Element;

export { type Bounds, Clock, DEFAULT_BOUNDS, type DesktopApp, type DesktopChromeConfig, type DesktopUpsell, Dock, type DockEdge, type Geometry, IframeFillModeNotShippedError, type IframeWindowHost, Launcher, type ManagedWindow, type NestedWindowHost, OS_WINDOW_DRAG_HANDLE, OS_WINDOW_SLOTS, OperatorOverlay, type OperatorOverlayProps, type OsContextValue, type OsHostContext, OsMainframe, type OsWindowSpec, type OverlayWindow, type PersistedWindow, type PersistedWorkspace, type Presentation, type RemoteWindowHost, type SnapZone, UpsellPopover, type UseWindowManagerOptions, WORKSPACE_VERSION, WindowFrame, type WindowFrameProps, type WindowHost, type WindowManager, type WindowManagerAction, type WindowManagerState, type WindowRole, type WindowTrustTier, WorkspacePersistence, type ZAnchor, buildDesktopChrome, deserializeWorkspace, fillModeForTier, floatingWindows, initialWindowManagerState, isRemoteHost, isTaskOpen, registerOsMode, serializeWorkspace, snapRect, stageKey, tileRects, useOs, useWindowManager, visibleWindows, windowManagerReducer, zIndexOf };
