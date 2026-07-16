/**
 * RCP-06 — vocabulary versioning + capability-permission model.
 *
 * A remote component DECLARES which vocabulary major it targets and which capabilities it
 * requests, in a manifest the host reads BEFORE render. The host grants (renders), shims
 * (paints a host-owned placeholder), or refuses (renders nothing, structured reason). These
 * prove the load gate is the early complement to RCP-05's per-call broker check: an
 * over-asking or version-mismatched component is stopped at LOAD, before any guest code
 * runs and before the broker is ever called — never a silent runtime break.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { RemoteComponentBridge } from '../src/bridge.js';
import { RemoteSurface } from '../src/host/render.js';
import {
    evaluateManifest,
    readManifest,
    type ComponentManifest,
    type LoadDecision,
} from '../src/host/manifest.js';
import { VOCABULARY_VERSION, VOCABULARY_MAJOR } from '../src/host/version.js';
import { TIER_CAPABILITIES } from '../src/host/tiers.js';

/** A minimal in-repo guest that paints one allowlisted block. */
const RENDER_GUEST = /* js */ `
  FrameRemote.render(FrameRemote.h('Card', {}, [FrameRemote.h('Heading', { text: 'manifest-gated block' })]));
`;

/**
 * The load flow a real embedder runs: read the manifest DATA, decide, and ONLY on grant
 * mount the guest into the VM + paint it. A shim/refuse never touches the guest source.
 */
async function loadWithManifest(
    manifest: ComponentManifest,
    tier: 'first_party' | 'untrusted_publisher',
    guestSource: string,
    opts?: { allowShim?: boolean },
): Promise<{ decision: LoadDecision; painted: string | null; brokerCalls: string[]; cleanup: () => void }> {
    const brokerCalls: string[] = [];
    const decision = evaluateManifest(manifest, { tier, allowShim: opts?.allowShim });

    let bridge: RemoteComponentBridge | null = null;
    let root: Root | null = null;
    let container: HTMLElement | null = null;

    if (decision.kind === 'grant') {
        bridge = await RemoteComponentBridge.create({
            // Wire a broker so we can prove it is NEVER reached on a refused load.
            brokerCall: (name) => {
                brokerCalls.push(name);
                return { ok: false, reason: 'capability_not_granted' };
            },
            capabilityToken: 'cap.token',
        });
        bridge.load(guestSource);
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        act(() => root!.render(createElement(RemoteSurface, { host: bridge!.host })));
    }

    return {
        decision,
        painted: container?.textContent ?? null,
        brokerCalls,
        cleanup: () => {
            if (root) act(() => root!.unmount());
            container?.remove();
            bridge?.dispose();
        },
    };
}

describe('RCP-06 manifest — version compatibility', () => {
    const cleanups: Array<() => void> = [];
    afterEach(() => {
        cleanups.splice(0).forEach((fn) => fn());
    });

    it('grants + renders a component declaring the CURRENT major with in-tier capabilities', async () => {
        const manifest: ComponentManifest = {
            vocabularyMajor: VOCABULARY_MAJOR,
            capabilities: ['resolve', 'read_scoped'],
        };
        const { decision, painted, cleanup } = await loadWithManifest(
            manifest,
            'untrusted_publisher',
            RENDER_GUEST,
        );
        cleanups.push(cleanup);

        expect(decision.kind).toBe('grant');
        expect(painted).toContain('manifest-gated block');
    });

    it('SHIMS an older-major component by default — the guest tree is NOT painted (no silent break)', async () => {
        const manifest: ComponentManifest = {
            vocabularyMajor: VOCABULARY_MAJOR - 1, // built against a previous major
            capabilities: ['resolve'],
        };
        const { decision, painted, cleanup } = await loadWithManifest(
            manifest,
            'untrusted_publisher',
            RENDER_GUEST,
        );
        cleanups.push(cleanup);

        // Structured shim decision, NOT a render-as-if-nothing-changed.
        expect(decision.kind).toBe('shim');
        expect(decision.reason).toBe('vocabulary_major_mismatch');
        expect(decision.componentMajor).toBe(VOCABULARY_MAJOR - 1);
        expect(decision.hostMajor).toBe(VOCABULARY_MAJOR);
        expect(decision.message).toContain('shim');
        // The guest never mounted — its allowlisted tree did not paint.
        expect(painted).toBeNull();
    });

    it('SHIMS a newer-major component too (host on an older major than the component targets)', () => {
        const decision = evaluateManifest(
            { vocabularyMajor: VOCABULARY_MAJOR + 5, capabilities: [] },
            { tier: 'first_party' },
        );
        expect(decision.kind).toBe('shim');
        expect(decision.reason).toBe('vocabulary_major_mismatch');
    });

    it('REFUSES a mismatched major when shimming is disabled (never a silent break either way)', () => {
        const decision = evaluateManifest(
            { vocabularyMajor: VOCABULARY_MAJOR - 1, capabilities: ['resolve'] },
            { tier: 'untrusted_publisher', allowShim: false },
        );
        expect(decision.kind).toBe('refuse');
        expect(decision.reason).toBe('vocabulary_major_mismatch');
        expect(decision.message).toContain('shim disabled');
    });
});

