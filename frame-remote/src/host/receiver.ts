/**
 * The host-side receiver: the trusted end of the remote-dom connection.
 *
 * It wraps a real `@remote-dom/core` `RemoteReceiver` (the DOM-agnostic one, so it
 * works in Node/jsdom and in a real browser identically). The guest's mutation
 * stream flows in through `receiver.connection.mutate(...)`; the reconciled tree is
 * read from `receiver.root`. Events flow back OUT through the caller-supplied
 * `dispatchToGuest` — never a function across the wire, only a handler id + JSON
 * payload (see protocol.ts). On the way IN, each guest handler ref becomes a host-side
 * function before the records reach the receiver, which (since @remote-dom/core 1.12.1)
 * stores only function listeners.
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

/** `@remote-dom/core`'s record types and the event update kind, as the guest runtime emits them (runtime.ts). */
const MUTATION_INSERT_CHILD = 0;
const MUTATION_UPDATE_PROPERTY = 3;
const UPDATE_PROPERTY_TYPE_EVENT = 3;

/**
 * A host-side event listener. Since `@remote-dom/core` 1.12.1 a `RemoteReceiver` accepts only a function (or
 * nullish) as a listener. The guest still sends a `{ __frameRemoteHandler }` ref across the isolation boundary (no
 * function crosses it); the host turns each ref into one of these, which dispatches to the guest by that handler id.
 */
type HostListener = (payload?: unknown) => void;

export class HostReceiver {
    readonly receiver: RemoteReceiver;
    /** One listener per handler id, so a re-render keeps each listener's identity. */
    private readonly listeners = new Map<string, HostListener>();

    constructor(private readonly options: HostReceiverOptions) {
        this.receiver = new RemoteReceiver();
    }

    private listenerFor(handlerId: string): HostListener {
        let listener = this.listeners.get(handlerId);
        if (!listener) {
            listener = (payload?: unknown) => this.options.dispatchToGuest(handlerId, payload);
            this.listeners.set(handlerId, listener);
        }
        return listener;
    }

    /** A listener value as the receiver may hold it: a guest ref becomes a host listener; anything else is dropped. */
    private hostListenerValue(value: unknown): HostListener | undefined {
        return isEventRef(value) ? this.listenerFor(value.__frameRemoteHandler) : undefined;
    }

    /** A serialized node with every element's guest refs turned into host listeners, its children included. */
    private hostNode(node: unknown): unknown {
        if (!node || typeof node !== 'object') return node;
        const serialized = node as { eventListeners?: Record<string, unknown>; children?: unknown[] };
        const eventListeners = serialized.eventListeners
            ? Object.fromEntries(
                  Object.entries(serialized.eventListeners).flatMap(([name, value]) => {
                      const listener = this.hostListenerValue(value);
                      return listener ? [[name, listener]] : [];
                  }),
              )
            : undefined;
        return {
            ...serialized,
            ...(eventListeners ? { eventListeners } : {}),
            ...(Array.isArray(serialized.children) ? { children: serialized.children.map((child) => this.hostNode(child)) } : {}),
        };
    }

    /** A guest record as the receiver may take it: listener refs in an inserted subtree or an event update become functions. */
    private hostRecord(record: RemoteMutationRecord): RemoteMutationRecord {
        const [type] = record as unknown as [number, ...unknown[]];
        if (type === MUTATION_INSERT_CHILD) {
            const [, parentId, child, index] = record as unknown as [number, string, unknown, number];
            return [type, parentId, this.hostNode(child), index] as unknown as RemoteMutationRecord;
        }
        if (type === MUTATION_UPDATE_PROPERTY) {
            const [, id, name, value, updateType] = record as unknown as [number, string, string, unknown, number];
            if (updateType === UPDATE_PROPERTY_TYPE_EVENT) {
                return [type, id, name, this.hostListenerValue(value), updateType] as unknown as RemoteMutationRecord;
            }
        }
        return record;
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
        this.receiver.connection.mutate(records.map((record) => this.hostRecord(record)));
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
     * Fire an event back to the guest. `listenerValue` is the element's stored listener: the host listener
     * `applyMutations` made from the guest's `{ __frameRemoteHandler }` ref, which dispatches by that handler id. A
     * bare ref still dispatches; anything else is inert (a guest that sent a non-ref never had a listener stored).
     */
    fire(listenerValue: unknown, payload: unknown): void {
        if (typeof listenerValue === 'function') {
            (listenerValue as HostListener)(payload);
            return;
        }
        if (isEventRef(listenerValue)) this.options.dispatchToGuest(listenerValue.__frameRemoteHandler, payload);
    }
}
