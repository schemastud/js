import type { Meta, StoryObj } from '@storybook/react-vite';
import { Switch } from './switch';

/**
 * Foundation/Switch (component-seams ticket 14). A Radix toggle — no variant/size, so the only
 * sanctioned axis it exposes is **states** (checked / unchecked / disabled). Ambient token +
 * light⊗dark wired globally.
 */
const meta = {
    title: 'Foundation/Switch',
    component: Switch,
    tags: ['autodocs'],
    args: { 'aria-label': 'Toggle setting' },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};
export const On: Story = { args: { defaultChecked: true } };

/** states axis — disabled, in both checked positions. */
export const Disabled: Story = {
    render: () => (
        <div className="flex items-center gap-4">
            <Switch disabled aria-label="Off, disabled" />
            <Switch disabled defaultChecked aria-label="On, disabled" />
        </div>
    ),
};
