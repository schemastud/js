import { describe, expect, it, beforeEach } from 'vitest';
import { useFrameSidePanelStore, type FrameSidePanelEntry } from '../src/frameSidePanel';

/**
 * The store is the bridge a deep-tree `FramePrimitives.SidePanel` uses to route its sheet
 * detail into the single host-owned overlay contribution. These cover the load-bearing
 * mechanism: publish is idempotent-by-id (refresh, not duplicate), ordering is preserved
 * (cascade sheets stack), and unmount retracts — so the once-contributed host overlay in
 * the mainframe `overlay` slot renders exactly the live panels.
 */
function entry(id: string, over: Partial<FrameSidePanelEntry> = {}): FrameSidePanelEntry {
    return { id, open: true, title: id, children: null, onOpenChange: () => {}, ...over };
}

describe('useFrameSidePanelStore', () => {
    beforeEach(() => useFrameSidePanelStore.setState({ panels: [] }));

    it('publishes a panel the overlay can read', () => {
        useFrameSidePanelStore.getState().publish(entry('a', { title: 'Detail A' }));
        const { panels } = useFrameSidePanelStore.getState();
        expect(panels).toHaveLength(1);
        expect(panels[0]).toMatchObject({ id: 'a', open: true, title: 'Detail A' });
    });

    it('refreshes in place by id (no duplicate) — a re-publish updates open/children', () => {
        const s = useFrameSidePanelStore.getState();
        s.publish(entry('a', { open: true }));
        s.publish(entry('a', { open: false }));
        const { panels } = useFrameSidePanelStore.getState();
        expect(panels).toHaveLength(1);
        expect(panels[0].open).toBe(false);
    });

    it('preserves publish order so cascade sheets stack (later on top)', () => {
        const s = useFrameSidePanelStore.getState();
        s.publish(entry('a'));
        s.publish(entry('b'));
        expect(useFrameSidePanelStore.getState().panels.map((p) => p.id)).toEqual(['a', 'b']);
    });

    it('retracts the entry on remove (SidePanel unmount) — overlay stops rendering it', () => {
        const s = useFrameSidePanelStore.getState();
        s.publish(entry('a'));
        s.publish(entry('b'));
        s.remove('a');
        expect(useFrameSidePanelStore.getState().panels.map((p) => p.id)).toEqual(['b']);
    });
});
