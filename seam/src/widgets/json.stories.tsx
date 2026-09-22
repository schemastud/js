import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
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
