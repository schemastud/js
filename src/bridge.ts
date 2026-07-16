/**
 * The end-to-end bridge: an isolated guest VM wired to a host receiver.
 *
 * This composes the two halves of the substrate. It is the shape used in the
 * automated tests (guest VM + host receiver in ONE process — the isolation is the
 * QuickJS realm, which holds regardless of Worker/origin). In the browser demo the
 * SAME two halves are split across the separate-origin Worker boundary (see
 * demo/), which adds the cross-site network property on top of the realm isolation.
 *
 * The data path:
 *   guest source --load--> QuickJS VM --mutate(records)--> HostReceiver
 *   HostReceiver --fire(handlerId, payload)--> VM.dispatchEvent --> guest re-render
 */
import { GuestVm, type GuestVmOptions } from './guest/vm.js';
import { HostReceiver } from './host/receiver.js';
import type { VmLimits } from './config.js';

export interface RemoteComponentBridgeOptions {
    limits?: Partial<VmLimits>;
    onLog?: GuestVmOptions['onLog'];
    /**
     * The scoped capability token the host minted for this guest (RCP-05). Forwarded to
     * the VM so a GRANTED component (RCP-06 manifest gate passed) can invoke its in-tier
     * brokered capabilities. Absent = the guest gets no capability surface.
     */
    capabilityToken?: GuestVmOptions['capabilityToken'];
    /**
     * The host broker a `FrameRemote.capability(name, args)` call routes through (RCP-05).
     * Absent = every capability call is refused in-VM (`no_broker`).
     */
    brokerCall?: GuestVmOptions['brokerCall'];
}

export class RemoteComponentBridge {
    private constructor(
        readonly host: HostReceiver,
        readonly vm: GuestVm,
    ) {}

    static async create(options: RemoteComponentBridgeOptions = {}): Promise<RemoteComponentBridge> {
        // The host fires events to the guest; captured lazily since the VM is
        // created after the host.
        let vmRef: GuestVm | null = null;
        const host = new HostReceiver({
            dispatchToGuest: (handlerId, payload) => vmRef?.dispatchEvent(handlerId, payload),
        });
        const vm = await GuestVm.create({
            limits: options.limits,
            onLog: options.onLog,
            onMutate: (records) => host.applyMutations(records),
            capabilityToken: options.capabilityToken,
            brokerCall: options.brokerCall,
        });
        vmRef = vm;
        return new RemoteComponentBridge(host, vm);
    }

    /** Load untrusted publisher source and paint its initial tree. */
    load(source: string): void {
        this.vm.load(source);
    }

    dispose(): void {
        this.vm.dispose();
    }
}
