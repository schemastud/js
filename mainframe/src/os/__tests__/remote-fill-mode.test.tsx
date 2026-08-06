/**
 * The `remote` window FILL MODE (Frame OS ticket 16, ADR-0012 §B1 + ADR-0013).
 *
 * Verifies the second `WindowHost` fill mode alongside the trusted-default `nested`:
 *   (a) a `remote` window routes to `frame-remote`'s `RemoteSurface` and does NOT mount a nested
 *       Mainframe scope / touch first-party surfaces (the isolation is CONSUMED, not re-implemented);
 *   (b) the server-minted `capabilityToken` is threaded to the host's `mount` factory (and thence to
 *       the frame-remote host) — this layer only CONSUMES the opaque token;
 *   (c) the trust tier selects the fill mode: `nested`→nested scope, `remote`→RemoteSurface branch,
 *       `iframe`→the explicit not-shipped throw.
 *
 * The metered/remote path is STUBBED: `RemoteSurface` is mocked so NO live QuickJS-WASM VM boots and
 * NO metered call is made in this CI-speed unit test. We prove we ROUTE to + thread the token into the
 * substrate, not that the substrate isolates (frame-remote proves that in its own ~20s VM tests).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// STUB the isolation substrate: capture the props the `remote` branch passes to RemoteSurface (its
// `host` receiver + the mount-derived shape) without booting the real VM. The mock records every call.
const remoteSurfaceCalls: Array<Record<string, unknown>> = [];
vi.mock('@schemastud/frame-remote/host', () => ({
    RemoteSurface: (props: Record<string, unknown>) => {
        remoteSurfaceCalls.push(props);
        return <div data-testid="stub-remote-surface" data-token={(props.host as { token?: string } | undefined)?.token} />;
    },
}));

import { createMainframeRegistry, createSlotRegistry } from '../../index';
import type { Mainframe, MainframeInjection } from '../../index';
import { MainframeProvider, MainframeOutlet } from '../../react';
import { registerOsMode, type OsWindowSpec } from '../OsMainframe';
import {
    IframeFillModeNotShippedError,
    fillModeForTier,
    isRemoteHost,
    type RemoteWindowHost,
} from '../windowHost';

function osInjection(): MainframeInjection {
    const slots = createSlotRegistry();
    const mainframes = createMainframeRegistry();
    registerOsMode(mainframes);
    return { slots, mainframes };
}

/** A nested realm surface (the trusted-default fill) that stamps a marker into the DOM if mounted. */
const InnerMainframe: Mainframe = () => <div data-testid="nested-surface">NESTED REAL SURFACE</div>;
function innerInjection(): MainframeInjection {
    const slots = createSlotRegistry();
    const mainframes = createMainframeRegistry();
    mainframes.register('realm', InnerMainframe);
    return { slots, mainframes };
}

function renderOs(apps: OsWindowSpec[], initialOpen: string[]) {
    return render(
        <MainframeProvider injection={osInjection()}>
            <MainframeOutlet mode="os" ctx={{ os: { apps, initialOpen } }} />
        </MainframeProvider>,
    );
}

/** A `remote` host whose `mount` records the token it was handed and returns a fake receiver. */
function makeRemoteHost(token: string): { host: RemoteWindowHost; mountArgs: string[] } {
    const mountArgs: string[] = [];
    const host: RemoteWindowHost = {
        kind: 'remote',
        capabilityToken: token,
        mount: (capabilityToken) => {
            mountArgs.push(capabilityToken);
            // The host would boot the VM + build a HostReceiver here; we return a fake receiver
            // carrying the token so the test can assert it is threaded through to RemoteSurface.
            return { host: { token: capabilityToken } as never };
        },
    };
    return { host, mountArgs };
}

