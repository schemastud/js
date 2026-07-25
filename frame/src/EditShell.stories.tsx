import type { Meta, StoryObj } from '@storybook/react-vite';
import { within } from 'storybook/test';
import { EditShell } from './EditShell';
import { MockFrameProvider } from './story-harness';

/**
 * Frame/EditShell (component-seams ticket 15). The edit surface — create when
 * `id === null`, detail = `<EditShell readOnly />` (there is no distinct DetailShell).
 * It renders a form from `transport.getFormSchema` (seam's SchemaForm via the
 * DefaultFormBody slot), tracks edits, and submits through `transport.save`. Every
 * slot has a frame default; this catalog shows the defaults over the workbench
 * transport.
 *
 * TREATMENT axes (treatment-axes.md): the **states** axis (create / edit / read-only
 * detail / with mode-toggle) and the container **variant** (`panel` docked side-panel
 * vs. `page`). Ambient token + light⊗dark wired globally; each story `play`-awaits its
 * form so the VR baseline is the settled form, not the loading state.
 */
const meta = {
    title: 'Frame/EditShell',
    parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const awaitForm: Story['play'] = async ({ canvasElement }) => {
    await within(canvasElement).findByText('Name');
};

/** Edit — an existing record seeded into the form (id set), panel container. */
export const Edit: Story = {
    render: () => (
        <MockFrameProvider>
            <EditShell resource="members" id="2" onCancel={() => {}} />
        </MockFrameProvider>
    ),
    play: awaitForm,
};

/** Create — id === null: the same shell, empty form, no record fetch. */
export const Create: Story = {
    render: () => (
        <MockFrameProvider>
            <EditShell resource="members" id={null} onCancel={() => {}} />
        </MockFrameProvider>
    ),
    play: awaitForm,
};

/** Read-only detail — `readOnly` suppresses the SaveBar; the form is disabled. */
export const Detail: Story = {
    render: () => (
        <MockFrameProvider>
            <EditShell resource="members" id="1" readOnly />
        </MockFrameProvider>
    ),
    play: awaitForm,
};

/** With the dev mode-toggle (`enriched | bare`) surfaced above the form. */
export const WithModeToggle: Story = {
    render: () => (
        <MockFrameProvider>
            <EditShell resource="members" id="2" showModeToggle onCancel={() => {}} />
        </MockFrameProvider>
    ),
    play: awaitForm,
};

/** container = page — the PageContainer (Dialog primitive) rather than the docked panel. */
export const PageContainer: Story = {
    render: () => (
        <MockFrameProvider>
            <EditShell resource="members" id="2" container="page" onCancel={() => {}} />
        </MockFrameProvider>
    ),
    play: awaitForm,
};
