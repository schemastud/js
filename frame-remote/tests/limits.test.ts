import { describe, it, expect, afterEach } from 'vitest';
import { GuestVm, GuestFailure } from '../src/guest/vm.js';
import { INFINITE_LOOP, MEMORY_HOG } from './guests.js';

/**
 * A runaway guest must be bounded by the VM, never trusted to terminate. The
 * deadline interrupt kills an infinite loop; the memory ceiling caps an unbounded
 * allocation. Both surface as a typed GuestFailure, never a host hang or host OOM.
 */
describe('limits — a runaway guest is bounded by the substrate', () => {
    let vm: GuestVm | null = null;
    afterEach(() => {
        vm?.dispose();
        vm = null;
    });

    it('an infinite loop is interrupted by the deadline (does not hang the host)', async () => {
        vm = await GuestVm.create({ limits: { deadlineMs: 200 }, onMutate: () => {} });

        const started = Date.now();
        let failure: GuestFailure | null = null;
        try {
            vm.load(INFINITE_LOOP);
        } catch (err) {
            failure = err as GuestFailure;
        }
        const elapsed = Date.now() - started;

        expect(failure).toBeInstanceOf(GuestFailure);
        expect(failure!.kind).toBe('interrupt');
        // It actually returned control near the deadline, not after spinning forever.
        expect(elapsed).toBeLessThan(5000);
    });

    it('an unbounded allocation hits the memory cap (does not OOM the host)', async () => {
        vm = await GuestVm.create({
            // Small cap + generous deadline so we hit MEMORY, not the interrupt.
            limits: { memoryLimitBytes: 1 * 1024 * 1024, deadlineMs: 10000 },
            onMutate: () => {},
        });

        let failure: GuestFailure | null = null;
        try {
            vm.load(MEMORY_HOG);
        } catch (err) {
            failure = err as GuestFailure;
        }

        expect(failure).toBeInstanceOf(GuestFailure);
        expect(failure!.kind).toBe('memory');
    });

    it('a well-behaved guest under the same limits runs to completion', async () => {
        vm = await GuestVm.create({ limits: { deadlineMs: 1000 }, onMutate: () => {} });
        expect(() => vm!.load(`globalThis.__OK__ = 1 + 1;`)).not.toThrow();
        expect(vm.read<number>('__OK__')).toBe(2);
    });

    it('the VM survives a killed guest and can still be disposed cleanly', async () => {
        vm = await GuestVm.create({ limits: { deadlineMs: 150 }, onMutate: () => {} });
        expect(() => vm!.load(INFINITE_LOOP)).toThrow(GuestFailure);
        // dispose must not throw even after an interrupted evaluation.
        expect(() => vm!.dispose()).not.toThrow();
        vm = null;
    });
});
