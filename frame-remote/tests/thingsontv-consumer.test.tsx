import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { act } from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { RemoteComponentBridge } from '../src/bridge.js';
import { RemoteSurface } from '../src/host/render.js';
import { readManifest, evaluateManifest } from '../src/host/manifest.js';
import { GuestVm, type BrokerCall } from '../src/guest/vm.js';
import { buildThingsontvGuest } from '../examples/thingsontv-guest/build.js';

/**
 * RCP-07 — the FIRST CONSUMER. A block another app (thingsontv) authored as an untrusted
 * publisher, built against ONLY `@schemastud/frame-remote/sdk` (resolved through the built
 * `dist` + `exports` via a `file:` install — never a `../src` import), is:
 *   1. gated by its MANIFEST at the `untrusted_publisher` tier before it mounts (RCP-06);
 *   2. rendered in-context through the host receiver + allowlist, no iframe;
 *   3. interactive — a click round-trips by handler id through the isolated VM;
 *   4. able to reach host data ONLY through the brokered `resolve` capability (a `$ref`),
 *      never a raw fetch — and a resolve outside scope degrades, it does not crash;
 *   5. structurally unable to exfiltrate the token or reach a host global.
 *
 * The broker here is a FAKE host authority mirroring the splicewire-app `CapabilityBroker`
 * (`resolve` in-scope → { ok, data }, out-of-scope → { ok:false, reason:'ref_out_of_scope' }).
 * In the real consumer this callback POSTs to `/embed/capability` presenting the scoped
 * token; the trust decision is identical.
 */

// The `@id` the seeded host wants this block to resolve (mirrors the seeder's in-scope
// fragment). Passed to the builder so the bundle resolves exactly this ref.
const IN_SCOPE_REF = 'nod_cold_holding';
const BUILD_TIMEOUT = 120_000;

