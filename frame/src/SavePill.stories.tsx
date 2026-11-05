import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SavePill } from './SavePill';
import { MockMount, makeMount } from './story-harness';

/**
 * Frame/SavePill (component-seams ticket 15). The passive Saved / Saving… / Unsaved
 * readout the five-region edit shell mounts in its top bar (ED-10), sourced from the
 * EditShellMount's `dirty`/`saving` state.
 *
 * TREATMENT axes (treatment-axes.md): the sanctioned **states** axis is the whole
 * point of this component — one story per reachable pill state (`saved`/`saving`/
 * `unsaved`), driven off the mount fixture. Ambient token + light⊗dark are wired
 * globally. NOTE: the pill's status colors are self-contained hex (not semantic
 * tokens), so its swatch does not re-skin under `.dark` — a pre-existing property
 * this catalog records faithfully; re-treating it to tokens is component-seams
 * ticket 32, not this catalog wave.
 */
const meta = {
    title: 'Frame/SavePill',
    component: SavePill,
    parameters: { layout: 'centered' },
} satisfies Meta<typeof SavePill>;

export default meta;
type Story = StoryObj<typeof meta>;

/** state = saved — clean, persisted (autosave settled). */
export const Saved: Story = {
    render: () => (
        <MockMount value={makeMount({ dirty: false, saving: false })}>
            <SavePill />
        </MockMount>
    ),
};

/** state = unsaved — pending edits not yet committed. */
export const Unsaved: Story = {
    render: () => (
        <MockMount value={makeMount({ dirty: true, saving: false })}>
            <SavePill />
        </MockMount>
    ),
};

/** state = saving — a commit is in flight (takes precedence over dirty). */
export const Saving: Story = {
    render: () => (
        <MockMount value={makeMount({ dirty: true, saving: true })}>
            <SavePill />
        </MockMount>
    ),
};

/** The states axis at a glance — all three pill states in one matrix. */
export const AllStates: Story = {
    render: () => (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <MockMount value={makeMount({ dirty: false, saving: false })}>
                <SavePill />
            </MockMount>
            <MockMount value={makeMount({ dirty: true, saving: false })}>
                <SavePill />
            </MockMount>
            <MockMount value={makeMount({ dirty: true, saving: true })}>
                <SavePill />
            </MockMount>
        </div>
    ),
};

/**
 * B1 (owner-review 18): the steady pill in motion — edit, save, settle. The pill holds its width,
 * the label fades up, and a settled save is green for a beat before it rests neutral. Needs the
 * catalog's `@schemastud/ui/motion.css` (imported by the preview).
 */
function AutosaveCycle() {
    const [state, setState] = useState({ dirty: false, saving: false });
    const step = () => {
        setState({ dirty: true, saving: false });
        window.setTimeout(() => setState({ dirty: true, saving: true }), 700);
        window.setTimeout(() => setState({ dirty: false, saving: false }), 1600);
    };
    return (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <MockMount value={makeMount(state)}>
                <SavePill />
            </MockMount>
            <button type="button" onClick={step} data-demo="cycle">
                Edit and save
            </button>
        </div>
    );
}

export const AutosaveCycleStory: Story = { name: 'Autosave cycle (B1)', render: () => <AutosaveCycle /> };
