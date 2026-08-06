/**
 * The `os` Mainframe mode — pure empty structure (Frame OS ticket 04, ADR-0012 §A).
 *
 * A Mainframe (a `({ slots, ctx }) => ReactNode` placement component) registered under the mode `os`
 * over the ONE unified slot registry — NOT a layer above it. It reuses the frozen `CORE_SLOTS`,
 * **remapped** into a desktop layout, and adds exactly two genuinely-new regions as `os`-mode custom
 * slots (`window.chrome`, `window.toolbar`). Mounted with an empty registry and no open windows it
 * renders an **honestly empty neutral desktop** with zero default chrome — Frame OS proper only appears
 * once beam + beam-ux feed the manifest + contributions.
 *
 * Core-slot remap (the mode owns placement; the vocabulary is unchanged):
 *   brand        → the system / start corner
 *   topBar.lead  → the menu bar (lead)
 *   topBar.actions → the menu bar (actions, ordered)
 *   rail         → the dock
 *   main         → the desktop (a render-prop hosting the window layer + the ticket-03 window manager)
 *   overlay      → the launcher popover + modals
 *   status       → the system bus
 *
 * Recursion: each open window mounts its OWN nested `<MainframeProvider>` + `<MainframeOutlet>` in the
 * window's natural mode, so the outer `os` registry owns desktop chrome while each window's inner scope
 * renders the REAL realm surface (and owns its window chrome via the `window.chrome`/`window.toolbar`
 * slots resolved inside that scope). This is what makes "the window IS the real surface" literally true.
 *
 * Styling is structural only (class names `os-*`); no palette ships here — the `--shell-*` token
 * contract is ticket 05.
 */
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { RemoteSurface } from '@schemastud/frame-remote/host';

import type { CustomSlotSpec, Mainframe, MainframeContext, MainframeRegistry } from '../mainframe-registry';
import { MainframeProvider, MainframeOutlet, useResolvedSlots, type MainframeInjection } from '../react';
import { WindowFrame } from './WindowFrame';
import { useWindowManager, type WindowManager } from './useWindowManager';
import { type PersistedWorkspace, type Bounds, type WindowRole, visibleWindows, zIndexOf } from './windowManager';
import {
    type WindowHost,
    type NestedWindowHost,
    IframeFillModeNotShippedError,
} from './windowHost';

/** The two genuinely-new `os`-mode regions (the ONLY additions beyond the frozen core/optional set). */
export const OS_WINDOW_SLOTS: readonly CustomSlotSpec[] = [
    { name: 'window.chrome', fillType: 'ordered-multi-source', zones: ['start', 'end'] },
    { name: 'window.toolbar', fillType: 'ordered-multi-source', zones: ['start', 'end'] },
];

/** The drag-handle class the window title bar carries so react-rnd only drags from the title bar. */
export const OS_WINDOW_DRAG_HANDLE = 'os-window-titlebar';

/**
 * One launchable app / open-able window. The host builds this roster (ticket 06 from the real realm
 * manifest; ticket 04 statically) and threads it via `ctx.os.apps`. `injection` is the window's inner
 * Mainframe scope (its own registries + `can`) and `mode` the inner mode it renders in — the recursion.
 */
export interface OsWindowSpec {
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
    geometry?: { x?: number; y?: number; width?: number; height?: number };
    /**
     * OS-native tool windows (settings/launcher/inspector) opt INTO the chrome `--shell-*` theme by
     * setting this; everything else isolates by construction (its realm surface self-themes). Style
     * isolation ticket 05 (ADR-0012 §C).
     */
    inheritsShellTheme?: boolean;
}

/** The host-threaded `os`-mode context (read off `MainframeContext.os`). */
export interface OsHostContext {
    /** The app roster — every launchable app / open-able window. */
    apps: OsWindowSpec[];
    /** Keys to open on first mount (e.g. a maximized primary surface). */
    initialOpen?: string[];
    /** A persisted per-user workspace to restore. */
    persisted?: PersistedWorkspace | null;
    /** The desktop viewport bounds (snap/tile/maximize frame). */
    bounds?: Bounds;
}

/** What the `os` mode exposes to its slot children (dock/launcher/menu contributions). */
export interface OsContextValue {
    /** The live window manager (open/close/focus/snap/… + state). */
    wm: WindowManager;
    /** The app roster. */
    apps: OsWindowSpec[];
    /** Open (or focus, if already open) the window for an app key. */
    openApp: (key: string) => void;
}

