/**
 * The wire protocol between the isolated guest VM and the trusted host.
 *
 * The *tree* half of the protocol is not ours: it is the real `@remote-dom/core`
 * mutation stream (`RemoteMutationRecord[]` flowing guest→host through a
 * `RemoteConnection`). We only add the tiny back-channel remote-dom leaves to the
 * embedder: how a host DOM event reaches the guest.
 *
 * Events cannot cross as functions. A real function cannot be serialized across
 * the Worker boundary, and certainly cannot cross the QuickJS WASM boundary. So an
 * event listener is represented on the wire as a **handler id** (a string the guest
 * minted); when the host paints a component and a real browser event fires, the
 * host sends this message back to the guest, which looks the id up in its own
 * in-VM handler registry and re-renders. This is the spike's `fire(handlerId,
 * payload)` shape, now riding a real remote-dom tree.
 */
import type { RemoteMutationRecord } from '@remote-dom/core';

export type { RemoteMutationRecord };

/**
 * The event-listener value the guest writes onto a remote element property (via a
 * `UPDATE_PROPERTY_TYPE_EVENT_LISTENER` mutation). It is data, never a function —
 * just the id the host echoes back when the corresponding browser event fires.
 */
export interface RemoteEventListenerRef {
    readonly __frameRemoteHandler: string;
}

export function eventRef(handlerId: string): RemoteEventListenerRef {
    return { __frameRemoteHandler: handlerId };
}

export function isEventRef(value: unknown): value is RemoteEventListenerRef {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as RemoteEventListenerRef).__frameRemoteHandler === 'string'
    );
}

/**
 * Messages the WORKER exchanges with the host page across the (separate-origin)
 * Worker boundary. The mutation stream is host-bound; the event dispatch is
 * guest-bound. Boot/limit signals let the host surface substrate state.
 */
export type WorkerToHostMessage =
    | { type: 'ready' }
    | { type: 'mutate'; records: readonly RemoteMutationRecord[] }
    | { type: 'error'; kind: GuestFailureKind; message: string };

export type HostToWorkerMessage =
    | { type: 'load'; source: string }
    | { type: 'event'; handlerId: string; payload: unknown };

/**
 * How a guest evaluation ended. `interrupt`/`memory` are the substrate killing a
 * runaway guest; `throw` is ordinary guest code throwing. The host treats all three
 * as "the guest failed", but the kind is reported for auditing.
 */
export type GuestFailureKind = 'throw' | 'interrupt' | 'memory' | 'load';
