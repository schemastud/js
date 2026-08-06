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
import type { RemoteSurfaceProps } from '@schemastud/frame-remote/host';

import type { MainframeContext } from '../mainframe-registry';
import type { MainframeInjection } from '../react';

/** The trust tier a surface is assigned — this selects the fill mode a descriptor carries. */
export type WindowTrustTier = 'trusted' | 'untrusted' | 'metered';

/**
 * `nested` — the trusted-default fill mode: an in-process nested Mainframe scope rendering the
 * real realm surface. Carries the same `mode`/`injection`/`ctx` the flat `OsWindowSpec` always did.
 */
export interface NestedWindowHost {
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
export interface RemoteWindowHost {
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
export interface IframeWindowHost {
    readonly kind: 'iframe';
    /** The foreign document URL a future iframe fill mode would frame. Carried, never rendered. */
    readonly src: string;
}

/** The window fill-mode union. `nested` trusted-default / `remote` untrusted-or-metered / `iframe` descriptor-only. */
export type WindowHost = NestedWindowHost | RemoteWindowHost | IframeWindowHost;

/** Thrown when a window descriptor selects the `iframe` fill mode — deliberately unbuilt. */
export class IframeFillModeNotShippedError extends Error {
    constructor(windowKey?: string) {
        super(
            `The 'iframe' window fill mode is descriptor-only and ships no code path (Frame OS ADR-0012 §B1)` +
                (windowKey ? ` — window "${windowKey}" selected it.` : '.') +
                ' Use \'nested\' (trusted) or \'remote\' (untrusted/metered) instead.',
        );
        this.name = 'IframeFillModeNotShippedError';
    }
}

/** True when a host fills its window with an isolated `frame-remote` surface. */
export function isRemoteHost(host: WindowHost): host is RemoteWindowHost {
    return host.kind === 'remote';
}

/**
 * Map a surface's trust tier to the fill mode it should carry: `trusted` → `nested` (the
 * in-process default), `untrusted`/`metered` → `remote` (the isolated frame-remote surface).
 * `iframe` is never AUTO-selected — it is an explicit descriptor-only opt-in — so this map has
 * no tier that resolves to it. A host that wants a foreign iframe declares `kind:'iframe'` by hand.
 */
export function fillModeForTier(tier: WindowTrustTier): 'nested' | 'remote' {
    return tier === 'trusted' ? 'nested' : 'remote';
}