const OsCtx = createContext<OsContextValue | null>(null);

/** Read the `os` context — for dock/launcher/menu slot contributions to drive the window manager. */
export function useOs(): OsContextValue {
    const ctx = useContext(OsCtx);
    if (!ctx) throw new Error('useOs must be used within the `os` Mainframe mode.');
    return ctx;
}

/** Read the `os` host context off the Mainframe ctx (safe default when a host threads none). */
function osHostContext(ctx: MainframeContext): OsHostContext {
    const os = (ctx as { os?: OsHostContext }).os;
    return { apps: os?.apps ?? [], initialOpen: os?.initialOpen, persisted: os?.persisted, bounds: os?.bounds };
}

/**
 * Resolve a spec into its concrete {@link WindowHost}. An explicit `spec.host` wins; otherwise the
 * flat `mode`/`injection`/`ctx` fields are the `nested` (trusted-default) host — the back-compat path
 * every ticket-04/05 window uses. A spec with neither an explicit host nor a `mode`/`injection` is a
 * programming error (a window with no way to fill its body).
 */
function resolveWindowHost(spec: OsWindowSpec): WindowHost {
    if (spec.host) return spec.host;
    if (spec.mode == null || spec.injection == null) {
        throw new Error(
            `OsWindowSpec "${spec.key}" has no fill mode: set \`host\`, or the flat \`mode\`+\`injection\` (nested default).`,
        );
    }
    return { kind: 'nested', mode: spec.mode, injection: spec.injection, ctx: spec.ctx };
}

/**
 * The window title bar controls (minimize/maximize/close) driving the shared window manager, plus
 * optional `window.chrome`/`window.toolbar` slot content. For a `nested` window the slot content is
 * resolved INSIDE the window's own nested scope (the recursion contract) and passed in as
 * `chromeStart`/`toolbar`/`chromeEnd`; a `remote`/`iframe` window has no nested slot scope, so it
 * passes no slot content — its title bar carries only the title + the default controls.
 */
function WindowChrome({
    spec,
    focused,
    chromeStart,
    toolbar,
    chromeEnd,
}: {
    spec: OsWindowSpec;
    focused: boolean;
    chromeStart?: ReactNode;
    toolbar?: ReactNode;
    chromeEnd?: ReactNode;
}) {
    const { wm } = useOs();
    const win = wm.state.windows[spec.key];
    return (
        <div className={`os-window-titlebar${focused ? ' is-focused' : ''}`} data-window={spec.key}>
            <div className="os-window-chrome-start">
                {chromeStart}
                <span className="os-window-title">{spec.title}</span>
            </div>
            <div className="os-window-toolbar">{toolbar}</div>
            <div className="os-window-controls os-window-chrome-end">
                {chromeEnd}
                <button type="button" className="os-window-btn" aria-label="Minimize" onClick={() => wm.minimize(spec.key)}>–</button>
                <button
                    type="button"
                    className="os-window-btn"
                    aria-label={win?.maximized ? 'Restore' : 'Maximize'}
                    onClick={() => (win?.maximized ? wm.restore(spec.key) : wm.maximize(spec.key))}
                >▢</button>
                {spec.role?.closable === false || spec.role?.persistent ? null : (
                    <button type="button" className="os-window-btn" aria-label="Close" onClick={() => wm.close(spec.key)}>✕</button>
                )}
            </div>
        </div>
    );
}

/**
 * The window's content-scope wrapper (ticket 05): a bare isolation boundary re-rooting the content
 * token contract, so a realm surface self-themes (WYSIWYG). An OS-native tool opts into the chrome
 * theme via `inheritsShellTheme`. Shared by BOTH fill modes so a `nested` and a `remote` window sit
 * in an equal window peer with the same chrome/geometry/content scope.
 */
function WindowContentScope({ spec, children }: { spec: OsWindowSpec; children: ReactNode }) {
    return (
        <div
            className="os-window-content"
            data-frame-scope="content"
            {...(spec.inheritsShellTheme ? { 'data-inherits-shell-theme': '' } : {})}
        >
            {children}
        </div>
    );
}

/**
 * The `nested` fill: the window's own nested Mainframe scope owns its chrome (resolving the
 * `window.chrome`/`window.toolbar` custom slots INSIDE the scope — the recursion contract) and renders
 * the REAL realm surface via `MainframeOutlet`.
 */
