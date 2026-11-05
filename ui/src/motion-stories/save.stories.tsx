import type { Meta, StoryObj } from '@storybook/react-vite';
import * as React from 'react';
import { Input } from '../input';
import { Label } from '../label';
import { MotionFaces } from '../motion';
import { SaveButton } from '../save-button';

/**
 * Motion/B1 Save states (owner-review 18, ruled 2026-11-02). A steady pill and button: every
 * label sits in one grid cell, so neither changes width, and the new label fades up 2 px in
 * 120 ms. Saved is green for a beat, then rests neutral. Reduced motion keeps the fade, drops the
 * rise. The live pill is frame's `SavePill` (Frame/SavePill → Autosave cycle); this story is the
 * primitive pair, `SaveButton` and `MotionFaces`.
 */
const meta = {
    title: 'Motion/B1 Save states',
    parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type Face = 'rest' | 'fresh' | 'unsaved' | 'saving';

const PILL = 'inline-flex items-center justify-self-end rounded-full px-2 py-0.5 font-mono text-[10.5px] leading-4 font-medium lowercase';

const FACES = [
    { key: 'rest', node: <span className={`${PILL} bg-muted text-muted-foreground`}>saved</span> },
    { key: 'fresh', node: <span className={`${PILL} bg-accent text-accent-foreground`}>saved</span> },
    {
        key: 'unsaved',
        node: (
            <span className={`${PILL} bg-[color-mix(in_oklab,var(--splice-warn)_18%,transparent)] text-[var(--splice-warn-deep)]`}>
                unsaved
            </span>
        ),
    },
    { key: 'saving', node: <span className={`${PILL} bg-secondary text-secondary-foreground`}>saving</span> },
] as const;

function SaveDemo() {
    const [name, setName] = React.useState('Retention policy');
    const [stored, setStored] = React.useState(name);
    const [saving, setSaving] = React.useState(false);
    const [fresh, setFresh] = React.useState(false);
    const dirty = name !== stored;
    const face: Face = saving ? 'saving' : dirty ? 'unsaved' : fresh ? 'fresh' : 'rest';

    const save = () => {
        setSaving(true);
        window.setTimeout(() => {
            setStored(name);
            setSaving(false);
            setFresh(true);
            window.setTimeout(() => setFresh(false), 1400);
        }, 900);
    };

    return (
        <div className="p-4 sm:p-8">
            <section className="max-w-[560px] rounded-lg border border-border bg-card shadow-sm">
                <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
                    <h2 className="truncate text-[15px] font-semibold">{name || 'Untitled fragment'}</h2>
                    <span data-demo="pill">
                        <MotionFaces active={face} faces={FACES} />
                    </span>
                </header>
                <div className="grid gap-1.5 px-5 py-4">
                    <Label htmlFor="b1-name">Name</Label>
                    <Input
                        id="b1-name"
                        data-demo="field"
                        value={name}
                        onChange={(e) => {
                            setFresh(false);
                            setName(e.target.value);
                        }}
                    />
                </div>
                <footer className="flex justify-end border-t border-border px-5 py-3">
                    <SaveButton saving={saving} disabled={!dirty} onClick={save} data-demo="save" />
                </footer>
            </section>
        </div>
    );
}

export const SaveStates: Story = { name: 'Steady pill and button', render: () => <SaveDemo /> };

/** The button's two faces side by side at rest and saving — same width. */
export const ButtonFaces: Story = {
    name: 'Button: Save · Saving… (width held)',
    render: () => (
        <div className="flex gap-3 p-8">
            <SaveButton saving={false} />
            <SaveButton saving />
            <SaveButton saving={false} label="Save subscription" />
            <SaveButton saving label="Save subscription" />
        </div>
    ),
};