describe('RCP-07 first consumer — the thingsontv block in the real host', () => {
    let source = '';
    let resolvedThroughPackage = false;

    beforeAll(async () => {
        const built = await buildThingsontvGuest({ factRef: IN_SCOPE_REF });
        source = built.source;
        resolvedThroughPackage = built.resolvedThroughPackage;
    }, BUILD_TIMEOUT);

    let bridge: RemoteComponentBridge | null = null;
    let container: HTMLElement | null = null;
    let root: Root | null = null;

    afterEach(() => {
        act(() => root?.unmount());
        container?.remove();
        bridge?.dispose();
        bridge = null;
        container = null;
        root = null;
    });

    // A fake host authority: mirror the PHP CapabilityBroker's allow/refuse contract.
    const scopedBroker: BrokerCall = (name, args) => {
        if (name === 'resolve') {
            const id = (args as { id?: string }).id ?? '';
            if (id === IN_SCOPE_REF) {
                return { ok: true, data: { '@id': id, name: 'Cold Holding' } };
            }
            return { ok: false, reason: 'ref_out_of_scope' };
        }
        return { ok: false, reason: 'capability_not_granted' };
    };

    async function mount(broker?: BrokerCall) {
        bridge = await RemoteComponentBridge.create({
            capabilityToken: broker ? 'cap.scoped.token' : undefined,
            brokerCall: broker,
        });
        bridge.load(source);
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        act(() => root!.render(createElement(RemoteSurface, { host: bridge!.host })));
    }

    it('builds against the published SDK through the package exports (dist, not src)', () => {
        expect(source.length).toBeGreaterThan(0);
        expect(resolvedThroughPackage).toBe(true);
        // The bundle binds ONLY to the in-VM bridge global — no host surface pulled in.
        expect(source).toContain('FrameRemote');
        for (const forbidden of ['XMLHttpRequest', 'document.cookie', 'localStorage']) {
            expect(source).not.toContain(forbidden);
        }
    });

    it('the manifest gates GRANT at the untrusted_publisher tier (RCP-06), before mount', async () => {
        // The component's declared manifest (as data the host reads before executing it).
        const parsed = readManifest({
            vocabularyMajor: 1,
            capabilities: ['resolve', 'read_scoped'],
            tier: 'untrusted_publisher',
        });
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;

        const decision = evaluateManifest(parsed.manifest, { tier: 'untrusted_publisher' });
        expect(decision.kind).toBe('grant');
    });

    it('refuses an over-ask (request_save) at load for an untrusted publisher — before any broker call', () => {
        const parsed = readManifest({ vocabularyMajor: 1, capabilities: ['resolve', 'request_save'] });
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        const decision = evaluateManifest(parsed.manifest, { tier: 'untrusted_publisher' });
        expect(decision.kind).toBe('refuse');
        expect(decision.reason).toBe('capability_over_ask');
    });

    it('paints the thingsontv block in-context through the allowlisted host receiver', async () => {
        await mount(scopedBroker);
        expect(container!.textContent).toContain('Cooling-safety fact card');
        expect(container!.textContent).toContain('thingsontv · untrusted publisher · brokered reads only');
        expect(container!.querySelector('h2')).not.toBeNull();
        expect(container!.querySelectorAll('button').length).toBe(2);
    });

    it('round-trips a click by handler id (guest -> host -> guest)', async () => {
        await mount(scopedBroker);
        const incrementBtn = container!.querySelectorAll('button')[0]!;
        expect(incrementBtn.textContent).toBe('Increment (0)');
        act(() => incrementBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })));
        expect(container!.querySelectorAll('button')[0]!.textContent).toBe('Increment (1)');
    });

    it('reaches host data ONLY through the brokered resolve (in-scope $ref paints the fact)', async () => {
        await mount(scopedBroker);
        expect(container!.textContent).toContain('No fact resolved yet');
        const resolveBtn = container!.querySelectorAll('button')[1]!;
        act(() => resolveBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })));
        // The fact came back from the broker, not a raw fetch, and was painted.
        expect(container!.textContent).toContain('Resolved: Cold Holding');
    });

    it('degrades (does not crash) when the broker refuses an out-of-scope resolve', async () => {
        // A broker that refuses everything (mirrors ref_out_of_scope for a wrong ref).
        const refusing: BrokerCall = () => ({ ok: false, reason: 'ref_out_of_scope' });
        await mount(refusing);
        const resolveBtn = container!.querySelectorAll('button')[1]!;
        act(() => resolveBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })));
        expect(container!.textContent).toContain('Resolve refused: ref_out_of_scope');
    });

    it('re-verifies the trust boundary in the real consumer: the token + host globals are unreachable', async () => {
        // Drive an EXFILTRATION probe through the SAME VM the consumer uses. The guest tries
        // to read its token, reach a host global, and make a raw fetch. All are inert.
        const vm = await GuestVm.create({
            onMutate: () => {},
            capabilityToken: 'super.secret.session.token',
            brokerCall: scopedBroker,
        });
        try {
            vm.load(`
                globalThis.__EXFIL__ = {
                    tokenOnBridge: typeof FrameRemote.token,          // never exposed
                    rawTokenType: typeof __frame_capability_token,    // opaque holder, a string but not reachable as FrameRemote surface
                    fetch: typeof fetch,
                    xhr: typeof XMLHttpRequest,
                    documentType: typeof document,
                    windowType: typeof window,
                    cookie: (typeof document !== 'undefined' && document && document.cookie) ? document.cookie : null,
                    localStorage: typeof localStorage,
                };
            `);
            const exfil = vm.read<{
                tokenOnBridge: string;
                fetch: string;
                xhr: string;
                documentType: string;
                windowType: string;
                cookie: string | null;
                localStorage: string;
            }>('__EXFIL__');

            // The token is a capability the guest USES, never a value it can READ off the SDK.
            expect(exfil.tokenOnBridge).toBe('undefined');
            // No network, no DOM, no session — the whole browser ambient is absent.
            expect(exfil.fetch).toBe('undefined');
            expect(exfil.xhr).toBe('undefined');
            expect(exfil.documentType).toBe('undefined');
            expect(exfil.windowType).toBe('undefined');
            expect(exfil.cookie).toBeNull();
            expect(exfil.localStorage).toBe('undefined');
        } finally {
            vm.dispose();
        }
    });
});
