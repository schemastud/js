import type { CSSProperties } from 'react';
import { useEditShellMount } from './EditShellMount';

// ED-10 — a passive Saved / Saving… / Unsaved pill sourced from the mount's
// dirty/saving state (which the editor drives off its CommitController). It is
// display-only; persistence is autosave by default, so the pill just reports.

const BASE: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '2px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 500,
};

const BY_STATE: Record<string, { label: string; style: CSSProperties }> = {
    saved: { label: 'Saved', style: { background: '#f0fdf4', color: '#15803d' } },
    saving: { label: 'Saving…', style: { background: '#fefce8', color: '#a16207' } },
    unsaved: { label: 'Unsaved', style: { background: '#fef2f2', color: '#b91c1c' } },
};

export function SavePill() {
    const mount = useEditShellMount();
    const state = mount.saving ? 'saving' : mount.dirty ? 'unsaved' : 'saved';
    const { label, style } = BY_STATE[state];

    return (
        <span data-frame-save-pill={state} style={{ ...BASE, ...style }}>
            {label}
        </span>
    );
}
