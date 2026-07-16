import { describe, it, expect, afterEach } from 'vitest';
import { GuestVm } from '../src/guest/vm.js';
import { ESCAPE_PROBE } from './guests.js';

/**
 * A malicious guest attempting to escape the JS sandbox (prototype pollution /
 * global tamper) runs in a SEPARATE realm (its own QuickJS intrinsics). It can
 * pollute its own `Object.prototype`, but that is a different object than the host
 * realm's — the host is structurally unreachable.
 */
describe('escape — VM realm separation defeats prototype pollution / global tamper', () => {
    let vm: GuestVm | null = null;
    afterEach(() => {
        vm?.dispose();
        vm = null;
    });

    it('host realm Object.prototype is untouched after a polluting guest runs', async () => {
        // Baseline: host intrinsic is clean.
        expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
        expect((Array.prototype as Record<string, unknown>).polluted).toBeUndefined();

        vm = await GuestVm.create({ onMutate: () => {} });
        vm.load(ESCAPE_PROBE);

        // The pollution DID land inside the VM (proving it actually ran)...
        expect(vm.read<string>('__ESCAPE_MARKER__')).toBe('PWNED');

        // ...but the HOST realm's intrinsics are still clean.
        expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
        expect((Array.prototype as Record<string, unknown>).polluted).toBeUndefined();
        expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it('guest tampering with its own Function.prototype.call does not reach the host', async () => {
        const before = Function.prototype.call;
        vm = await GuestVm.create({ onMutate: () => {} });
        vm.load(ESCAPE_PROBE);
        // Host's Function.prototype.call is the same reference it always was.
        expect(Function.prototype.call).toBe(before);
    });

    it('two guests in separate VMs do not share pollution', async () => {
        const a = await GuestVm.create({ onMutate: () => {} });
        a.load(`Object.prototype.fromA = 1; globalThis.__M__ = ({}).fromA;`);
        expect(a.read<number>('__M__')).toBe(1);

        const b = await GuestVm.create({ onMutate: () => {} });
        b.load(`globalThis.__M__ = ({}).fromA;`);
        // B's realm never saw A's pollution (undefined normalizes to null over JSON).
        expect(b.read<unknown>('__M__')).toBeNull();

        a.dispose();
        b.dispose();
    });
});
