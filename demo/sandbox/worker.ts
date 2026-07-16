/**
 * The SANDBOX-ORIGIN worker. This file is served from `SANDBOX_ORIGIN` (origin B),
 * a DIFFERENT registrable site than the host page (origin A). Hosting the QuickJS
 * VM here is what makes the guest's network cross-site: any `fetch` the guest could
 * make (if a fetch capability were ever injected) originates from origin B, so the
 * browser attaches NO first-party cookie of origin A.
 *
 * For THIS ticket the worker injects ONLY the tree-building mutate bridge — NO fetch
 * capability. The temporary cross-site probe below is gated behind an explicit flag
 * and exists solely for the manual browser demonstration in VERIFY.md.
 */
import { GuestVm } from '../../src/guest/vm.js';
import type { HostToWorkerMessage, WorkerToHostMessage } from '../../src/protocol.js';

let vm: GuestVm | null = null;

function post(msg: WorkerToHostMessage) {
    (self as unknown as Worker).postMessage(msg);
}

self.onmessage = async (event: MessageEvent<HostToWorkerMessage>) => {
    const msg = event.data;

    if (msg.type === 'load') {
        vm?.dispose();
        vm = await GuestVm.create({
            onMutate: (records) => post({ type: 'mutate', records }),
            onLog: (m) => console.log('[guest]', m),
        });
        try {
            vm.load(msg.source);
            post({ type: 'ready' });
        } catch (err) {
            const failure = err as { kind?: WorkerToHostMessage extends { kind: infer K } ? K : never; message: string };
            post({ type: 'error', kind: (failure.kind as never) ?? 'throw', message: failure.message });
        }
        return;
    }

    if (msg.type === 'event') {
        try {
            vm?.dispatchEvent(msg.handlerId, msg.payload);
        } catch (err) {
            post({ type: 'error', kind: 'throw', message: (err as Error).message });
        }
        return;
    }
};
