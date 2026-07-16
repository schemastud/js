import { useFrameInjection } from '../context';
import type { EditSlots, FormMode, SaveBarSlotProps } from '../types';

/**
 * shadcn-flavored edit slots. Deliberately NOT FormBody (already themed by seam's
 * ShadcnTheme) or Container (the host owns its Sheet/Dialog) — only the two chrome
 * slots the plain defaults leave bare: the mode Toggle and the SaveBar.
 */

export function ShadcnToggle({
    value,
    onChange,
}: {
    value: FormMode;
    onChange: (m: FormMode) => void;
}) {
    return (
        <div
            data-frame-slot="Toggle"
            role="radiogroup"
            aria-label="Form mode"
            className="mb-4 inline-flex rounded-md border border-border bg-muted p-0.5 text-sm"
        >
            {(['splicewire', 'raw'] as FormMode[]).map((mode) => (
                <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={value === mode}
                    onClick={() => onChange(mode)}
                    className={`rounded px-3 py-1 capitalize transition-colors ${
                        value === mode
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    {mode}
                </button>
            ))}
        </div>
    );
}

export function ShadcnSaveBar({ saving, readOnly, onSave, onCancel }: SaveBarSlotProps) {
    const { primitives } = useFrameInjection();
    const { Button } = primitives;
    return (
        <div
            data-frame-slot="SaveBar"
            className="mt-6 flex justify-end gap-2 border-t border-border pt-4"
        >
            {onCancel ? (
                <Button type="button" variant="ghost" onClick={onCancel} data-frame-action="cancel">
                    Cancel
                </Button>
            ) : null}
            {!readOnly ? (
                <Button type="button" disabled={saving} onClick={onSave} data-frame-action="save">
                    {saving ? 'Saving…' : 'Save'}
                </Button>
            ) : null}
        </div>
    );
}

/** Spread into an EditShell's `slots` for a shadcn-native editor; override keys after. */
export const shadcnEditSlots = {
    Toggle: ShadcnToggle,
    SaveBar: ShadcnSaveBar,
} satisfies Partial<EditSlots>;
