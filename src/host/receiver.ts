/**
 * The host-side receiver: the trusted end of the remote-dom connection.
 *
 * It wraps a real `@remote-dom/core` `RemoteReceiver` (the DOM-agnostic one, so it
 * works in Node/jsdom and in a real browser identically). The guest's mutation
 * stream flows in through `receiver.connection.mutate(...)`; the reconciled tree is
 * read from `receiver.root`. Events flow back OUT through the caller-supplied
 * `dispatchToGuest` — never a function across the wire, only a handler id + JSON
 * payload (see protocol.ts).
 *
 * This class is deliberately framework-agnostic: it exposes the plain receiver tree
 * + a subscribe hook + a `fire(...)` back-channel. The React renderer (render.tsx)
 * sits on top; a non-React host could paint the same tree.
 */
import { RemoteReceiver } from '@remote-dom/core/receivers';
import type {
    RemoteReceiverElement,
    RemoteReceiverRoot,
    RemoteReceiverNode,
} from '@remote-dom/core/receivers';
import type { RemoteMutationRecord } from '../protocol.js';
import { isEventRef } from '../protocol.js';

export type { RemoteReceiverElement, RemoteReceiverRoot, RemoteReceiverNode };

export interface HostReceiverOptions {
    /**
     * Called when a painted component fires a browser event. The embedder forwards
     * this to the guest VM (`GuestVm.dispatchEvent`). The handler id is the value
     * the guest stored on the element's event listener; the payload is host-minted
     * (e.g. `{ value }` for an input).
     */
    dispatchToGuest: (handlerId: string, payload: unknown) => void;
}

export class HostReceiver {
    readonly receiver: RemoteReceiver;

    constructor(private readonly options: HostReceiverOptions) {
        this.receiver = new RemoteReceiver();
    }

    /** The plain-JS root of the reconciled remote tree. */
    get root(): RemoteReceiverRoot {
        return this.receiver.root;
    }

    /**
     * Apply a batch of guest mutation records. This is the single inbound seam from
     * the isolated guest — wire it to the VM's `onMutate`.
     */
    applyMutations(records: readonly RemoteMutationRecord[]): void {
        this.receiver.connection.mutate(records);
    }

    /**
     * Subscribe to changes on the root's children (top-level tree). Returns an
     * unsubscribe function.
     */
    subscribeRoot(onChange: (root: RemoteReceiverRoot) => void): () => void {
        const controller = new AbortController();
        this.receiver.subscribe(this.receiver.root, onChange, { signal: controller.signal });
        return () => controller.abort();
    }

    subscribeNode(node: { id: string }, onChange: (node: RemoteReceiverNode) => void): () => void {
        const controller = new AbortController();
        this.receiver.subscribe(node, onChange, { signal: controller.signal });
        return () => controller.abort();
    }

    /**
     * Fire an event back to the guest by handler id. `listenerValue` is whatever the
     * guest wrote as the event-listener property — we accept the `{ __frameRemoteHandler }`
     * ref shape and drop anything else (a guest that sent a non-ref is simply inert).
     */
    fire(listenerValue: unknown, payload: unknown): void {
        if (!isEventRef(listenerValue)) return;
        this.options.dispatchToGuest(listenerValue.__frameRemoteHandler, payload);
    }
}
