import { act, render, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createWidgetRegistry } from '@schemastud/seam';
import { useEditShellMount, useEditShellMountController, type EditShellMountValue } from '../src/EditShellMount';
import { WidgetSurface } from '../src/WidgetShell';

describe('EditShellMount — one handshake, five concerns (ED-05)', () => {
    it('selection channel carries a bare nodeId', () => {
        const { result } = renderHook(() => useEditShellMountController());

        expect(result.current.selectedNodeId).toBeNull();
        act(() => result.current.selectNode('node-1'));
        expect(result.current.selectedNodeId).toBe('node-1');
    });

    it('revealNode is a distinct verb from selectNode (imperative, no selection change)', () => {
        const { result } = renderHook(() => useEditShellMountController());
        const reveal = vi.fn();
        let unregister: () => void = () => {};

        act(() => {
            unregister = result.current.registerRevealHandler(reveal);
        });
        act(() => result.current.revealNode('node-2'));

        expect(reveal).toHaveBeenCalledWith('node-2');
        expect(result.current.selectedNodeId).toBeNull(); // reveal ≠ select

        act(() => unregister());
        act(() => result.current.revealNode('node-3'));
        expect(reveal).toHaveBeenCalledTimes(1); // unregistered handler no longer fires
    });

    it('commitBus flush drains every registered flush', async () => {
        const { result } = renderHook(() => useEditShellMountController());
        const drained: string[] = [];

        act(() => {
            result.current.registerFlush(() => {
                drained.push('a');
            });
            result.current.registerFlush(async () => {
                drained.push('b');
            });
        });
        await act(async () => {
            await result.current.flush();
        });

        expect(drained.sort()).toEqual(['a', 'b']);
    });

    it('dirty/saved state surfaces upward', () => {
        const { result } = renderHook(() => useEditShellMountController());

        expect(result.current.dirty).toBe(false);
        act(() => result.current.markDirty(true));
        expect(result.current.dirty).toBe(true);
    });

    it('palette channel: publishCandidates + insert seam', () => {
        const { result } = renderHook(() => useEditShellMountController());

        act(() => result.current.publishCandidates([{ nodeType: 'para' }]));
        expect(result.current.candidates).toEqual([{ nodeType: 'para' }]);

        const onInsert = vi.fn();
        act(() => {
            result.current.registerInsertHandler(onInsert);
        });
        act(() => result.current.insert({ nodeType: 'para' }));
        expect(onInsert).toHaveBeenCalledWith({ nodeType: 'para' });
    });

    it('node-attrs channel: getNode/setNodeAttrs delegate to registered access (seam)', () => {
        const { result } = renderHook(() => useEditShellMountController());

        // No access registered yet → seam defaults.
        expect(result.current.getNode('x')).toBeNull();

        const access = { getNode: vi.fn(() => ({ id: 'x' })), setNodeAttrs: vi.fn() };
        act(() => {
            result.current.registerNodeAccess(access);
        });

        expect(result.current.getNode('x')).toEqual({ id: 'x' });
        act(() => result.current.setNodeAttrs('x', { a: 1 }));
        expect(access.setNodeAttrs).toHaveBeenCalledWith('x', { a: 1 });
    });

    it('WidgetSurface provides the mount handshake to the mounted widget', () => {
        let seen: EditShellMountValue | null = null;
        function Widget() {
            seen = useEditShellMount();
            return <div data-testid="w" />;
        }
        const registry = createWidgetRegistry();
        registry.registerWidget('heavy', Widget);

        render(<WidgetSurface schema={{ type: 'object' }} widget="heavy" registry={registry} />);

        expect(seen).not.toBeNull();
        expect(typeof seen!.selectNode).toBe('function');
        expect(typeof seen!.flush).toBe('function');
    });
});
