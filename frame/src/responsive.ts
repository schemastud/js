// ED-11 — responsive collapse of the five-region shell, driven by **intent, not
// pixel breakpoints**. The intent order: the **canvas is inviolable** (always the
// last-standing full-bleed region); the **inspector holds longer than the
// palette** (editing the selected node is the active task); so the **palette
// yields first** (to an icon-rail), then both side panes become overlay drawers.
//
// The thresholds are derived from the regions' own minimum widths — "does the set
// still fit?" — not magic breakpoint numbers, so the ORDERING is the contract.

export type CollapseLevel = 0 | 1 | 2;

export interface CollapseModes {
    palette: 'pane' | 'rail' | 'drawer';
    inspector: 'pane' | 'drawer';
    canvasFullBleed: boolean;
}

// Region minimum widths (px). Canvas first, then inspector, then palette — the
// yield order falls out of which cumulative sum a width can still cover.
export const CANVAS_MIN = 360;
export const INSPECTOR_MIN = 280;
export const PALETTE_MIN = 180;

export function deriveCollapseLevel(width: number): CollapseLevel {
    if (width >= CANVAS_MIN + INSPECTOR_MIN + PALETTE_MIN) {
        return 0; // full 3-pane
    }

    if (width >= CANVAS_MIN + INSPECTOR_MIN) {
        return 1; // palette yields first (inspector still holds)
    }

    return 2; // both side panes → overlay drawers; canvas full-bleed
}

export function collapseModes(level: CollapseLevel): CollapseModes {
    switch (level) {
        case 0:
            return { palette: 'pane', inspector: 'pane', canvasFullBleed: false };
        case 1:
            return { palette: 'rail', inspector: 'pane', canvasFullBleed: false };
        default:
            return { palette: 'drawer', inspector: 'drawer', canvasFullBleed: true };
    }
}
