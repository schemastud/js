import * as React from 'react';
import { Button } from './button';
import { MotionFaces } from './motion';

/**
 * B1 (owner-review 18, ruled 2026-11-02) — a Save button that holds its width while it saves.
 * Both labels sit in one grid cell (`motion.css` `.motion-faces`), so `Save` → `Saving…` no
 * longer reflows the footer; the active label fades up on the feedback token. The button is
 * disabled and `aria-busy` while saving, and its accessible name is the visible label only.
 */
export function SaveButton({
    saving,
    label = 'Save',
    savingLabel = 'Saving…',
    disabled,
    ...props
}: Omit<React.ComponentProps<typeof Button>, 'children'> & {
    saving: boolean;
    label?: React.ReactNode;
    savingLabel?: React.ReactNode;
}) {
    return (
        <Button {...props} disabled={disabled || saving} aria-busy={saving || undefined}>
            <MotionFaces
                active={saving ? 'saving' : 'idle'}
                faces={[
                    { key: 'idle', node: label },
                    { key: 'saving', node: savingLabel },
                ]}
            />
        </Button>
    );
}
