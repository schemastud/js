import { useUiMessages } from './messages';
import * as React from 'react';
import { Button } from './button';
import { MotionFaces } from './motion';

/**
 * B1 (owner-review 18, ruled 2026-11-02) — a Save button that holds its width while it saves.
 * Both labels sit in one grid cell (`motion.css` `.motion-faces`), so `Save` → `Saving…` no
 * longer reflows the footer; the active label fades up on the feedback token. Its accessible
 * name is the visible label only.
 *
 * Unavailable (saving, or `disabled`) is `aria-disabled` plus a guarded click, never native
 * `disabled`: a natively disabled button drops the focus it holds to `<body>` the moment the save
 * starts (and again when a saved form disables it), so a keyboard user loses their place and a
 * screen reader hears nothing. Kept focusable, it announces "Saving…, dimmed, busy" (`aria-busy`
 * while saving), a click or Enter does nothing, and a `type="submit"` SaveButton does not submit
 * its form (the guarded click cancels the submission).
 */
export function SaveButton({
    saving,
    label: labelProp,
    savingLabel: savingLabelProp,
    disabled,
    onClick,
    ...props
}: Omit<React.ComponentProps<typeof Button>, 'children'> & {
    saving: boolean;
    label?: React.ReactNode;
    savingLabel?: React.ReactNode;
}) {
    const { t } = useUiMessages();
    const savingLabel = savingLabelProp === undefined ? t("schemastud-ui::messages.saving") : savingLabelProp;
    const label = labelProp === undefined ? t("schemastud-ui::messages.save") : labelProp;
    const unavailable = Boolean(disabled || saving);
    return (
        <Button
            {...props}
            aria-disabled={unavailable || undefined}
            aria-busy={saving || undefined}
            onClick={(event) => {
                if (unavailable) {
                    event.preventDefault();
                    return;
                }
                onClick?.(event);
            }}
        >
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
