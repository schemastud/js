import type { CSSProperties } from 'react';
import { useEditShellMount } from './EditShellMount';

// ED-09 — the grammar palette, hoisted out of blockdoc's in-canvas button-row
// into the left shell pane. ONE candidate source (blockdoc's
// insertableCandidatesAt, ED-03), published on the mount's palette channel; this
// pane is one of its two RENDERERS (the in-canvas slash menu is the other,
// widget-owned). It renders the candidates browsably with affordance labels and
// issues "insert X at cursor" back through the channel — the widget executes the
// PM transaction. Only grammar-legal candidates are published, so the pane shows
// exactly what is insertable here.

// The candidate shape blockdoc publishes (structural — frame never imports
// blockdoc; the channel is typed `unknown[]`). Mirrors ED-03's InsertableCandidate.
interface Candidate {
    nodeType: string;
    category?: string | null;
    label?: string;
    arity?: { min: number; max: number | null } | null;
    edgeTarget?: { attr: string; target: string; pickMany: boolean } | null;
}

// Affordance labels derivable purely from the candidate fields (ED-03).
function affordances(candidate: Candidate): string[] {
    const out: string[] = [];

    if (candidate.arity && candidate.arity.max === 1) {
        out.push('max 1');
    }

    if (candidate.edgeTarget) {
        out.push(
            candidate.edgeTarget.pickMany
                ? `pick-many → ${candidate.edgeTarget.target}`
                : `→ ${candidate.edgeTarget.target}`,
        );
    }

    return out;
}

const PANE_STYLE: CSSProperties = { padding: 8, display: 'flex', flexDirection: 'column', gap: 4 };
const ITEM_STYLE: CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    padding: '6px 8px',
    border: '1px solid var(--stud-line)',
    borderRadius: 4,
    background: 'var(--stud-surface)',
    cursor: 'pointer',
    textAlign: 'left',
    font: 'inherit',
};
const AFFORDANCE_STYLE: CSSProperties = { fontSize: 11, color: 'var(--stud-ink-faint)' };
const EMPTY_STYLE: CSSProperties = { padding: 12, fontSize: 12, color: 'var(--stud-ink-faint)' };

export function PalettePane() {
    const mount = useEditShellMount();
    const candidates = mount.candidates as Candidate[];

    if (candidates.length === 0) {
        return (
            <div data-frame-region-stub="palette" style={EMPTY_STYLE}>
                Nothing insertable here
            </div>
        );
    }

    return (
        <div data-frame-palette="" style={PANE_STYLE}>
            {candidates.map((candidate, index) => (
                <button
                    key={`${candidate.nodeType}:${index}`}
                    type="button"
                    data-node-type={candidate.nodeType}
                    onClick={() => mount.insert(candidate)}
                    style={ITEM_STYLE}
                >
                    <span>{candidate.label ?? candidate.category ?? candidate.nodeType}</span>
                    {affordances(candidate).map((label) => (
                        <span key={label} data-affordance="" style={AFFORDANCE_STYLE}>
                            {label}
                        </span>
                    ))}
                </button>
            ))}
        </div>
    );
}