describe('RCP-06 manifest — capability permission at load (RCP-05 complement)', () => {
    const cleanups: Array<() => void> = [];
    afterEach(() => {
        cleanups.splice(0).forEach((fn) => fn());
    });

    it('REFUSES an over-asking untrusted_publisher (request_save beyond tier) at load, BEFORE any broker call', async () => {
        const manifest: ComponentManifest = {
            vocabularyMajor: VOCABULARY_MAJOR,
            capabilities: ['resolve', 'request_save'], // request_save is first_party-only
        };
        const { decision, painted, brokerCalls, cleanup } = await loadWithManifest(
            manifest,
            'untrusted_publisher',
            RENDER_GUEST,
        );
        cleanups.push(cleanup);

        expect(decision.kind).toBe('refuse');
        expect(decision.reason).toBe('capability_over_ask');
        // A clear reason naming the tier + capability.
        expect(decision.message).toContain('untrusted_publisher');
        expect(decision.message).toContain('request_save');
        // Asserted BEFORE any render/broker: the guest never mounted, the broker never ran.
        expect(painted).toBeNull();
        expect(brokerCalls).toEqual([]);
    });

    it('GRANTS the SAME request_save when the host assigns the first_party tier', () => {
        const decision = evaluateManifest(
            { vocabularyMajor: VOCABULARY_MAJOR, capabilities: ['resolve', 'read_scoped', 'request_save'] },
            { tier: 'first_party' },
        );
        expect(decision.kind).toBe('grant');
    });

    it('REFUSES a manifest requesting an UNKNOWN capability the host defines no grant for', () => {
        const decision = evaluateManifest(
            { vocabularyMajor: VOCABULARY_MAJOR, capabilities: ['resolve', 'summon_daemon' as never] },
            { tier: 'first_party' },
        );
        expect(decision.kind).toBe('refuse');
        expect(decision.reason).toBe('capability_unknown');
    });

    it('checks capability BEFORE version — an over-ask on a mismatched major still refuses (trust first)', () => {
        const decision = evaluateManifest(
            { vocabularyMajor: VOCABULARY_MAJOR - 1, capabilities: ['request_save'] },
            { tier: 'untrusted_publisher' },
        );
        expect(decision.kind).toBe('refuse');
        expect(decision.reason).toBe('capability_over_ask');
    });
});

describe('RCP-06 manifest — reading untrusted manifest data', () => {
    it('accepts a well-formed manifest', () => {
        const res = readManifest({ vocabularyMajor: 1, capabilities: ['resolve'], tier: 'untrusted_publisher' });
        expect(res.ok).toBe(true);
        if (res.ok) {
            expect(res.manifest.vocabularyMajor).toBe(1);
            expect(res.manifest.tier).toBe('untrusted_publisher');
        }
    });

    it('refuses a manifest with no vocabularyMajor (not "assumed compatible")', () => {
        const res = readManifest({ capabilities: [] });
        expect(res.ok).toBe(false);
        if (!res.ok) expect(res.reason).toBe('manifest_no_major');
    });

    it('refuses a manifest with non-array capabilities', () => {
        const res = readManifest({ vocabularyMajor: 1, capabilities: 'resolve' });
        expect(res.ok).toBe(false);
        if (!res.ok) expect(res.reason).toBe('manifest_bad_capabilities');
    });

    it('drops a self-claimed tier that is not a known tier (host is the authority)', () => {
        const res = readManifest({ vocabularyMajor: 1, capabilities: [], tier: 'god_mode' });
        expect(res.ok).toBe(true);
        if (res.ok) expect(res.manifest.tier).toBeUndefined();
    });
});

describe('RCP-06 — the vocabulary version is single-sourced + documented', () => {
    it('VOCABULARY_MAJOR is derived from VOCABULARY_VERSION', () => {
        expect(VOCABULARY_MAJOR).toBe(Number(VOCABULARY_VERSION.split('.')[0]));
    });

    it('pins the DOCUMENTED major to the code constant (drift guard, mirrors vocabulary-spec)', () => {
        // The README + VERIFY document that publishers may target vocabulary major 1.
        // If the code major bumps, this test fails until the docs are updated in lockstep.
        const DOCUMENTED_MAJOR = 1;
        expect(VOCABULARY_MAJOR).toBe(DOCUMENTED_MAJOR);
    });

    it('the tier grant table is the single source for tier→capability (untrusted has no save)', () => {
        expect(TIER_CAPABILITIES.untrusted_publisher).not.toContain('request_save');
        expect(TIER_CAPABILITIES.first_party).toContain('request_save');
    });
});
