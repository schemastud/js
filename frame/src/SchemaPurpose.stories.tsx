import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { SchemaPurposeDemo } from '../../examples/frame-schema-purpose/src/App';

const meta = {
    title: 'Frame/SchemaPurpose',
    component: SchemaPurposeDemo,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof SchemaPurposeDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The exported Frame contract, same fixture independently installed outside the catalogue. */
export const CreateReadAndRetry: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const title = await canvas.findByRole('textbox', { name: /^Title/ });
        await userEvent.type(title, 'Independent request');
        expect(canvas.queryByRole('textbox', { name: /^Approval/ })).toBeNull();
        await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
        const approval = await canvas.findByRole('textbox', {
            name: /^Approval/,
        });
        await waitFor(() => expect(approval).toHaveValue('pending'));
        expect(approval).toBeDisabled();
        expect(canvas.queryByRole('button', { name: 'Save' })).toBeNull();
        await userEvent.click(
            canvas.getByRole('button', { name: 'Approve fixture' }),
        );
        await userEvent.click(
            within(await canvas.findByRole('dialog')).getByRole('button', {
                name: 'Approve fixture',
            }),
        );
        await waitFor(() => expect(approval).toHaveValue('approved'));
        await userEvent.click(canvas.getByRole('button', { name: 'Create' }));
        await canvas.findByRole('button', { name: 'Save' });
        expect(canvas.queryByRole('textbox', { name: /^Approval/ })).toBeNull();
        await userEvent.click(
            canvas.getByRole('button', { name: 'Legacy disabled edit' }),
        );
        await waitFor(() =>
            expect(
                canvas.getByRole('textbox', { name: /^Title/ }),
            ).toBeDisabled(),
        );
        expect(canvas.queryByRole('textbox', { name: /^Approval/ })).toBeNull();
        await userEvent.click(
            canvas.getByRole('button', { name: 'Fail read schema' }),
        );
        await canvas.findByRole('alert');
        await userEvent.click(canvas.getByRole('button', { name: 'Retry' }));
        await waitFor(() =>
            expect(
                canvas.getByRole('textbox', { name: /^Approval/ }),
            ).toHaveValue('approved'),
        );
    },
};
