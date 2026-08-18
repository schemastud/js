/**
 * `@schemastud/mainframe/os` desktop CHROME — the generic, realm-AGNOSTIC desktop shell furniture
 * (Frame OS chrome tier; promoted out of the audiostud host per editor-promotion ticket 07 / ADR-0017).
 *
 * The OS window MANAGER (`OsMainframe`, `useWindowManager`, `WindowFrame`) already lives beside this in
 * the same subpath and stays satellite-agnostic. What was still host-local was the desktop CHROME that
 * rides it — dock, launcher (start-menu), menu-bar clock, upsell popover, workspace persistence, and the
 * operator META-EDITOR overlay geometry. That machinery is generic: it reads a flat `DesktopApp[]` and
 * generic booleans/callbacks, so it is promoted here.
 *
 * THE TIER BOUNDARY (load-bearing): this module imports NO beam realm / manifest / entitlement type. It
 * takes a generic {@link DesktopApp} (`{ key, title, accent?, subtitle?, realm?, route?, locked?,
 * upsell?, icon? }`) — `locked` is a plain boolean, `upsell` an opaque `{ title?, cta? }` bag, `realm` a
 * display string. ALL realm derivation, entitlement gating, and upsell COPY live in the beam layer that
 * COMPUTES the `DesktopApp[]` (`@splicewire/beam-ux/shell`). This mirrors how the OS window manager stays
 * satellite-agnostic (frame-os ticket 14). If you find yourself importing a beam type here, STOP.
 *
 * The chrome is CLASS-name structural only (`os-*`, `op-*`) — it ships NO palette/fonts. A host restyles
 * it via the `--shell-*` token contract + those class names (audiostud's Analog-Studio remap is host-
 * local CSS). Router / navigation is injected: the dock's realm-switch and per-surface links are host
 * callbacks (`onNavigate`), never an Inertia import here.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';

import {
    createMainframeRegistry,
    createSlotRegistry,
    type MainframeInjection,
} from '../index';
import { registerOsMode, useOs } from './OsMainframe';
import type { OsWindowSpec } from './OsMainframe';
import { useWindowManager, type WindowManager } from './useWindowManager';
import { WindowFrame } from './WindowFrame';
import {
    floatingWindows,
    zIndexOf,
    type PersistedWorkspace,
} from './windowManager';

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The generic app / roster shape the chrome reads. Realm-agnostic: `realm` is a display kicker, `route`
// an opaque href the host resolves, `locked`/`upsell` generic gating flags. `render` frames the real
// surface — the host owns what that is.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Opaque upsell copy for a soft-locked app — the host/beam layer supplies the strings. */
export interface DesktopUpsell {
    title?: string;
    cta?: string;
    [k: string]: unknown;
}

/**
 * One launchable desktop app. This is the OS-window spec ({@link OsWindowSpec}) PLUS the flat chrome
 * fields the dock/launcher read. Realm-agnostic by construction: no manifest/entitlement type appears.
 */
