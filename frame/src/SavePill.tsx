import { useFrameMessages } from './messages';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useEditShellMount } from './EditShellMount';

// ED-10 — a passive Saved / Saving… / Unsaved pill sourced from the mount's
// dirty/saving state (which the editor drives off its CommitController). It is
// display-only; persistence is autosave by default, so the pill just reports.
//
// B1 (owner-review 18, ruled 2026-11-02) — a steady pill: every face is stacked in one
// grid cell (`@schemastud/ui/motion.css` `.motion-faces`), so the widest label holds the
// width and the active one fades up on the feedback token instead of swapping in place.
// A settled save is green for a beat (`FRESH_MS`), then rests neutral, so green means
// "that just worked" rather than sitting on every clean record. The faces are
// aria-hidden; one polite status region carries the label.

const BASE: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifySelf: 'end',
    gap: 6,
    padding: '2px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: 'nowrap',
};

const SR_ONLY: CSSProperties = {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
};

/** How long a just-settled save stays green before it rests neutral. */
const FRESH_MS = 1400;

type Face = 'saved' | 'rest' | 'saving' | 'unsaved';

const FACES: Record<Face, { style: CSSProperties }> = {
    saved: { style: { background: 'var(--stud-success-tint)', color: 'var(--stud-success)' } },
    rest: {

        style: { background: 'var(--stud-muted, var(--muted))', color: 'var(--stud-muted-foreground, var(--muted-foreground))' },
    },
    saving: { style: { background: 'var(--stud-warning-tint)', color: 'var(--stud-warning)' } },
    unsaved: { style: { background: 'var(--stud-danger-tint)', color: 'var(--stud-danger)' } },
};

const ORDER: readonly Face[] = ['saved', 'rest', 'saving', 'unsaved'];

export function SavePill() {
    const { t } = useFrameMessages();
    const labels: Record<Face, string> = { saved: t("schemastud-frame::messages.saved"), rest: t("schemastud-frame::messages.saved"), saving: t("schemastud-frame::messages.saving"), unsaved: t("schemastud-frame::messages.unsaved") };
    const mount = useEditShellMount();
    const state = mount.saving ? 'saving' : mount.dirty ? 'unsaved' : 'saved';

    // Fresh only on the transition saving → saved, never on a clean open.
    const [fresh, setFresh] = useState(false);
    const previous = useRef(state);
    useEffect(() => {
        const was = previous.current;
        previous.current = state;
        if (state !== 'saved') {
            setFresh(false);
            return;
        }
        if (was !== 'saving') return;
        setFresh(true);
        const timer = window.setTimeout(() => setFresh(false), FRESH_MS);
        return () => window.clearTimeout(timer);
    }, [state]);

    const face: Face = state === 'saved' ? (fresh ? 'saved' : 'rest') : state;

    return (
        <span data-frame-save-pill={state} className="motion-faces" style={{ display: 'inline-grid', position: 'relative' }}>
            {ORDER.map((f) => (
                <span
                    key={f}
                    className="motion-face"
                    data-face={f}
                    data-on={f === face}
                    aria-hidden
                    // Stacking and hiding are inline, so a host without motion.css still shows one face.
                    style={{
                        ...BASE,
                        ...FACES[f].style,
                        gridArea: '1 / 1',
                        ...(f === face ? null : { opacity: 0, pointerEvents: 'none' as const }),
                    }}
                >
                    {labels[f]}
                </span>
            ))}
            <span role="status" aria-live="polite" style={SR_ONLY}>
                {labels[face]}
            </span>
        </span>
    );
}
