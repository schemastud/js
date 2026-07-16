import { describe, it, expect, afterEach } from 'vitest';
import { GuestVm } from '../src/guest/vm.js';
import { HostReceiver } from '../src/host/receiver.js';
import { CONTAINMENT_PROBE } from './guests.js';

/**
 * The guest self-probe runs inside the REAL QuickJS VM (real WASM). Because the VM
 * realm has no ambient browser globals, every layer-1 target the probe reaches for
 * must be unreachable. This is layer-1 isolation proven in-process; the cross-site
 * credentialed-fetch half (that a fetch, IF injected, carries no first-party cookie)
 * requires two live origins and is covered by VERIFY.md's browser steps.
 */
describe('containment — guest cannot reach any browser ambient inside the VM', () => {
    let vm: GuestVm | null = null;
    afterEach(() => {
        vm?.dispose();
        vm = null;
    });

    const TARGETS = [
        'document',
        'document.cookie',
        'window',
        'window.parent',
        'localStorage',
        'fetch',
        'globalThis_fetch',
        'XMLHttpRequest',
    ];

    it('reports every ambient as BLOCKED (undefined/throws) inside the real VM', async () => {
        const mutations: unknown[] = [];
        vm = await GuestVm.create({ onMutate: (r) => mutations.push(...r) });
        vm.load(CONTAINMENT_PROBE);

        const report = vm.read<{ target: string; blocked: boolean }[]>('__PROBE__');

        // Every target we probe must be blocked.
        for (const target of TARGETS) {
            const entry = report.find((r) => r.target === target);
            expect(entry, `probe missing target ${target}`).toBeDefined();
            expect(entry!.blocked, `${target} was reachable inside the VM`).toBe(true);
        }
        expect(report.every((r) => r.blocked)).toBe(true);
    });

    it('there is NO fetch capability injected by default', async () => {
        vm = await GuestVm.create({ onMutate: () => {} });
        vm.load(`globalThis.__HAS_FETCH__ = (typeof fetch !== 'undefined') || (typeof globalThis.fetch !== 'undefined');`);
        expect(vm.read<boolean>('__HAS_FETCH__')).toBe(false);
    });

    it('the ONLY injected globals are the frame bridge functions', async () => {
        vm = await GuestVm.create({ onMutate: () => {} });
        vm.load(`
            globalThis.__INJECTED__ = {
                mutate: typeof __frame_mutate,
                log: typeof __frame_log,
                sdk: typeof FrameRemote,
                dispatch: typeof globalThis.__frame_dispatch,
            };
        `);
        const injected = vm.read<Record<string, string>>('__INJECTED__');
        expect(injected.mutate).toBe('function');
        expect(injected.log).toBe('function');
        expect(injected.sdk).toBe('object');
        expect(injected.dispatch).toBe('function');
    });

    it('the probe result also reconciles through the real remote-dom receiver', async () => {
        const host = new HostReceiver({ dispatchToGuest: () => {} });
        vm = await GuestVm.create({ onMutate: (r) => host.applyMutations(r) });
        vm.load(CONTAINMENT_PROBE);

        // The painted tree is a Card > Stack > Text[] of "<target>: BLOCKED".
        const card = host.root.children[0];
        expect(card).toBeDefined();
        const painted = JSON.stringify(host.root);
        expect(painted).toContain('document: BLOCKED');
        expect(painted).toContain('fetch: BLOCKED');
        expect(painted).not.toContain('LEAKED');
    });
});
