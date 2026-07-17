import type { CSSProperties } from 'react';
import { useEditShellMount } from './EditShellMount';

// ED-13 F6 — absent-required-category chrome. When a parent is short of a
// required category, no node exists (the oracle attaches the incompleteness to
// the parent id), so this is **pure shell chrome — no phantom PM node**: a
// "Missing: N ⟨category⟩ [+ Add]" card per deficit, read from the conformance
// channel's requiredSlots (blockdoc B7). `[+ Add]` is a scoped renderer of
// ED-09's one insert command — it issues an insert of the short category at the
// parent through the palette channel, which the widget executes.

const CARD: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    margin: '4px 0',
    border: '1px dashed #d4d4d8',
    borderRadius: 6,
    background: '#fafafa',
    color: '#71717a',
    fontSize: 12,
};

export function MissingSlots() {
    const mount = useEditShellMount();
    const slots = mount.conformance?.requiredSlots ?? [];

    if (slots.length === 0) {
        return null;
    }

    return (
        <div data-frame-missing-slots="">
            {slots.map((slot) => {
                const missing = Math.max(0, slot.min - slot.filled);

                return (
                    <div
                        key={`${slot.parentId}:${slot.category}`}
                        data-missing-slot=""
                        data-parent-id={slot.parentId}
                        data-category={slot.category}
                        style={CARD}
                    >
                        <span>
                            Missing: {missing} {slot.category}
                        </span>
                        <button
                            type="button"
                            data-missing-add=""
                            onClick={() =>
                                mount.insert({ category: slot.category, parentId: slot.parentId, scoped: true })
                            }
                        >
                            + Add
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
