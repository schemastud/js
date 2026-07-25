import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './input';

/**
 * Foundation/Input (component-seams ticket 14). A styled `<input>` — no variant/size, so the
 * sanctioned axis it exposes is **states** (default / disabled). `error` is a form-field concern
 * the field wrapper owns, not this primitive, so it is absent here (not a gap). Ambient token +
 * light⊗dark wired globally.
 */
const meta = {
    title: 'Foundation/Input',
    component: Input,
    tags: ['autodocs'],
    args: { placeholder: 'you@example.com' },
    decorators: [
        (Story) => (
            <div className="w-72">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Placeholder: Story = {};
export const WithValue: Story = { args: { defaultValue: 'stephen@splicewire.app' } };

/** states axis — disabled. */
export const Disabled: Story = { args: { disabled: true, defaultValue: 'Locked' } };
