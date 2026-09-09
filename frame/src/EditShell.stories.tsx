import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FrameProvider, useFrameInjection } from './context';
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

function ReadFailureSurface({ kind }: { kind: 'record' | 'schema' | 'background' }) {
    const injection = useFrameInjection();
    const client = useQueryClient();
    const fail = useRef(kind !== 'background');
    const value = useMemo(
        () => ({
            ...injection,
            transport: {
                ...injection.transport,
                get: async (resource: string, id: string) => {
                    if (fail.current && kind !== 'schema') throw new Error('Record unavailable');
                    return injection.transport.get(resource, id);
                },
                getFormSchema: async (
                    ...args: Parameters<typeof injection.transport.getFormSchema>
                ) => {
                    if (kind === 'schema') throw new Error('Schema unavailable');
                    return injection.transport.getFormSchema(...args);
                },
            },
        }),
        [injection, kind],
    );
    return (
        <FrameProvider value={value}>
            {kind === 'background' && (
                <button
                    type="button"
                    onClick={() => {
                        fail.current = true;
                        void client.refetchQueries({
                            queryKey: ['frame', 'members', 'record', '2'],
                        });
                    }}
                >
                    Simulate read failure
                </button>
            )}
            <EditShell resource="members" id={kind === 'schema' ? null : '2'} container="page" />
        </FrameProvider>
    );
}

/** Existing record failed to load: no blank form or Save affordance. */
export const RecordLoadFailed: Story = {
    render: () => (
        <MockFrameProvider>
            <ReadFailureSurface kind="record" />
        </MockFrameProvider>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByRole('alert');
        await expect(canvas.queryByRole('button', { name: 'Save' })).toBeNull();
        await expect(canvas.getByRole('button', { name: 'Retry' })).toBeVisible();
    },
};

/** Creating also requires a schema; failure cannot silently produce an empty form. */
export const SchemaLoadFailed: Story = {
    render: () => (
        <MockFrameProvider>
            <ReadFailureSurface kind="schema" />
        </MockFrameProvider>
    ),
    play: RecordLoadFailed.play,
};

/** A failed background fetch keeps the user's draft visible and prevents saving stale data. */
export const BackgroundReadFailed: Story = {
    render: () => (
        <MockFrameProvider>
            <ReadFailureSurface kind="background" />
        </MockFrameProvider>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const name = await canvas.findByRole('textbox', { name: /Name/ });
        await userEvent.clear(name);
        await userEvent.type(name, 'Unsaved draft');
        await expect(canvas.getByRole('textbox', { name: /Name/ })).toHaveValue('Unsaved draft');
        await expect(name.isConnected).toBe(true);
        await userEvent.click(canvas.getByRole('button', { name: 'Simulate read failure' }));
        await canvas.findByRole('alert');
        await expect(canvas.getByRole('textbox', { name: /Name/ })).toHaveValue('Unsaved draft');
        await expect(canvas.queryByRole('button', { name: 'Save' })).toBeNull();
    },
};
