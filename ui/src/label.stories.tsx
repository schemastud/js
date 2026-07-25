import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './input';
import { Label } from './label';

/**
 * Foundation/Label (component-seams ticket 14). A styled `<label>` — no variant/size/state of
 * its own; its only treatment beyond the ambient token + light⊗dark is the `peer-disabled`
 * dimming it inherits from the control it labels, shown in the paired story.
 */
const meta = {
    title: 'Foundation/Label',
    component: Label,
    tags: ['autodocs'],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: 'Email address' } };

/** Paired with its control — the real usage, and the peer-disabled dimming. */
export const PairedWithInput: Story = {
    render: () => (
        <div className="grid w-72 gap-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input id="email" placeholder="you@example.com" />
        </div>
    ),
};
