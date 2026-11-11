import { describe, expect, it, vi } from 'vitest';
import { HostReceiver } from '../src/host/receiver';
import type { RemoteMutationRecord } from '../src/protocol';

/**
 * The host turns the guest's handler refs into function listeners (frame-remote 0.1.2, for @remote-dom/core 1.12):
 * since 1.12.1 a RemoteReceiver stores only a function (or nullish) as a listener, and the guest still sends
 * `{ __frameRemoteHandler: id }` across the isolation boundary. The records below are the shapes the guest runtime
 * emits (src/guest/runtime.ts): INSERT_CHILD = [0, parentId, child, index], UPDATE_PROPERTY = [3, id, name, value, 3].
 */
const ROOT = '~';
const ref = (id: string) => ({ __frameRemoteHandler: id });
const element = (id: string, eventListeners: Record<string, unknown>, children: unknown[] = []) => ({
    id,
    type: 1,
    element: 'Button',
    properties: { label: 'Go' },
    eventListeners,
    children,
});
const insert = (child: unknown): RemoteMutationRecord => [0, ROOT, child, 0] as unknown as RemoteMutationRecord;

function host() {
    const dispatchToGuest = vi.fn();
    return { dispatchToGuest, receiver: new HostReceiver({ dispatchToGuest }) };
}
const childAt = (r: HostReceiver, ...path: number[]) =>
    path.reduce<any>((node, i) => node.children[i], r.root) as { eventListeners: Record<string, unknown> };

describe('HostReceiver: guest handler refs become host listeners', () => {
    it('stores a function for every ref in an inserted subtree, and firing it dispatches by the handler id', () => {
        const { receiver, dispatchToGuest } = host();
        receiver.applyMutations([insert(element('1', { onClick: ref('1:onClick') }, [element('2', { onInput: ref('2:onInput') })]))]);

        const outer = childAt(receiver, 0).eventListeners.onClick;
        const inner = childAt(receiver, 0, 0).eventListeners.onInput;
        expect(typeof outer).toBe('function');
        expect(typeof inner).toBe('function');

        receiver.fire(outer, { n: 1 });
        receiver.fire(inner, { value: 'x' });
        expect(dispatchToGuest.mock.calls).toEqual([
            ['1:onClick', { n: 1 }],
            ['2:onInput', { value: 'x' }],
        ]);
    });

    it('drops a listener value that is not a ref, rather than handing it to the receiver', () => {
        const { receiver, dispatchToGuest } = host();
        expect(() => receiver.applyMutations([insert(element('1', { onClick: 'alert(1)', onFocus: { not: 'a ref' } }))])).not.toThrow();
        expect(childAt(receiver, 0).eventListeners).toEqual({});
        receiver.fire('alert(1)', {});
        expect(dispatchToGuest).not.toHaveBeenCalled();
    });

    it('keeps one listener per handler id across re-renders', () => {
        const { receiver } = host();
        receiver.applyMutations([insert(element('1', { onClick: ref('1:onClick') }))]);
        const first = childAt(receiver, 0).eventListeners.onClick;
        receiver.applyMutations([[1, ROOT, 0] as unknown as RemoteMutationRecord, insert(element('1', { onClick: ref('1:onClick') }))]);
        expect(childAt(receiver, 0).eventListeners.onClick).toBe(first);
    });

    it('converts a ref sent as an event update', () => {
        const { receiver, dispatchToGuest } = host();
        receiver.applyMutations([insert(element('1', {}))]);
        receiver.applyMutations([[3, '1', 'onClick', ref('1:onClick'), 3] as unknown as RemoteMutationRecord]);
        const listener = childAt(receiver, 0).eventListeners.onClick;
        expect(typeof listener).toBe('function');
        receiver.fire(listener, {});
        expect(dispatchToGuest).toHaveBeenCalledWith('1:onClick', {});
    });
});