function NestedWindowBody({ spec, host, focused }: { spec: OsWindowSpec; host: NestedWindowHost; focused: boolean }) {
    return (
        <MainframeProvider injection={host.injection}>
            <NestedWindowInner spec={spec} host={host} focused={focused} />
        </MainframeProvider>
    );
}

/** Rendered INSIDE the nested provider so `useResolvedSlots` reads the window's own slot scope. */
function NestedWindowInner({ spec, host, focused }: { spec: OsWindowSpec; host: NestedWindowHost; focused: boolean }) {
    const slots = useResolvedSlots(host.mode);
    return (
        <div className="os-window-body">
            <WindowChrome
                spec={spec}
                focused={focused}
                chromeStart={slots.items('window.chrome', 'start')}
                toolbar={slots.items('window.toolbar')}
                chromeEnd={slots.items('window.chrome', 'end')}
            />
            <WindowContentScope spec={spec}>
                <MainframeOutlet mode={host.mode} ctx={host.ctx} />
            </WindowContentScope>
        </div>
    );
}

/**
 * The `remote` fill (ticket 16): an ISOLATED `@schemastud/frame-remote` surface. NO nested Mainframe
 * scope is mounted, so the isolated guest never sees the first-party slot registries or DOM. The host's
 * `mount(capabilityToken)` factory boots the QuickJS-WASM VM + builds the `HostReceiver` (brokering the
 * guest's capability requests against the SERVER-MINTED token); we CONSUME the resulting `RemoteSurface`
 * props and paint it inside the same window chrome/geometry/content scope as a `nested` peer. The window
 * title bar carries no `window.chrome`/`window.toolbar` slot content — there is no nested scope to
 * resolve them from — only the title + the default OS controls.
 */
function RemoteWindowBody({
    spec,
    focused,
    surfaceProps,
}: {
    spec: OsWindowSpec;
    focused: boolean;
    surfaceProps: ReturnType<Extract<WindowHost, { kind: 'remote' }>['mount']>;
}) {
    return (
        <div className="os-window-body">
            <WindowChrome spec={spec} focused={focused} />
            <WindowContentScope spec={spec}>
                <div className="os-window-remote" data-frame-remote data-window={spec.key}>
                    <RemoteSurface {...surfaceProps} />
                </div>
            </WindowContentScope>
        </div>
    );
}

/**
 * One open window: the geometry frame + the fill-mode fork.
 *
 *   - `nested` → the in-process nested Mainframe scope rendering the real surface (the default).
 *   - `remote` → the isolated `frame-remote` `RemoteSurface`, with the server-minted capability
 *                token threaded to the host's `mount` factory.
 *   - `iframe` → descriptor-only: throws {@link IframeFillModeNotShippedError} (no code path ships).
 *
 * The trust tier of the surface picks the mode upstream (`fillModeForTier` in `windowHost.ts`):
 * trusted → nested, untrusted/metered → remote; iframe is never auto-selected.
 *
 * `mount` is invoked once per open window (memoized on the host identity) so the VM boots once, not
 * on every geometry-driven re-render.
 */
function OsWindow({ spec }: { spec: OsWindowSpec }) {
    const { wm } = useOs();
    const win = wm.state.windows[spec.key];
    const host = useMemo(() => resolveWindowHost(spec), [spec]);
    // The remote VM boots exactly once per open window (not on every move/resize re-render).
    const remoteSurfaceProps = useMemo(
        () => (host.kind === 'remote' ? host.mount(host.capabilityToken) : null),
        [host],
    );
    if (!win) return null;
    const focused = wm.state.focused === spec.key;

    let body: ReactNode;
    switch (host.kind) {
        case 'nested':
            body = <NestedWindowBody spec={spec} host={host} focused={focused} />;
            break;
        case 'remote':
            // remoteSurfaceProps is non-null when host.kind === 'remote' (same memo dependency).
            body = <RemoteWindowBody spec={spec} focused={focused} surfaceProps={remoteSurfaceProps!} />;
            break;
        case 'iframe':
            // Descriptor-only, no code path shipped (ADR-0012 §B1) — fail loud, never silently blank.
            throw new IframeFillModeNotShippedError(spec.key);
    }

    return (
        <WindowFrame
            geometry={win.geometry}
            zIndex={zIndexOf(wm.state, spec.key)}
            dragHandleClassName={OS_WINDOW_DRAG_HANDLE}
            disableDragging={win.maximized}
            className={`os-window${focused ? ' is-focused' : ''}`}
            onMove={(x, y) => wm.move(spec.key, x, y)}
            onResize={(w, h, x, y) => wm.resize(spec.key, w, h, x, y)}
            onFocus={() => wm.focus(spec.key)}
        >
            {body}
        </WindowFrame>
    );
}

