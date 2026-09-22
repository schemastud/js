import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { useState } from 'react';
import { SchemaForm } from '../SchemaForm';

const schema = {
    type: 'object',
    properties: { artifact: { type: 'object', title: 'Artifact' } },
};
const meta = {
    title: 'Seam/JsonField',
    parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {
    render: () => (
        <SchemaForm
            schema={schema}
            formData={{
                artifact: { $id: 'https://example.test/schema/1', type: 'object' },
            }}
        />
    ),
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByLabelText('Artifact');
    },
};
export const Invalid: Story = {
    render: () => <SchemaForm schema={schema} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = await canvas.findByLabelText('Artifact');
        await userEvent.clear(input);
        await userEvent.type(input, 'invalid');
        await expect(input).toHaveAttribute('aria-invalid', 'true');
        await expect(canvasElement.querySelector('#root_artifact-error')).toHaveTextContent(
            'Enter a valid JSON object.',
        );
    },
};
export const ReadOnly: Story = {
    render: () => (
        <SchemaForm schema={schema} formData={{ artifact: { type: 'object' } }} readonly />
    ),
    play: async ({ canvasElement }) => {
        await expect(await within(canvasElement).findByLabelText('Artifact')).toHaveAttribute(
            'readonly',
        );
    },
};

export const Disabled: Story = {
    render: () => (
        <SchemaForm schema={schema} formData={{ artifact: { type: 'object' } }} disabled />
    ),
    play: async ({ canvasElement }) => {
        await expect(await within(canvasElement).findByLabelText('Artifact')).toBeDisabled();
    },
};

function ControlledReplayForm() {
    const [artifact, setArtifact] = useState<object | string>({ version: 1 });
    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <button type="button" onClick={() => setArtifact('{replayed-invalid')}>
                    Replay invalid draft
                </button>
                <button type="button" onClick={() => setArtifact({ version: 2 })}>
                    Restore valid record
                </button>
            </div>
            <SchemaForm schema={schema} formData={{ artifact }} />
        </div>
    );
}

/** Controlled record updates use the same validation as direct typing in both ambient schemes. */
export const ControlledReplay: Story = {
    render: () => <ControlledReplayForm />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = await canvas.findByLabelText('Artifact');
        await userEvent.click(canvas.getByRole('button', { name: 'Replay invalid draft' }));
        await expect(input).toHaveValue('{replayed-invalid');
        await expect(input).toHaveAttribute('aria-invalid', 'true');
        await expect(input).toHaveAttribute('aria-describedby', 'root_artifact-error');
        await userEvent.click(canvas.getByRole('button', { name: 'Restore valid record' }));
        await expect(input).toHaveAttribute('aria-invalid', 'false');
        await expect(input).not.toHaveAttribute('aria-describedby');
        await userEvent.click(canvas.getByRole('button', { name: 'Replay invalid draft' }));
        await expect(input).toHaveAttribute('aria-invalid', 'true');
        await expect(canvas.getByText('Enter a valid JSON object.')).toBeVisible();
    },
};
