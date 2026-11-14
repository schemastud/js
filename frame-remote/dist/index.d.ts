import { G as GuestVm, V as VmLimits, a as GuestVmOptions } from './index-CjsBi2AG.js';
export { D as DEFAULT_LIMITS, b as GUEST_RUNTIME_SOURCE, c as GuestFailure, d as GuestFailureKind, H as HostToWorkerMessage, R as RemoteEventListenerRef, S as SANDBOX_ORIGIN, W as WorkerToHostMessage, e as eventRef, i as isEventRef } from './index-CjsBi2AG.js';
import { HostReceiver } from './host.js';
export { BlockVocabulary, DEFAULT_ALLOWLIST, DEFAULT_BLOCK_VOCABULARY, HostComponent, HostReceiverOptions, RemoteSurface, RemoteSurfaceProps, RenderContext, RenderTreeOptions, VOCABULARY_MAJOR, VOCABULARY_VERSION, createBlockVocabulary, registerBlock, renderRemoteTree } from './host.js';
export { c as BLOCK_TYPES, a as BlockProps, B as BlockType, d as CAPABILITY_NAMES, C as CapabilityName, b as ComponentManifest, E as EvaluateManifestOptions, H as HandlerProp, L as LoadDecision, e as LoadDecisionKind, f as TIER_CAPABILITIES, T as TrustTier, g as evaluateManifest, i as isKnownCapability, r as readManifest, t as tierGrants } from './manifest-DGhDZotE.js';
export { RemoteMutationRecord } from '@remote-dom/core';
export { RemoteReceiverElement, RemoteReceiverNode, RemoteReceiverRoot } from '@remote-dom/core/receivers';
import 'react';
import '@schemastud/seam';

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

interface RemoteComponentBridgeOptions {
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
declare class RemoteComponentBridge {
    readonly host: HostReceiver;
    readonly vm: GuestVm;
    private constructor();
    static create(options?: RemoteComponentBridgeOptions): Promise<RemoteComponentBridge>;
    /** Load untrusted publisher source and paint its initial tree. */
    load(source: string): void;
    dispose(): void;
}

export { GuestVm, GuestVmOptions, HostReceiver, RemoteComponentBridge, type RemoteComponentBridgeOptions, VmLimits };