/** The desktop region: the window layer over the ticket-03 window manager. Empty when no windows open. */
function DesktopLayer({ host }: { host: OsHostContext }) {
    const wm = useWindowManager({ persisted: host.persisted, bounds: host.bounds });

    // Open the host's initial set once (e.g. the primary maximized surface).
    useEffect(() => {
        for (const key of host.initialOpen ?? []) {
            const spec = host.apps.find((a) => a.key === key);
            wm.open(key, { geometry: spec?.geometry, role: spec?.role });
        }
        // Seed once; the WM owns subsequent state.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const value = useMemo<OsContextValue>(
        () => ({
            wm,
            apps: host.apps,
            openApp: (key: string) => {
                const spec = host.apps.find((a) => a.key === key);
                wm.open(key, { geometry: spec?.geometry, role: spec?.role });
            },
        }),
        [wm, host.apps],
    );

    const specByKey = useMemo(() => new Map(host.apps.map((a) => [a.key, a])), [host.apps]);
    const open = visibleWindows(wm.state);

    return (
        <OsCtx.Provider value={value}>
            <div className="os-desktop-windows">
                {open.map((w) => {
                    const spec = specByKey.get(w.key);
                    return spec ? <OsWindow key={w.key} spec={spec} /> : null;
                })}
            </div>
            {/* Dock + launcher live in the desktop's OsContext so their contributions can openApp(). */}
            <OsChromeInDesktop />
        </OsCtx.Provider>
    );
}

/** Dock + launcher regions that need `useOs()` — rendered inside the DesktopLayer's OsContext. */
const OsChromeInDesktopCtx = createContext<{ dock?: ReactNode; launcher?: ReactNode }>({});
function OsChromeInDesktop() {
    const { dock, launcher } = useContext(OsChromeInDesktopCtx);
    return (
        <>
            {dock != null && <div className="os-dock" role="toolbar" aria-label="Dock">{dock}</div>}
            {launcher != null && <div className="os-launcher">{launcher}</div>}
        </>
    );
}

/**
 * The `os` Mainframe. Places the remapped core slots into the desktop layout and hosts the window
 * layer. Dock/launcher are rendered inside the desktop's OsContext (so their contributions can drive
 * the window manager); the menu bar / status / start-corner are outer chrome.
 */
export const OsMainframe: Mainframe = ({ slots, ctx }) => {
    const host = osHostContext(ctx);
    const dock = slots.has('rail') ? slots.node('rail') : null;
    const launcher = slots.has('overlay') ? slots.items('overlay') : null;

    return (
        <div className="os-root" data-shell-root>
            <div className="os-menubar" role="menubar">
                <div className="os-menubar-start">
                    {slots.node('brand')}
                    {slots.node('topBar.lead')}
                </div>
                <div className="os-menubar-actions">{slots.items('topBar.actions')}</div>
            </div>

            <div className="os-desktop">
                {/*
                 * `main` → the desktop that HOSTS the window manager (ticket 04 remap). The optional
                 * host-contributed `main` render-prop is the desktop BACKDROP (wallpaper/watermark),
                 * rendered behind the window layer; the DesktopLayer (the ticket-03 window manager) is
                 * the desktop's window host on top. Together they are "main → desktop hosting the WM".
                 */}
                {slots.has('main') && <div className="os-desktop-backdrop">{slots.main(ctx.payload)}</div>}
                <OsChromeInDesktopCtx.Provider value={{ dock, launcher: launcher && launcher.length ? launcher : null }}>
                    <DesktopLayer host={host} />
                </OsChromeInDesktopCtx.Provider>
            </div>

            {slots.has('status') && (
                <div className="os-statusbus" role="status">{slots.items('status')}</div>
            )}
        </div>
    );
};

/**
 * Register the `os` mode into a Mainframe registry, declaring its two custom slots. Idempotent-ish:
 * re-registering replaces the mode (registry `register` is last-wins). Override of contributions stays
 * key-based on the slot registry (`{slot,key,node}` replace / `{slot,key,node:null}` suppress) — this
 * helper adds no new override machinery.
 */
export function registerOsMode(registry: MainframeRegistry): void {
    registry.register('os', OsMainframe, { slots: OS_WINDOW_SLOTS });
}
