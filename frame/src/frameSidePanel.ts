import type { ReactNode } from 'react';
import { create } from 'zustand';

/**
 * A single live side-panel entry — the payload a deep `MasterDetail presentation="sheet"`
 * (via `FramePrimitives.SidePanel`) publishes for the shell-level overlay to render.
 */
export interface FrameSidePanelEntry {
    /** Stable per-mount id (the publishing SidePanel owns it for its lifetime). */
    id: string;
    open: boolean;
    title?: ReactNode;
    children: ReactNode;
    /** Route the close back to the publisher's controlled `onOpenChange`. */
    onOpenChange: (open: boolean) => void;
}

interface FrameSidePanelState {
    /** Ordered stack of live side-panels (later = on top; supports cascade sheets). */
    panels: FrameSidePanelEntry[];
    /** Publish/refresh a panel's payload (idempotent by id). */
    publish: (entry: FrameSidePanelEntry) => void;
    /** Remove a panel entirely (on unmount of the publishing SidePanel). */
    remove: (id: string) => void;
}

/**
 * The bridge between a deep-tree `FramePrimitives.SidePanel` invocation and the single
 * host-owned overlay contribution in the app shell. Mirrors the `useLineageDrawer` /
 * `useVersionsDrawer` pattern: the deep component only *publishes* its `{open,title,children}`
 * here; a host-owned overlay — contributed **once** into the mainframe `overlay`
 * slot — is what actually renders it. So the sheet detail routes through the mainframe
 * overlay slot, never nesting a second portal or mainframe.
 *
 * The bridge is manifest-aware frame machinery (the deep-tree → shell-overlay publish/remove
 * seam), so it lives in `@schemastud/frame`; the host keeps only the overlay contribution
 * that reads from this store and renders it into its own portal/sheet.
 */
export const useFrameSidePanelStore = create<FrameSidePanelState>((set) => ({
    panels: [],
    publish: (entry) =>
        set((s) => {
            const idx = s.panels.findIndex((p) => p.id === entry.id);
            if (idx === -1) return { panels: [...s.panels, entry] };
            const next = s.panels.slice();
            next[idx] = entry;
            return { panels: next };
        }),
    remove: (id) => set((s) => ({ panels: s.panels.filter((p) => p.id !== id) })),
}));