export type DesktopApp = OsWindowSpec & {
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

// ── Small shared helpers ────────────────────────────────────────────────────────────────────────

/** The app glyph — an injected `icon` if present, else a colored square keyed by `accent`. */
function Glyph({ app, className = 'glyph' }: { app: DesktopApp; className?: string }) {
    if (app.icon) {
        return <span className={className}>{app.icon}</span>;
    }

    return <span className={className} style={app.accent ? { background: app.accent } : undefined} />;
}

/** Resolve the display upsell copy for a locked app (falling back to generic labels). */
function upsellText(a: DesktopApp): { title: string; cta: string } {
    return {
        title: (a.upsell?.title as string) || `Unlock ${a.title}`,
        cta: (a.upsell?.cta as string) || 'Upgrade',
    };
}

// ── Menu-bar clock ───────────────────────────────────────────────────────────────────────────────

/** A live wall-clock for the menu-bar status. */
export function Clock() {
    const [now, setNow] = useState('—');
    useEffect(() => {
        const tick = () =>
            setNow(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        tick();
        const id = setInterval(tick, 1000);

        return () => clearInterval(id);
    }, []);

    return <span className="clock">{now}</span>;
}

// ── Upsell popover (soft-gate affordance) ─────────────────────────────────────────────────────────

/** Shown when a locked app's tile is clicked. Never opens the window; surfaces the upsell copy + CTA. */
export function UpsellPopover({ app, onClose }: { app: DesktopApp; onClose: () => void }) {
    const { title, cta } = upsellText(app);

    return (
        <>
            <div className="launcher-scrim" onClick={onClose} />
            <div className="upsell-pop" role="dialog" aria-label={`Unlock ${app.title}`}>
                <div className="upsell-lock" style={{ background: app.accent }}>
                    🔒
                </div>
                <div className="upsell-title">{title}</div>
                <p className="upsell-copy">
                    The <b>{app.title}</b> app is available on a higher plan. Upgrade to launch it.
                </p>
                <button type="button" className="upsell-cta">
                    {cta}
                </button>
            </div>
        </>
    );
}

// ── Launcher (start-menu) ─────────────────────────────────────────────────────────────────────────

/** The launcher popover — a grid of apps; a locked app routes to the upsell, an unlocked one opens. */
export function Launcher({
    apps,
    heading = 'Apps',
    onClose,
    onUpsell,
}: {
    apps: DesktopApp[];
    heading?: string;
    onClose: () => void;
    onUpsell: (app: DesktopApp) => void;
}) {
    const { openApp } = useOs();

    return (
        <>
            <div className="launcher-scrim" onClick={onClose} />
            <div className="launcher-pop" role="menu">
                <div className="launcher-heading">{heading}</div>
                <div className="launcher-grid">
                    {apps.map((a) => (
                        <button
                            key={a.key}
                            type="button"
                            className={`launcher-app${a.locked ? ' is-locked' : ''}`}
                            onClick={() => {
                                if (a.locked) {
                                    onUpsell(a);
                                } else {
                                    openApp(a.key);
                                }

                                onClose();
                            }}
                        >
                            <Glyph app={a} />
                            <span>
                                <span className="name">
                                    {a.title}
                                    {a.locked ? <span className="lock-badge"> 🔒</span> : null}
                                </span>
                                <span className="realm">
                                    {a.realm} · {a.locked ? upsellText(a).title : a.subtitle}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}

// ── Dock ──────────────────────────────────────────────────────────────────────────────────────────

/**
 * The dock: the realm SWITCHER. An unlocked tile NAVIGATES (via the injected `onNavigate` — the host
 * owns routing), a locked one opens the upsell; the launcher trigger opens the start-menu. `activeKey`
 * highlights the current surface's tile (the host computes it — from its router — and passes it).
 */
export function Dock({
    apps,
    activeKey,
    launchLabel = 'Launch',
    launcherHeading,
    onNavigate,
}: {
    apps: DesktopApp[];
    activeKey?: string;
    launchLabel?: string;
    launcherHeading?: string;
    onNavigate: (app: DesktopApp) => void;
}) {
    const [launcherOpen, setLauncherOpen] = useState(false);
    const [upsell, setUpsell] = useState<DesktopApp | null>(null);

    return (
        <>
            <button type="button" className="dock-launch" onClick={() => setLauncherOpen((v) => !v)}>
                <span>▦</span> {launchLabel}
            </button>
            <span className="dock-div" />
            {apps.map((a) =>
                a.locked ? (
                    <button
                        key={a.key}
                        type="button"
                        className="dock-app is-locked"
                        title={upsellText(a).title}
                        onClick={() => setUpsell(a)}
                    >
                        <Glyph app={a} />
                        {a.title}
                        <span className="lock-badge" aria-label="locked">
                            🔒
                        </span>
                    </button>
                ) : (
                    <button
                        key={a.key}
                        type="button"
                        className={`dock-app${a.key === activeKey ? ' open' : ''}`}
                        onClick={() => onNavigate(a)}
                    >
                        <Glyph app={a} />
                        {a.title}
                    </button>
                ),
            )}
            {launcherOpen && (
                <Launcher apps={apps} heading={launcherHeading} onClose={() => setLauncherOpen(false)} onUpsell={setUpsell} />
            )}
            {upsell && <UpsellPopover app={upsell} onClose={() => setUpsell(null)} />}
        </>
    );
}

// ── Workspace persistence ─────────────────────────────────────────────────────────────────────────

/**
 * Renders nothing; contributed to `overlay` so it lives inside the DesktopLayer's OsContext and can
 * observe `wm.state`. On every change it writes the serialized workspace back through the injected
 * `persist` callback (the host owns WHERE the snapshot lives — localStorage, a server, …).
 */
export function WorkspacePersistence({ persist }: { persist: (workspace: PersistedWorkspace) => void }) {
    const { wm } = useOs();
    useEffect(() => {
        try {
            persist(wm.serialize());
        } catch {
            /* best-effort — persistence is never fatal. */
        }
        // Re-persist whenever the window-manager STATE changes (open/move/resize/snap/close/focus).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wm.state]);

    return null;
}

// ── The desktop-chrome factory: build the OUTER os injection ──────────────────────────────────────

/** Host-supplied chrome contributions (all realm-agnostic nodes/callbacks). */
export interface DesktopChromeConfig {
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
export function buildDesktopChrome(config: DesktopChromeConfig): MainframeInjection {
    const slots = createSlotRegistry();
    const mainframes = createMainframeRegistry();
    registerOsMode(mainframes);

    if (config.brand != null) {
        slots.contribute({ slot: 'brand', key: 'os-brand', node: config.brand });
    }

    if (config.status != null) {
        slots.contribute({ slot: 'topBar.actions', key: 'os-status', zone: 'end', node: config.status });
    }

    if (config.backdrop != null) {
        // `main` is a render-slot (the desktop backdrop behind the window layer).
        slots.contribute({ slot: 'main', key: 'os-backdrop', render: () => config.backdrop });
    }

    slots.contribute({
        slot: 'rail',
        key: 'os-dock',
        node: (
            <Dock
                apps={config.apps}
                activeKey={config.activeKey}
                launchLabel={config.launchLabel}
                launcherHeading={config.launcherHeading}
                onNavigate={config.onNavigate}
            />
        ),
    });

    if (config.persist) {
        slots.contribute({
            slot: 'overlay',
            key: 'os-persist',
            zone: 'corner',
            node: <WorkspacePersistence persist={config.persist} />,
        });
    }

    if (config.statusLine != null) {
        slots.contribute({ slot: 'status', key: 'os-bus', zone: 'start', node: config.statusLine });
    }

    return { slots, mainframes };
}

// ── The operator META-EDITOR overlay (a chrome MODE) ──────────────────────────────────────────────
// The generic overlay GEOMETRY of the "floating tools over the live page" pattern: a `pointer-events:
// none` fixed layer over the live page (so the page keeps interaction + scroll) carrying a start-menu
// launcher + draggable float windows + a taskbar, reusing the OS window manager. It is realm-agnostic —
// the beam/host layer supplies the tool ROSTER + the start-menu CONTENTS + resolves a window key to its
// chrome/body. The overlay owns only geometry, the WM wiring, and the bounds sync.

/** One resolvable overlay window: its title-bar chrome + body. The host resolves a key → this. */
export interface OverlayWindow {
    title: string;
    accent: string;
    render: () => ReactNode;
}

/** The overlay render props: the WM is threaded in so the host's start-menu can drive it. */
export interface OperatorOverlayProps {
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
    renderLauncher: (args: { wm: WindowManager; onClose: () => void }) => ReactNode;
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
export function OperatorOverlay({
    stableKeys,
    resolveWindow,
    renderLauncher,
    orbLabel = 'Operator',
    orbIcon,
    onWindowManager,
    onWindowBodyClickCapture,
}: OperatorOverlayProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const wm = useWindowManager();
    const [menuOpen, setMenuOpen] = useState(false);

    // Let the host subscribe to the WM (nav suppression etc.).
    useEffect(() => {
        if (!onWindowManager) {
            return;
        }

        return onWindowManager(wm);
        // Subscribe once with the stable WM identity; wm callbacks are stable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onWindowManager]);

    // Keep the WM bounds synced to the overlay (viewport) so geometry clamps correctly. Depend only on
    // the STABLE `setBounds` + guard redundant updates (else the effect re-subscribes each render and
    // `setBounds` churns state → re-render → infinite loop).
    const { setBounds } = wm;
    const lastBounds = useRef({ width: 0, height: 0 });
    useEffect(() => {
        const el = overlayRef.current;

        if (!el || typeof ResizeObserver === 'undefined') {
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

    // Bring a window forward from the taskbar: un-minimize if needed, then focus (raise).
    const surface = (key: string) => {
        if (wm.state.windows[key]?.minimized) {
            wm.restore(key);
        }

        wm.focus(key);
    };

    const wins = floatingWindows(wm.state); // visible frames (excludes minimized)
    const orderedKeys = typeof stableKeys === 'function' ? stableKeys(wm) : stableKeys;
    const taskbar = orderedKeys
        .map((k) => wm.state.windows[k])
        .filter((w): w is NonNullable<typeof w> => !!w);

    return (
        <div ref={overlayRef} className="op-desk-overlay">
            {wins.map((w) => {
                const win = resolveWindow(w.key, wm);

                if (!win) {
                    return null;
                }

                return (
                    <WindowFrame
                        key={w.key}
                        geometry={w.geometry}
                        zIndex={zIndexOf(wm.state, w.key)}
                        dragHandleClassName="op-win-bar"
                        bounds="parent"
                        disableDragging={w.maximized}
                        enableResizing={!w.maximized}
                        onMove={(x, y) => wm.move(w.key, x, y)}
                        onResize={(width, height, x, y) => wm.resize(w.key, width, height, x, y)}
                        onFocus={() => wm.focus(w.key)}
                    >
                        <div className="op-win-inner">
                            <div
                                className="op-win-bar"
                                onDoubleClick={() => (w.maximized ? wm.restore(w.key) : wm.maximize(w.key))}
                            >
                                <span className="op-win-dot" style={{ background: win.accent }} />
                                <span className="op-win-title">{win.title}</span>
                                <div className="op-win-ctrls">
                                    <button
                                        type="button"
                                        className="op-win-x"
                                        onClick={() => wm.minimize(w.key)}
                                        aria-label="Minimize"
                                        title="Minimize"
                                    >
                                        –
                                    </button>
                                    <button
                                        type="button"
                                        className="op-win-x"
                                        onClick={() => (w.maximized ? wm.restore(w.key) : wm.maximize(w.key))}
                                        aria-label={w.maximized ? 'Restore' : 'Maximize'}
                                        title={w.maximized ? 'Restore' : 'Maximize'}
                                    >
                                        {w.maximized ? '❐' : '▢'}
                                    </button>
                                    <button
                                        type="button"
                                        className="op-win-x"
                                        onClick={() => wm.close(w.key)}
                                        aria-label="Close"
                                        title="Close"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                            <div className="op-win-body" onClickCapture={onWindowBodyClickCapture}>
                                {win.render()}
                            </div>
                        </div>
                    </WindowFrame>
                );
            })}

            {taskbar.length > 0 && (
                <div className="op-taskbar">
                    {taskbar.map((w) => {
                        const win = resolveWindow(w.key, wm);

                        if (!win) {
                            return null;
                        }

                        const cls = [
                            wm.state.focused === w.key && !w.minimized ? 'focused' : '',
                            w.minimized ? 'minned' : '',
                        ]
                            .filter(Boolean)
                            .join(' ');

                        return (
                            <button key={w.key} type="button" className={cls} onClick={() => surface(w.key)}>
                                <span className="glyph" style={{ background: win.accent }} />
                                {win.title}
                            </button>
                        );
                    })}
                </div>
            )}

            {menuOpen && renderLauncher({ wm, onClose: () => setMenuOpen(false) })}
            <button
                type="button"
                className={`op-orb${menuOpen ? ' is-open' : ''}`}
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
            >
                {orbIcon ?? <span className="mark" />}
                {orbLabel}
            </button>
        </div>
    );
}