describe('remote fill mode — routes to frame-remote, not a nested scope', () => {
    it('a remote window renders inside RemoteSurface and mounts NO nested Mainframe scope', () => {
        remoteSurfaceCalls.length = 0;
        const { host } = makeRemoteHost('cap-token-abc');
        const app: OsWindowSpec = { key: 'metered', title: 'Metered', host };
        renderOs([app], ['metered']);

        // The remote branch painted the (stubbed) isolated surface…
        expect(screen.getByTestId('stub-remote-surface')).toBeTruthy();
        // …and NO nested realm surface was mounted (isolation: first-party scope never touched).
        expect(screen.queryByTestId('nested-surface')).toBeNull();
        // The window still gets equal chrome/geometry: its title bar renders.
        expect(screen.getByText('Metered')).toBeTruthy();
        // The isolated surface sits inside the content scope, not the first-party slot tree.
        expect(document.querySelector('.os-window-remote[data-frame-remote]')).not.toBeNull();
    });

    it('threads the server-minted capability token through mount into the frame-remote host', () => {
        remoteSurfaceCalls.length = 0;
        const { host, mountArgs } = makeRemoteHost('cap-token-xyz');
        const app: OsWindowSpec = { key: 'metered', title: 'Metered', host };
        renderOs([app], ['metered']);

        // The opaque token was handed to the host's mount factory (the VM-boot seam)…
        expect(mountArgs).toEqual(['cap-token-xyz']);
        // …and the resulting receiver (carrying the token) reached RemoteSurface as its `host` prop.
        expect(remoteSurfaceCalls).toHaveLength(1);
        expect((remoteSurfaceCalls[0].host as { token: string }).token).toBe('cap-token-xyz');
        expect(screen.getByTestId('stub-remote-surface').getAttribute('data-token')).toBe('cap-token-xyz');
    });

    it('boots the VM (calls mount) exactly once, not on every re-render', () => {
        const { host, mountArgs } = makeRemoteHost('cap-once');
        const app: OsWindowSpec = { key: 'metered', title: 'Metered', host };
        const { rerender } = renderOs([app], ['metered']);
        rerender(
            <MainframeProvider injection={osInjection()}>
                <MainframeOutlet mode="os" ctx={{ os: { apps: [app], initialOpen: ['metered'] } }} />
            </MainframeProvider>,
        );
        expect(mountArgs).toEqual(['cap-once']); // one boot despite the re-render
    });
});

describe('trust tier selects the fill mode', () => {
    it('nested (trusted default) → the in-process nested realm surface, no RemoteSurface', () => {
        remoteSurfaceCalls.length = 0;
        // A flat spec (no `host`) is the nested/trusted default (back-compat).
        const app: OsWindowSpec = { key: 'studio', title: 'Studio', mode: 'realm', injection: innerInjection() };
        renderOs([app], ['studio']);
        expect(screen.getByTestId('nested-surface')).toBeTruthy();
        expect(screen.queryByTestId('stub-remote-surface')).toBeNull();
        expect(remoteSurfaceCalls).toHaveLength(0);
    });

    it('remote (untrusted/metered) → the RemoteSurface branch', () => {
        const { host } = makeRemoteHost('t');
        const app: OsWindowSpec = { key: 'metered', title: 'Metered', host };
        renderOs([app], ['metered']);
        expect(screen.getByTestId('stub-remote-surface')).toBeTruthy();
    });

    it('iframe (descriptor-only) → the explicit not-shipped throw, no silent blank', () => {
        const app: OsWindowSpec = {
            key: 'foreign',
            title: 'Foreign',
            host: { kind: 'iframe', src: 'https://example.test/embed' },
        };
        // The renderer explicitly does-not-handle iframe and throws a clear "not shipped" error.
        expect(() => renderOs([app], ['foreign'])).toThrow(IframeFillModeNotShippedError);
    });

    it('fillModeForTier maps trust tiers to fill modes; iframe is never auto-selected', () => {
        expect(fillModeForTier('trusted')).toBe('nested');
        expect(fillModeForTier('untrusted')).toBe('remote');
        expect(fillModeForTier('metered')).toBe('remote');
    });

    it('isRemoteHost narrows the union', () => {
        const { host } = makeRemoteHost('t');
        expect(isRemoteHost(host)).toBe(true);
        expect(isRemoteHost({ kind: 'nested', mode: 'realm', injection: innerInjection() })).toBe(false);
        expect(isRemoteHost({ kind: 'iframe', src: 'x' })).toBe(false);
    });
});
